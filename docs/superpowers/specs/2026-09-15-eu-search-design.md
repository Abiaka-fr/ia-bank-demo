# Recherche de textes européens (CELLAR) dans la Knowledge Base — design

**Date** : 2026-09-15 · **Statut** : validé en brainstorming (4 sections approuvées), en attente de
relecture avant plan d'implémentation · **Zone** : `frontend/` uniquement (aucun fichier sous
`backend/`).

## 0. Contexte et décisions

Francis demande de pouvoir interroger les sources réglementaires européennes (email « Extended
European Regulatory Search », voir `docs/phases/phase-7-european-search.md`) et de filtrer quand le
volume de documents devient important (transcript semaine 1, `docs/phases/phase-6-francis-feedback.md`
§2). Thư a reporté la partie européenne côté backend (`docs/api-requests.md` #1 : « phải coi api đó
trả về được cái gì đã »).

Décisions prises le 2026-09-15 :

| Question | Décision |
|---|---|
| Finalité | **Consultation** de textes UE (recherche + filtres + lien vers l'original). Pas d'IA, pas d'import dans la Bank KB, pas de rapprochement procédure ↔ exigence UE (reste la Phase 7 / Thư). |
| Où vit l'appel CELLAR | **Route handler Next.js** dans `frontend/` (CELLAR ne renvoie pas d'en-tête CORS, un appel direct navigateur est impossible). |
| Écran | **Knowledge Base**, carte « European Regulatory Sources » (remplace le badge « Non connecté »). Pas de 6ᵉ écran (consigne de Francis). |
| Filtres | Mot-clé (toujours) + type de document + thème EuroVoc + en vigueur + plage d'années + tri. |
| Accès | `canSeeKnowledgeBase` étendu à `COMPLIANCE_OFFICER`. `AUDITOR` reste exclu. |

## 1. Faits vérifiés (2026-09-15, avant design)

**Accès retenu** : endpoint SPARQL CELLAR `https://publications.europa.eu/webapi/rdf/sparql`
(GET, `Accept: application/sparql-results+json`), sans inscription. Écartés : webservice SOAP
EUR-Lex (inscription obligatoire), data dump (EU Login), flux RSS (V2).

**Faisabilité du route handler** :
- `fetch` Node 20 côté serveur → 200 en 1,15 s (pas de CORS côté serveur).
- `src/proxy.ts` exclut déjà `/api` de son matcher → `app/api/eu-search/route.ts` n'est pas
  intercepté par next-intl.
- MSW démarre avec `onUnhandledRequest: "bypass"` → en mode mock, la requête atteint la vraie
  route (aucun handler MSW à ajouter).
- Vercel (Fluid compute) : durée max 300 s en Hobby ; **corps de réponse max 4,5 Mo** → page de
  20 résultats obligatoire ; région par défaut `iad1` (non modifiée, voir §7).
- Cache `fetch(url, { next: { revalidate: 3600 } })` supporté dans un route handler (docs Next 16
  installées, `caching-without-cache-components.md` ; `cacheComponents` n'est pas activé).

**Débit / limites** :
- **Aucune limite chiffrée officielle** : ni la page « Reuse EUR-Lex content » (lue dans un
  navigateur), ni la page REST de CELLAR n'en publient.
- Aucun en-tête de limitation (`X-RateLimit-*`, `Retry-After`) sur SPARQL ni REST.
- Rafale de test : 30 requêtes, 10 en parallèle → 30× 200, p50 273 ms, p95 1,1 s, aucun 429.
- `LIMIT 20000` → 20 000 lignes renvoyées (4,7 s, 2,4 Mo) : pas de plafond bas observé.
- « < 5 requêtes concurrentes / timeout 60 s / paginer au-delà de 10 000 lignes » : conseils d'un
  blog tiers (Polzia), **sans source officielle** — traités comme bonne pratique, pas comme limite.
- Les IP Vercel sont dynamiques et partagées : un éventuel throttling par IP côté UE est
  imprévisible → cache + page courte + erreur explicite (§3).

**Temps de réponse des requêtes représentatives** (depuis le poste local) :

| Requête | Temps |
|---|---|
| Défaut à l'ouverture (REG+DIR, en vigueur, titre FR avec repli EN, tri date, 21 lignes) | 1,25 s |
| Pire cas sans mot-clé ni thème (plage d'années, OFFSET 20) | 1,24 s |
| Mot-clé `bif:contains` sur titre (« operational resilience » EN / « blanchiment » FR) | 1,0–1,3 s |
| Filtre thème EuroVoc + en vigueur + titres FR/EN | 1,0 s |

`bif:contains` accepte des mots courts (« UE », « a ») sans erreur → pas de longueur minimale.

**Volumes en vigueur par type (CELEX secteur 3)** : `DEC_ENTSCHEID` 11 971, `DEC` 11 803,
`REG_IMPL` 7 929, `REG` 6 647, `DEC_IMPL` 3 286, `REG_DEL` 1 601, `DIR` 1 109, `RECO` 576. Sans
filtre de type, les résultats sont dominés par des décisions administratives → par défaut, seuls
`REG` et `DIR` sont cochés.

## 2. Architecture et flux

```
KnowledgeBaseView
  └─ EuSearchPanel (useQuery, queryKeys.euSearch(params))
       └─ fetchEuSearch(params)  — lib/api/eu-search.ts, fetch("/api/eu-search?…") relatif
            └─ GET /api/eu-search  — app/api/eu-search/route.ts
                 1. valide les paramètres (zod)            → 400 INVALID_PARAMS
                 2. buildEuSearchQuery(params)             — lib/eu-search/sparql.ts (pure)
                 3. fetch CELLAR SPARQL, revalidate 3600 s, AbortSignal.timeout(15 000)
                                                           → 502 EU_SOURCE_UNAVAILABLE
                 4. mapEuSearchBindings(json, params)      — lib/eu-search/sparql.ts (pure)
                 5. JSON { results, page, hasMore }
```

- Le client **n'utilise pas `apiFetch`** : celui-ci préfixe `NEXT_PUBLIC_API_BASE_URL` (backend de
  Thư). Il valide la réponse avec le même schéma zod que la route.
- Aucune dépendance ajoutée : `fetch`, `URLSearchParams`, zod déjà installés.
- Pas de debounce : le mot-clé part sur Entrée / bouton « Rechercher » ; chaque `Select` déclenche
  la requête à son changement (valeur discrète).

## 3. Contrat de la route (propriété du frontend, pas une API de Thư)

### Requête — `GET /api/eu-search`

| Paramètre | Valeurs acceptées | Défaut |
|---|---|---|
| `q` | chaîne ≤ 100 caractères : mot-clé du titre, ou numéro CELEX exact (`32022R2554`, `CELEX:32022r2554`, rectificatif `…R(07)`) | vide |
| `types` | liste non vide de `REG`, `DIR`, `DEC`, `RECO` (ex. `types=REG,DIR`) | `REG,DIR` |
| `subject` | une clé de la table EuroVoc ci-dessous, ou vide | vide |
| `inForce` | `true` \| `all` | `true` |
| `from`, `to` | entier 1950 … année courante ; `from ≤ to` si les deux sont fournis | vide |
| `sort` | `newest` \| `oldest` | `newest` |
| `page` | entier 1 … 50 | 1 |
| `lang` | `fr` \| `en` | locale de l'interface |

Tout paramètre hors de ces valeurs → `400` `{ error: { code: "INVALID_PARAMS", message } }`.

`types` → une IRI `http://publications.europa.eu/resource/authority/resource-type/{REG|DIR|DEC|RECO}`
par type coché. `REG_IMPL`, `REG_DEL`, `DEC_IMPL`, `DEC_ENTSCHEID` sont volontairement
exclus.

`lang` → IRI `http://publications.europa.eu/resource/authority/language/{FRA|ENG}`.

**Thèmes EuroVoc (liste fermée, IRI et libellés FR vérifiés dans CELLAR)** :

| Clé `subject` | IRI | Libellé EN | Libellé FR |
|---|---|---|---|
| `money-laundering` | `http://eurovoc.europa.eu/5465` | money laundering | blanchiment d'argent |
| `banking-supervision` | `http://eurovoc.europa.eu/3251` | banking supervision | contrôle bancaire |
| `financial-services` | `http://eurovoc.europa.eu/8469` | financial services | services financiers |
| `risk-management` | `http://eurovoc.europa.eu/c_406ad4cc` | risk management | gestion du risque |
| `outsourcing` | `http://eurovoc.europa.eu/6913` | outsourcing | externalisation |
| `consumer-protection` | `http://eurovoc.europa.eu/2836` | consumer protection | protection du consommateur |
| `information-security` | `http://eurovoc.europa.eu/c_04ae3ba8` | information security | sécurité des systèmes d'information |
| `payment` | `http://eurovoc.europa.eu/2216` | payment | paiement |

Les libellés affichés passent par `messages/fr.json` / `messages/en.json`, pas par CELLAR.

### Réponse `200`

```ts
{
  results: Array<{
    celex: string;        // "32022R2554"
    title: string;        // titre dans `lang`, repli sur le titre anglais s'il manque
    date: string;         // work_date_document, "YYYY-MM-DD"
    type: "REG" | "DIR" | "DEC" | "RECO";
    inForce: boolean;     // resource_legal_in-force ("1"/"true" → true)
    eurlexUrl: string;    // https://eur-lex.europa.eu/legal-content/{FR|EN}/TXT/?uri=CELEX:{celex}
  }>;
  page: number;
  hasMore: boolean;       // requête LIMIT 21 : 21ᵉ ligne présente → true, jamais renvoyée
}
```

### Erreurs (forme `apiErrorSchema` existante)

| Cas | Statut | `code` |
|---|---|---|
| Paramètre invalide | 400 | `INVALID_PARAMS` |
| CELLAR renvoie 429 / 5xx, timeout 15 s, réponse illisible | 502 | `EU_SOURCE_UNAVAILABLE` |

### Construction SPARQL et sécurité (non négociable)

Aucune valeur saisie par l'utilisateur n'est interpolée brute dans la requête :
- `type`, `subject`, `lang` → **table blanche** vers des IRI constantes.
- `from`, `to`, `page` → entiers déjà validés par zod.
- `q` → normalisé : on ne garde que les suites de lettres/chiffres Unicode (`/[\p{L}\p{N}]+/gu`),
  8 mots maximum, chacun entouré d'apostrophes et joints par ` AND ` :
  `?tSel bif:contains "'w1' AND 'w2'"`. Si rien ne reste, pas de clause mot-clé. Tout guillemet,
  apostrophe, accolade, `#`, `\` ou retour ligne disparaît à la normalisation.

Gabarit (vérifié, 1,25 s ; les blocs entre crochets sont conditionnels) :

```sparql
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?date ?type ?inForce (COALESCE(?tSel, ?tEng) AS ?title) WHERE {
  ?work cdm:resource_legal_id_celex ?celex ;
        cdm:work_date_document ?date ;
        cdm:work_has_resource-type ?type .
  FILTER(?type IN (<…/REG>, <…/DIR>))
  [inForce=true]  ?work cdm:resource_legal_in-force ?inForce .
                  FILTER(?inForce = "true"^^xsd:boolean)          # forme mesurée à 1,25 s
  [inForce=all]   OPTIONAL { ?work cdm:resource_legal_in-force ?inForce }   # non lié → false
  [subject]       ?work cdm:work_is_about_concept_eurovoc <IRI> .
  [from]          FILTER(?date >= "FROM-01-01"^^xsd:date)
  [to]            FILTER(?date <  "(TO+1)-01-01"^^xsd:date)
  [q présent]     ?eSel cdm:expression_belongs_to_work ?work ;
                        cdm:expression_uses_language <LANG> ;
                        cdm:expression_title ?tSel .
                  ?tSel bif:contains "'w1' AND 'w2'" .
  [q absent]      OPTIONAL { ?eSel cdm:expression_belongs_to_work ?work ;
                                   cdm:expression_uses_language <LANG> ;
                                   cdm:expression_title ?tSel }
  OPTIONAL { ?eEng cdm:expression_belongs_to_work ?work ;
                   cdm:expression_uses_language <…/ENG> ;
                   cdm:expression_title ?tEng }
  FILTER(BOUND(?tSel) || BOUND(?tEng))
} ORDER BY DESC(?date)            # ASC(?date) si sort=oldest
LIMIT 21 OFFSET (page-1)*20
```

Avec un mot-clé, la recherche porte sur le titre dans la langue choisie uniquement (pas de repli
EN pour la correspondance).

Quand `q` est reconnu comme un numéro CELEX (`toCelex` : `32022R2554`, `CELEX:32022r2554`,
rectificatif `…R(07)`), la clause `bif:contains` est remplacée par
`?work cdm:resource_legal_id_celex "<CELEX>"^^xsd:string` et tous les autres filtres restent
appliqués. La recherche par préfixe de CELEX n'est pas proposée : ~8,6 s et surtout des
rectificatifs (mesuré le 2026-09-15), contre ~1 s pour un CELEX exact.

## 4. Interface

Carte « European Regulatory Sources » de `knowledge-base-view.tsx`, badge « Non connecté » et son
texte supprimés, remplacés par `EuSearchPanel` :

- **Barre de filtres** (même disposition que `regulations-view.tsx`) : `Input` mot-clé + bouton
  « Rechercher » (formulaire, soumission sur Entrée) · `Select` Type · `Select` Thème EuroVoc
  (« Tous » + 8) · `Select` Statut (En vigueur / Tous) · deux `Input type="number"` Année de / à ·
  `Select` Tri (plus récent / plus ancien). Changer un filtre revient à la page 1.
- **Résultats** : `Table` — CELEX · Titre · Type · Date (`formatDateDDMMYYYY`) · Statut (badge
  **neutre**, `variant="secondary"`/`outline`, jamais rouge/orange — ce n'est pas un statut
  d'assessment) · lien « Voir sur EUR-Lex » (`target="_blank" rel="noopener noreferrer"`).
  Boutons Précédent / Suivant (`page > 1` / `hasMore`).
- **États** : `LoadingState`, `ErrorState` (avec réessai), `EmptyState` — composants existants de
  `query-state.tsx`. `fetchEuSearch` lève un `ApiError(code, message, status)` (classe existante de
  `lib/api/client.ts`) sur toute réponse non-OK ; `ErrorState` n'isole aujourd'hui que le 404 et
  l'erreur de contrat, donc un 400/502 affiche le message générique existant `errors.generic` +
  réessai. Message dédié « source européenne indisponible » hors périmètre (ajouter une branche à
  `errorMessageKey` si la démo le demande).
- **Chargement initial** : requête par défaut (REG+DIR en vigueur, plus récents) dès l'ouverture.
- **Mention de source** (conforme à `docs/ui-guardrails.md` — aucune conclusion d'applicabilité ou
  de conformité) : FR « Source : CELLAR — Office des publications de l'UE. Pertinence et
  applicabilité à confirmer par la Conformité. » / EN « Source: CELLAR — Publications Office of the
  EU. Relevance and applicability to be confirmed by Compliance. »
- État des filtres en `useState` local (non persisté dans l'URL).
- Titres UE affichés tels que renvoyés par CELLAR (texte source, jamais traduit par l'app).

**Accès** : `canSeeKnowledgeBase` renvoie `true` pour `COMPLIANCE_ADMIN`, `HEAD_OF_COMPLIANCE` et
`COMPLIANCE_OFFICER` ; `false` pour `AUDITOR`. Écran d'atterrissage de chaque profil inchangé.

## 5. Fichiers

**Nouveaux** (`frontend/src/`) :
- `app/api/eu-search/route.ts` — validation, appel CELLAR, mapping des erreurs.
- `lib/eu-search/sparql.ts` — tables blanches (types, thèmes, langues), normalisation du
  mot-clé, `buildEuSearchQuery`, `mapEuSearchBindings` (fonctions pures).
- `lib/eu-search/sparql.test.ts`
- `lib/api/eu-search.ts` — `fetchEuSearch(params)` côté client.
- `components/features/eu-search-panel.tsx`

**Modifiés** :
- `components/features/knowledge-base-view.tsx` — carte européenne → `EuSearchPanel`.
- `lib/access-profile.ts` + `lib/access-profile.test.ts`.
- `lib/api/query-keys.ts` — `euSearch(params)`.
- `types/api.ts` — `euSearchParamsSchema`, `euSearchResponseSchema` (partagés route / client).
- `messages/fr.json` + `messages/en.json` — nouvelles clés `knowledgeBase.euSearch.*` ; suppression
  de `notConnectedStatus` / `notConnectedDescription` devenues mortes.

## 6. Tests et vérification

- `sparql.test.ts` :
  - tables blanches : chaque `type` / `subject` / `lang` produit la bonne IRI ; valeur inconnue
    rejetée par le schéma ;
  - normalisation de `q` : `"blanchiment d'argent"` → `'blanchiment' AND 'd' AND 'argent'` ; une
    tentative d'injection (`x" } ; DROP #`) ne laisse aucun `"`, `}`, `;`, `#` dans la requête ;
    plus de 8 mots tronqués ; chaîne vide → pas de clause ;
  - présence/absence de chaque clause conditionnelle ; `LIMIT 21 OFFSET` correct ; `sort` ;
  - mapping : 21 lignes → 20 résultats + `hasMore: true` ; `inForce` `"1"` → `true` ; repli titre
    EN ; `eurlexUrl` selon `lang`.
- `access-profile.test.ts` : attente mise à jour pour `COMPLIANCE_OFFICER`.
- `src/messages/messages.test.ts` (existant) garantit la synchro FR/EN.
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`.
- Vérification visuelle (règle `frontend/CLAUDE.md`) : `/fr/knowledge-base` connecté en Thomas
  Rousseau, recherche réelle « blanchiment » + thème « blanchiment d'argent », capture comparée à
  `docs/ui-guidelines.md` ; cas d'erreur vérifié en simulant un échec CELLAR.
- Aucun test automatisé n'appelle le réseau.

## 7. Documentation à mettre à jour

- `docs/api-requests.md` #1 : le frontend porte un proxy mince de **recherche de métadonnées**
  CELLAR (`/api/eu-search`, forme de réponse ci-dessus) ; l'analyse européenne (candidats UE,
  dédoublonnage, applicabilité) reste un sujet backend / Thư, non tranché.
- `docs/known-limitations.md` : recherche sur les titres uniquement (pas le texte intégral) ; aucune
  limite de débit officielle connue ; en mode mock la recherche UE appelle quand même le vrai
  CELLAR (connexion internet requise en démo) ; fonction Vercel en région `iad1` (latence vers
  Luxembourg non mesurée depuis Vercel).
- `docs/phases/phase-7-european-search.md` : renvoi vers ce document.
- `PROGRESS.md` : notes de fin de session.

## 8. Hors périmètre (à ajouter quand le besoin est réel)

- Filtres persistés dans l'URL — quand une vue filtrée devra être partagée.
- Recherche plein texte (REST CELLAR, ~750 Ko par acte) — quand le titre ne suffit plus.
- Thèmes EuroVoc affichés par résultat — quand un utilisateur le demande.
- Import d'un texte UE dans la Bank KB — dépend d'un endpoint d'ingestion backend inexistant.
- Changement de région Vercel (`fra1`/`cdg1`) — si la latence mesurée en production gêne la démo.
- Rapprochement procédure ↔ exigences UE (Phase 7 D3–D9) — backend / Thư.
