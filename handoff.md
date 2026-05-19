# Handoff — ForgeKit Interface App

## Datum handoff-a
2026-05-19

## Verzija
v1.0.11 (live na GitHub Releases)

## Status projekta
**Aktivan razvoj — GitHub integracija i agent pristup dokumentima**

Sve tri originalne faze (F1, F2, F3) su implementirane. Projekat je usao u fazu proširenja:
agenti sada mogu citati instrukcije i template-e direktno sa GitHub-a (Master_ForgeKit_Tool),
a sistem sam prepoznaje i injektuje zatrazene dokumente u razgovor.

---

## Šta je implementirano

### Jezgro aplikacije
- Electron 33 + React 18 + TypeScript 5.6 + electron-vite 2
- Provider abstraction layer: Anthropic (Claude), OpenAI (GPT), NVIDIA NIM
- Streaming odgovori token-po-token kroz IPC kanal
- Zustand 5 store za kompletan state management
- electron-store + safeStorage (DPAPI) za enkriptovano cuvanje API kljuceva
- Auto-updater (electron-updater + GitHub Releases)

### UI Komponente

| Komponenta | Opis | Fajl |
|---|---|---|
| `Header` | Naslov, tab bar, model selector, handoff dugme | `Header.tsx` |
| `TabBar` | Multi-tab sesije | `TabBar.tsx` |
| `LeftPanel` | Agent role grid (6 tile-ova, 2×3) + faze + projekat info | `LeftPanel.tsx` |
| `ChatWindow` | Lista poruka, search, export, streaming | `ChatWindow.tsx` |
| `MessageBubble` | Markdown render, role tag, task detekcija, template inject chip | `MessageBubble.tsx` |
| `InputBar` | Textarea, Ctrl+Enter send, streaming stop | `InputBar.tsx` |
| `SidePanel` | Session metrika, re-prime, model switcher, taskovi, memory, prompt source indikator, verzija | `SidePanel.tsx` |
| `SettingsModal` | API kljucevi, GitHub konfiguracija, model defaults, tema | `SettingsModal.tsx` |
| `ProjectSetupModal` | Naziv projekta + folder | `ProjectSetupModal.tsx` |
| `SessionSummaryModal` | AI-generisan rezime sesije | `SessionSummaryModal.tsx` |
| `HandoffModal` | Handoff workflow modal | `HandoffModal.tsx` |

### ForgeKit Logika
- System prompt zivi iskljucivo u main procesu (`src/main/system-prompt.ts`) — SEC-05
- **GitHub fetch system prompta**: pri prvoj poruci fetchuje `forgekit_mode_prompt.md` iz `masterToolRepo`; keshira za celu sesiju
- **Prompt source indikator**: SidePanel pokazuje `■ PROMPT: GITHUB` / `■ PROMPT: BUNDLED`
- Parser detektuje `[ROLE]` tagove iz AI odgovora i azurira `activeRole`
- Parser detektuje `- [ ] task` / `- [x] task` i azurira task listu
- Parser detektuje `F1`/`F2`/`F3` i azurira `currentPhase`
- Re-Prime mehanizam: pri promeni modela salje komprimovani kontekst umesto pune istorije

### Agent Role Grid (v1.0.6+)
- LeftPanel prikazuje 6 agent tile-ova u 2×3 gridu (stilizovano kao metric tiles)
- Aktivna uloga: animirana zvezda `★` + obojen `border-left` u boji uloge
- Klik na tile salje `[INVOKE:ULOGA]` poruku AI-u koji preuzima tu ulogu
- Grid je disabled tokom streaminga

### GitHub Integracija (v1.0.8–v1.0.11)
- **masterToolRepo**: zasebno polje u Settings za `ibolabs-git/ForgeKit_tool`
- Sve GitHub operacije koriste `getMasterToolConfig()` koji daje prioritet `masterToolRepo`
- **Memorija**: upisuje se u `Master_ForgeKit_Tool/05_GLOBAL_MEMORY/learning_data/` u ForgeKit_tool repo
- `github:fetch-template` IPC handler za citanje bilo kog fajla iz Master Tool repo-a

### READ_TEMPLATE mehanizam (v1.0.11)
AI moze da zatrazi fajl tagom `[READ_TEMPLATE: putanja]` u odgovoru.
App detektuje tag, fetchuje fajl sa GitHub-a i auto-injektuje sadrzaj nazad u razgovor.
UI prikazuje kompaktni chip (klikabilan za expand) umesto normalnog bubble-a.

```
[READ_TEMPLATE: 00_SYSTEM/rules.md]
  → useSendMessage detektuje tag (contentRef buffer)
  → window.api.githubFetchTemplate()
  → Master_ForgeKit_Tool/00_SYSTEM/rules.md sa GitHub-a
  → auto-send kao [TEMPLATE_INJECT] poruka
  → AI dobija sadrzaj i nastavlja rad
```

### Tema sistema
- Dve teme: Light i Dark
- Light: `#f0f0e4` pozadina, `#679e88` akcenat, `#fffbf2` paneli
- Dark: `#3e535c` paneli, `#4f6870` chat oblast, `#334d57` header, `#b7c0c4` akcenat
- Per-uloga boje na agent tile-ovima (svetla: zasiceni tamni tonovi; tamna: pastelni svetli tonovi)

### Bezbednost
- SEC-05: system prompt se ne prosledjuje kroz IPC, main ga dodaje sam
- API kljucevi enkriptovani kroz safeStorage (DPAPI/Keychain)
- contextIsolation + nodeIntegration: false
- preload.ts eksponuje samo dozvoljene funkcije kroz contextBridge
- SEC-07: putanje pri fetch-template sanitizovane (uklonjen `../`)

---

## GitHub konfiguracija (Settings)

| Polje | Vrednost |
|---|---|
| GitHub Token | `ghp_...` (isti token za oba repo-a) |
| Master Tool Repozitorijum | `ibolabs-git/ForgeKit_tool` |

Master_ForgeKit_Tool dokumentacija: `https://github.com/ibolabs-git/ForgeKit_tool/tree/main/Master_ForgeKit_Tool`

---

## Arhitektura — tok podataka

```
Korisnik (InputBar ili LeftPanel tile klik)
  → useSendMessage hook
    → contentRef akumulira streaming tokene (za READ_TEMPLATE)
    → addUserMessage() + startAssistantMessage() [Zustand store]
    → window.api.sendMessage() [IPC → preload]
      → main/ipc-handlers.ts
        → getMasterToolConfig() → fetchSystemPromptFromGitHub() [jednom]
        → providers/[anthropic|openai|nvidia].ts → AI SDK streaming
          → stream-token events → renderer → appendStreamToken()
        → stream-complete → renderer
          → finalizeMessage() → extractRole() + extractTasks() + extractPhase()
          → READ_TEMPLATE detekcija u contentRef
            → githubFetchTemplate() per tag
            → sendRef.current(injectText) — auto-inject
```

---

## Folder struktura (app/)

```
src/
├── main/
│   ├── index.ts            ← Electron main entry
│   ├── ipc-handlers.ts     ← IPC kanali (AI, Settings, GitHub, Projekat, Tabovi)
│   ├── system-prompt.ts    ← Bundlovani fallback ForgeKit prompt
│   ├── store.ts            ← electron-store: settings, safeStorage kljucevi
│   ├── github.ts           ← GitHub API (fetch, upload, template)
│   ├── project-manager.ts  ← File I/O za projektne fajlove
│   ├── updater.ts          ← electron-updater
│   └── providers/          ← anthropic.ts, openai.ts, nvidia.ts, interface.ts, factory.ts
├── preload/
│   └── index.ts            ← contextBridge (window.api)
└── renderer/src/
    ├── App.tsx + App.css   ← Root, teme, layout
    ├── hooks/useSendMessage.ts  ← Send logika + READ_TEMPLATE mehanizam
    ├── store/forgekit.store.ts  ← Zustand (messages, roles, phases, tasks, tabs)
    ├── types/index.ts      ← TypeScript tipovi + ElectronAPI interfejs
    ├── utils/forgekit-context.ts ← Re-Prime builder
    └── components/         ← sve UI komponente (.tsx + .css parovi)
```

---

## Build i deploy

```bash
# Development
cd app && npm run dev

# Produkcioni build (kompajlira, ne pakuje)
npm run build

# NSIS installer
npm run package
# → dist/ForgeKit Interface Setup X.X.X.exe
# → dist/latest.yml  (za auto-updater)

# GitHub Release
cp "dist/ForgeKit Interface Setup X.X.X.exe" "dist/ForgeKit-Interface-Setup-X.X.X.exe"
cp "dist/ForgeKit Interface Setup X.X.X.exe.blockmap" "dist/ForgeKit-Interface-Setup-X.X.X.exe.blockmap"
git add -A && git commit -m "vX.X.X — opis" && git push origin main
gh release create vX.X.X \
  "dist/ForgeKit-Interface-Setup-X.X.X.exe" \
  "dist/ForgeKit-Interface-Setup-X.X.X.exe.blockmap" \
  "dist/latest.yml" \
  --repo ibolabs-git/ForgeKit_Interface \
  --title "vX.X.X — naziv"
```

**Vazno**: GitHub konvertuje razmake u tacke pri uploadu. Fajl mora biti preimenovan sa crticama (npr. `ForgeKit-Interface-Setup-1.0.11.exe`) da bi se poklapao sa `latest.yml` koji koristi crtice.

Auto-updater proverava GitHub Releases (owner: `ibolabs-git`, repo: `ForgeKit_Interface`). Korisnik vidi `↑ Proveri update` u SidePanel-u.

---

## Poznati problemi i napomene

### INVOKE poruke u chat-u
`[INVOKE:ULOGA]` se vidi kao normalni korisnikovi bubble. Razmotriti: poseban stil ili skrivanje.

### Streaming stop
`◼` dugme vizualno postoji ali ne prekida API poziv. Treba implementirati `AbortController`.

### READ_TEMPLATE — AI mora znati za mehanizam
Mehanizam radi samo ako AI zna da moze koristiti `[READ_TEMPLATE: ...]` tag. Ovo mora biti u system promptu ili AI mora biti upoznat kroz razgovor.

### Re-Prime context kompresija
Na dugim sesijama kompresija moze izgubiti detaljan kontekst. Dugorocno: token counting.

### Template inject — filter iz istorije
`[TEMPLATE_INJECT]` poruke se salje AI-u kao user message — mogu povecati token potrosnju na dugim sesijama. Razmotriti: filtriranje ili kompresija sadrzaja u Re-Prime-u.

---

## Sledeći predlozi

| Prioritet | Stavka |
|---|---|
| Visok | System prompt dopuniti uputstvom za READ_TEMPLATE koristenje |
| Visok | AbortController za pravo zaustavljanje streaminga |
| Srednji | Filtrirati/komprimovati TEMPLATE_INJECT poruke u Re-Prime |
| Srednji | Sakriti/stilizovati INVOKE poruke u chat-u |
| Srednji | Session persist (export/import JSON) |
| Nizak | Ollama provider (lokalni modeli) |
| Nizak | Token counter u SidePanel-u |
| Nizak | Keyboard shortcut za invoke ulogu (Ctrl+1..6) |

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

## Repozitorijumi

| Repo | URL | Namena |
|---|---|---|
| App | `https://github.com/ibolabs-git/ForgeKit_Interface` | Kod, Releases, auto-updater |
| Master Tool | `https://github.com/ibolabs-git/ForgeKit_tool` | ForgeKit instrukcije, template-i, memorija |
