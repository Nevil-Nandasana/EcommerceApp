"""
Cloudflare R2 Image Processing & Upload Helper (T1.3.1, T2.4.2)

Resizes catalog images into thumbnail (~200px) and full-size (~800px) assets,
and uploads them to Cloudflare R2 using standard S3-compatible API.

Governed by: PRD Section 6.4 and Planning/VARIABLE_REGISTRY.md
"""

import os
import sys
import argparse
from io import BytesIO
from typing import Optional

try:
    import boto3
    from botocore.config import Config
except ImportError:
    boto3 = None

try:
    from PIL import Image
except ImportError:
    Image = None


class R2Uploader:
    def __init__(
        self,
        account_id: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        cdn_prefix: Optional[str] = None,
    ):
        self.account_id = account_id or os.getenv("R2_ACCOUNT_ID")
        self.access_key = access_key or os.getenv("R2_ACCESS_KEY_ID")
        self.secret_key = secret_key or os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = bucket_name or os.getenv("R2_BUCKET_NAME", "speqtus-product-images")
        self.cdn_prefix = cdn_prefix or os.getenv("R2_PUBLIC_URL_PREFIX", "https://images.speqtusmedical.com")

        if not (self.account_id and self.access_key and self.secret_key):
            raise ValueError("Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.")

        if not boto3:
            raise RuntimeError("boto3 is not installed. Install via: pip install boto3")

        endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
        self.s3 = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )

    def process_and_upload(self, image_path: str, base_filename: str) -> dict:
        """
        Resize image into full (800px) and thumbnail (200px), and upload both.
        Returns dictionary of public CDN URLs.
        """
        if not Image:
            raise RuntimeError("Pillow is not installed. Install via: pip install Pillow")

        with Image.open(image_path) as img:
            img = img.convert("RGB")

            # 1. Full size (~800px max width)
            full_img = img.copy()
            full_img.thumbnail((800, 800), Image.Resampling.LANCZOS)
            full_buf = BytesIO()
            full_img.save(full_buf, format="WEBP", quality=85)
            full_buf.seek(0)

            # 2. Thumbnail (~200px max width)
            thumb_img = img.copy()
            thumb_img.thumbnail((200, 200), Image.Resampling.LANCZOS)
            thumb_buf = BytesIO()
            thumb_img.save(thumb_buf, format="WEBP", quality=80)
            thumb_buf.seek(0)

        clean_name = os.path.splitext(base_filename)[0]
        full_key = f"products/{clean_name}_full.webp"
        thumb_key = f"products/{clean_name}_thumb.webp"

        extra_args = {
            "ContentType": "image/webp",
            "CacheControl": "public, max-age=31536000, immutable",
        }

        self.s3.upload_fileobj(full_buf, self.bucket_name, full_key, ExtraArgs=extra_args)
        self.s3.upload_fileobj(thumb_buf, self.bucket_name, thumb_key, ExtraArgs=extra_args)

        return {
            "full_url": f"{self.cdn_prefix}/{full_key}",
            "thumb_url": f"{self.cdn_prefix}/{thumb_key}",
        }


def main():
    parser = argparse.ArgumentParser(description="Upload and resize images to Cloudflare R2")
    parser.add_argument("--image", required=True, help="Path to local image file")
    parser.add_argument("--name", required=True, help="Base identifier / Art No")
    args = parser.parse_args()

    uploader = R2Uploader()
    urls = uploader.process_and_upload(args.image, args.name)
    sys.stdout.write(f"Uploaded successfully:\nFull: {urls['full_url']}\nThumb: {urls['thumb_url']}\n")


if __name__ == "__main__":
    main()
