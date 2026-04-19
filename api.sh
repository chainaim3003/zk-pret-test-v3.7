
# Corporate Registration  
POST http://localhost:3001/zkpret/compliance/global/corporate/
Body (JSON):
{
  "cin": "U01112TZ2022PTC039493"
}

# EXIM Optimized  

POST http://localhost:3001/zkpret/compliance/global/exim/
Headers: Content-Type: application/json
Body (JSON):
{
  "companyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
}

# GLEIF Optimized 
### 1. Basic GLEIF Verification (POST - Body)
POST http://localhost:3001/zkpret/compliance/global/lei/
Body (JSON):
{
  "companyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
}
### 2. GLEIF Verification (GET - URL param)
```
GET http://localhost:3001/zkpret/compliance/global/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 3. GLEIF Verification (POST - URL param)
```
POST http://localhost:3001/zkpret/compliance/global/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 4. Full ZK Proof Verification
```
POST http://localhost:3001/zkpret/verify/lei/
Body (JSON):
{
  "companyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
}
```

---

### 5. GLEIF Evaluation (Step-by-Step) - GET
```
GET http://localhost:3001/zkpret/compliance/global/eval/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 6. GLEIF Evaluation - POST
```
POST http://localhost:3001/zkpret/compliance/global/eval/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 7. GLEIF ZK Proof Only - GET
```
GET http://localhost:3001/zkpret/compliance/global/eval/proof/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 8. GLEIF ZK Proof Only - POST
```
POST http://localhost:3001/zkpret/compliance/global/eval/proof/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 9. Async GLEIF (returns Job ID)
```
POST http://localhost:3001/api/v1/tools/gleif
Body (JSON):
{
  "companyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
}


#BusinessProcess
# STABLECOIN
POST http://localhost:3001/zkpret/compliance/business/stablecoin/
Body (JSON):
{
  "expectedFile": "./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn",
  "actualFile": "./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn"
}

# DVP
POST http://localhost:3001/zkpret/compliance/business/dvp/
Body (JSON):
{
  "expectedFile": "./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn",
  "actualFile": "./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn"
}


# SCF
Generic (POST): http://localhost:3001/zkpret/compliance/business/process/
Body (JSON):
{
  "processType": "SCF",
  "expectedProcessFilePath": "./src/data/scf/process/EXPECTED/SCF-Expected.bpmn",
  "actualProcessFilePath": "./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn"
}

SCF (POST): http://localhost:3001/zkpret/compliance/business/scf/
Body (JSON):
{
  "expectedFile": "./src/data/scf/process/EXPECTED/SCF-Expected.bpmn",
  "actualFile": "./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn"
}



# Business Standard Data Integrity
POST //localhost:3001/zkpret/compliance/data/integrity/c
Headers: Content-Type: application/json
Body (JSON):
{
  "dataType": "BOL",
  "filePath": "./src/data/scf/BILLOFLADING/BOL-VALID-1.json"
}


# Risk Liquidity
#Basel3
POST http://localhost:3001/zkpret/compliance/risk/verification/
Body (JSON):
{
  "riskType": "basel3",
  "environment": "local",
  "lcrThreshold": 80,
  "nsfrThreshold": 80,
  "actusUrl": "http://34.203.247.32:8083/eventsBatch",
  "configFilePath": "src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json"
}


#StableCoin
POST http://localhost:3001/zkpret/compliance/risk/verification/
Body (JSON):
{
  "riskType": "stablecoin",
  "environment": "local",
  "liquidityThreshold": 100,
  "actusUrl": "http://34.203.247.32:8083/eventsBatch",
  "configFilePath": "src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json",
  "executionMode": "ultra_strict",
  "jurisdiction": "US"
}


#Advanced
POST http://localhost:3001/zkpret/compliance/risk/verification/
Body (JSON):
{
  "riskType": "advanced",
  "environment": "local",
  "liquidityThreshold": 100,
  "actusUrl": "http://34.203.247.32:8083/eventsBatch",
  "configFilePath": "src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json",
  "executionMode": "ultra_strict"
}