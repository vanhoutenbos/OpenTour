import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function HomePage() {
  const t = useTranslations('common');

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-6xl">🏌️</span>
        </div>

        <h1 className="text-5xl font-bold text-white mb-4">
          Open<span className="text-green-500">Tour</span>
        </h1>

        <p className="text-xl text-gray-400 mb-8">
          Gratis golf toernooi & live scoring voor clubs, vrienden en laddercompetities.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
          >
            Toernooi organiseren →
          </Link>
          <Link
            href="/scorer"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
          >
            Score invoeren
          </Link>
        </div>

        <p className="mt-12 text-sm text-gray-600">
          Open source · AGPL-3.0 · Gratis voor kleine organisaties
        </p>
      </div>
    </main>
  );
}
