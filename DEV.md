# ForgeKit Interface — Developer Documentation

## Stack

| Sloj | Tehnologija |
|------|------------|
| Desktop runtime | Electron 33 |
| Build tool | electron-vite 2 |
| UI framework | React 18 + TypeScript |
| State management | Zustand 5 |
| AI providers | @anthropic-ai/sdk, openai |
| Settings storage | electron-store (enkriptovano) |
| Installer | electron-builder + NSIS |
| Auto-update | electron-updater → GitHub Releases |

---

## Struktura projekta

```
app/
├── src/
│   ├── main/                     # Electron main process (Node.js)
│   │   ├── index.ts              # App entry, auto-updater
│   │   ├── ipc-handlers.ts       # Svi IPC handleri
│   │   ├── store.ts              # electron-store (settings, API kljucevi)
│   │   ├── github.ts             # GitHub API (upload memory, fetch prompt)
│   │   ├── project-manager.ts    # Folder kreiranje, citanje/pisanje fajlova
│   │   └── providers/
│   │       ├── interface.ts      # AIProvider interface
│   │       ├── anthropic.ts      # Anthropic streaming
│   │       ├── openai.ts         # OpenAI streaming
│   │       └── factory.ts        # createProvider()
│   ├── preload/
│   │   └── index.ts              # contextBridge — izlaze window.api
│   └── renderer/src/             # React app
│       ├── App.tsx               # Root, startup logika, auto-save
│       ├── store/
│       │   └── forgekit.store.ts # Zustand store — svo stanje
│       ├── types/
│       │   └── index.ts          # TypeScript tipovi
│       ├── prompts/
│       │   └── system-prompt.ts  # ForgeKit system prompt
│       └── components/
│           ├── Header.tsx/css         # Naslovna traka, provider/model izbor
│           ├── ChatWindow.tsx/css     # Lista poruka
│           ├── MessageBubble.tsx/css  # Jedna poruka sa role tagom
│           ├── InputBar.tsx/css       # Input polje za slanje
│           ├── SidePanel.tsx/css      # Desni panel (uloga, faze, taskovi, memory, projekat)
│           ├── SettingsModal.tsx/css  # Modal za API kljuceve i GitHub
│           └── ProjectSetupModal.tsx/css  # Modal za projektni folder
├── resources/
│   └── icon.ico                  # App ikona
├── CHANGELOG.md                  # Verzije i izmjene
├── DEV.md                        # Ova datoteka
└── package.json                  # Verzija, scripts, electron-builder config
```

---

## IPC kanali

### AI streaming
| Kanal | Smjer | Opis |
|-------|-------|------|
| `send-message` | renderer → main | Pokrece AI stream |
| `stream-token` | main → renderer | Jedan token iz streama |
| `stream-complete` | main → renderer | Stream zavrsen |
| `stream-error` | main → renderer | Greska u streamu |

### Settings
| Kanal | Opis |
|-------|------|
| `get-settings` | Vraca trenutna podesavanja |
| `save-settings` | Snima podesavanja |
| `get-providers` | Lista AI provajdera |
| `get-models` | Lista modela za provajdera |

### GitHub
| Kanal | Opis |
|-------|------|
| `github:test` | Testira konekciju |
| `github:upload-memory` | Uploaduje memory zapis u `learning_data/` |
| `github:fetch-system-prompt` | Ucitava system prompt iz repoa |

### Projekat
| Kanal | Opis |
|-------|------|
| `project:choose-folder` | Dialog za izbor foldera |
| `project:create-folder` | Dialog za kreiranje novog foldera |
| `project:get-path` | Vraca trenutnu putanju |
| `project:write-file` | Pise fajl u projektni folder |
| `project:read-file` | Cita fajl iz projektnog foldera |

---

## Zustand Store — kljucna stanja

```typescript
// Sesija
sessionId, projectName, projectPath

// Poruke
messages: ChatMessage[]
isStreaming, streamingMessageId

// ForgeKit
activeRole: ForgeKitRole
currentPhase: ForgeKitPhase
tasks: Task[]

// Provider
selectedProvider, selectedModel

// Memory
memoryRecords: MemoryRecord[]

// UI
showSettings, showProjectSetup
```

---

## ForgeKit logika u app-u

### Detekcija uloge
```
Regex: /^\[([A-Z][A-Z\s]+)\]/
```
Cita se iz pocetka AI poruke. Azurira `activeRole` u store-u.

### Detekcija taskova
```
Regex: /^- \[( |x)\] (.+)$/gm
```
Sve linije u formatu `- [ ] tekst` postaju Task objekti.

### Detekcija Memory Curator zapisa
```
Regex: /\[MEMORY CURATOR\]([\s\S]+?)(?=\[ORCHESTRATOR|THINKER|...\]|$)/
```
Ako poruka sadrzi `[MEMORY CURATOR]` sekciju — automatski se kreira i uploaduje na GitHub.

### Detekcija faze
```
Regex: /\b(F1|F2|F3)\b/
```

---

## Perzistencija sesije

Svaki projekat ima `session.json` u svom folderu:
```json
{
  "projectName": "...",
  "tasks": [...],
  "messages": [...],
  "currentPhase": "F1",
  "savedAt": 1715515200000
}
```
Auto-save se okida 1 sekundu nakon zadnje izmjene poruka ili taskova (debounce).

---

## Proces izdavanja nove verzije

1. Napravi izmjene u kodu
2. Azuriraj `CHANGELOG.md`
3. Povecaj verziju u `package.json`
4. `npm run package`
5. Kreiraj GitHub Release na `ibolabs-git/ForgeKit_Interface` sa tagom `vX.Y.Z`
6. Uploaduj: `Setup X.Y.Z.exe`, `Setup X.Y.Z.exe.blockmap`, `latest.yml`
7. `git add . && git commit -m "Release vX.Y.Z" && git push`

Instalirane verzije ce automatski detektovati update pri sledecm pokretanju.

---

## GitHub repozitorijumi

| Repo | Sadrzaj | Vidljivost |
|------|---------|------------|
| `ibolabs-git/ForgeKit_Interface` | App kod + Releases (installer) | Public |
| `ibolabs-git/ForgeKit_tool` | Master_ForgeKit_Tool + learning_data | Private |

---

## Sigurnost

- API kljucevi (Anthropic, OpenAI, GitHub token) cuvaju se enkriptovano u `electron-store`
- Enkripcijski kljuc: `forgekit-secure-storage-2026` (u `store.ts`)
- `contextBridge` izoluje renderer od main procesa
- `nodeIntegration: false`, `contextIsolation: true`
