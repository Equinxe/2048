# Functional Specification — Player Profiles with Game History and Personal Leaderboard

Feature: Player Profiles with Game History and Personal Leaderboard
Version: 1.0
Author: Business Analyst (AI Employee)
Status: Draft
Work Unit: WU-2048-005
Date: 2026-07-08

---

## Business Objective

Enable each player to maintain a persistent identity within the 2048 game through named profiles. Each profile accumulates a personal game history (recording score, date, and result for every completed game) and a personal leaderboard (top 10 scores), replacing the current anonymous global leaderboard. Profiles, history, and leaderboard data are persisted on a server backend (technology to be determined by a separate Architecture Decision Record).

---

## Stakeholders

- **Director (Valy)**: Feature sponsor and final decision-maker on all open questions.
- **Players**: End users who create profiles, play games, and consult their history and leaderboard.

---

## Current State (Baseline)

The following describes the existing behavior this specification modifies (as of `develop` branch, 2026-07-08):

- **Leaderboard**: A single global Top 10 stored in `localStorage` under key `"2048-leaderboard"`. Each entry is `{ name: string, score: number }`. Managed by `qualifiesForLeaderboard()` and `addToLeaderboard()` in `game-logic.js` (line 126-137). `LEADERBOARD_SIZE = 10`.
- **Name entry**: When a game ends with a qualifying score, an in-overlay form (`#name-entry-form`) prompts the player for their name (max 12 characters, defaults to "Joueur"). The name is entered per-game, not persisted across games. Triggered by `showNameEntry()` in `script.js` (line 130).
- **Best score display**: The header "Meilleur" badge shows `leaderboard[0].score` — the top score across all players on the device (`script.js` line 57).
- **Win detection**: A tile with value 2048 appears on the board. The `hasWon` flag is set; the overlay shows "Vous avez gagne !" with a "Continuer" button (`script.js` lines 94-99).
- **Loss detection**: No valid move remains (`canMove(board)` returns false). `isGameOver` is set to true (`script.js` lines 101-108).
- **Game auto-start**: `newGame()` is called on page load (`script.js` line 223), immediately starting a game with no profile selection step.
- **Game history**: Does not exist. No record of past games is kept.
- **Profiles**: Do not exist. All players share one leaderboard with no identity distinction.

---

## Definitions

- **Profile**: A named player identity persisted on the backend, identified by a unique server-assigned ID.
- **Active profile**: The profile currently selected in the frontend session. All game results are attributed to this profile.
- **Completed game**: A game that has ended either by game-over (no more moves) or by the player choosing to start a new game after having reached 2048.
- **Abandoned game**: A game where the player starts a new game without having won (reached 2048) or lost (no more moves). Abandoned games are NOT recorded.
- **Result**: Either "win" (the 2048 tile was reached at any point during the game) or "loss" (the game ended without 2048 being reached).

---

## Functional Requirements

### Profile Management

#### FR-001: Profile Creation

A player must be able to create a new profile by providing a display name.

- Display name: string, 1 to 12 characters (matching the existing `maxlength="12"` constraint on `#name-entry-input` in `index.html` line 41).
- The backend assigns a unique identifier to each profile.
- Display names are NOT required to be globally unique — two profiles may share the same name. The unique server-assigned ID is the real identifier. (See OQ-002 for Director decision on uniqueness and protection.)
- After creation, the new profile becomes the active profile and the game screen is shown.

Acceptance criteria:
- Given the profile selector is displayed, when the player chooses "Nouveau profil" and enters a valid name (1-12 characters), then a new profile is created on the backend, the profile becomes active, and the game screen is shown.
- Given the profile selector is displayed, when the player submits an empty name, then creation is rejected with a validation message.
- Given the profile selector is displayed, when the player submits a name exceeding 12 characters, then input is constrained to 12 characters (enforced by the input field, consistent with existing behavior).

Priority: Must have

---

#### FR-002: Profile Selection on Game Launch

When the page loads, the player must be presented with a way to select a profile before any game begins. This replaces the current auto-start behavior (`newGame()` on load).

- The frontend stores the last active profile ID in `localStorage`.
- **[PROPOSAL — requires Director sign-off: See OQ-001]** If a last-used profile ID exists in `localStorage` and the corresponding profile still exists on the backend, that profile is auto-selected and the game screen is shown immediately. If no previous profile exists, or the stored profile was deleted, the profile selector screen is shown.
- Alternative: Always show the profile selector on every page load (no auto-selection).

Acceptance criteria:
- Given a player has previously selected a profile on this device, when the page loads, then the last-used profile is automatically loaded from the backend and the game screen is displayed with that profile active.
- Given no profile has been previously used on this device, when the page loads, then the profile selector screen is displayed and no game is started.
- Given the previously stored profile ID no longer exists on the backend, when the page loads, then the stored ID is cleared from `localStorage` and the profile selector screen is displayed.

Priority: Must have

---

#### FR-003: Profile Switching

A player must be able to switch to a different profile or create a new one without reloading the page.

- A "switch profile" action is accessible from the game screen (e.g., clicking the profile name in the header or a dedicated button).
- Switching opens the profile selector, which lists profiles previously used on this device (profile IDs stored in `localStorage`, display names loaded from the backend) and offers a "Nouveau profil" option.
- If a game is in progress (not completed, not won), switching profiles abandons the current game — it is NOT recorded in history.
- If the player has won the current game (`hasWon === true`) but has not yet reached game-over, the game IS recorded as a win with the current score before switching (see FR-006).

Acceptance criteria:
- Given a game is in progress (no win, no loss), when the player switches profiles, then the current game is abandoned (not recorded) and the newly selected profile becomes active with a fresh game.
- Given the player has won but is still playing (continuing after 2048), when the player switches profiles, then the current game is recorded as a win for the previous profile with the score at the moment of switching, and the new profile becomes active.
- Given no game is in progress, when the player switches profiles, then the new profile becomes active and a new game is started.

Priority: Must have

---

#### FR-004: Active Profile Display

The active profile's display name must be visible in the game UI at all times during gameplay.

- Location: in the header area (`.header` element), clearly associated with the player's identity.
- The display must not conflict with the existing score boxes layout (`.scores` container with "Score" and "Meilleur" boxes).

Acceptance criteria:
- Given a profile is active, when the game screen is displayed, then the profile's display name is visible in the header area.
- Given the active profile's name is 12 characters long, when displayed, then the name is fully visible without overlapping or clipping other UI elements.

Priority: Must have

---

### Game Recording

#### FR-005: Automatic Game Recording on Completion

When a game is completed (as defined in FR-006), the game result is automatically saved to the active profile's history on the backend. No manual action (such as typing a name) is required from the player.

This replaces the current flow where `showNameEntry()` prompts for a name and `saveScore()` writes to `localStorage`.

Acceptance criteria:
- Given a game ends by game-over (no more moves), when the game-over overlay appears, then a game record is saved to the backend for the active profile containing the final score, the current date/time, and the result (win or loss).
- Given a game is completed, when the record is saved, then no name-entry form is shown to the player (identity comes from the active profile).
- Given the backend is unreachable when a game completes, when the save attempt fails, then the player is informed and the record is not silently lost (see NFR-002).

Priority: Must have

---

#### FR-006: Game Completion Rules

A game is "completed" and triggers recording (FR-005) under the following conditions:

| Condition | Trigger | Recorded Result |
|-----------|---------|-----------------|
| Game over | `canMove(board)` returns false | "win" if `hasWon === true`, else "loss" |
| New game after win | Player reached 2048, then clicks "Nouvelle partie" | "win" (score at that moment) |
| Profile switch after win | Player reached 2048, then switches profiles (FR-003) | "win" (score at that moment) |

A game is NOT completed and NOT recorded when:
- The player starts a new game without having won or reached game-over (abandonment).
- The player closes the browser or navigates away mid-game.
- The player switches profiles mid-game without having won (abandonment, per FR-003).

Acceptance criteria:
- Given the board has no valid moves, when the game-over state triggers, then the game is recorded.
- Given the player has reached 2048 and the overlay is showing, when the player clicks "Nouvelle partie", then the game is recorded as a win with the current score before resetting.
- Given the player has reached 2048 and is continuing to play, when the player clicks "Nouvelle partie", then the game is recorded as a win with the current score before resetting.
- Given the player is mid-game (no win, no game-over), when the player clicks "Nouvelle partie", then no game record is created.

Priority: Must have

---

#### FR-007: Game Record Data Fields

Each game record contains exactly the following fields (confirmed by the Director):

| Field | Type | Description |
|-------|------|-------------|
| Score | Integer (>= 0) | The player's final score at game completion |
| Date | Timestamp (ISO 8601) | The date and time when the game was completed |
| Result | Enum: "win" / "loss" | "win" if the 2048 tile was reached at any point during the game (`hasWon === true`); "loss" otherwise |

- The profile association is implicit (the record belongs to the active profile).
- No additional fields (move count, game duration, highest tile reached) are included in this version.

Acceptance criteria:
- Given a completed game where the player reached 2048 with a final score of 15284, when the record is saved, then it contains: score = 15284, date = current ISO 8601 timestamp, result = "win".
- Given a completed game where the player never reached 2048 with a final score of 3412, when the record is saved, then it contains: score = 3412, date = current ISO 8601 timestamp, result = "loss".

Priority: Must have

---

### Game History

#### FR-008: View Personal Game History

A player must be able to view the complete history of their completed games.

- History is scoped to the active profile — a player sees only their own games.
- History is loaded from the backend (source of truth).
- Games are displayed in reverse chronological order (most recent first).
- **[PROPOSAL — requires Director input: See OQ-003]** History is accessible via a new "Historique" tab within the existing leaderboard modal (reusing the existing `.leaderboard-modal` pattern), alongside the "Top 10" tab for the personal leaderboard.

Acceptance criteria:
- Given a profile with 5 completed games, when the player opens the history view, then all 5 games are listed in reverse chronological order.
- Given a profile with no completed games, when the player opens the history view, then a message such as "Aucune partie enregistree" is displayed.
- Given a profile with completed games, when the player views history, then only games belonging to the active profile are shown (no other profile's games are visible).

Priority: Must have

---

#### FR-009: History Display Format

Each entry in the game history displays:

| Element | Format | Example |
|---------|--------|---------|
| Date | Localized date and time | "08/07/2026 14:32" |
| Score | Integer, formatted for readability | "15 284" or "15284" |
| Result | Visual indicator | "Victoire" / "Defaite" label, or equivalent icon/color coding |

Acceptance criteria:
- Given a game history entry with score 12000, date 2026-07-08T14:32:00Z, result "win", when displayed, then the entry shows the formatted date, the score, and a win indicator.
- Given a game history entry with result "loss", when displayed, then the entry shows a loss indicator that is visually distinct from the win indicator.
- Given a history with multiple entries, when displayed, then entries are visually separated (consistent with the existing `.leaderboard-row` pattern).

Priority: Must have

---

### Personal Leaderboard

#### FR-010: Personal Leaderboard Replacing Global Leaderboard

The existing global Top 10 leaderboard is entirely replaced by a personal leaderboard for the active profile (per Director decision).

- The personal leaderboard shows the player's top 10 scores, derived from their game history — not entered separately. This is a ranked view, not a separate data store.
- Entries are sorted by score descending.
- The leaderboard is accessible via the existing "Classement" button (`#leaderboard-btn`).
- The modal header is updated from "Classement Top 10" to indicate a personal leaderboard (e.g., "Mon Top 10" or "Top 10 de [nom du profil]").
- Each leaderboard entry displays: rank (#1 through #10), score, and date of the game.
- The "name" column from the current leaderboard rows (`.leaderboard-name`) is removed — it is always the active profile's name and therefore redundant.

Acceptance criteria:
- Given a profile with 15 completed games, when the player opens the leaderboard, then only the 10 highest-scoring games are shown, sorted by score descending, ranked #1 through #10.
- Given a profile with 3 completed games, when the player opens the leaderboard, then all 3 games are shown, ranked #1 through #3.
- Given a profile with no completed games, when the player opens the leaderboard, then a message "Aucun score enregistre" is displayed.
- Given two games have the same score, when displayed in the leaderboard, then the more recent game ranks higher (tiebreaker: most recent first).
- Given the leaderboard modal is open, when the player reads the header, then it indicates this is a personal leaderboard (not global).

Priority: Must have

---

#### FR-011: Best Score Display for Active Profile

The "Meilleur" score badge in the header (`#best-score`) must display the active profile's personal highest score, not a global best.

- Currently computed as `leaderboard[0].score` at `script.js` line 57. This must change to reflect the active profile's top score from the backend.
- If the active profile has no completed games, the best score is displayed as 0.
- The best score updates immediately after a game is completed with a new personal best, without requiring a page reload.

Acceptance criteria:
- Given a profile whose highest score is 8540, when the game screen is displayed, then "Meilleur" shows "8540".
- Given a new profile with no game history, when the game screen is displayed, then "Meilleur" shows "0".
- Given the player completes a game with a score of 10000 (higher than their current best of 8540), when the game ends, then "Meilleur" updates to "10000" without requiring a page reload.
- Given the player completes a game with a score of 5000 (lower than their current best of 8540), when the game ends, then "Meilleur" remains "8540".

Priority: Must have

---

### UI Changes

#### FR-012: Removal of Per-Game Name Entry

The current name-entry form and its associated flow are removed entirely:

- The `#name-entry-form`, `#name-entry-input`, and `#name-entry-submit` elements in the overlay are removed.
- The `showNameEntry()` function, `onNameEntrySubmit()` handler, and `saveScore()` function (which writes to `localStorage`) are removed.
- The `qualifiesForLeaderboard()` check that gates name entry is no longer used for this purpose (all completed games are recorded, regardless of score ranking).
- On game-over, the overlay shows "Partie terminee" with only the "Nouvelle partie" button (and a confirmation that the score was saved, e.g., a brief "Score sauvegarde !" message).

Acceptance criteria:
- Given a game ends in game-over with a high score, when the overlay appears, then no name-entry form is shown.
- Given a game ends in game-over with a low score, when the overlay appears, then no name-entry form is shown (all games are recorded equally).
- Given a game ends in game-over, when the overlay appears, then the score is automatically saved to the active profile without player intervention.

Priority: Must have

---

#### FR-013: Profile Selector View

A dedicated profile selector view is introduced, shown when:
- The page loads and no previous profile is stored locally (FR-002), OR
- The player chooses to switch profiles (FR-003).

The profile selector must include:
- A list of profiles previously used on this device (profile IDs stored in `localStorage`, display names fetched from the backend).
- A "Nouveau profil" action that opens a name input form (reusing the 12-character constraint from FR-001).
- Visual consistency with the existing game aesthetic (same color scheme from `style.css`: `--bg`, `--board-bg`, `--text-dark`, `--text-light`; same font family; same border-radius patterns).

The profile selector replaces the game view (the game grid is not visible while selecting). It occupies the same `.wrapper` container.

Acceptance criteria:
- Given 3 profiles have been used on this device, when the profile selector is shown, then all 3 profiles appear as selectable items with their display names.
- Given a stored profile ID no longer exists on the backend, when the profile selector loads, then that profile is excluded from the list and its ID is cleaned from `localStorage`.
- Given the profile selector is shown, when the player clicks "Nouveau profil", then a name input form appears.
- Given the profile selector is shown, when the player selects an existing profile, then that profile becomes active and the game screen appears.

Priority: Must have

---

## Non-Functional Requirements

#### NFR-001: Backend as Source of Truth

All profile, game history, and leaderboard data is persisted on and served from the backend. The frontend does not maintain a parallel data copy in `localStorage`. The only value stored locally is the last-used profile ID (for auto-selection per FR-002) and the list of known profile IDs (for the profile selector per FR-013).

Measurable threshold: After a page reload, all profile data displayed (history, leaderboard, best score) matches the backend state exactly.

---

#### NFR-002: Graceful Handling of Backend Unavailability

If the backend is unreachable when a game completes, the frontend must not silently discard the game record.

Measurable threshold: The player is informed that the score could not be saved (e.g., an error message in the overlay). The exact retry/queue strategy is an implementation decision for the engineering team.

---

#### NFR-003: Profile Selection Latency

Loading the profile selector and listing known profiles must not introduce perceptible delay.

Measurable threshold: The profile list loads and is interactive within 1 second on a standard broadband connection.

---

#### NFR-004: History Retention (Proposal)

**[PROPOSAL — See OQ-004]** All completed games are retained in history indefinitely (no cap). If performance degrades at extreme volumes, pagination or lazy loading may be added in a later iteration.

---

## Out of Scope

The following are explicitly NOT part of this specification:

1. **Full authentication system** — No passwords, email verification, OAuth, or account recovery. The project scope does not indicate that full user accounts are desired.
2. **Cross-device profile sync** — While profiles exist on the backend, this spec does not define a flow for discovering/claiming a profile created on another device.
3. **Social features** — No friend lists, score sharing, global ranking across profiles, or competitive features.
4. **Admin/moderation tools** — No admin panel for managing or moderating profiles.
5. **Profile editing or deletion** — This spec covers creation and selection only. Renaming or deleting a profile (with cascading deletion of history) may be specified separately.
6. **Mobile/touch support for new UI elements** — Consistent with the project's "desktop first" stance (see `CLAUDE.md`: "support mobile/tactile en option ulterieure").
7. **Backend technology choice** — The specific backend stack is determined by a separate Architecture Decision Record, not this specification.
8. **Data migration from existing localStorage leaderboard** — The current `{ name, score }[]` data in `localStorage` is not migrated to the new per-profile system. See OQ-005.
9. **Offline play with sync** — The specification assumes the backend is reachable during gameplay. Full offline support with deferred sync is not covered.
10. **Additional game statistics** — Move count, game duration, highest tile reached, etc., are not recorded beyond the three confirmed fields (score, date, result).

---

## Open Questions

Items requiring Director (Valy) decision before engineering can proceed:

- [ ] **OQ-001: Auto-selection vs. explicit selection on page load** — Should the frontend auto-select the last-used profile and go straight to the game, or always show the profile selector on every page load? *Proposed default: auto-select last-used profile for convenience; the player can switch via the header.* — Why it matters: Affects the page-load experience and whether shared-device users must manually select every time.

- [ ] **OQ-002: Profile name uniqueness and protection** — (a) Must display names be globally unique, or can two profiles share the same name (backend uses unique IDs internally)? (b) Should profiles have lightweight protection (e.g., a 4-digit PIN) to prevent one player from playing under another's profile on a shared device? *Proposed default: non-unique names, no PIN. The profile selector only shows profiles previously used on this device, which limits exposure.* — Why it matters: Unique names require conflict-handling UX ("this name is taken"). PINs add complexity but protect shared-device scenarios. Without protection, anyone on the device can select any locally-known profile.

- [ ] **OQ-003: History and leaderboard UI layout** — Should game history and the personal leaderboard be (a) two tabs within the existing "Classement" modal, (b) two separate buttons/modals, or (c) a combined view (leaderboard first, with a "Voir tout l'historique" link)? *Proposed default: option (a) — tabbed modal reusing the existing `.leaderboard-modal` pattern, with tabs "Top 10" and "Historique".* — Why it matters: Determines the amount of new UI to design and the player's navigation flow.

- [ ] **OQ-004: History retention limit** — Should game history be kept indefinitely (all games ever), or capped at a maximum (e.g., last 100 games)? *Proposed default: unbounded, with pagination if the list grows long.* — Why it matters: Affects backend storage requirements and frontend rendering performance for active players.

- [ ] **OQ-005: Existing leaderboard data fate** — The current global leaderboard in `localStorage` contains `{ name, score }` entries with no profile association. Should this data be (a) discarded when the new system launches, (b) displayed as a read-only legacy view, or (c) offered for import into a chosen profile? *Proposed default: (a) discard — clean break.* — Why it matters: Migration adds complexity for data with no profile association, but some players may value their existing scores.

- [ ] **OQ-006: Confirmation on profile switch during active win** — When a player has reached 2048 and is continuing to play for a higher score, then switches profiles: should the game be silently recorded as a win with the current score, or should a confirmation dialog warn the player? *Proposed default: record silently, no dialog.* — Why it matters: Accidental profile switch could cause a player to lose an ongoing high-score attempt they intended to continue.
