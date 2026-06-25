// Deze pagina bestaat alleen als fallback als de middleware de /auth/callback
// route handler mist. Normaal wordt auth afgehandeld door /app/auth/callback/route.ts
export default function AuthCallbackFallback() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🏌️</div>
        <p className="text-gray-400">Inloggen...</p>
      </div>
    </main>
  );
}
