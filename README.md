# Planning

Application web qui génère des plannings de stage : une ligne par stagiaire, une colonne par jour, avec les gardes, les permanences et les repos selon la rotation de l'hôpital choisi.

## Fonctionnement

1. **Hôpital** : l'utilisateur choisit l'hôpital où se déroule le stage. La rotation propre à cet hôpital s'applique automatiquement.
2. **Groupe** : nom du groupe et liste des stagiaires (un nom par ligne).
3. **Période** : premier et dernier jour de stage.
4. **Résultat** : tableau avec les noms en lignes et les dates en colonnes (groupées par mois), totaux par stagiaire, ligne de couverture des gardes, impression A4 paysage / PDF et export CSV pour Excel.

## Hôpitaux et rotations

Chaque hôpital a un cycle de blocs qui se répète du premier au dernier jour du stage.

| Hôpital | Cycle |
|---|---|
| CMA de Laindé | 1 garde, 1 permanence, 1 repos |
| Hôpital Régional de Garoua | 1 garde, 2 permanences, 4 repos |

**Ajouter un hôpital** : ouvrir `lib/hospitals.ts`, copier un bloc de `DEFAULT_HOSPITALS`, changer `id`, `name`, `city` et le `cycle`. L'hôpital apparaît ensuite dans la liste de choix. On peut aussi en ajouter ou en modifier depuis `/admin`.

## Règle de génération

Le stagiaire n° *i* suit le même cycle que le premier, retardé de `i × décalage` jours. Avant son décalage, il est compté en repos. Avec un décalage de 1 et autant de stagiaires que de jours dans le cycle, il y a exactement une garde par jour. Si les week-ends sont exclus, ils sont grisés et ne consomment pas de jour du cycle.

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
app/admin/page.tsx      gestion des hôpitaux et de leur rotation
components/             tableau du planning, légende
lib/hospitals.ts        registre des hôpitaux (à compléter)
lib/scheduler.ts        moteur de génération, validation, export CSV
lib/useHospitals.ts     registre du code + modifications faites dans /admin
lib/dates.ts            utilitaires de dates (UTC)
scripts/test-scheduler.ts
```

## État actuel et suite

- Les modifications faites dans `/admin` sont stockées dans le navigateur (`localStorage`) et prennent le dessus sur `lib/hospitals.ts` pour l'hôpital concerné. Le moteur (`lib/scheduler.ts`) est indépendant de l'interface : il peut être branché sur une API Express + MySQL sans changement.
- L'administration n'a pas encore d'authentification. À protéger (JWT) avant mise en ligne.
