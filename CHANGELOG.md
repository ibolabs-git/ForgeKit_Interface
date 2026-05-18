# Changelog — ForgeKit Interface App

Verzije prate [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH  
Stable backup tagovi: `vX.Y.Z-stable` na GitHubu.

---

## [0.7.1] — 2026-05-18 — Jump to message (FAZA B3)
### Novo
- **Jump to message** — svaki task koji je AI generisao u chatu dobija `↗` dugme (vidljivo na hover)
- Klik na `↗` skrola chat do originalne poruke i narandžasto je flesha (animacija 1.6s)
- `Task` struktura proširena sa `sourceMessageId` — sprema se automatski pri parsiranju AI odgovora
- Ručno dodani taskovi nemaju `↗` dugme (nemaju izvornu poruku)

---

## [0.7.0] — 2026-05-18 — Search u chatu + Export razgovora (FAZA B1+B2)
### Novo
- **Search bar** (`Ctrl+F`) — otvara se ispod chat header-a s narandžastim border-om; `Enter` = sljedeći match, `Shift+Enter` = prethodni, `Escape` = zatvori
- **Match highlight** — poruke koje sadrže upit dobijaju blago narandžastu pozadinu; trenutna match ima jaču boju i narandžasti lijevi border
- **Match counter** — `1 / 5` prikazano u search baru uz ↑↓ navigacijske dugmad
- **EXPORT ›** dugme u chat header-u — dropdown s dvije opcije:
  - **Markdown (.md)** — naslovi, uloge, timestamps, session separator-i
  - **Plaintext (.txt)** — ista struktura u plain tekstu
- Export fajl sprema se u aktivni projektni folder: `chat_export_YYYY-MM-DD_HH-MM.md/txt`
- Export dugme disabled ako nema projektnog foldera ili poruka

---

## [0.6.1] — 2026-05-18 — Keyboard shortcuts (FAZA A4)
### Novo
- **`Ctrl+Enter`** — šalje poruku (ranije `Enter`); plain `Enter` i `Shift+Enter` = novi red u textarea
- **`Ctrl+Tab`** — ciklično prebacivanje na sljedeći otvoreni tab (wrap-around)
- **`Ctrl+,`** — otvara Settings modal direktno
- Placeholder i tooltip na send dugmetu ažurirani

---

## [0.6.0] — 2026-05-18 — Markdown rendering + Syntax highlighting (FAZA A1+A2+A3)
### Novo
- **Markdown rendering** (`react-markdown` + `remark-gfm`) — bold, italic, headings, liste, tabele, blockquote, HR
- **Syntax highlighting** (`react-syntax-highlighter` / Prism / vscDarkPlus tema) — automatski za sve code blokove
- **Copy dugme** na svakom code bloku — `COPY ›`, nakon klika prikazuje `✓ KOPIRANO` 2s
- **GFM task liste** — checkbox stilizacija s corner bracket UI
- **Role tag + timestamp** u jednom header redu iznad poruke
- Inline code stilizacija: `font-mono`, orange boja, tanki border

---

## [0.5.4] — 2026-05-18 — Metric tiles: tekst u dva reda
### Ispravka
- `.m-val` u desnom panelu: uklonjen `white-space: nowrap` i `text-overflow: ellipsis`
- Dodan `word-break: break-word` + `line-height: 1.3` — dugi nazivi (npr. "Claude Sonnet 4.6") sada prelaze u drugi red umjesto da budu odrezani
- Font smanjen s 12px na 11px za bolji fit u 2×2 tile grid

---

## [0.5.3] — 2026-05-18 — FK logo sivi u tamnoj temi
### Ispravka
- `[data-theme="dark"] .header-logo-mark { background: #5c6370 }` — FK kvadrat postaje neutralno sivi u tamnoj temi
- Svi ostali narandzasti akcenti ostaju nepromijenjeni u obje teme

---

## [0.5.2] — 2026-05-18 — Tamna tema + Settings Izgled tab
### Novo
- **Tamna tema** — CSS varijable pod `[data-theme="dark"]`: pozadina `#181818`, površina `#1e1e1e`/`#252525`, ivice `#333`, tekst `#e8e8e8`; akcenat ostaje orange `#ff6b00`
- **Settings → Izgled tab** — vizualni picker s thumbnail prikazom obje teme; klik odmah primijenjuje temu bez restarta
- **Tema se pamti** između sesija u `localStorage` pod ključem `fk-theme`
- **`data-theme` atribut** na `<html>` elementu — sve CSS varijable reaguju automatski
- **Desni panel proširen** s 240px na 280px — sav sadržaj vidljiv bez odrezivanja

---

## [0.5.1] — 2026-05-18 — 3-kolona layout (identičan ChainGPT preview-u)
### Izmijenjeno — strukturalna promjena layouta
- **3-kolona CSS grid** — `app-body: grid-template-columns: 200px 1fr 280px` umjesto starog flex s jednim panelom
- **Nova `LeftPanel` komponenta** (200px) — aktivna uloga s live dot-om, faza rada (✓/■/□ ikone), info o projektu
- **TabBar ugrađen u Header** — tabovi su flat nav linkovi unutar 50px header trake; eliminisana zasebna tab bar traka ispod headera
- **Chat header bar** — kontekst linija iznad chata: `CHAT Projekat · Faza · ROLE MODE`
- **Metric tiles u desnom panelu** — 2×2 grid: Provider / Model / Faza / Poruke; svaki tile ima corner bracket CSS dekoracije
- **Corner brackets** na task itemima (CSS `::before/::after`) — direktno iz ChainGPT UI pattern-a
- Duplicate sekcije uklonjene iz SidePanel (uloga, faza, projekat → prebačeno u LeftPanel)

---

## [0.5.0] — 2026-05-18 — ChainGPT Light UI Tema
### Novo — potpuni vizuelni redizajn
- **ChainGPT Light vizuelni identitet** — pozadina `#e8e8e8`, površina `#f0f0f0`/`#ffffff`, akcenat `#ff6b00`, 1px border grid separatori
- **Share Tech + Share Tech Mono fontovi** (Google Fonts) — tech display font za logo/labele, monospace za timestamps i section naslove
- **Flat tab navigacija** — `border-bottom: 2px solid orange` na aktivnom tabu; corner bracket dekoracije na aktivnom tabu
- **`border-radius: 0`** konzistentno — flat, grid-based estetika bez zaobljenih uglova
- **Header** — FK orange kvadratni logo mark, flat layout, orange `HANDOFF ›` CTA dugme desno
- **Poruke kao grid redovi** — flat row stil s `border-bottom` separatorom; AI poruke dobijaju `border-left: 2px orange` on hover; square avatari
- **`■` bullet** ispred section labela u SidePanel
- **`SEND ›`** orange send dugme — kvadratan, uppercase mono font
- **Settings modal** — `box-shadow: 4px 4px 0`, orange left border na headeru, uppercase CTA dugmad

---

## [0.4.1] — 2026-05-18 — Settings UI: accordion + NVIDIA test veze
### Izmijenjeno
- **API ključevi kao accordion sekcije** — Anthropic, OpenAI, NVIDIA NIM, GitHub se otvaraju/zatvaraju; status badge vidljiv bez otvaranja
- **Modal max-height 88vh** + `overflow-y: auto` — header, tabovi i Save uvijek vidljivi, sadržaj scrolluje
- **NVIDIA NIM „Testiraj vezu"** — testira key + base URL pozivom na `/models` endpoint
- **SidePanel SESIJA blok** — Provider, Model, Context status, broj poruka u kompaktnom info prikazu
- Auto-otvori prvu nepodešenu accordion sekciju pri otvaranju Settings

---

## [0.4.0] — 2026-05-18 — Model Switch System + ForgeKit Context Re-Prime
### Novo
- **Live model switcher u SidePanel** — mijenjaj provider i model tokom aktivnog projekta bez zatvaranja sesije
- **Custom model ID polje** (samo NVIDIA) — unesi bilo koji NIM model ID koji nije u dropdown listi
- **ForgeKit Context Re-Prime** — pri promjeni modela šalje se strukturirani kontekst (projekt, faza, uloga, taskovi, zadnji output) umjesto pune historije
- **`[MODEL_SWITCH]` divider** u chatu — vizuelni marker s imenima before/after
- **Context status badge** — `✓ synced` ili `⚠ refresh`; Refresh Context dugme za ručni trigger
- **NVIDIA NIM Base URL** u Settings — preset dugmad: Hosted NVIDIA / Local NIM
- **`forgekit-context.ts`** utility — `buildProjectContext`, `buildModelSwitchNotice`, `buildRePrimeMessages`

---

## [0.3.6] — 2026-05-18 — NVIDIA NIM integracija
### Novo
- **NVIDIA NIM** kao treći AI provider — besplatan API za 80+ modela, OpenAI-kompatibilan
- 18 predefinisanih modela: Nemotron, DeepSeek R1/V3, Llama 3.3 405B, QwQ 32B, Kimi, GLM-4, Phi-4, Gemma 3, Mixtral, Qwen 2.5 Coder i dr.
- NVIDIA NIM API ključ u Settings → Globalno; validacija formata `owner/model`

---

## [0.3.5] — 2026-05-18 — UX: Handoff vs Novi projekat
### Izmijenjeno
- `+ Nova sesija` → `📋 Handoff projekta` — jasno označava checkpoint, ne brisanje
- Tab `+` → `＋ Novi projekat` s accent bojom
- Limit label: `4/4` → `max 4 projekta`; opisni tooltips na oba dugmeta

---

## [0.3.4] — 2026-05-18 — Perzistencija tabova
### Novo
- Svi otvoreni tabovi se čuvaju pri gašenju; restauriraju se pri sljedećem pokretanju
- Aktivni tab se pamti — pri startu odmah na istom mjestu
- Neaktivni tabovi se učitavaju lazy (tek pri prelasku)
- Nova IPC: `tabs:save-state`, `tabs:load-state`, `project:read-file-from-path`, `project:set-active-path`

---

## [0.3.3] — 2026-05-18 — Validacija provider/model
### Novo
- Validacija mismatch-a pri učitavanju sesije — automatska ispravka (npr. `anthropic + gpt-4o` → ispravni model)
- Greška „API ključ nije podešen" prikazuje dugme **⚙ Otvori Settings** direktno u chatu

---

## [0.3.2] — 2026-05-18 — Nova sesija = checkpoint
### Izmijenjeno
- Nova sesija više ne briše razgovor — dodaje vizuelni separator (datum + vrijeme)
- Handoff dokument se kreira; taskovi, faza i sve ostalo ostaju netaknuti

---

## [0.3.1] — 2026-05-18 — OpenAI modeli
### Izmijenjeno
- Dodati: `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`; zadržani: `gpt-4o`, `gpt-4o-mini`

---

## [0.3.0] — 2026-05-18 — Multi-tab projekti
### Novo
- Do 4 projekta istovremeno kao tabovi; svaki tab ima potpuno nezavisnu sesiju
- `+` za novi projekat, `✕` za zatvaranje; streaming indikator na aktivnom tabu
- Prebacivanje između projekata čuva puno stanje u memoriji

---

## [0.2.1] — 2026-05-18 — Handoff dokument + In-app update
### Novo
- Handoff dokument (`handoff_<datum>.md`) se automatski kreira u projektnom folderu pri novoj sesiji
- In-app update: `electron-updater` preuzima i instalira bez preusmjeravanja na browser

---

## [0.2.0] — 2026-05-12 — Project Settings + Provider per projekat
### Novo
- Settings modal: **Globalno** (API ključevi, GitHub) i **Projekat** (naziv, folder, provider, model)
- Provider i model per-projekat, snimaju se u `session.json`

---

## [0.1.1] — 2026-05-12
### Izmijenjeno
- Ikona aplikacije promijenjena na proton-native atom logo

---

## [0.1.0] — 2026-05-12 — Inicijalno izdanje
### Novo
- AI chat sa streaming odgovorima (Anthropic Claude i OpenAI GPT)
- ForgeKit uloge: ORCHESTRATOR, THINKER, BUILDER, REVIEWER, MEMORY CURATOR, OBSERVER
- Automatska detekcija uloge (`[ROLE]` tag) i taskova (`- [ ]` format) iz AI odgovora
- Faze rada: F1 Fundament, F2 ForgeKit Logika, F3 Multi-model
- Memory Curator: automatski upload zapisa na GitHub
- GitHub integracija: token + repo, test konekcije
- Projektni folder + `project_security_manifest.md`; perzistencija sesije u `session.json`
- Auto-update s GitHub Releases; NSIS Windows installer
