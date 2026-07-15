import fs from "fs";
import path from "path";
import matter from "gray-matter";
import BlogListing from "@/components/BlogListing";
import NewsletterSection from "@/components/NewsletterSection";

interface Post {
  slug: string;
  title: string;
  description: string;
  dateString: string;
  rawDate: string;
  timestamp: number;
  categories: string[];
  tags: string[];
  readTime: number;
}

export const revalidate = 3600; // Tự động làm mới trang chủ trên Vercel mỗi giờ (Incremental Static Regeneration)

async function getHeroImages(): Promise<string[]> {
  let fallback = [
    "https://images.pexels.com/photos/11791577/pexels-photo-11791577.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "https://images.pexels.com/photos/5646955/pexels-photo-5646955.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "https://images.pexels.com/photos/7391458/pexels-photo-7391458.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "https://images.pexels.com/photos/38245737/pexels-photo-38245737.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "https://images.pexels.com/photos/7299610/pexels-photo-7299610.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
  ];

  try {
    const heroDataPath = path.join(process.cwd(), "_data", "hero_images.json");
    if (fs.existsSync(heroDataPath)) {
      fallback = JSON.parse(fs.readFileSync(heroDataPath, "utf8"));
    }
  } catch (e) {
    console.error("Error reading hero_images.json fallback:", e);
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return fallback;

  try {
    const page = Math.floor(Math.random() * 20) + 1;
    const res = await fetch(`https://api.pexels.com/v1/search?query=sustainable+agriculture&per_page=5&page=${page}`, {
      headers: {
        Authorization: apiKey,
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.photos && data.photos.length > 0) {
        return data.photos.map((p: any) => p.src.large2x || p.src.large || p.src.original);
      }
    }
  } catch (e) {
    console.error("Error fetching live Pexels images:", e);
  }

  return fallback;
}

export default async function Home() {
  const postsDirectory = path.join(process.cwd(), "_posts");
  let posts: Post[] = [];

  if (fs.existsSync(postsDirectory)) {
    const filenames = fs.readdirSync(postsDirectory);
    posts = filenames
      .filter((filename) => filename.endsWith(".md"))
      .map((filename) => {
        const filePath = path.join(postsDirectory, filename);
        const fileContents = fs.readFileSync(filePath, "utf8");
        const { data } = matter(fileContents);

        // Filename is YYYY-MM-DD-slug.md
        const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
        
        const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
        const dateString = dateMatch ? dateMatch[1] : "";
        
        let formattedDate = "";
        if (dateString) {
          const [year, month, day] = dateString.split("-");
          formattedDate = `${day}/${month}/${year}`;
        }

        let readTime = 5;
        if (data.read_time) {
          const timeStr = String(data.read_time)
            .replace(" phút", "")
            .replace(" min", "")
            .trim();
          readTime = parseInt(timeStr) || 5;
        }

        return {
          slug,
          title: data.title || slug,
          description: data.description || "",
          dateString: formattedDate,
          rawDate: dateString,
          timestamp: dateString ? new Date(dateString).getTime() : 0,
          categories: Array.isArray(data.categories) 
            ? data.categories 
            : data.category 
              ? [data.category] 
              : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
          readTime,
        };
      });
  }

  // Sort by newest by default
  posts.sort((a, b) => b.timestamp - a.timestamp);

  const heroImages = await getHeroImages();

  return (
    <>
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-slides">
          {heroImages.map((img, idx) => (
            <div
              key={idx}
              className="hero-slide"
              style={{
                backgroundImage: `linear-gradient(rgba(28, 25, 23, 0.65), rgba(28, 25, 23, 0.88)), url('${img}')`,
              }}
            ></div>
          ))}
        </div>
        <div className="wrap" style={{ position: "relative", zIndex: 2 }}>
          <div className="eyebrow">Thư viện số nông nghiệp tuần hoàn sinh thái</div>
          <h1>
            Agri<span>Synthe</span>
          </h1>
          <p>
            Hệ thống tự động tổng hợp, chắt lọc và biên soạn kiến thức hữu cơ từ các tài liệu khoa học và sách kinh điển
            bởi Trí tuệ Nhân tạo (AI) giúp tối ưu hóa nông nghiệp tuần hoàn.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: "10px", paddingBottom: "30px" }}>
        <BlogListing initialPosts={posts} />
      </div>

      <div className="wrap" style={{ paddingBottom: "80px" }}>
        <NewsletterSection />
      </div>
    </>
  );
}
