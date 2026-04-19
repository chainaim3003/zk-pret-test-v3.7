
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