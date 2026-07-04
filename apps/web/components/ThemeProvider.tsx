'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Wraps next-themes' ThemeProvider. Kept as a separate client component
 * so the (server) locale layout doesn't need a 'use client' directive.
 *
 * attribute="class" toggles the `dark` class on <html>, which the
 * Tailwind config (darkMode: 'class') and globals.css (.dark selector)
 * key off of.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
