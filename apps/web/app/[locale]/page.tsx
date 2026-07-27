import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { StatsSection } from '@/components/home/StatsSection';
import { FinalCtaSection } from '@/components/home/FinalCtaSection';
import { HomeFooter } from '@/components/home/HomeFooter';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-surface">
      <HeroSection locale={locale} isLoggedIn={false} />
      <FeaturesSection locale={locale} />
      <TestimonialsSection locale={locale} />
      <StatsSection locale={locale} />
      <FinalCtaSection locale={locale} />
      <HomeFooter locale={locale} />
    </main>
  );
}
