# Impact du changement de service Manus sur MIA💻

*Vérifié le 21 août 2026. Cette note résume uniquement les informations officielles à contrôler avec la notification du compte.*

## Point décisif

La notification affichée dans Manus et l’e-mail du compte déterminent si le compte est concerné. Il ne faut pas déduire le statut à partir du pays, de l’ancienneté du compte ou du projet.

| Situation du compte | Effet pour MIA💻 |
|---|---|
| Compte non concerné | Le projet mobile et le backend Manus continuent normalement. |
| Compte concerné | Le projet, ses checkpoints et les services backend Manus doivent être sauvegardés avant la fenêtre de coupure. L’APK déjà installée reste sur le téléphone, mais les fonctions qui appellent le backend Manus peuvent devenir indisponibles jusqu’à restauration. |

## Délais officiels

La sauvegarde doit être terminée avant le **23 août 2026 à 7 h 59 (heure de Singapour)**. La période d’indisponibilité indiquée va du 23 août à 8 h 00 au 25 août à 7 h 59, puis la restauration ouvre le 25 août à 8 h 00.

## Sauvegarde recommandée si le compte est concerné

1. Utiliser l’outil officiel : https://manus.im/backup
2. Créer une **Task Data Backup** qui contient le projet MIA💻, son code, les checkpoints, le backend, les variables et les fichiers.
3. Si la notification indique le type C, créer d’abord l’**Account Data Backup**, puis la Task Data Backup.
4. Garder séparément l’APK debug et l’archive source déjà fournies : un export de tâche ne garantit pas de contenir tous les anciens APK compilés.
5. Après une nouvelle modification du projet, refaire un export : chaque sauvegarde est un instantané et ne se met pas à jour seule.

## Sources officielles

- Vue d’ensemble : https://help.manus.im/en/articles/16147831-service-change-overview-what-s-happening-and-am-i-affected
- Sauvegarde : https://help.manus.im/en/articles/16147892-service-change-overview-how-to-back-up-your-data
- Politique mobile : `/home/ubuntu/skills/data-backup-restoration/references/mobile-apps.md`
