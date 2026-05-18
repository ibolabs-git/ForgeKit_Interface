# Changelog — ForgeKit Interface App

Sve verzije prate [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH

---

## [0.1.1] — 2026-05-12
### Izmijenjeno
- Ikona aplikacije promijenjena na proton-native atom logo

---

## [0.1.0] — 2026-05-12
### Novo — inicijalno izdanje
- AI chat sa streaming odgovorima (Anthropic Claude i OpenAI GPT)
- ForgeKit uloge: ORCHESTRATOR, THINKER, BUILDER, REVIEWER, MEMORY CURATOR, OBSERVER
- Automatska detekcija uloge iz AI odgovora (`[ROLE]` tag)
- Automatska detekcija taskova iz AI odgovora (`- [ ]` format)
- Faze rada: F1 Fundament, F2 ForgeKit Logika, F3 Multi-model
- Desni panel: aktivna uloga, faze, taskovi, Memory Curator, projekat, sesija
- Memory Curator: automatski kreira i uploaduje zapis na GitHub kada AI preuzme ulogu `[MEMORY CURATOR]`
- GitHub integracija: token + repo konfiguracija, test konekcije
- Projektni folder: kreiranje novog ili odabir postojeceg, `project_security_manifest.md` se automatski kreira
- Perzistencija sesije: `session.json` u projektnom folderu (poruke, taskovi, faza)
- Settings modal: API kljucevi (Anthropic, OpenAI), GitHub integracija
- Auto-update: `electron-updater` sa GitHub Releases (`ibolabs-git/ForgeKit_Interface`)
- NSIS Windows installer sa desktop i Start menu precicama

---

---

## [0.3.4] — 2026-05-18 — Perzistencija tabova
### Novo
- Svi otvoreni tabovi se čuvaju pri gašenju i automatski restauriraju pri slijedećem pokretanju
- Aktivni tab se pamti — pri startu odmah otvaraš tamo gdje si stao
- Neaktivni tabovi se učitavaju **lazy** — sesija se čita tek kada pređeš na taj tab
- `setProjectPath` sinhronizuje electron-store pri svakoj promjeni foldera (ispravlja edge-case pri pisanju session.json)
- `loadSession` čita direktno iz projektnog foldera (neovisno od interno sačuvanog puta)
- Nova IPC komunikacija: `tabs:save-state`, `tabs:load-state`, `project:read-file-from-path`, `project:set-active-path`

---

## [0.3.3] — 2026-05-18 — Validacija provider/model + bolja greška za API ključ
### Novo
- Validacija provider/model pri učitavanju sesije — mismatch se automatski ispravlja (npr. `anthropic + gpt-4o` → `anthropic + claude-sonnet-4-6`)
- Greška "API ključ nije podešen" sada prikazuje dugme **⚙ Otvori Settings → API Ključevi** direktno u chatu — jedan klik do rješenja

---

## [0.3.2] — 2026-05-18 — Nova sesija = checkpoint, ne brisanje
### Izmijenjeno
- **Nova sesija** više ne briše razgovor — dodaje vizuelni separator u chat (datum + vremenska oznaka)
- Handoff dokument se i dalje kreira u projektnom folderu
- Taskovi, faza i sve ostalo ostaju netaknuti
- Ispravljena semantika: sesija je radni period unutar projekta, ne reset projekta

---

## [0.3.1] — 2026-05-18 — OpenAI modeli ažurirani
### Izmijenjeno
- OpenAI lista modela: dodati `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`
- Zadržani: `gpt-4o`, `gpt-4o-mini`

---

## [0.3.0] — 2026-05-18 — Multi-tab projekti
### Novo
- **Do 4 projekta istovremeno** kao tabovi ispod headera
- Svaki tab ima **potpuno nezavisnu sesiju**: poruke, taskovi, faza, folder, provider/model, Memory Curator
- **`+`** dugme za novi projekat — automatski otvara setup modal
- **`✕`** za zatvaranje taba (nije moguće zatvoriti jedini tab)
- **Streaming indikator** na tabu koji čeka AI odgovor (pulsiranje)
- Tab header se automatski ažurira kada se promijeni naziv/folder projekta
- Prebacivanje između projekata čuva puno stanje u memoriji

---

## [0.2.1] — 2026-05-18 — Header cleanup + Handoff dokument + In-app update
### Novo
- **Nova sesija → Handoff dokument**: prije brisanja sesije automatski se kreira `handoff_<datum>.md` u projektnom folderu sa pregledom zadataka, faze i posljednjih poruka
- **In-app azuriranje**: `electron-updater` preuzima i instalira novu verziju direktno unutar aplikacije (bez preusmjeravanja na browser); fallback na GitHub link ako `latest.yml` nije dostupan

### Izmijenjeno / uklonjeno
- **Header**: uklonjeni dropdown meniji za Provider i Model — odabir je isključivo u Settings → Projekat
- Provajder i model ostaju vidljivi u desnom panelu (Sesija sekcija)

---

## [0.2.0] — 2026-05-12 — Project Settings + Provider per projekat
### Novo
- Settings modal podijeljen na dvije sekcije: **Globalno** (API ključevi, GitHub) i **Projekat**
- Project Settings: naziv projekta, folder, provider, model — sve vezano za projekat, ne globalno
- Provider i model biraju se per-projekat i snimaju u `session.json`
- OpenAI modeli dostupni za izbor per-projekat
- Vidljivost projektnog foldera u Project Settings

---

## Planirano

### [0.2.1] — Handoff dokument
- Pri kliku "Nova sesija" — opcija za čuvanje handoff dokumenta u projektni folder
- Handoff sadrži: šta je urađeno, status taskova, otvorena pitanja

### [0.3.0] — Multi-tab projekti
- Do 3 otvorena projekta istovremeno kao tabovi
- Svaki tab ima nezavisnu sesiju (poruke, taskovi, faza, folder, provider/model)
- `+` dugme za novi projekat, `✕` za zatvaranje taba
