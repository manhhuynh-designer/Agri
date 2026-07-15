import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const metadata = {
  title: "Nguồn Tài Liệu Tham Khảo — AgriSynthe",
  description: "Danh sách chi tiết 34 tài liệu nguồn, sách giáo trình và nghiên cứu khoa học làm nền tảng tri thức cho AgriSynthe AI.",
};

export default function SourcesPage() {
  const filePath = path.join(process.cwd(), "sources.md");
  let contentHtml = "";

  if (fs.existsSync(filePath)) {
    const fileContents = fs.readFileSync(filePath, "utf8");
    const parsed = matter(fileContents);
    contentHtml = parsed.content;
  }

  return (
    <div className="wrap" style={{ padding: "40px 0" }}>
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </div>
  );
}
