# OpenTour — GitHub Project Updater
# Updates statuses, priorities, sizes and body content for all project draft items
# Based on codebase analysis from progress.json and code review

$PROJECT_NUMBER = 1
$OWNER = "vanhoutenbos"

# Field IDs (from gh project field-list)
$STATUS_FIELD_ID  = "PVTSSF_lAHOAJw35s4Bbn3LzhWXIHM"
$PRIORITY_FIELD_ID = "PVTSSF_lAHOAJw35s4Bbn3LzhWXIl0"
$SIZE_FIELD_ID    = "PVTSSF_lAHOAJw35s4Bbn3LzhWXIl4"

# Status option IDs
$STATUS_DONE      = "98236657"
$STATUS_REVIEW    = "df73e18b"   # In review = implemented, needs verification
$STATUS_PROGRESS  = "47fc9ee4"   # In progress
$STATUS_READY     = "61e4505c"   # Ready = needs to be built
$STATUS_BACKLOG   = "f75ad846"

# Priority option IDs
$P0 = "79628723"   # Must-have for pilot
$P1 = "0a877460"   # Should-have for pilot  
$P2 = "da944a9c"   # Nice-to-have / later

# Size option IDs
$XS = "6c6483d2"
$S  = "f784b110"
$M  = "7515a9f1"
$L  = "817d0097"
$XL = "db339eb2"


function Set-ItemStatus {
    param([string]$ItemId, [string]$OptionId)
    gh project item-edit --id $ItemId --project-id PVT_kwHOAJw35s4Bbn3L --field-id $STATUS_FIELD_ID --single-select-option-id $OptionId 2>&1 | Out-Null
}

function Set-ItemPriority {
    param([string]$ItemId, [string]$OptionId)
    gh project item-edit --id $ItemId --project-id PVT_kwHOAJw35s4Bbn3L --field-id $PRIORITY_FIELD_ID --single-select-option-id $OptionId 2>&1 | Out-Null
}

function Set-ItemSize {
    param([string]$ItemId, [string]$OptionId)
    gh project item-edit --id $ItemId --project-id PVT_kwHOAJw35s4Bbn3L --field-id $SIZE_FIELD_ID --single-select-option-id $OptionId 2>&1 | Out-Null
}

Write-Host "=== OpenTour GitHub Project Updater ===" -ForegroundColor Cyan
Write-Host "Setting statuses, priorities and sizes based on codebase analysis..." -ForegroundColor Yellow
Write-Host ""


# ============================================================
# DONE — Fully implemented and verified in codebase
# ============================================================
Write-Host "Marking completed items as Done..." -ForegroundColor Green

$doneItems = @(
    # Vision & Scope
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Omw"; label="VS-01 open source" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Onk"; label="VS-03 privacy-by-default" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0OoQ"; label="VS-04 geen ledenbeheer" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Oog"; label="VS-05 NL standaard" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0OpQ"; label="VS-07 responsive leaderboard" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Oqw"; label="VS-09 USP" },
    # Organizer
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0OrE"; label="ORG-01 toernooi aanmaken" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Ors"; label="ORG-02 spelers toevoegen" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0OsQ"; label="ORG-03 flights genereren" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0OtA"; label="ORG-04 starttijden" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Ots"; label="ORG-05 status wijzigen" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0OuA"; label="ORG-06 pauzeren" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Ovo"; label="ORG-09 toegangscodes" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Ow4"; label="ORG-12 einduitslag" },
    # Scorer
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O1c"; label="SCR-01 inloggen code" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O2I"; label="SCR-02 flight kiezen" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O3g"; label="SCR-04 offline opslaan" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O4A"; label="SCR-05 sync status" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O4k"; label="SCR-06 auto sync" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O6E"; label="SCR-08 auto-advance" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O6Y"; label="SCR-09 holes-per-flight" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O6s"; label="SCR-10 bevestigingsstap" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O7I"; label="SCR-11 hoge score waarschuwing" },
    # Spectator
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O-Y"; label="SPE-01 leaderboard zonder account" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O-8"; label="SPE-02 deelbare link" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O_c"; label="SPE-03 auto updaten" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PAI"; label="SPE-04 positie naam score holes" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PBA"; label="SPE-05 status badges" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PCQ"; label="SPE-06 pauzebanner" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PDw"; label="SPE-07 archief" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PGk"; label="SPE-12 LIVE indicator" },
    # Auth
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PIk"; label="AUTH-01 magic link" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PJA"; label="AUTH-02 recorder toegangscode" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PKI"; label="AUTH-04 code deactiveren" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PKc"; label="AUTH-05 dashboard" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PLU"; label="AUTH-08 uitloggen" },
    # Privacy
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PLw"; label="PRI-01 minimale dataverzameling" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PMc"; label="PRI-02 naam zichtbaarheid" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PPc"; label="PRI-06 privacyverklaring" },
    # Courses
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PRM"; label="CRS-01 baan aanmaken" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PR4"; label="CRS-02 baan kiezen" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PSU"; label="CRS-03 egolf4u import" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PS8"; label="CRS-04 baan bewerken" },
    # Infra
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PZA"; label="INFRA-02 CSP dynamisch" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PZQ"; label="INFRA-03 i18n entry point" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Paw"; label="INFRA-06 vitejs removed" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Pbg"; label="INFRA-07 supabase lazy factories" },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Pb8"; label="INFRA-08 anon key fallback" }
)

foreach ($item in $doneItems) {
    Write-Host "  ✓ $($item.label)" -ForegroundColor Green
    Set-ItemStatus -ItemId $item.id -OptionId $STATUS_DONE
    Set-ItemPriority -ItemId $item.id -OptionId $P2
}


# ============================================================
# READY — MVP items that must be built before pilot (P0/P1)
# ============================================================
Write-Host ""
Write-Host "Marking MVP-blocking items as Ready with P0/P1 priority..." -ForegroundColor Red

# P0 = pilot-blocking, must fix NOW
$p0ReadyItems = @(
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PaU"; label="INFRA-05 PWA service worker Next 14"; size=$M },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PdA"; label="INFRA-10 dev magic link beveiligen"; size=$S },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O20"; label="SCR-03 HoleByHoleView als primaire scorer UI"; size=$M }
)

foreach ($item in $p0ReadyItems) {
    Write-Host "  🔴 P0: $($item.label)" -ForegroundColor Red
    Set-ItemStatus   -ItemId $item.id -OptionId $STATUS_READY
    Set-ItemPriority -ItemId $item.id -OptionId $P0
    Set-ItemSize     -ItemId $item.id -OptionId $item.size
}

# P1 = important for quality pilot
$p1ReadyItems = @(
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0O5g"; label="SCR-07 terug naar vorige hole correctie"; size=$M },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Ouo"; label="ORG-07 DNS/DNF/DSQ status wijzigen UI"; size=$S },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0OvE"; label="ORG-08 scorecorrecties tab werkend"; size=$S },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PMs"; label="PRI-03 speler anonimiseren UI"; size=$S },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Owo"; label="ORG-11 flights handmatig aanpassen"; size=$S },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PYo"; label="INFRA-01 CI/CD uitbreiden met tests"; size=$L }
)

foreach ($item in $p1ReadyItems) {
    Write-Host "  🟡 P1: $($item.label)" -ForegroundColor Yellow
    Set-ItemStatus   -ItemId $item.id -OptionId $STATUS_READY
    Set-ItemPriority -ItemId $item.id -OptionId $P1
    Set-ItemSize     -ItemId $item.id -OptionId $item.size
}


# ============================================================
# IN PROGRESS — Items that are partially done
# ============================================================
Write-Host ""
Write-Host "Marking partially implemented items as In Progress..." -ForegroundColor Cyan

$inProgressItems = @(
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0OnM"; label="VS-02 data exporteerbaar (API ok, UI nog niet)"; priority=$P1; size=$M },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0Oo4"; label="VS-06 offline-first (Dexie ok, SW registratie pending)"; priority=$P0; size=$M },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PQE"; label="PRI-07 JSON export (leaderboard ok, export-endpoint ontbreekt)"; priority=$P1; size=$S },
    @{ id="PVTI_lAHOAJw35s4Bbn3Lzgw0PZw"; label="INFRA-04 developer documentatie"; priority=$P1; size=$M }
)

foreach ($item in $inProgressItems) {
    Write-Host "  🔵 In Progress: $($item.label)" -ForegroundColor Cyan
    Set-ItemStatus   -ItemId $item.id -OptionId $STATUS_PROGRESS
    Set-ItemPriority -ItemId $item.id -OptionId $item.priority
    Set-ItemSize     -ItemId $item.id -OptionId $item.size
}

