import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <span className="text-6xl">🏌️</span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4">
          Open<span className="text-green-500">Tour</span>
        </h1>
        <p className="text-xl text-gray-400 mb-4">
          Gratis golf toernooi & live scoring voor clubs, vrienden en laddercompetities.
        </p>
        <p className="text-sm text-gray-600 mb-10">
          Geen account nodig voor toeschouwers · Open source · AGPL-3.0
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/nl/login"
            className="px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
          >
            Toernooi organiseren →
          </Link>
          <Link
            href="/nl/scorer"
            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
          >
            Score invoeren
          </Link>
        </div>
      </div>
    </main>
  );
}
