# 2048

Mini-jeu 2048 en HTML/CSS/JS vanilla, sans backend ni framework.

## Jouer

Ouvrir `index.html` dans un navigateur (aucun serveur requis). Déplacer les tuiles avec les flèches du clavier.

## Classement (Leaderboard)

Le jeu inclut un **classement Top 10 persistant** stocké localement :

- Lorsque vous perdez (plateau rempli, plus de mouvement possible), si votre score entre dans le Top 10, une fenêtre vous invite à entrer votre nom.
- Les scores sont sauvegardés dans `localStorage` sous la clé `"2048-leaderboard"` et persistent à travers les rechargements de page.
- Cliquez sur le bouton **Classement** en haut du jeu pour consulter les 10 meilleurs scores.
- Le score "Meilleur" affiché en haut de l'écran reflète l'entrée #1 du classement.

## Structure

- `index.html` — markup du plateau, du score, des overlays et du classement
- `style.css` — styles et animations
- `game-logic.js` — logique pure du jeu (plateau, déplacement, fusion, détection fin de partie, gestion du classement), sans dépendance au DOM
- `script.js` — rendu DOM, gestion des entrées clavier, persistance du classement, cycle de vie de la partie

## Tests

La logique de jeu (`game-logic.js`) est couverte par des tests unitaires [Vitest](https://vitest.dev/).

```bash
npm install
npm test
```

`Vitest` est une dépendance de développement uniquement — le jeu lui-même ne charge aucune dépendance à l'exécution.
