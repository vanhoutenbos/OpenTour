'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { Avatar } from '@/components/Avatar';

const locales = [
  { code: 'nl', label: 'NL' },
  { code: 'en', label: 'EN' },
] as const;

export function Navbar() {
  const t = useTranslations('common.nav');
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || 'nl';

  const [user, setUser] = useState<{ email: string; display_name: string | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    async function fetchProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();
      return data?.display_name ?? null;
    }

    // onAuthStateChange vuurt INITIAL_SESSION direct met de huidige sessie — geen lock nodig
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const display_name = await fetchProfile(session.user.id);
        setUser({ email: session.user.email ?? '', display_name });
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        setUser(null);
      }
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
                  href={`/${locale}/course`}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(`/${locale}/course`)
                      ? 'text-green-400 bg-green-900/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {t('create_course')}
                </Link>
              </>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* GitHub */}
            <a
              href="https://github.com/vanhoutenbos/opentour"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>

            {/* Login button (not logged in, desktop) */}
            {!user && (
              <Link
                href={`/${locale}/login`}
                className="hidden md:inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-green-700 hover:bg-green-600 text-white transition-all hover:shadow-lg hover:shadow-green-900/50"
              >
                {t('login')}
              </Link>
            )}

            {/* Profile dropdown (logged in, desktop) */}
            {user && (
              <div ref={profileRef} className="relative hidden md:block">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label="Open profile menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                >
                  <Avatar name={user.display_name} size="sm" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-gray-900 border border-gray-700/60 shadow-2xl shadow-black/50 z-50 overflow-hidden">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-sm font-semibold text-white truncate">
                        {user.display_name || user.email}
                      </p>
                      {user.display_name && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                      )}
                    </div>

                    {/* Language */}
                    <div className="px-2 py-2 border-b border-gray-800">
                      <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t('language')}
                      </p>
                      {locales.map((l) => (
                        <Link
                          key={l.code}
                          href={pathname.replace(`/${locale}`, `/${l.code}`)}
                          onClick={() => setProfileOpen(false)}
                          className={`flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors ${
                            locale === l.code
                              ? 'text-white bg-gray-800'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {l.code === 'nl' ? 'Nederlands' : 'English'}
                          {locale === l.code && (
                            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </Link>
                      ))}
                    </div>

                    {/* Logout */}
                    <div className="px-2 py-2">
                      <button
                        onClick={async () => {
                          setProfileOpen(false);
                          await getSupabaseBrowser().auth.signOut();
                        }}
                        className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
            {/* Mobile user info */}
            {user && (
              <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-800 mb-2">
                <Avatar name={user.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.display_name || user.email}
                  </p>
                  {user.display_name && (
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  )}
                </div>
              </div>
            )}

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

            {/* Mobile GitHub */}
            <a
              href="https://github.com/vanhoutenbos/opentour"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>

            <div className="border-t border-gray-800 pt-1">
              {/* Language switcher */}
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('language')}
              </p>
              {locales.map((l) => (
                <Link
                  key={l.code}
                  href={pathname.replace(`/${locale}`, `/${l.code}`)}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    locale === l.code
                      ? 'text-white bg-gray-800'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {l.code === 'nl' ? 'Nederlands' : 'English'}
                  {locale === l.code && (
                    <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </Link>
              ))}

              <div className="border-t border-gray-800 mt-1 pt-1">
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
                      href={`/${locale}/course`}
                      onClick={() => setMenuOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive(`/${locale}/course`)
                          ? 'text-green-400 bg-green-900/30'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {t('create_course')}
                    </Link>
                    <button
                      onClick={async () => {
                        await getSupabaseBrowser().auth.signOut();
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
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
          </div>
        </div>
      )}
    </nav>
  );
}
