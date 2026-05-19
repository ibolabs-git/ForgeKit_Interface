# Handoff — ForgeKit Interface App

## Datum handoff-a
2026-05-19

## Verzija
v1.0.6 (live na GitHub Releases)

## Status projekta
**Aktivan razvoj — UI stabilizacija faza**

Sve tri originalne faze (F1, F2, F3) su implementirane i funkcionalne. Projekat je prešao u fazu iterativnog poboljšanja UI-ja i proširenja funkcionalnosti na bazi korisničkog feedbacka.

---

## Šta je implementirano

### Jezgro aplikacije
- Electron 33 + React 18 + TypeScript 5.6 + electron-vite 2
- Provider abstraction layer: Anthropic (Claude) i OpenAI (GPT), proširiv
- NVIDIA NIM podrška (OpenAI-kompatibilni endpoint)
- Streaming odgovori token-po-token kroz IPC kanal
- Zustand 5 store za kompletan state management
- electron-store za enkriptovano čuvanje API ključeva
- Auto-updater (electron-updater + GitHub Releases)

### UI Komponente
| Komponenta | Opis | Fajl |
|---|---|---|
| `Header` | Naslov, tab bar, model selector, handoff dugme | `Header.tsx` |
| `TabBar` | Multi-tab sesije (Novi projekat dugme) | `TabBar.tsx` |
| `LeftPanel` | Agent role grid (6 tile-ova) + faze + projekat | `LeftPanel.tsx` |
| `ChatWindow` | Lista poruka, search, export, streaming | `ChatWindow.tsx` |
| `MessageBubble` | Markdown render, role tag, task detekcija | `MessageBubble.tsx` |
| `InputBar` | Textarea, Ctrl+Enter send, streaming stop | `InputBar.tsx` |
| `SidePanel` | Session metrika, re-prime, model switcher, taskovi, memory, verzija | `SidePanel.tsx` |
| `SettingsModal` | API ključevi (accordioni), GitHub token, model defaults, tema | `SettingsModal.tsx` |
| `ProjectSetupModal` | Naziv projekta + folder | `ProjectSetupModal.tsx` |
| `SessionSummaryModal` | AI-generisan rezime sesije | `SessionSummaryModal.tsx` |
| `HandoffModal` | Handoff workflow modal | `HandoffModal.tsx` |

### ForgeKit Logika
- System prompt živi isključivo u main procesu (`src/main/system-prompt.ts`) — SEC-05
- Parser detektuje `[ROLE]` tagove iz AI odgovora i ažurira `activeRole`
- Parser detektuje `- [ ] task` i `- [x] task` i ažurira task listu
- Parser detektuje `F1`/`F2`/`F3` i ažurira `currentPhase`
- Re-Prime mehanizam: pri promeni modela šalje komprimovani kontekst umesto pune istorije
- Context status (`synced` / `needs_refresh`) vidljiv u SidePanel-u

### Agent Invoke Mehanika (v1.0.6)
- LeftPanel prikazuje 6 agent tile-ova u 2×3 gridu (stilizovano kao metric tiles)
- Aktivna uloga: animirana zvezda (★) + obojen border-left
- Klik na tile šalje `[INVOKE:ULOGA]` poruku AI-u
- AI preuzima ulogu i odgovara u njenom kontekstu
- Grid je disabled tokom streaminga
- `useSendMessage` hook deli logiku slanja između InputBar i LeftPanel

### Tema sistema
- Dve teme: Light (default) i Dark
- Light: `#f0f0e4` pozadina, `#679e88` akcenat, `#fffbf2` paneli
- Dark: `#3e535c` paneli, `#4f6870` chat oblast, `#334d57` header, `#b7c0c4` akcenat
- Per-uloga boje na agent tile-ovima (svetla: zasićeni tamni tonovi; tamna: pastelni svetli tonovi)
- CSS custom properties (`--bg-primary`, `--accent`, itd.) sa `[data-theme="dark"]` override

### Bezbednost
- SEC-05: system prompt se ne prosleđuje kroz IPC, main ga dodaje sam
- API ključevi enkriptovani u electron-store
- contextIsolation + nodeIntegration: false
- preload.ts eksponuje samo dozvoljene funkcije kroz contextBridge

---

## Arhitektura — tok podataka

```
Korisnik (InputBar ili LeftPanel tile klik)
  → useSendMessage hook
    → addUserMessage() [Zustand store]
    → startAssistantMessage() [Zustand store]
    → window.api.sendMessage() [IPC → preload]
      → main/ipc-handlers.ts
        → system-prompt.ts (dodaje se automatski)
        → providers/[anthropic|openai|nvidia].ts
          → AI SDK streaming
          → stream-token event → renderer
            → appendStreamToken() [Zustand store]
        → stream-complete event → renderer
          → finalizeMessage() → extractRole() + extractTasks() + extractPhase()
```

---

## Folder struktura (stvarna)

```
ForgeKit_Interface_App/
├── app/                          ← Electron aplikacija
│   ├── src/
│   │   ├── main/
│   │   │   ├── index.ts          ← Electron main entry
│   │   │   ├── ipc-handlers.ts   ← IPC kanali, AI pozivi
│   │   │   ├── system-prompt.ts  ← ForgeKit system prompt (SEC-05)
│   │   │   └── providers/
│   │   │       ├── anthropic.ts
│   │   │       ├── openai.ts
│   │   │       ├── nvidia.ts
│   │   │       ├── interface.ts
│   │   │       └── factory.ts
│   │   ├── preload/
│   │   │   └── index.ts          ← contextBridge API
│   │   └── renderer/src/
│   │       ├── App.tsx + App.css ← Root, teme, layout grid
│   │       ├── hooks/
│   │       │   └── useSendMessage.ts  ← Zajednički send hook
│   │       ├── store/
│   │       │   └── forgekit.store.ts  ← Zustand store (ceo state)
│   │       ├── types/
│   │       │   └── index.ts      ← ForgeKitRole, ForgeKitPhase, Message...
│   │       ├── utils/
│   │       │   └── forgekit-context.ts  ← Re-Prime builder
│   │       └── components/
│   │           ├── Header.tsx / .css
│   │           ├── TabBar.tsx / .css
│   │           ├── LeftPanel.tsx / .css
│   │           ├── ChatWindow.tsx / .css
│   │           ├── MessageBubble.tsx / .css
│   │           ├── InputBar.tsx / .css
│   │           ├── SidePanel.tsx / .css
│   │           ├── SettingsModal.tsx / .css
│   │           ├── ProjectSetupModal.tsx / .css
│   │           ├── SessionSummaryModal.tsx / .css
│   │           └── HandoffModal.tsx
│   ├── package.json              ← v1.0.6, build config, GitHub release config
│   ├── electron.vite.config.ts
│   └── dist/                    ← Generiše se pri `npm run package`
├── intake.md
├── product_spec.md
├── decisions.md
├── technical_notes.md
├── task_list.md
├── validation_plan.md
├── handoff.md                   ← ovaj fajl
└── CHANGELOG.md
```

---

## Build i deploy proces

```bash
# Development
cd app
npm run dev

# Produkcioni build
npm run build

# NSIS installer (.exe)
npm run package
# → dist/ForgeKit Interface Setup X.X.X.exe

# GitHub Release (nakon package)
git add .
git commit -m "vX.X.X — opis"
git tag vX.X.X
git push origin main --tags
gh release create vX.X.X "dist/ForgeKit Interface Setup X.X.X.exe" \
  "dist/ForgeKit Interface Setup X.X.X.exe.blockmap" \
  --title "..." --notes "..."
```

Auto-updater: `electron-updater` proverava GitHub Releases (owner: `ibolabs-git`, repo: `ForgeKit_Interface`). Korisnik vidi `↑ Proveri update` u donjem desnom uglu SidePanel-a.

---

## Poznati problemi i napomene

### Fontovi — dijakritici
Share Tech Mono i Share Tech ne sadrže Latin Extended-A glyphs (š, đ, č, ć, ž). Rešeno u v1.0.3/v1.0.4 dodavanjem `'Inter'` kao fallback u `--font-mono` i `--font-tech` CSS varijable. Inter se učitava sa Google Fonts.

**Napomena:** Ako Google Fonts nije dostupan (offline rad), fallback pada na `'Courier New'` / system sans-serif. Dijakritici ostaju ispravni jer je Inter u stack-u pre monospace fontova.

### Re-Prime context
Kada se promeni model ili context status je `needs_refresh`, `buildRePrimeMessages()` šalje komprimovanu istoriju umesto pune. Ovo može izazvati gubitak konteksta na dugim sesijama. Dugoročno rešenje: implementirati token counting i selektivno slanje poruka.

### Session persist
State se čuva u Zustand store samo za vreme trajanja app sesije. Restart app-a resetuje chat istoriju. Planirana funkcionalnost: export sesije + reload.

### INVOKE mehanika
`[INVOKE:ULOGA]` poruka se vidi u chat listi kao korisnikova poruka (normalni bubble). Vizualno može biti zbunjujuće. Razmotriti: skrivanje invoke poruka ili poseban bubble stil.

### Streaming stop
`◼` dugme (InputBar) vizualno postoji ali ne prekida API poziv — samo čeka da stream završi. Implementirati `AbortController` za pravo prekidanje.

---

## Što je sledeće (predlozi)

| Prioritet | Stavka |
|---|---|
| Visok | Sakriti/stilizovati INVOKE poruke u chat-u |
| Visok | AbortController za pravo zaustavljanje streaminga |
| Srednji | Session persist (export/import JSON) |
| Srednji | OBSERVER tile — drugačiji vizualni tretman (pasivna uloga) |
| Nizak | Ollama provider (lokalni modeli) |
| Nizak | Token counter u SidePanel-u |
| Nizak | Keyboard shortcut za invoke ulogu (npr. Ctrl+1..6) |

---

## Zavisnosti (production)

```json
"@anthropic-ai/sdk": "^0.32.0"
"electron-store": "^8.2.0"
"electron-updater": "^6.8.3"
"openai": "^4.77.0"
"react-markdown": "^10.1.0"
"react-syntax-highlighter": "^16.1.1"
"remark-gfm": "^4.0.1"
"zustand": "^5.0.0"
```

---

## Kontakt / repo

- GitHub: `https://github.com/ibolabs-git/ForgeKit_Interface`
- Releases: `https://github.com/ibolabs-git/ForgeKit_Interface/releases`
