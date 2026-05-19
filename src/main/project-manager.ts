import { dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export async function chooseProjectFolder(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Izaberi folder za projekat',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Izaberi ovaj folder'
  })
  return result.canceled ? null : result.filePaths[0]
}

export async function createProjectFolder(
  win: BrowserWindow,
  suggestedName: string
): Promise<string | null> {
  const defaultPath = path.join(os.homedir(), 'Documents', 'ForgeKit', 'Projects', suggestedName)

  const result = await dialog.showSaveDialog(win, {
    title: 'Kreiraj folder za projekat',
    defaultPath,
    buttonLabel: 'Kreiraj ovde',
    properties: ['createDirectory', 'showOverwriteConfirmation']
  })

  if (result.canceled || !result.filePath) return null

  const folderPath = result.filePath
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }

  return folderPath
}

/**
 * SEC-01: Validacija path traversal napada.
 * Osigurava da rezultujuća putanja ostaje unutar projektnog foldera.
 * Primjer napada koji se blokira: filename = "../../AppData/malware.exe"
 */
function assertSafePath(projectPath: string, filename: string): string {
  const resolvedProject = path.resolve(projectPath)
  const resolvedFile = path.resolve(projectPath, filename)
  // Putanja mora počinjati s projektnim folderom + separatorom
  if (!resolvedFile.startsWith(resolvedProject + path.sep)) {
    throw new Error(`[SEC] Odbijen pokušaj path traversal: "${filename}"`)
  }
  return resolvedFile
}

export function writeProjectFile(
  projectPath: string,
  filename: string,
  content: string
): void {
  const safePath = assertSafePath(projectPath, filename)
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true })
  }
  const safeDir = path.dirname(safePath)
  if (!fs.existsSync(safeDir)) {
    fs.mkdirSync(safeDir, { recursive: true })
  }
  fs.writeFileSync(safePath, content, 'utf-8')
}

export function readProjectFile(projectPath: string, filename: string): string | null {
  const safePath = assertSafePath(projectPath, filename)
  if (!fs.existsSync(safePath)) return null
  return fs.readFileSync(safePath, 'utf-8')
}

export function initProjectFolder(projectPath: string, projectName: string): void {
  const date = new Date().toISOString().slice(0, 10)

  const manifest = `# Project security manifest

## Verzija dokumenta
- Verzija: v1.0
- Datum: ${date}
- Autor: ForgeKit Interface App

## Changelog
- v1.0 – inicijalna verzija, kreirana automatski pri otvaranju projekta

## Projekat
- Projekat: ${projectName}
- Datum: ${date}
- Owner: korisnik
- Status: aktivan

## Dozvoljena zona pisanja
- Projektni folder: ${projectPath}
- Dozvoljeni podfolderi: svi podfolderi unutar projektnog foldera
- Privremeni output: OS temp direktorijum (automatski brisan)

## Read-only zone
- Master ForgeKit Tool: read-only, ne upisivati projektni sadrzaj
- Ulazni materijali: citati se, ne menjati bez potvrde
- Eksterni folderi: van opsega bez eksplicitne potvrde

## Zabranjene operacije
- Upis u Master_ForgeKit_Tool
- Brisanje bez eksplicitne potvrde korisnika
- Prepisivanje korisnickog fajla bez potvrde
- Premestanje fajlova bez odobrenog izvora i cilja
- Masovne izmene bez posebnog execution contract-a

## Pravila izmene fajlova
- Svaka izmena mora imati razlog
- Svaka izmena mora biti u potvrdjenom opsegu
- Ako je fajl korisnicki, prvo procitati i zastititi postojeci sadrzaj

## Pravila brisanja
- Brisanje zahteva eksplicitnu potvrdu korisnika
- Navesti tacnu putanju i razlog brisanja
- Ako postoji sumnja, ne brisati

## Pravila prepisivanja
- Prepisivanje zahteva potvrdu da se stara verzija sme zameniti
- Ako fajl sadrzi vazan rad, predloziti backup ili novu verziju
- Ne prepisivati dokumente samo radi urednosti

## Pravila eksternih fajlova
- Eksterni fajlovi se citaju samo ako su deo opsega
- Eksterni fajlovi se ne menjaju bez posebne potvrde
- Backup i arhive se ne tretiraju kao radni fajlovi osim ako korisnik potvrdi

## Recovery postupak
- Ako je upis otisao u pogresan folder: zaustaviti rad, obavestiti korisnika
- Ako je fajl prepisan: proveriti backup, ne brisati tragove
- Ako je fajl obrisan: proveriti trash/recycle, ne prepisivati memoriju
- Sledeci checkpoint: korisnik potvrdjuje nastavak rada

## Metakognitivni security guard
- Ako postoji nejasna putanja ili konflikt sa ovim manifestom: zaustaviti i pitati korisnika
- Rizik pisanja van projektnog foldera: zabranjen bez eksplicitne potvrde
- Master_ForgeKit_Tool nije radni prostor

## Potvrda
- Manifest kreiran: ${date}
- Potvrdio: ForgeKit Interface App (automatski)
- Lokacija foldera: ${projectPath}

## Povezani dokumenti
- Master_ForgeKit_Tool/00_SYSTEM/security_policy.md
- Master_ForgeKit_Tool/00_SYSTEM/rules.md
- Master_ForgeKit_Tool/01_BOOTSTRAP/project_security_manifest.md
`
  writeProjectFile(projectPath, 'project_security_manifest.md', manifest)
}
