import { MetadataRoute } from 'next';

const publicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://img.manhhuynh.work').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agri.manhhuynh.work').replace(/\/$/, '');
  
  // Base static routes
  const routes = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/sources`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ];

  try {
    const res = await fetch(`${publicUrl}/posts-index.json`, {
      next: { revalidate: 60 }
    });
    if (res.ok) {
      const posts = await res.json();
      const postRoutes = posts.map((post: any) => {
        let lastModified = new Date();
        if (post.dateString) {
          const parts = post.dateString.split('/');
          if (parts.length === 3) {
            const parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`);
            if (!isNaN(parsedDate.getTime())) {
              lastModified = parsedDate;
            }
          }
        }
        return {
          url: `${siteUrl}/posts/${post.slug}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.9,
        };
      });
      return [...routes, ...postRoutes];
    }
  } catch (e) {
    console.error("Error generating sitemap dynamic posts:", e);
  }

  return routes;
}
