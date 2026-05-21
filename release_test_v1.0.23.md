# Release Test Scenario - ForgeKit Interface v1.0.23

## Svrha

Ovaj scenario proverava blokere i regresije otkrivene tokom v1.0.22 PulseFit testa. Test se radi pre package/release koraka za v1.0.23.

## Preduslovi

- App je pokrenut lokalno.
- Postoji bar jedan provider sa validnim API kljucem.
- Test projekat koristi novi prazan folder.
- Tester prati chat, levi role panel, desni session panel, Project File Actions panel i export/report fajl.

## Test 1 - Auto ForgeKit init

1. Kreirati novi projekat.
2. Izabrati projektni folder.
3. Proveriti da se ForgeKit rezim pokrece automatski.
4. Proveriti da se ne prikazuje user poruka `[FORGEKIT_INIT]`.
5. Ocekivano: Orchestrator se kratko javlja i postavlja prvo intake pitanje.

## Test 2 - Dugme POKRENI FORGEKIT

1. Nakon auto-init-a pogledati levo dugme.
2. Ocekivano: dugme ne sme izgledati kao da rezim nije pokrenut.
3. Ocekivano: dugme treba da sluzi za context refresh / ponovno ucitavanje ForgeKit konteksta, ili da bude jasno oznaceno kao aktivno stanje.

## Test 3 - Intake i faze

1. Voditi PulseFit-like razgovor: ideja za app za trenere, web + Android, vise trenera, polaznici bez naloga u v1.0.
2. Doci do predloga faza.
3. Potvrditi faze.
4. Ocekivano: levi sidebar prikazuje potvrdjene faze, ne stare/hardkodovane faze.
5. Izmeniti/potvrditi fazni model posle Reviewer provere.
6. Ocekivano: sidebar se osvezava nakon potvrdjene izmene faza.

## Test 4 - Role invoke i role return

1. Pozvati Reviewer/Premortem prirodnom porukom.
2. Ocekivano: chat label, levi role badge i desni session status prelaze na Reviewer.
3. Pustiti Reviewer da zavrsi nalaz.
4. Kada Orchestrator nastavi proces, proveriti stanje.
5. Ocekivano: chat label, levi badge i desni session status vracaju se na Orchestrator.

## Test 5 - Builder-owned file action

1. U toku projekta traziti pripremu `PulseFit/project_security_manifest.md`.
2. Ako Orchestrator ili Reviewer predloze file action, app ne sme samo trajno blokirati tok.
3. Ocekivano: app nudi ili automatski formira Builder handoff / recovery tok.
4. Builder priprema pending write.
5. Korisnik potvrdi upis kroz Project File Actions panel.
6. Ocekivano: fajl zaista postoji u projektnom folderu.
7. Ocekivano: chat ne tvrdi da je fajl upisan pre stvarne potvrde app-a.

## Test 6 - Re-Prime kao handoff/state packet

1. Tokom projekta promeniti model ili kliknuti Re-Prime/Refresh ForgeKit context.
2. Ocekivano: Re-Prime ne prikazuje samo osnovne meta podatke.
3. Ocekivano state packet sadrzi: cilj, potvrdjene odluke, aktivnu fazu, aktivnu ulogu, otvorena pitanja, sledeci korak i zabrane/granice.
4. Ocekivano: status prelazi u `synced` tek nakon uspesnog refresh-a.

## Test 7 - Model switch audit trail

1. Promeniti provider/model tokom neaktivne sesije.
2. Ocekivano: u chat/report toku se pojavljuje nenametljiv divider `Model promenjen - old -> new`.
3. Ocekivano: divider ne ulazi kao AI context poruka.
4. Exportovati report i proveriti da se model switch vidi u izvestaju.

## Test 8 - Provider stabilnost

1. Testirati jedan spor NVIDIA model.
2. Ocekivano: ako model ne odgovori na vreme, app prikazuje jasan timeout/fallback status.
3. Ocekivano: razlikuje se timeout, rate limit, provider error i model_not_found.
4. Ocekivano: app predlaze brzi model kada je to primenljivo.

## Test 9 - Stop i model lock regresija

1. Pokrenuti duzi odgovor.
2. Kliknuti Stop.
3. Ocekivano: odgovor se prekida i input se odblokira.
4. Tokom aktivnog odgovora pokusati promenu modela.
5. Ocekivano: promena modela je blokirana dok agent generise.

## Test 10 - Project session report

1. Exportovati project session report.
2. Ocekivano report sadrzi:
   - naziv projekta
   - provider/model istoriju
   - faze
   - role aktivacije
   - potvrdjene odluke
   - file actions status
   - timeout/provider dogadjaje ako postoje
   - memory signale ako postoje

## Kriterijum prolaza

v1.0.23 se smatra spremnom za release samo ako P0 testovi prolaze bez rucnih workaround-a:

- Auto-init ne prikazuje interni signal.
- Role return radi.
- Builder-owned file action radi.
- Confirmed phase sync radi.
- Stop i model lock ostaju stabilni.

## Kriterijum odlaganja release-a

Release se odlaze ako bilo koji od sledecih problema ostane aktivan:

- App tvrdi da je fajl upisan, a fajl nije kreiran.
- Role ostane zaglavljena na Reviewer/Thinker posle Orchestrator nastavka.
- Validan Builder write ostaje blokiran bez recovery puta.
- Promena faza je potvrdjena, a sidebar ostane na starom modelu.
- Stop dugme ne prekida aktivan odgovor.
