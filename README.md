# 2048

Mini-jeu 2048 en HTML/CSS/JS vanilla, sans backend ni framework.

## Jouer

Ouvrir `index.html` dans un navigateur (aucun serveur requis). Déplacer les tuiles avec les flèches du clavier.

## Structure

- `index.html` — markup du plateau, du score et des overlays
- `style.css` — styles et animations
- `game-logic.js` — logique pure du jeu (plateau, déplacement, fusion, détection fin de partie), sans dépendance au DOM
- `script.js` — rendu DOM, gestion des entrées clavier, cycle de vie de la partie

## Tests

La logique de jeu (`game-logic.js`) est couverte par des tests unitaires [Vitest](https://vitest.dev/).

```bash
npm install
npm test
```

`Vitest` est une dépendance de développement uniquement — le jeu lui-même ne charge aucune dépendance à l'exécution.
