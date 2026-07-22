import os
import json
import glob
import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import easyocr
    ocr_reader = easyocr.Reader(['vi', 'en'], gpu=True)
    print("[EasyOCR] GPU OCR Reader initialized for Vietnamese and English.", flush=True)
except Exception as e:
    ocr_reader = None
    print(f"[EasyOCR] Warning: Could not initialize GPU EasyOCR ({e}). Falling back to text-only mode.", flush=True)

DOCUMENTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'documents')
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
METADATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'scratch', 'docs_vision_strict_authors.json')
OUTPUT_RAG_INDEX = os.path.join(DATA_DIR, 'rag_index.json')

def load_metadata():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                meta_dict = {}
                for item in data:
                    fn = item.get('fileName')
                    if fn:
                        meta_dict[fn] = {
                            "exact_title": item.get('title'),
                            "author": item.get('author')
                        }
                return meta_dict
            elif isinstance(data, dict):
                return data
    return {}

def chunk_text(text, chunk_size=800, overlap=100):
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += (chunk_size - overlap)
    return chunks

def extract_pdf_chunks(filepath, filename, metadata_item):
    chunks = []
    if not fitz:
        return chunks
    try:
        doc = fitz.open(filepath)
        full_text = []
        
        max_pages = min(len(doc), 150)
        ocr_count = 0
        max_ocr_pages_per_doc = 15  # Max 15 scanned pages OCR per doc to maintain high speed
        
        for page_num in range(max_pages):
            page = doc[page_num]
            text = page.get_text("text")
            
            if text and len(text.strip()) > 30:
                cleaned_text = re.sub(r'\s+', ' ', text.strip())
                full_text.append(f"[Trang {page_num + 1}] {cleaned_text}")
            elif ocr_reader and ocr_count < max_ocr_pages_per_doc:
                try:
                    pix = page.get_pixmap(dpi=130)
                    img_bytes = pix.tobytes("png")
                    ocr_lines = ocr_reader.readtext(img_bytes, detail=0)
                    if ocr_lines:
                        cleaned_ocr = " ".join(ocr_lines).strip()
                        if len(cleaned_ocr) > 10:
                            full_text.append(f"[Trang {page_num + 1} (OCR)] {cleaned_ocr}")
                            ocr_count += 1
                except Exception:
                    pass

        combined_text = "\n".join(full_text)
        if combined_text.strip():
            raw_chunks = chunk_text(combined_text, chunk_size=700, overlap=100)
            exact_title = metadata_item.get('exact_title') or filename
            author = metadata_item.get('author') or ""
            
            for idx, c in enumerate(raw_chunks):
                chunks.append({
                    "id": f"{filename}_{idx+1}",
                    "file": filename,
                    "title": exact_title,
                    "author": author,
                    "text": c
                })
    except Exception as e:
        print(f"Error processing {filename}: {e}", flush=True)
    return chunks

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    metadata = load_metadata()
    print(f"Loaded metadata for {len(metadata)} files.", flush=True)

    files = glob.glob(os.path.join(DOCUMENTS_DIR, '**', '*.*'), recursive=True)
    print(f"Found {len(files)} total files in documents/", flush=True)

    all_chunks = []
    processed_files = 0

    for idx, filepath in enumerate(files):
        filename = os.path.basename(filepath)
        ext = os.path.splitext(filename)[1].lower()

        meta_item = metadata.get(filename, {})
        
        if ext == '.pdf':
            pdf_chunks = extract_pdf_chunks(filepath, filename, meta_item)
            if pdf_chunks:
                all_chunks.extend(pdf_chunks)
                processed_files += 1
        elif ext in ['.txt', '.md', '.doc', '.docx']:
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                if content.strip():
                    raw_chunks = chunk_text(content, chunk_size=700, overlap=100)
                    exact_title = meta_item.get('exact_title') or filename
                    author = meta_item.get('author') or ""
                    for c_idx, c in enumerate(raw_chunks):
                        all_chunks.append({
                            "id": f"{filename}_{c_idx+1}",
                            "file": filename,
                            "title": exact_title,
                            "author": author,
                            "text": c
                        })
                    processed_files += 1
            except Exception:
                pass

        if (idx + 1) % 10 == 0 or (idx + 1) == len(files):
            print(f"Progress: [{idx + 1}/{len(files)}] files processed | Total RAG Chunks: {len(all_chunks)}", flush=True)

    print(f"\n✅ Successfully processed {processed_files} files into {len(all_chunks)} chunks.", flush=True)
    
    with open(OUTPUT_RAG_INDEX, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)
    
    print(f"✅ RAG Index saved to {OUTPUT_RAG_INDEX}", flush=True)

if __name__ == '__main__':
    main()
