# Limitations connues — POC Regulatory AI Copilot

> Document de démo/Phase 5, destiné à être montré ou résumé au client. Rédige en une phrase ce que
> chaque limite reflète pour la démo ; le détail technique complet (écarts endpoint par endpoint,
> questions ouvertes avec Thư) reste dans `docs/backend-integration.md`, qui ne change pas de rôle.
> Mis à jour à chaque session qui touche l'intégration backend — voir `PROGRESS.md`.

## Ce qui fonctionne de bout en bout aujourd'hui

Création de compte → connexion → sélection d'une régulation → exigences structurées → Analyse
d'impact → preuves côte à côte → validation humaine (Accepter/Rejeter/Escalader), démontrable sans
intervention manuelle, en mode mock (MSW) comme en mode backend réel (`NEXT_PUBLIC_BACKEND_URL`)
pour tout ce que ce dernier couvre. Le scénario cross-language du script de démo (régulation EBA en
anglais ↔ procédures internes en français) est couvert par le corpus de démo construit à la main.

## Limitations à annoncer avant la démo

1. **La validation humaine est persistée côté serveur réel depuis le 2026-09-09.** Accepter/
   Rejeter/Escalader (et l'assignation associée à une escalade) appelle désormais
   `PUT /api/mappings/:id/human-status` et `/assignee` en mode backend réel — la décision survit à
   un rechargement, un autre onglet ou un autre poste. Ce qui n'est PAS transmis au backend :
   `custom_action` (action retenue par le relecteur) et `reviewer_comment`, faute de colonnes
   côté serveur — la décision (Accepté/Rejeté/Escaladé) est bien réelle, ces deux détails restent
   locaux à la session du navigateur. En mode mock (MSW), rien ne change : tout reste dans
   `sessionStorage` comme avant.
2. **L'onglet Historique (qui a décidé quoi, quand) fonctionne uniquement en mock.** Le backend
   peut désormais stocker une décision mais ne dit pas encore qui l'a prise (`actor_id`) — sans
   quoi l'historique resterait vide pour toute décision réelle. Décision explicite : mieux vaut ne
   montrer l'onglet qu'avec des données de démonstration cohérentes plutôt qu'un historique vide et
   déroutant.
3. **La preuve interne n'est pas toujours le passage exact cité.** En mode backend réel, le lien
   entre un constat (couple exigence × procédure) et un passage précis du document interne
   n'existe pas encore côté serveur (`chunk_id` manquant). L'extrait affiché est alors le début du
   document de la procédure, explicitement étiqueté « passage non ciblé par le mapping » plutôt que
   présenté comme une citation précise — jamais un texte inventé, seulement moins précis. En mode
   mock, la preuve interne cite bien le passage exact.
4. **Le tableau de bord (portefeuille et par régulation) est recalculé côté client, pas servi par
   le backend.** `/api/dashboard/overview`, `/summary` et `/map` n'existent pas côté serveur : le
   frontend recharge les exigences et constats de chaque régulation puis agrège localement — mêmes
   chiffres, mais un coût réseau qui grandirait avec un corpus beaucoup plus large que les 8
   régulations de démo actuelles.
5. **L'upload d'une nouvelle régulation reste entièrement simulé (MSW).** Le backend expose une
   mise à jour de document existant (`POST /api/documents/{id}/update`) mais pas encore de création
   avec extraction automatique d'exigences — importer un `.docx` en mode backend réel n'aurait donc
   aucun effet observable au-delà de l'écran.
6. **L'assignation « Personne en charge » d'une régulation est purement locale au navigateur en
   mode backend réel.** Le backend n'a pas de champ `assignee_id` sur un document ; la valeur
   choisie est mémorisée dans le navigateur (comme la validation humaine et l'historique) et ne
   survit ni à un autre poste, ni à l'ouverture dans un autre navigateur. Corrige un bug réel signalé
   le 2026-09-09 (l'assignation échouait purement et simplement, avec un message d'erreur, en mode
   backend réel).
7. **Les textes générés par le backend (explication, action recommandée) sont traduits en
   français quand le backend fournit une variante.** Depuis le 2026-09-09, l'écran affiche la
   variante française (`explanation_fr`/`recommended_action_fr`) en interface FR, dès que le
   backend la fournit. Nuance : cette traduction n'existe que pour les couples exigence ×
   procédure créés ou mis à jour après ce changement côté backend — les couples plus anciens du
   corpus restent en anglais tant que Thư ne les régénère pas. Les preuves elles-mêmes
   (`excerpt`) restent, par principe produit, toujours dans leur langue source — ce point ne les
   concerne pas.
8. **`priority` d'un constat est provisoirement déduit de `risk_level` de l'exigence** en mode
   backend réel (mêmes valeurs LOW/MEDIUM/HIGH) — une approximation raisonnable, pas encore
   confirmée avec Thư comme équivalence définitive.
9. **L'authentification de démonstration n'est pas un contrôle d'accès réel.** Un écran de création
   de compte existe désormais (depuis le 2026-09-09), fonctionnel en mode mock comme en mode
   backend réel — mais en mode backend réel, aucun contrôle d'autorisation fin par rôle n'est
   appliqué côté frontend au-delà de l'écran de connexion ; en mode mock, l'authentification reste
   entièrement simulée (session dans `sessionStorage`).
10. **Le rôle d'un compte peut être changé (écran « Utilisateurs »), mais sans contrôle
    d'accès.** À la création d'un compte, le rôle est fixé automatiquement
    (`Responsable Conformité` en mode mock, `COMPLIANCE_OFFICER` en mode backend réel) ; un écran
    dédié permet ensuite de le modifier. Limite assumée : n'importe quelle personne connectée peut
    changer le rôle de n'importe quel autre compte, pas seulement le sien — annoncé directement dans
    l'écran plutôt que caché.
11. **Le Copilot est un écran de présentation (P2), pas une fonctionnalité.** Il ne doit jamais
    devenir l'écran principal du script de démo — voir `docs/phases/phase-5-client-readiness.md`.
12. **Une session expirée (JWT, 60 min) en mode backend réel affiche une erreur générique plutôt
    que de renvoyer vers la connexion.** L'écran continue d'afficher la personne comme connectée
    (nom en haut à droite) mais chaque écran de données affiche « Le chargement a échoué » sans
    expliquer pourquoi. Contournement en attendant une session, à démo : se déconnecter puis se
    reconnecter suffit à repartir avec un jeton frais.

## Garde-fou produit, rappel

Aucune de ces limitations ne remet en cause la règle non négociable de `docs/ui-guardrails.md` :
l'outil ne formule jamais de conclusion de conformité autonome, et un constat n'est jamais affiché
sans sa preuve — même quand cette preuve est, comme au point 3, honnêtement signalée comme moins
précise qu'elle ne pourrait l'être.
