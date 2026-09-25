"""
Automated Database Backup Script (Phase 2, T2.4.3)

Performs nightly pg_dump of Supabase Postgres database, compresses with gzip,
and optionally uploads to Cloudflare R2 or stores in a local backup directory.

Governed by: PRD Section 7 (Reliability) and Planning/ACCOUNTS.md
"""

import os
import sys
import subprocess
import datetime
import gzip
import shutil

try:
    import boto3
    from botocore.config import Config
except ImportError:
    boto3 = None


def run_backup():
    db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    backup_dir = os.path.join(os.path.dirname(__file__), "..", "backups")
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    raw_dump_file = os.path.join(backup_dir, f"speqtus_backup_{timestamp}.sql")
    gz_dump_file = f"{raw_dump_file}.gz"

    if not db_url:
        sys.stderr.write("DATABASE_URL or SUPABASE_DB_URL environment variable is required.\n")
        sys.exit(1)

    sys.stdout.write(f"Starting pg_dump at {timestamp}...\n")

    # Run pg_dump
    cmd = ["pg_dump", "--clean", "--if-exists", "--no-owner", "--no-privileges", "-d", db_url, "-f", raw_dump_file]
    try:
        subprocess.run(cmd, check=True)
    except (subprocess.SubprocessError, FileNotFoundError) as e:
        sys.stderr.write(f"pg_dump execution failed: {e}\n")
        sys.exit(1)

    # Compress with gzip
    with open(raw_dump_file, "rb") as f_in, gzip.open(gz_dump_file, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)
    os.remove(raw_dump_file)

    sys.stdout.write(f"Backup compressed to {gz_dump_file} (Size: {os.path.getsize(gz_dump_file)} bytes)\n")

    # Optional R2 Upload
    r2_account = os.getenv("R2_ACCOUNT_ID")
    r2_key = os.getenv("R2_ACCESS_KEY_ID")
    r2_secret = os.getenv("R2_SECRET_ACCESS_KEY")
    r2_bucket = os.getenv("R2_BACKUP_BUCKET", "speqtus-backups")

    if r2_account and r2_key and r2_secret and boto3:
        try:
            s3 = boto3.client(
                "s3",
                endpoint_url=f"https://{r2_account}.r2.cloudflarestorage.com",
                aws_access_key_id=r2_key,
                aws_secret_access_key=r2_secret,
                config=Config(signature_version="s3v4"),
                region_name="auto",
            )
            key_name = f"db_backups/speqtus_backup_{timestamp}.sql.gz"
            s3.upload_file(gz_dump_file, r2_bucket, key_name)
            sys.stdout.write(f"Uploaded to Cloudflare R2: {r2_bucket}/{key_name}\n")
        except Exception as e:
            sys.stderr.write(f"Failed to upload backup to R2: {e}\n")


if __name__ == "__main__":
    run_backup()
