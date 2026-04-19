# =============================================================================
# ZK-PRET Test Runner with Structured Logging
# =============================================================================
# HOW TO RUN (open PowerShell in the project folder):
#
#   powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1
#
#   Run a specific suite:
#   powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite compliance
#   powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite risk
#   powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite process
#   powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite dataintegrity
#   powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite composed
#
#   With email alerts on failure:
#   powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 `
#       -EmailOnFailure $true -EmailTo "you@gmail.com" `
#       -EmailFrom "sender@gmail.com" -SmtpUser "sender@gmail.com" -SmtpPass "app-password"
# =============================================================================

param(
    [string]$Suite = "all",
    [bool]$EmailOnFailure = $false,
    [string]$EmailTo = "",
    [string]$EmailFrom = "",
    [string]$SmtpServer = "smtp.gmail.com",
    [int]$SmtpPort = 587,
    [string]$SmtpUser = "",
    [string]$SmtpPass = ""
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

# ---------- CONFIG -----------------------------------------------------------
$ProjectRoot = $PSScriptRoot
$TestLogsDir = Join-Path $ProjectRoot "test-run-logs"
$Timestamp   = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$RunDir      = Join-Path $TestLogsDir $Timestamp
$SummaryFile = Join-Path $RunDir "summary.json"

# Create the log folder for this run
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
Write-Host ""
Write-Host "=== ZK-PRET Test Runner ===" -ForegroundColor Cyan
Write-Host "Run ID   : $Timestamp" -ForegroundColor Cyan
Write-Host "Suite    : $Suite" -ForegroundColor Cyan
Write-Host "Log dir  : $RunDir" -ForegroundColor Cyan
Write-Host ""

# ---------- HELPER: Run one test --------------------------------------------
function Run-Test {
    param(
        [string]$TestId,
        [string]$Category,
        [string]$Mode,
        [string]$Description,
        [string]$Command,
        [string[]]$CmdArgs
    )

    $logFile   = Join-Path $RunDir "$TestId.log"
    $startTime = Get-Date

    Write-Host "[RUN] $Description" -ForegroundColor Yellow
    Write-Host "      $Command $($CmdArgs -join ' ')" -ForegroundColor DarkGray

    # Write log header immediately so the file exists even on crash
    $header = @(
        "=== ZK-PRET Test Log ===",
        "TestId      : $TestId",
        "Category    : $Category",
        "Mode        : $Mode",
        "Description : $Description",
        "Command     : $Command $($CmdArgs -join ' ')",
        "StartTime   : $($startTime.ToString('yyyy-MM-ddTHH:mm:ss'))",
        "WorkingDir  : $ProjectRoot",
        "---"
    )
    $header | Set-Content $logFile -Encoding UTF8

    $stdoutFile = "$logFile.out"
    $stderrFile = "$logFile.err"

    try {
        # Resolve npm/npx to their .cmd equivalents so Start-Process works on Windows
        $resolvedCmd = $Command
        if ($Command -eq "npm")  { $resolvedCmd = "npm.cmd"  }
        if ($Command -eq "npx")  { $resolvedCmd = "npx.cmd"  }

        $proc = Start-Process `
            -FilePath $resolvedCmd `
            -ArgumentList $CmdArgs `
            -WorkingDirectory $ProjectRoot `
            -RedirectStandardOutput $stdoutFile `
            -RedirectStandardError  $stderrFile `
            -NoNewWindow -PassThru -Wait

        $endTime  = Get-Date
        $duration = [math]::Round(($endTime - $startTime).TotalSeconds, 2)
        $exitCode = $proc.ExitCode

        $stdout = if (Test-Path $stdoutFile) { Get-Content $stdoutFile -Raw -Encoding UTF8 } else { "" }
        $stderr = if (Test-Path $stderrFile) { Get-Content $stderrFile -Raw -Encoding UTF8 } else { "" }

        Remove-Item $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item $stderrFile -Force -ErrorAction SilentlyContinue

        # Determine status
        $combined = ($stdout + " " + $stderr).ToLower()
        $hasFail  = $combined -match "verification failed|proof failed|error:|exception:|test failed|failed:"
        $hasPass  = $combined -match "verification successful|proof generated|all tests passed|success|passed"

        if ($exitCode -ne 0) {
            $status = "FAILED"
        } elseif ($hasFail -and -not $hasPass) {
            $status = "FAILED"
        } else {
            $status = "PASSED"
        }

        # Write full log
        $footer = @(
            "",
            "EndTime     : $($endTime.ToString('yyyy-MM-ddTHH:mm:ss'))",
            "Duration    : ${duration}s",
            "ExitCode    : $exitCode",
            "Status      : $status",
            "",
            "=== STDOUT ===",
            $stdout,
            "=== STDERR ===",
            $stderr,
            "=== END ==="
        )
        Add-Content $logFile -Value $footer -Encoding UTF8

        $color = if ($status -eq "PASSED") { "Green" } else { "Red" }
        Write-Host "      [$status] exit=$exitCode  duration=${duration}s" -ForegroundColor $color

        # Extract first error snippet for summary
        $errSnip = ""
        if ($status -eq "FAILED") {
            $lines   = ($stderr + "`n" + $stdout) -split "`n"
            $errSnip = ($lines | Where-Object { $_ -match "error:|exception:|failed" } | Select-Object -First 2) -join " | "
        }

    } catch {
        $endTime  = Get-Date
        $duration = [math]::Round(($endTime - $startTime).TotalSeconds, 2)
        $errMsg   = $_.Exception.Message
        $exitCode = -1
        $status   = "ERROR"
        $errSnip  = $errMsg

        Add-Content $logFile -Value @(
            "",
            "EndTime  : $($endTime.ToString('yyyy-MM-ddTHH:mm:ss'))",
            "Duration : ${duration}s",
            "Status   : ERROR",
            "Error    : $errMsg",
            "=== END ==="
        ) -Encoding UTF8

        Write-Host "      [ERROR] $errMsg" -ForegroundColor Red

        Remove-Item $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item $stderrFile -Force -ErrorAction SilentlyContinue
    }

    return [PSCustomObject]@{
        testId       = $TestId
        category     = $Category
        mode         = $Mode
        description  = $Description
        command      = "$Command $($CmdArgs -join ' ')"
        status       = $status
        exitCode     = $exitCode
        durationSec  = $duration
        startTime    = $startTime.ToString("yyyy-MM-ddTHH:mm:ss")
        endTime      = $endTime.ToString("yyyy-MM-ddTHH:mm:ss")
        logFile      = "$TestId.log"
        errorSnippet = $errSnip
    }
}

# ---------- TEST DEFINITIONS  (mirrored exactly from runAllTest3.7.sh) -------
$AllTests = @(

    # ---- COMPLIANCE / LOCAL ----
    [PSCustomObject]@{ Id="compliance-local-corpreg"; Cat="Compliance"; Mode="Local"
        Desc="Corporate Registration (Local)"
        Cmd="npm"; Args=@("run","test:local-complete-CorpReg","--","U01112TZ2022PTC039493") },

    [PSCustomObject]@{ Id="compliance-local-exim"; Cat="Compliance"; Mode="Local"
        Desc="EXIM Optimized (Local)"
        Cmd="npm"; Args=@("run","test:local-complete-EXIM","--","SREE PALANI ANDAVAR AGROS PRIVATE LIMITED") },

    [PSCustomObject]@{ Id="compliance-local-gleif"; Cat="Compliance"; Mode="Local"
        Desc="GLEIF Optimized (Local)"
        Cmd="npm"; Args=@("run","test:local-complete-GLEIF","--","SREE PALANI ANDAVAR AGROS PRIVATE LIMITED") },

    # ---- COMPLIANCE / NETWORK ----
    [PSCustomObject]@{ Id="compliance-network-corpreg"; Cat="Compliance"; Mode="Network"
        Desc="Corporate Registration (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js","U01112TZ2022PTC039493") },

    [PSCustomObject]@{ Id="compliance-network-exim"; Cat="Compliance"; Mode="Network"
        Desc="EXIM Optimized (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/EXIMNetworkMultiVerifier.js","SREE PALANI ANDAVAR AGROS PRIVATE LIMITED") },

    [PSCustomObject]@{ Id="compliance-network-gleif"; Cat="Compliance"; Mode="Network"
        Desc="GLEIF Optimized (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/GLEIFNetworkMultiVerifier.js","SREE PALANI ANDAVAR AGROS PRIVATE LIMITED") },

    # ---- BUSINESS PROCESS / LOCAL ----
    [PSCustomObject]@{ Id="process-local-stablecoin"; Cat="BusinessProcess"; Mode="Local"
        Desc="Business Process - STABLECOIN (Local)"
        Cmd="node"; Args=@("./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js","bpmngroup1","STABLECOIN","./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn","./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn") },

    [PSCustomObject]@{ Id="process-local-dvp"; Cat="BusinessProcess"; Mode="Local"
        Desc="Business Process - DVP (Local)"
        Cmd="node"; Args=@("./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js","bpmngroup1","DVP","./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn","./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn") },

    [PSCustomObject]@{ Id="process-local-scf"; Cat="BusinessProcess"; Mode="Local"
        Desc="Business Process - SCF (Local)"
        Cmd="node"; Args=@("./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js","bpmngroup1","SCF","./src/data/scf/process/EXPECTED/SCF-Expected.bpmn","./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn") },

    # ---- BUSINESS PROCESS / NETWORK ----
    [PSCustomObject]@{ Id="process-network-stablecoin"; Cat="BusinessProcess"; Mode="Network"
        Desc="Business Process - STABLECOIN (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js","bpmngroup1","STABLECOIN","./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn","./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn") },

    [PSCustomObject]@{ Id="process-network-dvp"; Cat="BusinessProcess"; Mode="Network"
        Desc="Business Process - DVP (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js","bpmngroup1","DVP","./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn","./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn") },

    [PSCustomObject]@{ Id="process-network-scf"; Cat="BusinessProcess"; Mode="Network"
        Desc="Business Process - SCF (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js","bpmngroup1","SCF","./src/data/scf/process/EXPECTED/SCF-Expected.bpmn","./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn") },

    # ---- DATA INTEGRITY / LOCAL ----
    [PSCustomObject]@{ Id="dataintegrity-local-bol"; Cat="DataIntegrity"; Mode="Local"
        Desc="Business Std Data Integrity - BOL (Local)"
        Cmd="node"; Args=@("./build/impl/local/verifier/BusinessStdIntegrityLocalMultiVerifier.js","group1","BOL","./src/data/scf/BILLOFLADING/BOL-VALID-1.json") },

    # ---- DATA INTEGRITY / NETWORK ----
    [PSCustomObject]@{ Id="dataintegrity-network-bol"; Cat="DataIntegrity"; Mode="Network"
        Desc="Business Std Data Integrity - BOL (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/BusinessStdIntegrityNetworkMultiVerifier.js","group1","BOL","./src/data/scf/BILLOFLADING/BOL-VALID-1.json") },

    # ---- RISK / LOCAL ----
    [PSCustomObject]@{ Id="risk-local-basel3"; Cat="Risk"; Mode="Local"
        Desc="Risk Basel3 (Local)"
        Cmd="node"; Args=@("./build/impl/local/verifier/RiskBasel3LocalMultiVerifier.js","BASEL_GROUP_001","80","80","http://34.203.247.32:8083/eventsBatch","src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json") },

    [PSCustomObject]@{ Id="risk-local-stablecoin"; Cat="Risk"; Mode="Local"
        Desc="Risk StableCoin (Local)"
        Cmd="node"; Args=@("./build/impl/local/verifier/RiskStableCoinLocalMultiVerifier.js","RISK_GROUP_001","100","http://34.203.247.32:8083/eventsBatch","src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-2.json","ultra_strict","US") },

    [PSCustomObject]@{ Id="risk-local-advanced"; Cat="Risk"; Mode="Local"
        Desc="Risk Advanced (Local)"
        Cmd="node"; Args=@("./build/impl/local/verifier/RiskAdvancedLocalMultiVerifier.js","RISK_GROUP_001","100","http://34.203.247.32:8083/eventsBatch","src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json") },

    # ---- RISK / NETWORK ----
    [PSCustomObject]@{ Id="risk-network-basel3"; Cat="Risk"; Mode="Network"
        Desc="Risk Basel3 (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/RiskBasel3NetworkMultiVerifier.js","BASEL_GROUP_001","80","85","http://34.203.247.32:8083/eventsBatch","src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json","ultra_strict","US") },

    [PSCustomObject]@{ Id="risk-network-stablecoin"; Cat="Risk"; Mode="Network"
        Desc="Risk StableCoin (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/RiskStableCoinNetworkMultiVerifier.js","RISK_GROUP_001","100","http://34.203.247.32:8083/eventsBatch","src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json","ultra_strict","US") },

    [PSCustomObject]@{ Id="risk-network-advanced"; Cat="Risk"; Mode="Network"
        Desc="Risk Advanced (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/RiskAdvancedNetworkMultiVerifier.js","RISK_GROUP_001","100","http://34.203.247.32:8083/eventsBatch","src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json") },

    # ---- COMPOSED / LOCAL ----
    [PSCustomObject]@{ Id="composed-local"; Cat="Composed"; Mode="Local"
        Desc="Composed Optimized (Local)"
        Cmd="npm"; Args=@("run","test:local-complete-Composed","--","SREE PALANI ANDAVAR AGROS PRIVATE LIMITED","U01112TZ2022PTC039493") },

    # ---- COMPOSED / NETWORK ----
    [PSCustomObject]@{ Id="composed-network"; Cat="Composed"; Mode="Network"
        Desc="Composed Optimized (Network)"
        Cmd="node"; Args=@("./build/impl/network/verifier/ComposedNetworkMultiVerifier.js","SREE PALANI ANDAVAR AGROS PRIVATE LIMITED","U01112TZ2022PTC039493") },

    [PSCustomObject]@{ Id="composed-recursive"; Cat="Composed"; Mode="Local"
        Desc="Composed Recursive 3-Level Verification"
        Cmd="node"; Args=@("./build/impl/test/ComposedRecursive3LevelVerificationTest.js","SREE PALANI ANDAVAR AGROS PRIVATE LIMITED","U01112TZ2022PTC039493") }
)

# ---------- FILTER BY SUITE --------------------------------------------------
$suiteMap = @{
    "compliance"    = @("Compliance")
    "process"       = @("BusinessProcess")
    "risk"          = @("Risk")
    "dataintegrity" = @("DataIntegrity")
    "composed"      = @("Composed")
    "all"           = @("Compliance","BusinessProcess","Risk","DataIntegrity","Composed")
}

$cats = $suiteMap[$Suite.ToLower()]
if (-not $cats) {
    Write-Host "Unknown suite '$Suite'. Valid values: all, compliance, process, risk, dataintegrity, composed" -ForegroundColor Red
    exit 1
}
$TestsToRun = $AllTests | Where-Object { $cats -contains $_.Cat }
Write-Host "Running $($TestsToRun.Count) tests..." -ForegroundColor Cyan
Write-Host ""

# ---------- RUN ALL TESTS ----------------------------------------------------
$Results = @()
foreach ($t in $TestsToRun) {
    $r = Run-Test -TestId $t.Id -Category $t.Cat -Mode $t.Mode `
                  -Description $t.Desc -Command $t.Cmd -CmdArgs $t.Args
    $Results += $r
    Write-Host ""
}

# ---------- WRITE SUMMARY.JSON -----------------------------------------------
$passed  = ($Results | Where-Object { $_.status -eq "PASSED" }).Count
$failed  = ($Results | Where-Object { $_.status -eq "FAILED" }).Count
$errored = ($Results | Where-Object { $_.status -eq "ERROR"  }).Count
$total   = $Results.Count
$overall = if (($failed + $errored) -gt 0) { "FAILED" } else { "PASSED" }

$summary = [ordered]@{
    runId         = $Timestamp
    suite         = $Suite
    overallStatus = $overall
    total         = $total
    passed        = $passed
    failed        = $failed
    errored       = $errored
    startTime     = $Results[0].startTime
    endTime       = $Results[-1].endTime
    tests         = $Results
}

$summary | ConvertTo-Json -Depth 10 | Set-Content $SummaryFile -Encoding UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESULT : $overall   ($passed/$total passed)" -ForegroundColor $(if ($overall -eq "PASSED") {"Green"} else {"Red"})
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
$Results | Format-Table -Property @{L='Status';E={$_.status}}, @{L='Duration';E={"$($_.durationSec)s"}}, @{L='Category';E={$_.category}}, @{L='Mode';E={$_.mode}}, @{L='Test';E={$_.description}} -AutoSize
Write-Host ""
Write-Host "Logs saved to : $RunDir" -ForegroundColor DarkGray
Write-Host "Summary JSON  : $SummaryFile" -ForegroundColor DarkGray
Write-Host ""
Write-Host "To view the dashboard:" -ForegroundColor Yellow
Write-Host "  1. Open test-dashboard.html in your browser" -ForegroundColor Yellow
Write-Host "  2. Click 'Load logs folder' and select the 'test-run-logs' folder" -ForegroundColor Yellow
Write-Host ""

# ---------- EMAIL ON FAILURE -------------------------------------------------
if ($EmailOnFailure -and $overall -eq "FAILED" -and $EmailTo -ne "") {
    try {
        $failedList = ($Results | Where-Object { $_.status -ne "PASSED" } | ForEach-Object {
            "  [$($_.status)] $($_.description)`n         $($_.errorSnippet)"
        }) -join "`n"

        $body = @"
ZK-PRET Test Suite Alert
========================
Run      : $Timestamp
Suite    : $Suite
Result   : $overall
Total    : $total  |  Passed: $passed  |  Failed: $failed  |  Errors: $errored

Failed / Error tests:
$failedList

Full logs saved at: $RunDir
Open test-dashboard.html to see the visual dashboard.
"@
        $sec  = ConvertTo-SecureString $SmtpPass -AsPlainText -Force
        $cred = New-Object System.Management.Automation.PSCredential($SmtpUser, $sec)
        Send-MailMessage `
            -To $EmailTo -From $EmailFrom `
            -Subject "[ZK-PRET] $overall - $Timestamp" `
            -Body $body `
            -SmtpServer $SmtpServer -Port $SmtpPort `
            -UseSsl -Credential $cred
        Write-Host "Alert email sent to $EmailTo" -ForegroundColor Green
    } catch {
        Write-Host "Email send failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

exit $(if ($overall -eq "PASSED") { 0 } else { 1 })
