# Task Lista

## Projekat
ForgeKit Interface App

## Poslednje azurirano
2026-05-22

## Nivo
STANDARD

---

## Status osnovnih faza

| Faza | Status |
|---|---|
| F1 - Fundament | Zavrseno |
| F2 - ForgeKit Logika | Zavrseno |
| F3 - Multi-model | Zavrseno |
| GitHub Integracija | Zavrseno |
| Agent Role Grid + Invoke | Zavrseno |
| READ_TEMPLATE mehanizam | Zavrseno |

---

## Zavrseno u v1.0.22

- [x] Project File Actions podrzava segment-level role source za `[PROJECT_WRITE_FILE]` unutar `[BUILDER]` segmenta.
- [x] Write-state guard sprecava nastavak toka tekstualnom potvrdom dok postoje nerazresene file action stavke.
- [x] Parser faza prepoznaje `Faza 1/2/3/4`, `Phase 1/2/3/4` i naziv faze iza crtice.
- [x] Role tile-ovi rade kao semafor i dugme; klik salje prirodan poziv ulozi, a app ga interno mapira na runtime invoke.
- [x] Export je preimenovan u `project_session_report_...`.
- [x] Stop dugme i blokada promene modela tokom generisanja ostaju obavezni regresioni testovi.

Napomena: v1.0.22 nije resio role return, Builder file-action recovery, Re-Prime state packet, model switch divider, niti confirmed phase refresh.

---

## v1.0.23 - P0 runtime blockeri

- [x] Popraviti role return posle ogranicene aktivacije Reviewer/Premortem/Thinker/Observer uloge.
- [x] Uvesti ekvivalentni runtime signal kroz poslednji validni role tag i prompt pravilo povratka na Orchestrator-a.
- [x] Vratiti chat label, active role badge i session status na Orchestrator kada Orchestrator nastavi tok.
- [x] Popraviti `PROJECT_WRITE_FILE` ownership nakon role handoff-a kroz Builder recovery tok.
- [x] Ako Orchestrator/Reviewer predlozi file action, app nudi `Prosledi Builder-u` umesto samo blokade.
- [x] Builder postaje validan source za pending write kroz kontrolisano prosledjivanje blokirane akcije.
- [x] Phase sidebar mora da se osvezi nakon potvrdjene fazne odluke i da podrzi faze van starog `F1-F4` modela.

## v1.0.23 - P1 init/context flow

- [x] Auto-init ForgeKit rezima pri kreiranju/izboru projektnog foldera, bez rucne poruke ili klika.
- [x] Sakriti interni `[FORGEKIT_INIT]` iz chat toka i prikazati samo Orchestrator uvod.
- [ ] Promeniti stanje dugmeta `POKRENI FORGEKIT` nakon init-a u `Osvezi ForgeKit kontekst` ili slicno.
- [x] Re-Prime dugme sada forsira slanje project context handoff-a; puniji state packet sa potvrdjenim odlukama ostaje za v1.0.24.
- [x] Vratiti model switch divider u chat/report tok kao audit trag promene modela.

## v1.0.24 - P0 stabilizacija posle PulseFit testa

- [x] Prosiriti phase parser na proizvoljan broj `F<number>` faza.
- [x] Prepoznati verzijske faze tipa `v1.0`, `v1.1`, `v1.2`, `v2` i prikazati ih u levom phase sidebar-u.
- [x] Sinhronizovati aktivnu ulogu tokom stream-a kada model u odgovoru otvori novi role segment.
- [x] Uskladiti role badge, levi role semafor i desni session status tokom dugih odgovora, ne samo na kraju poruke.
- [x] Normalizovati model switch zapis na `old->new` i sacuvati kompatibilnost sa starim zapisima.
- [x] Proveriti da `project_session_report` i dalje prikazuje promene modela kao audit trag.
- [x] Ispraviti release skriptu da `gh auth status` i `gh release create` dobijaju stvarne argumente, ne prazan `gh` poziv.

## v1.0.24 - Ostaje za sledeci ciklus

- [ ] Preimenovati/repurpose dugme `POKRENI FORGEKIT` posle init-a.
- [ ] Prosiriti Re-Prime u pravi handoff/state packet: cilj, odluke, otvorena pitanja, pending file actions, sledeci korak.
- [ ] NVIDIA timeout/fallback: razlikovati timeout, rate limit, provider error i model_not_found.
- [ ] Project session report obogatiti file action statusima i memory signalima.
- [ ] Uvesti `ForgeKit_handoff_mentor_vodic_za_novi_start.md` u glavni ForgeKit repo kao provereni inicijalni handoff dokument.
- [ ] Dokumentovati Creue Real / sub-agent runtime mehanizam u ForgeKit Tool master dokumentaciji.
- [ ] Razdvojiti app zadatke od ForgeKit Tool zadataka u trajnom razvojnom tracker-u.

## v1.0.23 - P1 provider/report stabilizacija

- [ ] Stabilizovati NVIDIA provider timeout/fallback i jasnije prikazati kada model ne vraca odgovor.
- [ ] Razlikovati timeout, rate limit, provider error i model_not_found.
- [ ] Dodati fallback preporuku za brzi model.
- [ ] U session report ukljuciti provider/model promene, timeout i file action status.

## v1.0.23 - dokumentacija

- [x] Odrzati vezu `ISSUES.md -> task_list.md -> CHANGELOG.md -> test scenario`.
- [ ] Azurirati README za NVIDIA provider, project session report i auto-init tok.
- [ ] Azurirati DEV/DEVELOPMENT da ne vode zastarele probleme kao aktivne.
- [ ] Azurirati handoff dokument sa role return i Builder-owned file action pravilima.
- [ ] Azurirati technical notes sa Re-Prime state packet i model switch divider pravilima.

## Kasnije nadogradnje

- [ ] Auto-zatvaranje i deduplikacija taskova kada AI vrati zavrsen task koji vec postoji u task listi.
- [ ] Pracenje potrosnje i performansi po modelu: procena tokena, vreme do prvog tokena, ukupno vreme odgovora i timeout broj.
- [ ] Project phase editor evidentirati kao buducu nadogradnju; za sada faze ostaju automatski detektovane iz toka i taskova.
- [ ] Ollama provider za lokalne modele.
- [ ] Token counter u SidePanel-u.
- [ ] Keyboard shortcut za invoke ulogu (Ctrl+1..6).
- [ ] Vise-tabni FSSL / multi-agent shared state model.

---

## Regresioni scenario v1.0.23

1. Kreirati novi projekat.
2. Proveriti da se ForgeKit init pokrece automatski.
3. Proveriti da `[FORGEKIT_INIT]` nije vidljiv kao user poruka.
4. Voditi PulseFit-like intake do faza.
5. Potvrditi faze i proveriti sidebar.
6. Pozvati Reviewer/Premortem.
7. Proveriti role badge i mode.
8. Proveriti da se role vraca Orchestrator-u nakon nalaza.
9. Pokrenuti file action za `project_security_manifest.md`.
10. Proveriti da Builder preuzima file action.
11. Potvrditi upis i proveriti da fajl zaista postoji.
12. Promeniti model.
13. Proveriti model switch divider.
14. Kliknuti Re-Prime / Refresh i proveriti da status predje u synced.
15. Testirati Stop dugme.
16. Pokusati promenu modela tokom generisanja i potvrditi da je blokirana.
17. Exportovati project session report.
18. Proveriti da report sadrzi odluke, faze, role, model switch, file actions i eventualne memory signale.


---

## Rezultat v1.0.23 patch-a

- [x] Build prolazi posle runtime izmena.
- [x] Dokumentovan test scenario u `release_test_v1.0.23.md`.
- [ ] Release/package/push izvrsiti nakon pregleda diff-a i korisnicke potvrde.

