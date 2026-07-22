import os
import glob
import re

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

DOCUMENTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'documents')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'temp_covers', 'pages')

os.makedirs(OUTPUT_DIR, exist_ok=True)

def sanitize_filename(filename):
    name, _ = os.path.splitext(filename)
    clean = re.sub(r'[^a-zA-Z0-9]', '_', name)
    return clean

def render_pages(filepath, filename):
    if not fitz:
        return
    clean_name = sanitize_filename(filename)
    try:
        doc = fitz.open(filepath)
        num_pages = min(3, len(doc))
        for p in range(num_pages):
            out_file = os.path.join(OUTPUT_DIR, f"{clean_name}_p{p+1}.png")
            if os.path.exists(out_file) and os.path.getsize(out_file) > 1000:
                continue
            page = doc[p]
            pix = page.get_pixmap(dpi=120)
            pix.save(out_file)
    except Exception as e:
        print(f"Error rendering {filename}: {e}")

def main():
    files = glob.glob(os.path.join(DOCUMENTS_DIR, '**', '*.*'), recursive=True)
    print(f"Rendering pages 1-3 for {len(files)} documents...")
    count = 0
    for filepath in files:
        filename = os.path.basename(filepath)
        ext = os.path.splitext(filename)[1].lower()
        if ext == '.pdf':
            render_pages(filepath, filename)
            count += 1
            if count % 20 == 0:
                print(f"Rendered pages for {count}/{len(files)} files...")
    print(f"Finished rendering pages 1-3 for all {count} PDF documents!")

if __name__ == '__main__':
    main()
