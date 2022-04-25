import requests
import xlrd
import os

wb = xlrd.open_workbook("data.xls")
sheet = wb.sheet_by_index(0)

for i in range(3, 34):
    data = []
    for j in range(1, 9):
        data.append(sheet.cell_value(i, j))
        
    autor = data[0]
    nazev = data[1]
    rok = data[2]
    nakladatel = data[3]
    mistoVydani = data[4]
    signatura = data[5]
    isxn = data[6]
    id = data[7]

    r = requests.post(
        "http://localhost:{}/pomucky".format(os.getenv("PORT") or 3001),
        json={"autor": autor, "nazev": nazev, "rok": rok, "nakladatel": nakladatel, "mistoVydani": mistoVydani, "signatura": signatura, "isxn": isxn, "id": id},
        headers={"Content-type": 'application/json'}
    )
    print(r.status_code)

    #print(data[7])
    

