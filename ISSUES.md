# ForgeKit Interface — Issues & Dopune

Evidencija poznatih grešaka, UI propusta i planiranih dopuna.
Svaki issue dobija ID, prioritet, opis i status.

Format: `[PRIORITET]` — KRITIČNO / VAŽNO / NICE

---

## Otvoreni issues

*Nema otvorenih issues.*

---

## Zatvoreni issues

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
