#======================
# LOCAL
#======================
#BusinessProcess
# STABLECOIN
node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn

# DVP
node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn

# SCF
node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn


#======================
# NETWORK
#======================
#BusinessProcess
# STABLECOIN
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn

# DVP
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn

# SCF
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn
