# Vérifications — 1er octobre 2026 — version 0.3

- 11 tests réussis : recherche/tri, échanges bidirectionnels clients/jobs/notes/PDF, redémarrage serveur, reprise sans doublons après réponse perdue, reprise de téléchargement, références invalides, refus d’un autre espace, pagination, accès refusé, ajouts concurrents hors ligne et JSON nul.
- Bases SQLite distinctes et serveur HTTP local réel dans les tests; fichiers clients simulés en mémoire. Ces tests ne remplacent pas deux appareils physiques.
- Lint sans erreur après correction de l’écriture de ref pendant le rendu et import explicite de Buffer côté Node.
- TypeScript sans émission réussi; checkJs désactivé.
- Aucun serveur distant déployé, aucune compilation native signée, aucun test physique.
- Exports Metro réussis : iOS 659 modules, Android 657 modules. Pas de fichiers APK/IPA.
