# Planning

Application web qui génère des plannings de stage : une ligne par stagiaire, une colonne par jour, avec les permanences, les gardes et les repos selon la rotation de l'hôpital choisi.

## Fonctionnement

1. **Hôpital** : l'utilisateur choisit l'hôpital où se déroule le stage. La rotation de cet hôpital s'applique automatiquement.
2. **Stagiaires** : nom du groupe de stagiaires et liste des noms (un par ligne). Les stagiaires forment des équipes qui se relaient : taille 2, 3 ou 4 choisie en un clic, ou équipes formées à la main avec une ligne vide entre deux équipes.
3. **Période** : premier et dernier jour de stage.
4. **Résultat** : un seul tableau, comme la fiche papier : une ligne par stagiaire, une colonne par poste (permanence, garde, repos) et, dans chaque case, la liste des dates mois par mois, avec une couleur par poste. Impression A4 paysage / PDF et export CSV pour Excel.

## Hôpitaux et rotations

Chaque hôpital a un cycle de jours qui se répète, dans l'ordre de passage, du premier au dernier jour du stage. Rien ne change d'un cycle à l'autre.

| Hôpital | Cycle |
|---|---|
| CMA de Laindé | 1 permanence, 1 garde, 1 repos |
| Hôpital Régional de Garoua | 2 permanences, 1 garde, 4 repos |

**Ajouter un hôpital** : ouvrir `lib/hospitals.ts`, copier un bloc de `DEFAULT_HOSPITALS`, changer `id`, `name`, `city` et le `cycle`. L'hôpital apparaît ensuite dans la liste de choix. On peut aussi en ajouter ou en modifier depuis `/admin`.

## Règle de génération

Toutes les équipes suivent le même cycle. Les membres d'une équipe ont le même planning : ils font la garde, la permanence et le repos le même jour. Les équipes se relaient entre elles : l'équipe *t* sur *n* démarre `⌊t × durée du cycle / n⌋` jours plus tard dans le cycle.

- 3 équipes sur le cycle du CMA (3 jours) : chaque jour, une équipe fait la permanence, une la garde et une se repose.
- 2 équipes : quand l'une fait la permanence, l'autre est au repos.
- 6 équipes : deux équipes par poste chaque jour.
- Pour avoir une équipe de garde tous les jours, il faut au moins autant d'équipes que de jours dans le cycle (7 à l'Hôpital Régional).

Formation automatique des équipes : personne n'est seul. 7 stagiaires en équipes de 2 donnent 3 + 2 + 2. Si les week-ends sont exclus d'une rotation, ils sont grisés et ne consomment pas de jour du cycle.

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
lib/scheduler.ts        équipes, moteur de génération, validation, export CSV
lib/useHospitals.ts     registre du code + modifications faites dans /admin
lib/dates.ts            utilitaires de dates (UTC)
scripts/test-scheduler.ts
```

## État actuel et suite

- Les modifications faites dans `/admin` sont stockées dans le navigateur (`localStorage`) et prennent le dessus sur `lib/hospitals.ts` pour l'hôpital concerné. Le moteur (`lib/scheduler.ts`) est indépendant de l'interface : il peut être branché sur une API Express + MySQL sans changement.
- L'administration n'a pas encore d'authentification. À protéger (JWT) avant mise en ligne.
