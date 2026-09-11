"use client";

import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@/i18n/navigation";

export type BreadcrumbTrailItem = {
  label: string;
  /** Absent sur le dernier élément : c'est la page courante, pas un lien. */
  href?: string;
};

/**
 * Fil d'Ariane réutilisable — Phase 6 § 10 (remonté par Giang, 2026-09-11) : aucun
 * chemin de retour visible sur les écrans de détail plein écran. Une seule
 * implémentation, posée en haut de chaque écran concerné plutôt que recodée par écran
 * (`docs/ui-guidelines.md` : ne pas recoder un composant que shadcn fournit déjà).
 */
export function BreadcrumbTrail({ items }: { items: readonly BreadcrumbTrailItem[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          // `BreadcrumbSeparator` est un `<li>` au même titre que `BreadcrumbItem` —
          // un élément frère entre deux items, jamais imbriqué à l'intérieur d'un
          // item (`<li>` dans un `<li>` : HTML invalide, erreur d'hydratation réelle
          // trouvée en testant visuellement cet écran).
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
