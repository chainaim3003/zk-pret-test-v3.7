# =============================================================================
# OLD TESTS - Legacy verification tests (non-Merkle commands)
# =============================================================================

# Corporate Registration Tests
node ./build/tests/with-sign/CorporateRegistrationVerificationTestWithSign.js

# EXIM Tests  
node ./build/tests/with-sign/EXIMVerificationTestWithSign.js

# GLEIF Tests
node ./build/tests/with-sign/GLEIFVerificationTestWithSign.js

# Composed Recursive Tests
node ./build/tests/with-sign/ComposedRecurrsiveSCF3LevelProofs.js
node ./build/tests/with-sign/ComposedRecursive3LevelVerificationTestWithSign.js

# Business Standard Data Integrity Tests
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js ./src/data/scf/BILLOFLADING/BOL-VALID-2.json
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js ./src/data/scf/BILLOFLADING/BOL-INVALID-1.json
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js ./src/data/scf/BILLOFLADING/BOL-INVALID-2.json

# Business Process Integrity Tests
node ./build/tests/with-sign/BusinessProcessIntegrityVerificationTestWithSign.js "a(cb|bc)d(ef|f)g" "abcdefg"
node ./build/tests/with-sign/BusinessProcessIntegrityVerificationFileTest.js src/data/scf/process/bpmn-SCF-Example-Process-Expected.bpmn src/data/scf/process/bpmn-SCF-Example-Execution-Actual-Accepted-1.bpmn result.txt

# Risk Liquidity ACTUS Tests
node ./build/tests/with-sign/RiskLiquidityACTUSVerifierTest_adv_zk_WithSign.js 8
node ./build/tests/with-sign/RiskLiquidityACTUSVerifierTest_adv_zk_WithSign.js 9
node build/tests/with-sign/RiskLiquidityACTUSVerifierTest_basel3_Withsign.js 0.5
node build/tests/with-sign/RiskLiquidityACTUSVerifierTest_basel3_Withsign.js 1
node build/tests/with-sign/RiskLiquidityACTUSVerifierTest_basel3_Withsign.js 2



# =============================================================================
# NEW OPTIMIZED TESTS - Simplified Valid and Invalid Scenarios
# =============================================================================

# Corporate Registration Optimized Tests - VALID & INVALID
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U01112TZ2022PTC039493"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "INVALID_COMPANY_ID_123"

# EXIM Optimized Tests - VALID & INVALID
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "INVALID COMPANY NAME TEST"

# GLEIF Optimized Tests - VALID & INVALID
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "INVALID GLEIF COMPANY TEST"

# SOME SAMPLE MULTI COMPANY
node ./build/tests/with-sign/GLEIFOptimMultiCompanyVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimMultiCompanyRefactoredInfrastructureTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"


# Composed Recursive Optimized Tests - VALID & INVALID
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "U01112TZ2022PTC039493"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "INVALID COMPANY" "INVALID_ID_123"

# Business Standard Merkle Tests - VALID & INVALID
node ./build/tests/with-sign/BusinessStdIntegrityOptimMerkleVerificationTestWithSign.js ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
node ./build/tests/with-sign/BusinessStdIntegrityOptimMerkleVerificationTestWithSign.js ./src/data/scf/BILLOFLADING/BOL-INVALID-1.json

# Risk Liquidity Basel3 Merkle Tests - VALID & INVALID
node ./build/tests/with-sign/RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js 100 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json
node ./build/tests/with-sign/RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js 100 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-INVALID-1.json

# Risk Liquidity Advanced Merkle Tests - VALID & INVALID
node ./build/tests/with-sign/RiskLiquidityAdvancedOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json
node ./build/tests/with-sign/RiskLiquidityAdvancedOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-INVALID-1.json

# Risk Liquidity Stablecoin Tests - VALID & INVALID
node ./build/tests/with-sign/RiskLiquidityStablecoinOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US
node ./build/tests/with-sign/RiskLiquidityStablecoinOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-INVALID-1.json ultra_strict US

# Business Process Integrity Optimized Merkle Tests - VALID & INVALID
node ./build/tests/with-sign/BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js SCF ./src/data/SCF/process/EXPECTED/SCF-Expected.bpmn ./src/data/SCF/process/ACTUAL/SCF-Accepted1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js SCF ./src/data/SCF/process/EXPECTED/SCF-Expected.bpmn ./src/data/SCF/process/ACTUAL/SCF-Rejected1.bpmn



# =============================================================================
# TEST SUMMARY - Complete command reference for all tests
# =============================================================================

# LEGACY VALID COMMANDS (Expected to pass):
node ./build/tests/with-sign/CorporateRegistrationVerificationTestWithSign.js
node ./build/tests/with-sign/EXIMVerificationTestWithSign.js
node ./build/tests/with-sign/GLEIFVerificationTestWithSign.js
node ./build/tests/with-sign/ComposedRecurrsiveSCF3LevelProofs.js
node ./build/tests/with-sign/ComposedRecursive3LevelVerificationTestWithSign.js
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js ./src/data/scf/BILLOFLADING/BOL-VALID-2.json
node ./build/tests/with-sign/BusinessProcessIntegrityVerificationTestWithSign.js "a(cb|bc)d(ef|f)g" "abcdefg"
node ./build/tests/with-sign/BusinessProcessIntegrityVerificationFileTest.js src/data/scf/process/bpmn-SCF-Example-Process-Expected.bpmn src/data/scf/process/bpmn-SCF-Example-Execution-Actual-Accepted-1.bpmn result.txt
node ./build/tests/with-sign/RiskLiquidityACTUSVerifierTest_adv_zk_WithSign.js 8
node build/tests/with-sign/RiskLiquidityACTUSVerifierTest_basel3_Withsign.js 0.5
node build/tests/with-sign/RiskLiquidityACTUSVerifierTest_basel3_Withsign.js 1

# LEGACY INVALID COMMANDS (Expected to fail/test error handling):
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js ./src/data/scf/BILLOFLADING/BOL-INVALID-1.json
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js ./src/data/scf/BILLOFLADING/BOL-INVALID-2.json
node ./build/tests/with-sign/RiskLiquidityACTUSVerifierTest_adv_zk_WithSign.js 9
node build/tests/with-sign/RiskLiquidityACTUSVerifierTest_basel3_Withsign.js 2

# ALL CORPORATE REGISTRATION TESTS:
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U01112TZ2022PTC039493"
node ./build/tests/with-sign/CorporateRegistrationOptimMultiCompanyVerificationTestWithSign.js "U01112TZ2022PTC039493"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U70102MH2010PTC208205"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U47733MH2025PLC443444"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U74999MH2017PTC298453"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U85110TN2022PTC154149"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U45309MH2016PTC287851"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U63040MH2019PTC325808"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U25999TN2024PTC168589"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "U52320TN2011PTC081680"
node ./build/tests/with-sign/CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "INVALID_COMPANY_ID_123"
node ./build/tests/with-sign/CorporateRegistrationOptimMultiCompanyVerificationTestWithSign.js "INVALID_COMPANY_ID_123"

# ALL EXIM TESTS:
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimMultiCompanyVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "A3B PROJECTS PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "EMAZING DEALS LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "EUSTOMA ADVISORS PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "SHWETHA SPECIALITY HOSPITAL PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "RUPAREL INFRA & REALTY PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "RNJ TRAVEL SOLUTIONS PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "LAKSHMI AGS ENGINEERING PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "RMKV SILKS PRIVATE LIMITED"
node ./build/tests/with-sign/EXIMOptimSingleCompanyVerificationTestWithSign.js "INVALID COMPANY NAME TEST"
node ./build/tests/with-sign/EXIMOptimMultiCompanyVerificationTestWithSign.js "INVALID COMPANY NAME TEST"

# ALL GLEIF TESTS:
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimMultiCompanyVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "A3B PROJECTS PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "EMAZING DEALS LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "EUSTOMA ADVISORS PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "SHWETHA SPECIALITY HOSPITAL PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "RUPAREL INFRA & REALTY PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "RNJ TRAVEL SOLUTIONS PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "LAKSHMI AGS ENGINEERING PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "RMKV SILKS PRIVATE LIMITED"
node ./build/tests/with-sign/GLEIFOptimSingleCompanyVerificationTestWithSign.js "INVALID GLEIF COMPANY TEST"
node ./build/tests/with-sign/GLEIFOptimMultiCompanyVerificationTestWithSign.js "INVALID GLEIF COMPANY TEST"

# ALL COMPOSED RECURSIVE TESTS:
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "U01112TZ2022PTC039493"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "A3B PROJECTS PRIVATE LIMITED" "U70102MH2010PTC208205"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "EMAZING DEALS LIMITED" "U47733MH2025PLC443444"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "EUSTOMA ADVISORS PRIVATE LIMITED" "U74999MH2017PTC298453"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "SHWETHA SPECIALITY HOSPITAL PRIVATE LIMITED" "U85110TN2022PTC154149"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "RUPAREL INFRA & REALTY PRIVATE LIMITED" "U45309MH2016PTC287851"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "RNJ TRAVEL SOLUTIONS PRIVATE LIMITED" "U63040MH2019PTC325808"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "LAKSHMI AGS ENGINEERING PRIVATE LIMITED" "U25999TN2024PTC168589"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "RMKV SILKS PRIVATE LIMITED" "U52320TN2011PTC081680"
node ./build/tests/with-sign/ComposedRecursiveOptim3LevelVerificationTestWithSign.js "INVALID COMPANY" "INVALID_ID_123"

# ALL BUSINESS STANDARD TESTS:
node ./build/tests/with-sign/BusinessStandardDataIntegrityVerificationTest.js ./src/data/scf/BILLOFLADING/actualBL1-VALID.json
node ./build/tests/with-sign/BusinessStandardOptimVerificationTest.js ./src/data/scf/BILLOFLADING/actualBL1-VALID.json
node ./build/tests/with-sign/BusinessStdIntegrityOptimMerkleVerificationTestWithSign.js ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
node ./build/tests/with-sign/BusinessStdIntegrityOptimMerkleVerificationTestWithSign.js ./src/data/scf/BILLOFLADING/BOL-INVALID-1.json

# ALL RISK LIQUIDITY TESTS:
node ./build/tests/with-sign/RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js 100 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json
node ./build/tests/with-sign/RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js 100 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-2.json
node ./build/tests/with-sign/RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js 100 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-INVALID-1.json
node ./build/tests/with-sign/RiskLiquidityAdvacnedOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json
node ./build/tests/with-sign/RiskLiquidityAdvancedOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-INVALID-1.json
node ./build/tests/with-sign/RiskLiquidityStablecoinOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US
node ./build/tests/with-sign/RiskLiquidityStablecoinOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-INVALID-1.json ultra_strict US
node ./build/tests/with-sign/RiskLiquidityStablecoinOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/EU/StableCoin-VALID-4.json ultra_strict EU
node ./build/tests/with-sign/RiskLiquidityStablecoinOptimMerkleVerificationTestWithSign.js 100 http://98.84.165.146:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/EU/StableCoin-INVALID-4.json ultra_strict EU

# ALL BUSINESS PROCESS TESTS:
node ./build/tests/with-sign/BusinessProcessIntegrityVerificationFileTestWithSign.js SCF ./src/data/scf/process/EXPECTED/bpmn-SCF-Example-Process-Expected.bpmn ./src/data/scf/process/ACTUAL/bpmn-SCF-Example-Execution-Actual-Accepted-1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityVerificationFileTestWithSign.js SCF ./src/data/scf/process/EXPECTED/bpmn-SCF-Example-Process-Expected.bpmn ./src/data/scf/process/ACTUAL/bpmn-SCF-Example-Execution-Actual-Rejected-1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityVerificationFileTestWithSign.js STABLECOIN ./src/data/DVP/process/bpmnCircuitDVP-expected.bpmn ./src/data/STABLECOIN/process/bpmnCircuitSTABLECOIN-accepted1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityVerificationFileTestWithSign.js STABLECOIN ./src/data/DVP/process/bpmnCircuitDVP-expected.bpmn ./src/data/STABLECOIN/process/bpmnCircuitSTABLECOIN-rejected1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js SCF ./src/data/SCF/process/EXPECTED/SCF-Expected.bpmn ./src/data/SCF/process/ACTUAL/SCF-Accepted1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js SCF ./src/data/SCF/process/EXPECTED/SCF-Expected.bpmn ./src/data/SCF/process/ACTUAL/SCF-Rejected1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Rejected1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn
node ./build/tests/with-sign/BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Rejected1.bpmncle