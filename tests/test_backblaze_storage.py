#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
import tempfile
from pathlib import Path

import boto3
from botocore.config import Config

endpoint = os.environ["STORAGE_S3_ENDPOINT"]
region = os.environ.get("STORAGE_S3_REGION", "us-east-005")
bucket = os.environ["STORAGE_S3_BUCKET"]
client = boto3.client(
    "s3",
    endpoint_url=endpoint,
    region_name=region,
    aws_access_key_id=os.environ["STORAGE_S3_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["STORAGE_S3_SECRET_ACCESS_KEY"],
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
)

key = "campaigns/storage_test/dev6_probe.txt"
payload = b"LACRIMAE dev6 Backblaze storage probe\n"
expected = hashlib.sha256(payload).hexdigest()

with tempfile.TemporaryDirectory() as temp:
    local = Path(temp) / "probe.txt"
    downloaded = Path(temp) / "downloaded.txt"
    local.write_bytes(payload)
    client.upload_file(str(local), bucket, key)
    try:
        client.download_file(bucket, key, str(downloaded))
        actual = hashlib.sha256(downloaded.read_bytes()).hexdigest()
        if actual != expected:
            raise RuntimeError("hash mismatch on downloaded probe")
        print(f"BACKBLAZE_STORAGE_TEST=OK bucket={bucket} key={key} sha256={actual}")
    finally:
        client.delete_object(Bucket=bucket, Key=key)
        print("BACKBLAZE_STORAGE_TEST_CLEANUP=OK")
