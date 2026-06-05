# Release Test Scenario - ForgeKit Interface v1.1.0

## Svrha

Ovaj scenario proverava v1.1.0 release: project save/clone tok, compact start, reference import, rucne Research/Premortem role, context guard UX, model routing prikaz i osnovne state correctness regresije.

## Preduslovi

- App je pokrenut lokalno ili kao instalirana update verzija.
- `package.json` verzija je `1.1.0`.
- Postoji bar jedan provider sa validnim API kljucem.
- Test projekat koristi novi ili ociscen folder.
- Tester prati chat, Top State Bar, levi role/phase panel, SidePanel, Project File Actions i projektni folder na disku.

## Test 1 - Compact start bez prevelikog init context-a

1. Kreirati novi projekat.
2. Izabrati provider/model u project setup-u.
3. Proveriti prvu poruku u chatu.
4. Ocekivano: app ne salje automatski full `[FORGEKIT_INIT]` payload modelu.
5. Ocekivano: nema pocetnog `CONTEXT GUARD` upozorenja za prazan novi projekat.
6. Ocekivano: Orchestrator daje kratak lokalni start ili prvi smislen intake signal.

## Test 2 - Project save pack

1. U projektu poslati bar jednu kratku poruku i dobiti odgovor.
2. Kliknuti `Snimi projekat`.
3. Otvoriti projektni folder.
4. Ocekivano: postoje ili su osvezeni:
   - `session.json`
   - `project_handoff.md`
   - `project_chat_transcript.md`
   - `project_security_manifest.md`
5. Ocekivano: sistemska poruka u chatu jasno kaze da je projekat snimljen.

## Test 3 - Close tab save modal

1. Kliknuti `x` na aktivnom projektnom tabu.
2. Ocekivano: prikazuje se custom modal sa jasnim opcijama:
   - `Snimi i zatvori`
   - `Samo zatvori`
   - `Otkazi`
3. Izabrati `Otkazi`.
4. Ocekivano: tab ostaje otvoren.
5. Ponoviti i izabrati `Snimi i zatvori`.
6. Ocekivano: project save pack se osvezava, zatim se tab zatvara.

## Test 4 - Restore postojeceg foldera

1. Pokrenuti app ponovo ili kreirati novi setup tok.
2. Izabrati `Odaberi postojeci folder`.
3. Izabrati folder koji sadrzi `session.json`.
4. Ocekivano: app ucitava postojece poruke, projekat, provider/model, reference i state bez slanja novog init-a modelu.
5. Ocekivano: nastavak rada krece iz istog konteksta, bez dupliranja projekta.

## Test 5 - Reference import ne salje ceo fajl

1. U aktivnom projektu importovati `.txt`, `.md` ili `.markdown` fajl.
2. Proveriti folder `references/`.
3. Ocekivano: fajl je kopiran u `references/`, a manifest je azuriran.
4. Ocekivano: SidePanel prikazuje referencu i preview.
5. Ocekivano: app ne salje ceo fajl modelu automatski.

## Test 6 - Rucni Research i Premortem invoke

1. Kliknuti `RESEARCH` role karticu.
2. Ocekivano: aktivna uloga u Top State Bar-u i levoj kartici prelazi na `RESEARCH` tokom odgovora.
3. Ocekivano: odgovor je nalaz u Research ulozi, ne Orchestrator labela.
4. Ponoviti za `PREMORTEM`.
5. Ocekivano: `PREMORTEM` ostaje aktivan tokom rizik nalaza, a Orchestrator dobija sledecu odluku posle role output-a.

## Test 7 - Chat auto-scroll tokom dugog odgovora

1. Pokrenuti duzi odgovor.
2. Dok odgovor streamuje, rucno skrolovati chat gore.
3. Ocekivano: app ne vraca korisnika nasilno na dno.
4. Skrolovati nazad na dno.
5. Ocekivano: auto-scroll ponovo prati kraj odgovora.

## Test 8 - Context guard i usage signal

1. Poslati kratak zahtev.
2. Ocekivano: SidePanel pokazuje `Kontekst` procenu i `OK` kada je payload mali.
3. Dovesti projekat do visokog, ali neblokirajuceg context-a.
4. Ocekivano: `watch` stanje prikazuje `Oprez`, ne crvenu gresku.
5. Poslati prevelik zahtev ili payload koji prelazi lokalni prag.
6. Ocekivano: app prikazuje `CONTEXT GUARD` i ne salje zahtev provider-u.

## Test 9 - Project File Actions regresija

1. Traziti Builder file action za mali `.md` fajl.
2. Ocekivano: chat potvrda ne zamenjuje stvarni panel upis.
3. Kliknuti `Upisi` u Project File Actions panelu.
4. Ocekivano: fajl postoji u projektnom folderu tek posle panel upisa.

## Test 10 - Provider/model routing prikaz

1. Izabrati NVIDIA provider.
2. Ocekivano: prikazuje se provider-local model recommendation sa razlogom i dugmetom `Primeni`.
3. Izabrati OpenAI ili Anthropic provider.
4. Ocekivano: NVIDIA-specific recommendation se ne prikazuje kao cross-provider preporuka.

## Kriterijum prolaza

v1.1.0 je spreman za GitHub Release ako:

- `npm.cmd run build` prolazi;
- app repo nema neocekivane tracked izmene posle commit-a;
- save/restore/close-tab tok radi bez gubitka projekta;
- Research/Premortem role kartice drze aktivnu ulogu tokom odgovora;
- context guard ne izgleda kao provider greska kada je samo oprez;
- imported reference fajlovi ostaju scoped i ne salju se modelu u celini;
- Project File Actions i dalje zahtevaju stvarni panel upis.

## Kriterijum odlaganja release-a

Release se odlaze ako:

- novi projekat opet automatski salje prevelik init payload;
- zatvaranje taba nema jasan izbor cuvanja;
- `Odaberi postojeci folder` ne vraca `session.json` state;
- Research/Premortem invoke ostaje labelovan kao Orchestrator tokom role output-a;
- auto-scroll onemogucava citanje dugog odgovora;
- context guard ponovo izgleda kao runtime/provider greska;
- Project File Actions tvrdi da je fajl upisan bez stvarnog panel upisa.
