#======================
# LOCAL
#======================
# Risk Liquidity
#Basel3
node ./build/impl/local/verifier/RiskBasel3LocalMultiVerifier.js BASEL_GROUP_001 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json

#StableCoin
node ./build/impl/local/verifier/RiskStableCoinLocalMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-2.json ultra_strict US

#Advanced
node ./build/impl/local/verifier/RiskAdvancedLocalMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json

#======================
# NETWORK
#======================
# Risk Liquidity
#Basel3
node ./build/impl/network/verifier/RiskBasel3NetworkMultiVerifier.js BASEL_GROUP_001 80 85 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json ultra_strict US

#StableCoin
node ./build/impl/network/verifier/RiskStableCoinNetworkMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US

#Advanced
node ./build/impl/network/verifier/RiskAdvancedNetworkMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json
