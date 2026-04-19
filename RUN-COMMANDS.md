# ZK-PRET Test Run Commands

> Open PowerShell inside `zk-pret-test-v3.7\` and copy-paste any command below.
> All commands use `-ExecutionPolicy Bypass` so you never hit the Windows execution policy block.

---

## Run by Suite (via PowerShell logger)

These run the tests AND save logs + a `summary.json` into `test-run-logs\` for the dashboard.

```powershell
# ALL tests (all suites)
powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1

# Compliance only
powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite compliance

# Business Process only
powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite process

# Risk only
powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite risk

# Data Integrity only
powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite dataintegrity

# Composed only
powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 -Suite composed
```

---

## Run with Email Alert on Failure

```powershell
powershell -ExecutionPolicy Bypass -File .\run-tests-and-log.ps1 `
  -EmailOnFailure $true `
  -EmailTo "you@gmail.com" `
  -EmailFrom "sender@gmail.com" `
  -SmtpUser "sender@gmail.com" `
  -SmtpPass "your-gmail-app-password"
```

> For Gmail, use an **App Password** (not your regular password).  
> Go to: Google Account → Security → 2-Step Verification → App passwords.

---

## Individual Commands (direct, from `runAllTest3.7\`)

These are the raw commands from the `.sh` files. Run them directly in PowerShell or terminal.

---

### Compliance — `runAllTest-compliance.sh`

#### LOCAL

```powershell
# Corporate Registration (Local)
npm run test:local-complete-CorpReg "U01112TZ2022PTC039493"

# EXIM Optimized (Local)
npm run test:local-complete-EXIM "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"

# GLEIF Optimized (Local)
npm run test:local-complete-GLEIF "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
```

#### NETWORK

```powershell
# Corporate Registration (Network)
node ./build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js "U01112TZ2022PTC039493"

# EXIM Optimized (Network)
node ./build/impl/network/verifier/EXIMNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"

# GLEIF Optimized (Network)
node ./build/impl/network/verifier/GLEIFNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
```

---

### Business Process — `runAllTest-process.sh`

#### LOCAL

```powershell
# STABLECOIN (Local)
node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn

# DVP (Local)
node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn

# SCF (Local)
node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn
```

#### NETWORK

```powershell
# STABLECOIN (Network)
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn

# DVP (Network)
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn

# SCF (Network)
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn
```

---

### Data Integrity — `runAllTest-dataintegrity.sh`

#### LOCAL

```powershell
# Business Standard Data Integrity - BOL (Local)
node ./build/impl/local/verifier/BusinessStdIntegrityLocalMultiVerifier.js group1 BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
```

#### NETWORK

```powershell
# Business Standard Data Integrity - BOL (Network)
node ./build/impl/network/verifier/BusinessStdIntegrityNetworkMultiVerifier.js group1 BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
```

---

### Risk — `runAllTest-risk.sh`

#### LOCAL

```powershell
# Basel3 (Local)
node ./build/impl/local/verifier/RiskBasel3LocalMultiVerifier.js BASEL_GROUP_001 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json

# StableCoin (Local)
node ./build/impl/local/verifier/RiskStableCoinLocalMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-2.json ultra_strict US

# Advanced (Local)
node ./build/impl/local/verifier/RiskAdvancedLocalMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json
```

#### NETWORK

```powershell
# Basel3 (Network)
node ./build/impl/network/verifier/RiskBasel3NetworkMultiVerifier.js BASEL_GROUP_001 80 85 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json ultra_strict US

# StableCoin (Network)
node ./build/impl/network/verifier/RiskStableCoinNetworkMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US

# Advanced (Network)
node ./build/impl/network/verifier/RiskAdvancedNetworkMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json
```

---

### Composed — `runAllTest-composed.sh`

```powershell
# Composed Recursive 3-Level Verification Test
node ./build/impl/test/ComposedRecursive3LevelVerificationTest.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "U01112TZ2022PTC039493"
```

---

## Source files reference

| File | Contents |
|------|----------|
| `runAllTest3.7.sh` | All suites combined (LOCAL + NETWORK) |
| `runAllTest3.7\runAllTest-compliance.sh` | Compliance LOCAL + NETWORK |
| `runAllTest3.7\runAllTest-process.sh` | Business Process LOCAL + NETWORK |
| `runAllTest3.7\runAllTest-dataintegrity.sh` | Data Integrity LOCAL + NETWORK |
| `runAllTest3.7\runAllTest-risk.sh` | Risk LOCAL + NETWORK |
| `runAllTest3.7\runAllTest-composed.sh` | Composed (Recursive 3-Level) |
| `run-tests-and-log.ps1` | PowerShell logger — runs all above + saves logs for dashboard |
| `test-dashboard.html` | Dashboard UI — open in browser after running the logger |
