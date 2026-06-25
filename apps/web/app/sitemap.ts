import { MetadataRoute } from 'next';

const BASE_URL = 'https://open-tour-web.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/nl`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/en`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/nl/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/en/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/nl/scorer`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/en/scorer`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/nl/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/en/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  let tournamentEntries: MetadataRoute.Sitemap = [];

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tournaments?select=id,updated_at&is_public=eq.true&order=updated_at.desc`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (res.ok) {
      const tournaments: { id: string; updated_at: string }[] = await res.json();
      tournamentEntries = tournaments.flatMap((t) => [
        {
          url: `${BASE_URL}/nl/tournament/${t.id}`,
          lastModified: new Date(t.updated_at),
          changeFrequency: 'always' as const,
          priority: 0.8,
        },
        {
          url: `${BASE_URL}/en/tournament/${t.id}`,
          lastModified: new Date(t.updated_at),
          changeFrequency: 'always' as const,
          priority: 0.8,
        },
      ]);
    }
  } catch {}

  return [...staticEntries, ...tournamentEntries];
}
