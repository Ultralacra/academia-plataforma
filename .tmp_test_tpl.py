import re, sys
CLAUSULA_ORDINALS = [
    "DECIMA TERCERA","DECIMA CUARTA","DECIMA QUINTA","DECIMA SEXTA",
    "DECIMA SEPTIMA","DECIMA OCTAVA","DECIMA NOVENA","VIGESIMA",
    "VIGESIMA PRIMERA","VIGESIMA SEGUNDA"
]
def apply(text, mode, has_reserve, bonuses):
    bonuses = {b.upper().replace(" ","_") for b in bonuses}
    def repl_mode(m):
        cond = m.group(1).strip().lower(); content = m.group(2)
        ok = ((cond=="pago_total" and (mode=="pago_total" or "contado" in mode)) or
              (cond=="3_cuotas" and mode=="3_cuotas") or
              (cond=="excepcion_2_cuotas" and mode in ("excepcion_2_cuotas","2_cuotas")))
        return content if ok else ""
    text = re.sub(r"\[\[IF:MODO==([^\]]+)\]\]\r?\n?([\s\S]*?)\[\[ENDIF\]\]\r?\n?", repl_mode, text)
    text = re.sub(r"\[\[IF:TIENE_RESERVA\]\]\r?\n?([\s\S]*?)\[\[ENDIF\]\]\r?\n?",
                  lambda m: m.group(1) if has_reserve else "", text)
    def repl_bono(m):
        key = m.group(1).strip().upper().replace(" ","_")
        return m.group(2) if key in bonuses else ""
    text = re.sub(r"\[\[IF:BONO:([^\]]+)\]\]\r?\n?([\s\S]*?)\[\[ENDIF\]\]\r?\n?", repl_bono, text)
    idx=[0]; refs={}
    def repl_c(m):
        name=m.group(1)
        ord_ = CLAUSULA_ORDINALS[idx[0]]; idx[0]+=1
        if name: refs[name]=ord_
        return ord_
    text = re.sub(r"\[\[CLAUSULA(?::([A-Z0-9_]+))?\]\]", repl_c, text)
    text = re.sub(r"\[\[REF:([A-Z0-9_]+)\]\]", lambda m: refs.get(m.group(1), m.group(0)), text)
    text = re.sub(r"\[\[REF_LOW:([A-Z0-9_]+)\]\]",
                  lambda m: refs.get(m.group(1), m.group(0)).lower(), text)
    return text

with open(r"public/templates/contrato-hotselling-pro-closer-v1.txt", encoding="utf-8") as f:
    src = f.read()

for name, bons in [
    ("baseline", []),
    ("trafficker", ["BONO_TRAFFICKER"]),
    ("impl", ["BONO_IMPLEMENTACION_TECNICA"]),
    ("both", ["BONO_TRAFFICKER","BONO_IMPLEMENTACION_TECNICA"]),
]:
    out = apply(src, "pago_total", False, bons)
    heads = re.findall(r"^(DECIMA[A-Z ]*|VIGESIMA[A-Z ]*)\.", out, re.M)
    print(name, "=>", heads)
    m = re.search(r"previsto en la clausula [^\.]+\.", out)
    print(" mora ref:", m.group(0) if m else "NONE")
    m = re.search(r"Clausula [A-Z ]+\.", out)
    print(" garantia ref:", m.group(0) if m else "NONE")
    # verify no leftover markers
    leftovers = re.findall(r"\[\[[^\]]+\]\]", out)
    print(" leftovers:", set(leftovers) - {"[[FIRMAS]]"})
    print("---")
