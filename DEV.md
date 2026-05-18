# ForgeKit Interface — Developer Documentation

> Zadnje ažuriranje: v0.3.0 — 2026-05-18

---

## Stack

| Sloj | Tehnologija | Verzija |
|---|---|---|
| Desktop runtime | Electron | 33 |
| Build tool | electron-vite | 2 |
| UI framework | React + TypeScript | 18 / 5.6 |
| State management | Zustand | 5 |
| AI providers | @anthropic-ai/sdk, openai | 0.32 / 4.77 |
| Settings storage | electron-store (enkriptovano) | 8.2 |
| Installer | electron-builder + NSIS | 25 |
| Auto-update | electron-updater → GitHub Releases | 6.8 |

---

## Struktura projekta

```
app/
├── src/
│   ├── main/                          # Electron main process (Node.js)
│   │   ├── index.ts                   # App entry, pokretanje updater-a
│   │   ├── ipc-handlers.ts            # Svi IPC handleri (AI, settings, GitHub, project, app)
│   │   ├── updater.ts                 # Auto-update logika (electron-updater + GitHub API fallback)
│   │   ├── store.ts                   # electron-store (API kljucevi, settings)
│   │   ├── github.ts                  # GitHub API (upload memory, fetch system prompt)
│   │   ├── project-manager.ts         # Folder kreiranje, citanje/pisanje fajlova
│   │   └── providers/
│   │       ├── interface.ts           # AIProvider interface + Message, ModelInfo tipovi
│   │       ├── anthropic.ts           # Anthropic Claude streaming
│   │       ├── openai.ts              # OpenAI GPT streaming
│   │       └── factory.ts             # createProvider(), AVAILABLE_PROVIDERS lista
│   ├── preload/
│   │   └── index.ts                   # contextBridge — izlaze window.api u renderer
│   └── renderer/src/                  # React app
│       ├── App.tsx                    # Root komponenta, startup logika, auto-save debounce
│       ├── App.css                    # Globalne CSS varijable i layout
│       ├── store/
│       │   └── forgekit.store.ts      # Zustand store — svo stanje (multi-tab arhitektura)
│       ├── types/
│       │   └── index.ts               # TypeScript tipovi (ChatMessage, Task, ElectronAPI...)
│       ├── prompts/
│       │   └── system-prompt.ts       # ForgeKit system prompt tekst
│       └── components/
│           ├── Header.tsx/css         # Naslovna traka (logo, naziv projekta, nova sesija, settings)
│           ├── TabBar.tsx/css         # Tab bar — do 4 projekta istovremeno
│           ├── ChatWindow.tsx/css     # Lista poruka
│           ├── MessageBubble.tsx/css  # Jedna poruka sa role tagom i bojom
│           ├── InputBar.tsx/css       # Input polje za slanje poruka
│           ├── SidePanel.tsx/css      # Desni panel (uloga, faze, taskovi, memory, projekat, verzija)
│           ├── SettingsModal.tsx/css  # Modal — tabovi: Globalno (API, GitHub) + Projekat (model)
│           └── ProjectSetupModal.tsx/css  # Modal za kreiranje/odabir projektnog foldera
├── resources/
│   └── icon.ico                       # App ikona
├── CHANGELOG.md                       # Sve verzije i izmjene
├── DEV.md                             # Ova datoteka
└── package.json                       # Verzija, scripts, electron-builder config
```

---

## Komponente — pregled odgovornosti

### Header.tsx
- Logo + naziv projekta (klikabilno za inline editovanje)
- Dugme **Nova sesija** — generise `handoff_<datum>.md` u projektnom folderu prije brisanja sesije
- Dugme **Settings** (⚙)
- **Nema** provider/model dropdowna — to je iskljucivo u Settings → Projekat

### TabBar.tsx
- Prikazuje sve otvorene tabove (do 4)
- Aktivni tab: naglaseno + plava donja linija
- Pulsiruca tockica na tabu koji ceka AI odgovor (streaming)
- `+` dugme za novi projekat — odmah otvara ProjectSetupModal
- `✕` zatvara tab (nije moguce zatvoriti jedini tab)

### SidePanel.tsx
- **AKTIVNA ULOGA** — ForgeKit role sa bojom i ikonom
- **FAZA** — F1/F2/F3 track, klikabilno
- **TASKOVI** — lista sa checkbox-ovima, rucni unos, brisanje
- **MEMORY CURATOR** — lista zapisa sa statusom (uploading/uploaded/error)
- **PROJEKAT** — putanja foldera, dugme za promjenu
- **SESIJA** — Provider, Model, broj poruka
- **Verzija** — `vX.Y.Z` badge + dugme za provjeru/instalaciju update-a

### SettingsModal.tsx
- Tab **Globalno**: Anthropic API key, OpenAI API key, GitHub Token + Repo, test konekcije
- Tab **Projekat**: naziv projekta, folder, provider, model (per-projekat, cuva se u session.json)

---

## Multi-tab arhitektura (v0.3.0)

### Konceptualni model

```
Store (flat stanje aktivnog taba)
├── tabs[]          — lagani headeri za TabBar (id, projectName, projectPath, isStreaming)
├── activeTabId     — koji tab je aktivan
├── tabSnapshots{}  — puno stanje neaktivnih tabova (u memoriji)
└── [flat state]    — messages, tasks, phase, provider... (uvijek aktivni tab)
```

### Prelaz između tabova (`switchToTab`)
1. Snimi trenutno flat stanje u `tabSnapshots[activeTabId]`
2. Ucitaj `tabSnapshots[targetId]` u flat stanje
3. Postavi `activeTabId = targetId`

### Dodavanje taba (`addTab`)
1. Snimi trenutni tab u snapshot
2. Dodaj novi `TabHeader` u `tabs[]`
3. Postavi fresh default stanje (nova sesija, nema projekta)
4. Otvori `ProjectSetupModal`

### Zatvaranje taba (`removeTab`)
- Ako je aktivan: prelaz na prethodni tab, ucitaj njegov snapshot
- Ocisti snapshot zatvorenog taba iz memorije

### Sinhronizacija tab headera
Svaki put kada se promijeni `projectName` ili `projectPath`, automatski se azurira
odgovarajuci unos u `tabs[]` (inline u setterima).

---

## IPC kanali

### AI streaming
| Kanal | Smjer | Opis |
|---|---|---|
| `send-message` | renderer → main | Pokrece AI stream sa payload-om (messages, provider, model, systemPrompt, messageId) |
| `stream-token` | main → renderer | Jedan token iz streama |
| `stream-complete` | main → renderer | Stream zavrsen, messageId |
| `stream-error` | main → renderer | Greska u streamu, messageId |

### Settings
| Kanal | Opis |
|---|---|
| `get-settings` | Vraca objekt sa svim podesavanjima (hasAnthropicKey, githubRepo...) |
| `save-settings` | Snima podesavanja u electron-store |
| `get-providers` | Lista AI provajdera iz factory.ts |
| `get-models` | Lista modela za zadati provajder |

### GitHub
| Kanal | Opis |
|---|---|
| `github:test` | Testira token + repo konekciju |
| `github:upload-memory` | Uploaduje memory zapis u `learning_data/{project}/` na GitHub |
| `github:fetch-system-prompt` | Ucitava `forgekit_system_prompt.md` iz repoa |

### Projekat
| Kanal | Opis |
|---|---|
| `project:choose-folder` | Otvara OS dialog za odabir postojeceg foldera |
| `project:create-folder` | Otvara OS dialog za kreiranje novog foldera + kreira `project_security_manifest.md` |
| `project:get-path` | Vraca zadnju aktivnu putanju iz electron-store |
| `project:write-file` | Pise fajl u aktivni projektni folder |
| `project:read-file` | Cita fajl iz aktivnog projektnog foldera |

### App info i update
| Kanal | Opis |
|---|---|
| `app:get-version` | Vraca trenutnu verziju app-a (`app.getVersion()`) |
| `app:check-update` | GitHub API provjera — vraca `{hasUpdate, currentVersion, latestVersion, message}` |
| `app:trigger-update` | Pokrece dijalog za preuzimanje i instalaciju update-a |
| `update-download-progress` | main → renderer — progres preuzimanja (0-100%) |

---

## Zustand Store — kljucna stanja

```typescript
// Tab menadzmant
tabs: TabHeader[]          // lagani headeri za prikaz u tab baru
activeTabId: string        // ID aktivnog taba
tabSnapshots: Record<string, TabSnapshot>  // puno stanje neaktivnih tabova

// Sesija (aktivni tab)
sessionId, projectName, projectPath

// Poruke (aktivni tab)
messages: ChatMessage[]
isStreaming, streamingMessageId

// ForgeKit (aktivni tab)
activeRole: ForgeKitRole   // ORCHESTRATOR | THINKER | BUILDER | REVIEWER | MEMORY CURATOR | OBSERVER
currentPhase: ForgeKitPhase  // F1 | F2 | F3
tasks: Task[]

// Provider (aktivni tab, cuva se u session.json)
selectedProvider: string
selectedModel: string

// Memory (aktivni tab)
memoryRecords: MemoryRecord[]

// UI (globalno)
showSettings, settingsTab, showProjectSetup
```

---

## ForgeKit logika u app-u

### Detekcija uloge
```
Regex: /^\[([A-Z][A-Z\s]+)\]/
```
Cita se iz pocetka AI poruke. Azurira `activeRole` u store-u i boju/ikonu u SidePanel-u.

### Detekcija taskova
```
Regex: /^- \[( |x)\] (.+)$/gm
```
Sve linije u formatu `- [ ] tekst` ili `- [x] tekst` postaju Task objekti i dodaju se u listu.

### Detekcija Memory Curator zapisa
```
Regex: /\[MEMORY CURATOR\]([\s\S]+?)(?=\[ORCHESTRATOR|THINKER|BUILDER|REVIEWER|OBSERVER\]|$)/
```
Ako poruka sadrzi `[MEMORY CURATOR]` sekciju — automatski se kreira MemoryRecord i
uploaduje na GitHub u folder `learning_data/{projectName}/memory_{timestamp}.md`.

### Detekcija faze
```
Regex: /\b(F1|F2|F3)\b/
```
Prva pomena u AI odgovoru azurira aktivnu fazu.

---

## Perzistencija sesije

Svaki projekat ima `session.json` u svom folderu:
```json
{
  "projectName": "Moj projekat",
  "tasks": [...],
  "messages": [...],
  "currentPhase": "F1",
  "selectedProvider": "anthropic",
  "selectedModel": "claude-sonnet-4-6",
  "savedAt": 1747555200000
}
```
Auto-save se okida 1.2 sekunde nakon zadnje izmjene poruka ili taskova (debounce).
Pri pokretanju app-a ucitava se session.json prvog (aktivnog) taba.

### Handoff dokument
Pri kliku "Nova sesija" — ako postoji aktivni folder — automatski se kreira:
```
handoff_2026-05-18_14-30.md
```
Sadrzi: datum, fazu, model, tabelu taskova, listu zadataka, izvod posljednjih 6 poruka.

---

## Auto-update mehanizam

### Tok izvrsavanja
```
App start (5s delay)
  └─ runStartupUpdateCheck()
       ├─ electron-updater.checkForUpdates()   [zahtijeva latest.yml u GitHub Release]
       │    ├─ update-available  → dialog "Preuzmi / Kasnije"
       │    ├─ update-downloaded → dialog "Restartuj i instaliraj / Kasnije"
       │    └─ error             → pada na fallback ↓
       └─ checkAndNotifyFallback()              [GitHub API, uvijek radi]
            └─ checkForLatestRelease()
                 ├─ semver poredi latestVersion > currentVersion
                 ├─ downloadUrl postoji → preuzima .exe, pokrece /S, quit
                 └─ samo htmlUrl        → otvara browser
```

### Semver poređenje
Koristi se numericko poredenje (ne string) — `compareVersions(a, b)`.
Nikada nece prijaviti stariju verziju kao "novu".

### Ručna provjera
SidePanel → dugme "Provjeri update" → `window.api.checkForUpdate()`.
Rezultat: ✓ Azurno | ↓ Instaliraj update | greska.

---

## Proces izdavanja nove verzije

### Automatski (preporuceno)
```bash
# 1. Azuriraj CHANGELOG.md i package.json (verzija)
# 2. Pokreni build
npm run package
# 3. Commit i push
git add . && git commit -m "vX.Y.Z" && git push
# 4. GitHub Release se kreira PowerShell skriptom (ili rucno)
```

### Fajlovi za upload na GitHub Release
```
ForgeKit Interface Setup X.Y.Z.exe   ← installer (obavezan)
latest.yml                            ← za electron-updater (obavezan)
ForgeKit Interface Setup X.Y.Z.exe.blockmap  ← za delta update (opcionalno)
```

### Tag konvencija
```
v0.3.0, v0.3.1, v0.4.0  ...
```

---

## GitHub repozitorijumi

| Repo | Sadrzaj | Vidljivost |
|---|---|---|
| `ibolabs-git/ForgeKit_Interface` | App kod + Releases (installer, latest.yml) | Public |
| `ibolabs-git/ForgeKit_tool` | Master_ForgeKit_Tool + learning_data (memory zapisi) | Private |

---

## Sigurnost

- API kljucevi (Anthropic, OpenAI, GitHub token) cuvaju se enkriptovano putem `electron-store`
- Enkripcijski kljuc: `forgekit-secure-storage-2026` (definisan u `store.ts`)
- `contextBridge` striktno izoluje renderer od main procesa
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: false`
- GitHub token se nikad ne izlaze u renderer — koristi se iskljucivo u main procesu

---

## Poznate napomene / limitacije

| Stavka | Status |
|---|---|
| Tabovi se ne pamte pri gasenju app — samo prvi tab ucitava session.json | Planirano za fix |
| Provider/model mismatch moguc (npr. anthropic + gpt-4o) bez validacije | Planirano za fix |
| Bez code signinga — Windows SmartScreen moze blokirati installer | Prihvaceno (interno koristenje) |
| electron-updater zahtijeva `latest.yml` u GitHub Release | Dokumentovano |
