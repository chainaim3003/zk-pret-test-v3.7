
# Corporate Registration  
POST http://localhost:3001/zkpret/compliance/global/corporate/
Body (JSON):
{
  "cin": "U01112TZ2022PTC039493"
}

# EXIM Optimized  

POST http://localhost:3001/zkpret/compliance/global/exim/
Headers: Content-Type: application/json
Body (JSON):
{
  "companyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
}

# GLEIF Optimized 
### 1. Basic GLEIF Verification (POST - Body)
POST http://localhost:3001/zkpret/compliance/global/lei/
Body (JSON):
{
  "companyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
}
### 2. GLEIF Verification (GET - URL param)
```
GET http://localhost:3001/zkpret/compliance/global/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 3. GLEIF Verification (POST - URL param)
```
POST http://localhost:3001/zkpret/compliance/global/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 4. Full ZK Proof Verification
```
POST http://localhost:3001/zkpret/verify/lei/
Body (JSON):
{
  "companyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
}
```

---

### 5. GLEIF Evaluation (Step-by-Step) - GET
```
GET http://localhost:3001/zkpret/compliance/global/eval/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 6. GLEIF Evaluation - POST
```
POST http://localhost:3001/zkpret/compliance/global/eval/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 7. GLEIF ZK Proof Only - GET
```
GET http://localhost:3001/zkpret/compliance/global/eval/proof/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 8. GLEIF ZK Proof Only - POST
```
POST http://localhost:3001/zkpret/compliance/global/eval/proof/lei/SREE%20PALANI%20ANDAVAR%20AGROS%20PRIVATE%20LIMITED
```

---

### 9. Async GLEIF (returns Job ID)
```
POST http://localhost:3001/api/v1/tools/gleif
Body (JSON):
{
  "companyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"