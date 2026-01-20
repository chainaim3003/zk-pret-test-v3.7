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
node ./build/impl/local/verifier/BusinessStdIntegrityLocalMultiVerifier.js BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json


# Risk Liquidity
#Basel3
node ./build/impl/local/verifier/RiskBasel3LocalMultiVerifier.js 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json
#StableCoin
node ./build/impl/local/verifier/RiskStableCoinLocalMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-2.json ultra_strict US
#Advanced
node ./build/impl/local/verifier/RiskAdvancedLocalMultiVerifier.js 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json




#======================
# NETWORK
#======================

# Corporate Registration  
node ./build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js "U01112TZ2022PTC039493"

# EXIM Optimized  
node ./build/impl/network/verifier/EXIMNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"

# GLEIF Optimized 
node ./build/impl/network/verifier/GLEIFNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"


#BusinessProcess
# STABLECOIN
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn
# DVP
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn
# SCF
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn


# Business Standard Data Integrity
node ./build/impl/network/verifier/BusinessStdIntegrityNetworkMultiVerifier.js group1 BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json


# Risk Liquidity
#Basel3
node ./build/impl/network/verifier/RiskBasel3NetworkMultiVerifier.js 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json
#StableCoin
node ./build/impl/network/verifier/RiskStableCoinNetworkMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US
#Advanced
node ./build/impl/network/verifier/RiskAdvancedNetworkMultiVerifier.js 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json



#======================
# Composed
#======================
# Composed Recursive 3 Level Verification Test

node ./build/impl/test/ComposedRecursive3LevelVerificationTest.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "U01112TZ2022PTC039493"


#deploy risk contract
node ./build/scripts/network/deploy-risk-stablecoin.js