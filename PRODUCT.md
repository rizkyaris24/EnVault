# EnVault Product Specification

## 1. Product Overview

EnVault is a local-first, passive, encrypted, and versioned backup management system for `.env` files. It monitors developer workspaces, records cryptographically protected snapshots of environment configurations, detects cross-project secret duplication using salted HMACs, and enables safe point-in-time restoration.

## 2. Product Mode

**Mode:** Operate (based on the Impeccable mode taxonomy).
EnVault is an operational desktop utility where speed, density, keyboard efficiency, and reliable feedback dominate. It is not an experience-mode or persuasion-mode application; there are no marketing claims, no onboarding carousels, and no decorative chrome.

## 3. Target User Personas

- **Software Engineers & DevOps Practitioners:** Developers managing multiple microservices, repositories, and environment files (`.env`, `.env.local`, `.env.production`) across local storage.
- **Security-Conscious Developers:** Users requiring zero plaintext disk leakage, client-side encryption via AES-256-GCM, and privacy-preserving detection of leaked credentials across distinct projects.

## 4. Primary User Tasks

1. **Passive Verification:** Confirm that local `.env` files across active projects are tracked, backed up, and up-to-date.
2. **Secret Inspection & Retrieval:** Inspect key-value pairs, toggle masking, and copy credentials to the clipboard quickly without opening code editors.
3. **Point-in-Time File Restoration:** Revert accidental edits, deletions, or corruptions by comparing historical snapshots and restoring previous versions to disk.
4. **Secret Reuse Audit:** Identify when sensitive credentials (API tokens, database credentials) are shared across projects without exposing raw secret values across repositories.
5. **Project Discovery & Onboarding:** Discover existing repositories with `.env` files via computer scans and register them for continuous passive monitoring.

## 5. Architectural Constraints & Non-Negotiables

- **Local-First & Offline:** Zero external network telemetry, zero third-party font calls at runtime, and complete functionality without an internet connection.
- **Zero Plaintext Leakage:** Raw secret values are encrypted at rest using AES-256-GCM with hardware-backed master keys. Secret matching uses Salted HMAC-SHA256 with project-independent salts.
- **Operating System Fidelity:** Conforms to macOS window controls, system theme changes, native file reveal conventions, and standard platform keybindings (`Cmd+K`, `Cmd+N`, `Escape`).
- **No Emojis:** Professional side project tone. Visual clarity relies on typography, whitespace, and restrained semantic icons.
