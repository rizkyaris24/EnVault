# EnVault UI/UX Revamp - Phase Task Tracking

This document outlines the granular engineering tasks across each phase of the UI/UX revamp, adhering strictly to anti-AI-slop principles, empirical Laws of UI/UX, and minimal professional aesthetic standards without emojis.

---

## Phase 0: Foundation & System Setup

- [x] **Task 0.1: Document System Architecture (`PRODUCT.md` & `DESIGN.md`)**
  - Create `PRODUCT.md` capturing target user profiles, primary tasks, constraints (local-first, offline, zero plaintext leakage), and product voice.
  - Create `DESIGN.md` defining the complete design token specification: surface colors, contrast ratios (WCAG AA compliant), typography hierarchy, spacing scales, border radii, and explicit do/don't anti-pattern guidance.

- [x] **Task 0.2: Configure Tailwind Design Tokens (`tailwind.config.js`)**
  - Replace the legacy ad-hoc `palette-*` structure with semantic CSS-variable-backed color tokens: `canvas`, `surface`, `raised`, `line` (`subtle`, `default`, `strong`), `fg` (`default`, `muted`, `subtle`), `accent` (`default`, `hover`, `fg`), `danger`, `success`, `warn`.
  - Configure typography scales with a 12px hard floor: `meta` (12px/16px), `ui` (13px/20px), `title` (14px/20px), `display` (20px/28px).
  - Configure radius scale: `chip` (4px), `control` (6px), `panel` (8px), `dialog` (12px).
  - Configure custom keyframes for subtle 140ms `fade-in` (addressing legacy undefined animation class).

- [x] **Task 0.3: Install Offline Fonts and Setup Core Styles (`globals.css`, `index.html`, `package.json`)**
  - Add `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` to `package.json`.
  - Import font definitions in `src/renderer/src/main.tsx`.
  - Define `:root` (dark) and `[data-theme="light"]` CSS variables in `src/renderer/src/styles/globals.css`.
  - Set up native-feeling scrollbars, accessible focus outlines (`outline: 2px solid var(--accent)`), and `prefers-reduced-motion` safety fallbacks.
  - Ensure Content Security Policy (CSP) in `index.html` allows bundled offline fonts (`font-src 'self'`).

- [x] **Task 0.4: Theme Management State & IPC (`useTheme.ts`, main IPC)**
  - Implement `useTheme` hook with options: `'system' | 'light' | 'dark'`.
  - Persist theme preference in `localStorage`.
  - Implement IPC bridge (`THEME_SET`) to synchronize Electron's native `nativeTheme.themeSource` and native window background color to avoid flashing during launch or resize.

- [x] **Task 0.5: Shared Atomic UI Primitives (`src/renderer/src/components/ui/`)**
  - Create `cn.ts` utility using `clsx` and `tailwind-merge`.
  - Create `Button` primitive supporting `primary`, `secondary`, `ghost`, and `danger` variants with loading states and 32px/36px hit targets.
  - Create `IconButton` primitive for compact toolbar actions with 32x32px hit boundaries.
  - Create `Input` primitive with clean focus rings, search icon support, and clear buttons.
  - Create `Badge` primitive for status signals (`default`, `accent`, `danger`, `success`, `warn`).
  - Create `Kbd` component for standard keyboard shortcut hints.
  - Create `SegmentedControl` component for view switching.
  - Create accessible `Dialog` container primitive with native focus trap, backdrop scrim (no heavy blur), and Escape handling.

---

## Phase 1: Shell & Navigation

- [x] **Task 1.1: Rebuild Sidebar (`Sidebar.tsx`)**
  - Eliminate glowing green borders, logo gradients, pinging dots, and oversized badges.
  - Render a clean typographic wordmark "EnVault" in 14px semibold.
  - Restyle project items into clean 32px rows with subtle active background highlight and accent icon (no decorative side stripe).
  - Provide concise metadata (12px path) and clean project action buttons (`Add Folder` `Cmd+N`, `Scan Computer` `Shift+Cmd+S`).
  - Add inline theme mode toggle (`System` / `Light` / `Dark`) in the sidebar footer.
  - Add search input with `Cmd+K` trigger and instant filter clearing.

- [x] **Task 1.2: Rebuild Project Header (`ProjectHeader.tsx`)**
  - Render breadcrumb navigation with project name and directory path with clean "Reveal in Finder" action.
  - Transform file tabs into a clean horizontal text tab strip with subtle bottom underline indicator for the active file.
  - Integrate `SegmentedControl` for switching between `Secrets`, `Raw`, and `History`.
  - Provide single primary `Snapshot` button using the clean accent color.
  - Remove redundant "Live Watcher" badge; keep status messaging quiet and non-distracting.

- [x] **Task 1.3: Redesign Empty & Zero States (`App.tsx`)**
  - Remove marketing slogans, gradient logo boxes, and identical card grids.
  - Create a clean, utilitarian welcome view: concise purpose statement, single primary `Add Project Folder` action, secondary `Scan Entire Computer` option, and plain security notes.
  - Provide a clean empty state for projects with 0 `.env` files.

---

## Phase 2: Content Views

- [x] **Task 2.1: Table-First Secrets Inspector (`SecretTable.tsx`)**
  - Re-architect as a true tabular grid with sticky header: Key, Value, Actions.
  - Anchor secret values and reveal/copy action buttons directly adjacent to each other (Law of Proximity).
  - Provide dual-copy functionality: clicking key copies key name; clicking copy copies secret value. Display clean inline feedback ("Copied") without intrusive animated popups.
  - Add keyboard navigation support: up/down arrow row selection, Enter to toggle reveal, 'c' to copy value.
  - Refactor Salted HMAC secret reuse indicator into a quiet warning badge with clean popover detailing other referencing projects.

- [x] **Task 2.2: Refactor Raw Code Viewer (`RawViewer.tsx`)**
  - Monospace code viewer using IBM Plex Mono.
  - Token syntax coloring powered by semantic tokens: keys in `fg`, equals in `fg-subtle`, values in `fg-muted`, comments in italicized `fg-subtle`.
  - Include line number gutter with clean alignment.
  - Header toolbar with line count, character count, Mask/Reveal toggle, and Copy All button.

- [x] **Task 2.3: Restyle Version Timeline (`VersionTimeline.tsx`)**
  - Replace heavy floating cards with a continuous, hairline-connected timeline rail.
  - Active version highlighted with a static solid accent node (no continuous pulsing).
  - Relative time with exact ISO timestamp tooltip.
  - Inline metadata: variable count, snapshot trigger source (Auto, Manual, Restore), and short content hash.
  - Clean secondary action buttons for `Diff` and `Rollback`.

- [x] **Task 2.4: Streamline Missing File Banner (`MissingFileBanner.tsx`)**
  - Replace gradient warning box with a crisp inline callout container.
  - Clear message indicating file absence and last recorded snapshot version.
  - Direct secondary/primary action button to restore file immediately.

---

## Phase 3: Overlays, Modals & Command Palette

- [x] **Task 3.1: Refactor Delete Project Modal (`DeleteProjectModal.tsx`)**
  - Rebuild using the shared `Dialog` primitive.
  - Maintain 50/50 button grid (`Cancel` / `Stop Tracking`) with Escape key dismissal.
  - Reassuring confirmation note stating disk files remain untouched.

- [x] **Task 3.2: Refactor Restore File Modal (`ConfirmRestoreModal.tsx`)**
  - Rebuild using `Dialog` primitive.
  - Display clear overwrite notice, target file path, and destination version.
  - Equal-weight action buttons with Escape dismissal.

- [x] **Task 3.3: Refactor Import Checklist Modal (`ImportChecklistModal.tsx`)**
  - Rebuild using `Dialog` primitive.
  - Segmented control filter: `Recommended`, `All`, `Clear`.
  - Render discovered files as clean checklist items showing path, size, and line count without nested cards.

- [x] **Task 3.4: Refactor Diff Modal (`DiffModal.tsx`)**
  - Rebuild using `Dialog` primitive.
  - Summary stats displayed as clean inline counts: `+N added`, `-N removed`, `~N modified`, `N unchanged`.
  - Clean diff row comparison with `Hide unchanged` toggle and value masking toggle.

- [x] **Task 3.5: Refactor Computer Scan Modal (`ComputerScanModal.tsx`)**
  - Rebuild using `Dialog` primitive.
  - Active scan state: clean progress bar and live counters without cartoonish radar animations.
  - Completion state: concise metric summary table and clean list of registered projects.

- [x] **Task 3.6: Toast Notification System (`Toast.tsx`)**
  - Restyle toast messages into compact, non-blurry notification cards.
  - 4-second auto-dismiss with hover pause support and manual dismiss button.

- [x] **Task 3.7: Global Command Palette (`CommandPalette.tsx`)**
  - Implement quick command palette triggered via `Cmd+K` / `Ctrl+K`.
  - Support fuzzy searching projects, running scans, adding folders, taking snapshots, switching views, and toggling themes.
  - Full keyboard accessibility: Arrow keys, Enter, and Escape.

---

## Phase 4: Audit, Cleanup & Guardrails

- [x] **Task 4.1: Eliminate Legacy Tokens and Dead Code**
  - Remove all remaining `palette-*` class names and replace with semantic tokens.
  - Remove unused imports, dead CSS utilities, and broken classes (e.g. `py-0.2`).

- [x] **Task 4.2: Automated Anti-Slop Design Linter (`scripts/lint-design.mjs`)**
  - Create a standalone Node.js verification script checking for banned patterns:
    - Glowing effects (`shadow-palette-*`, `shadow-2xl`, etc.)
    - Continuous animations (`animate-ping`, `animate-pulse`)
    - Gradients on UI elements (`bg-gradient-*`, `from-*`, `to-*`)
    - Scale bounce animations (`active:scale-*`)
    - Sub-12px text sizes (`text-[10px]`, `text-[11px]`)
    - Emojis in source code and user-facing copy
  - Add `npm run lint:design` script to `package.json`.

- [x] **Task 4.3: Automated Contrast & Accessibility Verification**
  - Verify all text/surface pairings exceed WCAG AA 4.5:1 contrast in both light and dark themes.
  - Verify all active UI control boundaries exceed 3:1 contrast.

- [x] **Task 4.4: Full Test Suite & Build Verification**
  - Verify `npm run typecheck` passes with zero errors.
  - Verify `npm test` runs 23/23 tests with 100% pass rate.
  - Verify `npm run build` succeeds cleanly.
  - Update `README.md` and `walkthrough.md`.
