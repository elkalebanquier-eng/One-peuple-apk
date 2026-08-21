# Migration gratuite Cloudflare–GitHub pour MIA💻

## Constats officiels — 21 août 2026

Cloudflare Workers Free autorise jusqu’à **100 000 requêtes par jour** et **10 ms de CPU par requête**. Les corps de requête peuvent atteindre **100 Mo** sur le plan Cloudflare gratuit ; le ZIP maximal de MIA💻 (50 Mo) reste donc dans cette limite. Un Worker ne doit toutefois pas analyser ou conserver un gros ZIP en mémoire : il doit le relayer en flux et déléguer la compilation à GitHub Actions. [1] [2]

GitHub indique que les exécuteurs hébergés standards sont gratuits pour les dépôts publics. Le dépôt de compilation de MIA💻 étant public, GitHub Actions peut rester le moteur de compilation, sous réserve du respect de ses limites et conditions d’utilisation. [3]

Le déclenchement de workflow GitHub (`workflow_dispatch`) exige une identité ayant l’autorisation de créer un événement de workflow. Cette autorisation ne doit pas être intégrée dans l’APK : elle doit rester comme secret côté Worker Cloudflare, idéalement derrière un jeton GitHub à droits minimum ou une GitHub App. [4]

Cloudflare annonce que Durable Objects est utilisable sur le plan Free avec des limites. Il peut garder un état de build court (identifiant, expiration, statut) ; ce n’est pas un stockage de ZIP permanent. [5]

## Architecture retenue

L’APK MIA💻 appelle un Worker Cloudflare sur des routes limitées : soumission, état, assistant MIA et relais KIA. Le Worker valide les fichiers et quotas, crée un identifiant de build court et déclenche le workflow GitHub. Le workflow récupère le ZIP uniquement via une URL temporaire liée au build et renvoie le résultat signé au Worker. L’APK télécharge ensuite l’APK temporaire et l’installe directement.

Le ZIP doit rester temporaire, chiffré ou strictement protégé par un jeton à durée courte. Le Worker ne doit pas exposer de jeton GitHub, de clé Gemini ou de secret de signature à l’application. En cas d’indisponibilité du Worker, l’application conserve le ZIP local et affiche une option « Relancer plus tard ».

## Limites honnêtes

La gratuité n’est pas une garantie perpétuelle : les quotas et règles des fournisseurs peuvent évoluer. Sans service payant, un pic de trafic peut atteindre les limites Cloudflare ou GitHub et exiger d’attendre la remise à zéro des quotas. Les utilisateurs ne doivent jamais recevoir un lien ou un écran GitHub dans MIA💻.

## Point important : le ZIP de 50 Mo

Un Worker Cloudflare gratuit peut **recevoir** un fichier de 50 Mo, car la limite officielle du corps de requête gratuit est de 100 Mo. Cela ne veut pas dire qu’il peut le conserver jusqu’au démarrage du runner GitHub : le Worker doit relayer les octets en flux et ne peut pas garder ce ZIP en mémoire ni dans KV. KV est adapté aux petits états et quotas, pas aux archives privées. [1] [6]

Pour une compilation asynchrone sûre, il faut donc un stockage temporaire privé. R2 est le bon composant : son allocation incluse comprend 10 Go de stockage et la sortie réseau est gratuite, mais l’activation peut demander des informations de paiement selon le compte Cloudflare. Si Cloudflare demande une carte bancaire, **ne l’activez pas** : il n’existe pas de remplacement fiable, privé et gratuit pour conserver les ZIP de 50 Mo entre le téléphone et GitHub Actions. [7]

## Configuration à appliquer quand R2 est activable sans paiement

1. Dans Cloudflare, conservez le Worker MIA existant pour le chat, puis créez un Worker séparé nommé `mia-build-gateway`. Il ne doit pas contenir de code de compilation Android.
2. Créez un bucket R2 privé `mia-builds-temp`. Ajoutez une règle de cycle de vie qui supprime automatiquement les objets après 48 heures. Chaque source reçoit un nom aléatoire de build, jamais le nom du téléphone ou de l’utilisateur.
3. Ajoutez un Durable Object `BuildQueue`. Il conserve uniquement l’état court du build : identifiant aléatoire, type du projet, statut, date d’expiration et jeton temporaire. Il ne conserve ni ZIP, ni clé Gemini, ni clé de signature.
4. Dans GitHub, créez une GitHub App limitée au seul dépôt `one-app-build-worker` avec `Actions: Write` et `Contents: Read`. Une alternative est un jeton finement limité au même dépôt avec le droit d’exécuter les workflows. Placez ce secret uniquement dans les secrets du Worker Cloudflare ; ne le mettez jamais dans l’APK ni dans le dépôt.
5. Modifiez le workflow de build : remplacez le contrôle périodique de l’adresse Manus par `workflow_dispatch` avec un `build_id`. Le Worker appelle GitHub avec ce `build_id` après avoir écrit le ZIP dans R2.
6. Le runner GitHub demande au Worker une URL R2 signée à très courte durée pour télécharger le ZIP. Après compilation, il envoie au Worker l’état et l’adresse temporaire de l’APK. Le Worker efface le ZIP et l’APK à l’expiration prévue.
7. Dans MIA💻, remplacez l’adresse actuelle du serveur par l’adresse du Worker Cloudflare. L’application garde déjà le ZIP local et le bouton « Relancer » si le Worker est indisponible.

## Audit précis de MIA💻 actuelle

La migration ne demande pas de refaire l’application Android. Les éléments ci-dessous doivent garder la même forme de réponse afin que les écrans, les notifications et le bouton « Installer l’APK » continuent à fonctionner.

| Élément actuel | Situation | Remplacement Cloudflare |
|---|---|---|
| MIA : chat, code, logo, vérification | Déjà sur le Worker `one-app-ai`. | Ne rien changer aux routes `/api/code`, `/api/logo` et `/api/review`. |
| KIA : chat et logo Gemini | Passe encore par l’adresse Manus. | Ajouter `/api/kia/chat` et `/api/kia/logo` au Worker, avec `GEMINI_API_KEY` uniquement dans les secrets Cloudflare. |
| Soumission de ZIP, statut et quota | Passe encore par l’adresse Manus. | Recréer `/api/quota`, `/api/builds/submit` et `/api/builds/:id/status` dans `mia-build-gateway`, avec les mêmes champs JSON. |
| Récupération ZIP/icône et résultat | Le workflow lit actuellement `/next`, `/source`, `/icon` et `/complete`. | Le Worker offre les mêmes routes sécurisées, ou le workflow est simplifié pour recevoir un `build_id` avec `workflow_dispatch`. |
| Publication d’APK | Déjà assurée par le workflow GitHub de publication temporaire. | Conserver le workflow et remplacer uniquement son URL de rappel par celle du Worker. |

L’adresse unique codée dans MIA💻 qui vise le serveur Manus est aujourd’hui `https://kikonative-evby5xxj.manus.space`. Elle doit devenir l’adresse de `mia-build-gateway`, par exemple `https://mia-build-gateway.<votre-sous-domaine>.workers.dev`. Les utilisateurs ne voient jamais cette adresse.

## Ordre de migration sans interrompre MIA💻

1. Laissez l’APK actuelle sur l’ancienne adresse afin de pouvoir revenir en arrière pendant les essais.
2. Déployez `mia-build-gateway` avec seulement `GET /api/quota` et `GET /api/builds/:id/status`, puis vérifiez ses réponses depuis un navigateur de test.
3. Ajoutez l’envoi privé vers R2 et `POST /api/builds/submit`. N’autorisez que les ZIP de 50 Mo, les icônes PNG de 1 Mo et six demandes par heure.
4. Changez le workflow GitHub afin qu’il reçoive le `build_id` et télécharge source/icône avec un jeton à usage court. Testez une APK HTML simple.
5. Déplacez KIA dans le Worker et créez une nouvelle APK MIA💻 qui utilise la nouvelle adresse. Ne retirez l’ancien serveur qu’après une compilation complète réussie.

> Ne publiez jamais une URL R2 permanente, une clé Gemini, un jeton GitHub ou une clé de signature dans l’APK. Seuls des jetons par build, limités dans le temps, peuvent circuler entre le Worker et GitHub Actions.

## Ce qui est réellement gratuit et ce qui ne l’est pas garanti

| Élément | Rôle | Situation gratuite connue |
|---|---|---|
| Cloudflare Worker | Relais, quotas, IA MIA | 100 000 requêtes par jour, avec limites de CPU. |
| Durable Object | État temporaire des builds | Utilisable dans les limites du plan Free. |
| GitHub Actions public | Compilation Android | Runners standards gratuits pour un dépôt public. |
| R2 | ZIP privé temporaire | 10 Go inclus par mois, mais l’activation dépend des règles de compte Cloudflare. |

## Sans R2 et sans carte bancaire

Gardez l’APK et le code source de MIA💻. MIA Cloudflare, l’historique local et le Mode Agent restent utilisables. Pour les compilations, l’application doit indiquer clairement que le service est momentanément indisponible et proposer « Relancer plus tard ». Ne rendez pas le ZIP public dans GitHub pour contourner le stockage : cela exposerait le code des utilisateurs.

## Références

[1] Cloudflare, [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)

[2] Cloudflare, [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)

[3] GitHub Docs, [Billing and usage for GitHub Actions](https://docs.github.com/en/actions/concepts/billing-and-usage)

[4] GitHub Docs, [REST API endpoints for workflows](https://docs.github.com/rest/actions/workflows)

[5] Cloudflare, [Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)

[6] Cloudflare, [Workers KV Limits](https://developers.cloudflare.com/kv/platform/limits/)

[7] Cloudflare, [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
