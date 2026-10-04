# DP Gaz — première base de l’application mobile

État au 30 septembre 2026 : code source d’un prototype local, pas une application installable ni une version de production. Aucun serveur créé, aucun compte connecté, aucun envoi de données. Le nom DP GAZ en texte et le bleu sont provisoires; le logo officiel reste à intégrer.

## Déjà codé
- Création de clients : nom, téléphone, numéro unique local et adresse.
- Plusieurs jobs et adresses par client.
- Recherche sans accents par client, téléphone, numéro, adresse et titre de job.
- Notes datées, photos et PDF attachés à une job, historique chronologique.
- Base SQLite sur le téléphone et copies des fichiers dans le répertoire durable de l’application : consultation et ajouts locaux hors connexion.
- Indication explicite que les données sont locales. Aucun faux état « synchronisé ».

Le sélecteur de fichiers peut dépendre d’Internet si un document choisi se trouve uniquement dans iCloud ou Google Drive. Les fichiers déjà copiés dans l’application restent locaux.

## Lancer avec un environnement de développement
Créer un projet Expo vierge compatible avec les SDK actuels, puis copier `App.js` et `model.mjs` dans sa racine :

```sh
npx create-expo-app@latest dp-gaz --template blank
cd dp-gaz
npx expo install expo-sqlite expo-crypto expo-document-picker expo-file-system expo-sharing react-native-safe-area-context
npx expo start
```

Cette archive est un ensemble de sources à intégrer au projet généré, pas un APK/IPA. Les versions exactes seront verrouillées lors de l’installation. Ne pas utiliser de vrais dossiers clients à ce stade : pas d’authentification, de chiffrement applicatif, de sauvegarde distante ni de synchronisation. La désinstallation supprime les données locales.

## Besoin confirmé / version complète à réaliser
Application privée iOS et Android aux couleurs de DP Gaz, comptes sur invitation, clients → jobs → photos/messages/factures jointes. Facturation existante seulement, pas de création de factures. Recherche globale. Travail hors connexion et synchronisation au retour du réseau.

### Architecture prévue
- Organisation, utilisateurs et membres avec rôle administrateur/employé; contrôle des droits sur le serveur pour chaque requête et fichier.
- Clients, jobs, événements et pièces jointes liés par identifiants UUID. Auteur authentifié et date serveur séparés de la date locale.
- Base locale et journal durable des opérations à transmettre. Chaque opération possède une clé d’idempotence; reprise après interruption et accusé de réception avant de déclarer un ajout synchronisé.
- Messages et photos ajoutés sans écraser les éléments des collègues. Modifications concurrentes de coordonnées signalées; aucune perte silencieuse.
- Envoi des fichiers avec reprise, état « local / en attente / synchronisé / erreur ». Téléchargement local des dossiers sélectionnés pour le terrain.
- Contrôle des invitations, retrait des accès, sauvegardes et restauration, stockage privé des fichiers, politique de conservation des copies hors connexion à définir. Un retrait d’accès ne peut pas effacer instantanément un téléphone déconnecté.

### Étapes restantes
1. Choisir et connecter l’hébergement de la base et des fichiers avec le propriétaire de DP Gaz; valider coûts et région de stockage.
2. Réaliser authentification, invitations, droits, chat partagé et moteur de synchronisation.
3. Ajouter appareil photo, édition des fiches, statuts de jobs, accès aux PDF dans l’application, sauvegarde et gestion d’erreurs avancée.
4. Tester sur iPhone et Android : mode avion, fermeture pendant un ajout, réseau instable, stockage plein, modifications simultanées et accès révoqué.
5. Compiler des versions de test, intégrer l’identité officielle, puis préparer la distribution Apple/Google avec les comptes de l’entreprise.

## Validation effectuée
Tests automatisés de recherche et de chronologie exécutés. Analyse syntaxique du JSX non effectuée : analyseur indisponible dans cet environnement. Pas de compilation mobile, pas de test sur appareil, pas de validation d’interface ou des permissions natives à ce stade.

Références techniques consultées :
- https://docs.expo.dev/versions/latest/sdk/sqlite/
- https://docs.expo.dev/versions/latest/sdk/document-picker/
- https://docs.expo.dev/versions/latest/sdk/filesystem/
- https://docs.expo.dev/versions/latest/sdk/sharing/
