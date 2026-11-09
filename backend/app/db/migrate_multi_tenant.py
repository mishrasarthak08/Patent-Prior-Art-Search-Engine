"""
Multi-Tenant SaaS Database Migration Script
Safely upgrades SQLite schema for Patent Prior-Art Search Engine to full tenant isolation.
Preserves existing data, backfills workspace associations, and creates personal workspaces.
"""

import datetime
import sqlite3
import sys
import uuid
from pathlib import Path

DB_PATH = Path("data/patent_platform.db")
BACKUP_PATH = Path("data/backups/patent_platform.db.backup_pre_multitenant")


def column_exists(cursor: sqlite3.Cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table});")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def table_exists(cursor: sqlite3.Cursor, table: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?;", (table,))
    return cursor.fetchone() is not None


def run_migration():
    if not DB_PATH.exists():
        print(f"Error: Database {DB_PATH} not found.")
        sys.exit(1)

    print(f"[*] Starting Multi-Tenant SaaS Database Migration on {DB_PATH}")

    # Connect to SQLite
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = OFF;")  # Disable during table alterations
    cursor = conn.cursor()

    try:
        # 1. Create workspace_memberships table if not exists
        if not table_exists(cursor, "workspace_memberships"):
            print("Creating 'workspace_memberships' table...")
            cursor.execute("""
            CREATE TABLE workspace_memberships (
                id VARCHAR(36) PRIMARY KEY,
                workspace_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                role VARCHAR(50) DEFAULT 'ATTORNEY',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(workspace_id, user_id)
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_ws_member_ws ON workspace_memberships(workspace_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_ws_member_user ON workspace_memberships(user_id);")
            print("-> 'workspace_memberships' table created successfully.")

        # 2. Add columns to 'workspaces' and ensure org_id is nullable
        cursor.execute("SELECT sql FROM sqlite_master WHERE name='workspaces';")
        ddl = cursor.fetchone()[0]
        if "org_id VARCHAR(36) NOT NULL" in ddl or "org_id VARCHAR NOT NULL" in ddl:
            print("Making 'workspaces.org_id' nullable for personal workspaces...")
            cursor.execute("""
            CREATE TABLE workspaces_new (
                id VARCHAR(36) NOT NULL,
                org_id VARCHAR(36),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                is_default BOOLEAN,
                created_at DATETIME,
                workspace_type VARCHAR(20) DEFAULT 'ORGANIZATION',
                owner_user_id VARCHAR(36),
                PRIMARY KEY (id),
                FOREIGN KEY(org_id) REFERENCES organizations (id)
            );
            """)
            cursor.execute("INSERT INTO workspaces_new SELECT id, org_id, name, description, is_default, created_at, 'ORGANIZATION', NULL FROM workspaces;")
            cursor.execute("DROP TABLE workspaces;")
            cursor.execute("ALTER TABLE workspaces_new RENAME TO workspaces;")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_workspaces_org_id ON workspaces(org_id);")
            print("-> 'workspaces.org_id' successfully made nullable.")

        if not column_exists(cursor, "workspaces", "workspace_type"):
            print("Adding 'workspace_type' column to workspaces...")
            cursor.execute("ALTER TABLE workspaces ADD COLUMN workspace_type VARCHAR(20) DEFAULT 'ORGANIZATION';")
        if not column_exists(cursor, "workspaces", "owner_user_id"):
            print("Adding 'owner_user_id' column to workspaces...")
            cursor.execute("ALTER TABLE workspaces ADD COLUMN owner_user_id VARCHAR(36);")

        # 3. Add columns to 'users'
        if not column_exists(cursor, "users", "default_workspace_id"):
            print("Adding 'default_workspace_id' column to users...")
            cursor.execute("ALTER TABLE users ADD COLUMN default_workspace_id VARCHAR(36);")
        if not column_exists(cursor, "users", "onboarding_completed"):
            print("Adding 'onboarding_completed' column to users...")
            cursor.execute("ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT 1;")
        if not column_exists(cursor, "users", "preferences"):
            print("Adding 'preferences' column to users...")
            cursor.execute("ALTER TABLE users ADD COLUMN preferences JSON DEFAULT '{}';")

        # 4. Add columns to 'search_executions'
        if not column_exists(cursor, "search_executions", "workspace_id"):
            print("Adding 'workspace_id' column to search_executions...")
            cursor.execute("ALTER TABLE search_executions ADD COLUMN workspace_id VARCHAR(36);")
        if not column_exists(cursor, "search_executions", "user_id"):
            print("Adding 'user_id' column to search_executions...")
            cursor.execute("ALTER TABLE search_executions ADD COLUMN user_id VARCHAR(36);")

        # 5. Add columns to 'evidence_mappings'
        if not column_exists(cursor, "evidence_mappings", "workspace_id"):
            print("Adding 'workspace_id' column to evidence_mappings...")
            cursor.execute("ALTER TABLE evidence_mappings ADD COLUMN workspace_id VARCHAR(36);")
        if not column_exists(cursor, "evidence_mappings", "user_id"):
            print("Adding 'user_id' column to evidence_mappings...")
            cursor.execute("ALTER TABLE evidence_mappings ADD COLUMN user_id VARCHAR(36);")

        # 6. Add columns to 'saved_documents'
        if not column_exists(cursor, "saved_documents", "workspace_id"):
            print("Adding 'workspace_id' column to saved_documents...")
            cursor.execute("ALTER TABLE saved_documents ADD COLUMN workspace_id VARCHAR(36);")

        # 7. Add columns to 'annotations'
        if not column_exists(cursor, "annotations", "workspace_id"):
            print("Adding 'workspace_id' column to annotations...")
            cursor.execute("ALTER TABLE annotations ADD COLUMN workspace_id VARCHAR(36);")

        # 8. Data Migration & Cleanup
        print("Migrating organization names...")
        cursor.execute("""
            UPDATE organizations
            SET name = 'Patent Intelligence Practice Group', slug = 'patent-intelligence'
            WHERE slug = 'veritas-ip' OR id = 'org-veritas-primary';
        """)

        # Get primary admin user
        cursor.execute("SELECT id FROM users WHERE email = 'admin@patentsearchengine.com';")
        admin_row = cursor.fetchone()
        if not admin_row:
            cursor.execute("SELECT id FROM users WHERE email = 'admin@veritas-ip.com';")
            admin_row = cursor.fetchone()
        admin_id = admin_row[0] if admin_row else "user-admin-engine"

        # Check default workspaces
        cursor.execute("SELECT id FROM workspaces WHERE id = 'ws-energy-semi';")
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO workspaces (id, org_id, name, description, is_default, workspace_type, owner_user_id)
            VALUES ('ws-energy-semi', 'org-veritas-primary', 'Energy & Solid-State Systems', 'Solid-state battery chemistry and silicon anode composites.', 1, 'ORGANIZATION', ?);
            """, (admin_id,))

        cursor.execute("UPDATE workspaces SET workspace_type = 'ORGANIZATION' WHERE workspace_type IS NULL;")

        # Ensure all existing users have a PERSONAL workspace and membership
        cursor.execute("SELECT id, full_name, email, org_id, role FROM users;")
        users = cursor.fetchall()
        for u_id, full_name, email, org_id, role in users:
            personal_ws_id = f"ws-personal-{u_id[:8]}"
            cursor.execute("SELECT id FROM workspaces WHERE id = ?;", (personal_ws_id,))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO workspaces (id, org_id, name, description, is_default, workspace_type, owner_user_id)
                VALUES (?, ?, ?, 'Private personal patent research workbench.', 0, 'PERSONAL', ?);
                """, (personal_ws_id, org_id, f"{full_name}'s Research Workspace", u_id))
                print(f"Created personal workspace {personal_ws_id} for user {email}")

            # Ensure membership in personal workspace
            cursor.execute("""
            INSERT OR IGNORE INTO workspace_memberships (id, workspace_id, user_id, role)
            VALUES (?, ?, ?, 'OWNER');
            """, (str(uuid.uuid4()), personal_ws_id, u_id))

            # Set default_workspace_id
            target_default = "ws-energy-semi" if (org_id == "org-veritas-primary" and role in ["OWNER", "ADMIN"]) else personal_ws_id
            cursor.execute("UPDATE users SET default_workspace_id = ?, onboarding_completed = 1 WHERE id = ?;", (target_default, u_id))

            # If user belongs to org-veritas-primary, grant membership in org workspaces
            if org_id:
                cursor.execute("SELECT id FROM workspaces WHERE org_id = ? AND workspace_type = 'ORGANIZATION';", (org_id,))
                org_workspaces = cursor.fetchall()
                for (ows_id,) in org_workspaces:
                    cursor.execute("""
                    INSERT OR IGNORE INTO workspace_memberships (id, workspace_id, user_id, role)
                    VALUES (?, ?, ?, ?);
                    """, (str(uuid.uuid4()), ows_id, u_id, role or "ATTORNEY"))

        # 9. Backfill projects with valid workspace_id
        cursor.execute("UPDATE projects SET workspace_id = 'ws-energy-semi', org_id = 'org-veritas-primary', assigned_to_user_id = ? WHERE workspace_id IS NULL OR workspace_id = '';", (admin_id,))
        print("Backfilled projects with workspace_id = 'ws-energy-semi'.")

        # 10. Backfill search_executions
        # First from project
        cursor.execute("""
        UPDATE search_executions
        SET workspace_id = (SELECT workspace_id FROM projects WHERE projects.id = search_executions.project_id)
        WHERE (workspace_id IS NULL OR workspace_id = '') AND project_id IS NOT NULL AND project_id != 'default-workspace';
        """)
        # For default-workspace or unassigned
        cursor.execute("""
        UPDATE search_executions
        SET workspace_id = 'ws-energy-semi', user_id = ?
        WHERE workspace_id IS NULL OR workspace_id = '';
        """, (admin_id,))
        cursor.execute("UPDATE search_executions SET user_id = ? WHERE user_id IS NULL;", (admin_id,))
        print("Backfilled search_executions workspace_id and user_id.")

        # 11. Backfill evidence_mappings from search_executions
        cursor.execute("""
        UPDATE evidence_mappings
        SET workspace_id = (SELECT workspace_id FROM search_executions WHERE search_executions.id = evidence_mappings.search_id),
            user_id = (SELECT user_id FROM search_executions WHERE search_executions.id = evidence_mappings.search_id)
        WHERE workspace_id IS NULL OR workspace_id = '';
        """)
        cursor.execute("UPDATE evidence_mappings SET workspace_id = 'ws-energy-semi', user_id = ? WHERE workspace_id IS NULL;", (admin_id,))
        print("Backfilled evidence_mappings workspace_id and user_id.")

        # 12. Backfill annotations
        cursor.execute("""
        UPDATE annotations
        SET workspace_id = (SELECT workspace_id FROM search_executions WHERE search_executions.id = annotations.search_id)
        WHERE workspace_id IS NULL OR workspace_id = '';
        """)
        cursor.execute("UPDATE annotations SET workspace_id = 'ws-energy-semi' WHERE workspace_id IS NULL;")
        print("Backfilled annotations workspace_id.")

        # 13. Backfill saved_documents
        cursor.execute("""
        UPDATE saved_documents
        SET workspace_id = 'ws-energy-semi'
        WHERE workspace_id IS NULL OR workspace_id = '';
        """)

        conn.commit()
        print("[+] Migration completed successfully with zero data loss!")

    except Exception as e:
        conn.rollback()
        print(f"[!] Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
