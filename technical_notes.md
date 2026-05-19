# Technical Notes

## Projekat
ForgeKit Interface App

---

## TN-001 — Electron IPC arhitektura

Electron ima dva procesa: `main` (Node.js) i `renderer` (browser/React).

API pozivi MORAJU ici kroz `main` process jer renderer nema direktan pristup Node.js modulima u bezbednom modu.

```
renderer (React UI)
  → ipcRenderer.invoke('send-message', payload)
  → main process (electron IPC handler)
  → AI SDK (Anthropic / OpenAI)
  → streaming odgovor nazad kroz ipcMain → ipcRenderer
```

Preporucena konfiguracija:
- `contextIsolation: true`
- `nodeIntegration: false`
- `preload.ts` eksponuje samo dozvoljene funkcije kroz `contextBridge`

---

## TN-002 — Streaming implementacija

Oba SDK-a podrzavaju streaming ali na razlicit nacin:

**Anthropic:**
```typescript
const stream = await client.messages.stream({ ... })
for await (const chunk of stream) {
  // chunk.type === 'content_block_delta'
}
```

**OpenAI:**
```typescript
const stream = await client.chat.completions.create({ stream: true, ... })
for await (const chunk of stream) {
  // chunk.choices[0].delta.content
}
```

Provider abstraction layer normalizuje oba u isti `AsyncGenerator<string>` format.

---

## TN-003 — Role Tag detekcija

AI odgovori sadrze ForgeKit role tagove u formatu `[ROLE_NAME]`.

Regex za detekciju:
```typescript
const ROLE_REGEX = /^\[([A-Z\s]+)\]/
```

Uloge: `ORCHESTRATOR`, `THINKER`, `BUILDER`, `REVIEWER`, `MEMORY CURATOR`, `OBSERVER`

Svaka uloga ima zasebnu boju u UI-ju:

| Uloga | Svetla tema | Tamna tema |
|---|---|---|
| ORCHESTRATOR | `#1e4d7a` komandno plava | `#7eb5e8` pastelna plava |
| THINKER | `#1a5c32` sumska zelena | `#7ec49a` mint |
| BUILDER | `#6b3a14` hrastova smeda | `#c4976a` topla tan |
| REVIEWER | `#4a1e6e` duboka ljubicasta | `#b082cc` lavanda |
| MEMORY CURATOR | `#1e3d5e` arhivska mornaricka | `#82aec4` slate plava |
| OBSERVER | `#3a4a5a` celicna siva | `#a0b4c4` sivo-plava |

Implementacija: `data-role` atribut na `.lp-role-tile` + CSS `[data-role="..."]` selektori.

---

## TN-004 — API Key sigurnost

API kljucevi se NE smeju cuvati u:
- `localStorage` (nije enkriptovano)
- Hardkodovano u kodu
- Commitovano u git

Koristiti `safeStorage` (Windows DPAPI / macOS Keychain) kroz `electron-store`:
```typescript
// store.ts — SEC-04 implementacija
const secureStore = new Store<SecureData>({ name: 'forgekit-secure' })
// Enkriptuj pre snimanja:
safeStorage.encryptString(value).toString('base64')
// Dekriptuj pri citanju:
safeStorage.decryptString(Buffer.from(stored, 'base64'))
```

Soft migracija: ako `safeStorage` verzija ne postoji, cita iz legacy `encryptionKey` store-a.

---

## TN-005 — Folder struktura projekta (azurirano)

```
ForgeKit_Interface_App/          ← projektni dokumenti (ForgeKit)
├── app/                         ← Electron aplikacija (git repo)
│   ├── src/
│   │   ├── main/
│   │   │   ├── index.ts         ← Electron main entry
│   │   │   ├── ipc-handlers.ts  ← IPC kanali, AI pozivi, GitHub, projekat
│   │   │   ├── system-prompt.ts ← ForgeKit bundlovani fallback prompt (SEC-05)
│   │   │   ├── store.ts         ← electron-store: settings, API kljucevi
│   │   │   ├── github.ts        ← GitHub API layer (fetch, upload, template)
│   │   │   ├── project-manager.ts ← File I/O za projektne fajlove
│   │   │   ├── updater.ts       ← electron-updater logika
│   │   │   └── providers/
│   │   │       ├── anthropic.ts
│   │   │       ├── openai.ts
│   │   │       ├── nvidia.ts
│   │   │       ├── interface.ts
│   │   │       └── factory.ts
│   │   ├── preload/
│   │   │   └── index.ts         ← contextBridge API (window.api)
│   │   └── renderer/src/
│   │       ├── App.tsx + App.css ← Root, teme, layout grid
│   │       ├── hooks/
│   │       │   └── useSendMessage.ts  ← Zajednicki send hook + READ_TEMPLATE
│   │       ├── store/
│   │       │   └── forgekit.store.ts  ← Zustand store (ceo state)
│   │       ├── types/
│   │       │   └── index.ts     ← ForgeKitRole, ForgeKitPhase, Message, ElectronAPI...
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
│   ├── package.json             ← verzija, build config, GitHub release config
│   └── dist/                   ← generiše se pri `npm run package`
├── CHANGELOG.md
├── technical_notes.md
├── handoff.md
├── task_list.md
├── intake.md
├── product_spec.md
├── decisions.md
└── validation_plan.md
```

---

## TN-006 — System Prompt strategija (azurirano v1.0.8+)

**SEC-05**: Prompt zivi ISKLJUCIVO u main procesu. Renderer ga ne salje kroz IPC.

**Hijerarhija izvora (v1.0.8+)**:
1. GitHub — `Master_ForgeKit_Tool/00_SYSTEM/forgekit_mode_prompt.md` iz `masterToolRepo`
2. GitHub fallback — ostali kandidati (orchestrator_prompt.md, root putanje)
3. Bundlovani fallback — `src/main/system-prompt.ts` (uvek dostupan offline)

**Caching**: Prompt se fetchuje jednom po app sesiji (pri prvoj `send-message`) i keshira u `cachedSystemPrompt` varijabli u main procesu.

**Prompt source indikator** (v1.0.10): `promptSource` varijabla (`'github' | 'bundled' | 'pending'`) dostupna kroz `github:prompt-source` IPC, prikazana u SidePanel-u:
- `■ PROMPT: GITHUB` — teal, GitHub fetch uspeo
- `■ PROMPT: BUNDLED` — narandzasta, koristi se lokalni fallback
- `■ PROMPT: —` — sivo, jos nije poslana poruka

---

## TN-007 — Re-Prime mehanizam

Pri promeni modela ili kada je `contextStatus === 'needs_refresh'`, umesto pune chat istorije salje se komprimovani kontekst kroz `buildRePrimeMessages()` (`src/renderer/src/utils/forgekit-context.ts`).

Re-Prime poruka sadrzi: naziv projekta, trenutnu fazu, aktivnu ulogu, poslednjih N poruka kao preview, listu taskova i novu korisnikovu poruku.

Nakon slanja, `contextStatus` se odmah postavlja na `synced`.

**Limitacija**: Kompresija moze izazvati gubitak detaljnog konteksta na dugim sesijama. Dugorocno resenje: token counting + selektivno slanje poruka.

---

## TN-008 — CSS varijable i tema sistem

Tema se kontrolise kroz CSS custom properties u `:root` i `[data-theme="dark"]` blokovima (`App.css`).

Svetla tema: `--bg-primary: #f0f0e4`, `--bg-secondary: #fffbf2`, `--bg-tertiary: #ffffff`, `--accent: #679e88`

Tamna tema: `--bg-primary: #2c3f47`, `--bg-secondary: #3e535c` (paneli), `--bg-tertiary: #334d57` (header), `--accent: #b7c0c4`

**Vazno**: `.chat-window` i `.message-bubble` u tamnoj temi dobijaju poseban override na `#4f6870` kako bi chat oblast bila vizuelno odvojena od panela (oba inace koriste `--bg-secondary`).

---

## TN-009 — Fontovi i dijakritici (ISS-001)

Share Tech Mono i Share Tech ne sadrze Latin Extended-A glyphs (Unicode 0100-017F), sto izaziva prikaz □ za srpske dijakritike.

Resenje — Inter kao fallback u CSS font stack:
```css
--font-mono: 'Share Tech Mono', 'Courier New', 'Inter', monospace;
--font-tech: 'Share Tech', 'Inter', sans-serif;
```

Browseri koriste per-glyph fallback — za latinicna slova koristi Share Tech, za dijakritike pada na Inter.

---

## TN-010 — useSendMessage hook i invoke arhitektura (azurirano v1.0.11)

`src/renderer/src/hooks/useSendMessage.ts` je zajednicki hook koji enkapsulira kompletnu logiku slanja poruka ka AI-u. Koriste ga InputBar (normalne poruke) i LeftPanel (invoke komande).

**Invoke tok:**
```
Klik na tile → send('[INVOKE:BUILDER]')
  → addUserMessage() → startAssistantMessage()
  → window.api.sendMessage() → AI
  → AI pise [BUILDER] → extractRole() → activeRole = 'BUILDER'
  → BUILDER tile dobija zvezdicu
```

**Kljucne implementacione odluke (v1.0.11):**

`contentRef` — `useRef<string>` akumulira streaming sadrzaj lokalno (pored Zustand `streamingContent`). Neophodan za READ_TEMPLATE detekciju jer se `streamingContent` resetuje pri `finalizeMessage`.

`sendRef` — `useRef<send fn>` uvek drzi najsveziju verziju `send` callback-a. Resava closure stale problem: `onStreamComplete` handler se kreira pri svakom `send()` pozivu, ali treba da pokrene novi `send()` sa `isStreaming: false`. Bez `sendRef`, koristio bi staro zatvorenje gde je `isStreaming: true`.

```typescript
// Pattern:
const sendRef = useRef(send)
sendRef.current = send  // osvezi na svakom renderu

// U onStreamComplete:
setTimeout(() => { sendRef.current(injectText) }, 80)
```

---

## TN-011 — GitHub konfiguracija (finalna, v1.0.9+)

Master_ForgeKit_Tool je u zasebnom repo-u od app repo-a.

**Repozitorijumi:**
- App repo: `ibolabs-git/ForgeKit_Interface` — GitHub Releases, auto-updater
- Master Tool repo: `ibolabs-git/ForgeKit_tool` — ForgeKit instrukcije, template-i, memorija

**Putanja u ForgeKit_tool repo-u:**
```
https://github.com/ibolabs-git/ForgeKit_tool/tree/main/Master_ForgeKit_Tool
```
Sva dokumentacija je unutar `Master_ForgeKit_Tool/` podfolder-a.

**Settings — jedno relevantno polje:**

| Store polje | UI label | Vrednost |
|---|---|---|
| `masterToolRepo` | Master Tool Repozitorijum | `ibolabs-git/ForgeKit_tool` |
| `githubRepo` | (legacy, nekoriscen aktivno) | — |

`getMasterToolConfig()` u `store.ts` vraca config za Master Tool: koristi `masterToolRepo` ako je podesen, inace pada na `githubRepo`.

**Sve GitHub operacije koriste masterToolRepo:**
- `fetchSystemPromptFromGitHub` — cita system prompt
- `fetchTemplateFromGitHub` — cita template fajlove
- `uploadMemoryRecord` — upisuje memoriju u `Master_ForgeKit_Tool/05_GLOBAL_MEMORY/learning_data/`
- `testGitHubConnection` — testira konekciju

**fetchTemplateFromGitHub — logika putanje:**
```typescript
// Uvek pokusava sa Master_ForgeKit_Tool/ prefiksom prvo:
//   1. 'Master_ForgeKit_Tool/03_STANDARD/technical_notes.md'  ← prava putanja
//   2. '03_STANDARD/technical_notes.md'                       ← fallback

const result = await window.api.githubFetchTemplate('03_STANDARD/technical_notes.md')
// → { ok: true, content: '...' }
```

---

## TN-012 — READ_TEMPLATE mehanizam (v1.0.11)

Mehanizam koji omogucava AI agentima da zatraže sadrzaj fajlova iz Master_ForgeKit_Tool tokom sesije.

**Tag format:**
```
[READ_TEMPLATE: 00_SYSTEM/rules.md]
[READ_TEMPLATE: 03_STANDARD/technical_notes.md]
```

AI moze da posalje vise tagova u jednom odgovoru — svi se obradjuju odjednom.

**Tok:**
```
1. AI odgovori sa [READ_TEMPLATE: 00_SYSTEM/rules.md] u tekstu
2. useSendMessage detektuje tag iz contentRef (lokalni buffer) nakon stream-complete
3. window.api.githubFetchTemplate('00_SYSTEM/rules.md') → IPC
4. main: fetchTemplateFromGitHub(masterToolConfig, '00_SYSTEM/rules.md')
5. GitHub API → Master_ForgeKit_Tool/00_SYSTEM/rules.md (pokusava sa prefiksom)
6. Sadrzaj se formatira kao [TEMPLATE_INJECT] poruka
7. setTimeout(80ms) → sendRef.current(injectText)
8. Inject poruka se salje kao korisnička poruka, AI dobija sadrzaj
9. AI nastavlja rad koristeci sadrzaj dokumenta
```

**Format inject poruke (u chat istoriji):**
```
[TEMPLATE_INJECT]
=== 00_SYSTEM/rules.md ===

{sadrzaj fajla}

---

=== 00_SYSTEM/workflow.md ===

{sadrzaj fajla}
```

**UI prikaz**: MessageBubble detektuje `[TEMPLATE_INJECT]` prefiks i prikazuje kompaktni chip umesto normalnog bubble-a:
- Prikazuje listu ucitanih fajlova
- Klikabilan za expand/collapse sadrzaja
- Stil: teal `border-left`, `■ Template ucitan: rules.md`

**Regex za detekciju:**
```typescript
const READ_TEMPLATE_REGEX = /\[READ_TEMPLATE:\s*([^\]]+)\]/g
```
