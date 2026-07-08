# 2048

> Un mini-jeu 2048 en HTML/CSS/JS, développé avec IA Engineering.

---

# Project

**2048** est un mini-jeu web reproduisant le jeu de puzzle 2048 : déplacer des tuiles sur une grille avec les touches directionnelles pour fusionner les valeurs identiques jusqu'à atteindre 2048.

**Objectif :** livrer un jeu jouable, autonome (sans backend), fonctionnant dans un navigateur via un simple fichier `index.html`.

**Cibles :** joueur unique, navigateur desktop (support mobile/tactile en option ultérieure).

---

# Technology Stack

- HTML5
- CSS3
- JavaScript (vanilla, sans framework ni build step)
- Aucune dépendance externe, aucun backend

---

# Hierarchy

Ce projet suit la hiérarchie IA Engineering :

```
Manifest
    ↓
Standards
    ↓
Employees
    ↓
Workflows
    ↓
Project Context (ce fichier)
    ↓
Implementation
```

Le framework complet est importé en submodule Git dans `ia-engineering/`.

Documents de référence :

- `ia-engineering/Core/AI_MANIFEST.md` — Principes et valeurs
- `ia-engineering/Core/MAIN_AGENT_CONDUCT.md` — Comportement du Main Agent
- `ia-engineering/Core/AGENT_CONDUCT.md` — Comportement universel des Employees
- `ia-engineering/Core/DECISION_TREE.md` — Processus de décision
- `ia-engineering/Core/GLOSSARY.md` — Vocabulaire officiel
- `ia-engineering/Standards/STANDARDS_FIRST.md` — Hiérarchie des standards

---

# Main Agent Behavior

Le Main Agent suit `ia-engineering/Core/MAIN_AGENT_CONDUCT.md` en permanence :

1. Understand
2. Analyze
3. Plan — présenter au Director avant exécution
4. Delegate à l'Employee approprié
5. Review
6. Deliver
7. Stop

Aucune étape n'est sautée.

---

# Active Standards

Tout travail doit respecter les standards applicables dans `ia-engineering/Standards/` :

- `CODE_QUALITY_STANDARD.md`
- `TESTING_STANDARD.md`
- `GIT_STANDARD.md`
- `BRANCH_STANDARD.md`
- `COMMIT_STANDARD.md`
- `PULL_REQUEST_STANDARD.md`
- `DOCUMENTATION_STANDARD.md`

Quand un standard officiel existe, on l'utilise. On n'invente jamais de règle qui le remplace.

---

# Active Employees

Roster réduit, adapté à la taille du projet (mini-jeu solo, front-end only) :

| Employee | Rôle sur ce projet |
|---|---|
| Frontend Engineer | Développement du jeu (grille, tuiles, logique de fusion, input, rendu) |
| QA Engineer | Plan de test, vérification du gameplay et des cas limites |
| Code Reviewer | Revue de code avant chaque merge vers `develop`/`main` |

Non activés pour ce projet (pas de backend, pas de données, pas d'infra) : Backend Engineer, Data*, DevOps*, iOS/Android Engineer, Architecture*.

Ce roster peut évoluer si la portée du projet change.

---

# Working Method

Chaque tâche est un **Work Unit** : un objectif d'ingénierie unique.

**One Work Unit → One Commit → One engineering objective.**

Template : `ia-engineering/Templates/WORK_UNIT.md`

---

# Git Workflow

Confirmation (`ia-engineering/Standards/GIT_STANDARD.md`, `BRANCH_STANDARD.md`) :

- Branches requises : `main`, `develop` — présentes.
- Flux : `feature/*` → `develop` → `release/*` → `main`.
- Convention de nommage des branches : `feature/<objectif>`, `fix/<bug>`, `hotfix/<patch>`.
- Les branches `release/*` ne sont jamais supprimées.
- Aucun push direct sur `main`.

---

# Director

Le Director est **Valy** (valy.louvier@gmail.com).

Le Director prend toutes les décisions finales. Les plans sont présentés avant exécution. Aucun merge, tag, release ou action irréversible sans son approbation.

---

# Repository

```
ia-engineering/   — Framework IA Engineering (submodule)
index.html        — Point d'entrée du jeu (à créer)
style.css         — Styles (à créer)
script.js         — Logique du jeu (à créer)
```

---

# Current Status

Projet en phase d'onboarding. Aucun code de jeu n'existe encore.

**Premier Work Unit proposé :** mettre en place le squelette du jeu — grille 4x4, apparition de tuiles (2/4), déplacement + fusion dans les 4 directions, détection de victoire (2048) et de défaite (plus de mouvement possible).
