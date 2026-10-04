# DP Gaz — projet mobile 0.3

Application Expo Android/iPhone de dossiers clients, jobs, notes, photos et PDF.
Tous les employés reliés au même service partagent les mêmes dossiers.

## État réel
La synchronisation est raccordée à l’interface. Le serveur commun et la file locale ont été testés avec deux bases SQLite simulant deux téléphones. Aucun hébergement distant, APK/IPA signé ou test sur téléphone physique n’est réalisé. Utiliser des données fictives pour cette version de test.

## Utilisation prévue
1. Déployer `server/server.mjs` sur un hôte Node avec un disque persistant et une adresse HTTPS.
2. Dans l’application, ouvrir « Configurer le partage » et entrer cette adresse et le code commun de l’équipe.
3. Les dossiers déjà présents sur le téléphone sont envoyés à cet espace. Tous les employés connectés à cet espace voient tous les ajouts.
4. L’application échange au démarrage de la connexion, au retour au premier plan et toutes les 30 secondes tant qu’elle reste active. Le bouton « Synchroniser maintenant » permet un échange manuel. Ce n’est pas un service de synchronisation en arrière-plan lorsque l’application est fermée.
5. Les ajouts hors connexion restent sur le téléphone puis sont transmis lors d’un échange réussi. Un téléchargement interrompu est repris au prochain échange.

## Développement et vérification
Node 24 recommandé pour le serveur SQLite. Dépendances verrouillées dans package-lock.json.

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run check:bundles
npm start
```

`typecheck` vérifie la configuration et les sources avec checkJs désactivé; il ne constitue pas un contrôle complet des types. Les exports Metro ne sont pas des applications installables.

## Serveur
```sh
# Définir DPGAZ_TOKEN dans les secrets de l’hébergeur : au moins 32 caractères aléatoires.
# Définir DPGAZ_DB sur un chemin de disque persistant.
npm run server
```

Variables : `DPGAZ_TOKEN` (obligatoire), `DPGAZ_DB` (défaut dpgaz.sqlite), `HOST` (défaut 127.0.0.1), `PORT` (défaut 8787). Mettre un proxy HTTPS devant le serveur HTTP; l’application refuse les adresses HTTP. Le code d’équipe est enregistré dans SecureStore. Il n’y a pas de comptes individuels ni de restrictions par job.

La base serveur contient aussi les fichiers (25 Mo maximum par pièce jointe). Prévoir un volume persistant et une sauvegarde SQLite cohérente avant les données réelles. Ne pas copier uniquement le fichier principal d’une base active en mode WAL.

## Limites
- Ajouts seulement : modification/suppression des dossiers et résolution de conflits d’édition non implémentées.
- Les numéros clients saisis peuvent être identiques entre appareils; les identifiants internes restent distincts.
- Pas de chat distinct, notifications ou comptes individuels; les notes constituent l’historique commun.
- Les fichiers sont chargés entièrement en mémoire; performances à vérifier sur téléphones physiques.
- Pas de sauvegarde distante automatisée ou d’exploitation de production à ce stade.

## Version installable à produire
`eas.json` prépare un profil preview : APK Android, distribution interne iOS. Aucun projet EAS distant n’est rattaché. Identifiants proposés : ca.dpgaz.mobile.

Après configuration du compte Expo de l’entreprise, du projet, des signatures et de la distribution Apple, et vérification des coûts :
```sh
npx eas-cli@latest build --platform all --profile preview
```

L’hébergement et les comptes de compilation doivent être configurés avant un essai partagé sur de vrais téléphones. Aucun service payant n’a été souscrit.
