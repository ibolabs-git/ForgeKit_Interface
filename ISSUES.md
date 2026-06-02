# ForgeKit Interface - Issues & Dopune

Evidencija poznatih gresaka, UI propusta i planiranih dopuna.
Svaki issue dobija ID, prioritet, opis i status.

Prioriteti:
- `KRITICNO` - blokira tok, moze izazvati pogresan zapis, gubitak stanja ili laznu potvrdu
- `VAZNO` - vidljiva greska ili runtime neuskladjenost
- `NICE` - UX poboljsanje ili kasnija nadogradnja

---

## Otvoreni issues za post-v1.0.26 ciklus

### [ISS-020] Phase Sync protokol ne razlikuje placeholder, confirmed, written i synced faze
- **Prioritet:** KRITICNO
- **Otkriveno:** v1.0.24 PulseFit test - 2026-05-23
- **Simptom:** Levi sidebar, session state i Re-Prime mogu tretirati genericke ForgeKit faze kao projektne faze. Model je na osnovu toga pogresno zakljucio da je "F1 fundament paket kompletan" i pitao za prelazak na "F2 ForgeKit Logika", sto nije projektna faza PulseFit-a.
- **Ocekivano:** App mora razlikovati app/setup placeholder faze od projektnih faza. Sidebar i Re-Prime smeju koristiti samo faze koje su potvrdjene kroz `PROJECT_PHASES_CONFIRMED` ili sinhronizovane kroz `PROJECT_PHASES_SYNCED`.
- **Status:** Otvoreno - post-v1.0.26 state correctness follow-up; v1.0.26 je popravio deo runtime/UX signala, ali pun regression scenario ostaje otvoren.

### [ISS-021] Korisnicka korekcija ne zastareva zavisne draftove i file actions
- **Prioritet:** KRITICNO
- **Otkriveno:** v1.0.24 PulseFit test - 2026-05-23
- **Simptom:** Kada korisnik ispravi odluku, raniji nacrti, pending file actions, fazni zakljucci ili taskovi mogu ostati vazeci iako zavise od pogresne odluke.
- **Ocekivano:** Korekcioni signali korisnika moraju oznaciti zavisne nacrte/file actions kao `requires_review` ili `stale`, osveziti context status i traziti novi Decision Lock ako korekcija utice na stack, faze, scope, arhitekturu ili dokumente.
- **Status:** Otvoreno - post-v1.0.26 file action invalidation follow-up.

### [ISS-022] project_security_manifest se pogresno koristi za zakljucavanje arhitekture
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.24 PulseFit test - 2026-05-23
- **Simptom:** Manifest moze sadrzati i zakljucati arhitekturne odluke kao row-level tenant model, JWT tenant ID ili hosting pre posebnog Decision Lock-a.
- **Ocekivano:** `project_security_manifest.md` zakljucava filesystem i bezbednosne granice rada nad fajlovima. Arhitektura, stack, tenant model, data model, faze i implementacioni scope smeju biti zakljucani samo kroz odvojeni Decision Lock i odgovarajuci projektni dokument.
- **Status:** Otvoreno - post-v1.0.26 Master/app Decision Lock uskladjivanje.

### [ISS-023] Projekat se ne cuva/obnavlja pouzdano pri gasenju taba ili prozora

- **Otkriveno:** post-v1.0.26 cleanup - 2026-06-02
- **Simptom:** Ranije planirana funkcija snimanja/obnove projekta pri gasenju taba ili prozora nije jasno dostupna kao pouzdan runtime guarantee.
- **Ocekivano:** Zatvaranje taba/prozora ne sme izgubiti aktivni project/session state. App treba da ima jasan save/restore path ili eksplicitno upozorenje ako state nije sacuvan.
- **Status:** Implementirano - ceka runtime close/reopen regression test. Patch dodaje immediate session/tab persistence flush pri promeni taba, zatvaranju taba i zatvaranju prozora.

### [ISS-028] Close tab/project flow nema backup i handoff potvrdu

- **Otkriveno:** post-v1.0.26 runtime test - 2026-06-02
- **Simptom:** Osnovni persistence flush cuva state u pozadini, ali zatvaranje taba/prozora jos nema kontrolisan korisnicki izbor za snimanje projekta, kreiranje backup-a ili automatski handoff zapis.
- **Ocekivano:** Pri zatvaranju taba ili projekta app treba da prikaže kontrolisani close guard kada postoji aktivan projekat, pending state, file actions ili nesnimljen handoff. Korisnik treba jasno da bira izmedju opcija kao sto su `Sacuvaj projekat`, `Sacuvaj + kreiraj handoff`, `Kreiraj backup`, `Zatvori bez cuvanja` i `Otkazi`.
- **Status:** Otvoreno - post-v1.0.26 UX/governance follow-up; ne mesati sa ISS-023 baseline persistence flush-om.

### [ISS-024] Token/model usage i performance prikaz nisu implementirani

- **Otkriveno:** post-v1.0.26 cleanup - 2026-06-02
- **Simptom:** Planirano pracenje tokena, model usage-a i performance signala nije bilo vidljivo kao app funkcija. Runtime test je pokazao i OpenAI `429` TPM gresku kada je zahtev procenjen na previse tokena.
- **Ocekivano:** App treba da prikaze osnovne usage/performance signale po modelu/session-u kada ti podaci postoje, bez uvodjenja lazne preciznosti ili teskog dashboard-a. Kada nema provider usage metadata, dozvoljena je jasno oznacena procena konteksta.
- **Status:** Implementirano v1 - ceka runtime proveru. SidePanel prikazuje procenu tokena za poslednji request/response, a slanje se zaustavlja kada procena konteksta predje konzervativni high prag.

### [ISS-025] Project session report nema pun decision/state/memory model

- **Otkriveno:** post-v1.0.26 cleanup - 2026-06-02
- **Simptom:** Export je vec postao Project Session Report, ali jos nije pun decision-support packet sa odlukama, file action statusima, model switch signalima, memory signalima i otvorenim pitanjima.
- **Ocekivano:** Report treba da bude koristan za nastavak rada i review, ne samo formatiran chat export.
- **Status:** Otvoreno - post-v1.0.26 report enrichment follow-up.

### [ISS-026] Provider/model setup nema runtime validation prema stvarnom katalogu

- **Otkriveno:** post-v1.0.26 cleanup - 2026-06-02
- **Simptom:** Provider/model setup UX je prosiren, ali treba potvrditi runtime validaciju protiv stvarnog provider/model kataloga i fallback ponasanja.
- **Ocekivano:** Izbor modela u setup-u treba da bude proverljiv, validan i uskladjen sa runtime provider health signalom.
- **Status:** Otvoreno - post-v1.0.26 provider setup validation follow-up.

### [ISS-027] State correctness regression scenario ne postoji kao objedinjeni test tok

- **Otkriveno:** post-v1.0.26 cleanup - 2026-06-02
- **Simptom:** Phase Sync, Re-Prime, correction invalidation i security manifest boundary postoje kao pojedinacni problemi, ali nema jednog regression scenario-a koji proverava ceo state correctness tok.
- **Ocekivano:** Dodati regresioni scenario koji zajedno proverava phase state, Re-Prime handoff, stale/pending file actions i security manifest granicu.
- **Status:** Otvoreno - post-v1.0.26 regression test follow-up.
### [ISS-016] Re-Prime kontekst nije pravi handoff/state paket
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.22 test - 2026-05-21
- **Simptom:** `RE-PRIME KONTEKST` prikazuje osnovni status sesije, ali ne ukljucuje kljucne zakljucke iz dotadasnjeg razgovora.
- **Ocekivano:** Re-Prime treba da radi kao mini handoff za nastavak rada ili promenu modela: cilj, potvrdjene odluke, pretpostavke, otvorena pitanja, poslednji relevantan output, sledeci korak i zabrane/granice.
- **Status:** Otvoreno - prosiriti `buildProjectContext`/Re-Prime logiku u structured handoff/state packet.

### [ISS-012] Dugme `POKRENI FORGEKIT` ostaje primarna akcija i kada je rezim vec aktivan
- **Prioritet:** NICE
- **Otkriveno:** v1.0.22 test - 2026-05-21
- **Simptom:** Nakon uspesnog init-a dugme i dalje izgleda kao primarni start rezima.
- **Ocekivano:** Kada je ForgeKit init vec uradjen, dugme treba da promeni stanje ili namenu, npr. `ForgeKit aktivan`, `Osvezi ForgeKit kontekst` ili `Ponovo ucitaj instrukcije`.
- **Status:** Otvoreno - uskladiti label i ponasanje dugmeta sa stvarnim init stanjem.

### [ISS-011] Intake pitanje ponekad postaje predugacko
- **Prioritet:** NICE
- **Otkriveno:** v1.0.22 test - 2026-05-21
- **Simptom:** Orchestrator postavlja dobra pitanja, ali neka pitanja kombinuju previse objasnjenja i vise implicitnih odluka u jednoj poruci.
- **Ocekivano:** Intake pitanja treba da budu kratka: jedna odluka po poruci, uz najvise jednu kratku recenicu obrazlozenja.
- **Status:** Otvoreno - doraditi prompt/guidance za kraca intake pitanja u ForgeKit app kontekstu.

### [ISS-004] NVIDIA modeli povremeno ne vrate odgovor u ocekivanom roku
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.19/v1.0.20 - 2026-05-20
- **Simptom:** Pojedini NVIDIA NIM modeli, posebno veci reasoning modeli, mogu ostati bez vidljivog odgovora do timeout-a.
- **Ocekivano:** Provider treba da vrati jasan timeout/fallback status i predlog brzeg modela.
- **Status:** Otvoreno - provider-level timeout/fallback ponasanje i model health signal.

### [ISS-005] Project File Actions blokirani predlog nije dovoljno objasnjen korisniku
- **Prioritet:** NICE
- **Otkriveno:** v1.0.20 - 2026-05-20
- **Simptom:** Blokirana putanja se prikaze kao bezbednosni nalaz, ali korisniku nije dovoljno jasno cemu panel sluzi i sta treba da uradi.
- **Ocekivano:** Dodati helper tekst, tooltip ili recovery akciju.
- **Status:** Otvoreno - dodati objasnjenje za `blocked` status.

---

## Zatvoreni issues

### [ISS-017] Phase sidebar se ne osvezava posle potvrdjene izmene faza
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.22 PulseFit test - 2026-05-21
- **Simptom:** Inicijalne faze se prikazu u levom sidebar-u, ali nakon Reviewer/Premortem predloga i korisnicke potvrde nove fazne strukture sidebar ostaje na starom modelu.
- **Resenje:** Parser vise nije ogranicen na `F1-F4`; prepoznaje `F<number>`, `Faza/Phase <number>` i verzijske faze tipa `v1.0 - Core Operations`.
- **Status:** Delimicno zatvoreno - v1.0.24 parser; dublji Phase Sync problem prati se kroz ISS-020.

### [ISS-006] Spontani role tag u AI odgovoru ne uskladjuje runtime ulogu
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.21 test - 2026-05-21
- **Simptom:** Model moze u odgovoru sam zapoceti segment kao `[THINKER]`, dok UI i dalje prikazuje `ORCHESTRATOR MODE` ili prethodnu runtime ulogu.
- **Resenje:** Streaming token parser sada detektuje poslednji validni role tag tokom odgovora i odmah uskladjuje aktivnu ulogu, poruku i session status.
- **Status:** Zatvoreno - v1.0.24

### [ISS-019] Validan PROJECT_WRITE_FILE se blokira zbog zaglavljene uloge
- **Prioritet:** KRITICNO
- **Otkriveno:** v1.0.22 PulseFit test - 2026-05-21
- **Simptom:** `PROJECT_WRITE_FILE` za `project_security_manifest.md` je blokiran jer app dozvoljava file action samo iz `BUILDER` izvora, dok je runtime ostao u Reviewer modu nakon Reviewer/Premortem provere.
- **Ocekivano:** Posle Reviewer provere kontrola treba da se vrati Orchestrator-u, zatim Builder treba da pripremi pending write; validan dokument ne sme biti blokiran zbog zastarele `activeRole` vrednosti.
- **Status:** Zatvoreno - v1.0.23

### [ISS-018] Role ostaje zaglavljen na Reviewer posle zavrsene provere
- **Prioritet:** KRITICNO
- **Otkriveno:** v1.0.22 PulseFit test - 2026-05-21
- **Simptom:** Reviewer/Premortem se pravilno aktivira, ali nakon zavrsene provere i prelaska na Orchestrator odluke UI i chat label ostaju u Reviewer modu.
- **Ocekivano:** Kada se Reviewer output zavrsi i Orchestrator nastavi tok, aktivna uloga, chat label, levi badge i session status treba da se vrate na Orchestrator.
- **Status:** Zatvoreno - v1.0.23

### [ISS-015] Model switch divider se vise ne vidi u chat/report toku
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.22 test - 2026-05-21
- **Simptom:** Promena modela se vidi u desnom panelu, ali u chat toku vise nije jasno prikazana linija tipa `Model promenjen - old -> new`.
- **Ocekivano:** Svaka promena providera/modela tokom aktivne sesije treba da upise nenametljiv divider u chat/report tok, bez slanja tog divider-a modelu kao AI kontekst.
- **Status:** Zatvoreno - v1.0.23

### [ISS-014] Novi projekat ne pokrece ForgeKit init automatski
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.22 test - 2026-05-21
- **Simptom:** Nakon kreiranja novog projekta i izbora projektnog foldera Orchestrator se ne oglasava sam.
- **Ocekivano:** ForgeKit Interface je namenski ForgeKit alat; novi projekat treba automatski da ucita minimalni ForgeKit kontekst i pokrene kratak Orchestrator uvod sa prvim intake pitanjem.
- **Status:** Zatvoreno - v1.0.23

### [ISS-013] Interni `[FORGEKIT_INIT]` se prikazuje kao korisnicka poruka
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.22 test - 2026-05-21
- **Simptom:** Klik na `POKRENI FORGEKIT` upisuje vidljiv korisnicki message `[FORGEKIT_INIT]`.
- **Ocekivano:** Init signal treba biti interna/system akcija. Korisnik treba da vidi samo kratak Orchestrator uvod.
- **Status:** Zatvoreno - v1.0.23

### [ISS-010] Export naziv i naslov chat_export ne opisuje stvarnu vrednost izvestaja
- **Prioritet:** NICE
- **Resenje:** Export sada koristi naziv `project_session_report_...` i naslov `ForgeKit Project Session Report`.
- **Status:** Zatvoreno - v1.0.22

### [ISS-009] App dozvoljava lazno procesno stanje posle blokiranih file actions
- **Prioritet:** KRITICNO
- **Resenje:** Tekstualna potvrda se zaustavlja ako postoje `blocked`, `pending` ili `error` file action stavke; app upisuje sistemsku poruku i trazi stvarno resavanje kroz panel.
- **Status:** Zatvoreno - v1.0.22

### [ISS-008] Project File Actions ne prepoznaje BUILDER segment unutar ORCHESTRATOR poruke
- **Prioritet:** VAZNO
- **Resenje:** File action parser sada koristi najblizi prethodni validan role segment kao izvor akcije.
- **Status:** Zatvoreno - v1.0.22

### [ISS-007] Parser faza ne prepoznaje tekstualni oblik `Faza 1`
- **Prioritet:** VAZNO
- **Resenje:** Parser prepoznaje `Faza 1/2/3/4` i `Phase 1/2/3/4`, ukljucujuci naziv faze iza crtice.
- **Status:** Zatvoreno - v1.0.22

### [ISS-003] Levi panel prerano prikazuje hardkodovane faze
- **Prioritet:** VAZNO
- **Resenje:** Levi panel prikazuje faze tek kada se detektuju u projektnom toku ili taskovima.
- **Status:** Zatvoreno - v1.0.21/v1.0.22

### [ISS-002] Runtime uloga i role badge mogu se razici pri invoke toku
- **Prioritet:** VAZNO
- **Resenje:** `INVOKE` i prirodni role tile pozivi postavljaju runtime ulogu pre starta assistant poruke.
- **Status:** Zatvoreno - v1.0.21/v1.0.22

### [ISS-001] Font - dijakriticka slova ne renderuju u SessionSummaryModal
- **Prioritet:** VAZNO
- **Resenje:** Summary content koristi Inter fallback i podrzava latin-ext.
- **Status:** Zatvoreno - v1.0.1

---

## Regresioni testovi koji ostaju obavezni

- Stop dugme prekida aktivni odgovor.
- Promena modela nije dozvoljena dok agent generise odgovor.
- Project File Actions ne smeju tvrditi da je fajl upisan dok app ne potvrdi stvarni upis.
- Role badge, chat label i session status moraju ostati uskladjeni.
- Phase sidebar se menja samo nakon potvrdjene ili sinhronizovane projektne fazne odluke.
- Re-Prime kontekst mora nositi isti `projectPhases` i `phaseLockStatus` koji prikazuje sidebar.
- Korekcija korisnika mora oznaciti zavisne pending file actions kao `requires_review`.
- `project_security_manifest.md` ne sme zakljucati arhitekturu, stack, tenant model, data model ili faze bez posebnog Decision Lock-a.

---

*Kreiran: v0.9.5 - 2026-05-19*  
*Konsolidovano: v1.0.23 planning - 2026-05-21*
