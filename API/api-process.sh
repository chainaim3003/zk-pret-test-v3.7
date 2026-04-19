
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

