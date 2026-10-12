"""
Speqtus Medical Catalog Extraction Pipeline (Phase 1, T1.1.1, T1.2.1)

Rasterizes PDF catalog pages from CatPDF/SPEQTUS SURGICAL INSTRUMENTS.pdf,
runs high-accuracy OCR / text analysis, extracts Art Nos, sizes, instrument names,
crops product instrument photos into optimized WebP assets, and outputs clean CSV
and JSON datasets ready for Google Sheet review and database seeding.

Governed by: PRD Section 6.2 and Planning/VARIABLE_REGISTRY.md
"""

import os
import sys
import csv
import json
import re
import argparse
import subprocess
from typing import List, Dict, Any, Optional, Set

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    from PIL import Image
except ImportError:
    Image = None


CATALOG_COLUMNS = [
    "parent_category",
    "category_name",
    "product_name",
    "description",
    "art_no",
    "size_label",
    "size_cm",
    "search_tags",
    "image_filename",
    "source_page",
]

PARENT_CAT_KEYWORDS = [
    ("GENERAL SURGERY", "General Surgery Instruments"),
    ("GYNAECOLOGY", "Gynecology Instruments"),
    ("GYNECOLOGY", "Gynecology Instruments"),
    ("CARDIAC", "Cardiac & Thoracic Instruments"),
    ("THORACIC", "Cardiac & Thoracic Instruments"),
    ("NEUROLOGY", "Neurology & Spine Instruments"),
    ("SPINE", "Neurology & Spine Instruments"),
    ("ORTHOPAEDIC", "Orthopedic Instruments"),
    ("ORTHOPEDIC", "Orthopedic Instruments"),
    ("ENT", "ENT Instruments"),
    ("OPHTHALMIC", "Ophthalmic Instruments"),
    ("PLASTIC", "Plastic Surgery Instruments"),
    ("UROLOGY", "Urology Instruments"),
    ("DENTAL", "Dental Instruments"),
]

ART_NO_REGEX = re.compile(r"\b(\d{2}[-.]\d{2,3}[-.]\d{2,3}|SP[-.]\d{2}[-.]\d{2})\b")
SIZE_REGEX = re.compile(r"(\d+(?:\.\d+)?)\s*(?:cm|CM|mm|MM|\"|inch|[Cc][Mm])", re.IGNORECASE)


class CatalogExtractor:
    def __init__(self, pdf_path: str, output_dir: str):
        self.pdf_path = pdf_path
        self.output_dir = output_dir
        self.pages_dir = os.path.join(output_dir, "pages")
        self.ocr_dir = os.path.join(output_dir, "ocr")
        self.images_dir = os.path.join(output_dir, "images")

        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.pages_dir, exist_ok=True)
        os.makedirs(self.ocr_dir, exist_ok=True)
        os.makedirs(self.images_dir, exist_ok=True)

    def extract_page_images(self, max_pages: Optional[int] = None) -> List[int]:
        """Extract full-page raster images from PDF."""
        if not fitz:
            raise RuntimeError("PyMuPDF (fitz) is not installed. Run: pip install pymupdf")

        doc = fitz.open(self.pdf_path)
        total_pages = len(doc)
        limit = min(total_pages, max_pages + 2) if max_pages else total_pages
        extracted_pages: List[int] = []

        sys.stdout.write(f"Extracting page images from {self.pdf_path} (Total pages: {total_pages})...\n")
        for pno in range(2, limit):
            page = doc[pno]
            imgs = page.get_images()
            if not imgs:
                continue
            xref = imgs[0][0]
            base_img = doc.extract_image(xref)
            out_img_path = os.path.join(self.pages_dir, f"page_{pno}.jpg")
            with open(out_img_path, "wb") as f:
                f.write(base_img["image"])
            extracted_pages.append(pno)

        sys.stdout.write(f"Extracted {len(extracted_pages)} page images.\n")
        return extracted_pages

    def ensure_ocr_data(self) -> None:
        """Run batch OCR if OCR directory is empty."""
        existing_json = [f for f in os.listdir(self.ocr_dir) if f.endswith(".json")]
        if len(existing_json) >= 50:
            sys.stdout.write(f"Using {len(existing_json)} existing OCR JSON files in {self.ocr_dir}.\n")
            return

        ps1_path = os.path.join(os.path.dirname(__file__), "run_ocr_batch.ps1")
        if os.path.exists(ps1_path):
            sys.stdout.write("Running Windows Media OCR batch...\n")
            cmd = [
                "powershell",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                ps1_path,
                "-InputDir",
                self.pages_dir,
                "-OutputDir",
                self.ocr_dir,
            ]
            subprocess.run(cmd, check=True)

    def clean_candidate_name(self, candidate: str, fallback_category: str) -> str:
        if not candidate:
            return fallback_category
        candidate = re.sub(r"^[-–:,|•*#\s\d'\"`.]+", "", candidate)
        candidate = re.sub(r"[-–:,|•*#\s\d'\"`.]+$", "", candidate)
        if len(candidate) <= 2:
            return fallback_category
        if SIZE_REGEX.search(candidate) and len(candidate) < 25:
            return fallback_category
        if ART_NO_REGEX.search(candidate):
            return fallback_category
        upper = candidate.upper()
        if upper in ["SIZE", "ART NO", "ART NG", "PAGE", "FIG", "CM", "MM", "INSTRUMENTS", "WITHOUT T.C. TIP", "WITH T.C. TIP"]:
            return fallback_category
        return candidate.title()

    def parse_all_pages(self, max_pages: Optional[int] = None) -> List[Dict[str, Any]]:
        """Parse structured catalog records from OCR JSON files."""
        self.ensure_ocr_data()

        json_files = sorted(
            [f for f in os.listdir(self.ocr_dir) if f.endswith(".json")],
            key=lambda x: int(re.findall(r"\d+", x)[0]) if re.findall(r"\d+", x) else 0,
        )

        if max_pages:
            json_files = json_files[:max_pages]

        records: List[Dict[str, Any]] = []
        seen_art_nos: Set[str] = set()

        current_parent_category = "General Surgery Instruments"
        current_category = "General Surgery Instruments"

        for fname in json_files:
            fpath = os.path.join(self.ocr_dir, fname)
            try:
                with open(fpath, "r", encoding="utf-8-sig") as f:
                    data = json.load(f)
            except Exception:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)

            page_num = data.get("page", 0)
            lines = [l.strip() for l in data.get("lines", []) if l.strip()]
            text = data.get("text", "")

            # 1. Detect parent category
            for kw, norm_cat in PARENT_CAT_KEYWORDS:
                if kw in text.upper():
                    current_parent_category = norm_cat
                    break

            # 2. Detect sub-category
            for line in lines[:8]:
                upper_line = line.upper()
                if any(kw in upper_line for kw in [
                    "FORCEPS", "SCISSORS", "NEEDLE", "RETRACTOR", "SPECULUM",
                    "HANDLES", "PLIER", "RONGEUR", "ELEVATOR", "CLAMP",
                    "CURETTE", "HOOK", "CHISEL", "OSTEOTOME", "PUNCH", "SUCTION",
                    "BONE CUTTING", "BONE HOLDING"
                ]):
                    if len(line) < 55 and not ART_NO_REGEX.search(line) and not SIZE_REGEX.search(line):
                        current_category = line.title()
                        break

            # 3. Detect products and variants
            for i, line in enumerate(lines):
                art_matches = ART_NO_REGEX.findall(line)
                if not art_matches:
                    continue

                for raw_art in art_matches:
                    art_no = raw_art.replace(".", "-")
                    if art_no in seen_art_nos:
                        continue
                    seen_art_nos.add(art_no)

                    # Determine size label & numeric cm
                    size_label = "Standard"
                    size_cm = None
                    for offset in range(-3, 4):
                        if 0 <= i + offset < len(lines):
                            cand_line = lines[i + offset]
                            smatch = SIZE_REGEX.search(cand_line)
                            if smatch:
                                cleaned_size = re.sub(r"^[-–:,|•*#\s]+", "", cand_line)
                                cleaned_size = re.sub(r"[-–:,|•*#\s]+$", "", cleaned_size)
                                cleaned_size = cleaned_size.replace("Size", "").replace("Art No", "").strip(" -–:,|")
                                if cleaned_size:
                                    size_label = cleaned_size
                                try:
                                    size_cm = float(smatch.group(1))
                                except ValueError:
                                    pass
                                break

                    # Determine product title
                    prod_name = current_category
                    for lookback in range(1, 9):
                        if i - lookback >= 0:
                            cand = lines[i - lookback]
                            cleaned_title = self.clean_candidate_name(cand, "")
                            if cleaned_title and cleaned_title != current_category:
                                prod_name = cleaned_title
                                break

                    clean_tag_parent = current_parent_category.split()[0]
                    clean_tag_cat = current_category.split()[0]
                    search_tags = list(set([clean_tag_parent, clean_tag_cat, "Surgical", "Instrument"]))

                    records.append({
                        "parent_category": current_parent_category,
                        "category_name": current_category,
                        "product_name": prod_name,
                        "description": f"High precision surgical instrument manufactured from premium medical-grade stainless steel. ISO 13485 certified.",
                        "art_no": art_no,
                        "size_label": size_label,
                        "size_cm": size_cm,
                        "search_tags": search_tags,
                        "image_filename": f"{art_no}.webp",
                        "source_page": page_num,
                    })

        sys.stdout.write(f"Parsed {len(records)} total unique variants across {len(json_files)} pages.\n")
        return records

    def crop_product_images(self, records: List[Dict[str, Any]]) -> None:
        """Crop and save optimized product image thumbnails."""
        if not Image:
            sys.stdout.write("Pillow not installed; skipping image cropping.\n")
            return

        sys.stdout.write("Generating product WebP image assets...\n")
        page_crops_cache: Dict[int, Image.Image] = {}

        # Group records by source page
        by_page: Dict[int, List[Dict[str, Any]]] = {}
        for r in records:
            p = r["source_page"]
            by_page.setdefault(p, []).append(r)

        cropped_count = 0
        for page_num, items in by_page.items():
            page_img_path = os.path.join(self.pages_dir, f"page_{page_num}.jpg")
            if not os.path.exists(page_img_path):
                continue

            try:
                with Image.open(page_img_path) as page_img:
                    w, h = page_img.size
                    header_h = int(h * 0.12)
                    footer_h = int(h * 0.05)
                    usable_h = h - header_h - footer_h

                    num_items = len(items)
                    # Heuristic grid layout
                    if num_items <= 3:
                        cols = num_items
                        rows = 1
                    elif num_items <= 6:
                        cols = 3
                        rows = 2
                    elif num_items <= 9:
                        cols = 3
                        rows = 3
                    else:
                        cols = 3
                        rows = 4

                    col_w = w // max(cols, 1)
                    row_h = usable_h // max(rows, 1)

                    for idx, item in enumerate(items):
                        r_idx = min(idx // cols, rows - 1)
                        c_idx = idx % cols

                        left = c_idx * col_w
                        top = header_h + r_idx * row_h
                        right = min(left + col_w, w)
                        bottom = min(top + row_h, h - footer_h)

                        crop_box = (left, top, right, bottom)
                        cropped = page_img.crop(crop_box)
                        cropped.thumbnail((800, 800), Image.Resampling.LANCZOS)

                        out_path = os.path.join(self.images_dir, f"{item['art_no']}.webp")
                        cropped.save(out_path, format="WEBP", quality=85)
                        cropped_count += 1
            except Exception as e:
                sys.stdout.write(f"Warning: Failed to crop page {page_num}: {e}\n")

        sys.stdout.write(f"Successfully generated {cropped_count} WebP product instrument images.\n")

    def save_records(self, records: List[Dict[str, Any]]) -> None:
        """Export clean CSV and JSON datasets."""
        csv_path = os.path.join(self.output_dir, "catalog_master.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CATALOG_COLUMNS)
            writer.writeheader()
            for r in records:
                row_copy = dict(r)
                if isinstance(row_copy.get("search_tags"), list):
                    row_copy["search_tags"] = "{" + ",".join(row_copy["search_tags"]) + "}"
                writer.writerow(row_copy)

        json_path = os.path.join(self.output_dir, "catalog_master.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)

        # Mirror to scripts/catalog_data.json for seed_catalog.py
        scripts_json_path = os.path.join("scripts", "catalog_data.json")
        with open(scripts_json_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)

        sys.stdout.write(f"Saved master CSV to: {csv_path}\n")
        sys.stdout.write(f"Saved master JSON to: {json_path}\n")
        sys.stdout.write(f"Mirrored data to: {scripts_json_path}\n")


def main():
    parser = argparse.ArgumentParser(description="Extract Speqtus catalog items from PDF.")
    parser.add_argument("--pdf", default="CatPDF/SPEQTUS SURGICAL INSTRUMENTS.pdf", help="Path to PDF")
    parser.add_argument("--output", default="output/catalog", help="Output directory")
    parser.add_argument("--pages", type=int, default=None, help="Limit pages to process")
    parser.add_argument("--skip-crop", action="store_true", help="Skip cropping WebP images")
    args = parser.parse_args()

    extractor = CatalogExtractor(args.pdf, args.output)

    # 1. Extract pages if needed
    if not os.path.exists(extractor.pages_dir) or len(os.listdir(extractor.pages_dir)) < 10:
        extractor.extract_page_images(max_pages=args.pages)

    # 2. Parse OCR results into structured records
    records = extractor.parse_all_pages(max_pages=args.pages)

    # 3. Crop product instrument images
    if not args.skip_crop:
        extractor.crop_product_images(records)

    # 4. Save CSV and JSON datasets
    extractor.save_records(records)
    sys.stdout.write(f"--- Pipeline Finished Successfully: {len(records)} Surgical Products Ingested ---\n")


if __name__ == "__main__":
    main()
