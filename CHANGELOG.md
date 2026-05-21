# Changelog — ForgeKit Interface App

Sve verzije su dostupne na [GitHub Releases](https://github.com/ibolabs-git/ForgeKit_Interface/releases).

Format: `[verzija] — datum — opis`

---

## [Unreleased]

### Napomena
- Sledece izmene unositi ovde pre novog release-a.
- Evidentiran app backlog za spontani role tag (`[THINKER]`, `[REVIEWER]`...) koji jos ne uskladjuje runtime ulogu kao eksplicitni `INVOKE` tok.

---

## [1.0.22] - 2026-05-21 - Project file action guard i fazni parser

### Stabilizacija
- `PROJECT_WRITE_FILE` blok sada dobija izvor najblizeg validnog role segmenta u istoj assistant poruci, pa `[BUILDER]` segment unutar Orchestrator odgovora vise ne biva pogresno blokiran kao `ORCHESTRATOR`.
- Tekstualna potvrda tipa `potvrdjujem` vise ne moze da nastavi AI tok dok postoje `blocked`, `pending` ili `error` Project File Actions stavke; app upisuje sistemsku poruku i trazi stvarno resavanje panel akcija.
- Parser faza prepoznaje `Faza 1/2/3/4` i `Phase 1/2/3/4`, ukljucujuci naziv faze iza crtice, pa levi panel moze prikazati faze kada ih projektni tok definise prirodnim jezikom.
- Role tile-ovi u levom panelu sada imaju dvojnu funkciju: semafor aktivne uloge i dugme koje salje prirodan poziv tipa `Pozivam Reviewer.`, dok app interno koristi kontrolisani invoke signal.
- Export fajl je preimenovan iz `chat_export_...` u `project_session_report_...`, sa naslovom `ForgeKit Project Session Report`.
- Verzija bumpovana na `1.0.22`.

### Validacija
- `npm.cmd run build` prolazi.

---

## [1.0.21] - 2026-05-21 - Runtime role sync i dinamicke faze

### Stabilizacija
- `INVOKE` komanda sada odmah postavlja runtime ulogu pre pocetka stream-a, tako da aktivna kartica u levom panelu i role badge poruke ostaju uskladjeni.
- Levi panel vise ne prikazuje hardkodovane faze `F1-F4` cim se kreira novi projekat; faze se prikazuju tek kada se pojave u projektnom toku ili taskovima.
- Task lista je dopunjena backlog stavkama za auto-zatvaranje taskova, pracenje potrosnje/performansi po modelu i project phase editor kao buducu nadogradnju.

### Validacija
- `npm.cmd run build` prolazi.

---

## [1.0.20] - 2026-05-20 - Runtime role boundary i file action guard

### Stabilizacija
- Assistant poruka se sada vezuje za aktivnu runtime ulogu u trenutku generisanja, pa Reviewer/Thinker odgovor vise ne moze biti prikazan kao Orchestrator samo zato sto model vrati pogresan tag.
- Ako aktivna ne-Orchestrator uloga u tekstu greskom vrati `[ORCHESTRATOR]`, app zadrzava stvarnu runtime ulogu kao izvor istine.
- `PROJECT_WRITE_FILE` predlozi se prihvataju samo iz Builder poruke; predlozi iz Reviewer/Thinker/Observer/Orchestrator toka se blokiraju i jasno oznacavaju u Project File Actions panelu.
- Project File Actions sada prikazuje izvor uloge za pending akcije i poseban blokirani status za pogresnu ulogu.

### Validacija
- Cilj testa: aktivna uloga u levom panelu, desnom panelu i poruci mora ostati uskladjena; Reviewer ne sme upisivati fajlove kroz file action tok.

---

## [1.0.19] — 2026-05-19 — Stream lifecycle i context refresh

### Stabilizacija
- Stop dugme sada stvarno prekida aktivni AI odgovor i odblokira sesiju.
- Provider, model i custom model kontrole su zaključane dok agent generiše odgovor.
- Main process podržava `cancel-message` preko `AbortController` kontrole za aktivne AI zahteve.
- `Refresh ForgeKit kontekst` sada aktivno šalje kratak interni re-prime zahtev modelu i vraća vidljivu potvrdu, umesto da samo ponovo označi `needs_refresh`.
- Dodat timeout za zahteve koji ne vrate prvi token u očekivanom roku.

### Validacija
- `npm.cmd run build` prolazi.
- Cilj testa: tokom generisanja nije moguće menjati model; stop prekida odgovor; context refresh daje kratak Orchestrator odgovor kada nema aktivnog stream-a.

---

## [1.0.18] — 2026-05-19 — ForgeKit init loop fix

### Stabilizacija
- ForgeKit init vise ne prepusta modelu da prvi trazi osnovne template fajlove; app ih ucitava direktno i salje modelu `[FORGEKIT_INIT_CONTEXT]`.
- Dodat guard koji sprecava ponovni `READ_TEMPLATE` loop posle interne template injekcije.
- `READ_TEMPLATE` zahtev se skriva i dok je poruka jos u streaming toku, ne samo posle zavrsetka odgovora.

### Validacija
- `npm.cmd run build` prolazi.
- Cilj testa: `pokreni forgekit rezim` mora dati jedan Orchestrator odgovor bez petlje i bez vidljivih template tagova.

---

## [1.0.17] — 2026-05-19 — Tihi ForgeKit init tok

### Stabilizacija
- `READ_TEMPLATE` i `TEMPLATE_INJECT` poruke vise se ne prikazuju u chat UI-u.
- Template ucitavanje sada radi kao interni tok aplikacije, bez status redova i bez liste fajlova pred korisnikom.
- Nakon internog ucitavanja, app salje skriveni nastavak modelu da se korisniku javi kao `[ORCHESTRATOR]`.
- Orchestrator treba kratko i prijatno da povede razgovor kroz Intake Handshake, bez prepricavanja dokumentacije.
- Istorija koja se salje modelu filtrira interne template poruke da ne zagade dalji tok razgovora.

### Validacija
- `npm.cmd run build` prolazi.
- Cilj testa: posle `pokreni forgekit rezim`, korisnik vidi samo normalan Orchestrator ulaz, bez ucitavanja i bez template tagova.

---

## [1.0.16] — 2026-05-19 — Silent template request UI

### Stabilizacija
- `READ_TEMPLATE` zahtevi koji sluze samo kao interni signal aplikaciji vise se ne prikazuju korisniku kao sirovi tagovi.
- Chat sada prikazuje kompaktan status `Ucitavam ForgeKit dokumentaciju`, uz broj trazenih fajlova.
- App preskace vec ucitane template putanje u istom toku, da se isti set dokumenata ne fetchuje vise puta.
- Time se cuva operativni interfejs: korisnik vidi tok, ali ne i internu mehaniku.

### Validacija
- Cilj testa: posle `pokreni forgekit rezim`, chat ne sme prikazati zid `[READ_TEMPLATE]` tagova.

---

## [1.0.15] — 2026-05-19 — ForgeKit runtime init patch

### Stabilizacija
- Prirodni pozivi kao `pokreni forgekit rezim`, `koristi ForgeKit rezim` i slicne varijante sada se interno mapiraju na `[FORGEKIT_INIT]`.
- Korisniku se i dalje prikazuje originalna poruka, ali model dobija stabilan runtime okidac.
- `PROJECT_WRITE_FILE` instrukcija prebacena je u app runtime instrukcije koje se uvek dodaju uz system prompt, bez obzira da li prompt dolazi iz GitHub-a ili bundled fallback-a.

### Validacija
- Cilj testa: ForgeKit init mora ucitati template dokumente, a predlog fajla mora ici kroz `Project file actions` potvrdu.

---

## [1.0.14] — 2026-05-19 — Nexus stabilizacioni patch i release deploy

### Stabilizacija
- Ispravljen runtime bug u `finalizeMessage()` koji je mogao prekinuti zavrsetak AI poruke i Memory Curator detekciju.
- Uskladjen `sendMessage` tip sa SEC-05 pravilom: renderer vise ne salje `systemPrompt`, main proces ga dodaje sam.
- NVIDIA je uskladjena kao punopravan provider u settings/tipovima i test konekcije sada cita secure key store.
- Uvedena F4 faza u runtime fazni parser, LeftPanel i Re-Prime/handoff kontekst, jer dokumentacija vec tretira F4 kao Nexus implementacionu fazu.
- Prosiren `[FORGEKIT_INIT]` minimalni set dokumenata i dodat kratak init check: rezim aktivan, Master/Core read-only, pre izvrsenja ide Intake Handshake.
- Dodat kontrolisani `PROJECT_WRITE_FILE` tok: AI priprema fajl kao pending akciju, a korisnik potvrdjuje upis u SidePanel-u.
- Git remote URL ociscen od embedded tokena.
- Dodat `deploy-release.cmd` / `deploy-release.ps1` za kreiranje GitHub Release-a sa installer assetima koje auto-updater moze da pronadje.

### Validacija
- `npm.cmd run build` prolazi nakon izmena.
- Release tok koristi `npm.cmd run package`, `gh release create`, installer `.exe`, `.blockmap` i `latest.yml`.

---

## [1.0.11] — 2026-05-19 — READ_TEMPLATE mehanizam

### Novo
- **READ_TEMPLATE mehanizam**: AI može da zatraži dokument iz Master_ForgeKit_Tool pomoću taga
  `[READ_TEMPLATE: 00_SYSTEM/rules.md]` u svom odgovoru
- App automatski detektuje tag, fetchuje fajl sa GitHub-a i injektuje sadrzaj nazad u razgovor
- Podrzano vise tagova u jednom odgovoru (AI moze zatraziti vise fajlova odjednom)
- **Template inject bubble** u chat-u: kompaktni red sa imenom fajla, klikabilan za expand/collapse
- `contentRef` u `useSendMessage` akumulira streaming sadrzaj lokalno za detekciju tagova
- `sendRef` resava closure stale problem — uvek koristi najsveziju verziju send funkcije

### Tok
```
AI odgovori sa [READ_TEMPLATE: 00_SYSTEM/rules.md]
  → useSendMessage detektuje tag nakon stream-complete
  → window.api.githubFetchTemplate('00_SYSTEM/rules.md')
  → GitHub API → Master_ForgeKit_Tool/00_SYSTEM/rules.md
  → sadrzaj auto-inject u razgovor kao [TEMPLATE_INJECT] poruka
  → AI dobija sadrzaj i nastavlja rad po pravilima
```

### Fajlovi promenjeni
`hooks/useSendMessage.ts`, `components/MessageBubble.tsx`, `components/MessageBubble.css`, `package.json`

---

## [1.0.10] — 2026-05-19 — Prompt source indikator

### Novo
- **Prompt Source indikator** u SidePanel ispod broja verzije:
  - `■ PROMPT: GITHUB` (teal) — system prompt ucitan iz ForgeKit_tool repo-a
  - `■ PROMPT: BUNDLED` (narandzasta) — koristi se lokalni fallback prompt
  - `■ PROMPT: —` (sivo) — jos nije poslata prva poruka u sesiji
- Indikator se osvezava automatski nakon prve AI poruke u sesiji
- `github:prompt-source` IPC handler — vraca trenutni izvor prompta
- `window.api.githubPromptSource()` izlozeno kroz preload bridge

### Fajlovi promenjeni
`ipc-handlers.ts`, `preload/index.ts`, `types/index.ts`,
`SidePanel.tsx`, `SidePanel.css`, `package.json`

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

