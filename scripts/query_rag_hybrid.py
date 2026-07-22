import os
import sys
import json
import numpy as np
from sentence_transformers import SentenceTransformer

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
RAG_INDEX_FILE = os.path.join(DATA_DIR, 'rag_index.json')
RAG_VECTORS_FILE = os.path.join(DATA_DIR, 'rag_vectors.npy')

def load_rag_data():
    if not os.path.exists(RAG_INDEX_FILE) or not os.path.exists(RAG_VECTORS_FILE):
        return None, None
    with open(RAG_INDEX_FILE, 'r', encoding='utf-8') as f:
        chunks = json.load(f)
    vectors = np.load(RAG_VECTORS_FILE)
    return chunks, vectors

def hybrid_search(query, top_k=5):
    chunks, vectors = load_rag_data()
    if chunks is None or vectors is None:
        print("Error: RAG index or vectors file missing.")
        return []

    # 1. Compute Semantic Vector Similarity (Cosine Similarity)
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2', device='cuda')
    query_vec = model.encode([query], normalize_embeddings=True)[0]
    
    # Cosine similarities (normalized dot product)
    semantic_scores = np.dot(vectors, query_vec)

    # 2. Compute Keyword BM25 / TF-IDF Score
    words = [w.lower() for w in query.split() if len(w) > 2]
    keyword_scores = np.zeros(len(chunks))

    for idx, c in enumerate(chunks):
        text_lower = (c.get('title', '') + " " + c.get('text', '')).lower()
        score = 0.0
        for w in words:
            if w in text_lower:
                count = text_lower.count(w)
                score += (1.0 + np.log(count))
        keyword_scores[idx] = score

    # Normalize keyword scores
    max_kw = np.max(keyword_scores) if np.max(keyword_scores) > 0 else 1.0
    norm_kw_scores = keyword_scores / max_kw

    # 3. Combine Scores (Hybrid Score: 60% Vector Semantic + 40% Keyword Match)
    hybrid_scores = 0.6 * semantic_scores + 0.4 * norm_kw_scores

    # Get Top K indices
    top_indices = np.argsort(hybrid_scores)[::-1][:top_k]

    results = []
    for rank, i in enumerate(top_indices):
        c = chunks[i]
        results.append({
            "rank": rank + 1,
            "id": c.get('id'),
            "file": c.get('file'),
            "title": c.get('title'),
            "author": c.get('author'),
            "score": float(hybrid_scores[i]),
            "text": c.get('text')
        })

    return results

if __name__ == '__main__':
    query = sys.argv[1] if len(sys.argv) > 1 else "Kỹ thuật ủ phân hữu cơ vi sinh tại nhà"
    print(f"\n🔍 Querying Hybrid RAG (Keywords + 384D Multilingual Vectors) for: '{query}'\n")
    results = hybrid_search(query, top_k=4)
    print(json.dumps(results, ensure_ascii=False, indent=2))
