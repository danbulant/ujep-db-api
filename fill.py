import requests
import xlrd
import os
import re

wb = xlrd.open_workbook("data.xls")
sheet = wb.sheet_by_index(0)

def kategorieFun(id):
    if id[len(id) - 1] == ".":
        id = id[:len(id) - 1]
    return re.sub(r"^UU", "U", re.sub(r"^UNIV[:.] ", "U", id))

for i in range(3, 34):
    data = []
    for j in range(1, 9):
        data.append(sheet.cell_value(i, j))
        
    autor = re.sub(r"[, ]*$", "", data[0])
    nazev = re.sub(r"[,=: ]*$", "", data[1])
    rok = data[2]
    nakladatel = re.sub(r"[, ]*$", "", data[3])
    mistoVydani = re.sub(r"[\[\]]", "", re.sub(r"[: ]*$", "", data[4]))
    signatura = re.sub(r"\/$", "", data[5])
    isxn = data[6]
    kategorie = re.split(r"[,; ]+", data[7])

    r = requests.post(
        "http://localhost:{}/pomucky".format(os.getenv("PORT") or 3001),
        json={"author": autor, "name": nazev, "details": { "year": rok, "company": nakladatel, "mistoVydani": mistoVydani }, "signatura": signatura, "isxn": isxn, "kategorie": kategorie},
        headers={"Content-type": 'application/json'}
    )
    print(r.status_code)

    #print(data[7])
    

