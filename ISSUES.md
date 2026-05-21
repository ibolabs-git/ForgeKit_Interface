# ForgeKit Interface — Issues & Dopune

Evidencija poznatih grešaka, UI propusta i planiranih dopuna.
Svaki issue dobija ID, prioritet, opis i status.

Format: `[PRIORITET]` — KRITIČNO / VAŽNO / NICE

---

## Otvoreni issues

### [ISS-006] Spontani role tag u AI odgovoru ne uskladjuje runtime ulogu
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.21 test - 2026-05-21
- **Simptom:** Model moze u odgovoru sam zapoceti segment kao `[THINKER]`, dok UI i dalje prikazuje `ORCHESTRATOR MODE` ili prethodnu runtime ulogu. `INVOKE` tok je stabilizovan, ali spontana promena role taga tokom normalnog odgovora jos nije jasno tretirana.
- **Napomena (v1.0.22):** Kontrolisani poziv uloge je prosiren na prirodne poruke (`Pozivam Reviewer.`) i klik na levi role tile. Ovo ne resava automatski spontani `[ROLE]` tag koji model sam upise bez korisnickog poziva.
- **Status:** Otvoreno - definisati pravilo: da li prvi validan role tag u assistant odgovoru menja runtime ulogu, ili se tretira kao tekstualna sekcija ako nije dosao iz eksplicitnog invoke/handoff toka.

### [ISS-004] NVIDIA modeli povremeno ne vrate odgovor u ocekivanom roku
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.19/v1.0.20 - 2026-05-20
- **Simptom:** Pojedini NVIDIA NIM modeli, posebno veci reasoning modeli, mogu ostati bez vidljivog odgovora do timeout-a.
- **Status:** Otvoreno - potrebno preciznije provider-level timeout/fallback ponasanje i jasniji model health signal u UI-u.

### [ISS-005] Project File Actions blokirani predlog nije dovoljno objasnjen korisniku
- **Prioritet:** NICE
- **Otkriveno:** v1.0.20 - 2026-05-20
- **Simptom:** Blokirana putanja se prikaze kao bezbednosni nalaz, ali korisniku nije dovoljno jasno cemu panel sluzi i sta treba da uradi.
- **Status:** Otvoreno - dodati kratak helper tekst ili tooltip za `blocked` status.

---

## Zatvoreni issues

### [ISS-010] Export naziv i naslov chat_export ne opisuje stvarnu vrednost izvestaja
- **Prioritet:** NICE
- **Otkriveno:** v1.0.21 test - 2026-05-21
- **Simptom:** Export fajl se zvao `chat_export_...md`, ali u ForgeKit kontekstu to nije samo chat, vec projektni tok, odluke, file action statusi i procesni izvestaj.
- **Resenje (v1.0.22):** Export sada koristi naziv `project_session_report_...` i naslov `ForgeKit Project Session Report`.
- **Status:** Zatvoreno - v1.0.22

### [ISS-009] App dozvoljava lazno procesno stanje posle blokiranih file actions
- **Prioritet:** KRITICNO
- **Otkriveno:** v1.0.21 test - 2026-05-21
- **Simptom:** Nakon sto su `PROJECT_WRITE_FILE` akcije blokirane, korisnik je poslao potvrdu, a model je nastavio sa tvrdnjom da su dokumenti upisani iako fajlovi nisu nastali.
- **Resenje (v1.0.22):** Tekstualna potvrda se zaustavlja ako postoje `blocked`, `pending` ili `error` file action stavke; app upisuje sistemsku poruku i trazi stvarno resavanje kroz panel.
- **Status:** Zatvoreno - v1.0.22

### [ISS-008] Project File Actions ne prepoznaje BUILDER segment unutar ORCHESTRATOR poruke
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.21 test - 2026-05-21
- **Simptom:** AI moze u jednoj assistant poruci da krene iz `[ORCHESTRATOR]`, zatim otvori `[BUILDER]` segment i generise `[PROJECT_WRITE_FILE: ...]` blokove. Project File Actions je blokirao te akcije jer je kao izvor video runtime ulogu cele poruke.
- **Resenje (v1.0.22):** File action parser sada koristi najblizi prethodni validan role segment kao izvor akcije.
- **Status:** Zatvoreno - v1.0.22

### [ISS-007] Parser faza ne prepoznaje tekstualni oblik `Faza 1`
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.21 test - 2026-05-21
- **Simptom:** AI je u chatu definisao `Faza 1`, `Faza 2`, `Faza 3`, ali levi panel je ostao na placeholder poruci.
- **Resenje (v1.0.22):** Parser prepoznaje `Faza 1/2/3/4` i `Phase 1/2/3/4`, ukljucujuci naziv faze iza crtice.
- **Status:** Zatvoreno - v1.0.22

### [ISS-003] Levi panel prerano prikazuje hardkodovane faze
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.20 - 2026-05-20
- **Simptom:** Novi projekat odmah prikazuje `F1-F4`, iako faze nisu definisane kroz projektni tok.
- **Resenje (Unreleased):** Levi panel prikazuje faze tek kada se detektuju u projektnom toku ili taskovima.
- **Status:** Zatvoreno - Unreleased

### [ISS-002] Runtime uloga i role badge mogu se razici pri invoke toku
- **Prioritet:** VAZNO
- **Otkriveno:** v1.0.20 - 2026-05-20
- **Simptom:** Aktivna kartica u levom panelu moze pokazati Reviewer/Thinker, dok poruka ostaje obelezena kao Orchestrator.
- **Resenje (Unreleased):** `INVOKE` sada postavlja runtime ulogu pre starta assistant poruke.
- **Status:** Zatvoreno - Unreleased

### [ISS-001] Font — dijakritička slova ne renderuju u SessionSummaryModal
- **Prioritet:** VAŽNO
- **Otkriveno:** v0.9.5 — 2026-05-19
- **Simptom:** `š`, `đ`, `č`, `ć`, `ž` prikazivali se kao □ u Session Summary modalu.
- **Uzrok:** `Share Tech` / `Share Tech Mono` ne sadrže Latin Extended-A glifove. `.summary-content` nije imao eksplicitnu `font-family` deklaraciju pa su headings nasljeđivali `var(--font-tech)`.
- **Rješenje (v1.0.1):** Dodano `font-family: var(--font)` na `.summary-content` (Inter, koji podržava latin-ext). Headings `h1-h3` unutar summary-a dobili su `var(--font-tech), var(--font)` fallback.
- **Fajl:** `SessionSummaryModal.css`
- **Status:** ✅ Zatvoreno — v1.0.1 (2026-05-19)

---

## Pravila unosa

- Svaki issue dobija sledeći slobodni `ISS-XXX` broj
- Prioriteti: **KRITIČNO** (crash/data loss), **VAŽNO** (vidljiva greška), **NICE** (UX poboljšanje)
- Status: ⏳ Otvoreno · 🔄 U toku · ✅ Zatvoreno (navesti verziju)
- Pri zatvaranju: premesti u sekciju "Zatvoreni issues" i dodaj verziju u kojoj je rešeno

---

*Kreiran: v0.9.5 — 2026-05-19*

