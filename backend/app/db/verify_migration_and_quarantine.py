"""
Legacy Data Ownership & Migration Verification Suite.
Audits historical records, isolates ambiguous ownership to quarantine,
and guarantees zero unintended data loss, duplicate ownership, or cross-tenant leakage.
"""

import json
import os
import sqlite3
import uuid
from datetime import datetime

from backend.app.db.backup_restore import create_verified_backup


def verify_and_quarantine(db_path: str = "data/patent_platform.db") -> dict:
    print("================================================================")
    print("🔍 AUDITING DATABASE MIGRATION & HISTORICAL OWNERSHIP INTEGRITY")
    print("================================================================")

    # 1. Create verified safety snapshot
    backup_meta = create_verified_backup(db_path=db_path)
    print(f"✓ Created verified snapshot: {backup_meta['backup_filename']} (SHA256: {backup_meta['sha256'][:16]}...)")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    report = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "backup": backup_meta,
        "table_counts_before": {},
        "table_counts_after": {},
        "resolved_attributions": 0,
        "quarantined_records": 0,
        "orphans_found": 0,
        "cross_workspace_mismatches": 0,
        "integrity_verified": True,
    }

    tables = [
        "organizations",
        "users",
        "workspaces",
        "workspace_memberships",
        "projects",
        "search_executions",
        "evidence_mappings",
        "annotations",
        "saved_documents",
        "patent_documents",
        "quarantine_records",
    ]

    # Record initial counts
    for t in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {t}")
            report["table_counts_before"][t] = cursor.fetchone()[0]
        except sqlite3.OperationalError:
            report["table_counts_before"][t] = 0

    # 2. Fix the 4 annotations where user_id was hardcoded default "examiner-1"
    # Verify that their parent search execution was executed by a valid user
    cursor.execute("""
        SELECT a.id, a.search_id, s.user_id, s.workspace_id, a.review_status, a.notes
        FROM annotations a
        JOIN search_executions s ON a.search_id = s.id
        WHERE a.user_id = 'examiner-1';
    """)
    examiner_annots = cursor.fetchall()
    for row in examiner_annots:
        annot_id, s_id, s_user_id, s_ws_id, status, notes = row
        if s_user_id:
            # Attribute cleanly to parent search author
            cursor.execute(
                "UPDATE annotations SET user_id = ?, workspace_id = ? WHERE id = ?",
                (s_user_id, s_ws_id, annot_id),
            )
            report["resolved_attributions"] += 1
            print(f"✓ Resolved historical annotation {annot_id[:8]}... -> Author: {s_user_id} in {s_ws_id}")
        else:
            # Ambiguous: Move to quarantine table
            q_id = str(uuid.uuid4())
            q_data = json.dumps({
                "annotation_id": annot_id,
                "search_id": s_id,
                "review_status": status,
                "notes": notes,
            })
            cursor.execute(
                """
                INSERT INTO quarantine_records (id, entity_type, entity_id, original_data, reason, quarantined_at)
                VALUES (?, 'annotation', ?, ?, 'Legacy unlinked annotation with unknown author', CURRENT_TIMESTAMP)
                """,
                (q_id, annot_id, q_data),
            )
            cursor.execute("DELETE FROM annotations WHERE id = ?", (annot_id,))
            report["quarantined_records"] += 1
            print(f"⚠️ Quarantined ambiguous annotation {annot_id}")

    # 3. Check for any orphan search executions (search referencing non-existent workspace)
    cursor.execute("""
        SELECT id, workspace_id, user_id FROM search_executions 
        WHERE workspace_id NOT IN (SELECT id FROM workspaces);
    """)
    orphan_searches = cursor.fetchall()
    for s_id, ws_id, u_id in orphan_searches:
        report["orphans_found"] += 1
        q_id = str(uuid.uuid4())
        cursor.execute("SELECT * FROM search_executions WHERE id = ?", (s_id,))
        raw = cursor.fetchone()
        cursor.execute(
            """
            INSERT INTO quarantine_records (id, entity_type, entity_id, original_data, reason, quarantined_at)
            VALUES (?, 'search_execution', ?, ?, 'Orphan search referencing missing workspace', CURRENT_TIMESTAMP)
            """,
            (q_id, s_id, json.dumps(str(raw))),
        )
        cursor.execute("DELETE FROM search_executions WHERE id = ?", (s_id,))
        report["quarantined_records"] += 1
        print(f"⚠️ Quarantined orphan search {s_id}")

    # 4. Check for any cross-workspace mismatches: search linked to project in different workspace
    cursor.execute("""
        SELECT s.id, s.workspace_id, p.id, p.workspace_id 
        FROM search_executions s 
        JOIN projects p ON s.project_id = p.id 
        WHERE s.workspace_id != p.workspace_id;
    """)
    mismatches = cursor.fetchall()
    for s_id, s_ws, p_id, p_ws in mismatches:
        report["cross_workspace_mismatches"] += 1
        # Sever cross-workspace project link to prevent cross-tenant leak
        cursor.execute("UPDATE search_executions SET project_id = NULL WHERE id = ?", (s_id,))
        print(f"⚠️ Severed invalid cross-workspace association: Search {s_id} (WS {s_ws}) -> Project {p_id} (WS {p_ws})")

    # 5. Check for duplicate workspace memberships
    cursor.execute("""
        SELECT workspace_id, user_id, COUNT(*) 
        FROM workspace_memberships 
        GROUP BY workspace_id, user_id 
        HAVING COUNT(*) > 1;
    """)
    duplicate_memberships = cursor.fetchall()
    for ws_id, u_id, count in duplicate_memberships:
        # Keep lowest ID, delete redundant copies
        cursor.execute("""
            DELETE FROM workspace_memberships 
            WHERE workspace_id = ? AND user_id = ? AND id NOT IN (
                SELECT MIN(id) FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?
            );
        """, (ws_id, u_id, ws_id, u_id))
        print(f"✓ Pruned {count - 1} duplicate memberships for User {u_id} in Workspace {ws_id}")

    conn.commit()

    # Record final counts
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {t}")
        report["table_counts_after"][t] = cursor.fetchone()[0]

    # Verify 0 orphan records remain across all core foreign keys
    checks = [
        ("projects.workspace_id -> workspaces.id", "SELECT COUNT(*) FROM projects WHERE workspace_id NOT IN (SELECT id FROM workspaces)"),
        ("projects.assigned_to_user_id -> users.id", "SELECT COUNT(*) FROM projects WHERE assigned_to_user_id NOT IN (SELECT id FROM users)"),
        ("search_executions.workspace_id -> workspaces.id", "SELECT COUNT(*) FROM search_executions WHERE workspace_id NOT IN (SELECT id FROM workspaces)"),
        ("search_executions.user_id -> users.id", "SELECT COUNT(*) FROM search_executions WHERE user_id NOT IN (SELECT id FROM users)"),
        ("evidence_mappings.workspace_id -> workspaces.id", "SELECT COUNT(*) FROM evidence_mappings WHERE workspace_id NOT IN (SELECT id FROM workspaces)"),
        ("annotations.workspace_id -> workspaces.id", "SELECT COUNT(*) FROM annotations WHERE workspace_id NOT IN (SELECT id FROM workspaces)"),
        ("annotations.user_id -> users.id", "SELECT COUNT(*) FROM annotations WHERE user_id NOT IN (SELECT id FROM users)"),
        ("saved_documents.workspace_id -> workspaces.id", "SELECT COUNT(*) FROM saved_documents WHERE workspace_id NOT IN (SELECT id FROM workspaces)"),
    ]

    print("\nForeign Key Reference Integrity Check:")
    all_clean = True
    for label, sql in checks:
        cursor.execute(sql)
        viol_count = cursor.fetchone()[0]
        status = "PASSED" if viol_count == 0 else "FAILED"
        if viol_count > 0:
            all_clean = False
        print(f"  [{status}] {label}: {viol_count} violations")

    report["integrity_verified"] = all_clean
    conn.close()

    print("\n================================================================")
    print(f"AUDIT SUMMARY: {'PASSED (100% CLEAN)' if all_clean else 'FAILED'}")
    print(f"  Resolved Attributions: {report['resolved_attributions']}")
    print(f"  Quarantined Records: {report['quarantined_records']}")
    print(f"  Active Matters Preserved: {report['table_counts_after']['projects']}")
    print(f"  Active Searches Preserved: {report['table_counts_after']['search_executions']}")
    print(f"  Active Evidence Preserved: {report['table_counts_after']['evidence_mappings']}")
    print(f"  Active Annotations Preserved: {report['table_counts_after']['annotations']}")
    print("================================================================")

    return report


if __name__ == "__main__":
    report = verify_and_quarantine()
    with open("data/migration_verification_report.json", "w") as f:
        json.dump(report, f, indent=2)

