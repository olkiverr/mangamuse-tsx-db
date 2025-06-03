# Mangamuse

Mangamuse est une application web de gestion et découverte d'animes développée avec React, TypeScript, Express et Prisma.

## Prérequis

- [Node.js](https://nodejs.org/) (v14 ou supérieur)
- [npm](https://www.npmjs.com/) (généralement installé avec Node.js)
- [Git](https://git-scm.com/) pour cloner le dépôt

## Installation

### 1. Clonez le dépôt

```bash
git clone <url-du-dépôt>
cd mangamuse-tsx-db-main
```

### 2. Installez les dépendances

```bash
# Installation des dépendances du projet
npm install

# Installation des dépendances spécifiques
npm install react-icons
```

### 3. Configuration de la base de données

L'application utilise Prisma avec une base de données SQLite par défaut.

```bash
# Générer le client Prisma
npx prisma generate
```

## Lancement de l'application

### 1. Démarrer le serveur backend

```bash
# Dans un terminal, démarrez le serveur backend
npm run server
```

Le serveur sera accessible à l'adresse http://localhost:3000

### 2. Démarrer l'application frontend

```bash
# Dans un autre terminal, démarrez l'application frontend
npm run dev
```

L'application sera accessible à l'adresse http://localhost:5173 (ou un autre port si 5173 est occupé)

## Fonctionnalités principales

- Recherche et navigation d'animes
- Système de compte utilisateur (inscription, connexion)
- Gestion des favoris et des animes vus
- Panneau d'administration pour la gestion des utilisateurs
- Contrôle d'accès au contenu NSFW

## Accès administrateur

Un compte administrateur est automatiquement créé au premier démarrage avec les identifiants suivants :
- Email: admin@mangamuse.com
- Mot de passe: admin

## Structure du projet

- `src/` - Code source frontend (React/TypeScript)
- `server/` - Code source backend (Node.js/Express)
- `prisma/` - Schémas et configuration de la base de données

## Résolution des problèmes courants

### Erreur "Module not found"

Si vous rencontrez des erreurs de modules non trouvés, vérifiez que vous avez bien installé toutes les dépendances :

```bash
npm install
```

### Problèmes de connexion à la base de données

Si vous rencontrez des problèmes avec la base de données, essayez de réinitialiser Prisma :

```bash
npx prisma generate
```

### Le serveur ne démarre pas

Vérifiez qu'aucun autre service n'utilise le port 3000. Vous pouvez modifier le port dans le fichier `server/index.ts` si nécessaire. 