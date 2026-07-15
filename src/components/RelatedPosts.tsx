import Link from "next/link";

interface Post {
  slug: string;
  title: string;
  description: string;
  dateString: string;
  categories: string[];
  tags: string[];
}

interface RelatedPostsProps {
  currentSlug: string;
  categories: string[];
  tags: string[];
  allPosts: Post[];
}

export default function RelatedPosts({ currentSlug, categories, tags, allPosts }: RelatedPostsProps) {
  const maxRelated = 2;
  const matchedPosts: Post[] = [];

  // 1. Try to find posts with matching categories or tags
  for (const post of allPosts) {
    if (post.slug === currentSlug) continue;

    let isRelated = false;

    // Check matching category
    if (
      categories &&
      post.categories &&
      post.categories.length > 0 &&
      categories.length > 0 &&
      post.categories[0] === categories[0]
    ) {
      isRelated = true;
    }

    // Check matching tags
    if (tags && post.tags) {
      for (const tag of post.tags) {
        if (tags.includes(tag)) {
          isRelated = true;
          break;
        }
      }
    }

    if (isRelated && matchedPosts.length < maxRelated) {
      matchedPosts.push(post);
    }
  }

  // 2. Fallback to latest posts if we don't have enough matching posts
  if (matchedPosts.length < maxRelated) {
    for (const post of allPosts) {
      if (post.slug === currentSlug) continue;
      if (matchedPosts.some((p) => p.slug === post.slug)) continue;

      if (matchedPosts.length < maxRelated) {
        matchedPosts.push(post);
      }
    }
  }

  if (matchedPosts.length === 0) return null;

  return (
    <div className="related-posts-section">
      <h3 className="related-title">Bài viết liên quan</h3>
      <div className="related-grid">
        {matchedPosts.map((post) => {
          const categoryName = post.categories && post.categories.length > 0 ? post.categories[0] : "Chung";
          return (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="related-card">
              <div className="related-card-meta">
                <span className="related-card-tag">{categoryName}</span>
                <span>&bull;</span>
                <span>{post.dateString}</span>
              </div>
              <h4>{post.title}</h4>
              <p>
                {post.description.length > 110
                  ? `${post.description.substring(0, 110)}...`
                  : post.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
