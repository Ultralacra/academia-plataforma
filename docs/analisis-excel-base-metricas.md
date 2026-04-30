# Análisis técnico del Excel

Archivo: `public/BASE MÉTRICAS - ANÁLISIS NEGOCIO .xlsx`
Hojas: 14
## Resumen por hoja
- **Resumen**: bbox A1:O35 | celdas no vacías=30 | fórmulas=13 | constantes=17
- **1. CAC **: bbox A1:F8 | celdas no vacías=48 | fórmulas=14 | constantes=34
- **2. Ingreso por cliente**: bbox A1:E9 | celdas no vacías=41 | fórmulas=14 | constantes=27
- **3. Costo operativo por cliente**: bbox A1:P66 | celdas no vacías=239 | fórmulas=21 | constantes=218
- **4. Margen operativo por cliente**: bbox A1:D8 | celdas no vacías=32 | fórmulas=21 | constantes=11
- **5. LTGP Margen bruto de vida po**: bbox A1:D8 | celdas no vacías=32 | fórmulas=21 | constantes=11
- **6. CAC Ratio  Relación LTGP  CA**: bbox A2:D9 | celdas no vacías=32 | fórmulas=21 | constantes=11
- **7. Beneficio por Cliente**: bbox A1:D8 | celdas no vacías=32 | fórmulas=21 | constantes=11
- **8. Periodo de recuperación**: bbox A2:E9 | celdas no vacías=40 | fórmulas=28 | constantes=12
- **9. ROIC**: bbox A1:N108 | celdas no vacías=481 | fórmulas=35 | constantes=446
- **10. Velocidad de ventas**: bbox A2:D9 | celdas no vacías=32 | fórmulas=14 | constantes=18
- **11. Rotación estructural**: bbox A2:C9 | celdas no vacías=24 | fórmulas=7 | constantes=17
- **12. Relación entrada vs salida**: bbox A2:D9 | celdas no vacías=32 | fórmulas=14 | constantes=18
- **13. Valor bruto generado por me**: bbox A2:D9 | celdas no vacías=32 | fórmulas=14 | constantes=18

## Dependencias entre hojas
- Resumen → 1. CAC: 24 refs
- Resumen → REF: 11 refs
- 4. Margen operativo por cliente → 2. Ingreso por cliente: 7 refs
- 4. Margen operativo por cliente → 3. Costo operativo por cliente: 7 refs
- 5. LTGP Margen bruto de vida po → 2. Ingreso por cliente: 7 refs
- 5. LTGP Margen bruto de vida po → 3. Costo operativo por cliente: 7 refs
- 6. CAC Ratio  Relación LTGP  CA → 5. LTGP Margen bruto de vida po: 7 refs
- 6. CAC Ratio  Relación LTGP  CA → 1. CAC: 7 refs
- 7. Beneficio por Cliente → 5. LTGP Margen bruto de vida po: 7 refs
- 7. Beneficio por Cliente → 1. CAC: 7 refs
- 8. Periodo de recuperación → 1. CAC: 7 refs
- 8. Periodo de recuperación → 2. Ingreso por cliente: 7 refs
- 10. Velocidad de ventas → 2. Ingreso por cliente: 7 refs
- 12. Relación entrada vs salida → 11. Rotación estructural: 7 refs
- 13. Valor bruto generado por me → 5. LTGP Margen bruto de vida po: 7 refs
- Resumen → 3. Costo operativo por cliente: 2 refs
- Resumen → 2. Ingreso por cliente: 1 refs
- Resumen → 6. CAC Ratio  Relación LTGP  CA: 1 refs
- Resumen → 5. LTGP Margen bruto de vida po: 1 refs
- Resumen → 7. Beneficio por Cliente: 1 refs
- Resumen → 9. ROIC: 1 refs
- Resumen → 8. Periodo de recuperación: 1 refs
- Resumen → 11. Rotación estructural: 1 refs
- Resumen → 12. Relación entrada vs salida: 1 refs
- Resumen → 10. Velocidad de ventas: 1 refs

---

## Resumen
BBox: A1:O35
Top funciones: [('VLOOKUP', 11), ('SUMIFS', 8), ('TEXT', 8), ('FALSE', 2)]

**Muestra (bloque superior)**

Origen: A1

|C1|C2|C3|C4|C5|C6|C7|C8|
|---|---|---|---|---|---|---|---|
|📊 RESUMEN DE MÉTRICAS||||||||
|Mes Inicio|2025-09-30 00:00:00|||||||
|Mes Fin|2025-11-30 00:00:00|||||||
|||||||||
||💸 CAC (Costo de adquisición)||||💰 Ingreso por cliente|||
||=SUMIFS('1. CAC '!$B:$B,'1. CAC '!$A:$A,">...||||=VLOOKUP(#REF!,'2. Ingreso por cliente'!$A...|||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
||📈 Margen por cliente||||💵 Beneficio por cliente|||
||=VLOOKUP(#REF!,'5. LTGP Margen bruto de vi...||||=VLOOKUP(#REF!,'7. Beneficio por Cliente'!...|||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||

**Patrones de fórmulas (normalizadas)**

- (1×) `SUMIFS('N.CAC'!$B:$B,'N.CAC'!$A:$A,"STR"&TEXT(CELL,"STR"),'N.CAC'!$A:$A,"STR"&TEXT(CELL,"STR"))+SUMIFS('N.CAC'!$C:$C,'N.CAC'!$A:$A,"STR"&TEXT(CELL,"STR"),'N.CAC'!$A:$A,"STR"&TEXT(CELL,"STR"))+SUMIFS('N.CAC'!$D:$D,'N.CAC'!$A:$A,"STR"&TEXT(CELL,"STR"),'N.CAC'!$A:$A,"STR"&TEXT(CELL,"STR"))/SUMIFS('N.CAC'!$E:$E,'N.CAC'!$A:$A,"STR"&TEXT(CELL,"STR"),'N.CAC'!$A:$A,"STR"&TEXT(CELL,"STR"))`
- (1×) `VLOOKUP(#REF!,'N.INGRESOPORCLIENTE'!$A:$E,N,)`
- (1×) `VLOOKUP(#REF!,'N.CACRATIORELACIÓNLTGPCA'!A:D,N,FALSE())`
- (1×) `SUMIFS('N.CAC'!$B:$B,'N.CAC'!$A:$A,"STR"&CELL,'N.CAC'!$A:$A,"STR"&CELL)+SUMIFS('N.CAC'!$C:$C,'N.CAC'!$A:$A,"STR"&CELL,'N.CAC'!$A:$A,"STR"&CELL)+SUMIFS('N.CAC'!$D:$D,'N.CAC'!$A:$A,"STR"&CELL,'N.CAC'!$A:$A,"STR"&CELL)/SUMIFS('N.CAC'!$E:$E,'N.CAC'!$A:$A,"STR"&CELL,'N.CAC'!$A:$A,"STR"&CELL)`
- (1×) `VLOOKUP(#REF!,'N.LTGPMARGENBRUTODEVIDAPO'!$A:$D,N,)`
- (1×) `VLOOKUP(#REF!,'N.BENEFICIOPORCLIENTE'!$A:$D,N,)`
- (1×) `VLOOKUP(#REF!,'N.ROIC'!A:G,N,FALSE)`
- (1×) `VLOOKUP(#REF!,'N.PERIODODERECUPERACIÓN'!$A:$E,N,)`
- (1×) `VLOOKUP(#REF!,'N.COSTOOPERATIVOPORCLIENTE'!A:E,N,FALSE())`
- (1×) `VLOOKUP(#REF!,'N.COSTOOPERATIVOPORCLIENTE'!A:E,N,FALSE)`

**Ejemplos de fórmulas (primeras)**

- B6: `=SUMIFS('1. CAC '!$B:$B,'1. CAC '!$A:$A,">="&TEXT(B2,"mmm yy"),'1. CAC '!$A:$A,"<="&TEXT(B3,"mmm yy"))+SUMIFS('1. CAC '!$C:$C,'1. CAC '!$A:$A,">="&TEXT(B2,"m...`
- F6: `=VLOOKUP(#REF!,'2. Ingreso por cliente'!$A:$E,4,)`
- J6: `=VLOOKUP(#REF!,'6. CAC Ratio  Relación LTGP  CA'!A:D,4,FALSE())`
- O9: `=SUMIFS('1. CAC '!$B:$B,'1. CAC '!$A:$A,">="&O5,'1. CAC '!$A:$A,"<="&O6)+SUMIFS('1. CAC '!$C:$C,'1. CAC '!$A:$A,">="&O5,'1. CAC '!$A:$A,"<="&O6)+SUMIFS('1. C...`
- B13: `=VLOOKUP(#REF!,'5. LTGP Margen bruto de vida po'!$A:$D,4,)`
- F13: `=VLOOKUP(#REF!,'7. Beneficio por Cliente'!$A:$D,4,)`
- J13: `=VLOOKUP(#REF!,'9. ROIC'!A:G,6,FALSE)`
- B21: `=VLOOKUP(#REF!,'8. Periodo de recuperación'!$A:$E,5,)`
- F21: `=VLOOKUP(#REF!,'3. Costo operativo por cliente'!A:E,4,FALSE())`
- J21: `=VLOOKUP(#REF!,'3. Costo operativo por cliente'!A:E,5,FALSE)`
- B28: `=VLOOKUP(#REF!,'11. Rotación estructural'!$A:$C,3,)`
- F28: `=VLOOKUP(#REF!,'12. Relación entrada vs salida'!$A:$D,4,)`

---

## 1. CAC 
BBox: A1:F8
Top funciones: [('SUM', 7)]

**Muestra (bloque superior)**

Origen: A1

|C1|C2|C3|C4|C5|C6|
|---|---|---|---|---|---|
|Mes|ADS|Comisiones Closers|Comisiones Carla +Bono toptasa|Nuevos Clientes|CAC|
|2025-09-30 00:00:00|84241.13|22553|=200+2272|66|=SUM(B2:D2)/E2|
|2025-10-31 00:00:00|56536.75|20276|=550+3701|71|=SUM(B3:D3)/E3|
|2025-11-30 00:00:00|74348.59|13798|=600+2602|49|=SUM(B4:D4)/E4|
|2025-12-31 00:00:00|84241.13|15173|=750+2858|50|=SUM(B5:D5)/E5|
|2026-01-31 00:00:00|90644.21|14953|=2720+900|66|=SUM(B6:D6)/E6|
|2026-02-28 00:00:00|63529.07|16707.5|=1685+550|71|=SUM(B7:D7)/E7|
|2026-03-31 00:00:00|44632.66|13805|=700+2763|49|=SUM(B8:D8)/E8|

**Posibles inputs (label → valor)**

- D2 `=200+2272` → E2 = 66
- D3 `=550+3701` → E3 = 71
- D4 `=600+2602` → E4 = 49
- D5 `=750+2858` → E5 = 50
- D6 `=2720+900` → E6 = 66
- D7 `=1685+550` → E7 = 71
- D8 `=700+2763` → E8 = 49

**Patrones de fórmulas (normalizadas)**

- (7×) `N+N`
- (7×) `SUM(RANGE)/CELL`

**Ejemplos de fórmulas (primeras)**

- D2: `=200+2272`
- F2: `=SUM(B2:D2)/E2`
- D3: `=550+3701`
- F3: `=SUM(B3:D3)/E3`
- D4: `=600+2602`
- F4: `=SUM(B4:D4)/E4`
- D5: `=750+2858`
- F5: `=SUM(B5:D5)/E5`
- D6: `=2720+900`
- F6: `=SUM(B6:D6)/E6`
- D7: `=1685+550`
- F7: `=SUM(B7:D7)/E7`

---

## 2. Ingreso por cliente
BBox: A1:E9
Top funciones: []

**Muestra (bloque superior)**

Origen: A1

|C1|C2|C3|C4|C5|
|---|---|---|---|---|
|Ingreso promedio por cliente = ingresos to...|||||
|Mes|Ingresos High|Porcentaje de pérdida por morosidad|Clientes HT|Ingreso por cliente|
|2025-09-30 00:00:00|252465.06|=B3*10%|66|=(B3-C3)/D3|
|2025-10-31 00:00:00|192644.81|=B4*10%|71|=(B4-C4)/D4|
|2025-11-30 00:00:00|232879.69|=B5*10%|49|=(B5-C5)/D5|
|2025-12-31 00:00:00|160371.18|=B6*10%|50|=(B6-C6)/D6|
|2026-01-31 00:00:00|190559.29|=B7*10%|66|=(B7-C7)/D7|
|2026-02-28 00:00:00|191026.32|=B8*10%|71|=(B8-C8)/D8|
|2026-03-31 00:00:00|165442.09999999998|=B9*10%|49|=(B9-C9)/D9|

**Posibles inputs (label → valor)**

- C3 `=B3*10%` → D3 = 66
- C4 `=B4*10%` → D4 = 71
- C5 `=B5*10%` → D5 = 49
- C6 `=B6*10%` → D6 = 50
- C7 `=B7*10%` → D7 = 66
- C8 `=B8*10%` → D8 = 71
- C9 `=B9*10%` → D9 = 49

**Patrones de fórmulas (normalizadas)**

- (7×) `CELL*N%`
- (7×) `(CELL-CELL)/CELL`

**Ejemplos de fórmulas (primeras)**

- C3: `=B3*10%`
- E3: `=(B3-C3)/D3`
- C4: `=B4*10%`
- E4: `=(B4-C4)/D4`
- C5: `=B5*10%`
- E5: `=(B5-C5)/D5`
- C6: `=B6*10%`
- E6: `=(B6-C6)/D6`
- C7: `=B7*10%`
- E7: `=(B7-C7)/D7`
- C8: `=B8*10%`
- E8: `=(B8-C8)/D8`

---

## 3. Costo operativo por cliente
BBox: A1:P66
Top funciones: [('SUMIFS', 7)]

**Muestra (bloque superior)**

Origen: A1

|C1|C2|C3|C4|C5|C6|C7|C8|
|---|---|---|---|---|---|---|---|
|Costo operativo por cliente = costo operat...||||||||
|Mes|Costos  mensual|Alumnos activos|Costo por cliente|Costo total por cliente (4 meses)||||
|2025-09-30 00:00:00|=SUMIFS($O:$O,$M:$M,A3)|230|=B3/C3|=D3*4||||
|2025-10-31 00:00:00|=SUMIFS($O:$O,$M:$M,A4)|230|=B4/C4|=D4*4||||
|2025-11-30 00:00:00|=SUMIFS($O:$O,$M:$M,A5)|230|=B5/C5|=D5*4||||
|2025-12-31 00:00:00|=SUMIFS($O:$O,$M:$M,A6)|230|=B6/C6|=D6*4||||
|2026-01-31 00:00:00|=SUMIFS($O:$O,$M:$M,A7)|209|=B7/C7|=D7*4||||
|2026-02-28 00:00:00|=SUMIFS($O:$O,$M:$M,A8)|247|=B8/C8|=D8*4||||
|2026-03-31 00:00:00|=SUMIFS($O:$O,$M:$M,A9)|234|=B9/C9|=D9*4||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||

**Posibles inputs (label → valor)**

- B3 `=SUMIFS($O:$O,$M:$M,A3)` → C3 = 230
- N3 `Plataforma` → O3 = 2833.69
- B4 `=SUMIFS($O:$O,$M:$M,A4)` → C4 = 230
- N4 `Nómina Enero` → O4 = 22878.67
- B5 `=SUMIFS($O:$O,$M:$M,A5)` → C5 = 230
- N5 `Freelancers` → O5 = 2770.04
- B6 `=SUMIFS($O:$O,$M:$M,A6)` → C6 = 230
- N6 `Bonificación` → O6 = 4620
- B7 `=SUMIFS($O:$O,$M:$M,A7)` → C7 = 209
- N7 `Comisión Rutsi` → O7 = 1000
- B8 `=SUMIFS($O:$O,$M:$M,A8)` → C8 = 247
- N8 `Otros gastos` → O8 = 435.2
- B9 `=SUMIFS($O:$O,$M:$M,A9)` → C9 = 234
- N9 `Jurídico` → O9 = 372
- N10 `Servicio Contable` → O10 = 980
- N11 `Premio Estudiantes` → O11 = 400
- N12 `Plataforma` → O12 = 2727.98
- N13 `Nómina Febrero` → O13 = 25760
- N14 `Freelancers` → O14 = 2037
- N15 `Bonificación` → O15 = 2035.5
- N16 `Comisión Rutsi` → O16 = 902
- N17 `Otros gastos` → O17 = 500
- N18 `Jurídico` → O18 = 593
- N19 `Servicio Contable` → O19 = 400
- N20 `Premio Estudiantes` → O20 = 805.5

**Patrones de fórmulas (normalizadas)**

- (7×) `SUMIFS($O:$O,$M:$M,CELL)`
- (7×) `CELL/CELL`
- (7×) `CELL*N`

**Ejemplos de fórmulas (primeras)**

- B3: `=SUMIFS($O:$O,$M:$M,A3)`
- D3: `=B3/C3`
- E3: `=D3*4`
- B4: `=SUMIFS($O:$O,$M:$M,A4)`
- D4: `=B4/C4`
- E4: `=D4*4`
- B5: `=SUMIFS($O:$O,$M:$M,A5)`
- D5: `=B5/C5`
- E5: `=D5*4`
- B6: `=SUMIFS($O:$O,$M:$M,A6)`
- D6: `=B6/C6`
- E6: `=D6*4`

---

## 4. Margen operativo por cliente
BBox: A1:D8
Top funciones: [('VLOOKUP', 14)]

**Muestra (bloque superior)**

Origen: A1

|C1|C2|C3|C4|
|---|---|---|---|
|Mes |Ingreso promedio por cliente|Costo op. por cliente|Margen Op, por cliente|
|2025-09-30 00:00:00|=VLOOKUP(A2,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A2,'3. Costo operativo por client...|=B2-C2|
|2025-10-31 00:00:00|=VLOOKUP(A3,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A3,'3. Costo operativo por client...|=B3-C3|
|2025-11-30 00:00:00|=VLOOKUP(A4,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A4,'3. Costo operativo por client...|=B4-C4|
|2025-12-31 00:00:00|=VLOOKUP(A5,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A5,'3. Costo operativo por client...|=B5-C5|
|2026-01-31 00:00:00|=VLOOKUP(A6,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A6,'3. Costo operativo por client...|=B6-C6|
|2026-02-28 00:00:00|=VLOOKUP(A7,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A7,'3. Costo operativo por client...|=B7-C7|
|2026-03-31 00:00:00|=VLOOKUP(A8,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A8,'3. Costo operativo por client...|=B8-C8|

**Patrones de fórmulas (normalizadas)**

- (7×) `VLOOKUP(CELL,'N.INGRESOPORCLIENTE'!$A:$E,N,)`
- (7×) `VLOOKUP(CELL,'N.COSTOOPERATIVOPORCLIENTE'!$A:$E,N,)`
- (7×) `CELL-CELL`

**Ejemplos de fórmulas (primeras)**

- B2: `=VLOOKUP(A2,'2. Ingreso por cliente'!$A:$E,5,)`
- C2: `=VLOOKUP(A2,'3. Costo operativo por cliente'!$A:$E,4,)`
- D2: `=B2-C2`
- B3: `=VLOOKUP(A3,'2. Ingreso por cliente'!$A:$E,5,)`
- C3: `=VLOOKUP(A3,'3. Costo operativo por cliente'!$A:$E,4,)`
- D3: `=B3-C3`
- B4: `=VLOOKUP(A4,'2. Ingreso por cliente'!$A:$E,5,)`
- C4: `=VLOOKUP(A4,'3. Costo operativo por cliente'!$A:$E,4,)`
- D4: `=B4-C4`
- B5: `=VLOOKUP(A5,'2. Ingreso por cliente'!$A:$E,5,)`
- C5: `=VLOOKUP(A5,'3. Costo operativo por cliente'!$A:$E,4,)`
- D5: `=B5-C5`

---

## 5. LTGP Margen bruto de vida po
BBox: A1:D8
Top funciones: [('VLOOKUP', 14)]

**Muestra (bloque superior)**

Origen: A1

|C1|C2|C3|C4|
|---|---|---|---|
|Mes |Ingreso promedio por cliente|Costo op. por cliente|Margen Op, por cliente|
|2025-09-30 00:00:00|=VLOOKUP(A2,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A2,'3. Costo operativo por client...|=B2-C2|
|2025-10-31 00:00:00|=VLOOKUP(A3,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A3,'3. Costo operativo por client...|=B3-C3|
|2025-11-30 00:00:00|=VLOOKUP(A4,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A4,'3. Costo operativo por client...|=B4-C4|
|2025-12-31 00:00:00|=VLOOKUP(A5,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A5,'3. Costo operativo por client...|=B5-C5|
|2026-01-31 00:00:00|=VLOOKUP(A6,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A6,'3. Costo operativo por client...|=B6-C6|
|2026-02-28 00:00:00|=VLOOKUP(A7,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A7,'3. Costo operativo por client...|=B7-C7|
|2026-03-31 00:00:00|=VLOOKUP(A8,'2. Ingreso por cliente'!$A:$E...|=VLOOKUP(A8,'3. Costo operativo por client...|=B8-C8|

**Patrones de fórmulas (normalizadas)**

- (7×) `VLOOKUP(CELL,'N.INGRESOPORCLIENTE'!$A:$E,N,)`
- (7×) `VLOOKUP(CELL,'N.COSTOOPERATIVOPORCLIENTE'!$A:$E,N,)`
- (7×) `CELL-CELL`

**Ejemplos de fórmulas (primeras)**

- B2: `=VLOOKUP(A2,'2. Ingreso por cliente'!$A:$E,5,)`
- C2: `=VLOOKUP(A2,'3. Costo operativo por cliente'!$A:$E,4,)`
- D2: `=B2-C2`
- B3: `=VLOOKUP(A3,'2. Ingreso por cliente'!$A:$E,5,)`
- C3: `=VLOOKUP(A3,'3. Costo operativo por cliente'!$A:$E,4,)`
- D3: `=B3-C3`
- B4: `=VLOOKUP(A4,'2. Ingreso por cliente'!$A:$E,5,)`
- C4: `=VLOOKUP(A4,'3. Costo operativo por cliente'!$A:$E,4,)`
- D4: `=B4-C4`
- B5: `=VLOOKUP(A5,'2. Ingreso por cliente'!$A:$E,5,)`
- C5: `=VLOOKUP(A5,'3. Costo operativo por cliente'!$A:$E,4,)`
- D5: `=B5-C5`

---

## 6. CAC Ratio  Relación LTGP  CA
BBox: A2:D9
Top funciones: [('VLOOKUP', 14)]

**Muestra (bloque superior)**

Origen: A2

|C1|C2|C3|C4|
|---|---|---|---|
|Mes |LTGP|CAC|CAC RATIO|
|2025-09-30 00:00:00|=VLOOKUP(A3,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A3,'1. CAC '!$A:$F,6)|=B3/C3|
|2025-10-31 00:00:00|=VLOOKUP(A4,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A4,'1. CAC '!$A:$F,6)|=B4/C4|
|2025-11-30 00:00:00|=VLOOKUP(A5,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A5,'1. CAC '!$A:$F,6)|=B5/C5|
|2025-12-31 00:00:00|=VLOOKUP(A6,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A6,'1. CAC '!$A:$F,6)|=B6/C6|
|2026-01-31 00:00:00|=VLOOKUP(A7,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A7,'1. CAC '!$A:$F,6)|=B7/C7|
|2026-02-28 00:00:00|=VLOOKUP(A8,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A8,'1. CAC '!$A:$F,6)|=B8/C8|
|2026-03-31 00:00:00|=VLOOKUP(A9,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A9,'1. CAC '!$A:$F,6)|=B9/C9|

**Patrones de fórmulas (normalizadas)**

- (7×) `VLOOKUP(CELL,'N.LTGPMARGENBRUTODEVIDAPO'!A:D,N,)`
- (7×) `VLOOKUP(CELL,'N.CAC'!$A:$F,N)`
- (7×) `CELL/CELL`

**Ejemplos de fórmulas (primeras)**

- B3: `=VLOOKUP(A3,'5. LTGP Margen bruto de vida po'!A:D,4,)`
- C3: `=VLOOKUP(A3,'1. CAC '!$A:$F,6)`
- D3: `=B3/C3`
- B4: `=VLOOKUP(A4,'5. LTGP Margen bruto de vida po'!A:D,4,)`
- C4: `=VLOOKUP(A4,'1. CAC '!$A:$F,6)`
- D4: `=B4/C4`
- B5: `=VLOOKUP(A5,'5. LTGP Margen bruto de vida po'!A:D,4,)`
- C5: `=VLOOKUP(A5,'1. CAC '!$A:$F,6)`
- D5: `=B5/C5`
- B6: `=VLOOKUP(A6,'5. LTGP Margen bruto de vida po'!A:D,4,)`
- C6: `=VLOOKUP(A6,'1. CAC '!$A:$F,6)`
- D6: `=B6/C6`

---

## 7. Beneficio por Cliente
BBox: A1:D8
Top funciones: [('VLOOKUP', 14)]

**Muestra (bloque superior)**

Origen: A1

|C1|C2|C3|C4|
|---|---|---|---|
|Mes |LTGP|CAC|Beneficio por cliente|
|2025-09-30 00:00:00|=VLOOKUP(A2,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A2,'1. CAC '!A:F,6)|=B2-C2|
|2025-10-31 00:00:00|=VLOOKUP(A3,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A3,'1. CAC '!A:F,6)|=B3-C3|
|2025-11-30 00:00:00|=VLOOKUP(A4,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A4,'1. CAC '!A:F,6,)|=B4-C4|
|2025-12-31 00:00:00|=VLOOKUP(A5,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A5,'1. CAC '!A:F,6,)|=B5-C5|
|2026-01-31 00:00:00|=VLOOKUP(A6,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A6,'1. CAC '!A:F,6,)|=B6-C6|
|2026-02-28 00:00:00|=VLOOKUP(A7,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A7,'1. CAC '!A:F,6,)|=B7-C7|
|2026-03-31 00:00:00|=VLOOKUP(A8,'5. LTGP Margen bruto de vida ...|=VLOOKUP(A8,'1. CAC '!A:F,6,)|=B8-C8|

**Patrones de fórmulas (normalizadas)**

- (7×) `VLOOKUP(CELL,'N.LTGPMARGENBRUTODEVIDAPO'!A:D,N,)`
- (7×) `CELL-CELL`
- (5×) `VLOOKUP(CELL,'N.CAC'!A:F,N,)`
- (2×) `VLOOKUP(CELL,'N.CAC'!A:F,N)`

**Ejemplos de fórmulas (primeras)**

- B2: `=VLOOKUP(A2,'5. LTGP Margen bruto de vida po'!A:D,4,)`
- C2: `=VLOOKUP(A2,'1. CAC '!A:F,6)`
- D2: `=B2-C2`
- B3: `=VLOOKUP(A3,'5. LTGP Margen bruto de vida po'!A:D,4,)`
- C3: `=VLOOKUP(A3,'1. CAC '!A:F,6)`
- D3: `=B3-C3`
- B4: `=VLOOKUP(A4,'5. LTGP Margen bruto de vida po'!A:D,4,)`
- C4: `=VLOOKUP(A4,'1. CAC '!A:F,6,)`
- D4: `=B4-C4`
- B5: `=VLOOKUP(A5,'5. LTGP Margen bruto de vida po'!A:D,4,)`
- C5: `=VLOOKUP(A5,'1. CAC '!A:F,6,)`
- D5: `=B5-C5`

---

## 8. Periodo de recuperación
BBox: A2:E9
Top funciones: [('VLOOKUP', 14)]

**Muestra (bloque superior)**

Origen: A2

|C1|C2|C3|C4|C5|
|---|---|---|---|---|
|Mes |CAC|Ingreso por cliente real |Ing ÷ Duración (4 meses)|Payback en meses|
|2025-09-30 00:00:00|=VLOOKUP(A3,'1. CAC '!$A:$F,6,)|=VLOOKUP(A3,'2. Ingreso por cliente'!$A:$E...|=C3/4|=B3/$D$3|
|2025-10-31 00:00:00|=VLOOKUP(A4,'1. CAC '!$A:$F,6,)|=VLOOKUP(A4,'2. Ingreso por cliente'!$A:$E...|=C4/4|=B4/$D$3|
|2025-11-30 00:00:00|=VLOOKUP(A5,'1. CAC '!$A:$F,6,)|=VLOOKUP(A5,'2. Ingreso por cliente'!$A:$E...|=C5/4|=B5/$D$3|
|2025-12-31 00:00:00|=VLOOKUP(A6,'1. CAC '!$A:$F,6,)|=VLOOKUP(A6,'2. Ingreso por cliente'!$A:$E...|=C6/4|=B6/$D$3|
|2026-01-31 00:00:00|=VLOOKUP(A7,'1. CAC '!$A:$F,6,)|=VLOOKUP(A7,'2. Ingreso por cliente'!$A:$E...|=C7/4|=B7/$D$3|
|2026-02-28 00:00:00|=VLOOKUP(A8,'1. CAC '!$A:$F,6,)|=VLOOKUP(A8,'2. Ingreso por cliente'!$A:$E...|=C8/4|=B8/$D$3|
|2026-03-31 00:00:00|=VLOOKUP(A9,'1. CAC '!$A:$F,6,)|=VLOOKUP(A9,'2. Ingreso por cliente'!$A:$E...|=C9/4|=B9/$D$3|

**Patrones de fórmulas (normalizadas)**

- (7×) `VLOOKUP(CELL,'N.CAC'!$A:$F,N,)`
- (7×) `VLOOKUP(CELL,'N.INGRESOPORCLIENTE'!$A:$E,N,)`
- (7×) `CELL/N`
- (7×) `CELL/CELL`

**Ejemplos de fórmulas (primeras)**

- B3: `=VLOOKUP(A3,'1. CAC '!$A:$F,6,)`
- C3: `=VLOOKUP(A3,'2. Ingreso por cliente'!$A:$E,5,)`
- D3: `=C3/4`
- E3: `=B3/$D$3`
- B4: `=VLOOKUP(A4,'1. CAC '!$A:$F,6,)`
- C4: `=VLOOKUP(A4,'2. Ingreso por cliente'!$A:$E,5,)`
- D4: `=C4/4`
- E4: `=B4/$D$3`
- B5: `=VLOOKUP(A5,'1. CAC '!$A:$F,6,)`
- C5: `=VLOOKUP(A5,'2. Ingreso por cliente'!$A:$E,5,)`
- D5: `=C5/4`
- E5: `=B5/$D$3`

---

## 9. ROIC
BBox: A1:N108
Top funciones: [('SUMIFS', 14), ('TEXT', 7)]

**Muestra (bloque superior)**

Origen: A1

|C1|C2|C3|C4|C5|C6|C7|C8|
|---|---|---|---|---|---|---|---|
|ROIC = Profit / (Ads + Closers + Gastos op...||||||||
|||||||||
|Mes|Ingresos|Gastos operativos|Costos (Marketing +Ventas)|Profit|ROIC|Observación||
|2025-09-30 00:00:00|252465.06|=SUMIFS($N:$N,$K:$K,A4,$L:$L,"Operativo")|=SUMIFS($N:$N,$K:$K,A4,$L:$L,"Ventas")|=B4-C4-D4|=E4/(C4+D4)|="Por cada $1 invertido, generas $" & TEXT...||
|2025-10-31 00:00:00|192644.81|=SUMIFS($N:$N,$K:$K,A5,$L:$L,"Operativo")|=SUMIFS($N:$N,$K:$K,A5,$L:$L,"Ventas")|=B5-C5-D5|=E5/(C5+D5)|="Por cada $1 invertido, generas $" & TEXT...||
|2025-11-30 00:00:00|232879.69|=SUMIFS($N:$N,$K:$K,A6,$L:$L,"Operativo")|=SUMIFS($N:$N,$K:$K,A6,$L:$L,"Ventas")|=B6-C6-D6|=E6/(C6+D6)|="Por cada $1 invertido, generas $" & TEXT...||
|2025-12-31 00:00:00|160371.18|=SUMIFS($N:$N,$K:$K,A7,$L:$L,"Operativo")|=SUMIFS($N:$N,$K:$K,A7,$L:$L,"Ventas")|=B7-C7-D7|=E7/(C7+D7)|="Por cada $1 invertido, generas $" & TEXT...||
|2026-01-31 00:00:00|190559.29|=SUMIFS($N:$N,$K:$K,A8,$L:$L,"Operativo")|=SUMIFS($N:$N,$K:$K,A8,$L:$L,"Ventas")|=B8-C8-D8|=E8/(C8+D8)|="Por cada $1 invertido, generas $" & TEXT...||
|2026-02-28 00:00:00|191026.32|=SUMIFS($N:$N,$K:$K,A9,$L:$L,"Operativo")|=SUMIFS($N:$N,$K:$K,A9,$L:$L,"Ventas")|=B9-C9-D9|=E9/(C9+D9)|="Por cada $1 invertido, generas $" & TEXT...||
|2026-03-31 00:00:00|165442.09999999998|=SUMIFS($N:$N,$K:$K,A10,$L:$L,"Operativo")|=SUMIFS($N:$N,$K:$K,A10,$L:$L,"Ventas")|=B10-C10-D10|=E10/(C10+D10)|="Por cada $1 invertido, generas $" & TEXT...||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||
|||||||||

**Posibles inputs (label → valor)**

- M4 `Plataforma` → N4 = 2833.69
- M5 `Nómina Enero` → N5 = 22878.67
- M6 `Freelancers` → N6 = 2770.04
- M7 `Comisión Closer` → N7 = 14953
- M8 `Bonificación` → N8 = 4620
- M9 `Bonificación closer` → N9 = 900
- M10 `Comisión Carla` → N10 = 2720
- M11 `Comisión Rutsi` → N11 = 796.65
- M12 `Otros pagos nómina` → N12 = 0
- M13 `Publicidad` → N13 = 90644.21
- M14 `Reembolso` → N14 = 3125
- M15 `Servicios varios` → N15 = 0
- M16 `Otros gastos` → N16 = 2
- M17 `Jurídico` → N17 = 372
- M18 `Comisión Referidos` → N18 = 0
- M19 `Gastos Bancarios` → N19 = 26.4
- M20 `Capacitación` → N20 = 0
- M21 `Servicios Contables` → N21 = 980
- M22 `Premio Estudiantes` → N22 = 400
- M23 `Plataforma` → N23 = 2727.98
- M24 `Nómina Enero` → N24 = 25760
- M25 `Freelancers` → N25 = 2037
- M26 `Comisión Closer` → N26 = 16707.5
- M27 `Bonificación` → N27 = 2035.5
- M28 `Bonificación closer` → N28 = 550

**Patrones de fórmulas (normalizadas)**

- (14×) `SUMIFS($N:$N,$K:$K,CELL,$L:$L,"STR")`
- (7×) `CELL-CELL-CELL`
- (7×) `CELL/(CELL+CELL)`
- (7×) `"STR"&TEXT(CELL,"STR")&"STR"`

**Ejemplos de fórmulas (primeras)**

- C4: `=SUMIFS($N:$N,$K:$K,A4,$L:$L,"Operativo")`
- D4: `=SUMIFS($N:$N,$K:$K,A4,$L:$L,"Ventas")`
- E4: `=B4-C4-D4`
- F4: `=E4/(C4+D4)`
- G4: `="Por cada $1 invertido, generas $" & TEXT(F4,"0.00") & " adicional"`
- C5: `=SUMIFS($N:$N,$K:$K,A5,$L:$L,"Operativo")`
- D5: `=SUMIFS($N:$N,$K:$K,A5,$L:$L,"Ventas")`
- E5: `=B5-C5-D5`
- F5: `=E5/(C5+D5)`
- G5: `="Por cada $1 invertido, generas $" & TEXT(F5,"0.00") & " adicional"`
- C6: `=SUMIFS($N:$N,$K:$K,A6,$L:$L,"Operativo")`
- D6: `=SUMIFS($N:$N,$K:$K,A6,$L:$L,"Ventas")`

---

## 10. Velocidad de ventas
BBox: A2:D9
Top funciones: [('VLOOKUP', 7)]

**Muestra (bloque superior)**

Origen: A2

|C1|C2|C3|C4|
|---|---|---|---|
|Mes|Clientes mensuales|Ingresos por clientes|Velocidad de ventas|
|2025-09-30 00:00:00|66|=VLOOKUP(A3,'2. Ingreso por cliente'!$A:$E...|=B3*C3|
|2025-10-31 00:00:00|71|=VLOOKUP(A4,'2. Ingreso por cliente'!$A:$E...|=B4*C4|
|2025-11-30 00:00:00|49|=VLOOKUP(A5,'2. Ingreso por cliente'!$A:$E...|=B5*C5|
|2025-12-31 00:00:00|50|=VLOOKUP(A6,'2. Ingreso por cliente'!$A:$E...|=B6*C6|
|2026-01-31 00:00:00|66|=VLOOKUP(A7,'2. Ingreso por cliente'!$A:$E...|=B7*C7|
|2026-02-28 00:00:00|71|=VLOOKUP(A8,'2. Ingreso por cliente'!$A:$E...|=B8*C8|
|2026-03-31 00:00:00|49|=VLOOKUP(A9,'2. Ingreso por cliente'!$A:$E...|=B9*C9|

**Patrones de fórmulas (normalizadas)**

- (7×) `VLOOKUP(CELL,'N.INGRESOPORCLIENTE'!$A:$E,N,)`
- (7×) `CELL*CELL`

**Ejemplos de fórmulas (primeras)**

- C3: `=VLOOKUP(A3,'2. Ingreso por cliente'!$A:$E,5,)`
- D3: `=B3*C3`
- C4: `=VLOOKUP(A4,'2. Ingreso por cliente'!$A:$E,5,)`
- D4: `=B4*C4`
- C5: `=VLOOKUP(A5,'2. Ingreso por cliente'!$A:$E,5,)`
- D5: `=B5*C5`
- C6: `=VLOOKUP(A6,'2. Ingreso por cliente'!$A:$E,5,)`
- D6: `=B6*C6`
- C7: `=VLOOKUP(A7,'2. Ingreso por cliente'!$A:$E,5,)`
- D7: `=B7*C7`
- C8: `=VLOOKUP(A8,'2. Ingreso por cliente'!$A:$E,5,)`
- D8: `=B8*C8`

---

## 11. Rotación estructural
BBox: A2:C9
Top funciones: []

**Muestra (bloque superior)**

Origen: A2

|C1|C2|C3|
|---|---|---|
|Mes|Clientes activos|Churn estructural|
|2025-09-30 00:00:00|230|=B3*25%|
|2025-10-31 00:00:00|230|=B4*25%|
|2025-11-30 00:00:00|230|=B5*25%|
|2025-12-31 00:00:00|230|=B6*25%|
|2026-01-31 00:00:00|209|=B7*25%|
|2026-02-28 00:00:00|247|=B8*25%|
|2026-03-31 00:00:00|234|=B9*25%|

**Patrones de fórmulas (normalizadas)**

- (7×) `CELL*N%`

**Ejemplos de fórmulas (primeras)**

- C3: `=B3*25%`
- C4: `=B4*25%`
- C5: `=B5*25%`
- C6: `=B6*25%`
- C7: `=B7*25%`
- C8: `=B8*25%`
- C9: `=B9*25%`

---

## 12. Relación entrada vs salida
BBox: A2:D9
Top funciones: [('VLOOKUP', 7)]

**Muestra (bloque superior)**

Origen: A2

|C1|C2|C3|C4|
|---|---|---|---|
|Mes|Ventas |Churn estructural|Entrada vs Salida|
|2025-09-30 00:00:00|66|=VLOOKUP(A3,'11. Rotación estructural'!$A:...|=B3/C3|
|2025-10-31 00:00:00|71|=VLOOKUP(A4,'11. Rotación estructural'!$A:...|=B4/C4|
|2025-11-30 00:00:00|49|=VLOOKUP(A5,'11. Rotación estructural'!$A:...|=B5/C5|
|2025-12-31 00:00:00|50|=VLOOKUP(A6,'11. Rotación estructural'!$A:...|=B6/C6|
|2026-01-31 00:00:00|66|=VLOOKUP(A7,'11. Rotación estructural'!$A:...|=B7/C7|
|2026-02-28 00:00:00|71|=VLOOKUP(A8,'11. Rotación estructural'!$A:...|=B8/C8|
|2026-03-31 00:00:00|49|=VLOOKUP(A9,'11. Rotación estructural'!$A:...|=B9/C9|

**Patrones de fórmulas (normalizadas)**

- (7×) `VLOOKUP(CELL,'N.ROTACIÓNESTRUCTURAL'!$A:$C,N,)`
- (7×) `CELL/CELL`

**Ejemplos de fórmulas (primeras)**

- C3: `=VLOOKUP(A3,'11. Rotación estructural'!$A:$C,3,)`
- D3: `=B3/C3`
- C4: `=VLOOKUP(A4,'11. Rotación estructural'!$A:$C,3,)`
- D4: `=B4/C4`
- C5: `=VLOOKUP(A5,'11. Rotación estructural'!$A:$C,3,)`
- D5: `=B5/C5`
- C6: `=VLOOKUP(A6,'11. Rotación estructural'!$A:$C,3,)`
- D6: `=B6/C6`
- C7: `=VLOOKUP(A7,'11. Rotación estructural'!$A:$C,3,)`
- D7: `=B7/C7`
- C8: `=VLOOKUP(A8,'11. Rotación estructural'!$A:$C,3,)`
- D8: `=B8/C8`

---

## 13. Valor bruto generado por me
BBox: A2:D9
Top funciones: [('VLOOKUP', 7)]

**Muestra (bloque superior)**

Origen: A2

|C1|C2|C3|C4|
|---|---|---|---|
|Mes|Clientes HT|LTGP|Valor bruto generado por mes|
|2025-09-30 00:00:00|66|=VLOOKUP(A3,'5. LTGP Margen bruto de vida ...|=B3*C3|
|2025-10-31 00:00:00|71|=VLOOKUP(A4,'5. LTGP Margen bruto de vida ...|=B4*C4|
|2025-11-30 00:00:00|49|=VLOOKUP(A5,'5. LTGP Margen bruto de vida ...|=B5*C5|
|2025-12-31 00:00:00|50|=VLOOKUP(A6,'5. LTGP Margen bruto de vida ...|=B6*C6|
|2026-01-31 00:00:00|66|=VLOOKUP(A7,'5. LTGP Margen bruto de vida ...|=B7*C7|
|2026-02-28 00:00:00|71|=VLOOKUP(A8,'5. LTGP Margen bruto de vida ...|=B8*C8|
|2026-03-31 00:00:00|49|=VLOOKUP(A9,'5. LTGP Margen bruto de vida ...|=B9*C9|

**Patrones de fórmulas (normalizadas)**

- (7×) `VLOOKUP(CELL,'N.LTGPMARGENBRUTODEVIDAPO'!$A:$D,N,)`
- (7×) `CELL*CELL`

**Ejemplos de fórmulas (primeras)**

- C3: `=VLOOKUP(A3,'5. LTGP Margen bruto de vida po'!$A:$D,4,)`
- D3: `=B3*C3`
- C4: `=VLOOKUP(A4,'5. LTGP Margen bruto de vida po'!$A:$D,4,)`
- D4: `=B4*C4`
- C5: `=VLOOKUP(A5,'5. LTGP Margen bruto de vida po'!$A:$D,4,)`
- D5: `=B5*C5`
- C6: `=VLOOKUP(A6,'5. LTGP Margen bruto de vida po'!$A:$D,4,)`
- D6: `=B6*C6`
- C7: `=VLOOKUP(A7,'5. LTGP Margen bruto de vida po'!$A:$D,4,)`
- D7: `=B7*C7`
- C8: `=VLOOKUP(A8,'5. LTGP Margen bruto de vida po'!$A:$D,4,)`
- D8: `=B8*C8`
