# Bi-way dans n8n : vos SMS, messages RCS et e-mails au cœur de vos automatisations

[n8n](https://n8n.io/) relie vos outils entre eux : boutique en ligne, billetterie, formulaires,
tableurs, CRM, agenda… Avec les nœuds Bi-way, chacune de ces automatisations peut envoyer un SMS, un
message RCS enrichi (carte ou carrousel avec images, boutons de réponse, votre marque comme
expéditeur) ou un e-mail, puis réagir aux réponses de vos clients.

Les nœuds sont gratuits, publiés en open source et vérifiés par n8n : paquet
`n8n-nodes-biway-messenger`.

## Pour qui ?

- **PME et commerces** : rappels de rendez-vous, suivi de commande, demande d'avis, message de
  bienvenue… sans développement, à partir des outils que vous utilisez déjà.
- **Agences** : un même workflow sert à plusieurs clients, chacun avec la clé d'API de son propre
  compte Bi-way.
- **Freelances en automatisation** : un connecteur SMS, RCS et e-mail français, prêt à l'emploi, avec
  déclencheur sur les réponses et les clics de boutons.

## Ce que vous pouvez automatiser

Des workflows d'exemple prêts à importer accompagnent le paquet
([dossier `examples`](https://github.com/pocket-communication/n8n-nodes-biway-messenger/tree/main/examples)) :

| Workflow | Ce qu'il fait |
|---|---|
| Rappel de rendez-vous | La veille, rappelle le rendez-vous avec des boutons de réponse rapide (confirmer, être rappelé…), puis traite la réponse. |
| Demande d'avis | Demande une note : les clients satisfaits reçoivent le lien vers vos avis Google, l'équipe est prévenue des clients mécontents. |
| Suivi de commande | À l'expédition d'une commande WooCommerce, envoie une carte RCS avec un bouton de suivi, ou un SMS si le téléphone ne lit pas le RCS. |
| Réponses vers l'équipe | Oriente les réponses de vos clients vers le bon service selon leurs mots-clés. |
| Bienvenue après formulaire | Crée ou met à jour le contact à partir d'un formulaire, puis lui envoie un message de bienvenue. |
| Billetterie Weezevent | Récupère les nouveaux participants d'un évènement Weezevent, les range dans un groupe de contacts et leur envoie un message RCS, ou un e-mail si votre formulaire d'inscription ne demande pas leur téléphone. L'API Weezevent est réservée à ses partenaires : demandez-leur votre clé. |

## Pourquoi Bi-way plutôt qu'un simple envoi de SMS ?

- **Une vraie conversation.** Le déclencheur Bi-way démarre un workflow dès qu'un client répond ou
  touche un bouton, et vous dit lequel. Les accusés de réception et de lecture arrivent de la même
  façon : relancez ceux qui n'ont pas lu.
- **Le RCS sans prendre de risque.** Si le téléphone ne lit pas le RCS, Bi-way envoie à la place le
  SMS de repli de votre compte, un SMS rédigé dans le workflow, ou rien du tout pour laisser votre
  workflow décider.
- **Les mêmes cartes par e-mail.** Une carte ou un carrousel part aussi par e-mail, mis en page par
  Bi-way avec ses boutons : ils mènent au chat web de Bi-way si nécessaire, où les réponses
  automatiques et le déclencheur prennent le relais.
- **Un expéditeur de confiance.** Vos messages RCS arrivent sous le nom et le logo de votre marque,
  vérifiés par Google et validés par les opérateurs mobiles.
- **Vos données restent en France.** Bi-way est un service de Pocket Communication, entreprise
  française soumise au RGPD, hébergé en France. Avec un n8n auto-hébergé, numéros de téléphone et
  messages ne circulent qu'entre vos serveurs et Bi-way : aucun service d'automatisation tiers ne les
  voit passer.

## Ce qu'il vous faut

1. **Un compte Bi-way** : [créez-le en ligne](https://v3.bi-way.fr/signup). L'accès à l'API est
   inclus. L'offre gratuite ouvre le SMS, avec 20 crédits offerts ; pour le RCS, choisissez l'offre
   Pro (point 3). L'e-mail se met en place à part (point 4).
2. **Une clé d'API** : dans Bi-way, **Paramètres › Sécurité › Clés d'API**, bouton **Créer une clé**.
   Notez le jeton et le secret : le secret ne s'affiche qu'une fois. Vous pouvez révoquer une clé à
   tout moment.
3. **Pour le RCS**, un service de chat RCS déclaré par votre entreprise et lancé par les opérateurs :
   déclarez-le sur le [formulaire de déclaration RCS](https://app.bi-way.fr/rcs-registration/) ou dans
   les paramètres de votre service de chat dans Bi-way (des frais de déclaration s'appliquent). Le RCS
   n'est disponible aujourd'hui que vers les numéros des opérateurs mobiles français.
4. **Pour l'e-mail**, l'option e-mail de votre compte, mise en place par Bi-way : Mailjet (canal
   `email`) ou SMTP (canal `email_smtp`).
5. **Un n8n**, Cloud ou auto-hébergé. Pour le déclencheur, votre n8n doit être joignable depuis
   internet en HTTPS : c'est le cas de n8n Cloud ; en auto-hébergé, c'est à vous de l'exposer.

## Installer en cinq minutes

1. Dans l'éditeur n8n, en tant que propriétaire ou administrateur : ouvrez le panneau des nœuds (+),
   cherchez **Bi-way**, ouvrez le nœud qui porte le badge vérifié et cliquez sur **Install node**.
   L'installation vaut pour toute l'instance. Sur une instance auto-hébergée qui n'affiche pas les
   nœuds vérifiés : **Settings › Community Nodes › Install**, puis saisissez
   `n8n-nodes-biway-messenger`.
2. Ajoutez le nœud **Bi-way** à un workflow (cherchez « Bi-way », « SMS », « RCS » ou « e-mail »).
3. Créez l'identifiant de connexion à Bi-way (**Bi-Way API** dans n8n) : collez le jeton et le secret
   de votre clé. n8n vérifie la clé à l'enregistrement.
4. Choisissez **Message › Send**, le canal, le numéro du destinataire au format international
   (`+33612345678`) et le texte. Exécutez : le message part.

## Ce que font les nœuds

L'interface de n8n est en anglais ; voici les opérations sous leur nom dans n8n.

- **Message** : *Send* (un destinataire) et *Broadcast* (numéros ou adresses e-mail, contacts et
  groupes de contacts, envoi programmé, envoi par vagues, accusés de réception et de lecture). Un
  texte, une carte ou un carrousel de 2 à 10 cartes, rédigé dans le nœud ou tiré d'un modèle, avec
  boutons : réponse suggérée, ouverture d'un lien, appel, lieu affiché sur une carte. En SMS, le
  texte seul ; par e-mail, un objet puis un texte avec pièces jointes, une carte ou un carrousel.
- **Template** : créer un modèle de message (texte, carte, carrousel).
- **Asset** : déposer un fichier dans votre galerie Bi-way, pour l'afficher dans une carte ou le
  joindre à un e-mail.
- **Contact** : créer un contact (reconnu par la colonne de votre choix, le téléphone par défaut,
  pour éviter les doublons),
  créer un groupe, importer un fichier Excel (ou un autre format d'import de votre compte).
- **RCS Agent** : créer une réponse automatique à un mot-clé, connaître l'état de votre service de
  chat RCS chez chaque opérateur.
- **RCS Scenario** : créer, consulter, activer, désactiver, supprimer et démarrer des scénarios de
  conversation RCS guidés par boutons.
- **Bi-way Trigger** : démarrer un workflow sur un accusé de réception ou de lecture, un
  message reçu ou un bouton touché, la fin d'un import de contacts, un changement d'état de votre
  service de chat RCS.

Relancer un workflow ne crée pas de doublon : modèles, groupes, contacts et réponses automatiques
existants sont réutilisés par défaut.

## Aller plus loin

- [Documentation technique du paquet](https://github.com/pocket-communication/n8n-nodes-biway-messenger#readme)
  (en anglais) : toutes les opérations, les évènements du déclencheur et leurs champs.
- [Documentation de l'API Bi-way](https://services.bi-way.fr/openapi/)
- Une question, un projet d'intégration : [tech@pocketcommunication.com](mailto:tech@pocketcommunication.com)
