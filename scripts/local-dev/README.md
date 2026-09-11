# Faire tourner le backend de Thư en local, sans PostgreSQL

`backend/QUICKSTART.md` suppose PostgreSQL 18 installé et un dossier `alembic/` qui, en
pratique, n'a jamais été committé (`alembic/versions/*.py` est gitignoré côté backend).
Suivre ce guide tel quel échoue sur une machine qui n'a ni l'un ni l'autre.

Ces scripts contournent les deux problèmes **sans modifier une seule ligne sous
`backend/`** (zone en lecture seule, voir `../../CLAUDE.md` § 2) :

- ils utilisent le fait, vérifié en lisant `backend/app/models/`, que le backend
  **n'a aucun type de colonne spécifique à PostgreSQL** — il tourne sans changement sur
  SQLite ;
- ils s'appuient sur `backend/reference_database/reference/abiaka_regulatory_demo.sqlite`,
  qui **est committé** et contient déjà les 1 262 lignes de démo (32 documents,
  44 exigences, 54 couples exigence × procédure…).

## Démarrage

```bash
# Une fois : crée .venv-backend/, copie la base de référence dans .local/, ajoute la
# table `users` (absente de la base de référence) et 4 comptes de démonstration.
./scripts/local-dev/setup-backend.sh

# À chaque session :
./scripts/local-dev/run-backend.sh          # http://localhost:8000/docs
cd frontend && pnpm dev                     # http://localhost:3000 (mode mock par défaut)
```

Connexion (identique aux comptes du corpus MSW du frontend) :
`marie.lefevre@iabank.fr` / `demo1234`.

Prérequis : Python **>= 3.10** (`brew install python@3.12` si la machine n'a que le
Python 3.9 livré avec macOS — vérifié le cas sur cette machine).

**Piège vécu (2026-09-11) : un autre projet peut déjà occuper le port 8000.** Si un
autre dépôt sur la machine lance aussi un service Python sur 8000 (ex. un
`uvicorn main:app --port 8000` d'un tout autre projet), `curl localhost:8000/health`
peut répondre `200` par coïncidence (si cet autre service a lui aussi une route
`/health`) alors que ce n'est pas du tout le backend de Thư — la connexion échoue
ensuite avec une erreur générique. Vérifier avant de conclure que le backend est
« cassé » :
```bash
lsof -i :8000 -sTCP:LISTEN        # quel process écoute réellement sur ce port ?
curl -s localhost:8000/openapi.json | python3 -c "import json,sys; print(list(json.load(sys.stdin)['paths']))"
# doit lister /api/auth/signin, /api/documents, /api/mappings/*… — pas autre chose.
```
Si le port est pris par un autre projet, démarrer celui-ci sur un port différent
plutôt que d'arrêter l'autre service (qui ne nous appartient pas) :
```bash
PORT=8010 ./scripts/local-dev/run-backend.sh
# puis dans frontend/.env.local : NEXT_PUBLIC_BACKEND_URL=http://localhost:8010
# et relancer `pnpm dev` (Next.js ne relit .env.local qu'au démarrage).
```

## Brancher le frontend sur ce backend

Par défaut, le frontend reste à 100 % sur MSW (`NEXT_PUBLIC_BACKEND_URL` vide). Pour
brancher les endpoints que le backend couvre déjà :

```bash
# frontend/.env.local (fichier gitignoré, à créer)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Puis relancer `pnpm dev`. Ce que ça change concrètement (voir
`frontend/src/lib/api/backend/config.ts`) :

| Écran / donnée | Source avec `NEXT_PUBLIC_BACKEND_URL` renseigné |
|---|---|
| Connexion | backend réel — vrai JWT, `POST /api/auth/signin` |
| Liste des régulations | backend réel — documents `category=EXTERNAL` |
| Liste des procédures internes | backend réel — documents `category=INTERNAL` |
| Détail d'une régulation + texte source | backend réel |
| Exigences d'une régulation | backend réel, filtre `domain` transmis au serveur |
| Constats, tableau de bord, upload, validation humaine, liste des utilisateurs | **toujours MSW** — le backend ne les expose pas encore |

Les deux sources cohabitent sans conflit : le contrat (`docs/api-contract.md`) part en
requêtes relatives interceptées par MSW, le backend réel part en requêtes absolues vers
`localhost:8000`.

## Ce qui reste un contournement, à trancher avec Thư

- **`frontend/src/lib/api/backend/current-version-id.ts`** reconstruit l'identifiant de
  version à partir d'une convention observée sur la base de référence
  (`VER-{document_id}-{version_no}`), parce qu'aucun endpoint ne renvoie la version
  courante d'un document (question ouverte n°1 de `docs/backend-integration.md`). Si la
  convention change, l'onglet « Texte source » échoue bruyamment (`BackendGapError`)
  plutôt que d'afficher un texte vide.
- Le statut d'un document (`NOT_ANALYZED` / `ANALYZED`) est **toujours** rendu
  `NOT_ANALYZED` en mode backend réel : le backend ne dit rien de l'avancement de
  l'analyse ni des constats — l'affirmer serait contraire à `docs/ui-guardrails.md`.
- `GET /api/users` n'existe pas côté backend : l'assignation et l'escalade restent sur
  la liste MSW quel que soit le mode.

## Remettre à zéro

```bash
rm -rf .local .venv-backend
./scripts/local-dev/setup-backend.sh
```

La base de référence committée (`backend/reference_database/`) n'est jamais modifiée :
`setup-backend.sh` en fait une **copie** dans `.local/backend-dev.sqlite` avant d'y
ajouter la table `users`.
