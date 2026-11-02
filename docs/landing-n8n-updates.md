# Mises à jour de la page https://www.bi-way.fr/n8n/

Textes prêts à copier dans la page. Le texte actuel a été relu sur le site le 2026-11-02 (page modifiée
pour la dernière fois le 2026-10-31). Ce fichier est un document de travail, absent du paquet npm : il peut être
supprimé une fois la page à jour.

| Bloc | Quand le publier |
|---|---|
| 1. Mention « Vérifié par n8n » | Dès maintenant |
| 2. Prérequis n8n | Dès maintenant |
| 3. Installation | Dès maintenant |
| 4. Démonstration RCS | Dès maintenant |
| 5. Parcours d'accès | Une fois l'option choisie |
| 6. Graphie du nœud | Quand n8n affichera le nœud « Bi-way », sinon la page et l'écran diffèrent |
| 7. Liens vers la documentation | Après le tag 0.2.1 |

Ne changent pas : les cas d'usage, les frais de déclaration RCS, le public visé, le programme partenaire.

---

## 1. Mention « Vérifié par n8n »

Dans l'accroche, juste au-dessus des deux boutons.

**Texte actuel**

> Avec les nœuds Bi-way pour n8n, chacune de vos automatisations envoie des SMS, des messages RCS enrichis (cartes,
> carrousels, boutons de réponse) et des e-mails, puis réagit aux réponses de vos clients. Les nœuds sont gratuits et open
> source.

**Texte proposé**

> Avec les nœuds Bi-way pour n8n, chacune de vos automatisations envoie des SMS, des messages RCS enrichis (cartes,
> carrousels, boutons de réponse) et des e-mails, puis réagit aux réponses de vos clients. Les nœuds sont gratuits et open
> source.
>
> **✓ [Vérifié par n8n](https://n8n.io/integrations/bi-way/)**

La mention reste en texte : les règles de marque de n8n n'ont pas été vérifiées pour un usage de son logo.

---

## 2. Prérequis : n8n

Dernier point de la liste « Ce qu'il vous faut ».

**Texte actuel**

> Un n8n auto-hébergé, ou n8n Cloud dès que les nœuds Bi-way y seront disponibles. Pour réagir aux réponses de vos clients,
> votre n8n doit être joignable depuis internet en HTTPS.

**Texte proposé**

> n8n Cloud ou auto-hébergé. Pour réagir aux réponses de vos clients, votre n8n doit être joignable depuis internet en
> HTTPS : c'est le cas de n8n Cloud ; en auto-hébergé, c'est à vous de l'exposer.

---

## 3. Installation

Étape 1 de « Mise en route ». Parcours suivi le 2026-11-02 sur un n8n 2.45.4 auto-hébergé vierge : recherche, nœud avec son
badge, bouton **Install node**, message « Package installed ».

**Texte actuel**

> Dans n8n, ouvrez Settings › Community Nodes › Install et saisissez n8n-nodes-biway-messenger.

**Texte proposé**

> Dans l'éditeur n8n, ouvrez le panneau des nœuds (+), cherchez **Bi-way**, ouvrez le nœud qui porte le badge vérifié et
> cliquez sur **Install node**. L'installation se fait une seule fois pour toute l'instance, par son propriétaire ou un
> administrateur ; tous ses membres peuvent ensuite utiliser le nœud.
>
> Votre instance auto-hébergée n'affiche pas les nœuds vérifiés ? Passez par **Settings › Community Nodes › Install** et
> saisissez `n8n-nodes-biway-messenger`.

---

## 4. Démonstration RCS

Nouveau bloc, juste après les six cartes de « Pourquoi passer par Bi-way ».

**Titre**

> Voir un vrai message RCS sur votre téléphone

**Texte**

> Saisissez votre numéro sur notre page de démonstration : une carte RCS arrive aussitôt dans votre messagerie, avec
> expéditeur vérifié et boutons cliquables. Rien à installer. Le RCS n'est disponible aujourd'hui que vers les numéros des
> opérateurs mobiles français.

**Bouton**

> Recevoir la démonstration → https://chat.bi-way.fr/s/oi1se3tn62

---

## 5. Parcours d'accès : à choisir

Aujourd'hui, l'accroche propose « Créer un compte » alors que les prérequis disent « Contactez-nous ».

### Option A : inscription, puis activation de l'API

Le visiteur s'inscrit seul et demande l'accès à l'API si son offre ne l'inclut pas.

**Bouton de l'accroche** : inchangé, « Créer un compte » → https://v3.bi-way.fr/signup/

**Prérequis, texte actuel**

> Un compte Bi-way, avec une offre qui donne accès à l'API. Contactez-nous en cas de doute.

**Prérequis, texte proposé**

> Un compte Bi-way : [créez-le en ligne](https://v3.bi-way.fr/signup/). L'envoi depuis n8n demande une offre qui donne accès
> à l'API : [contactez-nous](/contact) pour l'activer si la vôtre ne l'inclut pas.

**À côté** : rien à changer. Le README et les messages du nœud renvoient déjà à l'inscription.

### Option B : contact direct

Le visiteur demande son accès avant de créer quoi que ce soit.

**Bouton de l'accroche** : « Demander un accès » → /contact, à la place de « Créer un compte »

**Prérequis, texte actuel**

> Un compte Bi-way, avec une offre qui donne accès à l'API. Contactez-nous en cas de doute.

**Prérequis, texte proposé**

> Un compte Bi-way avec accès à l'API : [contactez-nous](/contact) pour l'ouvrir.

**À côté** : README (« Get an API key »), notice de Message › Send, deux messages d'erreur du nœud et
`docs/integration-n8n-fr.md` renvoient à l'inscription et seraient à aligner avant le tag.

---

## 6. Graphie du nœud

Étapes 2 et 3 de « Mise en route ». n8n impose la casse « Bi-Way API » pour le nom de l'identifiant : la page le cite tel
qu'il s'affiche, pour qu'on le reconnaisse à l'écran.

**Textes actuels**

> Ajoutez le nœud « Bi-Way » à un workflow.

> Créez l'identifiant « Bi-Way API » avec le jeton et le secret de votre clé.

**Textes proposés**

> Ajoutez le nœud « Bi-way » à un workflow.

> Créez l'identifiant de connexion à Bi-way (« Bi-Way API » dans n8n) avec le jeton et le secret de votre clé.

---

## 7. Liens vers la documentation

Hors de la liste initiale, mais ces liens visent la version 0.1.2 : le visiteur y lit encore l'ancienne graphie et « bientôt
sur n8n Cloud ». À changer après le tag 0.2.1.

| Lien | Adresse actuelle | Adresse proposée |
|---|---|---|
| Bouton « Documentation technique » | `.../tree/0.1.2#readme` | `.../tree/0.2.1#readme` |
| « voir les exemples » | `.../tree/0.1.2/examples` | `.../tree/0.2.1/examples` |

Début commun des adresses : `https://github.com/pocket-communication/n8n-nodes-biway-messenger`.
