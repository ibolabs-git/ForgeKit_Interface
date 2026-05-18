# ForgeKit Interface — Development Plan

Dokument prati stanje razvoja, prioritete i tehnički dug.  
Ažurira se uz svaki veći milestone.

---

## Trenutno stanje — v0.5.4 (stable)

### Stack
- **Electron 33** + **electron-vite 2** + **React 18** + **TypeScript 5.6**
- **Zustand 5** — state management (per-tab snapshots)
- **CSS custom properties** — dizajn tokeni, tema se mijenja samo kroz `[data-theme]` na `<html>`
- **electron-store** — perzistencija API ključeva (DPAPI enkriptovano) i tabova
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
- **Svjetla** (default): `#e8e8e8` bg, `#ff6b00` akcenat
- **Tamna**: `#181818` bg, isti orange akcenat, sivi FK logo
- Switch: Settings → Izgled; pamti se u `localStorage['fk-theme']`

---

## Roadmap — sljedeće faze

### FAZA A — Chat UX (v0.6.x)
*Cilj: AI odgovori se prikazuju kao pravi formatiran tekst, ne sirovi markdown.*

| # | Feature | Opis | Složenost |
|---|---------|------|-----------|
| A1 | **Markdown rendering** | `react-markdown` + `remark-gfm` — bold, italic, liste, code blokovi, tabele | M |
| A2 | **Syntax highlighting** | `react-syntax-highlighter` ili `shiki` za code blokove u AI odgovorima | M |
| A3 | **Copy dugme na code blokovima** | Hover → pojavi se `COPY ›` u uglu code bloka | S |
| A4 | **Keyboard shortcuts** | `Ctrl+Enter` = pošalji, `Ctrl+Tab` = sljedeći tab, `Ctrl+,` = Settings | S |

**Može sve u jednom prolazu (A1+A2+A3 zajedno, A4 posebno).**

---

### FAZA B — Pretraga i export (v0.7.x)
*Cilj: navigacija kroz duge sesije i izvoz sadržaja.*

| # | Feature | Opis | Složenost |
|---|---------|------|-----------|
| B1 | **Search u chatu** | `Ctrl+F` otvara search bar, highlight + navigate kroz rezultate | M |
| B2 | **Export razgovora** | Izvoz aktivnog chata u `.md` ili `.txt` u projektni folder | S |
| B3 | **Jump to message** | Klik na task → scroll do poruke gdje je task detektovan | M |

**B1 i B2 mogu u jednom prolazu. B3 zahtijeva poseban prolaz.**

---

### FAZA C — ForgeKit Context (v0.8.x)
*Cilj: precizniji Re-Prime, bolji handoff workflow.*

| # | Feature | Opis | Složenost |
|---|---------|------|-----------|
| C1 | **Re-Prime preview** | Pokaži šta se šalje modelu pri context refreshu (expandable preview) | M |
| C2 | **Handoff poboljšanje** | Handoff modal s preview-om dokumenta prije kreiranja; opcija da se uključi/isključi sekcija | M |
| C3 | **Session summary** | AI-generisani kratak sažetak sesije na zahtjev (posebna akcija u header-u) | L |

**C1 i C2 mogu u jednom prolazu.**

---

### FAZA D — Polish i stability (tekući)
*Sitni detalji i tehički dug — mogu se dodavati uz svaki prolaz.*

| # | Item | Status |
|---|------|--------|
| D1 | Markdown u chatu | ⏳ FAZA A |
| D2 | Scrollbar u LeftPanel kad je content duži | ✅ već radi |
| D3 | Tab title update kad se promijeni naziv projekta | ✅ već radi |
| D4 | Error boundary za crash recovery | ⏳ buduće |
| D5 | Electron window controls (min/max/close) styling | ⏳ buduće |
| D6 | Onboarding flow za prvi start (bez API ključa) | ⏳ buduće |

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
- Rollback: `git checkout vX.Y.Z-stable` + rebuild

### Verzionisanje
- `PATCH` (0.5.x) — bugfix, CSS, mali UX detalj
- `MINOR` (0.x.0) — novi feature, nova komponenta, nova sekcija u UI
- `MAJOR` (x.0.0) — arhitekturalna promjena, novi backend, breaking change

---

## Zavisnosti koje ćemo dodati

| Paket | Svrha | Faza |
|-------|-------|------|
| `react-markdown` | Markdown rendering | A1 |
| `remark-gfm` | GitHub Flavored Markdown (tabele, task liste) | A1 |
| `react-syntax-highlighter` | Syntax highlighting u code blokovima | A2 |

---

*Posljednje ažuriranje: v0.5.4 — 2026-05-18*
