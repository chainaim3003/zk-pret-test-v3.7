## ZK-PRET Proof Engine for Tokenization  

### Institutional DeFi and RWA Tokenization  
We are at the **beginning** stages of transitioning from retail-speculation to institutional adoption, with DeFi and TradFi lanes merging into **Institutional DeFi** and Real World Asset (RWA) tokenization.  

ZK-PRET focuses on filling gaps in Web3 systems to accommodate Web2 TradFi through **unified business standards**, processes, data integrity, and regulatory compliance.  

---

### Core Components  
ZK-PRET is a **business infrastructure layer** enabling tokenization use cases by effectively representing off-chain data, processes, and compliance on-chain alongside on-chain constructs.  

#### 1. Deep Composition Engine  
- **Multi-Level Compliance Proofs**:  
  - Validates compliance across jurisdictional layers (local, export-import corridors, global Legal Entity Identifier).  
  - Based on the **GLEIF standard** with configurable data sources per jurisdiction.  
- **Data Integrity Assurance**:  
  - Secures tokenized assets (e.g., Bill of Lading invoices) using **DCSA standards** for international trade invoicing.  
  - [DCSA Bill of Lading Standards](https://dcsa.org/standards/bill-of-lading)  

#### 2. Business Process Prover  
- **BPMN 2.0 Compliance**:  
  - Executes proofs for business processes modeled under **Business Process Model and Notation (BPMN 2.0)**.  
  - [BPMN 2.0 Specification](https://www.omg.org/spec/BPMN/2.0/)  

#### 3. Risk Prover  
- **ACTUS Financial Framework**:  
  - Unifies risk assessment across TradFi and DeFi using the **ACTUS standard** for financial contracts.  
  - [ACTUS Framework](https://www.actusfrf.org)  

#### 4. Registry  
- **Reference Registry Architecture**:  
  - Provides a decentralized registry for tokenized assets, ensuring interoperability between legacy and blockchain systems.  

![Slide3](https://github.com/user-attachments/assets/0db97ad2-0598-4899-986f-9b685e94f88a)
ZK-PRET operates as **individual modules** adaptable to diverse RWA use cases, with a **reference implementation** for end-to-end supply chain finance.  

![Slide17](https://github.com/user-attachments/assets/03eade42-adfc-4e44-a739-332620213310)
### Financial Opportunities 
The financiers are looking for systems that can provide risk mitigations as they are looking in to next generation tokenization.
While promoting initial use cases in compliant defi, These capabilities opens up formation of new types of hybrid financial instruments combining traditional and defi constructions for newer yield products that are sustainable and compliant.

- **International Trade Finance**: A **$2-3T opportunity**, underpenetrated even in TradFi.  
- **Supply Chain Finance**: A **$16T market**, driven by demand for risk-mitigated tokenization.  
The Internatunal Trade Finance is a 2-3 T opportunity, currently under-penerated even in TradFi., and overall Supply chain Finance is 16 T.


### Innovation Drivers  
- **Risk Mitigation**: Systems providing cryptographic proof of asset provenance and process adherence.  
- **Hybrid Financial Instruments**: Combining traditional collateral (e.g., invoices) with DeFi liquidity pools for sustainable, compliant yield products.  

![Slide11](https://github.com/user-attachments/assets/b5cfaaee-c04c-48c7-86af-bf38e3a9c4b3)

![Slide14](https://github.com/user-attachments/assets/b83d8ac5-06c3-4b6f-a266-b3e8a7e4acd8)




## The Presentation 
[ZK-PRET-RWA-MidPoint-Review-Presented.pptx](https://github.com/user-attachments/files/19946371/ZK-PRET-RWA-MidPoint-Review-Presented.pptx)


## Running the Implementation

This document provides instructions for running the zk-pret-test-v3.7 implementation.

**1. Clone the Repository:**

```bash
git clone https://github.com/chainaim3003/zk-pret-test-v3.7.git
```

### Running Test Cases from Node Runtime

Navigate to the following directory in your terminal:

```
cd /zk-pret-test-v3.7
```

Then, execute the following commands in sequence:

**1. Install Dependencies:**

```bash
npm install
```

**2. Build the Project:**

```bash
npm run build
```

**3. Run Test Cases:**

Execute each of the following commands to run individual test cases:

**CorporateRegistration :**
  *  TESTNET

     ```bash
     node ./build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js "U01112TZ2022PTC039493" "TESTNET"
     ```
  *  MAINNET
     
     ```bash
     node ./build/tests/with-sign/CorporateRegistrationVerificationTestWithSign.js "U01112TZ2022PTC039493" "MAINNET"
     ```
  *  LOCAL
    
     ```bash
     npm run test:local-complete-CorpReg "U01112TZ2022PTC039493" "LOCAL"
     ```
   **Note:** 
   * For `CorporateRegistrationNetworkMultiVerifier` in TESTNET, you can replace `"U01112TZ2022PTC039493"` with your own `CIN`
   * For LOCAL you can relpace `"U01112TZ2022PTC039493"` with your own `CIN`
 ---
**EXIM :**

  * TESTNET
  
    ```bash
    node ./build/impl/network/verifier/EXIMNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "TESTNET"
    ```
  * MAINNET
    
    ```bash
    node ./build/tests/with-sign/EXIMVerificationTestWithSign.js "palani" "MAINNET"
    ```
  * LOCAL
    
    ```bash
    npm run test:local-complete-EXIM "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "LOCAL"
    ```
   **Note:** 
   * For `EXIMNetworkMultiVerifier` you can relpace `"SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"` with your own CompanyName
---

**GLEIF :**

  * TESTNET
  
    ```bash
    node ./build/impl/network/verifier/GLEIFNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" 'TESTNET'
    ```
  * MAINNET
    
    ```bash
    node ./build/tests/with-sign/GLEIFVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" 'MAINNET'
    ```
  * LOCAL
    
    ```bash
    npm run test:local-complete-GLEIF "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" 'LOCAL'
    ```
   **Note:** 
   * For `GLEIFNetworkMultiVerifier` you can relpace `"SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"` with your own CompanyName
---
**BusinessStandardDataIntegrity**
  * TESTNET

    ```bash
    node ./build/impl/network/verifier/BusinessStdIntegrityNetworkMultiVerifier.js group1 BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
    ```
  * LOCAL

    ```bash
    node ./build/impl/local/verifier/BusinessStdIntegrityLocalMultiVerifier.js group1 BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
    ```
---
**BusinessProcessIntegrity**
  * TESTNET

    ```bash
    node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn result.txt
    ```
  * LOCAL

    ```bash
    node ./build/impl/local/verifier/BusinessProcessLocalMultiVerifier.js bpmngroup1 SCF ./src/data/scf/process/EXPECTED/SCF-Expected.bpmn ./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn
    ```

**Note:** 

* For the `BusinessProcessNetworkMultiVerifier.js` test, you can replace `"./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn"` with any of the `*.bpmn` files located in the `zk-pret-test-v3.7\src\data\scf\process` directory (Accepted or Rejected).
* You can replace `SCF` with `STABLECOIN` or `DVP`

## Business Process Prover for StableCoin Regulatory processes 

The process model for the steps of the governance of the issuance processes, and the periodic auditing is modeled , and valid paths to compliance produces a proof, and non compliance does not produce a proof.


## Passing Case 

node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn 
Expected BPMN File Name: src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn
Actual BPMN File Name: src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn

## Failing Case 

node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Rejected1.bpmn
Expected BPMN File Name: src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn
Actual BPMN File Name: src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Rejected1.bpmn



## Business Process Prover for Supply Chain Delivery Versus Payments processes

The process model for the deliveruVersusPayment processes for Supply chain processes is modeled , and valid paths to compliance produces a proof, and non compliance does not produce a proof.


## Passing Case 

node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn ./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn

Expected BPMN File Name: src/data/DVP/process/EXPECTED/DVP-Expected.bpmn
Actual BPMN File Name: src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn

## Failing Case 

node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 DVP ./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn src/data/DVP/process/ACTUAL/DVP-Rejected1.bpmn
Expected BPMN File Name: src/data/DVP/process/EXPECTED/DVP-Expected.bpmn
Actual BPMN File Name: src/data/DVP/process/ACTUAL/DVP-Rejected1.bpmn


**Composed**
## Composed Recursive 3 Level Verification Test
  
  * TESTNET 
    ```bash
    node ./build/impl/test/ComposedRecursive3LevelVerificationTest.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "U01112TZ2022PTC039493"
    ```
  **Note:** 
   * For `ComposedRecursive3LevelVerificationTest` you can replace `"U01112TZ2022PTC039493"` with your own `CIN`
   * you can relpace `"SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"` with your own CompanyName
   ---

**4. Risk Liquidity ACTUS Verifier Tests:**

*   **Passing Tests:**

Either use the actus server hosted locally on http://localhost:8083 using `ACTUS_NODE_LOCAL` or the online actus server http://34.203.247.32:8083 using `ACTUS_NODE_REMOTE`

* TESTNET
  ```bash
  node ./build/impl/network/verifier/RiskBasel3NetworkMultiVerifier.js 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json

  ```
* LOCAL
  ```bash
  node ./build/impl/local/verifier/RiskBasel3LocalMultiVerifier.js 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json
  ```
    
*   **Test to prove Failing case:**

    ```bash
    node ./build/impl/network/verifier/RiskBasel3NetworkMultiVerifier.js 80 80 http://34.203.247.32:8083/eventsBatch src/data/RISK/Basel3/CONFIG/basel3-INVALID-1.json
    ```
*   **RiskLiquidityACTUSVerifierTest_adv_zk.js Tests:**
  *   **Passing Test:**

  * TESTNET
    ```bash
    node ./build/impl/network/verifier/RiskAdvancedNetworkMultiVerifier.js 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json
    ```
  * LOCAL
    ```bash
    node ./build/impl/local/verifier/RiskAdvancedLocalMultiVerifier.js 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json
    ```
  *   **Test to prove Failing case:**

    ```bash
    node ./build/impl/network/verifier/RiskAdvancedNetworkMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/Advanced/CONFIG/Advanced-INVALID-1.json
    ```

    *   **Important:** Docker needs to be running for the `RiskBasel3LocalMultiVerifier.js` and `RiskAdvancedNetworkMultiVerifier.js` tests.

*  **RiskLiquidityACTUSVerifierTest_StableCoin Tests:**
  *   **passing Test:**
  * TESTNET

    ```bash
    node ./build/impl/network/verifier/RiskStableCoinNetworkMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json ultra_strict US
    ```
  * LOCAL
    ```bash
    node ./build/impl/local/verifier/RiskStableCoinLocalMultiVerifier.js RISK_GROUP_001 100 http://34.203.247.32:8083/eventsBatch src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-2.json ultra_strict US
    ```


**5. Run all tests**
   Alternatively, to run test cases in one go:

```bash
node ./build/tests/with-sign/runAllTests.js
```

### Setting up ACTUS Verifier with Docker

To run the ACTUS verifier tests, you need to set up the ACTUS server using Docker.

**1. Install Docker Desktop:**

Download and install Docker Desktop from: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)

**2. Follow the ACTUS Quickstart Guide:**

Refer to the official ACTUS documentation for installation instructions: [https://documentation.actusfrf.org/docs/quickstart](https://documentation.actusfrf.org/docs/quickstart)

**3. Verify Docker is Running:**

After installation, ensure that Docker is running. The Docker Desktop interface should indicate that the Docker engine is active. If it shows a "stopped" state, click the "play" button to start it.

### Running the Business Process Prover

#### Hosted Vercel Frontend

You can test the business process prover using the hosted Vercel frontend:

[https://zk-pret-bpmn-prover-test.vercel.app/](https://zk-pret-bpmn-prover-test.vercel.app/)

The implementation currently supports the Supply Chain Finance BPMN model as an example.  Any conforming BPMN 2.0 models with a definite start and end, and non-cyclical loops, can be proven.

For testing, use the expected, actual, or rejected files from the `bpmn-docs` directory.


#### Business Process Prover 


![Alt Text](images/img6.png)
 
then click **Process Both Files**

