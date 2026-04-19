#======================
# LOCAL
#======================

# Corporate Registration  
npm run test:local-complete-CorpReg "U01112TZ2022PTC039493"

# EXIM Optimized  
npm run test:local-complete-EXIM "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"

# GLEIF Optimized 
npm run test:local-complete-GLEIF "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"



#======================
# NETWORK
#======================

# Corporate Registration  
node ./build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js "U01112TZ2022PTC039493"

# EXIM Optimized  
node ./build/impl/network/verifier/EXIMNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"

# GLEIF Optimized 
node ./build/impl/network/verifier/GLEIFNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"