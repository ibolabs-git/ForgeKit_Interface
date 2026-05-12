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

## Planirano

### [0.2.0] — Multi-tab projekti
- Do 4 otvorena projekta istovremeno kao tabovi
- Svaki tab ima nezavisnu sesiju (poruke, taskovi, faza, folder)
- `+` dugme za novi projekat, `✕` za zatvaranje taba
