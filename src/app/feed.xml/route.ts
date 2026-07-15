import fs from "fs";
import path from "path";
import matter from "gray-matter";

export async function GET() {
  const postsDirectory = path.join(process.cwd(), "_posts");
  let posts: any[] = [];

  if (fs.existsSync(postsDirectory)) {
    const filenames = fs.readdirSync(postsDirectory);
    posts = filenames
      .filter((filename) => filename.endsWith(".md"))
      .map((filename) => {
        const filePath = path.join(postsDirectory, filename);
        const fileContents = fs.readFileSync(filePath, "utf8");
        const { data } = matter(fileContents);
        const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
        const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
        const dateString = dateMatch ? dateMatch[1] : "";
        return {
          slug,
          title: data.title || slug,
          description: data.description || "",
          dateString,
          author: data.author || "AgriSynthe AI",
          tags: Array.isArray(data.tags) ? data.tags : [],
        };
      });
  }

  // Sort by date descending
  posts.sort((a, b) => new Date(b.dateString).getTime() - new Date(a.dateString).getTime());

  const rss = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <generator uri="https://nextjs.org/">Next.js</generator>
  <link href="https://manhhuynh-designer.github.io/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="https://manhhuynh-designer.github.io/" rel="alternate" type="text/html"/>
  <updated>${new Date().toISOString()}</updated>
  <id>https://manhhuynh-designer.github.io/</id>
  <title type="html">AgriSynthe</title>
  <subtitle>AgriSynthe - Thư viện số tự động tổng hợp, chắt lọc và biên soạn kiến thức nông nghiệp hữu cơ bền vững từ các tài liệu khoa học, sách kinh điển bởi Trí tuệ Nhân tạo (AI).</subtitle>
  ${posts
    .slice(0, 10)
    .map((post) => {
      const url = `https://manhhuynh-designer.github.io/posts/${post.slug}`;
      const pubDate = post.dateString ? new Date(post.dateString).toISOString() : new Date().toISOString();
      return `
  <entry>
    <title type="html"><![CDATA[${post.title}]]></title>
    <link href="${url}" rel="alternate" type="text/html" title="${post.title}"/>
    <published>${pubDate}</published>
    <updated>${pubDate}</updated>
    <id>${url}</id>
    <author>
      <name>${post.author}</name>
    </author>
    ${post.tags.map((tag: string) => `<category term="${tag}"/>`).join("\n    ")}
    <summary type="html"><![CDATA[${post.description}]]></summary>
  </entry>`;
    })
    .join("")}
</feed>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
