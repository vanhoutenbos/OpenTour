'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';

const options = [
  {
    value: 'light',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    value: 'dark',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  {
    value: 'system',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
] as const;

/**
 * Theme switcher for the desktop profile dropdown. Mirrors the visual
 * pattern of the existing language switcher in Navbar.tsx: a section
 * header label followed by a list of selectable rows with a checkmark
 * on the active one.
 *
 * Renders nothing until mounted (avoids SSR/hydration mismatch, since
 * the resolved theme is only known client-side).
 */
export function ThemeToggle({ onSelect }: { onSelect?: () => void }) {
  const t = useTranslations('common.nav');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const labels: Record<string, string> = {
    light: t('theme_light'),
    dark: t('theme_dark'),
    system: t('theme_system'),
  };

  if (!mounted) {
    // Reserve the same height as the rendered state to avoid layout shift.
    return <div className="px-2 py-2" aria-hidden="true" style={{ height: 128 }} />;
  }

  return (
    <div className="px-2 py-2">
      <p className="px-2 py-1 text-xs font-semibold text-content-muted uppercase tracking-wider">
        {t('theme')}
      </p>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            setTheme(opt.value);
            onSelect?.();
          }}
          className={`flex items-center justify-between w-full px-2 py-2 rounded-lg text-sm transition-colors ${
            theme === opt.value
              ? 'text-content bg-surface-3'
              : 'text-content-muted hover:text-content hover:bg-surface-3'
          }`}
          aria-pressed={theme === opt.value}
        >
          <span className="flex items-center gap-2">
            {opt.icon}
            {labels[opt.value]}
          </span>
          {theme === opt.value && (
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
