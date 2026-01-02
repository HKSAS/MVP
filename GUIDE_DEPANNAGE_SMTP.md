# Guide de dépannage SMTP - Réinitialisation de mot de passe

## Problème : "Error sending recovery email"

Si vous rencontrez cette erreur après avoir modifié vos paramètres SMTP dans Supabase, voici les étapes pour résoudre le problème.

## Configuration SMTP recommandée pour Ionos

### Paramètres corrects pour Ionos

1. **Host SMTP** : `smtp.ionos.fr` (notez le "p" dans "smtp")
   - ❌ Incorrect : `smt.ionos.fr`
   - ✅ Correct : `smtp.ionos.fr`

2. **Port** : 
   - **587** (recommandé) avec **STARTTLS/TLS**
   - **465** (alternative) avec **SSL/TLS**
   - ❌ Évitez le port **585** (obsolète)

3. **Email expéditeur** : `contact@autovalia.fr`
   - Doit correspondre à un compte email valide sur votre domaine Ionos

4. **Nom expéditeur** : `Autovalia`

5. **Authentification** :
   - **Nom d'utilisateur** : L'adresse email complète (`contact@autovalia.fr`)
   - **Mot de passe** : Le mot de passe du compte email

## Vérifications dans Supabase

### 1. Vérifier que SMTP personnalisé est activé
- Allez dans **Authentication** > **SMTP Settings**
- Assurez-vous que le toggle "Activer le protocole SMTP personnalisé" est **activé** (vert)

### 2. Vérifier les paramètres
```
Host: smtp.ionos.fr
Port: 587 (ou 465)
Email: contact@autovalia.fr
Nom: Autovalia
Username: contact@autovalia.fr
Password: [votre mot de passe email]
```

### 3. Test de connexion
- Utilisez le bouton "Test" dans Supabase pour vérifier la connexion SMTP
- Si le test échoue, vérifiez :
  - Les identifiants sont corrects
  - Le port est correct (587 ou 465)
  - Le host est correct (smtp.ionos.fr)

## Problèmes courants

### Port 585
Le port 585 est obsolète. Utilisez plutôt :
- **587** avec STARTTLS (recommandé)
- **465** avec SSL

### Host incorrect
Assurez-vous que le host est exactement `smtp.ionos.fr` (avec le "p").

### Authentification
- Le nom d'utilisateur doit être l'adresse email complète
- Le mot de passe doit être celui du compte email (pas un mot de passe d'application)

### Pare-feu / Blocage
- Vérifiez que votre pare-feu n'bloque pas les connexions sortantes sur les ports 587 ou 465
- Certains hébergeurs bloquent SMTP sortant - contactez Ionos si nécessaire

## Configuration alternative : Port 465 (SSL)

Si le port 587 ne fonctionne pas, essayez :

```
Host: smtp.ionos.fr
Port: 465
Chiffrement: SSL/TLS
```

## Vérification des logs

Dans Supabase, allez dans **Logs** > **Auth Logs** pour voir les erreurs détaillées.

Les erreurs courantes :
- `535 Authentication failed` → Identifiants incorrects
- `Connection timeout` → Port ou host incorrect
- `550 Relay not allowed` → Configuration SMTP incorrecte

## Support Ionos

Si le problème persiste après avoir vérifié tous les paramètres :
1. Contactez le support Ionos pour confirmer les paramètres SMTP
2. Vérifiez que votre compte email est actif et fonctionnel
3. Testez l'envoi d'email depuis un client email (Outlook, Thunderbird) avec les mêmes paramètres

## Après correction

Une fois les paramètres corrigés :
1. Testez la connexion SMTP dans Supabase
2. Essayez à nouveau la réinitialisation de mot de passe
3. Vérifiez que l'email arrive bien dans la boîte de réception (et les spams)

