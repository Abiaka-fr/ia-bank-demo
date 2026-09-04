/**
 * Utilisateurs de démonstration (v1.1 du contrat).
 *
 * Authentification simulée : aucun mot de passe n'est vérifié côté serveur réel, et
 * ces identifiants ne donnent accès à rien. Corpus fictif, aucune personne réelle.
 */
import type { User } from "@/types/api";

/** Mot de passe unique de démo, affiché sur l'écran de connexion. */
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

export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((user) => user.email.toLowerCase() === normalized);
}

export function findUserById(userId: string): User | undefined {
  return users.find((user) => user.user_id === userId);
}
