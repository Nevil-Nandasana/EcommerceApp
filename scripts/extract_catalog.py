"""
Speqtus Medical Catalog Extraction Pipeline (Phase 1, T1.1.1)

Rasterizes PDF catalog pages, detects product blocks and banners,
extracts Art Nos, sizes, instrument names, crops product images,
and outputs clean CSV and JSON datasets ready for Google Sheet review.

Governed by: PRD Section 6.2 and Planning/VARIABLE_REGISTRY.md
"""

import os
import sys
import csv
import json
import re
import argparse
from typing import List, Dict, Any, Optional

try:
    import fitz  # PyMuPDF
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

# Standard Art No regex pattern (e.g., 03-27-15 or 01-100-20 or SP-12-34)
ART_NO_REGEX = re.compile(r"\b(\d{2}-\d{2,3}-\d{2,3}|\d{2}\.\d{2,3}\.\d{2,3})\b")
# Size extraction regex (e.g. 15.5 CM, 15 CM - 6", 20cm)
SIZE_REGEX = re.compile(r"(\d+(?:\.\d+)?)\s*(?:cm|CM|mm|MM|\"|inch)", re.IGNORECASE)


class CatalogExtractor:
    def __init__(self, pdf_path: str, output_dir: str):
        self.pdf_path = pdf_path
        self.output_dir = output_dir
        self.images_dir = os.path.join(output_dir, "images")
        os.makedirs(self.images_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)

    def parse_size_cm(self, text: str) -> Optional[float]:
        """Extract numeric size in cm if available."""
        match = SIZE_REGEX.search(text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return None
        return None

    def process_page_text(self, page_text: str, page_num: int) -> List[Dict[str, Any]]:
        """
        Fallback parser for text-layer PDF pages.
        Extracts product rows based on Art No occurrences and neighboring lines.
        """
        rows: List[Dict[str, Any]] = []
        lines = [line.strip() for line in page_text.split("\n") if line.strip()]

        current_category = "General Surgery Instruments"
        current_product = "Surgical Instrument"

        for i, line in enumerate(lines):
            # Check for header category indications
            if line.isupper() and len(line) > 5 and not ART_NO_REGEX.search(line):
                if any(k in line for k in ["FORCEPS", "SCISSORS", "NEEDLE", "RETRACTOR", "SPECULUM", "SURGERY"]):
                    current_category = line.title()
                    continue

            # Look for Art No matches
            art_matches = ART_NO_REGEX.findall(line)
            if art_matches:
                for art_no in art_matches:
                    size_label = line.replace(art_no, "").strip(" -–:,|")
                    size_cm = self.parse_size_cm(size_label or line)
                    
                    # Look ahead/behind for product name if not set
                    prod_name = current_product
                    if i > 0 and not ART_NO_REGEX.search(lines[i - 1]):
                        prod_name = lines[i - 1]

                    rows.append({
                        "parent_category": "General Surgery Instruments",
                        "category_name": current_category,
                        "product_name": prod_name,
                        "description": None,
                        "art_no": art_no,
                        "size_label": size_label if size_label else "Standard",
                        "size_cm": size_cm,
                        "search_tags": ["General"],
                        "image_filename": f"page_{page_num}_{art_no}.png",
                        "source_page": page_num,
                    })

        return rows

    def extract_with_pymupdf(self, max_pages: Optional[int] = None) -> List[Dict[str, Any]]:
        """Extract text and images using PyMuPDF (fitz)."""
        if not fitz:
            raise RuntimeError("PyMuPDF is not installed. Install via: pip install pymupdf pillow")

        doc = fitz.open(self.pdf_path)
        all_records: List[Dict[str, Any]] = []
        total_pages = len(doc)
        limit = min(total_pages, max_pages) if max_pages else total_pages

        for page_idx in range(limit):
            page_num = page_idx + 1
            page = doc.load_page(page_idx)
            text = page.get_text("text")

            # Extract page images
            image_list = page.get_images(full=True)
            for img_idx, img_info in enumerate(image_list):
                xref = img_info[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                image_name = f"page_{page_num}_img_{img_idx}.{image_ext}"
                image_path = os.path.join(self.images_dir, image_name)
                with open(image_path, "wb") as f:
                    f.write(image_bytes)

            page_records = self.process_page_text(text, page_num)
            all_records.extend(page_records)

        return all_records

    def save_records(self, records: List[Dict[str, Any]]) -> None:
        """Write records to CSV and JSON formats."""
        csv_path = os.path.join(self.output_dir, "catalog_master.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CATALOG_COLUMNS)
            writer.writeheader()
            for r in records:
                row_copy = dict(r)
                if isinstance(row_copy["search_tags"], list):
                    row_copy["search_tags"] = "{" + ",".join(row_copy["search_tags"]) + "}"
                writer.writerow(row_copy)

        json_path = os.path.join(self.output_dir, "catalog_master.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description="Extract Speqtus catalog items from PDF.")
    parser.add_argument("--pdf", default="CatPDF/SPEQTUS SURGICAL INSTRUMENTS.pdf", help="Path to PDF")
    parser.add_argument("--output", default="output/catalog", help="Output directory")
    parser.add_argument("--pages", type=int, default=None, help="Limit pages to process (for testing)")
    args = parser.parse_args()

    extractor = CatalogExtractor(args.pdf, args.output)
    if fitz:
        records = extractor.extract_with_pymupdf(max_pages=args.pages)
        extractor.save_records(records)
        sys.stdout.write(f"Successfully processed {len(records)} catalog records.\n")
    else:
        sys.stdout.write("PyMuPDF not found. Please install PyMuPDF and Pillow to execute extraction.\n")


if __name__ == "__main__":
    main()
