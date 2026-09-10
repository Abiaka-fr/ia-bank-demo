/**
 * Utilisateurs de démonstration (v1.1 du contrat) — état initial du corpus mock.
 *
 * Mutable au fil d'une session via `../store.ts` (comptes créés par
 * `POST /api/auth/signup`, v1.4) : ce fichier ne décrit que le point de départ, jamais
 * consulté directement pour lire ou chercher un utilisateur — voir `store.ts::listUsers`/
 * `findUserByEmail`.
 *
 * Authentification simulée : aucun mot de passe réel n'est vérifié côté serveur, et ces
 * identifiants ne donnent accès à rien. Corpus fictif, aucune personne réelle.
 */
import type { User } from "@/types/api";

/** Mot de passe partagé par les 4 comptes de démo ci-dessous — pas par un compte créé
 * via `signup`, qui a le sien (voir `store.ts::setPassword`/`getPassword`). */
export const DEMO_PASSWORD = "demo1234";

export const users: readonly User[] = [
  {
    user_id: "USR-001",
    full_name: "Marie Lefèvre",
    email: "marie.lefevre@iabank.fr",
    role: "Responsable Conformité",
  },
  {
    user_id: "USR-002",
    full_name: "Thomas Rousseau",
    email: "thomas.rousseau@iabank.fr",
    role: "Analyste Conformité",
  },
  {
    user_id: "USR-003",
    full_name: "Claire Dubois",
    email: "claire.dubois@iabank.fr",
    role: "Auditeur Interne",
  },
  {
    user_id: "USR-004",
    full_name: "Karim Benali",
    email: "karim.benali@iabank.fr",
    role: "Juriste Réglementaire",
  },
];
