# Analyse de régression — APK signée

Les captures du 21 août montrent deux compilations signées distinctes. La première est une demande ancienne que le relais ne conserve plus. L’application lui propose déjà le bouton **Relancer**, car le ZIP est toujours conservé localement. La seconde a été acceptée par le relais, mais l’enregistrement local du lien privé de sauvegarde a échoué avec l’erreur Android « Invalid key provided to SecureStore ».

La cause est le caractère `:` dans l’ancienne clé `one-app-key-backup-url:<buildId>`. Les clés SecureStore sont désormais créées par `getKeyBackupStorageKey`, qui produit uniquement des lettres, chiffres, tirets et underscores. Les contrôles TypeScript et la suite de tests valident le changement, y compris deux tests dédiés à l’identifiant de stockage.

La notification « Compilation à vérifier » de la première entrée est cohérente avec la transition d’une compilation en attente vers une compilation introuvable. Elle ne signifie pas qu’une nouvelle compilation signée est cassée ; l’action correcte pour cette ancienne entrée reste **Relancer**.
