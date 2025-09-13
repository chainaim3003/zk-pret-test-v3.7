#======================
# NEW OPTIMIZED TESTS
#======================

# Corporate Registration Optimized Tests 
npm run test:local-complete-CorpReg "U01112TZ2022PTC039493"

# EXIM Optimized Tests
npm run test:local-complete-EXIM "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"

# GLEIF Optimized Tests
npm run test:local-complete-GLEIF "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"

# Composed Recursive Optimized Tests
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "U01112TZ2022PTC039493"

# Business Standard Data Integrity Tests
node build/tests/with-sign/BusinessStdIntegrityLocalMultiVerifier.js BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json                 
node build/tests/with-sign/BusinessStdIntegrityLocalMultiVerifier.js BOL ./src/data/scf/BILLOFLADING/BOL-INVALID-1.json                 


#BusinessProcess
#Local
# STABLECOIN
node build/tests/with-sign/BusinessProcessLocalMultiVerifier.js STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn

#scf
node build/tests/with-sign/BusinessProcessLocalMultiVerifier.js SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn

#DVP
node build/tests/with-sign/BusinessProcessLocalMultiVerifier.js DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn


#Network
# STABLECOIN
node build/tests/with-sign/BusinessProcessNetworkMultiVerifier.js STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn

#scf
node build/tests/with-sign/BusinessProcessNetworkMultiVerifier.js SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn

#DVP
node build/tests/with-sign/BusinessProcessNetworkMultiVerifier.js DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn


# Risk Liquidity Stablecoin Tests - VALID & INVALID
npm run test:risk-stablecoin-local-us 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US
npm run test:risk-stablecoin-local-us 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-INVALID-1.json ultra_strict US

# Risk Liquidity 

node build/tests/with-sign/RiskBasel3LocalMultiVerifier.js 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json
node build/tests/with-sign/RiskStableCoinLocalMultiVerifier.js 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US
node build/tests/with-sign/RiskAdvancedLocalMultiVerifier.js 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json


node build/tests/with-sign/RiskBasel3NetworkMultiVerifier.js 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json
node build/tests/with-sign/RiskStableCoinNetworkMultiVerifier.js 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US
node build/tests/with-sign/RiskAdvancedNetworkMultiVerifier.js 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json


#==================================================
#ALL 8 COMPANIES
#==================================================

# Corporate Registration Optimized Tests
npm run test:local-complete-CorpReg "U01112TZ2022PTC039493"
npm run test:local-complete-CorpReg "U70102MH2010PTC208205"
npm run test:local-complete-CorpReg "U47733MH2025PLC443444"
npm run test:local-complete-CorpReg "U74999MH2017PTC298453"
npm run test:local-complete-CorpReg "U85110TN2022PTC154149"
npm run test:local-complete-CorpReg "U45309MH2016PTC287851"
npm run test:local-complete-CorpReg "U63040MH2019PTC325808"
npm run test:local-complete-CorpReg "U25999TN2024PTC168589"
npm run test:local-complete-CorpReg "U52320TN2011PTC081680"

# EXIM Optimized Tests - ACTIVE & INACTIVE
#ACTIVE
npm test-local-complete-EXIM.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
npm test-local-complete-EXIM.js "A3B PROJECTS PRIVATE LIMITED"
npm test-local-complete-EXIM.js "EMAZING DEALS LIMITED"
npm test-local-complete-EXIM.js "RUPAREL INFRA & REALTY PRIVATE LIMITED"
npm test-local-complete-EXIM.js "RNJ TRAVEL SOLUTIONS PRIVATE LIMITED"

#INACTIVE
npm test-local-complete-EXIM.js "EUSTOMA ADVISORS PRIVATE LIMITED"
npm test-local-complete-EXIM.js "SHWETHA SPECIALITY HOSPITAL PRIVATE LIMITED"
npm test-local-complete-EXIM.js "LAKSHMI AGS ENGINEERING PRIVATE LIMITED"
npm test-local-complete-EXIM.js "RMKV SILKS PRIVATE LIMITED"


# GLEIF Optimized Tests
npm run test:local-complete-GLEIF "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
npm run test:local-complete-GLEIF "A3B PROJECTS PRIVATE LIMITED"
npm run test:local-complete-GLEIF "EMAZING DEALS LIMITED"
npm run test:local-complete-GLEIF "RUPAREL INFRA & REALTY PRIVATE LIMITED"
npm run test:local-complete-GLEIF "RNJ TRAVEL SOLUTIONS PRIVATE LIMITED"
npm run test:local-complete-GLEIF "EUSTOMA ADVISORS PRIVATE LIMITED"
npm run test:local-complete-GLEIF "SHWETHA SPECIALITY HOSPITAL PRIVATE LIMITED"
npm run test:local-complete-GLEIF "LAKSHMI AGS ENGINEERING PRIVATE LIMITED"
npm run test:local-complete-GLEIF "RMKV SILKS PRIVATE LIMITED"


# Composed Recursive Optimized Tests
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "U01112TZ2022PTC039493"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "A3B PROJECTS PRIVATE LIMITED" "U70102MH2010PTC208205"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "EMAZING DEALS LIMITED" "U47733MH2025PLC443444"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "EUSTOMA ADVISORS PRIVATE LIMITED" "U74999MH2017PTC298453"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "SHWETHA SPECIALITY HOSPITAL PRIVATE LIMITED" "U85110TN2022PTC154149"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "RUPAREL INFRA & REALTY PRIVATE LIMITED" "U45309MH2016PTC287851"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "RNJ TRAVEL SOLUTIONS PRIVATE LIMITED" "U63040MH2019PTC325808"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "LAKSHMI AGS ENGINEERING PRIVATE LIMITED" "U25999TN2024PTC168589"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "RMKV SILKS PRIVATE LIMITED" "U52320TN2011PTC081680"
