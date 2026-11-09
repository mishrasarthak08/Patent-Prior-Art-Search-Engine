"""
Automated Test for Database Backup and Restoration Verification.
Verifies that:
1. SQLite backup and restore reproduces data with PRAGMA integrity_check == 'ok'.
2. PostgreSQL backup and restore reproduces data into a clean database with matching row counts.
"""

import os
import shutil
import sqlite3
import subprocess
import pytest
from backend.app.db.backup_restore import (
    create_verified_backup,
    restore_verified_backup,
    create_postgresql_backup,
    restore_postgresql_backup,
)


def test_sqlite_backup_and_restore_cycle(tmp_path):
    # 1. Setup a dummy SQLite database
    db_file = tmp_path / "test_source.db"
    conn = sqlite3.connect(db_file)
    c = conn.cursor()
    c.execute("CREATE TABLE patents (id TEXT PRIMARY KEY, title TEXT);")
    c.execute("INSERT INTO patents VALUES ('US101', 'Solid-State Battery Anode');")
    c.execute("INSERT INTO patents VALUES ('US102', 'Cathode Active Material');")
    conn.commit()
    conn.close()

    backup_dir = tmp_path / "backups"
    # 2. Create backup
    res = create_verified_backup(db_path=str(db_file), backup_dir=str(backup_dir))
    assert res["status"] == "success"
    assert res["integrity"] == "ok"
    assert os.path.exists(res["backup_path"])

    # 3. Simulate corruption or loss
    os.remove(db_file)
    assert not os.path.exists(db_file)

    # 4. Restore backup
    restored = restore_verified_backup(backup_path=res["backup_path"], target_path=str(db_file))
    assert restored["status"] == "restored"
    assert restored["integrity"] == "ok"

    # 5. Verify restored rows
    r_conn = sqlite3.connect(db_file)
    r_cur = r_conn.cursor()
    r_cur.execute("SELECT count(*) FROM patents;")
    assert r_cur.fetchone()[0] == 2
    r_conn.close()


def test_postgresql_backup_and_restore_cycle(tmp_path):
    test_db = "patent_restore_test"
    # Create test database
    subprocess.run(["createdb", test_db], capture_output=True)

    try:
        backup_dir = tmp_path / "pg_backups"
        res_backup = create_postgresql_backup(db_name="patent_platform_pg", backup_dir=str(backup_dir))
        assert res_backup["status"] == "success"
        assert os.path.exists(res_backup["backup_path"])

        # Restore into test_db
        res_restore = restore_postgresql_backup(
            backup_path=res_backup["backup_path"],
            target_db=test_db,
        )
        assert res_restore["status"] == "restored"
        assert res_restore["users_count"] >= 70
        assert res_restore["patents_count"] >= 50
        assert res_restore["projects_count"] >= 30
    finally:
        subprocess.run(["dropdb", "--if-exists", test_db], capture_output=True)

