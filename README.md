# Dokumentace API pro databázi UJEP
----

## Spuštění serveru
`.env` se automaticky načte do env proměnných. Server pracuje s následujícím:

- `MONGODB` URI pro připojení k MongoDB.
- `PORT` lze použít na změnu portu na kterým bude server běžet.

Jak spustit:

- nainstalujte si mongodb (nejlehčeji přes Docker), nebo se registrujte na MongoDB atlas
- pokud na MongoDB atlas, dejte do `.env` `MONGODB={url}` kde `{url}` je URL od MongoDB atlas. Pro lokální instalaci bez další konfigurace by mělo fungovat `mongodb://localhost/ujep`
- spusťte server (`npm run dev`)
- naimportujte data (pouze jednou, není kontrola duplikátů) pomocí `python fill.py`. Server musí běžet aby se data mohli importovat

## Modely

### User

uživatel.

- forcePasswordReset znamená že po přihlášení si musí změnit heslo
- role určuje roli uživatele, a podle toho oprávnění jaká má

#### Role

##### Local manager

Umožňuje upravovat a přidávat pomůcky do databáze

##### Local admin

Umožňuje spravovat uživatele v rámci objektu

##### Global manager

Umožňuje upravovat a přidávat pomůcky všude

##### Global admin

Umožňuje upravovat všechny uživatele

### Place

Objekt (knihovna, škola atd) kde se nachází pomůcky, případně odkud se dají půjčit.

Mají ve vlastnictví instance pomůcek.

### Instance

Instance pomůcky (když je pomůcka víckrát v ČR, bude více instancí ale jenom jeden záznam v pomůckách).

Jednotlivý objekty (Place) mají ve vlastnictví instance pomůcek.

### Pomucka

Typ pomůcky (kniha A od autora B), když je dostupná víckrát, bude více instancí.