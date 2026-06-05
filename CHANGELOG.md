# Changelog - ForgeKit Interface App

Sve verzije su dostupne na [GitHub Releases](https://github.com/ibolabs-git/ForgeKit_Interface/releases).

Format: `[verzija] - datum - opis`

---

## [Unreleased] - sledeci ciklus

### Promenjeno
- NVIDIA model pool je prosiren na 10 preporucenih NIM modela, sa labelima za Orchestrator, Strategy, Builder, Thinker, Reviewer, Premortem, Research, rutinu i fallback tokove.
- NVIDIA default model je pomeren na `nvidia/nemotron-3-super-120b-a12b` kao primarni Orchestrator/agentic kandidat; runtime smoke test dostupnosti ostaje poseban gate pre release-a.
- SidePanel sada prikazuje vidljiv `NVIDIA routing predlog` samo kada je aktivan NVIDIA provider, sa razlogom i rucnom `Primeni` akcijom bez automatskog prebacivanja modela.
- Prevelik context payload se sada prikazuje kao `CONTEXT GUARD` obavestenje i `Kontekst` procena, da ne izgleda kao provider/runtime greska.
- Novi projekat sada koristi lokalni compact Orchestrator welcome bez API poziva, umesto automatskog full `[FORGEKIT_INIT]` slanja modelu.
- Project reference import dodat je kao v1 tok: `.txt`, `.md` i `.markdown` fajlovi mogu da se kopiraju u `references/` folder aktivnog projekta, uz lokalni manifest, SidePanel listu, preview i ograniceni excerpt tok.
- Project save/clone flow dodat je kao v1 tok: `Snimi projekat` upisuje `session.json`, `project_handoff.md` i `project_chat_transcript.md`, zatvaranje taba prikazuje izbor `Snimi i zatvori`, `Samo zatvori` ili `Otkazi`, a `Odaberi postojeci folder` ucitava postojeci `session.json` bez pokretanja novog init-a.

### Otvoreno
- Napredniji backup profil i dodatne opcije pakovanja projekta ostaju follow-up ako se potvrdi potreba.
- Token/model usage signal ima v1 procenu u SidePanel-u; full provider usage metadata ostaje buduci follow-up ako provider interfejs pocne da je vraca.
- Scoped instruction load ostaje follow-up: relevantne Master/mentor instrukcije treba ucitavati selektivno nakon sto korisnik definise cilj ili kada tok trazi Re-Prime/Governed kontekst.
- Re-Prime treba dalje prosiriti u puniji handoff/state packet sa potvrdjenim odlukama, otvorenim pitanjima i pending file action stanjem.
- NVIDIA timeout/fallback stabilizacija ostaje posebna provider tema.
- Project session report treba dalje obogatiti odlukama, file action statusima i memory signalima.
- Napredni scoped section picker, full summary i Research Packet tok za importovane reference fajlove ostaju follow-up; v1 reference tok ne salje ceo fajl modelu.
- U glavni ForgeKit repo treba uvesti `ForgeKit_handoff_mentor_vodic_za_novi_start.md` kao inicijalni mentor/handoff dokument ako se potvrdi kao standard.

---

## [1.0.28] - 2026-06-04 - Creue Mod left panel action

### UX / app
- Levo dugme `Pokreni ForgeKit` je zamenjeno akcijom `Creue Mod`, jer ForgeKit app vise ne treba da izgleda kao da korisnik mora rucno da pokrene osnovni rezim.
- `Creue Mod` pokrece kratak pregled trenutnog toka iz tri ugla: proces, kvalitet i rizik, bez izmene fajlova i sa sledecom odlukom za Orchestrator.
- Stari full init tok ostaje vezan za interne/init mehanizme; compact boot i prevelik init context ostaju poseban follow-up.

### Release / update
- Verzija je bumpovana na `1.0.28` za instalacioni update test.

---

## [1.0.27] - 2026-06-04 - State correctness cleanup i Master docs baseline

### Runtime / app
- Project/session persistence je runtime potvrdjen: restart app-a vraca aktivni tab, projekat, poruke i session/token state.
- Token/model usage signal je dodat kao v1 procena u SidePanel-u; kratki zahtev prolazi, a prevelik context payload se zaustavlja pre provider 429 greske.
- Phase parser prihvata `PROJECT_PHASES_CONFIRMED` i `PROJECT_PHASES_SYNCED` tagove sa optional project atributom, a korisnicka potvrda faza moze potvrditi najskoriji fazni predlog iz istorije, `Faza/F` formata ili numerisane liste.
- Runtime je potvrdio contextual kratke potvrde kao `da`, `moze`, `kreni` i `prihvatam` kada prethodna poruka trazi potvrdu faza.
- Runtime test je potvrdio ISS-027 state correctness tok: Re-Prime/context continuity cuva potvrdjene faze, canonical `PROJECT_WRITE_FILE` ide kroz Project File Actions panel, chat potvrda ne zamenjuje stvarni upis, panel `Upisi` pravi fajl, a `project_security_manifest.md` ne zakljucava stack, faze, arhitekturu ili v1 scope.

### Dokumentacija / release
- Verzija je bumpovana na `1.0.27` za instalacioni update test preko GitHub Release-a.
- App issue ledger i changelog su uskladjeni sa runtime validacijom za ISS-023, ISS-024, ISS-027, ISS-028 i ISS-029.
- Release se testira uz najnoviji pushovani Master docs baseline `ForgeKit_tool@1773be0`, koji ukljucuje Research layer, Skill Change governance, record routing cleanup i pre-FLE cleanup plan.

---

## [1.0.26] - 2026-05-26 - Operational truth UX i runtime state

### Stabilizacija
- Dodata je operational Top State Bar kao stalni signal stvarnog runtime stanja: aktivni projekat, role, phase state i Project File Actions stanje vise nisu sakriveni samo u pojedinacnim panelima.
- Project File Actions Recovery je prosiren tako da blokirane ili zastarele akcije mogu da se vrate u kontrolisan tok, umesto da korisnik dobije laznu procesnu potvrdu ili zaglavljen panel.
- Phase State UX/runtime state je stabilizovan: phase header, sidebar i runtime phase signal sada se bolje oslanjaju na potvrdjeno stanje, a ne na privremene ili genericke ForgeKit faze.
- Re-Prime/Handoff phase context sada nosi vise operativne istine o fazama i stanju rada, sto olaksava nastavak nakon promene modela ili osvezavanja konteksta.
- Detekcija povratka Orchestrator-u je ojacana, pa se runtime kontrola moze vratiti iz ogranicenih role tokova bez ostavljanja UI-ja u zastareloj ulozi.
- Correction/file action review guard ukljucuje review statuse: korisnicke korekcije i `requires_review` stanja ne prolaze kao da su file actions spremne ili vec potvrdjene.
- Provider/model setup UX je prosiren tako da se provider i model mogu izabrati vec tokom project setup toka.
- Operational state copy je razjasnjen kako bi Top State Bar komunicirao stanje bez pogresnog signala o zavrsenosti rada.
- Verzija je bumpovana na `1.0.26`.

### Release / update
- GitHub Release `v1.0.26` je kreiran za app repo `ForgeKit_Interface`.
- Instalirana `1.0.24` aplikacija je uspesno prepoznala i instalirala update `1.0.24 -> 1.0.26`.

### Validacija
- `npm.cmd run build` prolazi.
- Pre-push i release gate provere su potvrdile cist app repo status pre distribucije.
- Release asset tok je potvrdjen kroz GitHub Release i installed update proveru.

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
