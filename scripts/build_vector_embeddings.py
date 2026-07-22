import os
import json
import time
import numpy as np
from sentence_transformers import SentenceTransformer

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
RAG_INDEX_FILE = os.path.join(DATA_DIR, 'rag_index.json')
OUTPUT_VECTORS_FILE = os.path.join(DATA_DIR, 'rag_vectors.npy')
OUTPUT_METADATA_FILE = os.path.join(DATA_DIR, 'rag_index_with_vectors.json')

def main():
    if not os.path.exists(RAG_INDEX_FILE):
        print(f"Error: {RAG_INDEX_FILE} not found.")
        return

    print("📖 Loading RAG Index...")
    with open(RAG_INDEX_FILE, 'r', encoding='utf-8') as f:
        chunks = json.load(f)

    print(f"Loaded {len(chunks)} text chunks.")

    print("🚀 Initializing Multilingual Embedding Model (paraphrase-multilingual-MiniLM-L12-v2)...")
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2', device='cuda')
    print("✅ Model loaded successfully on GPU (CUDA).")

    texts = [f"{c.get('title', '')}: {c.get('text', '')}" for c in chunks]

    print(f"⚡ Encoding {len(texts)} chunks into 384-dimensional Dense Vectors (Batch Size 64)...")
    start_time = time.time()
    embeddings = model.encode(texts, batch_size=64, show_progress_bar=True, normalize_embeddings=True)
    duration = time.time() - start_time

    print(f"✅ Generated {embeddings.shape[0]} vector embeddings of dimension {embeddings.shape[1]} in {duration:.2f} seconds!")

    # Save vectors to numpy matrix
    np.save(OUTPUT_VECTORS_FILE, embeddings)
    print(f"💾 Vector Matrix saved to {OUTPUT_VECTORS_FILE}")

    print("🎉 Hybrid RAG Vector Indexing Complete!")

if __name__ == '__main__':
    main()
