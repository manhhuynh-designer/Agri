const fs = require('fs');
const path = require('path');

const RAG_INDEX_PATH = path.join(__dirname, '..', 'data', 'rag_index.json');

const STOP_WORDS = new Set([
  'kỹ', 'thuật', 'chế', 'biến', 'cách', 'hướng', 'dẫn', 'phương', 'pháp', 
  'quy', 'trình', 'giúp', 'cho', 'với', 'trong', 'theo', 'như', 'bằng', 
  'các', 'của', 'về', 'và', 'hoặc', 'những', 'đã', 'được', 'khi', 'sau', 'từ'
]);

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

  // Clean and tokenize query terms
  const allTerms = queryLower
    .replace(/[^\w\sàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);

  // Filter out stop words
  const domainTerms = allTerms.filter(t => !STOP_WORDS.has(t));
  const searchTerms = domainTerms.length > 0 ? domainTerms : allTerms;

  // Detect specific author names from query (e.g., fukuoka, sepp holzer)
  const authorKeywords = ['fukuoka', 'holzer', 'jeavons', 'mollison'];
  const matchedAuthors = authorKeywords.filter(a => queryLower.includes(a));

  // Score each chunk
  const scoredChunks = chunks.map(chunk => {
    const textLower = (chunk.text + ' ' + chunk.title).toLowerCase();
    const authorLower = (chunk.author || '').toLowerCase();
    const titleLower = chunk.title.toLowerCase();
    
    let score = 0;

    for (const term of searchTerms) {
      if (textLower.includes(term)) {
        score += 10;

        // Boost if term appears in title
        if (titleLower.includes(term)) {
          score += 30;
        }
      }
    }

    // MASSIVE BOOST for Author matches
    for (const author of matchedAuthors) {
      if (authorLower.includes(author)) {
        score += 1000;
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

  if (matches.length === 0) {
    return chunks.slice(0, topN);
  }

  return matches;
}

module.exports = {
  searchRagIndex
};

