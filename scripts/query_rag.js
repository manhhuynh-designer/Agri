const fs = require('fs');
const path = require('path');

const RAG_INDEX_PATH = path.join(__dirname, '..', 'data', 'rag_index.json');

/**
 * Perform RAG Retrieval for a given topic/query string
 * Returns top N matching chunks with exact document title & author
 */
function searchRagIndex(query, topN = 4) {
  if (!fs.existsSync(RAG_INDEX_PATH)) {
    console.warn(`[RAG Search] Index file not found at ${RAG_INDEX_PATH}`);
    return [];
  }

  const rawData = fs.readFileSync(RAG_INDEX_PATH, 'utf-8');
  const chunks = JSON.parse(rawData);

  const queryLower = query.toLowerCase();

  // Clean and tokenize query words (lowercase, remove punctuation, filter short words)
  const queryTerms = queryLower
    .replace(/[^\w\sàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  if (queryTerms.length === 0) {
    return chunks.slice(0, topN);
  }

  // Detect specific author names from query (e.g., fukuoka, sepp holzer)
  const authorKeywords = ['fukuoka', 'holzer', 'jeavons', 'mollison'];
  const matchedAuthors = authorKeywords.filter(a => queryLower.includes(a));

  // Score each chunk
  const scoredChunks = chunks.map(chunk => {
    const textLower = (chunk.text + ' ' + chunk.title).toLowerCase();
    const authorLower = (chunk.author || '').toLowerCase();
    const titleLower = chunk.title.toLowerCase();
    
    let score = 0;

    for (const term of queryTerms) {
      if (textLower.includes(term)) {
        score += 1;
        // Extra weight if term appears in document title
        if (titleLower.includes(term)) {
          score += 5;
        }
      }
    }

    // MASSIVE BOOST for Author matches
    for (const author of matchedAuthors) {
      if (authorLower.includes(author)) {
        score += 1000;
      }
    }

    // MASSIVE BOOST for Exact Title match words
    if (matchedAuthors.length === 0) {
      // If no specific author, boost titles that have high overlap
      let titleOverlap = 0;
      for (const term of queryTerms) {
        if (titleLower.includes(term)) titleOverlap++;
      }
      if (titleOverlap >= 3) {
        score += titleOverlap * 20;
      }
    }

    return { chunk, score };
  });

  // Filter chunks with score > 0, sort descending by score
  const matches = scoredChunks
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(item => item.chunk);

  // If no match found, pick topN chunks from index to avoid empty context
  if (matches.length === 0) {
    return chunks.slice(0, topN);
  }

  return matches;
}

module.exports = {
  searchRagIndex
};
