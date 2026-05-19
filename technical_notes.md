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

Provider abstraction layer treba da normalizuje oba u isti `AsyncGenerator<string>` format.

---

## TN-003 — Role Tag detekcija

AI odgovori ce sadrzati ForgeKit role tagove u formatu `[ROLE_NAME]`.

Regex za detekciju:
```typescript
const ROLE_REGEX = /^\[([A-Z\s]+)\]/
```

Uloge: `ORCHESTRATOR`, `THINKER`, `BUILDER`, `REVIEWER`, `MEMORY CURATOR`, `OBSERVER`

Svaka uloga dobija svoju boju u UI-ju.

---

## TN-004 — API Key sigurnost

API kljucevi se NE smeju cuvati u:
- `localStorage` (nije enkriptovano)
- Hardkodovano u kodu
- Commitovano u git

Koristiti `electron-store` sa enkripcijom:
```typescript
import Store from 'electron-store'
const store = new Store({ encryptionKey: 'forgekit-app-key' })
store.set('anthropic_api_key', key)
```

---

## TN-005 — Folder struktura projekta

```
ForgeKit_Interface_App/          ← projektni dokumenti (ForgeKit)
src/
  main/                          ← Electron main process
    index.ts
    ipc-handlers.ts
    providers/
      anthropic.ts
      openai.ts
      provider.interface.ts
      provider.factory.ts
  renderer/                      ← React UI
    App.tsx
    components/
      ChatWindow/
      MessageBubble/
      InputBar/
      SidePanel/
      ModelSelector/
    store/
      forgekit.store.ts
    prompts/
      system-prompt.ts
  shared/
    types.ts
```

---

## TN-006 — System Prompt strategija

ForgeKit system prompt je staticni tekst koji se salje kao `system` poruka pri svakom API pozivu.

Prompt mora sadrzati:
- ForgeKit uloge i njihove granice
- Pravilo role tagging-a (`[ROLE]` format)
- Pilar rezim kao podrazumevani tok
- Instrukcije za task pracenje
- Instrukcije za fazni rad (F1/F2/F3)

Prompt ne sme biti predugacak — optimizovati za token efikasnost.
Preporucena duzina: do 1500 tokena.

**SEC-05**: Prompt zivi ISKLJUCIVO u `src/main/system-prompt.ts`. Renderer ne prima i ne salje system prompt kroz IPC — main ga dodaje sam pri svakom pozivu.

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

## TN-010 — useSendMessage hook i invoke arhitektura

`src/renderer/src/hooks/useSendMessage.ts` je zajednicki hook koji enkapsulira kompletnu logiku slanja poruka ka AI-u. Koriste ga InputBar (normalne poruke) i LeftPanel (invoke komande).

Invoke tok:
```
Klik na tile → send('[INVOKE:BUILDER]')
  → addUserMessage() → startAssistantMessage()
  → window.api.sendMessage() → AI
  → AI pise [BUILDER] → extractRole() → activeRole = 'BUILDER'
  → BUILDER tile dobija zvezdicu
```

---

## TN-011 — Dual-repo GitHub konfiguracija

Master_ForgeKit_Tool je u zasebnom repo-u (`ibolabs-git/ForgeKit_tool`) — nije deo app repo-a (`ibolabs-git/ForgeKit_Interface`).

Resenje — dva polja u Settings:

| Polje | Namena | Primer |
|---|---|---|
| `githubRepo` | Projekat i memorija upload | `ibolabs-git/ForgeKit_Interface` |
| `masterToolRepo` | Instrukcije i template-i | `ibolabs-git/ForgeKit_tool` |

`getMasterToolConfig()` u `store.ts` vraca config za Master Tool: koristi `masterToolRepo` ako je podesen, inace pada na `githubRepo`. Isti GitHub Token vazi za oba.

**System prompt tok (v1.0.8)**:
```
send-message handler → getMasterToolConfig()
  → fetchSystemPromptFromGitHub(masterToolConfig)
  → tries: '00_SYSTEM/forgekit_mode_prompt.md'  ← root ForgeKit_tool repo
           'Master_ForgeKit_Tool/00_SYSTEM/...'  ← legacy, ako je MT u app repo
  → cachedSystemPrompt = remote ?? FORGEKIT_SYSTEM_PROMPT
```

**READ_TEMPLATE osnova**:
```typescript
// Renderer moze pozvati:
const result = await window.api.githubFetchTemplate('03_STANDARD/technical_notes.md')
// IPC → fetchTemplateFromGitHub(masterToolConfig, path)
// → probava root putanju i Master_ForgeKit_Tool/ prefiks
```
