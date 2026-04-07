# EventFlow — Dashboard MVP

## Prérequis
- [Node.js](https://nodejs.org/) version 18 ou supérieure

## Installation

1. Décompressez l'archive `eventflow-source.zip`
2. Ouvrez un terminal dans le dossier `event-dashboard/`
3. Installez les dépendances :
   ```
   npm install
   ```

## Lancement en mode développement

```
npm run dev
```

Ouvrez ensuite votre navigateur sur : **http://localhost:5000**

## Construction pour production

```
npm run build
node dist/index.cjs
```

## Structure des modules

- `client/src/pages/Dashboard.tsx` — Tableau de bord principal
- `client/src/pages/EventCreate.tsx` — Wizard de création d'événement
- `client/src/pages/ParcoursClient.tsx` — Parcours client (lieu, horaire)
- `client/src/pages/Acquisition.tsx` — Canaux d'acquisition
- `client/src/pages/HubInscription.tsx` — Gestion des inscrits
- `client/src/pages/SprintBoard.tsx` — Kanban agile
- `server/routes.ts` — API REST
- `server/storage.ts` — Base de données SQLite
- `shared/schema.ts` — Modèle de données
