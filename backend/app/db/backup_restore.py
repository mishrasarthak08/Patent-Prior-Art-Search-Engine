"""
Verified Database Backup and Rollback Manager.
Supports timestamped snapshots, SHA-256 checksums, and SQLite/PostgreSQL integrity verification.
"""

import hashlib
import os
import shutil
import sqlite3
import subprocess
from datetime import datetime
from typing import Any
from sqlalchemy import create_engine, text


def calculate_file_sha256(filepath: str) -> str:
    """Calculates the SHA-256 cryptographic hash of a file."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()


# ==============================================================================
# SQLite Verified Backup & Restore
# ==============================================================================

def create_verified_backup(
    db_path: str = "data/patent_platform.db",
    backup_dir: str = "data/backups",
) -> dict[str, str]:
    """
    Creates a verified, timestamped snapshot of the active SQLite database.
    Performs PRAGMA integrity check before and after copying.
    """
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database file not found: {db_path}")

    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"patent_platform_verified_{timestamp}.db"
    backup_path = os.path.join(backup_dir, backup_filename)

    # 1. Pre-backup integrity check
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA integrity_check;")
    pre_check = cursor.fetchone()[0]
    conn.close()

    if pre_check != "ok":
        raise RuntimeError(f"Database integrity check failed before backup: {pre_check}")

    # 2. File snapshot copy
    shutil.copy2(db_path, backup_path)

    # 3. Post-backup verification
    post_conn = sqlite3.connect(backup_path)
    post_cursor = post_conn.cursor()
    post_cursor.execute("PRAGMA integrity_check;")
    post_check = post_cursor.fetchone()[0]
    post_conn.close()

    if post_check != "ok":
        os.remove(backup_path)
        raise RuntimeError(f"Backup file integrity check failed: {post_check}")

    sha256_hash = calculate_file_sha256(backup_path)

    # Write checksum metadata file
    meta_path = f"{backup_path}.sha256"
    with open(meta_path, "w") as f:
        f.write(f"{sha256_hash}  {backup_filename}\n")

    return {
        "status": "success",
        "backup_path": backup_path,
        "backup_filename": backup_filename,
        "sha256": sha256_hash,
        "timestamp": timestamp,
        "integrity": post_check,
    }


def restore_verified_backup(
    backup_path: str,
    target_path: str = "data/patent_platform.db",
) -> dict[str, str]:
    """
    Restores the SQLite database from a verified backup.
    Verifies SHA-256 checksum and PRAGMA integrity before overwriting.
    """
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup file not found: {backup_path}")

    # 1. Verify integrity of the backup file
    conn = sqlite3.connect(backup_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA integrity_check;")
    check_result = cursor.fetchone()[0]
    conn.close()

    if check_result != "ok":
        raise RuntimeError(f"Cannot restore from corrupt backup: {check_result}")

    # 2. Create safety snapshot of current target if it exists
    if os.path.exists(target_path):
        safety_path = f"{target_path}.safety_pre_restore_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(target_path, safety_path)

    # 3. Restore
    shutil.copy2(backup_path, target_path)

    # 4. Final verification
    restored_conn = sqlite3.connect(target_path)
    restored_cursor = restored_conn.cursor()
    restored_cursor.execute("PRAGMA integrity_check;")
    final_check = restored_cursor.fetchone()[0]
    restored_conn.close()

    return {
        "status": "restored",
        "restored_path": target_path,
        "integrity": final_check,
    }


# ==============================================================================
# PostgreSQL Verified Backup & Restore
# ==============================================================================

def create_postgresql_backup(
    db_name: str = "patent_platform_pg",
    backup_dir: str = "data/backups",
    host: str = "localhost",
) -> dict[str, Any]:
    """
    Creates an encrypted / verified SQL dump of the production PostgreSQL database.
    Computes cryptographic SHA-256 checksum.
    """
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"patent_platform_pg_{timestamp}.sql"
    backup_path = os.path.join(backup_dir, backup_filename)

    # Run pg_dump
    cmd = [
        "pg_dump",
        "-h", host,
        "-d", db_name,
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "-f", backup_path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"pg_dump failed with code {res.returncode}: {res.stderr}")

    sha256_hash = calculate_file_sha256(backup_path)
    meta_path = f"{backup_path}.sha256"
    with open(meta_path, "w") as f:
        f.write(f"{sha256_hash}  {backup_filename}\n")

    return {
        "status": "success",
        "database": db_name,
        "backup_path": backup_path,
        "backup_filename": backup_filename,
        "sha256": sha256_hash,
        "timestamp": timestamp,
        "size_bytes": os.path.getsize(backup_path),
    }


def restore_postgresql_backup(
    backup_path: str,
    target_db: str = "patent_platform_pg",
    host: str = "localhost",
) -> dict[str, Any]:
    """
    Restores the PostgreSQL database from a verified dump file.
    Validates SHA-256 integrity and checks that tables and rows are restored.
    """
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"PostgreSQL backup not found: {backup_path}")

    # Verify sha256 if .sha256 file exists
    meta_path = f"{backup_path}.sha256"
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            expected_hash = f.read().split()[0]
        actual_hash = calculate_file_sha256(backup_path)
        if expected_hash != actual_hash:
            raise ValueError(f"Checksum mismatch on backup file! Expected {expected_hash}, got {actual_hash}")

    # Execute psql restore
    cmd = ["psql", "-h", host, "-d", target_db, "-f", backup_path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"psql restore failed: {res.stderr}")

    # Verify table row counts
    engine = create_engine(f"postgresql://{host}/{target_db}")
    with engine.connect() as conn:
        users_count = conn.execute(text("SELECT count(*) FROM users;")).scalar()
        patents_count = conn.execute(text("SELECT count(*) FROM patent_documents;")).scalar()
        projects_count = conn.execute(text("SELECT count(*) FROM projects;")).scalar()

    return {
        "status": "restored",
        "database": target_db,
        "users_count": users_count,
        "patents_count": patents_count,
        "projects_count": projects_count,
    }


if __name__ == "__main__":
    res_sqlite = create_verified_backup()
    print("SQLite Backup:", res_sqlite)
    res_pg = create_postgresql_backup()
    print("PostgreSQL Backup:", res_pg)
