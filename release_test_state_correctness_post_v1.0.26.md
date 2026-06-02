# State Correctness Regression Scenario - post-v1.0.26

## Svrha

Ovaj scenario proverava da app ne mesa placeholder faze, potvrdjene projektne faze, Re-Prime kontekst, korisnicke korekcije i Project File Actions stanje.

Scenario pokriva:

- `ISS-020` Phase Sync boundary
- `ISS-021` correction invalidation
- `ISS-022` security manifest boundary
- `ISS-016` Re-Prime structured handoff/state packet
- `ISS-027` objedinjeni state correctness regression tok

## Preduslovi

- App je pokrenut lokalno.
- Repo build prolazi pre testiranja.
- Postoji validan provider/model.
- Test projekat koristi novi prazan folder.
- Tester prati chat, Top State Bar, levi phase sidebar, desni SidePanel, Re-Prime preview i Project File Actions panel.

## Test 1 - Placeholder faze nisu projektne faze

1. Kreirati novi projekat bez potvrdjenih projektnih faza.
2. Ne potvrditi fazni okvir.
3. Pogledati levi phase sidebar, Top State Bar i Re-Prime preview.

Ocekivano:

- Levi phase sidebar ne prikazuje genericke ForgeKit faze kao projektne faze.
- Top State Bar sme da prikaze aktivnu app fazu, ali mora jasno reci da faza nije potvrdjena.
- Re-Prime preview ne sme tvrditi da su projektne faze sinhronizovane ako nema `PROJECT_PHASES_CONFIRMED` ili `PROJECT_PHASES_SYNCED`.

Fail:

- App zakljuca ili prikaze F1/F2/F3 kao projektni plan bez korisnicke potvrde.
- Re-Prime koristi placeholder faze kao source of truth.

## Test 2 - Potvrdjene faze postaju jedini phase source

1. U chatu traziti predlog projektnog faznog okvira za test projekat.
2. Potvrditi konkretne projektne faze kroz korisnicku odluku.
3. Proveriti levi phase sidebar, Top State Bar, SidePanel `Stanje faze` i Re-Prime preview.

Ocekivano:

- Phase sidebar prikazuje samo potvrdjene projektne faze.
- `phaseLockStatus` je `confirmed` ili `synced`, ne slobodna chat heuristika.
- Re-Prime preview nosi iste faze koje prikazuje sidebar.

Fail:

- Sidebar, Top State Bar i Re-Prime prikazuju razlicite faze.
- Genericki ForgeKit labeli se vrate nakon potvrdjene projektne odluke.

## Test 3 - Security manifest ne zakljucava arhitekturu

1. Zatraziti pripremu `project_security_manifest.md`.
2. U toku razgovora proveriti da li model pokusava da zakljuca stack, tenant model, data model, hosting ili faze kroz security manifest.
3. Ako nastane Project File Action za security manifest, proveriti njegov sadrzaj pre upisa.

Ocekivano:

- `project_security_manifest.md` zakljucava filesystem i bezbednosne granice rada nad fajlovima.
- Arhitektura, stack, tenant model, data model, hosting i faze ostaju odvojene Decision Lock teme.
- App ne tretira security manifest kao potvrdu projektne arhitekture.

Fail:

- Security manifest se koristi kao jedini dokaz za arhitekturnu odluku.
- Model ili UI tvrde da je arhitektura zakljucana bez posebnog Decision Lock-a.

## Test 4 - Korisnicka korekcija invalidira zavisne draftove

1. Dovesti app do pending Project File Action-a ili faznog/decision draft-a.
2. Uneti jasnu korisnicku korekciju, npr. `Ispravka: prethodna odluka nije tacna.`
3. Proveriti Project File Actions panel i context status.

Ocekivano:

- Pending ili writing file actions koji zavise od stare odluke prelaze u `requires_review` ili drugi review/recovery status.
- Context status prelazi u stanje koje trazi Re-Prime ili osvezenje.
- App ne dozvoljava tekstualnoj potvrdi u chatu da preskoci review.

Fail:

- Stari pending draft ostaje spreman za upis kao da korekcija ne postoji.
- Chat potvrda prolazi iako postoje stale/requires_review akcije.

## Test 5 - Re-Prime state packet posle korekcije

1. Nakon korisnicke korekcije otvoriti Re-Prime preview ili pokrenuti refresh konteksta.
2. Proveriti da li packet nosi stvarno stanje projekta.

Ocekivano:

- Re-Prime sadrzi aktivni projekat, aktivnu ulogu, phase state, potvrdjene faze ako postoje, pending/review file action signal i sledeci bezbedan korak.
- Re-Prime ne sme sakriti da postoje otvorena pitanja ili review/recovery zahtevi.

Fail:

- Re-Prime prikazuje samo osnovni meta status bez decision/file action konteksta.
- Re-Prime tvrdi da je sve synced kada postoji pending/requires_review stanje.

## Test 6 - Model/context health ne menja phase truth

1. Promeniti model tokom neaktivne sesije ili pokrenuti refresh context.
2. Proveriti context badge, Top State Bar i phase sidebar.

Ocekivano:

- `Kontekst: svez` ili `Kontekst: treba Re-Prime` govori samo o context health-u.
- Phase sidebar ostaje vezan za potvrdjene/sinhronizovane projektne faze.
- Model switch ne sme sam potvrditi faze.

Fail:

- Context synced badge se tumaci kao phase synced.
- Promena modela ili refresh context-a sama zakljuca projektne faze.

## Kriterijum prolaza

Scenario prolazi ako:

- placeholder/app faze nisu tretirane kao projektne faze;
- potvrdjene faze su jedini source za phase sidebar i Re-Prime phase context;
- security manifest ne zakljucava arhitekturu;
- korisnicka korekcija zastareva zavisne pending/write draftove;
- Re-Prime packet prikazuje stvarni state, otvorene rizike i recovery zahteve;
- context health i phase sync ostaju jasno odvojeni.

## Kriterijum za patch

Ako scenario padne, patch treba da bude usmeren na najmanji dokazani problem:

- Phase Sync display/state source
- correction invalidation
- security manifest guard copy/boundary
- Re-Prime packet enrichment
- context badge copy clarity

Ne raditi veliki runtime refactor bez posebnog App Layer scope-a.

