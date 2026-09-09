// Filet de secours pour une URL qui ne correspond à AUCUNE route (même pas `[locale]/...`) — par
// exemple un lien mal formé sans préfixe de langue. Next.js rend alors ce fichier racine plutôt que
// `app/[locale]/not-found.tsx` (qui ne couvre que les impasses *à l'intérieur* de l'arbre `[locale]`,
// voir la doc next-intl). Ce fichier remplace toute la coquille HTML : pas de `NextIntlClientProvider`
// disponible ici, d'où le texte bilingue en dur — même choix assumé que `global-error.tsx`.
import { routing } from "@/i18n/routing";

export default function RootNotFound() {
  return (
    <html lang={routing.defaultLocale}>
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
            Page introuvable / Page not found
          </h1>
          <p style={{ maxWidth: 420, fontSize: "0.875rem", color: "#666" }}>
            Cette page n&apos;existe pas ou a été déplacée.
            <br />
            This page does not exist or has moved.
          </p>
          <a
            href={`/${routing.defaultLocale}/dashboard`}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #d4d4d4",
              background: "white",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            Retour au tableau de bord / Back to dashboard
          </a>
        </div>
      </body>
    </html>
  );
}
