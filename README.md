# CantineTrack — Documentation de déploiement

Application de gestion intelligente des cantines d'entreprise.  
Stack : **Node.js + Express + PostgreSQL** (backend) · **React + Vite** (frontend)

---

## Structure du projet

```
cantinetrack/
├── backend/
│   ├── server.js              # Point d'entrée Express
│   ├── package.json
│   ├── .env.example           # Variables d'environnement (copier en .env)
│   ├── db/
│   │   └── schema.sql         # Schéma PostgreSQL + données de démo
│   ├── middleware/
│   │   └── auth.js            # Authentification JWT
│   └── routes/
│       ├── auth.js            # Login / me / change-password
│       ├── companies.js       # CRUD entreprises
│       ├── canteens.js        # Cantines + shifts
│       ├── employees.js       # CRUD employés + QR génération
│       ├── checkins.js        # Logique métier check-in
│       ├── reports.js         # Calcul économies et commissions
│       ├── menus.js           # Menus prestataire
│       ├── providers.js       # Interface prestataire
│       └── dashboard.js       # Stats temps réel
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx            # Routing + protection par rôle
        ├── api.js             # Tous les appels API centralisés
        ├── index.css          # Styles globaux
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   └── Layout.jsx     # Sidebar + navigation
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx  # DRH
            ├── Employees.jsx  # Gestion employés
            ├── Report.jsx     # Rapport mensuel + économies
            ├── Canteens.jsx   # Gestion cantines
            ├── Checkin.jsx    # Tablette kiosque
            ├── PrestDash.jsx  # Vue prestataire
            ├── PrestMenus.jsx
            ├── PrestStaff.jsx
            ├── PrestOrders.jsx
            ├── AdminDash.jsx  # Admin plateforme
            ├── AdminCompanies.jsx
            └── AdminProviders.jsx
```

---

## Installation & démarrage

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Base de données

```bash
# Créer la base
createdb cantinetrack

# Créer l'utilisateur
psql -c "CREATE USER cantinetrack WITH PASSWORD 'motdepasse';"
psql -c "GRANT ALL ON DATABASE cantinetrack TO cantinetrack;"

# Appliquer le schéma
psql cantinetrack < backend/db/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Éditer .env avec vos vraies valeurs

npm install
npm run dev        # développement (nodemon)
npm start          # production
```

Le serveur démarre sur http://localhost:4000

### 3. Frontend

```bash
cd frontend
npm install
npm run dev        # développement → http://localhost:5173
npm run build      # build production → dist/
```

---

## Variables d'environnement (backend/.env)

```env
DATABASE_URL=postgresql://cantinetrack:motdepasse@localhost:5432/cantinetrack
JWT_SECRET=changez_ceci_par_une_chaine_tres_longue_et_aleatoire_minimum_32_caracteres
JWT_EXPIRES_IN=7d
PORT=4000
FRONTEND_URL=http://localhost:5173
NODE_ENV=production
```

---

## Comptes de démonstration

| Rôle          | Email                         | Mot de passe  |
|---------------|-------------------------------|---------------|
| Admin          | admin@cantinetrack.mg         | password123   |
| DRH            | drh@telma.mg                  | password123   |
| Prestataire    | prestataire@restopro.mg       | password123   |
| Tablette       | tablette@telma.mg             | password123   |

> **Important** : Changer tous les mots de passe avant la mise en production.
> Les hashs dans schema.sql sont des placeholders — relancer `npm run db:setup` après avoir généré de vrais hashs avec bcrypt.

---

## Générer un vrai hash de mot de passe

```js
// Dans Node.js
const bcrypt = require('bcrypt');
bcrypt.hash('votre_mot_de_passe', 10).then(console.log);
```

Puis mettre à jour les users dans la DB :
```sql
UPDATE users SET password_hash = 'votre_hash_bcrypt' WHERE email = 'admin@cantinetrack.mg';
```

---

## Déploiement production (VPS Ubuntu)

### Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name cantinetrack.votre-domaine.mg;

    # Frontend (fichiers statiques après build)
    location / {
        root /var/www/cantinetrack/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### PM2 (process manager)

```bash
npm install -g pm2
cd backend
pm2 start server.js --name cantinetrack-api
pm2 save
pm2 startup
```

---

## Logique métier — Check-in

À chaque scan de carte/PIN/NFC la route `POST /api/checkins` vérifie dans l'ordre :

1. **Badge inconnu** → `refused_unknown`
2. **Employé suspendu** → `refused_suspended`
3. **Hors créneau horaire** → `refused_wrong_shift`
4. **Repas déjà pris aujourd'hui** → `refused_already_eaten`
5. **Tout OK** → `approved` + enregistrement en base

---

## Calcul des économies

```
économies = MAX(0, forfait_mensuel - repas_réels) × prix_par_repas
commission = économies × (taux_commission / 100)
```

Le forfait, le prix par repas et le taux de commission sont configurables par entreprise.

---

## Intégration QR code (production)

La page `Checkin.jsx` contient une fonction `simulateQR()` pour les démos.  
En production, intégrer une librairie de scan QR sur la tablette :

```bash
npm install html5-qrcode
```

```jsx
import { Html5QrcodeScanner } from 'html5-qrcode';
// Remplacer le bloc simulateQR par un vrai scanner HTML5
```

---

## API Reference rapide

| Méthode | Route                          | Rôle       | Description                    |
|---------|-------------------------------|------------|--------------------------------|
| POST    | /api/auth/login               | Public     | Connexion                      |
| GET     | /api/auth/me                  | Tous       | Profil connecté                |
| GET     | /api/dashboard                | DRH/Admin  | Stats temps réel               |
| GET     | /api/employees                | DRH/Admin  | Liste employés (paginée)       |
| POST    | /api/employees                | DRH/Admin  | Créer employé + QR auto        |
| POST    | /api/checkins                 | Tablette   | Enregistrer un repas           |
| GET     | /api/reports/monthly          | DRH/Admin  | Rapport + économies            |
| GET     | /api/reports/platform         | Admin      | Vue globale toutes entreprises |
| GET     | /api/providers/my/canteens    | Prestataire| Ses cantines                   |
