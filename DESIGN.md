# EnVault Design Specification

## 1. Design Direction & Core Principles

EnVault uses a restrained, high-density, utility-focused design language. It replaces decorative AI interface trends (pulsing badges, glowing borders, gradient surfaces, nested cards) with a quiet, predictable ledger aesthetic.

### Core Principles
1. **Structure from Space and Hairlines:** Visual separation is achieved through whitespace hierarchy and 1px borders, not colored cards or heavy drop shadows.
2. **Single Accent Rule:** Accent color is reserved exclusively for the primary interactive action and current active selection.
3. **Semantic Status Only:** Status colors (`danger`, `success`, `warn`) carry strict operational meaning (errors, verified snapshots, duplicate secret alerts) and are never used as decorative accents.
4. **Purposeful Motion:** No continuous looping animations (no `animate-ping` or `animate-pulse`), no bounce easing (`active:scale-*`). Motion is limited to state transitions between 120ms and 160ms with full respect for `prefers-reduced-motion`.
5. **Keyboard Completeness:** Every view, list, and dialog is accessible via standard platform shortcuts (`Cmd+K`, `Cmd+N`, arrow navigation, `Escape`).

---

## 2. Color Palette & Token System

All colors are exposed as semantic CSS variables that adapt automatically between Dark and Light modes.

### Surface and Foreground Tokens

| Token | Dark Value | Light Value | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| `--canvas` | `#0B0B0C` | `#FAFAFA` | Application background behind views |
| `--surface` | `#111113` | `#FFFFFF` | Sidebar, main content panels, tables |
| `--raised` | `#17171A` | `#F4F4F5` | Hover rows, popovers, input fields |
| `--line-subtle` | `#232327` | `#E4E4E7` | Table row dividers, inner borders |
| `--line` | `#2E2E33` | `#D4D4D8` | Panel borders, structural containers |
| `--line-strong`| `#3F3F46` | `#A1A1AA` | Active input borders, control outlines |
| `--fg` | `#ECECEE` | `#18181B` | Primary headings, table keys, main text |
| `--fg-muted` | `#A1A1AA` | `#52525B` | Secondary text, descriptions, table values |
| `--fg-subtle` | `#8B8B94` | `#6B6B74` | Metadata, line numbers, shortcuts (min 12px) |

### Accent and Status Tokens

| Token | Dark Value | Light Value | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| `--accent` | `#6E9BFF` | `#2F5FD0` | Primary action buttons, selection indicators |
| `--accent-hover`| `#5A8AF5` | `#2550B5` | Primary action button hover state |
| `--on-accent` | `#0B0B0C` | `#FFFFFF` | Text rendered on top of accent fills |
| `--danger` | `#F2686D` | `#CE2C31` | Destructive actions, missing file states |
| `--success` | `#4CC38A` | `#18794E` | Snapshot confirmations, verified integrity |
| `--warn` | `#F5A524` | `#AD5700` | Secret reuse notifications, diff alerts |

### Accessibility & Contrast Compliance (WCAG AA)
- Dark mode: `--fg-subtle` (`#8B8B94`) on `--raised` (`#17171A`) = **5.3:1** (Passes AA).
- Light mode: `--fg-subtle` (`#6B6B74`) on `--raised` (`#F4F4F5`) = **4.8:1** (Passes AA).
- Accent on dark canvas = **7.3:1**, on light canvas = **5.5:1** (Both pass AA).
- Controls and focus boundaries maintain at least 3.0:1 contrast against adjacent surfaces (WCAG 1.4.11).

---

## 3. Typography

Fonts are bundled locally for offline execution.

- **Interface Font:** IBM Plex Sans (`sans-serif`), weights 400, 500, 600.
- **Code & Secret Font:** IBM Plex Mono (`monospace`), weights 400, 500.

### Scale & Hierarchy

| Role | Font Family | Size / Line-Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | IBM Plex Sans | 20px / 28px | 600 | -0.01em | Empty states, modal titles (once per screen) |
| **Section** | IBM Plex Sans | 14px / 20px | 600 | -0.005em | Sidebar headings, table headers |
| **UI Base** | IBM Plex Sans | 13px / 20px | 400, 500 | 0 | Default text, button labels, list items |
| **Meta** | IBM Plex Sans | 12px / 16px | 400 | 0 | Timestamps, file paths, tooltips (**Hard Floor**) |
| **Code** | IBM Plex Mono | 13px / 20px | 400 | 0 | Secret keys, masked values, diffs |
| **Code Meta**| IBM Plex Mono | 12px / 16px | 400 | 0 | Line numbers, hashes, commit digests |

*Rule:* Zero font sizes below 12px. No `text-[10px]` or `text-[11px]` classes.

---

## 4. Spacing & Layout Architecture

- **Base Grid:** 4px incremental scale (4, 8, 12, 16, 24, 32, 48px).
- **Three-Pane Shell:**
  - Sidebar: fixed width (240px to 280px), `--surface` background, 1px `--line` right border.
  - Header: fixed height (52px), `--surface` background, 1px `--line` bottom border.
  - Main Panel: scrollable viewport, `--canvas` background.
- **Table Density:**
  - Table rows: 36px default height.
  - Sidebar item rows: 32px height.
  - Target hit areas: 32px minimum height for buttons; 36px for primary buttons.

---

## 5. Border Radii & Elevation

- **Radius Tokens:**
  - `rounded-chip`: 4px (badges, kbd shortcuts).
  - `rounded-control`: 6px (inputs, buttons, select triggers).
  - `rounded-panel`: 8px (content boxes, code viewer container).
  - `rounded-dialog`: 12px (modal dialogs, command palette).
- **Elevation:**
  - In-flow components: 0 elevation (hairlines only).
  - Floating overlays: 1px border (`--line`) in dark mode; subtle uncolored shadow (`0 8px 24px rgba(0,0,0,0.08)`) with 1px border in light mode.
  - No colored, glowing, or neon shadows under any condition.

---

## 6. Prohibited Anti-Patterns (Anti-AI Slop Checklist)

1. No glassmorphism (`backdrop-blur-*` on content surfaces).
2. No glowing accent borders or neon shadows (`shadow-[color]`).
3. No gradient fills on buttons, cards, or logo badges.
4. No pulsing or pinging status dots (`animate-ping`, `animate-pulse`).
5. No bounce animations on click (`active:scale-95`, etc.).
6. No icon tiles floating above headers in modals or empty states.
7. No card-inside-a-card nesting.
8. No text below 12px.
9. No emojis in UI copy, buttons, badges, logs, or commit messages.
