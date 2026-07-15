const { YoutubeTranscript } = require('youtube-transcript');
const fs = require('fs');
const path = require('path');

function getYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function downloadYoutubeTranscript(url, outputPath) {
  const videoId = getYoutubeId(url);
  if (!videoId) {
    console.error(`[YouTube Transcript] Invalid YouTube URL: ${url}`);
    return false;
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`[YouTube Transcript] Fetching subtitles for video ID: ${videoId}...`);
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      console.warn(`[YouTube Transcript] No transcript found for video: ${videoId}`);
      return false;
    }

    const fullText = transcript.map(t => t.text).join(' ');
    
    // Decode common HTML entities
    const cleanText = fullText
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    fs.writeFileSync(outputPath, `YouTube Video Transcript (ID: ${videoId})\nSource: ${url}\n\nContent:\n${cleanText}`, 'utf8');
    console.log(`[YouTube Transcript] Subtitles successfully saved to: ${path.basename(outputPath)}`);
    return true;
  } catch (err) {
    console.error(`[YouTube Transcript] Error fetching transcript for ${videoId}:`, err.message);
    return false;
  }
}

// Support running directly for testing
if (require.main === module) {
  const url = process.argv[2];
  const out = process.argv[3] || 'test_transcript.txt';
  if (!url) {
    console.log('Usage: node query_youtube_transcript.js <youtube_url> [output_path]');
    process.exit(1);
  }
  downloadYoutubeTranscript(url, out).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { downloadYoutubeTranscript };
