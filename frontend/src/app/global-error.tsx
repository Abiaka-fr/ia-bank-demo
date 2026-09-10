"use client";

// Dernier filet de sécurité Next.js : ne se déclenche que si `app/[locale]/layout.tsx` lui-même
// plante (ex. locale invalide avant que `NextIntlClientProvider` ne soit monté). Ce fichier
// remplace toute la coquille HTML, y compris <html>/<body> — `useTranslations` n'est donc pas
// disponible ici. Texte volontairement bilingue en dur (cas limite hors du flux normal de
// l'application, jamais atteint dans un usage sain) plutôt que de dupliquer le routage i18n.
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Un problème est survenu / Something went wrong
          </h1>
          <p style={{ maxWidth: 420, fontSize: "0.875rem", color: "#666" }}>
            L&apos;application n&apos;a pas pu s&apos;afficher. Réessayez ou rechargez la page.
            <br />
            The application could not be displayed. Try again or reload the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #d4d4d4",
              background: "white",
              cursor: "pointer",
            }}
          >
            Réessayer / Retry
          </button>
        </div>
      </body>
    </html>
  );
}
