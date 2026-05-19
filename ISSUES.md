# ForgeKit Interface — Issues & Dopune

Evidencija poznatih grešaka, UI propusta i planiranih dopuna.
Svaki issue dobija ID, prioritet, opis i status.

Format: `[PRIORITET]` — KRITIČNO / VAŽNO / NICE

---

## Otvoreni issues

### [ISS-001] Font — dijakritička slova ne renderuju u SessionSummaryModal
- **Prioritet:** VAŽNO
- **Otkriveno:** v0.9.5 — 2026-05-19
- **Simptom:** Slova `š`, `đ`, `č`, `ć`, `ž` (i velika verzija) prikazuju se kao prazan kvadrat (□) u Session Summary modalu. Primjeri iz screenshot-a: "Klju**č**ne odluke", "Ura**đ**eno", "Sljede**ć**i koraci".
- **Gdje:** `SessionSummaryModal` — `<pre>` ili `<div>` koji renderuje streaming tekst sažetka
- **Mogući uzrok:** Font koji se koristi za prikaz sažetka (`Share Tech Mono` ili `Share Tech`) ne sadrži glifove za latinična proširena slova (Latin Extended-A blok, Unicode 0100–017F). Google Fonts varijante ovih fontova često imaju nepotpune charset podrške.
- **Rješenje (prijedlog):** Dodati fallback font koji sigurno pokriva latin-ext charset (npr. `Inter`, `Segoe UI`) na `font-family` stack za modal content; ili dodati `&subset=latin,latin-ext` na Google Fonts import URL.
- **Fajlovi za pregled:** `src/renderer/src/components/SessionSummaryModal.css`, `src/renderer/src/App.css` (font import)
- **Status:** ⏳ Otvoreno

---

## Zatvoreni issues

*Nema još.*

---

## Pravila unosa

- Svaki issue dobija sljedeći slobodni `ISS-XXX` broj
- Prioriteti: **KRITIČNO** (crash/data loss), **VAŽNO** (vidljiva greška), **NICE** (UX poboljšanje)
- Status: ⏳ Otvoreno · 🔄 U toku · ✅ Zatvoreno (navesti verziju)
- Pri zatvaranju: premjesti u sekciju "Zatvoreni issues" i dodaj verziju u kojoj je riješeno

---

*Kreiran: v0.9.5 — 2026-05-19*
