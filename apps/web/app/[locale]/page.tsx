import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { HeroSection } from '@/components/home/HeroSection';
import { TournamentWidget } from '@/components/home/TournamentWidget';
import { AboutSection } from '@/components/home/AboutSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { StatsSection } from '@/components/home/StatsSection';
import { DemoSection } from '@/components/home/DemoSection';
import { FinalCtaSection } from '@/components/home/FinalCtaSection';
import { HomeFooter } from '@/components/home/HomeFooter';

interface Props {
  params: { locale: string };
}

async function getIsLoggedIn(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(_name: string, _value: string, _options?: CookieOptions) {},
          remove(_name: string, _options?: CookieOptions) {},
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    return !!data.user;
  } catch {
    return false;
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = params;
  const isLoggedIn = await getIsLoggedIn();

  return (
    <main className="min-h-screen bg-gray-950">
      <HeroSection locale={locale} isLoggedIn={isLoggedIn} />
      <TournamentWidget locale={locale} />
      <AboutSection locale={locale} />
      <FeaturesSection locale={locale} />
      <StatsSection locale={locale} />
      <DemoSection locale={locale} />
      <FinalCtaSection locale={locale} />
      <HomeFooter locale={locale} />
    </main>
  );
}
