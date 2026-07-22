import os
import glob
import fitz # PyMuPDF
import json

DOCS_DIR = os.path.join(os.path.dirname(__file__), '..', 'documents')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'temp_covers')

os.makedirs(OUTPUT_DIR, exist_ok=True)

pdf_files = []
for root, dirs, files in os.walk(DOCS_DIR):
    if 'youtube_transcripts' in root:
        continue
    for file in files:
        if file.lower().endsWith('.pdf') if hasattr(file.lower(), 'endsWith') else file.lower().endswith('.pdf'):
            pdf_files.append(os.path.join(root, file))

print(f"Found {len(pdf_files)} PDF files to process.")

rendered = []
for idx, pdf_path in enumerate(pdf_files):
    rel_path = os.path.relpath(pdf_path, DOCS_DIR)
    file_name = os.path.basename(pdf_path)
    safe_name = "".join([c if c.isalnum() else "_" for c in file_name]) + f"_{idx}.png"
    out_img_path = os.path.join(OUTPUT_DIR, safe_name)

    try:
        doc = fitz.open(pdf_path)
        if len(doc) > 0:
            # Check if page 0 or page 1 has more text/content
            target_page = doc[0]
            if len(doc) > 1 and len(target_page.get_text()) < 50:
                target_page = doc[1]
            
            pix = target_page.get_pixmap(dpi=150)
            pix.save(out_img_path)
            
            rendered.append({
                "index": idx + 1,
                "fileName": file_name,
                "relPath": rel_path,
                "fullPath": pdf_path,
                "coverImg": out_img_path
            })
            if (idx + 1) % 50 == 0:
                print(f"Rendered {idx + 1}/{len(pdf_files)} PDF covers...")
    except Exception as e:
        print(f"Error rendering {file_name}: {e}")

manifest_path = os.path.join(OUTPUT_DIR, 'covers_manifest.json')
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(rendered, f, ensure_ascii=False, indent=2)

print(f"Successfully rendered {len(rendered)} covers to {OUTPUT_DIR}")
