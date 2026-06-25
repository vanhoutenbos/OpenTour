'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

const locales = [
  { code: 'nl', label: 'NL' },
  { code: 'en', label: 'EN' },
] as const;

export function Navbar() {
  const t = useTranslations('common.nav');
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || 'nl';

  const [user, setUser] = useState<{ email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ email: session.user.email ?? '' });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? '' } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');
  const otherLocale = locale === 'nl' ? 'en' : 'nl';

  const navLinks = [
    { href: `/${locale}/scorer`, label: t('scorer') },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-green-900/50">
              OT
            </span>
            <span className="text-lg font-bold text-white hidden sm:inline">
              OpenTour
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'text-green-400 bg-green-900/30'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <>
                <Link
                  href={`/${locale}/dashboard`}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(`/${locale}/dashboard`)
                      ? 'text-green-400 bg-green-900/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {t('dashboard')}
                </Link>
                <Link
                  href={`/${locale}/profile`}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(`/${locale}/profile`)
                      ? 'text-green-400 bg-green-900/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {t('profile')}
                </Link>
              </>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Locale switcher */}
            <Link
              href={pathname.replace(`/${locale}`, `/${otherLocale}`)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border border-gray-700"
            >
              {otherLocale}
            </Link>

            {/* Auth / Mobile toggle */}
            {user ? (
              <button
                onClick={async () => {
                  await getSupabaseBrowser().auth.signOut();
                }}
                className="hidden md:inline-flex px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                {t('logout')}
              </button>
            ) : (
              <Link
                href={`/${locale}/login`}
                className="hidden md:inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-green-700 hover:bg-green-600 text-white transition-all hover:shadow-lg hover:shadow-green-900/50"
              >
                {t('login')}
              </Link>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900/95 backdrop-blur-md">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'text-green-400 bg-green-900/30'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <>
                <Link
                  href={`/${locale}/dashboard`}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(`/${locale}/dashboard`)
                      ? 'text-green-400 bg-green-900/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {t('dashboard')}
                </Link>
                <Link
                  href={`/${locale}/profile`}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(`/${locale}/profile`)
                      ? 'text-green-400 bg-green-900/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {t('profile')}
                </Link>
                <button
                  onClick={async () => {
                    await getSupabaseBrowser().auth.signOut();
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <Link
                href={`/${locale}/login`}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-center bg-green-700 hover:bg-green-600 text-white transition-colors"
              >
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
