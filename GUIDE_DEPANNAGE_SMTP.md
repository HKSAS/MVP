# Guide de dépannage SMTP - Réinitialisation de mot de passe

## Problème : "Error sending recovery email" ou "Timeout après 30 secondes"

Si vous rencontrez ces erreurs après avoir modifié vos paramètres SMTP dans Supabase, voici les étapes pour résoudre le problème.

## ⚠️ PROBLÈME CRITIQUE : Timeout après 30 secondes

**Si vous voyez le message "La requête a pris trop de temps (timeout après 30 secondes)"**, cela signifie que Supabase n'arrive pas à se connecter à votre serveur SMTP. Voici les actions immédiates à prendre :

### Checklist rapide (dans l'ordre)

1. ✅ **Vérifiez le Host SMTP**
   - Doit être exactement : `smtp.ionos.fr` (avec le "p")
   - ❌ Ne pas utiliser : `smt.ionos.fr` ou `smtp1.ionos.fr`

2. ✅ **Vérifiez le Port**
   - Utilisez **587** avec **STARTTLS/TLS** (recommandé)
   - OU **465** avec **SSL/TLS** (alternative)
   - ❌ **NE PAS utiliser 585** (obsolète et cause des timeouts)

3. ✅ **Vérifiez que SMTP personnalisé est activé**
   - Dans Supabase : Authentication > SMTP Settings
   - Le toggle doit être **VERT** (activé)

4. ✅ **Testez la connexion SMTP dans Supabase**
   - Cliquez sur le bouton "Test" dans les paramètres SMTP
   - Si le test échoue, les paramètres sont incorrects

5. ✅ **Vérifiez les identifiants**
   - Username : doit être l'adresse email complète (`contact@autovalia.fr`)
   - Password : doit être le mot de passe du compte email (pas un mot de passe d'application)

## Configuration SMTP recommandée pour Ionos

### ⚡ Configuration EXACTE pour éviter les timeouts

**Copiez-collez ces paramètres exactement dans Supabase :**

```
Host: smtp.ionos.fr
Port: 587
Chiffrement: STARTTLS/TLS
Email expéditeur: contact@autovalia.fr
Nom expéditeur: Autovalia
Username: contact@autovalia.fr
Password: [votre mot de passe email]
```

### Paramètres détaillés

1. **Host SMTP** : `smtp.ionos.fr` (notez le "p" dans "smtp")
   - ❌ Incorrect : `smt.ionos.fr` → **CAUSE DES TIMEOUTS**
   - ❌ Incorrect : `smtp1.ionos.fr` → **CAUSE DES TIMEOUTS**
   - ✅ Correct : `smtp.ionos.fr`

2. **Port** : 
   - **587** (recommandé) avec **STARTTLS/TLS** → **UTILISEZ CELUI-CI EN PRIORITÉ**
   - **465** (alternative) avec **SSL/TLS** → Si 587 ne fonctionne pas
   - ❌ **ÉVITEZ ABSOLUMENT le port 585** (obsolète et cause des timeouts de 30+ secondes)

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

## Problèmes courants et solutions

### 🔴 Port 585 (CAUSE PRINCIPALE DES TIMEOUTS)
Le port 585 est obsolète et **cause systématiquement des timeouts**. 
- ❌ **NE PAS utiliser 585**
- ✅ Utilisez **587** avec STARTTLS (recommandé)
- ✅ OU **465** avec SSL

### 🔴 Host incorrect (CAUSE PRINCIPALE DES TIMEOUTS)
Assurez-vous que le host est **exactement** `smtp.ionos.fr` (avec le "p").
- ❌ `smt.ionos.fr` → **Timeout garanti**
- ❌ `smtp1.ionos.fr` → **Timeout garanti**
- ✅ `smtp.ionos.fr` → **Correct**

### 🔴 SMTP personnalisé non activé
Si le toggle n'est pas activé, Supabase utilisera son SMTP par défaut qui peut être limité.
- Vérifiez que le toggle est **VERT** dans Supabase

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

## 🔧 Procédure de correction étape par étape

### Étape 1 : Vérifier les paramètres actuels
1. Allez dans Supabase Dashboard
2. Authentication > SMTP Settings
3. Notez tous les paramètres actuels

### Étape 2 : Corriger les paramètres
1. **Host** : Changez en `smtp.ionos.fr` (si différent)
2. **Port** : Changez en `587` (si vous utilisez 585)
3. **Chiffrement** : Sélectionnez "STARTTLS/TLS" pour le port 587
4. **Username** : Vérifiez que c'est `contact@autovalia.fr` (email complet)
5. **Password** : Vérifiez que c'est le bon mot de passe

### Étape 3 : Tester la connexion
1. Cliquez sur le bouton **"Test"** dans Supabase
2. Attendez le résultat (ne devrait pas prendre plus de 5 secondes)
3. Si le test échoue :
   - Vérifiez les logs dans Supabase (Logs > Auth Logs)
   - Vérifiez que le compte email est actif
   - Contactez le support Ionos si nécessaire

### Étape 4 : Tester la réinitialisation
1. Une fois le test SMTP réussi, testez la réinitialisation de mot de passe
2. L'envoi devrait prendre moins de 5 secondes (pas de timeout)
3. Vérifiez votre boîte de réception (et les spams)

## ⚠️ Si le problème persiste après correction

1. **Vérifiez les logs Supabase**
   - Allez dans Logs > Auth Logs
   - Cherchez les erreurs SMTP récentes
   - Les erreurs vous indiqueront le problème exact

2. **Testez avec un autre port**
   - Si 587 ne fonctionne pas, essayez 465 avec SSL
   - Changez le chiffrement en conséquence

3. **Contactez le support Ionos**
   - Demandez confirmation des paramètres SMTP
   - Vérifiez que votre compte email n'est pas bloqué
   - Demandez s'il y a des restrictions sur votre compte

4. **Alternative : Utiliser un service d'email tiers**
   - Si Ionos continue de poser problème, considérez :
     - SendGrid
     - Mailgun
     - AWS SES
     - Resend

