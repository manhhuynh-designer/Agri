const fs = require('fs');
const path = require('path');

const TOPICS_FILE = path.join(__dirname, '..', '_data', 'topics.json');
const POSTS_DIR = path.join(__dirname, '..', '_posts');

const youtubeMapping = {
  "u-phan-chuong-hoai-muc": "https://www.youtube.com/watch?v=gOwZkShSjP0",
  "quan-ly-dich-hai-ipm": "https://www.youtube.com/watch?v=nSK1i2VH650",
  "cay-che-phu-dat-phu-xanh": "https://www.youtube.com/watch?v=0lXYvJKUHdM",
  "mo-hinh-luan-canh-xen-canh": "https://www.youtube.com/watch?v=pMXrn5VNG4I",
  "he-sinh-thai-vac-truyen-thong": "https://www.youtube.com/watch?v=PjdtLeCNkc0",
  "ky-thuat-trong-rau-sach-huu-co": "https://www.youtube.com/watch?v=ASZAF8RKAR4",
  "thuoc-tru-sau-thao-moc": "https://www.youtube.com/watch?v=6G_k3LbASak",
  "vi-sinh-vat-ban-dia-imo": "https://www.youtube.com/watch?v=6oePiLWM4Jk"
};

// 1. Update _data/topics.json
if (fs.existsSync(TOPICS_FILE)) {
  const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
  topics.forEach(topic => {
    if (youtubeMapping[topic.id]) {
      topic.youtube = youtubeMapping[topic.id];
    }
  });
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2));
  console.log('Successfully updated _data/topics.json with unique YouTube URLs.');
}

// Helper to extract YouTube video ID from URL
function getYoutubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// 2. Scan and update _posts/
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.html'));
files.forEach(file => {
  const filepath = path.join(POSTS_DIR, file);
  let content = fs.readFileSync(filepath, 'utf-8');
  let updated = false;

  Object.entries(youtubeMapping).forEach(([topicId, url]) => {
    if (file.includes(topicId)) {
      const newYtId = getYoutubeId(url);
      if (newYtId) {
        // Regex to find youtube iframe embed source
        const embedRegex = /https:\/\/www\.youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/g;
        if (content.match(embedRegex)) {
          content = content.replace(embedRegex, `https://www.youtube.com/embed/${newYtId}`);
          updated = true;
        } else {
          // If no iframe is present (e.g. ky-thuat-trong-rau-sach-huu-co didn't have one because it was marked broken),
          // let's insert the video section at the end of the post!
          const ytSection = `\n\n---\n### Video tham khảo thực tế\nXem video hướng dẫn chi tiết liên quan đến chủ đề từ YouTube:\n\n<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);"><iframe src="https://www.youtube.com/embed/${newYtId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"></iframe></div>`;
          
          // Insert right before reference section, or at the end
          if (content.includes('### Tài liệu trích dẫn chi tiết')) {
            content = content.replace('### Tài liệu trích dẫn chi tiết', `${ytSection.trim()}\n\n### Tài liệu trích dẫn chi tiết`);
          } else {
            content = content.trim() + '\n' + ytSection;
          }
          updated = true;
        }
      }
    }
  });

  if (updated) {
    fs.writeFileSync(filepath, content);
    console.log(`Successfully updated YouTube embed in: _posts/${file}`);
  }
});
