# Release Test Scenario - ForgeKit Interface v1.0.24

## Svrha

Ovaj scenario proverava ispravke uvedene posle v1.0.23 testa: dinamicke faze, live role sync tokom stream-a i audit trag promene modela.

## Preduslovi

- App je pokrenut lokalno.
- Postoji bar jedan provider sa validnim API kljucem.
- Test projekat koristi novi prazan folder.
- Tester prati chat, levi role panel, desni session panel, phase sidebar, model switch divider i export/report.

## Test 1 - Dinamicke faze

1. Kreirati novi projekat i pustiti ForgeKit init.
2. Voditi PulseFit-like intake do fazne odluke.
3. Neka model predlozi faze u obliku:
   - `v1.0 - Core Operations`
   - `v1.1 - Exercise Sets`
   - `v1.2 - Reminders & Notifications`
   - `v2 - Platform Growth`
4. Potvrditi fazni model u razgovoru.
5. Ocekivano: levi phase sidebar prikazuje nove faze iz projekta, a ne stare hardkodovane faze.
6. Ocekivano: faze su sortirane redom i vidljive kao F1/F2/F3... labela sa stvarnim nazivom.

## Test 2 - Live role sync tokom stream-a

1. U aktivnom projektu pozvati `Thinker` prirodnom porukom ili pustiti Orchestrator-a da kaze da aktivira Thinker-a.
2. Dok odgovor jos streamuje i pojavi se `[THINKER]`, pogledati levi role panel i desni session status.
3. Ocekivano: aktivna uloga prelazi na Thinker tokom stream-a.
4. Ponoviti za `Reviewer` ili `Memory Curator`.
5. Ocekivano: role badge poruke, levi semafor i desni session status ostaju uskladjeni.

## Test 3 - Role return regresija

1. Pozvati Reviewer/Premortem za proveru faza.
2. Ocekivano: Reviewer se aktivira.
3. Kada Orchestrator nastavi posle nalaza, proveriti role status.
4. Ocekivano: UI se vraca na Orchestrator kada Orchestrator nastavi tok.

## Test 4 - Model switch audit trag

1. Tokom neaktivne sesije promeniti model ili provider.
2. Ocekivano: chat prikazuje divider u obliku `Model promenjen - old -> new`.
3. Exportovati project session report.
4. Ocekivano: report sadrzi isti model switch trag.
5. Ocekivano: stari zapisi sa strelicom `→` i dalje se korektno prikazuju ako postoje u staroj sesiji.

## Test 5 - File action guard regresija

1. Traziti pripremu `PulseFit/project_security_manifest.md`.
2. Ako akcija nije iz Builder izvora, proveriti da app ne tvrdi da je fajl upisan.
3. Proslediti Builder-u kroz recovery tok ako je potrebno.
4. Potvrditi pending write kroz Project File Actions panel.
5. Ocekivano: fajl zaista postoji u projektnom folderu tek posle app potvrde.

## Test 6 - Stop i model lock regresija

1. Pokrenuti duzi odgovor.
2. Pokusati promenu modela tokom generisanja.
3. Ocekivano: promena modela je blokirana dok agent radi.
4. Kliknuti Stop.
5. Ocekivano: odgovor se prekida i input se odblokira.

## Kriterijum prolaza

v1.0.24 je spreman za release ako:

- phase sidebar prikazuje realne projektne faze van starog F1-F4 okvira;
- aktivna uloga se menja tokom stream-a kada model otvori validan role segment;
- model switch divider ostaje vidljiv u chat/report toku;
- v1.0.23 regresije ostaju zatvorene.

## Kriterijum odlaganja release-a

Release se odlaze ako:

- sidebar ostane na starim fazama posle potvrdjene fazne odluke;
- levi role panel i desni session status prikazuju razlicite uloge tokom aktivnog odgovora;
- promena modela vise nije vidljiva u report-u;
- Stop/model lock ili Builder-owned file action ponovo regrediraju.
