/* =====================================================================
 * MOTOR-LINUX — telar_pantalla.py, el programa de la pantalla en Linux
 *
 * Es SIEMPRE el mismo fichero: lo que cambia de un proyecto a otro va en
 * proyecto.json (generador-linux.js). Vive aqui, dentro de un .js, por lo
 * mismo que las fuentes: abriendo Telar con doble clic (file://) el
 * navegador no deja leer un fichero suelto, y al exportar hay que copiarlo.
 *
 * String.raw deja el texto tal cual, barras incluidas. Las dos unicas
 * cosas que no pueden aparecer en el Python son el acento grave y la
 * pareja dolar-llave; el banco de pruebas lo comprueba.
 * ================================================================== */
const MOTOR_PANTALLA_PY = String.raw`#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Telar Studio - la pantalla en una placa con Linux.

NO LO EDITES: es el mismo para todos los proyectos. Lo que es de tu
proyecto (las pantallas, la logica, los pines) esta en proyecto.json, y
lo escribe Telar al exportar.

    python3 telar_pantalla.py                 en la placa, con la OLED
    python3 telar_pantalla.py --sin-placa     en cualquier ordenador: guarda
                                              lo que se veria en pantalla.png

La logica corre con las MISMAS reglas que en un ESP32 y que en el
simulador de Telar: la tarea de control da un paso cada 50 ms; primero
atiende lo que se ha pulsado, luego lee las entradas y luego hace la
logica.
"""

import json
import math
import os
import sys
import time

PERIODO = 0.05          # un paso de la logica: 50 ms, como en la placa
AQUI = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------------
# LAS CUENTAS
# Lo mismo que en JavaScript: un si/no vale 1 o 0, y lo que no es un
# numero vale 0. Math.round de JavaScript redondea .5 hacia arriba (y
# round() de Python no), asi que va aparte.
# ---------------------------------------------------------------------
def num(x):
    if isinstance(x, bool):
        return 1 if x else 0
    if x is None:
        return 0
    try:
        v = float(x)
    except (TypeError, ValueError):
        return 0
    if v != v:              # NaN
        return 0
    return x if isinstance(x, (int, float)) else v


def acota(v, lo, hi):
    return min(hi, max(lo, v))


def redondea(x):
    return math.floor(x + 0.5)


def calcula(x, val):
    """Una cuenta ya desmontada: {n} {v} {neg} {par} {op, a, b}."""
    if "n" in x:
        return x["n"]
    if "v" in x:
        return val(x["v"])
    if "neg" in x:
        return -calcula(x["neg"], val)
    if "par" in x:
        return calcula(x["par"], val)
    a = calcula(x["a"], val)
    b = calcula(x["b"], val)
    op = x["op"]
    if op == "+":
        return a + b
    if op == "-":
        return a - b
    if op == "*":
        return a * b
    return 0 if b == 0 else a / b


# ---------------------------------------------------------------------
# LA LOGICA
# Una copia, funcion por funcion, del motor del simulador (simulador.js):
# iniciar, entrar, accion, comparacion, condicion, paso, los botones y
# las salidas con tiempo. Si algo cambia alli, cambia aqui; el banco de
# pruebas de Telar los hace correr juntos y compara cada paso.
# ---------------------------------------------------------------------
class Logica:
    def __init__(self, L, variables, memoria=None):
        self.L = L or {"hay": False, "vars": {}, "rangos": {}, "click": None, "bloques": []}
        self.hay = bool(self.L.get("hay"))
        self.LV = self.L.get("vars", {})
        self.rangos = self.L.get("rangos", {})
        self.bloques = self.L.get("bloques", [])
        self.variables = variables
        self.memoria = memoria          # un objeto con leer() y escribir(dict)
        self.eco = None                 # una funcion para contar lo que pasa
        self.S = {}
        self.st = {}
        self.cola = []
        self.pulsos = []
        self.tz = {}
        self.ten = {}
        self.lp = {}
        self.t = 0.0

    # -- utilidades --------------------------------------------------
    @staticmethod
    def clave(b):
        return b.get("nombre") or "_"

    def anotar(self, txt):
        if self.eco:
            self.eco(txt)

    def valor(self, h):
        """Una hoja {n} o {v}: valor() del simulador."""
        if "n" in h:
            return h["n"]
        return num(self.S.get(h["v"]))

    def rango(self, n):
        return self.rangos.get(n)

    def leer_nvs(self):
        return dict(self.memoria.leer()) if self.memoria else {}

    def escribir_nvs(self, m):
        if self.memoria:
            self.memoria.escribir(m)

    # -- arrancar ----------------------------------------------------
    def iniciar(self, banco=None):
        banco = banco or {}
        self.S = {}
        self.st = {}
        self.cola = []
        self.pulsos = []
        self.tz = {}
        self.ten = {}
        self.lp = {}
        self.t = 0.0
        for v in self.variables:
            n = v["nombre"]
            if v["dir"] == "lectura":
                b = banco.get(n)
                self.S[n] = b if b is not None else (False if v["booleano"] else (v.get("min") if v.get("min") is not None else 0))
            elif v["dir"] == "escritura":
                self.S[n] = False if v["booleano"] else (v.get("inicial") if v.get("inicial") is not None else 0)
            elif v["dir"] == "ajuste":
                self.S[n] = v.get("pordefecto") if v.get("pordefecto") is not None else 0
        LV = self.LV
        for n, v in LV.items():
            if v["tipo"] == "setting":
                self.S[n] = v["inicio"]
        for n, v in LV.items():
            if v["tipo"] == "timer":
                self.S[n] = 0 if v.get("sube") else self.S.get(v.get("de"))
        for n, v in LV.items():
            if v["tipo"] == "flag":
                self.S[n] = v["inicio"]
        for n, v in LV.items():
            if v["tipo"] == "counter":
                self.S[n] = v["inicio"]
        self.anotar("arranque")
        for b in self.bloques:
            self.entrar(b, b["inicio"])

    def entrar(self, b, st):
        self.st[self.clave(b)] = st
        self.ten[self.clave(b)] = 0
        self.anotar(("%s -> %s" % (b["nombre"], st)) if b.get("nombre") else ("-> %s" % st))
        body = b["estados"].get(st)
        if body:
            for a in body["entrar"]:
                self.accion(b, a, 0)

    def contando(self, t):
        for bb in self.bloques:
            body = bb["estados"].get(self.st.get(self.clave(bb)))
            if body and t in body["cuenta"]:
                return True
        return False

    # -- salidas con tiempo: pulse, blink, click -----------------------
    def tz_pulso(self, x, dur):
        self.tz[x] = {"modo": 1, "queda": dur}
        self.S[x] = True

    def tz_parpadeo(self, x, on, off, total, veces):
        t = self.tz.get(x)
        if t and t["modo"] == 2 and t.get("on") == on and t.get("off") == off:
            return
        self.tz[x] = {"modo": 2, "on": on, "off": off, "fase": 0, "total": total, "veces": veces}
        self.S[x] = True

    def tz_paso(self, dt):
        for x, t in self.tz.items():
            if t["modo"] == 1:
                t["queda"] -= dt
                if t["queda"] < -0.5 * dt:
                    self.S[x] = False
                    t["modo"] = 0
                continue
            if t["modo"] != 2:
                continue
            if t["total"] > 0:
                t["total"] -= dt
                if t["total"] <= 0:
                    self.S[x] = False
                    t["modo"] = 0
                    continue
            t["fase"] += dt
            ciclo = t["on"] + t["off"]
            if ciclo > 0 and t["fase"] >= ciclo:
                t["fase"] -= ciclo
                if t["veces"] > 0:
                    t["veces"] -= 1
                    if t["veces"] == 0:
                        self.S[x] = False
                        t["modo"] = 0
                        continue
            self.S[x] = t["fase"] < t["on"]

    def tz_cancela(self, x):
        if x in self.tz:
            self.tz[x]["modo"] = 0

    # -- una accion: True si cambio de estado ----------------------------
    def siguen_timers(self, x):
        for tn, tv in self.LV.items():
            if tv["tipo"] == "timer" and tv.get("de") == x and not self.contando(tn):
                self.S[tn] = self.S[x]

    def accion(self, b, a, dt):
        S = self.S
        LV = self.LV
        k = a["a"]
        if k == "pulse":
            self.tz_pulso(a["x"], self.valor(a["t"]))
            return False
        if k == "blink":
            self.tz_parpadeo(a["x"], self.valor(a["on"]), self.valor(a["off"]),
                             self.valor(a["total"]) if a["total"] is not None else -1,
                             math.trunc(self.valor(a["veces"])) if a["veces"] is not None else 0)
            return False
        if k == "set":
            x = a["x"]
            v = calcula(a["e"], lambda n: num(S.get(n)))
            lv = LV.get(x)
            r = self.rango(x)
            if lv and lv["tipo"] == "timer":
                v = max(0, v)
            elif lv and lv["tipo"] == "counter":
                v = acota(redondea(v), 0, lv["tope"])
            elif r:
                v = acota(v, r[0], r[1])
            S[x] = v
            if lv and lv["tipo"] == "setting":
                self.siguen_timers(x)
            return False
        x = a.get("x")
        v = LV.get(x) or {}
        if k == "go to":
            self.entrar(b, x)
            return True
        if k in ("increase", "decrease"):
            sube = k == "increase"
            if v.get("tipo") == "counter":
                S[x] = acota(num(S.get(x)) + (1 if sube else -1), 0, v["tope"])
                return False
            S[x] = acota(num(S.get(x)) + (v["paso"] if sube else -v["paso"]), v["rango"][0], v["rango"][1])
            self.siguen_timers(x)
            return False
        if k == "restart":
            if v.get("tipo") == "counter":
                S[x] = v["inicio"]
                return False
            S[x] = 0 if v.get("sube") else num(S.get(v.get("de")))
            return False
        if k == "count":
            S[x] = num(S.get(x)) + dt if v.get("sube") else max(0, num(S.get(x)) - dt)
            return False
        if k == "turn on":
            self.tz_cancela(x)
            S[x] = True
            return False
        if k == "turn off":
            self.tz_cancela(x)
            S[x] = False
            return False
        if k == "toggle":
            self.tz_cancela(x)
            S[x] = not S.get(x)
            return False
        if k == "save":
            m = self.leer_nvs()
            m[x] = num(S.get(x))
            self.escribir_nvs(m)
            self.anotar("guardado en la memoria: %s = %s" % (x, m[x]))
            return False
        if k == "load":
            m = self.leer_nvs()
            if x not in m:
                self.anotar("%s: no hay nada guardado todavia" % x)
                return False
            if v.get("tipo") == "counter":
                S[x] = acota(redondea(num(m[x])), 0, v["tope"])
            elif v.get("tipo") == "flag":
                S[x] = num(m[x]) != 0
            else:
                S[x] = acota(num(m[x]), v["rango"][0], v["rango"][1])
                self.siguen_timers(x)
            self.anotar("cargado de la memoria: %s = %s" % (x, S[x]))
            return False
        return False

    # -- las condiciones ---------------------------------------------------
    def comparacion(self, p):
        if p.get("es"):
            bb = next((x for x in self.bloques if x.get("nombre") == p["bloque"]), None)
            r = bb is not None and self.st.get(self.clave(bb)) == p["estado"]
            return (not r) if p["no"] else r
        val = lambda n: num(self.S.get(n))
        a = calcula(p["izq"], val)
        b = calcula(p["der"], val)
        op = p["op"]
        if op == ">":
            r = a > b
        elif op == "<":
            r = a < b
        elif op == ">=":
            r = a >= b
        elif op == "<=":
            r = a <= b
        elif op == "==":
            r = a == b
        elif op == "!=":
            r = a != b
        else:
            r = False
        return (not r) if p["no"] else r

    def condicion(self, C):
        """Primero los and; el resultado se une con los or. Como en C."""
        if not C:
            return False
        partes = C["partes"]
        ors = False
        ands = self.comparacion(partes[0])
        for i in range(1, len(partes)):
            v = self.comparacion(partes[i])
            if C["enlaces"][i - 1] == "and":
                ands = ands and v
            else:
                ors = ors or ands
                ands = v
        return ors or ands

    # -- un paso: el while, y los if / after / every en su orden ------------
    def paso(self, dt):
        self.paso_largas(dt)
        for b in self.bloques:
            kb = self.clave(b)
            t0 = self.ten.get(kb, 0)
            self.ten[kb] = t0 + dt
            t1 = self.ten[kb]
            body = b["estados"].get(self.st.get(kb))
            if not body:
                continue
            for a in body["mientras"]:
                self.accion(b, a, dt)
            alguno = False
            salio = False
            for f in body["filas"]:
                if f["k"] == "after":
                    T = self.valor(f["t"])
                    if not (t0 < T and t1 >= T):
                        continue
                elif f["k"] == "every":
                    T = self.valor(f["t"])
                    if not (T > 0 and math.trunc(t1 / T) != math.trunc(t0 / T)):
                        continue
                else:
                    if not self.condicion(f["c"]):
                        continue
                    alguno = True
                cambio = False
                for a in f["hace"]:
                    if self.accion(b, a, dt):
                        cambio = True
                if cambio:
                    salio = True
                    break
            if not alguno and not salio and body["sino"] is not None:
                for a in body["sino"]:
                    self.accion(b, a, dt)
        self.tz_paso(dt)

    # -- los botones de la logica ---------------------------------------
    def clic(self):
        c = self.L.get("click")
        if not c:
            return
        t = self.tz.get(c["x"])
        if self.S.get(c["x"]) or (t and t["modo"]):
            return
        self.tz_pulso(c["x"], self.valor(c["t"]))

    def boton(self, nombre):
        for b in self.bloques:
            filas = b["botones"].get(nombre)
            if not filas:
                continue
            if filas["hold"] is not None:
                self.tz_cancela(filas["hold"])
                self.S[filas["hold"]] = True
                self.clic()
            if filas["larga"] is not None:
                self.lp[nombre] = {"b": b, "nombre": nombre, "lleva": 0, "largo": False}
                continue
            self.pulsar_filas(b, filas)

    def pulsar_filas(self, b, filas):
        st = self.st.get(self.clave(b))
        hizo = None
        for en, acts in filas["en"]:
            if en == st:
                hizo = acts
                break
        if hizo is None:
            hizo = filas["siempre"]
        if hizo is not None:
            for a in hizo:
                self.accion(b, a, 0)
            if filas["hold"] is None:
                self.clic()

    def paso_largas(self, dt):
        for lp in list(self.lp.values()):
            if lp["largo"]:
                continue
            lp["lleva"] += dt
            larga = lp["b"]["botones"][lp["nombre"]]["larga"]
            if lp["lleva"] + 0.001 >= self.valor(larga["t"]):
                lp["largo"] = True
                self.anotar("pulsacion larga %s" % lp["nombre"])
                for a in larga["hace"]:
                    self.accion(lp["b"], a, 0)
                self.clic()

    def soltar(self, nombre):
        for b in self.bloques:
            filas = b["botones"].get(nombre)
            if not filas:
                continue
            lp = self.lp.get(nombre)
            if lp:
                if not lp["largo"]:
                    self.pulsar_filas(b, filas)
                del self.lp[nombre]
            if filas["hold"] is not None:
                self.S[filas["hold"]] = False
            if filas["soltar"] is not None:
                for a in filas["soltar"]:
                    self.accion(b, a, 0)

    # -- la cola: lo que piden la pantalla y los botones ------------------
    def atender(self, ev):
        S = self.S
        tipo = ev["tipo"]
        if tipo == "logica":
            self.anotar("pulsado %s" % ev["w"])
            if self.hay:
                self.boton(ev["w"])
        elif tipo == "suelta":
            self.anotar("soltado %s" % ev["w"])
            if self.hay:
                self.soltar(ev["w"])
        elif tipo == "set":
            S[ev["n"]] = ev["v"]
            if ev.get("pulso"):
                self.pulsos.append(ev["n"])
        elif tipo == "inc":
            r = self.rango(ev["n"])
            S[ev["n"]] = acota(num(S.get(ev["n"])) + ev["d"], r[0], r[1]) if r else num(S.get(ev["n"])) + ev["d"]

    def tick(self, leer_entradas, actuar=None):
        """Una vuelta de la tarea de control: la cola, las entradas, la
        logica y, en la placa, las salidas (actuar). Un pulso de boton vale
        1 hasta que las salidas lo han visto, como en control.cpp."""
        cola = self.cola
        self.cola = []
        for ev in cola:
            self.atender(ev)
        self.t += PERIODO
        leer_entradas(self.S)
        if self.hay:
            self.paso(PERIODO)
        if actuar:
            actuar(self.S)
        for n in self.pulsos:
            self.S[n] = False
        self.pulsos = []

    def estado(self):
        """El estado del primer bloque: el que ven la franja y los pasos."""
        return self.st.get(self.clave(self.bloques[0])) if self.bloques else ""


# ---------------------------------------------------------------------
# LO QUE ENSENA CADA WIDGET
# Una copia de vivoDe() y de los vivo() de los componentes: con los
# valores de ahora, que texto, que fraccion, si esta encendido...
# ---------------------------------------------------------------------
def a_fijo(x, dec):
    """Number(x).toFixed(dec) de JavaScript: la mitad, hacia fuera."""
    from decimal import Decimal, ROUND_HALF_UP
    x = num(x)
    q = Decimal(1).scaleb(-int(dec))
    s = str(Decimal(float(x)).quantize(q, rounding=ROUND_HALF_UP))
    if s.startswith("-") and float(s) == 0:
        s = s[1:]
    return s


def mmss(s):
    """mm:ss del simulador (para el Tiempo de antes): los segundos enteros."""
    s = max(0, math.floor(num(s)))
    return "%02d:%02d" % (s // 60, s % 60)


def mmss_js(s):
    """mmssJS de los componentes: redondeando."""
    t = max(0, redondea(num(s)))
    return "%02d:%02d" % (t // 60, t % 60)


# ---------------------------------------------------------------------
# EL DIBUJO
# Se pinta como el lienzo de Telar: en color, con los mismos numeros, y al
# final cada pixel se enciende si su luz pasa del 30 % (el mismo corte que
# el filtro de la OLED del lienzo y que el generador de C). Se pinta a K
# veces el tamano y se reduce: asi los bordes y las letras salen suaves
# antes del corte, como en el navegador, y el grosor es el mismo.
# ---------------------------------------------------------------------
def rgb(c):
    c = str(c or "#000000").strip()
    if c.startswith("#"):
        h = c[1:]
        if len(h) in (3, 4):
            h = "".join(ch * 2 for ch in h[:3])
        try:
            n = int(h[:6], 16)
        except ValueError:
            n = 0
        return ((n >> 16) & 255, (n >> 8) & 255, n & 255)
    return (0, 0, 0)


def repartir(minimos, disponible):
    """flex: 1 del navegador: el sitio a partes iguales, pero ninguna parte
    por debajo de su minimo (su texto). La que no cabe se queda en su
    minimo y el resto se reparte entre las demas."""
    n = len(minimos)
    anchos = [None] * n
    libres = list(range(n))
    while libres:
        resto = disponible - sum(a for a in anchos if a is not None)
        parte = resto / float(len(libres))
        chicos = [i for i in libres if minimos[i] > parte]
        if not chicos:
            for i in libres:
                anchos[i] = parte
            break
        for i in chicos:
            anchos[i] = minimos[i]
            libres.remove(i)
    return anchos


def mezcla(a, b, t):
    A, B = rgb(a), rgb(b)
    return tuple(int(math.floor(x + (y - x) * t + 0.5)) for x, y in zip(A, B))


class Letras:
    """Las fuentes, cargadas una vez por tamano. Un icono (area privada
    de Unicode) sale de la fuente de iconos, como en el lienzo."""

    def __init__(self, carpeta, K):
        from PIL import ImageFont
        self.IF = ImageFont
        self.carpeta = carpeta
        self.K = K
        self.cache = {}

    def fuente(self, ttf, px):
        k = (ttf, px)
        if k not in self.cache:
            ruta = os.path.join(self.carpeta, ttf)
            if not os.path.exists(ruta):
                ruta = os.path.join(self.carpeta, "Montserrat-Medium.ttf")
            self.cache[k] = self.IF.truetype(ruta, max(1, int(round(px * self.K))))
        return self.cache[k]

    def fuente1(self, ttf, px):
        """La misma, a su tamano de verdad: la que dibuja y la que mide."""
        k = (ttf, px, 1)
        if k not in self.cache:
            ruta = os.path.join(self.carpeta, ttf)
            if not os.path.exists(ruta):
                ruta = os.path.join(self.carpeta, "Montserrat-Medium.ttf")
            self.cache[k] = self.IF.truetype(ruta, max(1, int(round(px))))
        return self.cache[k]

    @staticmethod
    def es_icono(ch):
        n = ord(ch)
        return 0xE000 <= n <= 0xF8FF

    def trozos(self, texto, L):
        """El texto partido en trozos de la misma fuente."""
        out = []
        for ch in texto:
            ttf = "iconos.ttf" if self.es_icono(ch) else L["ttf"]
            if out and out[-1][0] == ttf:
                out[-1][1] += ch
            else:
                out.append([ttf, ch])
        return out

    def metricas(self, L):
        f = self.fuente(L["ttf"], L["px"])
        a, d = f.getmetrics()
        return a / self.K, d / self.K

    def ancho(self, texto, L, esp=0):
        w = 0.0
        for ttf, t in self.trozos(texto, L):
            # se mide como el navegador (sin ajuste a la rejilla): asi los
            # saltos de linea y los centrados salen donde en el lienzo
            w += self.fuente(ttf, L["px"]).getlength(t) / self.K
        extra = 1 if (L.get("sint") or {}).get("negrita") else 0
        return w + esp * len(texto) + extra


class Pintor:
    """Todo lo que se pinta en una capa del tamano de la pantalla (x K)."""

    def __init__(self, ancho, alto, letras, K):
        from PIL import Image, ImageDraw, ImageFilter, ImageChops
        self.Image, self.ImageDraw, self.ImageFilter, self.ImageChops = Image, ImageDraw, ImageFilter, ImageChops
        self.W, self.H, self.K = ancho, alto, K
        self.letras = letras

    def capa(self):
        im = self.Image.new("RGBA", (self.W * self.K, self.H * self.K), (0, 0, 0, 0))
        return im, self.ImageDraw.Draw(im)

    def k(self, v):
        return int(round(v * self.K))

    def caja(self, x, y, w, h):
        return [self.k(x), self.k(y), self.k(x + w) - 1, self.k(y + h) - 1]

    # -- formas ---------------------------------------------------------
    def rect(self, d, x, y, w, h, relleno=None, radio=0, borde=None, grosor=1):
        if w <= 0 or h <= 0:
            return
        r = max(0, min(radio, w / 2.0, h / 2.0))
        c = self.caja(x, y, w, h)
        if c[2] < c[0] or c[3] < c[1]:
            return
        if relleno is not None:
            d.rounded_rectangle(c, radius=self.k(r), fill=rgb(relleno) + (255,))
        if borde is not None and grosor > 0:
            d.rounded_rectangle(c, radius=self.k(r), outline=rgb(borde) + (255,), width=max(1, self.k(grosor)))

    def circulo(self, d, cx, cy, r, relleno):
        if r <= 0:
            return
        d.ellipse([self.k(cx - r), self.k(cy - r), self.k(cx + r) - 1, self.k(cy + r) - 1], fill=rgb(relleno) + (255,))

    def linea(self, d, x0, y0, x1, y1, color, grosor):
        d.line([(self.k(x0), self.k(y0)), (self.k(x1), self.k(y1))], fill=rgb(color) + (255,), width=max(1, self.k(grosor)))

    def arco(self, d, cx, cy, r, grosor, a0, a1, color, redondo=False):
        """Un trazo de ancho grosor centrado en el radio r, de a0 a a1
        grados (0 = a las 3, en el sentido de las agujas)."""
        R = r + grosor / 2.0
        if a1 - a0 >= 360:
            a1 = a0 + 359.999
        d.arc([self.k(cx - R), self.k(cy - R), self.k(cx + R) - 1, self.k(cy + R) - 1],
              a0, a1, fill=rgb(color) + (255,), width=max(1, self.k(grosor)))
        if redondo:
            for a in (a0, a1):
                t = math.radians(a)
                self.circulo(d, cx + math.cos(t) * r, cy + math.sin(t) * r, grosor / 2.0, color)

    # -- texto ----------------------------------------------------------
    def texto(self, capa, x, top, lh, texto, L, color, esp=0, subrayado=False, tachado=False):
        """Un renglon: top es la parte de arriba de su caja de linea (lh),
        como un div con line-height en el lienzo."""
        if not texto:
            return
        a, dsc = self.letras.metricas(L)
        # como el navegador: la linea base cae en un pixel entero; si no,
        # los trazos horizontales se reparten entre dos filas y el corte
        # del 30 % se los come
        base = float(math.floor(top + (lh - (a + dsc)) / 2.0 + a + 0.5))
        x = float(math.floor(x + 0.5))
        sint = L.get("sint") or {}
        # El texto se pinta como MASCARA (cuanto cubre cada pixel) y el color
        # se pone despues. Pintado directamente sobre una capa transparente,
        # Pillow oscurece el borde de cada letra y ademas le baja la
        # opacidad: el trazo fino se quedaba por debajo del corte y
        # desaparecia.
        mascara = self.Image.new("L", capa.size, 0)
        if sint.get("cursiva"):
            self._cursiva(mascara, x, base, texto, L, esp, sint.get("negrita"))
        else:
            self._renglon(mascara, x, base, texto, L, esp, sint.get("negrita"))
        self.pintar_mascara(capa, mascara, color)
        if subrayado or tachado:
            d = self.ImageDraw.Draw(capa)
            w = self.letras.ancho(texto, L, esp)
            g = max(1.0, L["px"] / 14.0)
            if subrayado:
                self.rect(d, x, base + max(1.0, L["px"] * 0.08), w, g, relleno=color)
            if tachado:
                self.rect(d, x, base - L["px"] * 0.3, w, g, relleno=color)

    def pintar_mascara(self, capa, mascara, color):
        """Un color solido, con la opacidad que diga la mascara."""
        solido = self.Image.new("RGBA", capa.size, rgb(color) + (255,))
        solido.putalpha(mascara)
        capa.alpha_composite(solido)

    def _renglon(self, destino, x, base, texto, L, esp, negrita):
        """Las letras se dibujan a su tamano de verdad (1x), con el ajuste a
        la rejilla de FreeType: a 10 u 11 px los trazos caen enteros en
        su pixel y el corte a blanco y negro no los rompe. Luego se
        amplian a K para juntarlas con lo demas."""
        K = self.K
        a, dsc = self.letras.metricas(L)
        ancho = int(self.letras.ancho(texto, L, esp) + L["px"] + 4)
        alto = int(a + dsc + 4)
        m = self.Image.new("L", (ancho, alto), 0)
        dm = self.ImageDraw.Draw(m)
        X = 1.0
        yb = math.floor(a) + 1
        for ttf, t in self.letras.trozos(texto, L):
            f = self.letras.fuente1(ttf, L["px"])
            partes = list(t) if esp else [t]
            for p in partes:
                dm.text((X, yb), p, font=f, fill=255, anchor="ls")
                if negrita:
                    dm.text((X + 0.6, yb), p, font=f, fill=255, anchor="ls")
                X += f.getlength(p) + esp * (len(p) if esp else 0)
        grande = m.resize((ancho * K, alto * K), self.Image.NEAREST)
        pos = (int(round((x - 1) * K)), int(round((base - yb) * K)))
        hueco = self.Image.new("L", destino.size, 0)
        hueco.paste(grande, pos)
        destino.paste(self.ImageChops.lighter(destino, hueco))

    def _cursiva(self, mascara, x, base, texto, L, esp, negrita):
        """La cursiva que imita el navegador: la Medium inclinada."""
        K = self.K
        a, dsc = self.letras.metricas(L)
        w = self.letras.ancho(texto, L, esp) + L["px"]
        tmp = self.Image.new("L", (int(w * K) + 4, int((a + dsc) * K) + 4), 0)
        self._renglon(tmp, 0, a, texto, L, esp, negrita)
        inc = 0.2
        tmp = tmp.transform(tmp.size, self.Image.AFFINE, (1, inc, -inc * a * K, 0, 1, 0), resample=self.Image.BILINEAR)
        hueco = self.Image.new("L", mascara.size, 0)
        hueco.paste(tmp, (int(round(x * K)), int(round((base - a) * K))))
        mascara.paste(self.ImageChops.lighter(mascara, hueco))

    def renglones(self, texto, L, ancho, esp=0):
        """Parte un texto en renglones que caben en ancho (white-space normal)."""
        salida = []
        for parrafo in str(texto).split("\n"):
            palabras = parrafo.split(" ")
            linea = ""
            for p in palabras:
                prueba = p if not linea else linea + " " + p
                if linea and self.letras.ancho(prueba, L, esp) > ancho + 0.5:
                    salida.append(linea)
                    linea = p
                else:
                    linea = prueba
            salida.append(linea)
        return salida

    def bloque(self, capa, x, y, w, h, texto, L, color, lh=None, esp=0, alinear="", subrayado=False, tachado=False, envolver=True):
        """Un texto centrado en su caja, como un hijo de .w-int (flex centrado).
        Sin alinear, el bloque va centrado y sus renglones a la izquierda;
        con alinear, cada renglon a su lado."""
        lh = lh or L["lh"]
        lineas = self.renglones(texto, L, w, esp) if envolver else [str(texto)]
        anchos = [self.letras.ancho(t, L, esp) for t in lineas]
        top = y + (h - lh * len(lineas)) / 2.0
        bx = x + (w - max(anchos or [0])) / 2.0
        for i, t in enumerate(lineas):
            if alinear == "centro":
                lx = x + (w - anchos[i]) / 2.0
            elif alinear == "derecha":
                lx = x + w - anchos[i]
            elif alinear == "izquierda":
                lx = x
            else:
                lx = bx
            self.texto(capa, lx, top + i * lh, lh, t, L, color, esp, subrayado, tachado)


class Pantalla:
    """Lo que se ve: las pantallas del proyecto, pintadas con los valores
    de la logica. dibujar() devuelve una imagen de 1 bit del tamano de la
    OLED."""

    def __init__(self, P, carpeta_fuentes, K=4):
        self.P = P
        self.K = K
        self.W = P["pantalla"]["ancho"]
        self.H = P["pantalla"]["alto"]
        self.letras = Letras(carpeta_fuentes, K)
        self.pintor = Pintor(self.W, self.H, self.letras, K)
        self.todas = P.get("todas", {})
        self.i = 0                      # la pantalla que se ensena
        self.foco = None                # el nombre del widget marcado
        self.editando = False           # un deslizador en edicion
        self.presionado = None
        self.enlace_caido = False
        self.t = 0.0
        self.tasas = {}

    def pantalla(self):
        return self.P["pantallas"][self.i]

    # -- los valores, como vivoDe() ------------------------------------
    def var(self, n):
        return self.todas.get(n) if n else None

    def caida(self, v):
        return self.enlace_caido and v is not None and v.get("remota")

    def frac(self, b, S):
        v = self.var(b.get("bind"))
        if not v:
            return 0
        lo = redondea(v["min"] if v.get("min") is not None else 0)
        hi = redondea(v["max"] if v.get("max") is not None else 100)
        x = lo if self.caida(v) else math.trunc(num(S.get(b["bind"])))
        return acota((x - lo) / ((hi - lo) or 1), 0, 1)

    def aspecto(self, b, V, lg):
        """looks: el texto y el color por estado, y enabled."""
        if not lg or not lg.hay:
            return
        for bl in lg.bloques:
            filas = bl["looks"].get(b["nombre"])
            if not filas:
                continue
            st = lg.st.get(lg.clave(bl))
            fila = next((f for f in filas if f["en"] == st), None)
            if not fila:
                continue
            if "color" in fila:
                V["color"] = fila["color"]
            if "texto" in fila and b["tipo"] in ("button", "label"):
                V["texto"] = (b.get("looks") or {}).get(fila["texto"], fila["texto"])
            if fila.get("habilitado") is False and b["tipo"] in ("button", "toggle", "checkbox", "slider", "dropdown", "roller"):
                V["apagado"] = True

    def numero(self, b, S, unidad=""):
        """textoVivo() de los componentes."""
        v = self.var(b.get("bind"))
        N = b.get("numero") or {}
        if not v:
            return "--"
        if self.caida(v):
            return "--"
        x = S.get(b["bind"])
        if v.get("booleano"):
            return "SI" if x else "NO"
        if N.get("tasa") and not N.get("tiempo"):
            x = self.tasa(b, num(x))
        elif N.get("tiempo"):
            return mmss_js(x)
        s = a_fijo(x, N.get("decimales", 1))
        if N.get("coma"):
            s = s.replace(".", ",", 1)
        return s + ((" " + unidad) if unidad else "")

    def tasa(self, b, x):
        h = self.tasas.get(b["nombre"])
        if not h or self.t < h["t"]:
            self.tasas[b["nombre"]] = {"x": x, "t": self.t, "tasa": 0}
            return 0
        if self.t - h["t"] >= 0.25:
            r = (x - h["x"]) / (self.t - h["t"])
            h["tasa"] += 0.35 * (r - h["tasa"])
            h["x"] = x
            h["t"] = self.t
        return 0 if abs(h["tasa"]) < 0.05 else h["tasa"]

    def vivo(self, b, S, lg):
        V = {}
        t = b["tipo"]
        v = self.var(b.get("bind"))
        coma = bool(self.P["pantalla"].get("coma"))
        estado = lg.estado() if lg and lg.hay else ""
        if t == "value":
            if not v or self.caida(v):
                V["texto"] = "--"
            elif v.get("booleano"):
                V["texto"] = "SI" if S.get(b["bind"]) else "NO"
            else:
                s = a_fijo(S.get(b["bind"]), b.get("decimales", 1))
                V["texto"] = s.replace(".", ",", 1) if coma else s
        elif t == "timer":
            V["texto"] = mmss(S.get(b["bind"])) if v else "00:00"
        elif t in ("bar", "slider"):
            V["frac"] = self.frac(b, S)
        elif t == "toggle":
            V["on"] = bool(num(S.get(b["bind"]))) if v else False
        elif t == "checkbox":
            V["on"] = bool(num(S.get(b["bind"]))) if v else True
        elif t == "led":
            V["on"] = bool(num(S.get(b["bind"]))) if (v and not self.caida(v)) else False
        elif t == "state-strip":
            V["idx"] = b["estados"].index(estado) if (lg and lg.hay and estado in b["estados"]) else (-1 if lg and lg.hay else 0)
        elif t == "button":
            V["presionado"] = self.presionado == b["nombre"]
        elif t in ("lectura", "tiempo"):
            V["texto"] = self.numero(b, S)
        elif t == "dato":
            V["texto"] = self.numero(b, S, (b.get("numero") or {}).get("unidad", ""))
        elif t == "pildora":
            if self.enlace_caido:
                V["d"] = b["sinEnlace"]
            else:
                est = estado or b["primero"]
                V["d"] = b["estados"].get(est) or {"texto": est, "color": "#9aa3b2", "fondo": "#000000"}
        elif t == "pasos":
            V["idx"] = b["estados"].index(estado) if estado in b["estados"] else -1
        elif t in ("barra-consigna", "aguja"):
            lo, hi = b["min"], b["max"]
            fr = lambda x: min(1, max(0, (num(x) - lo) / (hi - lo)))
            V["frac"] = fr(S.get(b["bind"])) if v else 0
            sp = num(S.get(b["consigna"])) if b.get("consigna") else b["fijo"]
            V["fracSp"] = fr(sp)
            if t == "aguja":
                N = b["numero"]
                s = a_fijo(S.get(b["bind"]), N.get("decimales", 1)) if v else "--"
                V["texto"] = s.replace(".", ",", 1) if (v and N.get("coma")) else s
                c = a_fijo(sp, N.get("decimales", 1))
                V["cons"] = c.replace(".", ",", 1) if N.get("coma") else c
        if t != "pildora":
            self.aspecto(b, V, lg)
        return V

    # -- la imagen -----------------------------------------------------
    def dibujar(self, S, lg):
        Image = self.pintor.Image
        fondo = self.P["pantalla"].get("fondo", "#000000")
        K = self.K
        im = Image.new("RGBA", (self.W * K, self.H * K), rgb(fondo) + (255,))
        cajas_foco = None
        for b in self.pantalla()["widgets"]:
            if b.get("noSoportado"):
                continue
            V = self.vivo(b, S, lg)
            capa, d = self.pintor.capa()
            try:
                self.widget(b, V, capa, d)
            except Exception as e:           # un widget raro no tumba la pantalla
                print("No se pudo dibujar %s: %s" % (b.get("nombre"), e))
                continue
            if b["tipo"] == "button" and V.get("presionado"):
                capa = self.oscurecer(capa, 0.78)
            if V.get("apagado"):
                a = capa.getchannel("A").point(lambda p: int(p * 0.4))
                capa.putalpha(a)
            recorta = not (b.get("auto") or b["tipo"] in ("lectura", "tiempo", "line"))
            if recorta:
                m = Image.new("L", capa.size, 0)
                self.pintor.ImageDraw.Draw(m).rectangle(self.pintor.caja(b["x"], b["y"], b["w"], b["h"]), fill=255)
                capa.putalpha(self.pintor.ImageChops.multiply(capa.getchannel("A"), m))
            im.alpha_composite(capa)
            if self.foco == b["nombre"]:
                cajas_foco = (b["x"], b["y"], b["w"], b["h"])
        pequena = im.convert("RGB").resize((self.W, self.H), Image.BOX)
        luz = pequena.convert("L", (0.2126, 0.7152, 0.0722, 0))
        uno = luz.point(lambda p: 255 if p > 76.5 else 0).convert("1")
        if cajas_foco:
            uno = self.invertir(uno, cajas_foco)
        return uno

    def oscurecer(self, capa, f):
        r, g, b, a = capa.split()
        r, g, b = (c.point(lambda p: int(p * f)) for c in (r, g, b))
        return self.pintor.Image.merge("RGBA", (r, g, b, a))

    def invertir(self, uno, caja):
        """El foco de los botones de navegacion: el widget, en negativo."""
        from PIL import ImageOps
        x, y, w, h = caja
        x0, y0 = max(0, int(x)), max(0, int(y))
        x1, y1 = min(self.W, int(x + w)), min(self.H, int(y + h))
        if x1 <= x0 or y1 <= y0:
            return uno
        trozo = uno.crop((x0, y0, x1, y1)).convert("L")
        uno = uno.copy()
        uno.paste(ImageOps.invert(trozo).convert("1"), (x0, y0))
        return uno

    # -- cada widget: lo mismo que dibujo() del lienzo ---------------------
    def widget(self, b, V, capa, d):
        p = self.pintor
        t = b["tipo"]
        x, y, w, h = b["x"], b["y"], b["w"], b["h"]
        if t == "label":
            p.bloque(capa, x, y, w, h, V.get("texto", b["texto"]), b["letra"], V.get("color", b["color"]),
                     esp=b.get("espaciado", 0), alinear=b.get("alinear", ""), subrayado=b.get("subrayado"), tachado=b.get("tachado"))
        elif t in ("value", "timer"):
            p.bloque(capa, x, y, w, h, V.get("texto", ""), b["letra"], V.get("color", b["color"]),
                     esp=b.get("espaciado", 0), alinear=b.get("alinear", ""), subrayado=b.get("subrayado"), tachado=b.get("tachado"), envolver=False)
        elif t == "panel":
            p.rect(d, x, y, w, h, relleno=b["fondo"], radio=b["radio"], borde=b["borde"])
        elif t == "bar":
            g = b["g"]
            gx, gy = x + g.get("dx", 0), y + g.get("dy", 0)
            p.rect(d, gx, gy, g["w"], g["h"], relleno=b["vacio"], radio=g["h"] / 2.0)
            p.rect(d, gx, gy, g["w"], g["h"], radio=g["h"] / 2.0, borde=b["tinta"])
            f = redondea(min(1, max(0, V.get("frac", 0))) * 100) / 100.0
            if f > 0:
                self.recortado(capa, (gx, gy, g["w"], g["h"], g["h"] / 2.0), (gx, gy, g["w"] * f, g["h"]), V.get("color", b["tinta"]))
        elif t == "slider":
            g = b["g"]
            gx, gy = x + g["dx"], y + g["dy"]
            f = redondea(min(1, max(0, V.get("frac", 0))) * 100) / 100.0
            col = V.get("color", b["tinta"])
            p.rect(d, gx, gy, g["w"], g["h"], relleno=b["vacio"], radio=99)
            p.rect(d, gx, gy, g["w"], g["h"], radio=99, borde=b["tinta"])
            p.rect(d, gx, gy, g["w"] * f, g["h"], relleno=col, radio=99)
            p.circulo(d, gx + g["w"] * f, gy + g["h"] / 2.0, g["mango"] / 2.0, col)
            if self.editando and self.foco == b["nombre"]:
                p.rect(d, x, y, w, h, radio=2, borde=b["tinta"])
        elif t == "toggle":
            g = b["g"]
            gx, gy = x + g["dx"], y + g["dy"]
            on = V.get("on", True)
            p.rect(d, gx, gy, g["w"], g["h"], relleno=b["tinta"] if on else b["vacio"], radio=99)
            p.rect(d, gx, gy, g["w"], g["h"], radio=99, borde=b["tinta"])
            dm = redondea(g["h"] * 0.78)
            kx = gx + g["w"] - 3 - dm if on else gx + 3
            p.circulo(d, kx + dm / 2.0, gy + g["h"] / 2.0, dm / 2.0, b["vacio"] if on else b["tinta"])
        elif t == "checkbox":
            on = V.get("on", True)
            F = redondea(h * 0.6)
            bx, by = x + 6, y + (h - F) / 2.0
            p.rect(d, bx, by, F, F, relleno=b["tinta"] if on else b["vacio"], radio=4)
            p.rect(d, bx, by, F, F, radio=4, borde=b["tinta"])
            if on:
                g = max(1.0, F * 0.12)
                p.linea(d, bx + F * 0.22, by + F * 0.52, bx + F * 0.42, by + F * 0.72, b["vacio"], g)
                p.linea(d, bx + F * 0.42, by + F * 0.72, bx + F * 0.80, by + F * 0.30, b["vacio"], g)
            tx = bx + F + 8
            p.bloque(capa, tx, y, max(1, x + w - tx), h, b["texto"], b["letra"], b["color"], esp=b.get("espaciado", 0),
                     alinear="izquierda", subrayado=b.get("subrayado"), tachado=b.get("tachado"), envolver=False)
        elif t == "led":
            dm = min(w, h)
            cx, cy = x + w / 2.0, y + h / 2.0
            on = V.get("on", True)
            col = b["apagado"] if not on else V.get("color", b["acento"])
            if on:
                # el halo (box-shadow del lienzo): se difumina la mascara, no el color
                m = p.Image.new("L", capa.size, 0)
                dmk = p.ImageDraw.Draw(m)
                dmk.ellipse([p.k(cx - dm / 2.0), p.k(cy - dm / 2.0), p.k(cx + dm / 2.0) - 1, p.k(cy + dm / 2.0) - 1], fill=255)
                p.pintar_mascara(capa, m.filter(p.ImageFilter.GaussianBlur(dm * 0.4 / 2.0 * self.K)), col)
            p.circulo(d, cx, cy, dm / 2.0, col)
        elif t == "line":
            if b.get("diag"):
                L = b["diag"]
                p.linea(d, x + L["x1"], y + L["y1"], x + L["x2"], y + L["y2"], b["color"], L["g"])
            else:
                p.rect(d, x, y, w, h, relleno=b["color"])
        elif t == "spinner":
            dm, g = b["d"], b["grosor"]
            cx, cy = x + w / 2.0, y + h / 2.0
            r = (dm - g) / 2.0
            p.arco(d, cx, cy, r, g, 0, 360, b["pista"])
            a0 = -90 + (self.t * 360.0) % 360.0
            p.arco(d, cx, cy, r, g, a0, a0 + b["grados"], b["acento"], redondo=True)
        elif t == "state-strip":
            # flex: 1 con min-width: auto, como en el navegador: todas
            # igual de anchas, pero ninguna por debajo de su texto
            n = max(1, len(b["textos"]))
            L = b["letra"]
            a, dsc = self.letras.metricas(L)
            anchos = repartir([self.letras.ancho(s, L) for s in b["textos"]], w - 12 - 6 * (n - 1))
            ih = (a + dsc) + 2 * h * 0.16
            iy = y + (h - ih) / 2.0
            ix = x + 6
            for i, s in enumerate(b["textos"]):
                iw = anchos[i]
                act = i == V.get("idx", 0)
                p.rect(d, ix, iy, iw, ih, relleno=b["acento"] if act else b["sup"], radio=5)
                p.bloque(capa, ix, iy, iw, ih, s, L, "#04121f" if act else "#9aa3b2", lh=a + dsc, alinear="centro", envolver=False)
                ix += iw + 6
        elif t == "button":
            fondo = V.get("color", b["fondo"])
            borde = V.get("color", b["borde"])
            p.rect(d, x, y, w, h, relleno=fondo, radio=b["radio"], borde=borde)
            p.bloque(capa, x, y, w, h, V.get("texto", b["texto"]), b["letra"], b["colorTexto"],
                     esp=b.get("espaciado", 0), subrayado=b.get("subrayado"), tachado=b.get("tachado"))
        elif t == "tarjeta":
            p.rect(d, x, y, w, h, relleno=b["fondo"], radio=b["radio"], borde=b.get("borde"))
            R = b.get("rotulo")
            if R:
                p.texto(capa, x + R["x"], y + R["y"], R["letra"]["lh"], R["texto"], R["letra"], R["color"], R["espaciado"])
        elif t in ("lectura", "tiempo"):
            self.lectura(b, V, capa, d)
        elif t == "dato":
            p.rect(d, x, y, w, h, relleno=b["fondo"], radio=b["radio"])
            R = b.get("rotulo")
            if R:
                p.texto(capa, x + R["x"], y + R["y"], R["letra"]["lh"], R["texto"], R["letra"], R["color"], R["espaciado"])
            p.texto(capa, x + b["val"]["x"], y + b["val"]["y"], b["val"]["letra"]["lh"], V.get("texto", "--"), b["val"]["letra"], V.get("color", b["color"]))
        elif t == "pildora":
            D = V["d"]
            if not b.get("plano"):
                p.rect(d, x, y, w, h, relleno=D["fondo"], radio=redondea(h / 2.0), borde=D["color"])
            self.recortar(capa, (x, y, w, h), lambda c: p.bloque(c, x, y, w, h, D["texto"], b["letra"], D["color"], esp=1, alinear="centro", envolver=False))
        elif t == "pasos":
            n = max(1, len(b["textos"]))
            gap = b["gap"]
            for i, s in enumerate(b["textos"]):
                if b["columna"]:
                    ch = (h - gap * (n - 1)) / float(n)
                    cx, cy, cw = x, y + i * (ch + gap), w
                else:
                    cw = (w - gap * (n - 1)) / float(n)
                    cx, cy, ch = x + i * (cw + gap), y, h
                on = i == V.get("idx", -1)
                c = (b.get("onI") or [])[i] if i < len(b.get("onI") or []) else b["on"]    # el color de ese paso
                p.rect(d, cx, cy, cw, ch, relleno=c["fondo"] if on else b["off"]["fondo"], radio=4)
                if on:
                    p.rect(d, cx, cy, cw, ch, radio=4, borde=c["borde"], grosor=2)
                # cada casilla recorta su texto (overflow: hidden)
                col = c["texto"] if on else b["off"]["texto"]
                self.recortar(capa, (cx, cy, cw, ch), lambda cp, cx=cx, cy=cy, cw=cw, ch=ch, s=s, col=col:
                              p.bloque(cp, cx, cy, cw, ch, s, b["letra"], col, alinear="centro", envolver=False))
        elif t == "barra-consigna":
            G = b["G"]
            f, g = V.get("frac", 0), V.get("fracSp", 0)
            p.rect(d, x, y + G["yBarra"], w, G["gr"], relleno=b["pista"], radio=G["gr"] / 2.0)
            if f > 0:
                p.rect(d, x, y + G["yBarra"], w * f, G["gr"], relleno=V.get("color", b["acento"]), radio=G["gr"] / 2.0)
            if b.get("marca"):
                p.rect(d, x + g * w - 1, y, 3, G["marca"], relleno=b["ok"])
            E = b.get("escala")
            if E:
                L = E["letra"]
                p.texto(capa, x, y + G["yEsc"], L["lh"], E["izq"], L, E["color"])
                p.texto(capa, x + w - self.letras.ancho(E["der"], L), y + G["yEsc"], L["lh"], E["der"], L, E["color"])
        elif t == "aguja":
            self.aguja(b, V, capa, d)
        elif t == "icono":
            L = b["letra"]
            a, dsc = self.letras.metricas(L)
            wt = self.letras.ancho(b["texto"], L)
            top = y + (h - L["px"]) / 2.0
            p.texto(capa, x + (w - wt) / 2.0, top, L["px"], b["texto"], L, V.get("color", b["color"]))

    def recortar(self, capa, caja, pinta):
        """Lo que pinte pinta(capa), solo dentro de caja."""
        p = self.pintor
        tmp = p.Image.new("RGBA", capa.size, (0, 0, 0, 0))
        pinta(tmp)
        m = p.Image.new("L", capa.size, 0)
        p.ImageDraw.Draw(m).rectangle(p.caja(*caja), fill=255)
        tmp.putalpha(p.ImageChops.multiply(tmp.getchannel("A"), m))
        capa.alpha_composite(tmp)

    def recortado(self, capa, forma, caja, color):
        """Un relleno dentro de una forma redonda (overflow: hidden)."""
        p = self.pintor
        Image = p.Image
        fx, fy, fw, fh, fr = forma
        m = Image.new("L", capa.size, 0)
        dm = p.ImageDraw.Draw(m)
        dm.rounded_rectangle(p.caja(fx, fy, fw, fh), radius=p.k(min(fr, fw / 2.0, fh / 2.0)), fill=255)
        rel = Image.new("RGBA", capa.size, (0, 0, 0, 0))
        dr = p.ImageDraw.Draw(rel)
        cx, cy, cw, ch = caja
        if cw > 0:
            dr.rectangle(p.caja(cx, cy, cw, ch), fill=rgb(color) + (255,))
        rel.putalpha(p.ImageChops.multiply(rel.getchannel("A"), m))
        capa.alpha_composite(rel)

    def lectura(self, b, V, capa, d):
        """El Numero y el Tiempo: disposicion() de componentes.js."""
        p = self.pintor
        x, y, w, h = b["x"], b["y"], b["w"], b["h"]
        D = b["disp"]
        texto = V.get("texto", "--")
        if b["num"].get("sinComa"):
            texto = texto.replace(",", ".")
        L = b["num"]["letra"]
        numW = self.letras.ancho(texto, L, D["esp"])
        pos = D["pos"]
        detras = pos in ("detras", "base")
        util, pad = D["util"], D["pad"]

        def alinX(ancho):
            off = {"centro": (util - ancho) / 2.0, "derecha": util - ancho}.get(D["alinear"], 0)
            return pad + redondea(off or 0)
        yN = D["yNum"] + (D["hu"] if pos == "encima" else 0)
        numX = alinX(numW + D["gap"] + D["uniW"]) if detras else alinX(numW)
        ux = uy = 0
        if pos == "detras":
            ux, uy = numX + numW + D["gap"], yN + redondea(L["px"] * 0.13)
        elif pos == "base":
            ux, uy = numX + numW + D["gap"], yN + redondea(D["hn"] * 0.8 - D["hu"] * 0.8)
        elif pos == "debajo":
            ux, uy = alinX(D["uniW"]), yN + D["hn"]
        elif pos == "encima":
            ux, uy = alinX(D["uniW"]), yN - D["hu"]
        ux += D["unidadDx"]
        uy += D["unidadDy"]
        conUni = pos != "no"
        offX = max(0, (pad - ux) if conUni else 0, (pad - D["rotX"]) if D["conRot"] else 0)
        offY = max(0, (-uy) if conUni else 0, (-D["rotY"]) if D["conRot"] else 0)
        if b.get("tarjeta"):
            p.rect(d, x, y, w, h, relleno=b["fondo"], radio=b["radio"])
        R = b.get("rotulo")
        if R:
            p.texto(capa, x + D["rotX"] + offX, y + D["rotY"] + offY, R["letra"]["lh"], R["texto"], R["letra"], R["color"], R["espaciado"])
        p.texto(capa, x + numX + offX, y + yN + offY, D["hn"], texto, L, V.get("color", b["num"]["color"]), D["esp"],
                b["num"].get("subrayado"), b["num"].get("tachado"))
        U = b.get("uni")
        if U and conUni:
            p.texto(capa, x + ux + offX, y + uy + offY, D["hu"], U["texto"], U["letra"], U["color"])

    def aguja(self, b, V, capa, d):
        p = self.pintor
        x, y, w = b["x"], b["y"], b["w"]
        G = b["G"]
        s = G["s"]
        cx, cy, R, LW = x + G["cx"], y + G["cy"], G["R"], G["LW"]
        base = 180 if b["grados"] == 180 else 135

        def ang(f):
            return base + b["grados"] * min(1, max(0, f))

        def pt(a, r):
            t = math.radians(a)
            return cx + math.cos(t) * r, cy + math.sin(t) * r
        r0 = R + LW / 2.0 + 3 * s
        for i in range(41):
            may = i % 10 == 0
            a = ang(i / 40.0)
            x0, y0 = pt(a, r0)
            x1, y1 = pt(a, r0 + (9 if may else 5) * s)
            p.linea(d, x0, y0, x1, y1, b["marcaMayor"] if may else b["marcaMenor"], 2 if may else 1)
        p.arco(d, cx, cy, R, LW, ang(0), ang(1), b["pista"])
        f = V.get("frac", 0)
        if f > 0.002:
            p.arco(d, cx, cy, R, LW, ang(0), ang(f), V.get("color", b["acento"]))
        if b.get("marca"):
            g = V.get("fracSp", 0)
            x0, y0 = pt(ang(g), R - LW / 2.0 - 5 * s)
            x1, y1 = pt(ang(g), R + LW / 2.0 + 7 * s)
            p.linea(d, x0, y0, x1, y1, b["ok"], 4)
            dx, dy = pt(ang(g), R + LW / 2.0 + 11 * s)
            p.circulo(d, dx, dy, 3 * s, b["ok"])
        tx, ty = pt(ang(f), R)
        p.circulo(d, tx, ty, 5.5 * s, b["punta"])
        C = b["centro"]

        def linea(dy, L, color, texto, dx=0):
            wt = self.letras.ancho(texto, L)
            p.texto(capa, x + dx + (w - wt) / 2.0, y + redondea(G["cy"] + dy), L["lh"], texto, L, color)
        linea(C["num"], b["num"]["letra"], b["num"]["color"], V.get("texto", "--"))
        linea(C["uni"], b["uni"]["letra"], b["uni"]["color"], b["uni"]["texto"])
        if b.get("marca"):
            K = b["cons"]
            val = V.get("cons", "")
            linea(C["cons"] + K["dy"], K["letra"], K["color"], (K["prefijo"] + " " + val) if K["prefijo"] else val, K["dx"])


# ---------------------------------------------------------------------
# EL BANCO DE PRUEBAS (lo usa Telar para comparar con su simulador)
#   python3 telar_pantalla.py --banco escenario.json
# El escenario dice que se pulsa y que entra en cada vuelta; sale, por
# cada vuelta, el estado y todos los valores.
# ---------------------------------------------------------------------
class MemoriaRam:
    def __init__(self):
        self.m = {}

    def leer(self):
        return self.m

    def escribir(self, m):
        self.m = dict(m)


def banco(ruta):
    with open(ruta, encoding="utf-8") as f:
        E = json.load(f)
    P = E["proyecto"]
    lg = Logica(P["logica"], P["variables"], MemoriaRam())
    bench = dict(E.get("banco", {}))
    lg.iniciar(bench)
    lecturas = [v["nombre"] for v in P["variables"] if v["dir"] == "lectura"]

    def entradas(S):
        for n in lecturas:
            S[n] = bench.get(n)

    traza = []
    for vuelta in E["vueltas"]:
        for ev in vuelta.get("eventos", []):
            lg.cola.append(ev)
        bench.update(vuelta.get("banco", {}))
        lg.tick(entradas)
        traza.append({"st": dict(lg.st), "S": dict(lg.S)})
    json.dump(traza, sys.stdout)


# ---------------------------------------------------------------------
# LA MEMORIA: save y load de la logica. Un fichero JSON al lado del
# programa, que sobrevive a apagar la placa (como la NVS de un ESP32).
# Se escribe entero en otro fichero y se cambia de nombre: si se va la
# luz a medias, queda el de antes, nunca uno roto.
# ---------------------------------------------------------------------
class MemoriaFichero:
    def __init__(self, ruta):
        self.ruta = ruta
        self.m = {}
        try:
            with open(ruta, encoding="utf-8") as f:
                self.m = json.load(f)
        except (OSError, ValueError):
            self.m = {}

    def leer(self):
        return self.m

    def escribir(self, m):
        self.m = dict(m)
        tmp = self.ruta + ".tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.m, f)
            os.replace(tmp, self.ruta)
        except OSError as e:
            print("No se pudo guardar la memoria (%s): %s" % (self.ruta, e))


# ---------------------------------------------------------------------
# LOS PINES: entradas, salidas y botones de navegacion, con
# python-periphery (el /dev/gpiochip del kernel: vale igual en Raspberry,
# Jetson y Orange Pi). Los numeros son los del chip (BCM en la Raspberry).
# ---------------------------------------------------------------------
class Pines:
    def __init__(self, cfg, sin_placa=False):
        self.cfg = cfg or {}
        self.sin_placa = sin_placa
        self.entradas = {}
        self.salidas = {}
        self.nav = []
        self.escritas = {}

    def abrir(self):
        if self.sin_placa:
            return
        todos = ([("in", e) for e in self.cfg.get("entradas", [])] +
                 [("out", s) for s in self.cfg.get("salidas", [])] +
                 [("nav", n) for n in self.cfg.get("nav", [])])
        if not todos:
            return
        try:
            from periphery import GPIO
        except ImportError:
            print("Falta python-periphery:  pip install python-periphery")
            raise SystemExit(1)
        chip = self.cfg.get("chip", "/dev/gpiochip0")
        for modo, p in todos:
            if p.get("pin") is None:
                print("%s no tiene pin asignado en Telar: se ignora." % p["nombre"])
                continue
            bias = {"pull-up interno": "pull_up", "pull-down interno": "pull_down"}.get(p.get("pull"), "disable")
            try:
                if modo == "out":
                    g = GPIO(chip, p["pin"], "high" if p.get("bajo") else "low")
                else:
                    try:
                        g = GPIO(chip, p["pin"], "in", bias=bias)
                    except (TypeError, Exception) as e:
                        if isinstance(e, TypeError) or "bias" in str(e).lower():
                            print("Este sistema no deja poner la resistencia interna en el pin %d:" % p["pin"])
                            print("  pon una de 10k por fuera (a 3,3 V si es pull-up).")
                            g = GPIO(chip, p["pin"], "in")
                        else:
                            raise
            except Exception as e:
                print("No puedo abrir el pin %s (%s): %s" % (p["pin"], p["nombre"], e))
                print("  - es el numero del chip (BCM) y no el del conector?")
                print("  - esta ocupado por otro programa?")
                print("  - tu usuario esta en el grupo gpio?  sudo usermod -aG gpio $USER")
                print("  - en una Raspberry Pi 5 el chip es otro: mira 'gpioinfo' y cambia pines.chip en proyecto.json")
                raise SystemExit(1)
            if modo == "in":
                self.entradas[p["nombre"]] = (g, p)
            elif modo == "out":
                self.salidas[p["nombre"]] = (g, p)
            else:
                self.nav.append((g, p))

    def leer(self, S):
        """Las entradas digitales: con pull-up, cerrado es un 0 en el pin."""
        for n, (g, p) in self.entradas.items():
            nivel = g.read()
            S[n] = (not nivel) if p.get("pull") == "pull-up interno" else bool(nivel)

    def escribir(self, S):
        for n, (g, p) in self.salidas.items():
            v = bool(num(S.get(n)))
            if self.escritas.get(n) == v:
                continue
            self.escritas[n] = v
            g.write(v != bool(p.get("bajo")))

    def tecla(self):
        """El primer boton de navegacion pulsado, o None (como nav_leer)."""
        for g, p in self.nav:
            nivel = g.read()
            pulsado = (not nivel) if p.get("pull", "pull-up interno") == "pull-up interno" else bool(nivel)
            if pulsado:
                return p.get("funcion", "siguiente")
        return None

    def cerrar(self):
        for g, p in list(self.entradas.values()) + list(self.salidas.values()) + self.nav:
            try:
                g.close()
            except Exception:
                pass


# ---------------------------------------------------------------------
# EL ENLACE: esta placa es la pantalla, asi que es la que PREGUNTA. Las
# mismas tramas que un ESP32 (enlace.cpp): una pregunta cada vez, la
# siguiente cuando llega la respuesta o pasa la espera, y las ordenes que
# cambian primero. El nodo de control no nota la diferencia.
#     $CMD,rele,1*4F     lo que se manda (en decimas)
#     $TLR,123,45*7B     lo que contesta: sus medidas, en decimas
# ---------------------------------------------------------------------
def xor(cuerpo):
    x = 0
    for c in cuerpo:
        x ^= ord(c)
    return x


class Enlace:
    def __init__(self, cfg, sin_placa=False):
        self.cfg = cfg
        self.sin_placa = sin_placa
        self.puerto = None
        self.pendiente = ""
        self.valores = {n: 0.0 for n in cfg.get("medidas", [])}
        self.t_ultima = -1e9
        self.contestada = True
        self.t_pregunta = -1e9
        self.ult = {}
        self.visto = {}
        self.pend = {}
        self.turno = 0

    def abrir(self):
        if self.sin_placa:
            return
        try:
            import serial
        except ImportError:
            print("Falta pyserial:  pip install pyserial")
            raise SystemExit(1)
        try:
            self.puerto = serial.Serial(self.cfg["puerto"], self.cfg["baudios"], timeout=0)
        except Exception as e:
            print("No puedo abrir %s: %s" % (self.cfg["puerto"], e))
            print("  - existe ese puerto?  ls -l /dev/tty*")
            print("  - tu usuario esta en el grupo dialout?  sudo usermod -aG dialout $USER")
            print("  - en una Raspberry la consola ocupa el puerto: quitala con raspi-config")
            print("  - si es otro, cambia enlace.puerto en proyecto.json")
            raise SystemExit(1)

    def vivo(self, ahora):
        return (ahora - self.t_ultima) * 1000 < self.cfg.get("timeout_ms", 1000)

    def trama_valida(self, t):
        t = t.strip()
        if not t.startswith("$") or "*" not in t:
            return False
        cuerpo, _, suma = t[1:].partition("*")
        try:
            if xor(cuerpo) != int(suma[:2], 16):
                return False
        except ValueError:
            return False
        partes = cuerpo.split(",")
        if partes[0] != "TLR":
            return False
        medidas = self.cfg.get("medidas", [])
        if len(partes) - 1 != len(medidas):
            return False
        try:
            nums = [int(x) for x in partes[1:]]
        except ValueError:
            return False
        for n, d in zip(medidas, nums):
            self.valores[n] = d / 10.0
        return True

    def atender(self, ahora):
        if not self.puerto:
            return
        try:
            datos = self.puerto.read(512).decode("ascii", "ignore")
        except Exception:
            datos = ""
        if not datos:
            return
        self.pendiente += datos
        while "\n" in self.pendiente:
            linea, _, self.pendiente = self.pendiente.partition("\n")
            if linea.strip() and self.trama_valida(linea):
                self.t_ultima = ahora
                self.contestada = True
        if len(self.pendiente) > self.cfg.get("largo", 96) * 2:
            self.pendiente = ""

    def mandar(self, nombre, decimas):
        cuerpo = "CMD,%s,%d" % (nombre, decimas)
        linea = "\n\n$%s*%02X\n" % (cuerpo, xor(cuerpo))
        if self.puerto:
            try:
                self.puerto.write(linea.encode("ascii"))
            except Exception as e:
                print("El puerto del enlace fallo: %s" % e)

    def ordenar(self, S, ahora):
        ords = self.cfg.get("ordenes", [])
        for o in ords:
            if o["booleano"]:
                n = o["nombre"]
                v = bool(S.get(n))
                if v and not self.visto.get(n):
                    self.pend[n] = True
                self.visto[n] = v
        if not self.contestada and (ahora - self.t_pregunta) * 1000 < self.cfg.get("espera_ms", 100):
            return
        if (ahora - self.t_pregunta) * 1000 < self.cfg.get("minimo_ms", 40):
            return
        self.t_pregunta = ahora
        self.contestada = False
        if not ords:
            self.mandar("ping", 0)
            return
        d = {}
        for o in ords:
            n = o["nombre"]
            d[n] = (1 if S.get(n) else 0) if o["booleano"] else int(redondea(num(S.get(n)) * 10.0))
        for o in ords:
            n = o["nombre"]
            if o["booleano"] and self.pend.get(n):
                self.pend[n] = False
                self.ult[n] = 1
                self.mandar(n, 1)
                return
            if d[n] != self.ult.get(n):
                self.ult[n] = d[n]
                self.mandar(n, d[n])
                return
        o = ords[self.turno % len(ords)]
        self.turno += 1
        self.mandar(o["nombre"], d[o["nombre"]])


# ---------------------------------------------------------------------
# LOS BOTONES DE NAVEGACION: en una pantalla sin tactil hacen de dedo.
# Siguiente y anterior mueven el foco (el widget marcado sale en
# negativo) y aceptar hace lo que haria el dedo: los mismos eventos que el
# simulador y que la placa. Un deslizador, que con el dedo se arrastra,
# aqui se edita: aceptar entra, siguiente y anterior lo mueven, y aceptar
# sale.
# ---------------------------------------------------------------------
class Mando:
    def __init__(self, app):
        self.app = app
        self.antes = None
        self.t_pulsado = 0.0
        self.t_rep = 0.0

    def focables(self):
        A = self.app
        out = []
        for b in A.pantalla.pantalla()["widgets"]:
            t = b["tipo"]
            if t == "button" or (t in ("toggle", "checkbox", "slider") and A.pantalla.var(b.get("bind"))):
                V = {}
                A.pantalla.aspecto(b, V, A.lg)
                if not V.get("apagado"):
                    out.append(b)
        return out

    def widget(self, nombre):
        return next((b for b in self.app.pantalla.pantalla()["widgets"] if b["nombre"] == nombre), None)

    def mover(self, paso):
        A = self.app
        F = self.focables()
        if not F:
            A.pantalla.foco = None
            return
        nombres = [b["nombre"] for b in F]
        if A.pantalla.foco in nombres:
            i = (nombres.index(A.pantalla.foco) + paso) % len(nombres)
        else:
            i = 0 if paso > 0 else len(nombres) - 1
        A.pantalla.foco = nombres[i]

    def repite(self, b):
        return (b.get("logica") and b.get("repite")) or bool(b.get("paso") and b["paso"].get("repite"))

    def avisa_soltar(self, b):
        return bool(b.get("logica") and not b.get("destino") and b.get("suelta"))

    def pulsar(self, b):
        """pulsarBoton() del simulador."""
        A = self.app
        if b.get("destino"):
            for i, s in enumerate(A.P["pantallas"]):
                if s["nombre"] == b["destino"]:
                    A.ir_a(i)
                    return
            return
        if b.get("logica"):
            A.lg.cola.append({"tipo": "logica", "w": b["nombre"]})
            return
        if b.get("evento"):
            print("%s -> evento %s (lo atiende tu codigo; aqui no hace nada)" % (b["nombre"], b["evento"]))
            return
        v = A.pantalla.var(b.get("bind"))
        if v and v.get("dir") == "escritura" and v.get("booleano"):
            A.lg.cola.append({"tipo": "set", "n": b["bind"], "v": True, "pulso": bool(v.get("remota"))})
            return
        if b.get("paso"):
            A.lg.cola.append({"tipo": "inc", "n": b["paso"]["n"], "d": b["paso"]["d"]})

    def paso(self, tecla, ahora):
        A = self.app
        P = A.pantalla
        antes, self.antes = self.antes, tecla
        b = self.widget(P.foco) if P.foco else None
        # un deslizador en edicion: siguiente y anterior lo mueven
        if P.editando and b and b["tipo"] == "slider":
            if tecla in ("siguiente", "anterior") and tecla != antes:
                v = P.var(b["bind"])
                lo = redondea(v["min"] if v.get("min") is not None else 0)
                hi = redondea(v["max"] if v.get("max") is not None else 100)
                pasito = max(1, redondea((hi - lo) / 20.0))
                x = acota(redondea(num(A.lg.S.get(b["bind"]))) + (pasito if tecla == "siguiente" else -pasito), lo, hi)
                A.lg.cola.append({"tipo": "set", "n": b["bind"], "v": x})
            if tecla == "aceptar" and antes != "aceptar":
                P.editando = False
            return
        if tecla in ("siguiente", "anterior") and tecla != antes:
            self.mover(1 if tecla == "siguiente" else -1)
            return
        # aceptar: al pulsar, mientras se mantiene y al soltar
        if tecla == "aceptar" and antes != "aceptar":
            if not b:
                self.mover(1)
                return
            self.t_pulsado = ahora
            if b["tipo"] == "button":
                P.presionado = b["nombre"]
                if self.avisa_soltar(b) and not self.repite(b):
                    self.pulsar(b)
                if self.repite(b):
                    self.pulsar(b)
                    self.t_rep = ahora + 0.4
            return
        if tecla == "aceptar" and antes == "aceptar":
            if b and b["tipo"] == "button" and self.repite(b) and ahora >= self.t_rep:
                self.pulsar(b)
                self.t_rep = ahora + 0.1
            return
        if antes == "aceptar" and tecla != "aceptar":
            P.presionado = None
            if not b:
                return
            t = b["tipo"]
            v = P.var(b.get("bind"))
            if t == "button":
                if self.avisa_soltar(b):
                    A.lg.cola.append({"tipo": "suelta", "w": b["nombre"]})
                elif not self.repite(b):
                    self.pulsar(b)
            elif t == "toggle":
                A.lg.cola.append({"tipo": "set", "n": b["bind"], "v": not num(A.lg.S.get(b["bind"]))})
            elif t == "checkbox":
                on = num(A.lg.S.get(b["bind"]))
                A.lg.cola.append({"tipo": "set", "n": b["bind"], "v": (False if v.get("booleano") else 0) if on else (True if v.get("booleano") else 1)})
            elif t == "slider":
                P.editando = True


# ---------------------------------------------------------------------
# LA OLED: luma.oled. Con --sin-placa, un fichero pantalla.png.
# ---------------------------------------------------------------------
class Oled:
    def __init__(self, cfg, sin_placa=False, ruta_png="pantalla.png"):
        self.cfg = cfg
        self.sin_placa = sin_placa
        self.ruta_png = ruta_png
        self.dev = None
        self.ultima = None

    def abrir(self):
        if self.sin_placa:
            return
        try:
            from luma.core.interface.serial import i2c
            from luma.oled.device import ssd1306, sh1106
        except ImportError:
            print("Falta luma.oled:  pip install luma.oled")
            raise SystemExit(1)
        drv = {"ssd1306": ssd1306, "sh1106": sh1106}.get(self.cfg.get("driver"))
        if not drv:
            print("Esta pantalla (%s) no la sabe mover todavia el motor de Linux." % self.cfg.get("controlador"))
            raise SystemExit(1)
        bus = int(self.cfg.get("i2c_bus", 1))
        dirc = int(str(self.cfg.get("direccion", "0x3C")), 16)
        try:
            serie = i2c(port=bus, address=dirc)
            self.dev = drv(serie, width=self.cfg.get("ancho_panel", 128), height=self.cfg.get("alto_panel", 64),
                           rotate=int(self.cfg.get("rotacion", 0)) % 4)
        except Exception as e:
            print("No encuentro la pantalla en /dev/i2c-%d, direccion %s: %s" % (bus, self.cfg.get("direccion"), e))
            print("  - esta encendido el I2C?  sudo raspi-config  ->  Interface Options  ->  I2C")
            print("  - se ve la pantalla?  i2cdetect -y %d   (tiene que salir 3c o 3d)" % bus)
            print("  - si sale en 3d, cambia pantalla.direccion a \"0x3D\" en proyecto.json")
            print("  - si tu placa usa otro bus, cambia pantalla.i2c_bus (i2cdetect -l los lista)")
            raise SystemExit(1)

    def mostrar(self, img):
        datos = img.tobytes()
        if datos == self.ultima:
            return
        self.ultima = datos
        if self.dev:
            self.dev.display(img)
        elif self.sin_placa:
            img.convert("L").resize((img.width * 4, img.height * 4), 0).save(self.ruta_png)

    def apagar(self):
        if self.dev:
            try:
                self.dev.cleanup()
            except Exception:
                pass


# ---------------------------------------------------------------------
# TODO JUNTO
# ---------------------------------------------------------------------
class App:
    def __init__(self, P, carpeta, sin_placa=False, K=4):
        self.P = P
        self.carpeta = carpeta
        self.sin_placa = sin_placa
        self.lg = Logica(P["logica"], P["variables"], MemoriaFichero(os.path.join(carpeta, "memoria.json")))
        self.lg.eco = lambda s: print(s)
        self.pantalla = Pantalla(P, os.path.join(carpeta, "fuentes"), K)
        self.pines = Pines(P.get("pines"), sin_placa)
        self.enlace = Enlace(P["enlace"], sin_placa) if P.get("enlace") else None
        self.oled = Oled(P["pantalla"], sin_placa, os.path.join(carpeta, "pantalla.png"))
        self.mando = Mando(self)
        self.teclas = []              # --sin-placa: lo que se escribe en la consola
        self.remotas = [v["nombre"] for v in P["variables"] if v["dir"] == "lectura" and v.get("remota")]

    def ir_a(self, i):
        self.pantalla.i = i
        self.pantalla.foco = None
        self.pantalla.editando = False
        self.pantalla.presionado = None
        print("-> pantalla %s" % self.P["pantallas"][i]["nombre"])
        self.marcar_primero()

    def aligerar(self, dt):
        """En una placa lenta (una Pi Zero) pintar a 4x puede tardar mas que
        la vuelta de la logica. Si pasa, se pinta a 2x: los bordes salen un
        poco menos suaves, y la logica y los botones no se retrasan."""
        if dt > 0.12 and self.pantalla.K > 2:
            p = self.pantalla
            nueva = Pantalla(self.P, os.path.join(self.carpeta, "fuentes"), 2)
            for k in ("i", "foco", "editando", "presionado", "enlace_caido", "t", "tasas"):
                setattr(nueva, k, getattr(p, k))
            self.pantalla = nueva
            print("Esta placa tarda %.0f ms en pintar: paso a dibujar a 2x." % (dt * 1000))

    def marcar_primero(self):
        """Como el grupo de LVGL: con botones de navegacion, el primer
        control de la pantalla sale ya marcado."""
        if (self.pines.cfg or {}).get("nav") or self.sin_placa:
            self.mando.mover(1)

    def entradas(self, S):
        self.pines.leer(S)
        if self.enlace:
            for n in self.remotas:
                S[n] = self.enlace.valores.get(n, 0.0)

    def actuar(self, S):
        self.pines.escribir(S)
        if self.enlace:
            self.enlace.ordenar(S, time.monotonic())

    def firma(self):
        """Lo que decide si hay que volver a pintar."""
        return json.dumps([self.lg.S, self.lg.st, self.pantalla.i, self.pantalla.foco,
                           self.pantalla.editando, self.pantalla.presionado, self.pantalla.enlace_caido], sort_keys=True, default=str)

    def consola(self):
        """--sin-placa: n (siguiente), p (anterior), a (aceptar), q (salir)."""
        import threading

        def leer():
            while True:
                try:
                    linea = input()
                except EOFError:
                    return
                for c in linea.strip().lower() or "a":
                    self.teclas.append({"n": "siguiente", "p": "anterior", "a": "aceptar", "q": "salir"}.get(c))
        threading.Thread(target=leer, daemon=True).start()
        print("Sin placa: escribe n (siguiente), p (anterior) o a (aceptar) y pulsa Intro. q para salir.")
        print("Lo que se veria en la OLED se guarda en pantalla.png cada vez que cambia.")

    def correr(self):
        self.pines.abrir()
        if self.enlace:
            self.enlace.abrir()
        self.oled.abrir()
        if self.sin_placa:
            self.consola()
        self.lg.iniciar()
        self.marcar_primero()
        print("%s: pantalla en %s" % (self.P.get("proyecto"), self.P.get("placa")))
        siguiente = time.monotonic()
        t_pinta = 0.0
        firma = None
        hay_giro = any(b["tipo"] == "spinner" for s in self.P["pantallas"] for b in s["widgets"])
        refresco = max(0.05, self.P["pantalla"].get("refresco_ms", 100) / 1000.0)
        tecla_sim = None
        try:
            while True:
                ahora = time.monotonic()
                if self.enlace:
                    self.enlace.atender(ahora)
                    self.pantalla.enlace_caido = bool(self.remotas) and not self.enlace.vivo(ahora)
                # la tecla de esta vuelta
                if self.sin_placa:
                    if tecla_sim is not None:
                        tecla, tecla_sim = None, None      # una vuelta pulsada y se suelta
                    elif self.teclas:
                        tecla = tecla_sim = self.teclas.pop(0)
                        if tecla == "salir":
                            break
                    else:
                        tecla = None
                else:
                    tecla = self.pines.tecla()
                self.mando.paso(tecla, ahora)
                self.lg.tick(self.entradas, self.actuar)
                self.pantalla.t = self.lg.t
                if ahora - t_pinta >= refresco:
                    f = self.firma()
                    if f != firma or hay_giro:
                        firma = f
                        t0 = time.monotonic()
                        self.oled.mostrar(self.pantalla.dibujar(self.lg.S, self.lg))
                        self.aligerar(time.monotonic() - t0)
                    t_pinta = ahora
                siguiente += PERIODO
                espera = siguiente - time.monotonic()
                if espera > 0:
                    time.sleep(espera)
                else:
                    siguiente = time.monotonic()     # si se atrasa, no intenta recuperar
        except KeyboardInterrupt:
            pass
        finally:
            self.pines.cerrar()
            self.oled.apagar()


def cargar(carpeta):
    ruta = os.path.join(carpeta, "proyecto.json")
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except OSError:
        print("No encuentro %s. Tiene que estar al lado de este programa." % ruta)
        raise SystemExit(1)


def foto(args):
    """--foto salida.png [--valores v.json] [--pantalla N]: una imagen de
    una pantalla con unos valores, sin placa. Para comparar con el lienzo."""
    carpeta = AQUI
    P = cargar(carpeta)
    salida = args[0]
    valores = {}
    i = 0
    escala = 4
    k = 1
    while k < len(args):
        if args[k] == "--valores":
            with open(args[k + 1], encoding="utf-8") as f:
                valores = json.load(f)
            k += 2
        elif args[k] == "--pantalla":
            i = int(args[k + 1])
            k += 2
        elif args[k] == "--escala":
            escala = int(args[k + 1])
            k += 2
        else:
            k += 1
    lg = Logica(P["logica"], P["variables"], MemoriaRam())
    lg.iniciar()
    lg.S.update(valores.get("S", {}))
    lg.st.update(valores.get("st", {}))
    pa = Pantalla(P, os.path.join(carpeta, "fuentes"))
    pa.i = i
    pa.foco = valores.get("foco")
    pa.enlace_caido = bool(valores.get("enlace_caido"))
    img = pa.dibujar(lg.S, lg)
    img.convert("L").resize((img.width * escala, img.height * escala), 0).save(salida)
    print("guardada %s (%dx%d)" % (salida, img.width, img.height))


def main():
    a = sys.argv[1:]
    if len(a) > 1 and a[0] == "--banco":
        banco(a[1])
        return
    if len(a) > 1 and a[0] == "--foto":
        foto(a[1:])
        return
    sin_placa = "--sin-placa" in a
    App(cargar(AQUI), AQUI, sin_placa).correr()


if __name__ == "__main__":
    main()
`;
