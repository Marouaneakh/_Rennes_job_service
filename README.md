# Rennes Job Service

Site responsive en français, construit en HTML, CSS et JavaScript sans framework côté navigateur. Un petit serveur Node.js traite les deux formulaires et transmet les messages via SMTP.

## Démarrer en local

Prérequis : Node.js 20 ou plus récent.

```powershell
npm.cmd install
Copy-Item .env.example .env
# Modifier .env avec vos paramètres SMTP
npm.cmd start
```

Ouvrez `http://localhost:3000`. Les pages peuvent être consultées sans SMTP, mais les formulaires renvoient clairement une erreur 503 tant que l’envoi n’est pas configuré. Ne servez pas ce dossier avec un serveur statique public : les routes `/api/student` et `/api/business` nécessitent Node.js.

## Configurer la réception des messages

Renseignez dans `.env` :

- `RECEIVING_EMAIL` : l’adresse qui reçoit les deux types de demande.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` : paramètres du serveur SMTP. Utilisez généralement `SMTP_SECURE=true` avec le port 465 et `false` avec le port 587.
- `SMTP_USER`, `SMTP_PASSWORD` : identifiants SMTP si le serveur les exige. Les deux doivent être présents ensemble.
- `SMTP_FROM` : adresse expéditrice autorisée par ce serveur SMTP.

La soumission étudiante utilise l’objet `[RJS] Nouvelle candidature étudiante` avec le CV PDF en pièce jointe. La demande entreprise utilise `[RJS] Nouvelle demande de devis entreprise`. L’adresse fournie par le visiteur est placée dans `Reply-To`. Aucun identifiant n’est envoyé au navigateur. Le fichier `.env` est exclu par `.gitignore`.

## Tester les formulaires

1. Avec SMTP configuré, ouvrez l’espace étudiant. Saisissez nom, e-mail, message et CV PDF de moins de 5 Mo, cochez le consentement et envoyez. Vérifiez la réception de l’e-mail et de la pièce jointe.
2. Dans l’espace entreprise, renseignez tous les champs obligatoires, cochez le consentement et envoyez. Vérifiez la réception d’un second e-mail avec un objet distinct.
3. Essayez un fichier autre qu’un PDF, un PDF de plus de 5 Mo, un e-mail invalide et l’absence de consentement. Le navigateur et le serveur doivent les refuser.
4. Retirez temporairement `SMTP_HOST` et redémarrez : le formulaire doit afficher une erreur de configuration, jamais une confirmation d’envoi.

La commande `npm.cmd test` exécute aussi des tests automatisés des deux routes avec un serveur SMTP local simulé.

Pour contrôler les cinq pages aux largeurs 390, 768 et 1440 px, lancez `node visual-check.mjs` pendant que le serveur tourne. Le script utilise Chrome installé localement (`CHROME_PATH` permet de choisir un autre exécutable), vérifie l’absence de débordement horizontal, le menu mobile et l’affichage des erreurs de formulaire. Les captures sont écrites dans `artifacts/`.

## Déploiement

Déployez l’application sur un hébergement Node.js 20+ avec HTTPS. Installez les dépendances avec `npm ci`, définissez les variables d’environnement dans le gestionnaire de secrets de l’hébergeur, puis lancez `npm start`. Le proxy doit transférer les requêtes vers le port `PORT` du serveur. Ne publiez ni `.env`, ni les fichiers serveur comme ressources statiques. Les pièces jointes sont traitées en mémoire et transmises à SMTP, sans dossier d’upload public. Pour plusieurs instances du serveur, remplacez la limitation de débit en mémoire par un stockage partagé.

Avant mise en production publique, Rennes Job Service doit valider les éléments dans [`content-config.json`](content-config.json), notamment l’identité du responsable du traitement, la durée de conservation des demandes et des CV dans la boîte de réception, et la notice de confidentialité. Les informations éditoriales proviennent des pages [Accueil](https://www.rennesjobservice.fr/), [À propos](https://www.rennesjobservice.fr/a-propos), [Espace étudiant](https://www.rennesjobservice.fr/espace-etudiant) et [Espace entreprise](https://www.rennesjobservice.fr/espace-entreprise), consultées le 15 octobre 2026. Les chiffres, témoignages, logos de partenaires et noms d’équipe non confirmés ne sont pas publiés.

## Structure

- `index.html`, `a-propos.html`, `espace-etudiant.html`, `espace-entreprise.html`, `confidentialite.html` : contenu des pages.
- `styles.css` : design et adaptation mobile.
- `assets/` : favicon et polices WOFF2 hébergées localement.
- `main.js` : navigation, animations, validation côté navigateur et soumission asynchrone.
- `server.js` : routes de livraison SMTP, validation serveur, contrôle des PDF et limitation de débit.
- `content-config.json` : faits vérifiés et points à confirmer.
