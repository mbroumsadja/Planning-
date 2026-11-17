# Planning

Application web qui génère des plannings de stage : une ligne par stagiaire, une colonne par jour, avec les gardes, les permanences et les repos selon une rotation définie par l'administration.

## Fonctionnement

1. **Administration** (`/admin`) : l'administrateur crée des rotations. Une rotation est un cycle de blocs qui se répète, par exemple 1 jour de garde, 1 jour de repos, 4 jours de permanence. Il règle aussi le décalage entre deux stagiaires, l'inclusion des week-ends et les horaires.
2. **Génération** (`/`) : l'utilisateur choisit une rotation, saisit le nom du groupe et la liste des stagiaires, puis le premier et le dernier jour de stage.
3. **Résultat** : tableau avec les noms en lignes et les dates en colonnes (groupées par mois), totaux par stagiaire, ligne de couverture des gardes, impression A4 paysage / PDF et export CSV pour Excel.

## Règle de génération

Le stagiaire n° *i* suit le même cycle que le premier, retardé de `i × décalage` jours. Avant son décalage, il est compté en repos. Si les week-ends sont exclus, ils sont grisés et ne consomment pas de jour du cycle.

## Lancer le projet

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # tests du moteur de génération
npm run build
```

## Structure

```
app/page.tsx            assistant en 3 étapes + affichage du planning
app/admin/page.tsx      gestion des rotations
components/             tableau du planning, légende
lib/scheduler.ts        moteur de génération, validation, export CSV
lib/dates.ts            utilitaires de dates (UTC)
lib/defaults.ts         rotations d'exemple
scripts/test-scheduler.ts
```

## État actuel et suite

- Les rotations et le dernier brouillon sont stockés dans le navigateur (`localStorage`). Le moteur (`lib/scheduler.ts`) est indépendant de l'interface : il peut être branché sur une API Express + MySQL sans changement.
- L'administration n'a pas encore d'authentification. À protéger (JWT) avant mise en ligne.
