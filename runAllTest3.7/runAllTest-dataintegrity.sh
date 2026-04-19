#======================
# LOCAL
#======================
# Business Standard Data Integrity
node ./build/impl/local/verifier/BusinessStdIntegrityLocalMultiVerifier.js group1 BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json

#======================
# NETWORK
#======================
# Business Standard Data Integrity
node ./build/impl/network/verifier/BusinessStdIntegrityNetworkMultiVerifier.js group1 BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json

