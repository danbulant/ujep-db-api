# Dokumentace API pro databázi UJEP
----

### Spuštění serveru
`.env` se automaticky načte do env proměnných. Server pracuje s následujícím:
- `MONGODB` URI pro připojení k MongoDB.
- `PORT` lze použít na změnu portu na kterým bude server běžet.

### Přidání pomůcky do databáze

* **URL**

  /data/add

* **Method:**

  `POST` 
  
*  **URL Params**

   **Required:**
 
   `nazev=[string]` `id=[string]`

   **Optional:**
 
   `autor=[string]` `rok=[integer]` `nakladatel=[string]` `mistoVydani=[string]` `signatura=[string]` `isxn=[integer]`

* **Data Params**

  `{autor: "Semotanová, Eva", nazev: "Česko : Ottův historický atlas", rok: 2007, nakladatel: "Ottovo", mistoVydani: "Praha", signatura: "IN191196", "isxn": 9788073605775, id: "K.II.2.14, K.II.2.15"}`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `{autor: "Semotanová, Eva", nazev: "Česko : Ottův historický atlas", rok: 2007, nakladatel: "Ottovo", mistoVydani: "Praha", signatura: "IN191196", "isxn": 9788073605775, id: "K.II.2.15"}`
 
* **Error Response:**

  * **Code:** 400 Invalid request <br />
    **Content:** `{ }`

* **Sample Call:**

  ```
  curl -X POST http://localhost:3001/data/add
   -H 'Content-Type: application/json'
   -d '{autor: "Semotanová, Eva", nazev: "Česko : Ottův historický atlas", rok: 2007, nakladatel: "Ottovo", mistoVydani: "Praha", signatura: "IN191196", "isxn": 9788073605775, id: "K.II.2.14, K.II.2.15"}'
  ```

### Vyhledávání pomůcek z databáze

 * **URL**

    /data/search

* **Method:**

  `GET`

* **Data Params**

  `kategorie=A123`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `{id: "D"}`
 
* **Error Response:**

  * **Code:** 400 Invalid request <br />
    **Content:** `{ }`

* **Sample Call:**

  ```
  curl -X POST http://localhost:3001/data/fetch
   -H 'Content-Type: application/json'
   -d '{id: "A"}'
  ```
  
* **Notes:**

  Dokumentace je aktuální k datu 10. 2. 2022
  