# Speqtus Ordering App — Catalog Product Image Quality & Refinement Plan

> **Priority:** HIGH (Action Item for Next Session)  
> **Origin:** User Catalog Inspection (October 12, 2026)  
> **Status:** QUEUED FOR NEXT SESSION  
> **Governed by:** [Planning/DECISIONS.md](./DECISIONS.md) (Section 5)

---

## 1. Problem Statement & Audit Findings

During manual verification of the catalog extraction pipeline, inspection of the extracted product images revealed:
1. **Unwanted Non-Product Elements:** The initial heuristic bounding-box crops from the rasterized scanned catalog pages (`CatPDF/SPEQTUS SURGICAL INSTRUMENTS.pdf`) captured page margins, section banners (e.g. blue/red header labels like "NO. 3"), and printed text (size labels, Art Nos) rather than clean, isolated instrument product photos.
2. **Ecommerce Presentation Standard:** A premium B2B medical ordering platform requires clean, high-resolution, isolated surgical instrument photography on neutral or white backgrounds (or transparent WebP), free of scanned page text artifacts.
3. **Current State:**
   - Catalog structured data is 100% complete and validated: All 1,217 variants, Art Nos, size measurements, and categories are preserved in `assets/catalog/master_catalog.json` and `scripts/catalog_data.json`.
   - Raw extraction images in `output/catalog/` are intentionally kept out of GitHub.

---

## 2. Action Plan for Next Session

When returning to the project, execute the following steps to fix the product imagery:

### Step 1: Instrument Isolation & Precision Cropping
- Re-run or refine `scripts/extract_catalog.py` with tighter bounding box coordinates focusing exclusively on the instrument silhouettes, excluding header banners and text blocks.
- Alternatively, apply background removal / white-balance thresholding (using Pillow / OpenCV / Rembg) to isolate the stainless steel instruments against clean white backgrounds.

### Step 2: High-Quality WebP Generation
- Produce two standard WebP variants per instrument:
  - **Thumbnail:** Max 200×200 px (quality 80, optimized for fast grid / list browsing).
  - **Full Size:** Max 800×800 px (quality 85, optimized for pinch-to-zoom product detail view).
- Filename format: `{clean_art_no}_thumb.webp` and `{clean_art_no}_full.webp`.

### Step 3: Cloudflare R2 Sync & Catalog CDN URL Mapping
- Run `scripts/upload_to_r2.py` with live Cloudflare R2 credentials to push the refined images to `speqtus-product-images/products/`.
- Ensure public CDN prefix (`https://images.speqtusmedical.com/products/{clean_art_no}_full.webp`) resolves accurately.

### Step 4: Verification & Doctor Experience Validation
- Inspect product detail carousel in `app/product/[id].tsx` and category flash list in `app/category/[id].tsx` to confirm crisp, professional visual presentation.
