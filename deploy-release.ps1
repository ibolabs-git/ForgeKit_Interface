param(
    [string]$Version,
    [switch]$DryRun,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Run-Step {
    param(
        [string]$Label,
        [scriptblock]$Action
    )

    Write-Host ""
    Write-Host "==> $Label" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Host "Dry run: $Label"
        return
    }
    & $Action
}

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Komanda nije dostupna: $Name"
    }
}

function Invoke-Native {
    param(
        [string]$Exe,
        [string[]]$ArgumentList
    )

    & $Exe @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "Komanda nije uspela: $Exe $($ArgumentList -join ' ')"
    }
}

Assert-Command "git"
Assert-Command "npm.cmd"
Assert-Command "gh"

$pkg = Get-Content -Raw -LiteralPath "package.json" | ConvertFrom-Json
$currentVersion = [string]$pkg.version

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = $currentVersion
}

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Verzija mora biti semver oblika MAJOR.MINOR.PATCH, npr. 1.0.14"
}

if ($Version -ne $currentVersion) {
    throw "package.json je na v$currentVersion, a trazeni release je v$Version. Prvo azuriraj verziju."
}

$tag = "v$Version"
$exe = Join-Path $root "dist\ForgeKit Interface Setup $Version.exe"
$blockmap = "$exe.blockmap"
$latest = Join-Path $root "dist\latest.yml"
$releaseExe = $exe
$releaseBlockmap = $blockmap

Write-Host "ForgeKit Interface release deploy" -ForegroundColor Green
Write-Host "Version: $Version"
Write-Host "Tag:     $tag"

Run-Step "Provera GitHub autentifikacije" {
    Invoke-Native "gh" @("auth", "status")
}

Run-Step "Provera da li tag vec postoji lokalno" {
    $localTag = git tag --list $tag
    if ($localTag) { throw "Tag vec postoji lokalno: $tag" }
}

Run-Step "Provera da li tag vec postoji na origin" {
    $remoteTag = git ls-remote --tags origin $tag
    if ($LASTEXITCODE -ne 0) {
        throw "Git remote provera nije uspela"
    }
    if ($remoteTag) { throw "Tag vec postoji na GitHub-u: $tag" }
}

if (-not $SkipBuild) {
    Run-Step "Build installer-a" {
        Invoke-Native "npm.cmd" @("run", "package")
    }
}

Run-Step "Provera release asset-a" {
    foreach ($file in @($exe, $blockmap, $latest)) {
        if (-not (Test-Path -LiteralPath $file)) {
            throw "Nedostaje release asset: $file"
        }
        Write-Host "OK: $file"
    }

    $latestText = Get-Content -Raw -LiteralPath $latest
    $pathMatch = [regex]::Match($latestText, '(?m)^path:\s*(.+)$')
    if ($pathMatch.Success) {
        $expectedName = $pathMatch.Groups[1].Value.Trim()
        $expectedExe = Join-Path (Split-Path -Parent $latest) $expectedName
        $expectedBlockmap = "$expectedExe.blockmap"

        if (-not (Test-Path -LiteralPath $expectedExe)) {
            Copy-Item -LiteralPath $exe -Destination $expectedExe -Force
            Write-Host "Kopiran updater asset: $expectedExe"
        }
        if (-not (Test-Path -LiteralPath $expectedBlockmap)) {
            Copy-Item -LiteralPath $blockmap -Destination $expectedBlockmap -Force
            Write-Host "Kopiran blockmap asset: $expectedBlockmap"
        }

        $script:releaseExe = $expectedExe
        $script:releaseBlockmap = $expectedBlockmap
    }
}

$notes = @"
ForgeKit Interface v$Version

Ovaj release sadrzi najnoviji build aplikacije i asset-e potrebne za auto-update:
- Windows NSIS installer
- blockmap
- latest.yml

Detalji izmena su u CHANGELOG.md.
"@

$notesPath = Join-Path $env:TEMP "forgekit-interface-release-$Version.md"
if (-not $DryRun) {
    Set-Content -LiteralPath $notesPath -Value $notes -Encoding UTF8
}

Run-Step "Kreiranje GitHub release-a" {
    Invoke-Native "gh" @(
        "release", "create", $tag,
        "--repo", "ibolabs-git/ForgeKit_Interface",
        "--title", "ForgeKit Interface v$Version",
        "--notes-file", $notesPath,
        $releaseExe,
        $releaseBlockmap,
        $latest,
        "--latest"
    )
}

Write-Host ""
Write-Host "Release deploy zavrsen: $tag" -ForegroundColor Green
