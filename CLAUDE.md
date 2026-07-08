# 2048

> Un mini-jeu 2048 en HTML/CSS/JS, développé avec IA Engineering.

---

# Project

**2048** est un mini-jeu web reproduisant le jeu de puzzle 2048 : déplacer des tuiles sur une grille avec les touches directionnelles pour fusionner les valeurs identiques jusqu'à atteindre 2048.

**Objectif :** livrer un jeu jouable dans un navigateur, avec des profils joueurs persistants côté serveur — chaque joueur choisit son profil au démarrage et retrouve son propre historique de parties et son propre classement.

**Cibles :** plusieurs joueurs (profils multiples), navigateur desktop (support mobile/tactile en option ultérieure).

> **Changement de portée (2026-07-08) :** le projet est passé d'un jeu 100% local (sans backend) à une architecture avec backend, pour supporter des profils joueurs et un historique/classement persistants par joueur. Ce changement a été demandé par le Director et déclenche une Architecture Decision Record — voir `ia-engineering/Governance/` une fois l'ADR rédigée par le Software Architect. Le frontend reste HTML/CSS/JS vanilla ; le choix technique du backend (langage, framework, base de données, hébergement) est délibéré via la Architecture Decision Workflow, pas fixé unilatéralement ici.

---

# Technology Stack

**Frontend :**
- HTML5
- CSS3
- JavaScript (vanilla, sans framework ni build step)

**Backend :** à déterminer par ADR (Software Architect) — voir Current Status. Le frontend continue de fonctionner sans étape de build ; le backend sera une brique séparée avec son propre contrat d'API.

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

| Employee | Rôle sur ce projet |
|---|---|
| Frontend Engineer | Développement du jeu (grille, tuiles, logique de fusion, input, rendu, écran de sélection de profil) |
| Backend Engineer | API des profils, historique de parties, classement |
| Software Architect | Choix technique du backend (ADR), revue d'architecture pour tout changement structurant |
| Database Engineer | Modèle de données (profils, parties, scores) |
| DevOps Engineer | Hébergement et déploiement du backend |
| QA Engineer | Plan de test, vérification du gameplay et des cas limites |
| Code Reviewer | Revue de code avant chaque merge vers `develop`/`main` |
| Business Analyst | Formalisation des exigences fonctionnelles pour les features ambiguës ou structurantes (ex. profils) |

**Étendu le 2026-07-08** (voir le changement de portée ci-dessus) : Backend Engineer, Software Architect, Database Engineer, DevOps Engineer, Business Analyst rejoignent le roster actif. Security Engineer sera activé dès que le backend gère authentification ou données sensibles.

Non activés pour ce projet : iOS/Android Engineer, Data Scientist/ML*, Solution Architect (pas de système multi-services externes à ce stade).

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
ia-engineering/     — Framework IA Engineering (submodule)
index.html          — Point d'entrée du jeu
style.css           — Styles
script.js           — Logique de rendu et d'état du jeu
game-logic.js        — Logique pure du jeu (plateau, fusion, classement), testée
game-logic.test.js   — Tests unitaires Vitest
package.json         — Dépendances de développement (Vitest)
backend/             — À créer une fois l'ADR backend approuvée
```

---

# Current Status

Jeu de base livré et mergé sur `develop` : grille 4x4, déplacement/fusion 4 directions, victoire/défaite, classement Top 10 local (WU-2048-001, 002, 003).

**En cours :** Director a demandé des profils joueurs avec historique de parties et classement personnel par profil, portés par un backend (changement de portée validé le 2026-07-08 — voir Objectif ci-dessus).

**Chaîne en cours (Architecture Chain, `ia-engineering/Core/AGENT_CHAINS.md`) :**
1. Business Analyst — formaliser les exigences (création de profil, contenu de l'historique, périmètre du classement personnel)
2. Software Architect — ADR de choix technique backend (options, rationale) — déclencheur : sélection technologique + départ du pattern architectural existant
3. Director — approbation de l'ADR
4. Engineering Manager — découpage en Work Units
5. Feature Chain standard pour l'implémentation

Aucune implémentation ne commence avant l'approbation de l'ADR par le Director.
