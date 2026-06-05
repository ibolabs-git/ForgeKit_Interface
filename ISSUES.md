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
- **Status:** Runtime potvrdjeno za confirmation path - parser prihvata `PROJECT_PHASES_CONFIRMED` i `PROJECT_PHASES_SYNCED` tagove sa optional atributom, npr. `[PROJECT_PHASES_CONFIRMED: StateCheck]`. Dodat je fallback koji na korisnicku potvrdu faza trazi najskoriji fazni predlog u istoriji i potvrdjuje ga iz `Faza/F` formata ili obicne numerisane liste. Kratke potvrde kao `da`, `moze`, `kreni` i `prihvatam` rade samo kada prethodna assistant poruka eksplicitno trazi potvrdu faza.

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
- **Status:** Runtime potvrdjeno - restart app-a je vratio aktivni tab, projekat, poruke i session/token state. Close guard sa backup/handoff izborom prati se odvojeno kroz ISS-028.

### [ISS-028] Close tab/project flow nema backup i handoff potvrdu

- **Otkriveno:** post-v1.0.26 runtime test - 2026-06-02
- **Simptom:** Osnovni persistence flush cuva state u pozadini, ali zatvaranje taba/prozora jos nema kontrolisan korisnicki izbor za snimanje projekta, kreiranje backup-a ili automatski handoff zapis. Runtime test v1.0.28 je potvrdio da klik na zatvaranje taba samo snimi session, bez pitanja korisniku; u projektnom folderu ostaju samo osnovni fajlovi kao `session.json` i `project_security_manifest.md`.
- **Ocekivano:** Pri zatvaranju taba ili projekta app mora da pita da li korisnik zeli da sacuva projekat. Ako korisnik izabere cuvanje, app treba da spakuje handoff i pratecu projektnu dokumentaciju u projektni folder, tako da se projekat kasnije moze nastaviti iz tog direktorijuma ili iz postojece opcije `Odaberi postojeci folder`. Korisnik treba jasno da bira izmedju opcija kao sto su `Sacuvaj projekat`, `Sacuvaj + kreiraj handoff`, `Kreiraj backup`, `Zatvori bez cuvanja` i `Otkazi`.
- **Status:** Implementirano v1 - dodat je zajednicki project save pack koji pise `session.json`, `project_handoff.md` i `project_chat_transcript.md` u aktivni projektni folder; levi panel ima rucno dugme `Snimi projekat`; zatvaranje taba prikazuje custom modal sa izborom `Snimi i zatvori`, `Samo zatvori` ili `Otkazi`. `Odaberi postojeci folder` sada odmah ucitava `session.json` i ne pokrece novi init preko postojeceg projekta. Napredniji backup profil i dodatne opcije pakovanja projekta ostaju potencijalni UX follow-up.

### [ISS-024] Token/model usage i performance prikaz nisu implementirani

- **Otkriveno:** post-v1.0.26 cleanup - 2026-06-02
- **Simptom:** Planirano pracenje tokena, model usage-a i performance signala nije bilo vidljivo kao app funkcija. Runtime test je pokazao i OpenAI `429` TPM gresku kada je zahtev procenjen na previse tokena.
- **Ocekivano:** App treba da prikaze osnovne usage/performance signale po modelu/session-u kada ti podaci postoje, bez uvodjenja lazne preciznosti ili teskog dashboard-a. Kada nema provider usage metadata, dozvoljena je jasno oznacena procena konteksta.
- **Status:** Runtime potvrdjeno v1.1 - kratak zahtev prolazi i osvezava procenu, a veliki ForgeKit init/context payload se lokalno zaustavlja pre provider 429 greske. `watch` stanje koristi meksi `Oprez` signal, dok crveni/error treatment ostaje samo za `Prevelik` context. Full provider usage metadata ostaje buduci follow-up ako provider interfejs pocne da je vraca.

### [ISS-029] ForgeKit init context payload je prevelik

- **Otkriveno:** post-v1.0.26 runtime test - 2026-06-02
- **Simptom:** `Pokreni ForgeKit` / init tok moze pripremiti oko `~53,597` procenjenih tokena i biti zaustavljen token/context guard-om pre slanja.
- **Ocekivano:** ForgeKit init treba da ima compact boot mode, etapno ucitavanje ili selektivni template context kako pocetni activation flow ne bi odmah presao token prag. Korisniku treba prikazati jasno objasnjenje ako se full init mora skratiti.
- **Status:** Delimicno implementirano v1 - novi projekat vise ne salje automatski full `[FORGEKIT_INIT]` modelu. Project setup sada dodaje lokalnu compact Orchestrator welcome poruku bez API poziva, pa se pocetak rada ne blokira context guard-om i ne pravi token trosak. Otvoreno ostaje scoped instruction load: ucitavanje relevantnih Master/mentor instrukcija tek nakon sto korisnik definise cilj ili kada tok zatrazi Re-Prime/Governed kontekst.

### [ISS-030] Project reference file import za veliki kontekst

- **Otkriveno:** post-v1.0.28 NVIDIA/model routing test - 2026-06-04
- **Simptom:** Kada korisnik ima dug `.txt` ili `.md` materijal, jedina direktna opcija je lepljenje u chat, sto brzo podize procenu konteksta i aktivira context guard.
- **Ocekivano:** App treba da omoguci import `.txt` i `.md` fajlova kao project reference material. Importovani fajl treba da se cuva u projektnom folderu i koristi kao referenca, ali ne sme automatski da se salje modelu u celini. Korisnik treba da moze da izabere scoped excerpt, summary, research packet ili specificne sekcije koje se salju u model.
- **Status:** Delimicno implementirano v1.1 - app moze da importuje `.txt`, `.md` i `.markdown` fajlove u `references/` folder aktivnog projekta, vodi `reference_manifest.json`, prikazuje preview i omogucava kopiranje ili slanje ogranicenog excerpt-a kroz Re-Prime. Fajl se ne salje modelu u celini. Otvoreno ostaje napredni scoped section picker / full summary / Research Packet tok.

### [ISS-025] Project session report nema pun decision/state/memory model

- **Otkriveno:** post-v1.0.26 cleanup - 2026-06-02
- **Simptom:** Export je vec postao Project Session Report, ali jos nije pun decision-support packet sa odlukama, file action statusima, model switch signalima, memory signalima i otvorenim pitanjima.
- **Ocekivano:** Report treba da bude koristan za nastavak rada i review, ne samo formatiran chat export.
- **Status:** Otvoreno - post-v1.0.26 report enrichment follow-up.

### [ISS-026] Provider/model setup nema runtime validation prema stvarnom katalogu

- **Otkriveno:** post-v1.0.26 cleanup - 2026-06-02
- **Simptom:** Provider/model setup UX je prosiren, ali treba potvrditi runtime validaciju protiv stvarnog provider/model kataloga i fallback ponasanja.
- **Ocekivano:** Izbor modela u setup-u treba da bude proverljiv, validan i uskladjen sa runtime provider health signalom.
- **Status:** Delimicno reseno - NVIDIA model pool je prosiren na 10 preporucenih modela, default je pomeren na Orchestrator/agentic kandidat, a SidePanel ima vidljiv `NVIDIA routing predlog` samo kada je aktivan NVIDIA provider. Cross-provider ili provider-local routing za OpenAI/Anthropic ostaje poseban follow-up; ostaje runtime smoke test stvarne dostupnosti modela i timeout/fallback ponasanja.

### [ISS-027] State correctness regression scenario ne postoji kao objedinjeni test tok

- **Otkriveno:** post-v1.0.26 cleanup - 2026-06-02
- **Simptom:** Phase Sync, Re-Prime, correction invalidation i security manifest boundary postoje kao pojedinacni problemi, ali nema jednog regression scenario-a koji proverava ceo state correctness tok.
- **Ocekivano:** Dodati regresioni scenario koji zajedno proverava phase state, Re-Prime handoff, stale/pending file actions i security manifest granicu.
- **Status:** Runtime potvrdjeno za glavni state correctness tok - placeholder faze se ne prikazuju pre potvrde; natural confirmation, attributed phase tag, obicna numerisana lista i contextual kratke potvrde azuriraju app state u `potvrdjeno` samo kada prethodna poruka trazi potvrdu faza; Re-Prime/context continuity nastavlja iz potvrdjenih faza bez zamene phase framework-a; canonical `PROJECT_WRITE_FILE` blok kreira pending Project File Action; tekstualna potvrda u chatu ne zamenjuje stvarni panel upis; panel `Upisi` pravi stvarni fajl i status `upisano`; `project_security_manifest.md` boundary je potvrdjen kao security/file boundary dokument koji ne sme zakljucati stack, faze, arhitekturu ili v1 scope. Preostalo za kasnije: correction invalidation/stale draft follow-up ostaje kroz ISS-021.
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
- **Ocekivano:** Kada je ForgeKit init vec uradjen, dugme treba da promeni stanje ili namenu, npr. `ForgeKit aktivan`, `Osvezi ForgeKit kontekst`, `Ponovo ucitaj instrukcije` ili `Creue Mod`.
- **Status:** Implementirano za v1.0.28 - levo dugme vise ne salje full `[FORGEKIT_INIT]`; prikazuje `Creue Mod` i pokrece kratak pregled trenutnog toka iz tri ugla: proces, kvalitet i rizik, bez izmene fajlova. Auto-init/compact boot ostaje poseban follow-up kroz ISS-029 i Master improvement backlog.

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

### [ISS-033] Context usage watch signal izgleda kao greska
- **Prioritet:** NICE
- **Otkriveno:** v1.1.0 pre-release test - 2026-06-05
- **Simptom:** SidePanel context/token signal je kod visokog, ali jos neblokirajuceg context-a izgledao kao greska, iako zahtev jos nije nuzno blokiran.
- **Ocekivano:** App treba da razlikuje oprezno stanje od stvarnog prevelikog context-a. Korisnik treba da vidi upozorenje bez utiska da je provider ili app vec greskom pao.
- **Resenje:** `watch` stanje prikazuje `Oprez` sa blazim amber tretmanom, dok crveni/error tretman ostaje za `Prevelik` context i lokalni `CONTEXT GUARD`.
- **Status:** Zatvoreno - v1.1.0

### [ISS-032] Chat auto-scroll vraca korisnika na kraj tokom dugog odgovora
- **Prioritet:** NICE
- **Otkriveno:** v1.1.0 pre-release test - 2026-06-05
- **Simptom:** Kada agent daje dug odgovor, chat automatski skroluje na kraj i korisniku ne dozvoljava da cita pocetak odgovora dok streaming traje.
- **Ocekivano:** Auto-scroll treba da prati dno samo dok korisnik ostaje na dnu. Ako korisnik rucno skroluje gore, app treba da prestane da ga vraca na poslednje redove.
- **Resenje:** Chat prati `stick to bottom` stanje i ne forsira dno tokom stream-a kada je korisnik rucno skrolovao gore.
- **Status:** Zatvoreno - v1.1.0

### [ISS-031] Manual Research/Premortem invoke ne drzi aktivnu ulogu
- **Prioritet:** VAZNO
- **Otkriveno:** v1.1.0 pre-release test - 2026-06-05
- **Simptom:** Klik na `PREMORTEM` ili `RESEARCH` moze sadrzajno aktivirati nalaz, ali UI badge/top bar ostanu na `ORCHESTRATOR` ako model odgovori kroz Orchestrator segment.
- **Ocekivano:** Kada korisnik rucno pozove role karticu, app treba da postavi i zadrzi tu runtime ulogu tokom odgovora. Orchestrator dobija sledecu odluku posle role nalaza, ali ne preuzima labelu aktivnog role output-a.
- **Resenje:** Dodate su `RESEARCH` i `PREMORTEM` role kartice, role invoke prompt jasno trazi odgovor u pozvanoj ulozi, a streaming role lock cuva rucno pozvanu ulogu tokom odgovora.
- **Status:** Zatvoreno - v1.1.0

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
