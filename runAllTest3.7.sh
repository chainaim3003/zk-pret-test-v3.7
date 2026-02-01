#======================
# LOCAL
#======================

# Corporate Registration  
npm run test:local-complete-CorpReg "U01112TZ2022PTC039493"

# EXIM Optimized  
npm run test:local-complete-EXIM "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"

# GLEIF Optimized 
npm run test:local-complete-GLEIF "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"


#BusinessProcess
# STABLECOIN
node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn
# DVP
node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn
# SCF
node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn


# Business Standard Data Integrity
node ./build/impl/local/verifier/BusinessStdIntegrityLocalMultiVerifier.js group1 BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json


# Risk Liquidity
#Basel3
node ./build/impl/local/verifier/RiskBasel3LocalMultiVerifier.js 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json
#StableCoin
node ./build/impl/local/verifier/RiskStableCoinLocalMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-2.json ultra_strict US
#Advanced
node ./build/impl/local/verifier/RiskAdvancedLocalMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json




#======================
# NETWORK
#======================

# Corporate Registration  
node ./build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js "U01112TZ2022PTC039493"
Contract Address: B62qmmmVmzCsvoQTTuyUMMZvWuLJx8ZzvX6tow4G55rTCA1mZVozEUK

# EXIM Optimized  
node ./build/impl/network/verifier/EXIMNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
Contract Address: B62qqpurNfRXviTkNjzqpXwrJWda78UWiwXzLXPhqVtTuuFb3J1Y24r

# GLEIF Optimized 
node ./build/impl/network/verifier/GLEIFNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
Contract Address: B62qqTMTF4KVhFZ82Fkrqakgt1uYE1vi78gjooEiq2Fgo3wyPqd1P5q

#BusinessProcess
# STABLECOIN
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn
Contract Address: B62qmTMsVXhNzWCxguQV2wkAwnDKh1qzGycnykGL6fZpMuX5A5B1dAv

# DVP
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn
Contract Address: B62qmTMsVXhNzWCxguQV2wkAwnDKh1qzGycnykGL6fZpMuX5A5B1dAv

# SCF
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn
Contract Address: B62qmTMsVXhNzWCxguQV2wkAwnDKh1qzGycnykGL6fZpMuX5A5B1dAv


# Business Standard Data Integrity
node ./build/impl/network/verifier/BusinessStdIntegrityNetworkMultiVerifier.js group1 BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
Contract Address: B62qqdSrrAbyuZCts9fHKwCPVYWUvVEfKHftPBmcANt72SHf3Yz5yZ9


# Risk Liquidity
#Basel3
node ./build/impl/network/verifier/RiskBasel3NetworkMultiVerifier.js 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json

#StableCoin
node ./build/impl/network/verifier/RiskStableCoinNetworkMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US
Contract Address: B62qpB6XFGtLpjQPgHzNELzeQMMVXKwq2fhVw4UE5MLSf63KzWMyq8L

#Advanced
node ./build/impl/network/verifier/RiskAdvancedNetworkMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json
Contract Address: B62qnAv9Rv1K4hfDwx1BgzX9m3KRjKpyEeHHEXEjHtdersGzPzUQmTs

#======================
# Composed
#======================
# Composed Recursive 3 Level Verification Test

node ./build/impl/test/ComposedRecursive3LevelVerificationTest.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "U01112TZ2022PTC039493"

#deploy risk contract
node ./build/scripts/network/deploy-risk-stablecoin.js