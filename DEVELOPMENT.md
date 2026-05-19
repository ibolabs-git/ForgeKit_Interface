# ForgeKit Interface — Development Plan

Dokument prati stanje razvoja, prioritete i tehnički dug.
Ažurira se uz svaki veći milestone.

---

## Trenutno stanje — v0.9.2 (stable)

### Stack
- **Electron 33** + **electron-vite 2** + **React 18** + **TypeScript 5.6**
- **Zustand 5** — state management (per-tab snapshots)
- **CSS custom properties** — dizajn tokeni, tema se mijenja samo kroz `[data-theme]` na `<html>`
- **electron-store** — perzistencija API ključeva i tabova
- **electron-updater** — auto-update s GitHub Releases

### Arhitektura layouta (3-kolona grid)
```
┌─────────────────────────────────────────────────────┐
│  HEADER (50px) — logo | tabovi | handoff | settings │
├──────────┬──────────────────────────┬───────────────┤
│ LeftPanel│      ChatWindow          │   SidePanel   │
│  200px   │       (1fr)              │    280px      │
│          ├──────────────────────────┤               │
│ • uloga  │      InputBar            │ • sesija      │
│ • faza   │                          │ • model       │
│ • proj.  │                          │ • taskovi     │
│          │                          │ • memory      │
└──────────┴──────────────────────────┴───────────────┘
```

### Teme
- **Svjetla** (default): `#F5F2EB` bg, `#ff6b00` akcenat
- **Tamna**: `#181818` bg, isti orange akcenat, sivi FK logo
- Switch: Settings → Izgled; pamti se u `localStorage['fk-theme']`

---

## FAZA E — Security & Optimization Audit (v0.9.x → v1.0.0)

*Pokrenuto: v0.9.2 — 2026-05-19*
*Backup prije audita: `v0.9.2-pre-audit-stable`*

Kompletan audit je detektovao 3 kategorije problema. Rad je organizovan u 4 prolaza.
Svaki prolaz dobija backup tag i changelog entry.

### Audit metodologija
- Pregled svih fajlova: `main/`, `preload/`, `renderer/src/` (store, komponente, utils)
- 3 kategorije: Bezbjednost / Kompatibilnost / Optimizacija
- Prioriteti: KRITIČNO → VAŽNO → NICE-TO-HAVE

---

### PROLAZ 1 — Bezbjednost: IPC validacija + CSP (v0.9.3)
*Cilj: eliminisati path traversal i zatvoriti IPC rupe bez promjene UI-a ili arhitekture.*

| ID | Problem | Fajl | Status |
|----|---------|------|--------|
| SEC-01 | Path traversal u `project:write-file` — filename nije validiran | `ipc-handlers.ts` | ✅ v0.9.3 |
| SEC-02 | Arbitrary path read — `projectPath` dolazi od renderer-a bez provjere | `ipc-handlers.ts` | ✅ v0.9.3 |
| SEC-03 | `sandbox: false` bez razloga — proširuje attack surface | `main/index.ts` | ✅ v0.9.3 |
| SEC-06 | Nema limit veličine za `github:upload-memory` payload | `ipc-handlers.ts` | ✅ v0.9.3 |
| SEC-07 | CSP `connect-src` nije definisan — renderer može direktno zvati API | `index.html` | ✅ v0.9.3 |

**Razlog grupiranja:** Sve su promjene u main procesu i HTML fajlu — nulta šansa da pokvare UI ili Zustand stanje. Sigurno u jednom prolazu.

---

### PROLAZ 2 — Kompatibilnost + sitni bugovi (v0.9.4)
*Cilj: type-safety, ispravni default modeli, stabilni React effect-i.*

| ID | Problem | Fajl | Status |
|----|---------|------|--------|
| COMP-01 | `mdComponents: any` — react-markdown bez tipova | `MessageBubble.tsx` | ⏳ |
| COMP-03 | `useEffect` missing deps u `SettingsModal` — stale closure | `SettingsModal.tsx` | ⏳ |
| COMP-06 | `catch (err as Error)` bez `instanceof` — može pući na non-Error | više fajlova | ⏳ |
| COMP-09 | Default OpenAI model `gpt-5.4` ne postoji | `forgekit.store.ts` | ⏳ |
| OPT-09 | Nepotreban temp file write/read u `github.ts` | `github.ts` | ⏳ |

---

### PROLAZ 3 — Performance: re-renderi + bundle size (v0.9.5)
*Cilj: smanjiti bundle ~60%, eliminisati nepotrebne re-rendere tokom streaminga.*

| ID | Problem | Fajl | Status |
|----|---------|------|--------|
| OPT-01 | `react-syntax-highlighter` full import (+2MB bundle) | `MessageBubble.tsx` | ⏳ |
| OPT-03 | `SidePanel` pretplaćen na cijeli `messages` array | `SidePanel.tsx` | ⏳ |
| OPT-05 | `matchIds.includes()` O(n) u render loopu | `ChatWindow.tsx` | ⏳ |
| OPT-06 | Memory leak — stream listeneri se ne čiste pri unmount | `InputBar.tsx` | ⏳ |
| OPT-07 | `reprimePreviewText` useMemo računa se i kad je preview zatvoren | `SidePanel.tsx` | ⏳ |
| OPT-08 | `LeftPanel` pretplaćen na `messages` array samo za `.length` | `LeftPanel.tsx` | ⏳ |

---

### PROLAZ 4 — Kritična sigurnost: encryption + systemPrompt (v1.0.0)
*Cilj: hardkodovani encryption key → safeStorage; systemPrompt isključiti iz IPC toka.*
*Napomena: Ovo su arhitekturalne promjene — poseban prolaz, oprezno testiranje.*

| ID | Problem | Fajl | Status |
|----|---------|------|--------|
| SEC-04 | Hardkodovani `encryptionKey` u electron-store | `store.ts` | ⏳ |
| SEC-05 | `systemPrompt` putuje kroz IPC od renderer-a | `InputBar.tsx` + providers | ⏳ |
| OPT-02 | `appendStreamToken` O(n) na svaki token — streaming performance | `forgekit.store.ts` | ⏳ |

---

## Kompletirane faze

### FAZA A — Chat UX ✅ (v0.6.x)
- A1: Markdown rendering (`react-markdown` + `remark-gfm`)
- A2: Syntax highlighting (`react-syntax-highlighter` / Prism)
- A3: Copy dugme na code blokovima
- A4: Keyboard shortcuts (`Ctrl+Enter`, `Ctrl+Tab`, `Ctrl+,`)

### FAZA B — Pretraga i export ✅ (v0.7.x)
- B1: Search u chatu (`Ctrl+F`, highlight, navigate)
- B2: Export razgovora (.md / .txt)
- B3: Jump to message (klik na task → scroll + flash)

### FAZA C — ForgeKit Context ✅ (v0.8.x)
- C1: Re-Prime preview (collapsible u SidePanel)
- C2: Handoff modal (preview, toggle opcije, info)
- C3: Session summary (lokalni AI streaming, kopiraj/dodaj u chat)

### FAZA D — Polish i stability ✅ (v0.9.0)
- D4: Error boundary (React crash recovery)
- D5: Custom window controls (frame: false)
- D6: Onboarding (auto-otvori Settings ako nema API ključa)

### Bugfixevi
- v0.9.1: Task ekstrakcija — proximity-based keyword detekcija (zamjena globalnog regex-a)
- v0.9.2: Light theme bg boja → `#F5F2EB` kremasta paleta

---

## Pravila razvoja

### Koliko promjena u jednom prolazu?
- **Isti sloj (samo CSS)**: neograničeno — može se sve odjednom
- **Jedan feature (jedna komponenta + CSS)**: 1–2 featurea bezbedno
- **Strukturalna promjena (novi komponent, novi store state)**: max 1 po prolazu — testirati prije nastavka
- **Više feature-a različitih slojeva**: uvijek buildati između, nikad deployati bez build verifikacije

### Git workflow
```
feature commit → npx electron-vite build (verifikacija) → electron-builder → git tag vX.Y.Z-stable → gh release
```

### Backup pravilo
- Svaki stabilni milestone dobija `-stable` tag: `git tag vX.Y.Z-stable && git push origin vX.Y.Z-stable`
- Backup PRIJE svakog prolaza: `git tag vX.Y.Z-pre-<naziv>-stable`
- Rollback: `git checkout vX.Y.Z-stable` + rebuild

### Verzionisanje
- `PATCH` (0.9.x) — bugfix, CSS, mali UX detalj, security hardening
- `MINOR` (0.x.0) — novi feature, nova komponenta, nova sekcija u UI
- `MAJOR` (x.0.0) — arhitekturalna promjena, novi backend, breaking change

---

*Posljednje ažuriranje: v0.9.2 — 2026-05-19 (audit plan dodan)*
