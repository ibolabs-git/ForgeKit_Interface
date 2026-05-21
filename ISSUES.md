# ForgeKit Interface — Issues & Dopune

Evidencija poznatih grešaka, UI propusta i planiranih dopuna.
Svaki issue dobija ID, prioritet, opis i status.

Format: `[PRIORITET]` — KRITIČNO / VAŽNO / NICE

---

## Otvoreni issues

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
