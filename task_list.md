# Task Lista

## Projekat
ForgeKit Interface App

## Poslednje azurirano
2026-05-19

## Nivo
STANDARD

---

## FAZA 1 — Fundament

### F1.1 — Electron + React projekt setup
- [x] Inicijalizovati Electron + React + TypeScript projekat (Vite template)
- [x] Konfigurisati electron-builder za Windows packaging (NSIS)
- [x] Podesiti folder strukturu: `src/main`, `src/renderer`, `src/preload`
- [x] Podesiti TypeScript path aliase
- [x] Kreirati .gitignore sa .env i node_modules

### F1.2 — Provider Abstraction Layer
- [x] Definisati `AIProvider` interfejs (`providers/interface.ts`)
- [x] Implementirati `AnthropicProvider` (Anthropic SDK, streaming)
- [x] Implementirati `OpenAIProvider` (OpenAI SDK, streaming)
- [x] Implementirati `NvidiaProvider` (OpenAI-kompatibilni NIM endpoint)
- [x] Kreirati `ProviderFactory` za instanciranje providera po imenu

### F1.3 — Bazicni Chat UI
- [x] Kreirati `ChatWindow` komponentu (lista poruka, search, export)
- [x] Kreirati `MessageBubble` komponentu sa role tag, markdown, syntax highlight
- [x] Kreirati `InputBar` komponentu (textarea, Ctrl+Enter send, stop dugme)
- [x] Implementirati streaming prikaz (token po token, OPT-02 buffer optimizacija)
- [x] Stilizovati role tagove po ulozi (per-uloga boje, svetla i tamna tema)

### F1.4 — IPC Komunikacija
- [x] IPC kanal za slanje poruka AI provideru (`send-message`)
- [x] IPC kanal za streaming odgovora (`stream-token`, `stream-complete`, `stream-error`)
- [x] Error handling za API greske (prikaz u chat-u)
- [x] SEC-05: system prompt zivi samo u main procesu

---

## FAZA 2 — ForgeKit Logika

### F2.1 — ForgeKit State Machine
- [x] Definisati `ForgeKitState` i tipove (`ForgeKitRole`, `ForgeKitPhase`, `Task`, `ChatMessage`)
- [x] Implementirati `ForgeKitStore` (Zustand 5)
- [x] `extractRole()` — parsiranje `[ROLE]` taga iz AI odgovora
- [x] `extractTasks()` — parsiranje `- [ ]` / `- [x]` iz AI odgovora
- [x] Parsiranje faze (F1/F2/F3 detekcija)

### F2.2 — Desni Panel (SidePanel)
- [x] Session metrika tiles (provider, model, faza, broj poruka)
- [x] Context status indikator (`synced` / `needs_refresh`)
- [x] Re-Prime dugme
- [x] Model switcher (provider + model dropdown, custom model ID input)
- [x] Task lista sa checkbox toggle
- [x] Memory Curator sekcija
- [x] Prompt source indikator (`■ PROMPT: GITHUB / BUNDLED / —`)
- [x] Verzija + auto-updater dugme

### F2.3 — ForgeKit System Prompt
- [x] Bundlovani fallback prompt u `src/main/system-prompt.ts`
- [x] GitHub fetch: `fetchSystemPromptFromGitHub()` iz `masterToolRepo`
- [x] Keshiranje prompta po sesiji (`cachedSystemPrompt`)
- [x] `Invoke komanda` sekcija dodata u prompt

### F2.4 — Task Parsiranje
- [x] Automatska detekcija taska iz AI odgovora
- [x] Rucno dodavanje taska iz SidePanel-a
- [x] Checkbox toggle za zavrsavanje taska

---

## FAZA 3 — Multi-model i Settings

### F3.1 — Model Selector
- [x] Dropdown u headeru za izbor providera
- [x] Dropdown za izbor specificnog modela po provideru
- [x] Custom model ID input (override dropdown modela)
- [x] Promena modela tokom sesije (trigguje Re-Prime)

### F3.2 — Settings Modal
- [x] Accordion sekcije: Anthropic, OpenAI, NVIDIA NIM, GitHub Integracija
- [x] Unos i cuvanje API kljuceva (safeStorage DPAPI)
- [x] Test konekcija (NVIDIA, GitHub)
- [x] Default model po provideru
- [x] Light / Dark tema switcher
- [x] `masterToolRepo` polje za Master_ForgeKit_Tool repo

### F3.3 — Finalizacija i Pakovanje
- [x] electron-builder NSIS konfiguracija
- [x] GitHub Releases auto-updater
- [x] Multi-tab podrska (TabBar)
- [x] Handoff modal i SessionSummary modal

---

## PROSIRENJA (post-F3)

### GitHub Integracija
- [x] GitHub token podrska
- [x] `uploadMemoryRecord` — memorija u `Master_ForgeKit_Tool/05_GLOBAL_MEMORY/`
- [x] `fetchSystemPromptFromGitHub` — system prompt iz ForgeKit_tool repo-a
- [x] `fetchTemplateFromGitHub` — citanje template fajlova
- [x] `github:fetch-template` IPC handler
- [x] `masterToolRepo` zasebno polje — odvaja Master Tool od app repo-a

### Agent Role Grid
- [x] 6 tile-ova u 2x3 gridu (stilizovano kao metric tiles)
- [x] Per-uloga boje (svetla i tamna tema)
- [x] Aktivna uloga: animirana zvezda + obojen border-left
- [x] Invoke mehanika (`[INVOKE:ULOGA]`)
- [x] `useSendMessage` hook (zajednicki za InputBar i LeftPanel)
- [x] Bez ikonica — samo naziv i zvezda za aktivnu ulogu

### READ_TEMPLATE mehanizam
- [x] `contentRef` akumulira streaming sadrzaj lokalno
- [x] `sendRef` za resavanje closure stale problema
- [x] Detekcija `[READ_TEMPLATE: putanja]` taga u AI odgovoru
- [x] Auto-fetch fajla sa GitHub-a
- [x] Auto-inject sadrzaja u razgovor
- [x] `[TEMPLATE_INJECT]` bubble u MessageBubble (kompaktni chip, expand/collapse)

---

## Status po fazi

| Faza | Status |
|---|---|
| F1 — Fundament | ✓ Kompletno |
| F2 — ForgeKit Logika | ✓ Kompletno |
| F3 — Multi-model | ✓ Kompletno |
| GitHub Integracija | ✓ Kompletno |
| Agent Role Grid + Invoke | ✓ Kompletno |
| READ_TEMPLATE mehanizam | ✓ Kompletno |

---

## Otvorene stavke

| Prioritet | Stavka |
|---|---|
| Visok | Dopuniti system prompt uputstvom za READ_TEMPLATE koristenje |
| Visok | AbortController za pravo zaustavljanje streaminga |
| Srednji | Filtrirati TEMPLATE_INJECT poruke iz Re-Prime istorije |
| Srednji | Stilizovati / sakriti INVOKE poruke u chat-u |
| Srednji | Session persist (export/import JSON) |
| Nizak | Ollama provider (lokalni modeli) |
| Nizak | Token counter u SidePanel-u |
| Nizak | Keyboard shortcut za invoke ulogu (Ctrl+1..6) |
