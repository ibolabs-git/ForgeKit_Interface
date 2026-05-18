# ForgeKit Interface App

ForgeKit Interface App je namenska Windows desktop aplikacija za rad sa ForgeKit Tool-om kroz vodjeni AI tok. Aplikacija spaja chat interfejs, ForgeKit uloge, projektni folder, taskove, memory zapise i AI providere u jedan kontrolisan radni prostor.

Aplikacija je napravljena kao Electron + React + TypeScript desktop app. AI pozivi idu ka Anthropic i OpenAI providerima, dok se lokalni rad vodi kroz projektne foldere i sigurnosni manifest.

---

## Sta aplikacija radi

ForgeKit Interface App omogucava:

- rad sa ForgeKit rezimom kroz namenski UI
- izbor AI providera i modela po projektu
- streaming AI odgovora u realnom vremenu
- prikaz aktivne ForgeKit uloge: ORCHESTRATOR, THINKER, BUILDER, REVIEWER, MEMORY CURATOR, OBSERVER
- pracenje taskova i faza rada
- cuvanje sesije u projektnom folderu
- kreiranje `project_security_manifest.md` za svaki projekat
- upload memory zapisa na GitHub
- rad sa vise projekata kroz tabove
- build Windows installer-a

---

## Quick Start: lokalni rad

Preduslovi:

- Windows
- Node.js 18+ ili 20+
- npm
- Git

Pokretanje u development modu:

```powershell
cd D:\Project\Forgste_Interface_app\ForgeKit_Interface_App\app
npm ci
npm run dev
```

Build bez installer-a:

```powershell
npm run build
```

Preview produkcionog builda:

```powershell
npm run preview
```

Kreiranje Windows installer-a:

```powershell
npm run package
```

Napomena: `npm run build` pravi aplikacioni build, ali instalabilni `.exe` pravi `npm run package`.

---

## Kako rade API funkcije

U ovoj aplikaciji izraz API funkcije znaci Electron IPC API, ne HTTP REST API.

Tok komunikacije:

```text
React UI
  -> preload window.api
  -> Electron IPC handler
  -> main process
  -> AI provider / GitHub / filesystem
  -> odgovor nazad u UI
```

Glavne API grupe:

| Grupa | Funkcija |
|---|---|
| AI streaming | slanje poruke, stream tokena, zavrsetak streama, greska |
| Settings | citanje i cuvanje API kljuceva, providera, modela i GitHub podesavanja |
| GitHub | test konekcije, upload memory zapisa, citanje ForgeKit prompta |
| Project folder | izbor foldera, kreiranje foldera, citanje i pisanje projektnih fajlova |
| Update | provera verzije i pokretanje update procesa |

Kljucni fajlovi:

```text
src/main/ipc-handlers.ts        # IPC handleri
src/preload/index.ts            # window.api bridge
src/main/providers/             # Anthropic/OpenAI provider sloj
src/main/github.ts              # GitHub API komunikacija
src/main/project-manager.ts     # projektni folder i fajlovi
src/renderer/src/store/         # stanje aplikacije
```

---

## Konfiguracija

API kljucevi se podesavaju kroz Settings u aplikaciji.

Podrzani provideri:

- Anthropic
- OpenAI

GitHub podesavanja:

- GitHub token
- repo u formatu `owner/repo`

GitHub se koristi za:

- test konekcije
- upload memory zapisa
- citanje ForgeKit system prompta kada je ta funkcija povezana u tok

`.env.example` postoji kao development pomocni fajl. Produkcioni tok trenutno koristi Settings i lokalni `electron-store`, a ne direktno `.env` vrednosti.

---

## ForgeKit master i projektni folderi

`Master_ForgeKit_Tool` je read-only alatnica.

Projektni rad mora ici u izabrani projektni folder. Aplikacija pri kreiranju projekta automatski pravi:

```text
project_security_manifest.md
```

To je manifest koji definise gde aplikacija i AI tok smeju da pisu, sta je read-only i koje operacije zahtevaju potvrdu.

Osnovno pravilo:

```text
Master_ForgeKit_Tool se cita kao pravilo i template biblioteka.
Projektni sadrzaj se ne upisuje u Master_ForgeKit_Tool.
```

---

## Memory upload

Kada AI odgovor sadrzi `[MEMORY CURATOR]` sekciju, aplikacija moze kreirati memory zapis i poslati ga na GitHub.

Trenutni upload path je oblika:

```text
learning_data/{date}_{projectName}_{timestamp}.md
```

Pre upotrebe potrebno je podesiti GitHub token i repo u Settings panelu.

---

## Security pravila

Obavezna pravila:

- ne commitovati `.env`
- ne stavljati GitHub token u remote URL
- ne commitovati API kljuceve
- renderer ne sme direktno upravljati tajnama
- tajne ostaju u main procesu / lokalnom storage sloju
- file read/write mora ostati unutar izabranog projektnog foldera
- `Master_ForgeKit_Tool` je read-only

Ako je GitHub token ikada bio upisan u `.git/config`, URL, screenshot ili log, token treba tretirati kao kompromitovan:

1. revoke/rotate token
2. ocistiti remote URL
3. proveriti git logs i audit tragove
4. koristiti normalan remote URL bez tokena

Primer ispravnog remote URL-a:

```powershell
git remote set-url origin https://github.com/ibolabs-git/ForgeKit_Interface.git
```

---

## Git i deploy

Pre commita proveriti status:

```powershell
git status --short
```

Tipican tok:

```powershell
git add README.md package.json package-lock.json src
git commit -m "Update ForgeKit Interface docs"
git push origin main
```

Ako se pravi nova aplikaciona verzija:

1. azurirati `package.json` verziju
2. azurirati `CHANGELOG.md`
3. pokrenuti `npm run package`
4. napraviti GitHub Release sa installer fajlom iz `dist/`

Release repo je definisan u `package.json` kroz `electron-builder` konfiguraciju.

---

## Troubleshooting

### API kljuc nije podesen

Otvoriti Settings i uneti Anthropic ili OpenAI API key.

### GitHub test konekcije ne prolazi

Proveriti:

- da li token postoji
- da li token ima pristup repo-u
- da li je repo upisan kao `owner/repo`
- da token nije istekao ili revoke-ovan

### `npm ci` ne prolazi

Proveriti Node/npm verziju i obrisati lokalni `node_modules` samo ako je potrebno:

```powershell
npm ci
```

### Windows SmartScreen blokira installer

Za interno testiranje ovo je ocekivano ako aplikacija nije code-signed. Za javnu distribuciju potreban je code signing.

### Git prijavljuje dubious ownership

Ako Windows/Git prijavi ownership problem:

```powershell
git config --global --add safe.directory D:/Project/Forgste_Interface_app/ForgeKit_Interface_App/app
```

---

## Developer reference

Dodatna dokumentacija:

```text
DEV.md
CHANGELOG.md
../technical_notes.md
../validation_plan.md
../project_security_manifest.md
```

`DEV.md` sadrzi detaljniji opis arhitekture, IPC kanala, store-a, provider sloja, update toka i release procesa.

