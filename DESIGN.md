# EnVault Design Specification

## 1. Direction: Calm Vault

Light-first, airy, and quiet. Structure comes from whitespace and type scale, not boxes or borders. One list, one detail, one primary action per screen; secondary actions appear on hover, selection, or in the command palette (Cmd+K). References: spacefs.com, cluely.com, wisprflow.ai, Mobbin.

### Principles
1. **Space over borders.** No bordered cards, chips, or nested panels. Hairlines only under the tab row.
2. **Ink primary.** Primary buttons are solid ink pills (`--fg` on `--canvas`). Accent is reserved for focus rings and the pending-selection state.
3. **Semantic status only.** `danger` (file missing), `warn` (shared secrets), `success` (current version) are used for text and small dots, never decoration. Status is a text label on the Projects home; a dot elsewhere with a tooltip.
4. **Hover reveals actions.** Row actions (eye, copy, diff, restore, delete) appear on hover, focus-within, or selection.
5. **Masked by default.** Secret values are masked until explicitly revealed; copy always copies the real value.
6. **Purposeful motion.** 120-160ms fades only. No loops, no bounce, `prefers-reduced-motion` respected.
7. **Keyboard complete.** Cmd+K palette, Cmd+N add, Shift+Cmd+S scan, Cmd+1/2/3 views, arrows/Enter/c in the secrets list, Esc returns to Projects.

## 2. Navigation and layout

No sidebar. A single 48px top bar (drag region; 80px left inset for macOS traffic lights): `EnVault` (home) / project switcher, then a Cmd+K search pill and a theme button (cycles system, light, dark). Content is one centered column, `max-w-[720px]`, `px-8`.

- **Projects home** (no project selected): flat list, 56px rows, name left, status label and "N files, relative time" right, delete on hover. Zero projects: one statement, one primary button, one text link.
- **Project view:** large title, path, Snapshot button; text tabs for files (mono) and views (Secrets / Raw / History), 2px ink underline on the active tab.
- **Project switcher:** popover with search, status dots, Add folder, Scan computer.

## 3. Tokens

Single source: `src/renderer/src/styles/globals.css`. `useTheme.tsx` only toggles `data-theme`. The native window background is set in `src/main/index.ts` and `src/main/ipc/handlers.ts` (`#FFFFFF` light, `#0B0B0C` dark).

| Token | Light | Dark |
| :-- | :-- | :-- |
| `--canvas` | `#FFFFFF` | `#0B0B0C` |
| `--surface` | `#FAFAFA` | `#121214` |
| `--raised` | `#F4F4F5` | `#1A1A1D` |
| `--line-subtle` | `#F0F0F2` | `#1C1C1F` |
| `--line` | `#E6E6E9` | `#26262A` |
| `--line-strong` | `#8E8E97` | `#6B6B75` |
| `--fg` | `#0B0B0C` | `#F2F2F3` |
| `--fg-muted` | `#5E5E66` | `#A4A4AC` |
| `--fg-subtle` | `#6F6F78` | `#8E8E97` |
| `--accent` | `#2F5FD0` | `#6E9BFF` |
| `--danger` | `#CE2C31` | `#F2686D` |
| `--success` | `#18794E` | `#4CC38A` |
| `--warn` | `#AD5700` | `#F5A524` |
| `--shadow-float` | `0 8px 32px rgba(0,0,0,.08)` | `0 8px 32px rgba(0,0,0,.5)` |

Contrast has not been formally measured for the new values; verify before release.

## 4. Typography

Geist Sans and Geist Mono (variable), bundled via `@fontsource-variable` (CSP `font-src 'self'`).

| Role | Size / line | Notes |
| :-- | :-- | :-- |
| `text-display` | 28 / 34, -0.02em | page title, once per screen |
| `text-title` | 15 / 22 | list names, dialog titles |
| `text-ui` | 14 / 22 | body, buttons, rows |
| `text-meta` | 12 / 16 | hard floor, metadata |

Mono (13-14px) is for keys, values, paths, and files only.

## 5. Shape and elevation

Radii: `chip` 4, `control` 8, `panel` 10, `dialog` 16, buttons and search pills `full`. Elevation only on floating layers (`shadow-float`: switcher, palette, dialog, toast). Row height 44px (secrets, history 56px), list rows 56px.

## 6. Prohibited

No glassmorphism, glow or colored shadows, gradients, pulsing or pinging, bounce scaling, text below 12px, emojis, bordered cards or chips for data, card-in-card nesting. Enforced by `npm run lint:design`.
