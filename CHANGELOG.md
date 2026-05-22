# Changelog - ForgeKit Interface App

Sve verzije su dostupne na [GitHub Releases](https://github.com/ibolabs-git/ForgeKit_Interface/releases).

Format: `[verzija] - datum - opis`

---

## [Unreleased] - sledeci ciklus

### Otvoreno
- Dugme `POKRENI FORGEKIT` treba preimenovati/promeniti namenu nakon init-a u refresh/re-prime ili drugi jasan runtime signal.
- Re-Prime treba dalje prosiriti u puniji handoff/state packet sa potvrdjenim odlukama, otvorenim pitanjima i pending file action stanjem.
- NVIDIA timeout/fallback stabilizacija ostaje posebna provider tema.
- Project session report treba dalje obogatiti odlukama, file action statusima i memory signalima.
- U glavni ForgeKit repo treba uvesti `ForgeKit_handoff_mentor_vodic_za_novi_start.md` kao inicijalni mentor/handoff dokument ako se potvrdi kao standard.

---

## [1.0.24] - 2026-05-22 - Dinamicke faze i live role sync

### Stabilizacija
- Levi phase sidebar vise nije ogranicen na `F1-F4`; parser prihvata proizvoljan broj faza i verzijske faze tipa `v1.0 - Core Operations`, `v1.1 - Exercise Sets`, `v1.2 - Reminders`.
- Faze se sortiraju po realnom redosledu i mogu se osveziti iz kasnijeg potvrdjenog projektno-faznog output-a, sto resava PulseFit scenario gde su faze promenjene posle Reviewer/Premortem provere.
- Aktivna uloga se sada sinhronizuje tokom stream-a: ako model krene u segment `[THINKER]`, `[REVIEWER]`, `[BUILDER]`, `[OBSERVER]` ili `[MEMORY CURATOR]`, levi role panel, desni session status i streaming poruka se uskladjuju odmah, ne tek posle kraja odgovora.
- Model switch audit zapis je normalizovan na ASCII `old->new` format i parser prihvata stare varijante (`->`, `→`, mojibake zapis), pa promena modela ostaje vidljiva u chatu i project session report-u.
- Release skripta sada prosledjuje argumente `gh`/`npm` komandama preko eksplicitnih named parametara, da deploy ne moze lazno proci prikazivanjem samo `gh` help-a.
- Verzija bumpovana na `1.0.24`.

### Validacija
- `npm.cmd run build` prolazi.

### Ostaje otvoreno
- `POKRENI FORGEKIT` treba dobiti jasniju post-init namenu.
- Re-Prime treba prosiriti u puniji handoff/state packet.
- NVIDIA provider timeout/fallback ostaje poseban provider task.

---

## [1.0.23] - 2026-05-21 - Runtime recovery i context handoff

### Stabilizacija
- Auto-start ForgeKit init nakon izbora ili kreiranja projektnog foldera kada je sesija prazna.
- Interni `[FORGEKIT_INIT]` vise se ne prikazuje kao korisnicka poruka.
- Popravljen role return: zavrseni Reviewer/Thinker/Observer tok moze da vrati runtime kontrolu Orchestrator-u.
- Re-Prime refresh sada salje forsirani project context handoff umesto samo UI stanja.
- Model switch divider se belezi za role-tagged sesije i ulazi u exported session report.
- Blokirani non-Builder file action moze da se prosledi Builder-u kao kontrolisani recovery tok.
- Bundled ForgeKit prompt sada eksplicitno zahteva Builder-only `PROJECT_WRITE_FILE` akcije i povratak Orchestrator-u posle ogranicene aktivacije uloge.

### Validacija
- `npm.cmd run build` prolazi.

---

## [1.0.22] - 2026-05-21 - Project file action guard i fazni parser

### Stabilizacija
- `PROJECT_WRITE_FILE` blok sada dobija izvor najblizeg validnog role segmenta u istoj assistant poruci, pa `[BUILDER]` segment unutar Orchestrator odgovora vise ne biva pogresno blokiran kao `ORCHESTRATOR`.
- Tekstualna potvrda tipa `potvrdjujem` vise ne moze da nastavi AI tok dok postoje `blocked`, `pending` ili `error` Project File Actions stavke; app upisuje sistemsku poruku i trazi stvarno resavanje panel akcija.
- Parser faza prepoznaje `Faza 1/2/3/4` i `Phase 1/2/3/4`, ukljucujuci naziv faze iza crtice, pa levi panel moze prikazati faze kada ih projektni tok definise prirodnim jezikom.
- Role tile-ovi u levom panelu sada imaju dvojnu funkciju: semafor aktivne uloge i dugme koje salje prirodan poziv tipa `Pozivam Reviewer.`, dok app interno koristi kontrolisani invoke signal.
- Export fajl je preimenovan iz `chat_export_...` u `project_session_report_...`, sa naslovom `ForgeKit Project Session Report`.
- Verzija bumpovana na `1.0.22`.

### Vazno ogranicenje v1.0.22
- Phase parser resava inicijalno prepoznavanje faza, ali ne resava refresh nakon potvrdjene izmene fazne strukture.
- Project File Actions guard sprecava lazni upis, ali jos nema pun recovery tok kada je aktivna uloga ostala Reviewer/Orchestrator umesto Builder.
- Role tile invoke radi za kontrolisani poziv uloge, ali role return posle zavrsene ogranicene aktivacije jos nije zatvoren.

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

## [1.0.19] - 2026-05-19 - Stream lifecycle i context refresh

### Stabilizacija
- Stop dugme sada stvarno prekida aktivni AI odgovor i odblokira sesiju.
- Provider, model i custom model kontrole su zakljucane dok agent generise odgovor.
- Main process podrzava `cancel-message` preko `AbortController` kontrole za aktivne AI zahteve.
- `Refresh ForgeKit kontekst` sada aktivno salje kratak interni re-prime zahtev modelu i vraca vidljivu potvrdu, umesto da samo ponovo oznaci `needs_refresh`.
- Dodat timeout za zahteve koji ne vrate prvi token u ocekivanom roku.

### Validacija
- `npm.cmd run build` prolazi.
- Cilj testa: tokom generisanja nije moguce menjati model; stop prekida odgovor; context refresh daje kratak Orchestrator odgovor kada nema aktivnog stream-a.

---

## Napomena o starijim verzijama

Stariji detaljan changelog ostaje u git istoriji. Ovaj fajl je konsolidovan za sledeci rad kako bi v1.0.23 plan bio cist i bez zastarelih encoding problema.
