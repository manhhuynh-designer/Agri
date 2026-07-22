import os
import fitz # PyMuPDF
import json
import re

DOCS_DIR = os.path.join(os.path.dirname(__file__), '..', 'documents')

pdf_files = []
for root, dirs, files in os.walk(DOCS_DIR):
    if 'youtube_transcripts' in root:
        continue
    for file in files:
        if file.lower().endswith('.pdf'):
            pdf_files.append(os.path.join(root, file))

results = []

for pdf_path in pdf_files:
    file_name = os.path.basename(pdf_path)
    author = ""
    
    try:
        doc = fitz.open(pdf_path)
        pages_to_check = min(3, len(doc))
        text = ""
        for p in range(pages_to_check):
            text += doc[p].get_text() + "\n"
        
        lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 2]
        
        # 1. Search for explicit "Author" / "Tác giả" / "Chủ biên" in pages 1-3 text
        for line in lines[:40]:
            m = re.search(r'(?:by|edited by|written by|tác giả|chủ biên|biên soạn|tác giả:|chủ biên:)\s+([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+){1,4})', line, re.IGNORECASE)
            if m and len(m.group(1)) > 4:
                cand = m.group(1).strip()
                # Exclude non-name noise
                if not re.search(r'table of contents|introduction|chapter|abstract|copyright|all rights|means|or is|most gardeners|publication|university|edition', cand, re.IGNORECASE):
                    author = cand
                    break
        
        # 2. Search for explicit Publishers / Organizations in pages 1-3 text
        if not author:
            for line in lines[:40]:
                if re.search(r'SARE|Sustainable Agriculture Research', line, re.I): author = "SARE Outreach (USDA)"
                elif re.search(r'USDA|United States Department of Agriculture', line, re.I): author = "USDA Agricultural Research Service"
                elif re.search(r'FAO|Food and Agriculture Organization', line, re.I): author = "FAO (Food and Agriculture Organization)"
                elif re.search(r'CSIRO', line, re.I): author = "CSIRO Publishing Australia"
                elif re.search(r'Storey Publishing|Storey Country Wisdom', line, re.I): author = "Storey Publishing"
                elif re.search(r'Rodale', line, re.I): author = "Rodale Institute"
                elif re.search(r'Nhà xuất bản Nông nghiệp|NXB Nông nghiệp', line, re.I): author = "Nhà xuất bản Nông nghiệp"
                elif re.search(r'Nhà xuất bản Lao động|NXB Lao động', line, re.I): author = "Nhà xuất bản Lao động"
                elif re.search(r'Nhà xuất bản Giáo dục|NXB Giáo dục', line, re.I): author = "Nhà xuất bản Giáo dục Việt Nam"
                elif re.search(r'Nhà xuất bản Phụ nữ|NXB Phụ nữ', line, re.I): author = "Nhà xuất bản Phụ nữ"
                elif re.search(r'Đại học Cần Thơ|ĐH Cần Thơ', line, re.I): author = "Đại học Cần Thơ"
                elif re.search(r'Đại học Nông Lâm', line, re.I): author = "Đại học Nông Lâm"
                elif re.search(r'ADDA', line, re.I): author = "Dự án ADDA Vietnam"
                if author: break

    except Exception as e:
        pass

    results.append({
        "fileName": file_name,
        "author": author # Exact printed string or BLANK if not found
    })

out_path = os.path.join(os.path.dirname(__file__), '..', 'scratch', 'fast_pdf_text_authors.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"Extracted direct PDF page text for {len(results)} files. Saved to {out_path}")
