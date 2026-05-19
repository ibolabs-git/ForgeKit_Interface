# Changelog — ForgeKit Interface App

Sve verzije su dostupne na [GitHub Releases](https://github.com/ibolabs-git/ForgeKit_Interface/releases).

Format: `[verzija] — datum — opis`

---

## [1.0.9] — 2026-05-19 — Memorija u Master Tool repo

### Arhitekturalna ispravka
Memorija sesija se sada upisuje u `ibolabs-git/ForgeKit_tool` repo pod
`Master_ForgeKit_Tool/05_GLOBAL_MEMORY/learning_data/` — sastavni deo Master alata,
ne app repo-a.

### Promene
- `uploadMemoryRecord` koristi `getMasterToolConfig()` umesto `getGitHubConfig()`
- `github:test` IPC testira konekciju ka Master Tool repo-u
- Memory path: `Master_ForgeKit_Tool/05_GLOBAL_MEMORY/learning_data/{datum}_{projekat}_{ts}.md`
- Settings UI: uklonjen "Repozitorijum (projekat / memorija)" field — ostaje samo
  **Master Tool Repozitorijum** koji pokriva sve (instrukcije, template-i, memorija)

### Fajlovi promenjeni
`github.ts`, `ipc-handlers.ts`, `SettingsModal.tsx`, `package.json`

---

## [1.0.8] — 2026-05-19 — Master Tool repo konfiguracija

### Problem
Agenti nisu mogli pristupiti instrukcijama i template-ima iz `Master_ForgeKit_Tool`. Alat je u zasebnom GitHub repo-u (`ibolabs-git/ForgeKit_tool`, putanja `Master_ForgeKit_Tool/`), a app je koristio samo jedan `githubRepo` koji pokazuje na projektni repo (`ibolabs-git/ForgeKit_Interface`). Fetch system prompta uvek padao na bundlovani fallback.

### Resenje
- **Novo polje u Settings → GitHub**: `Master Tool Repozitorijum` — zasebni repo za ForgeKit_tool
- `getMasterToolConfig()` u `store.ts` — koristi `masterToolRepo` ako je podesen, inace `githubRepo` kao fallback
- `fetchSystemPromptFromGitHub` kandidati: `Master_ForgeKit_Tool/00_SYSTEM/forgekit_mode_prompt.md` first, zatim root putanje kao fallback
- `fetchTemplateFromGitHub(config, filePath)` — nova funkcija; uvek pokusava sa `Master_ForgeKit_Tool/` prefiksom
- **Novo IPC**: `github:fetch-template` — cita proizvoljni fajl iz Master Tool repo-a
- **Novo API**: `window.api.githubFetchTemplate(filePath)` — osnova za buduci READ_TEMPLATE mehanizam
- `settings-hint` CSS klasa za opisne napomene ispod input polja

### Konfiguracija (Settings → GitHub Integracija)
| Polje | Vrednost | Namena |
|---|---|---|
| Repozitorijum | `ibolabs-git/ForgeKit_Interface` | Memorija i upload |
| Master Tool Repozitorijum | `ibolabs-git/ForgeKit_tool` | Instrukcije i template-i |

Master_ForgeKit_Tool dokumentacija se nalazi na:
`https://github.com/ibolabs-git/ForgeKit_tool/tree/main/Master_ForgeKit_Tool`

### Fajlovi promenjeni
`store.ts`, `ipc-handlers.ts`, `github.ts`, `preload/index.ts`, `types/index.ts`,
`SettingsModal.tsx`, `SettingsModal.css`, `package.json`

---

## [1.0.7] — 2026-05-19 — Ciscenje agent tile-ova

### Promene
- Uklonjene sve ikone iz agent role tile-ova u levom panelu
- Aktivni agent oznacen iskljucivo zvezdicom `★` (animirana, bottom-right)
- `ROLE_ICONS` mapa uklonjena iz `LeftPanel.tsx`
- `.lrt-icon` CSS klasa uklonjena iz `LeftPanel.css`

### Fajlovi promenjeni
`LeftPanel.tsx`, `LeftPanel.css`, `package.json`

---

## [1.0.6] — 2026-05-19 — Agent role grid + invoke mehanika

### Novo
- **Agent role grid**: levi panel sada prikazuje svih 6 uloga kao interaktivni 2×3 grid
  - Vizualni stil identičan metric tiles iz desnog panela (corner brackets, redni broj, ikonica, naziv)
  - Aktivna uloga: animirana zvezda `★` + obojen border-left u boji uloge
  - Hover: prikazuje boju uloge na nazivu
- **Invoke mehanika**: klik na tile šalje `[INVOKE:ULOGA]` poruku AI-u; AI preuzima ulogu i odgovara u njenom kontekstu
- Grid je `disabled` tokom streaminga (ne može se slučajno pozvati dok AI piše)
- System prompt dopunjen `## Invoke komanda` sekcijom

### Refaktor
- `useSendMessage` hook izvučen iz `InputBar.tsx` — zajednička logika slanja za InputBar i LeftPanel
- Uklonjen duplirani listener management kod

### Fajlovi promenjeni
`LeftPanel.tsx`, `LeftPanel.css`, `InputBar.tsx`, `system-prompt.ts`, `package.json`
`hooks/useSendMessage.ts` ← novi fajl

---

## [1.0.5] — 2026-05-19 — Pozadina panela + per-uloga boje

### Promene
- **Svetla tema**: paneli (`--bg-secondary`) promenjeni sa `#EDE9E0` na `#fffbf2` (neutralna topla bela, manje žuta)
- **Per-uloga boje na role chip-u**: svaka uloga dobila zasebnu boju za border-left, naziv i live dot

| Uloga | Svetla tema | Tamna tema |
|---|---|---|
| ORCHESTRATOR | `#1e4d7a` komandno plava | `#7eb5e8` pastelna plava |
| THINKER | `#1a5c32` šumska zelena | `#7ec49a` mint |
| BUILDER | `#6b3a14` hrastova smeđa | `#c4976a` topla tan |
| REVIEWER | `#4a1e6e` duboka ljubičasta | `#b082cc` lavanda |
| MEMORY CURATOR | `#1e3d5e` arhivska mornarička | `#82aec4` slate plava |
| OBSERVER | `#3a4a5a` čelična siva | `#a0b4c4` sivo-plava |

### Implementacija
- `data-role` atribut dodat na `.lp-role-chip` div u `LeftPanel.tsx`
- CSS `[data-role="..."]` selektori za per-ulogu stilizaciju u light i dark temi

### Fajlovi promenjeni
`App.css`, `LeftPanel.tsx`, `LeftPanel.css`, `package.json`

---

## [1.0.4] — 2026-05-19 — Kompletna promena teme + popravka fontova

### Svetla tema
- Akcentna boja: `#ff6b00` (narandzasta) → `#679e88` (teal-zelena)
- Hover: `#ff8c33` → `#4e8480`
- `--accent-bg`: `rgba(255,107,0,0.07)` → `rgba(103,158,136,0.07)`
- `--accent-border`: `rgba(255,107,0,0.28)` → `rgba(103,158,136,0.28)`

### Tamna tema — potpuno novi kolorit
- Paneli (levo/desno): `#3e535c` (slate-teal)
- Chat oblast: `#4f6870` (zasićeniji teal, poseban override)
- Header: `#334d57` (zasebna nijansa, tamnija od panela)
- Akcenat: `#b7c0c4` (silver-grey)
- Pozadina: `#2c3f47`
- Granice: `--border: #4a6470`, `--border2: #3d5560`
- Tekst: `--text-primary: #dde6ea`, `--text-secondary: #9db0b8`
- Send dugme u tamnoj temi: silver tekst na tamnoj pozadini, hover invertuje (silver pozadina, tamni tekst)

### Popravka fontova (ISS-001 nastavak)
- `--font-mono`: dodat `'Inter'` fallback → `'Share Tech Mono', 'Courier New', 'Inter', monospace`
- `--font-tech`: dodat `'Inter'` fallback → `'Share Tech', 'Inter', sans-serif`
- Dijakritici sada ispravni u role tagovima, md naslovima i svim mono elementima

### Čišćenje hardkodovanih vrednosti
- Svi `#ff6b00`, `#ff8c33`, `rgba(255,107,0,...)` zamenjeni CSS varijablama ili novim vrednostima
- `rgba(255,107,0,0.06)` u `.chat-header-btn.active` → `var(--accent-bg)`
- `rgba(255,107,0,0.4)` u `.api-accordion.open` i `.theme-option:hover` → `var(--accent-border)`
- `rgba(255,107,0,0.5)` u `.model-switcher-select:hover` → `var(--accent-border)`
- Hardkodovani `#ff6b00` u `.theme-option-preview::before` → `#679e88`

### Fajlovi promenjeni
`App.css`, `Header.css`, `InputBar.css`, `ChatWindow.css`, `MessageBubble.css`,
`SidePanel.css`, `ProjectSetupModal.css`, `SettingsModal.css`, `package.json`

---

## [1.0.3] — 2026-05-18 — Scrollbar i box-shadow stilizacija

### Novo
- Custom webkit scrollbar: 8px širina, `border-radius: 4px`, hover → `var(--accent)`
- Firefox scrollbar: `@supports (scrollbar-color: auto)` blok
- Dark tema scrollbar override: teal borderi
- `app-main` dobio card box-shadow u svetloj temi: `0 4px 6px -1px rgba(44,37,32,0.04), 0 10px 15px -3px rgba(44,37,32,0.08)`
- Dark tema: `app-main` shadow uklonjen (`box-shadow: none`)
- `input-textarea` dobio inset shadow: `inset 0 1px 2px rgba(44,37,32,0.05)`

### Fajlovi promenjeni
`App.css`, `InputBar.css`, `package.json`

---

## [1.0.2] — 2026-05-18 — Pozadina svetle teme

### Promene
- `--bg-primary` u svetloj temi: `#ffffff` → `#f0f0e4` (topla bela pozadina)

### Fajlovi promenjeni
`App.css`, `package.json`

---

## [1.0.1] — 2026-05-18 — Dijakritici i ijekavica

### Ispravke (ISS-001)
- `SessionSummaryModal`: modal sadržaj sada koristi `var(--font)` (Inter) umesto Share Tech fontova — ispravlja renderovanje š, đ, č, ć, ž kao □
- `SessionSummaryModal`: naslovi h1/h2/h3 dobili eksplicitni `font-family: var(--font-tech), var(--font)` fallback

### Ijekavica → Ekavica
- Sve pojave ijekavičkih oblika zamenjene ekavicom kroz celu codebase:
  - "implementirano" umesto "implementirano" (ijekav. "implementovano")
  - "primijenjena" → "primenjena"
  - "vjerovatno" → "verovatno"
  - i ostale sistemske korekcije u komentarima, string literalima i dokumentaciji

### Fajlovi promenjeni
`SessionSummaryModal.css`, višestruki `.ts`/`.tsx` fajlovi (komentari i stringovi)

---

## [1.0.0] — 2026-05-17 — Inicijalni release

### Implementirano u v1.0.0

**F1 — Fundament**
- Electron 33 + React 18 + TypeScript 5.6 + electron-vite 2 setup
- Provider abstraction layer: `AIProvider` interfejs
- `AnthropicProvider` — Anthropic SDK, streaming kroz `messages.stream()`
- `OpenAIProvider` — OpenAI SDK, streaming kroz `chat.completions.create({ stream: true })`
- `NvidiaProvider` — OpenAI-kompatibilni endpoint (NIM)
- IPC arhitektura: `contextIsolation: true`, `nodeIntegration: false`, preload bridge
- Streaming token-po-token kroz IPC events (`stream-token`, `stream-complete`, `stream-error`)
- Chat UI: `ChatWindow`, `MessageBubble`, `InputBar` sa Ctrl+Enter shortcutom
- React-Markdown renderer sa GFM podrškom, syntax highlighter za kod blokove

**F2 — ForgeKit Logika**
- Zustand 5 store: kompletan state management (messages, activeRole, currentPhase, tasks)
- Role tag parser: `extractRole()` detektuje `[ROLE]` pattern iz AI odgovora
- Task parser: `extractTasks()` detektuje `- [ ]` / `- [x]` format
- Phase parser: detektuje F1/F2/F3 u tekstu
- System prompt u main procesu (SEC-05 bezbednosna kontrola)
- Re-Prime mehanizam za kompresiju konteksta pri promeni modela
- Session Summary Modal (AI-generisan rezime)
- `LeftPanel`: aktivna uloga, faze, info o projektu
- `SidePanel`: session metrika tiles, context status, re-prime dugme, model switcher, task lista, Memory Curator, verzija + auto-updater

**F3 — Multi-model i Settings**
- `SettingsModal`: accordion API sekcije za Anthropic, OpenAI, NVIDIA
- GitHub token podrška za auto-updater
- Custom model ID input (override dropdown modela)
- Light/Dark tema switcher
- `TabBar`: multi-tab sesije
- `Header`: model selector dropdown, HANDOFF dugme
- electron-builder NSIS installer
- GitHub Releases auto-updater (electron-updater)

**Bezbednost**
- SEC-05: system prompt živi samo u main procesu
- API ključevi enkriptovani u electron-store
- contextBridge eksponuje minimalan API set

**Dizajn**
- ChainGPT-inspired flat UI: oštri uglovi, monofonts, accent boje po ulozi
- Share Tech + Share Tech Mono + Inter (Google Fonts)
- 3-kolumna layout: 200px levo | flex chat | 280px desno
- CSS custom properties za temu, bez CSS framework zavisnosti
