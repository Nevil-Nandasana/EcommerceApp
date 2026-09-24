"""
Figma Design Exporter for Speqtus EcommerceApp
Downloads all frames / screens from Figma into the UiDesgins folder.
"""

import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

FILE_KEY = "rMivdusXTFFF7ndPKbLtri"
OUTPUT_DIR = Path(__file__).resolve().parent

def get_figma_data(url: str, token: str):
    headers = {
        "X-Figma-Token": token,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def download_file(url: str, dest_path: Path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as f:
        f.write(resp.read())

def sync_figma(token: str):
    print(f"[*] Fetching Figma file: {FILE_KEY}...")
    file_data = get_figma_data(f"https://api.figma.com/v1/files/{FILE_KEY}", token)
    
    file_name = file_data.get("name", "EcommerceApp")
    last_modified = file_data.get("lastModified", "")
    print(f"[+] Connected to: '{file_name}' (Last modified: {last_modified})")

    # Save raw document schema
    schema_file = OUTPUT_DIR / "figma_schema.json"
    with open(schema_file, "w", encoding="utf-8") as f:
        json.dump(file_data, f, indent=2)
    print(f"[+] Saved document schema to {schema_file.name}")

    # Traverse document to find top-level frames / artboards across pages
    document = file_data.get("document", {})
    pages = document.get("children", [])
    
    frames_to_download = []
    
    for page in pages:
        page_name = page.get("name", "Page")
        page_children = page.get("children", [])
        for child in page_children:
            # We want top-level frames, components, or component sets that represent screens
            child_type = child.get("type")
            if child_type in ["FRAME", "COMPONENT", "COMPONENT_SET", "GROUP"]:
                bbox = child.get("absoluteBoundingBox") or {}
                width = bbox.get("width", 0)
                height = bbox.get("height", 0)
                frames_to_download.append({
                    "id": child.get("id"),
                    "name": child.get("name"),
                    "page": page_name,
                    "type": child_type,
                    "width": width,
                    "height": height
                })

    print(f"[+] Found {len(frames_to_download)} screens/frames.")
    if not frames_to_download:
        print("[!] No top-level frames found. Inspecting child nodes...")
        return

    # Download rendered images in batches of 20
    images_dir = OUTPUT_DIR / "screens"
    images_dir.mkdir(exist_ok=True)

    batch_size = 20
    all_image_urls = {}
    
    for i in range(0, len(frames_to_download), batch_size):
        batch = frames_to_download[i:i + batch_size]
        ids = ",".join(f["id"] for f in batch)
        print(f"[*] Requesting render URLs for batch {i // batch_size + 1} ({len(batch)} items)...")
        img_data = get_figma_data(
            f"https://api.figma.com/v1/images/{FILE_KEY}?ids={ids}&format=png&scale=2",
            token
        )
        images = img_data.get("images", {})
        all_image_urls.update(images)

    # Download image files
    catalog = []
    for frame in frames_to_download:
        frame_id = frame["id"]
        frame_name = frame["name"]
        clean_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in frame_name).strip("_")
        file_name = f"{clean_name}_{frame_id.replace(':', '_')}.png"
        dest_path = images_dir / file_name

        img_url = all_image_urls.get(frame_id)
        if img_url:
            print(f"  Downloading: {clean_name} ({frame['width']}x{frame['height']})...")
            try:
                download_file(img_url, dest_path)
                frame["filename"] = file_name
                frame["path"] = f"screens/{file_name}"
                catalog.append(frame)
            except Exception as e:
                print(f"  [!] Failed to download {frame_name}: {e}")
        else:
            print(f"  [!] No render URL for {frame_name} ({frame_id})")

    # Generate README index
    readme_path = OUTPUT_DIR / "README.md"
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(f"# Speqtus Ecommerce App — UI Designs\n\n")
        f.write(f"- **Source:** Figma [{file_name}](https://www.figma.com/design/{FILE_KEY})\n")
        f.write(f"- **Last Synced:** {last_modified}\n")
        f.write(f"- **Total Screens:** {len(catalog)}\n\n")
        f.write(f"## Screen Gallery\n\n")
        f.write(f"| Preview | Screen / Frame Name | Dimensions | Page |\n")
        f.write(f"|---|---|---|---|\n")
        for item in catalog:
            f.write(f"| ![{item['name']}](screens/{item['filename']}) | **{item['name']}** | {int(item['width'])}x{int(item['height'])} | {item['page']} |\n")

    print(f"\n[OK] Successfully synced {len(catalog)} screens into {OUTPUT_DIR}")
    print(f"[OK] Created index at {readme_path}")

if __name__ == "__main__":
    token = os.environ.get("FIGMA_ACCESS_TOKEN")
    if len(sys.argv) > 1:
        token = sys.argv[1]

    if not token:
        print("Usage: python sync_figma.py <FIGMA_ACCESS_TOKEN>")
        print("Or set FIGMA_ACCESS_TOKEN environment variable.")
        sys.exit(1)

    sync_figma(token)
