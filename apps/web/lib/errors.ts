const isDev = process.env.NODE_ENV === 'development';

const USER_FRIENDLY: Record<string, string> = {
  '23503': 'Deze actie kan niet worden uitgevoerd omdat er nog gerelateerde gegevens aan vastzitten.',
  '23505': 'Dit record bestaat al.',
  '42501': 'Je hebt geen rechten om deze actie uit te voeren.',
  '42P01': 'Er is een interne fout opgetreden. Neem contact op met de beheerder.',
};

export function userError(err: unknown, fallback = 'Er is een fout opgetreden. Probeer het opnieuw.'): string {
  if (isDev) {
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: string }).message);
    return String(err);
  }

  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    if (USER_FRIENDLY[code]) return USER_FRIENDLY[code];
  }

  return fallback;
}
