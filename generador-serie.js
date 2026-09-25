/* =====================================================================
 * Telar Studio — PANTALLAS POR PUERTO SERIE
 *
 * Una Nextion (o una TJC, que es la misma) no se dibuja desde el ESP32:
 * se dibuja en su propio editor y lleva su propio procesador. El ESP32
 * solo le dice "pon este texto aqui" y ella le cuenta "me han tocado
 * aqui". Por eso esta pantalla no lleva LVGL, ni puerto, ni fuentes:
 * lleva una capa serie y una HOJA con lo que hay que crear en el editor.
 *
 * Lo mismo vale para cualquier otra cosa al otro lado de un cable serie
 * (otra pantalla con su micro, un segundo Arduino, un programa en el PC)
 * con el protocolo de lineas de texto: SET/PAGE hacia alla, EVT hacia aca.
 *
 * El contrato con el resto del programa es el de siempre: la tarea de
 * control no se entera. Los toques encolan los mismos eventos que un
 * boton de LVGL, y lo que se muestra sale de la misma instantanea.
 * ===================================================================== */

/* El nombre de cada pagina y cada componente en la pantalla. La Nextion
   admite 14 caracteres como mucho, y los componentes tienen que ser
   unicos en todo el proyecto: los toques llegan por nombre, sin pagina. */
function nombresSerie(){
  const usados = new Set(), pag = new Map(), obj = new Map();
  const unico = base => {
    let n = (base || 'x').slice(0, 14), k = 2;
    while (usados.has(n)) { const suf = '_' + k++; n = base.slice(0, 14 - suf.length) + suf; }
    usados.add(n); return n;
  };
  E.pantallas.forEach(s => pag.set(s.nombre, unico(cid(s.nombre))));
  for (const s of E.pantallas) for (const w of s.widgets) obj.set(w, unico(cid(w.nombre)));
  return { pag, obj };
}

/* Que componente es cada widget en la Nextion */
const TIPO_NEXTION = {
  label: 'Text', value: 'Text', timer: 'Text', 'state-strip': 'Text',
  bar: 'Progress bar', button: 'Button', toggle: 'Dual-state button', checkbox: 'Dual-state button',
  led: 'Text', panel: 'Text', line: 'Text',
  /* los componentes industriales, en lo que la Nextion sabe hacer */
  tarjeta: 'Text', lectura: 'Text', dato: 'Text', pildora: 'Text', pasos: 'Text',
  'barra-consigna': 'Progress bar', aguja: 'Text', tiempo: 'Text'
};
/* Y cada uno se trata como la pieza sencilla que mas se le parece */
const COMO_SERIE = { tarjeta: 'panel', lectura: 'value', dato: 'value', pildora: 'state-strip', pasos: 'state-strip',
                     'barra-consigna': 'bar', aguja: 'value', tiempo: 'timer' };

/* Los iconos de LVGL no existen en la Nextion: su fuente solo lleva las
   letras que le pidas. Se cambian por texto que cualquier fuente tiene. */
const ICONO_TEXTO = {
  LV_SYMBOL_OK:'OK', LV_SYMBOL_CLOSE:'X', LV_SYMBOL_POWER:'ON/OFF', LV_SYMBOL_PLAY:'>',
  LV_SYMBOL_PAUSE:'||', LV_SYMBOL_STOP:'STOP', LV_SYMBOL_REFRESH:'RESET', LV_SYMBOL_SETTINGS:'AJUSTES',
  LV_SYMBOL_HOME:'INICIO', LV_SYMBOL_WARNING:'!', LV_SYMBOL_UP:'^', LV_SYMBOL_DOWN:'v',
  LV_SYMBOL_LEFT:'<', LV_SYMBOL_RIGHT:'>', LV_SYMBOL_PLUS:'+', LV_SYMBOL_MINUS:'-',
  LV_SYMBOL_SAVE:'GUARDAR', LV_SYMBOL_TRASH:'BORRAR', LV_SYMBOL_EDIT:'EDITAR', LV_SYMBOL_BELL:'!',
  LV_SYMBOL_CHARGE:'CARGA', LV_SYMBOL_WIFI:'WIFI', LV_SYMBOL_USB:'USB', LV_SYMBOL_SD_CARD:'SD', LV_SYMBOL_EYE_OPEN:'VER'
};
/* El rotulo de un boton en la Nextion: el icono como texto, y el texto */
const rotuloSerie = (w, texto = w.texto) => {
  const ic = w.icono && ICONO_TEXTO[w.icono] ? ICONO_TEXTO[w.icono] : '';
  const t = quitarTildes(String(texto ?? ''));
  return ic && t ? ic + ' ' + t : (ic || t);
};

/* De #rrggbb a los 16 bits que usa la Nextion, en decimal */
const nx565 = hex => {
  const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16) || 0;
  return (((n >> 16) & 0xF8) << 8) | (((n >> 8) & 0xFC) << 3) | ((n & 0xFF) >> 3);
};
const hex24 = hex => '0x' + String(hex).replace('#', '').slice(0, 6).toLowerCase();

/* Lo que hace un toque: exactamente lo mismo que el callback de LVGL.
   Devuelve null si el widget no hace nada al tocarlo. */
function accionSerie(w, N){
  const v = variables().find(x => x.nombre === w.bind);
  if (w.tipo === 'button'){
    if (w.destino){
      const i = E.pantallas.findIndex(s => s.nombre === w.destino);
      return i >= 0 ? `nx_ir(${i});` : null;
    }
    if (enLogica(w))     return `event_send(EV_L_${MAY(w.nombre)}, 0);`;
    if (w.evento)        return `event_send(${MAY(w.evento)}, 0);`;
    if (v && v.booleano) return `event_send(EV_SET_${MAY(v.nombre)}, 1);`;
    const op = ordenPaso(w);
    if (op) return `event_send(EV_INC_${MAY(op.v.nombre)}, ${Math.round(op.delta * 10)});   /* ${op.delta > 0 ? '+' : ''}${op.delta} */`;
    return null;
  }
  /* El interruptor de la Nextion cambia solo al tocarlo. Aqui se pide el
     valor contrario al que tiene la instantanea, y se olvida lo enviado
     para que el siguiente refresco le devuelva el valor de verdad, lo
     haya aceptado la tarea de control o no. */
  if (w.tipo === 'toggle' && v)
    return `{ snapshot_t s; snapshot_read(&s); event_send(EV_SET_${MAY(v.nombre)}, s.${cid(v.nombre)} ? 0 : 1); u_${N.obj.get(w)}_val = INT32_MIN; }`;
  return null;
}

/* Si al mantenerlo pulsado repite: igual que en LVGL, el primer paso al
   tocar y luego cada 100 ms pasados 400 ms. */
const repiteSerie = w => w.tipo === 'button' && !w.destino
  && ((enLogica(w) && repiteLogica(w)) || !!(ordenPaso(w) && ordenPaso(w).repite));

/* Todo lo que la pantalla tiene que mostrar, por pagina, con su C */
function componentesSerie(){
  const N = nombresSerie();
  return E.pantallas.map((s, ip) => ({
    pagina: s, ip, nombre: N.pag.get(s.nombre),
    comps: s.widgets.filter(w => TIPO_NEXTION[w.tipo]).map(w => ({
      w, obj: N.obj.get(w), tipo: TIPO_NEXTION[w.tipo],
      v: variables().find(x => x.nombre === w.bind),
      accion: accionSerie(w, N), repite: repiteSerie(w),
      /* on release / hold: tambien avisa al soltar */
      suelta: w.tipo === 'button' && !w.destino && botonesSuelta().includes(w.nombre)
    }))
  }));
}

/* El aspecto por estado (la seccion looks de la logica) de un widget:
   una expresion en C que da su color, o null si la logica no lo toca. */
function aspectoSerie(w){
  const out = { color: null, texto: null, apagado: null };
  for (const b of bloquesLogica()){
    const filas = b.looks && b.looks[w.nombre];
    if (!filas) continue;
    const S = est(w);
    const colorDiseno = ['label', 'value', 'timer'].includes(w.tipo) ? S.texto : S.acento;
    const textoDiseno = w.tipo === 'button' ? (w.texto || '') : (w.texto || 'Texto');
    const casos = Object.entries(filas);
    if (casos.some(([, a]) => a.color !== undefined)){
      const col = c => hex24(LOGICA.COLORS[c] || c);
      out.color = `(${casos.filter(([, a]) => a.color !== undefined)
        .map(([k, a]) => `s->${b.campo} == ${b.ST(k.replace(/^in\s+/, ''))} ? ${col(a.color)} : `).join('')}${hex24(colorDiseno)})`;
    }
    /* apagado: una condicion C que es verdad en los estados con enabled: no */
    const noes = casos.filter(([, a]) => LOGICA.habilitadoDe(a) === false);
    if (noes.length && LOGICA.APAGABLES.includes(w.tipo))
      out.apagado = '(' + noes.map(([k]) => `s->${b.campo} == ${b.ST(k.replace(/^in\s+/, ''))}`).join(' || ') + ')';
    if (casos.some(([, a]) => a.text !== undefined) && ['button', 'label'].includes(w.tipo)){
      out.texto = `(${casos.filter(([, a]) => a.text !== undefined)
        .map(([k, a]) => `s->${b.campo} == ${b.ST(k.replace(/^in\s+/, ''))} ? "${txtC(w.tipo === 'button' ? rotuloSerie(w, a.text) : String(a.text))}" : `).join('')}"${txtC(w.tipo === 'button' ? rotuloSerie(w, textoDiseno) : textoDiseno)}")`;
    }
  }
  return out;
}

/* ---------------------------------------------------------------------
 * ui.h
 * ------------------------------------------------------------------- */
function genUiSerieH(){
  return cabecera('ui.h — la pantalla por puerto serie') +
`#ifndef TELAR_UI_H
#define TELAR_UI_H

#include "../../state.h"

void ui_build(void);   /* abre el puerto, calla las respuestas y va a la primera pagina */
void ui_tick(void);    /* atiende los toques y refresca; llamarla a menudo desde loop() */

#endif /* TELAR_UI_H */
`;
}

/* ---------------------------------------------------------------------
 * ui.cpp
 * ------------------------------------------------------------------- */
function genUiSerieCpp(){
  const P = placa(), SE = P.serie || {};
  const nextion = SE.protocolo !== 'lineas';
  const paginas = componentesSerie();
  const todos = paginas.flatMap(p => p.comps);
  const estados = estadosProyecto();

  /* Lo que cambia con el tiempo lleva una copia de lo ultimo enviado:
     se manda solo lo que cambia. A 10 refrescos por segundo y 9600
     baudios, mandarlo todo siempre llenaria el cable. */
  const caches = [], apagados = [];
  const cacheTxt = c => { caches.push(`static char u_${c.obj}_txt[24];`); return `u_${c.obj}_txt`; };
  const cacheNum = (c, a) => { caches.push(`static int32_t u_${c.obj}_${a} = INT32_MIN;`); return `u_${c.obj}_${a}`; };

  const refrescoDe = c => {
    const { w, v, obj } = c, id = obj, L = [];
    const asp = aspectoSerie(w);
    switch (COMO_SERIE[w.tipo] || w.tipo){
    case 'value':
      if (!v) break;
      cacheTxt(c);
      L.push(v.booleano
        ? `    nx_txt("${id}", u_${id}_txt, s->${cid(v.nombre)} ? "SI" : "NO");`
        : `    snprintf(buf, sizeof(buf), "%.${w.decimales ?? 1}f", s->${cid(v.nombre)});\n`
          + (E.tema.coma ? `    for (char *p = buf; *p; p++) if (*p == '.') *p = ',';\n` : '')
          + `    nx_txt("${id}", u_${id}_txt, buf);`);
      break;
    case 'timer':
      if (!v) break;
      cacheTxt(c);
      L.push(`    { uint32_t seg = (uint32_t)(s->${cid(v.nombre)} < 0 ? 0 : s->${cid(v.nombre)});
      snprintf(buf, sizeof(buf), "%02u:%02u", (unsigned)(seg / 60), (unsigned)(seg % 60));
      nx_txt("${id}", u_${id}_txt, buf); }`);
      break;
    case 'state-strip':
      cacheTxt(c);
      L.push(`    nx_txt("${id}", u_${id}_txt, (int)s->st < ${estados.length} ? NOMBRE_ESTADO[(int)s->st] : "?");`);
      break;
    case 'bar':
      if (!v) break;
      cacheNum(c, 'val');
      /* La barra de la Nextion va de 0 a 100: se escala desde el rango de la variable */
      L.push(`    { float f = (s->${cid(v.nombre)} - (${flt(v.min ?? 0)})) / (${flt((v.max ?? 100) - (v.min ?? 0))});
      if (f < 0.0f) f = 0.0f; if (f > 1.0f) f = 1.0f;
      nx_num("${id}", "val", &u_${id}_val, (int32_t)(f * 100.0f + 0.5f)); }`);
      break;
    case 'toggle':
    case 'checkbox':
      if (!v) break;
      cacheNum(c, 'val');
      L.push(`    nx_num("${id}", "val", &u_${id}_val, s->${cid(v.nombre)} ? 1 : 0);`);
      break;
    case 'led': {
      if (!v) break;
      cacheNum(c, 'bco');
      const S = est(w);
      L.push(`    nx_color("${id}", "bco", &u_${id}_bco, s->${cid(v.nombre)} ? ${asp.color || hex24(S.acento)} : ${hex24(S.sup)});`);
      return L.join('\n');          /* el color ya lo lleva: no hay aspecto aparte */
    }
    }
    /* el aspecto por estado, si la logica lo pide */
    if (asp.color){
      const attr = ['label', 'value', 'timer'].includes(w.tipo) ? 'pco' : w.tipo === 'bar' ? 'pco' : 'bco';
      cacheNum(c, attr);
      L.push(`    nx_color("${id}", "${attr}", &u_${id}_${attr}, ${asp.color});`);
    }
    if (asp.texto){
      if (!caches.includes(`static char u_${id}_txt[24];`)) cacheTxt(c);
      L.push(`    nx_txt("${id}", u_${id}_txt, ${asp.texto});`);
    }
    /* apagado: el texto en tenue y los toques, ignorados (nx_toque) */
    if (asp.apagado){
      const S = est(w);
      caches.push(`static int32_t u_${id}_pco = INT32_MIN;`);
      apagados.push(id);
      L.push(`    apagado_${id} = ${asp.apagado};`);
      /* un boton lleva el color de texto de su clase (marcha, paro...); se atenua hacia su fondo */
      const tx = w.tipo === 'button' ? colorBoton(w).texto : (S.texto || E.tema.texto);
      const bajo = w.tipo === 'button' ? colorBoton(w).fondo : (S.sup || E.tema.superficie);
      L.push(`    nx_color("${id}", "pco", &u_${id}_pco, apagado_${id} ? ${hex24(mezclaColor(bajo, tx, 0.4))} : ${hex24(tx)});`);
    }
    return L.join('\n');
  };

  const refrescos = paginas.map(p => {
    const cuerpo = p.comps.map(refrescoDe).filter(Boolean).join('\n');
    return `static void refrescar_${cid(p.pagina.nombre)}(const snapshot_t *s)
{
    char buf[24]; (void)buf; (void)s;
${cuerpo || '    /* esta pagina no tiene nada que cambie */'}
}`;
  }).join('\n\n');

  const interactivos = todos.filter(c => c.accion);
  const conRepeticion = interactivos.filter(c => c.repite);
  const conSuelta = interactivos.filter(c => c.suelta);

  return cabecera('ui.cpp — la pantalla por puerto serie',
`${nextion
  ? `Protocolo Nextion: cada orden es texto terminado en tres bytes 0xFF.
La pantalla la dibujas tu en el Nextion Editor siguiendo NEXTION.txt;
aqui solo se cambian textos, valores y colores, y se reciben los toques.`
  : `Protocolo de lineas: SET/PAGE hacia la pantalla, EVT/DOWN/UP de vuelta.
Esta escrito entero en el LEEME, para que el otro lado lo copie.`}

Regla de oro, la misma que con LVGL: un toque solo encola un evento.
Quien decide es la tarea de control.`) +
`#include "ui.h"
#include <Arduino.h>
#include <stdio.h>
#include <string.h>

#define PROTO_NEXTION   ${nextion ? 1 : 0}
#define PANTALLA_TX     ${SE.tx ?? -1}      /* va al RX de la pantalla */
#define PANTALLA_RX     ${SE.rx ?? -1}      /* viene del TX de la pantalla */
#define PANTALLA_BAUD   ${SE.baudios || 9600}
#define REFRESCO_MS     ${E.refresco_ms ?? 100}

/* Serial1: la consola va por el 0 y el enlace con otro nodo, si lo hay,
   por el 2. Los pines se eligen aqui: el ESP32 los remapea. */
static HardwareSerial &PANT = Serial1;

/* Los nombres de los estados, para la tira de estado */
static const char *NOMBRE_ESTADO[] = { ${estados.map(e => `"${txtC(e)}"`).join(', ')} };
static const char *PAGINA[] = { ${paginas.map(p => `"${p.nombre}"`).join(', ')} };
static int pagina = 0;

/* ------------------------------------------------------------------
 * Mandar
 * ------------------------------------------------------------------ */
static void nx_fin(void)
{
#if PROTO_NEXTION
    PANT.write(0xFF); PANT.write(0xFF); PANT.write(0xFF);
#else
    PANT.write('\\n');
#endif
}

static void nx_orden(const char *txt) { PANT.print(txt); nx_fin(); }

/* Un texto, solo si ha cambiado. Las comillas se cambian por apostrofos:
   dentro de txt="..." una comilla cerraria la cadena antes de tiempo. */
static void nx_txt(const char *obj, char *ultimo, const char *txt)
{
    if (strncmp(ultimo, txt, 23) == 0) return;
    strncpy(ultimo, txt, 23); ultimo[23] = 0;
#if PROTO_NEXTION
    PANT.print(obj); PANT.print(".txt=\\"");
    for (const char *c = txt; *c; c++) PANT.write(*c == '"' ? '\\'' : *c);
    PANT.print("\\"");
#else
    PANT.print("SET "); PANT.print(obj); PANT.print(".txt "); PANT.print(txt);
#endif
    nx_fin();
}

/* Un numero, solo si ha cambiado */
static void nx_num(const char *obj, const char *attr, int32_t *ultimo, int32_t v)
{
    if (*ultimo == v) return;
    *ultimo = v;
#if PROTO_NEXTION
    PANT.print(obj); PANT.print('.'); PANT.print(attr); PANT.print('='); PANT.print(v);
#else
    PANT.print("SET "); PANT.print(obj); PANT.print('.'); PANT.print(attr); PANT.print(' '); PANT.print(v);
#endif
    nx_fin();
}

/* Un color. Se guarda en 24 bits; la Nextion lo quiere en 16 (RGB565, en
   decimal) y el protocolo de lineas como #rrggbb, que se lee mejor. */
static void nx_color(const char *obj, const char *attr, int32_t *ultimo, uint32_t rgb)
{
    if (*ultimo == (int32_t)rgb) return;
    *ultimo = (int32_t)rgb;
#if PROTO_NEXTION
    uint32_t c = (((rgb >> 16) & 0xF8) << 8) | (((rgb >> 8) & 0xFC) << 3) | ((rgb & 0xFF) >> 3);
    PANT.print(obj); PANT.print('.'); PANT.print(attr); PANT.print('='); PANT.print(c);
#else
    char h[8]; snprintf(h, sizeof(h), "#%06lx", (unsigned long)(rgb & 0xFFFFFF));
    PANT.print("SET "); PANT.print(obj); PANT.print('.'); PANT.print(attr); PANT.print(' '); PANT.print(h);
#endif
    nx_fin();
}

/* ------------------------------------------------------------------
 * Lo ultimo enviado, componente a componente
 * ------------------------------------------------------------------ */
@@CACHES@@
@@APAGADOS@@

/* Al cambiar de pagina la Nextion vuelve a poner cada componente como
   esta en su editor: todo lo enviado se olvida y se manda otra vez. */
static void nx_olvidar(void)
{
@@OLVIDAR@@
}

static void nx_ir(int p)
{
    if (p < 0 || p >= ${paginas.length}) return;
    pagina = p;
#if PROTO_NEXTION
    PANT.print("page "); PANT.print(PAGINA[p]);
#else
    PANT.print("PAGE "); PANT.print(PAGINA[p]);
#endif
    nx_fin();
    nx_olvidar();
}

/* ------------------------------------------------------------------
 * Refrescar: solo la pagina que se ve
 * ------------------------------------------------------------------ */
${refrescos}

static void ui_refresh(void)
{
    snapshot_t s;
    snapshot_read(&s);           /* copia bajo mutex; despues ya es nuestra */
    switch (pagina) {
${paginas.map(p => `    case ${p.ip}: refrescar_${cid(p.pagina.nombre)}(&s); break;`).join('\n')}
    }
}

/* ------------------------------------------------------------------
 * Los toques
 * ------------------------------------------------------------------ */
static uint32_t pronto = 0;          /* refresco extra poco despues de tocar */
${conRepeticion.length ? `static const char *mantenido = NULL;  /* boton que repite mientras se mantiene */
static uint32_t siguiente_rep = 0, inicio_rep = 0;
` : ''}
/* Lo que hace cada componente al tocarlo: lo mismo que su callback en LVGL */
static bool nx_accion(const char *obj)
{
${interactivos.map(c => `    if (strcmp(obj, "${c.obj}") == 0) { ${c.accion} return true; }`).join('\n') || '    (void)obj;'}
    return false;
}

static void nx_toque(const char *obj, bool suelta)
{
    /* enabled: no en looks: el toque se ignora, antes de empezar a repetir.
       Soltar si pasa siempre, para no dejar una repeticion colgada. */
    if (!suelta && nx_apagado(obj)) return;
${conSuelta.length ? `    /* on release / hold: soltar es un evento de la logica */
    if (suelta) {
${conSuelta.map(c => `        if (strcmp(obj, "${c.obj}") == 0) { event_send(EV_S_${MAY(c.w.nombre)}, 0); pronto = millis() + 70; }`).join('\n')}
    }
` : ''}
${conRepeticion.length ? `    /* los que repiten: al tocar, el primer paso y a contar; al soltar, se para */
    static const char *REPITEN[] = { ${conRepeticion.map(c => `"${c.obj}"`).join(', ')} };
    for (size_t i = 0; i < sizeof(REPITEN) / sizeof(REPITEN[0]); i++) {
        if (strcmp(obj, REPITEN[i]) != 0) continue;
        if (suelta) { mantenido = NULL; return; }
        mantenido = REPITEN[i];
        inicio_rep = millis(); siguiente_rep = inicio_rep + 400;
        break;
    }
` : ''}    if (suelta) return;
    if (nx_accion(obj)) pronto = millis() + 70;
}

/* Una trama completa ha llegado */
static void nx_trama(char *t, size_t n)
{
    if (n == 0) return;
#if PROTO_NEXTION
    /* "#nombre" al tocar, "!nombre" al soltar (solo los que repiten).
       Todo lo demas —0x65 de "Send Component ID", 0x88 al arrancar,
       codigos de error— se ignora: con bkcmd=0 casi no llega nada. */
    if (t[0] == '#') nx_toque(t + 1, false);
    else if (t[0] == '!') nx_toque(t + 1, true);
#else
    if      (strncmp(t, "EVT ", 4) == 0)  nx_toque(t + 4, false);
    else if (strncmp(t, "DOWN ", 5) == 0) nx_toque(t + 5, false);
    else if (strncmp(t, "UP ", 3) == 0)   nx_toque(t + 3, true);
#endif
}

static void nx_leer(void)
{
    static char t[40];
    static size_t n = 0;
    static int ff = 0;
    while (PANT.available() > 0) {
        char c = (char)PANT.read();
#if PROTO_NEXTION
        if ((uint8_t)c == 0xFF) {
            if (++ff == 3) { t[n] = 0; nx_trama(t, n); n = 0; ff = 0; }
            continue;
        }
        ff = 0;
#else
        if (c == '\\r') continue;
        if (c == '\\n') { t[n] = 0; nx_trama(t, n); n = 0; continue; }
#endif
        if (n < sizeof(t) - 1) t[n++] = c;
        else n = 0;                         /* basura demasiado larga: se tira */
    }
}

/* ------------------------------------------------------------------
 * Publico
 * ------------------------------------------------------------------ */
void ui_build(void)
{
    PANT.begin(PANTALLA_BAUD, SERIAL_8N1, PANTALLA_RX, PANTALLA_TX);
    /* La Nextion tarda en arrancar mas que el ESP32: lo que se le mande
       antes se pierde sin que nadie se entere. */
    delay(600);
#if PROTO_NEXTION
    nx_orden("");            /* limpia lo que hubiera a medias en su bufer */
    nx_orden("bkcmd=0");     /* que no conteste a cada orden: solo toques */
#endif
    nx_ir(0);
}

void ui_tick(void)
{
    static uint32_t ultimo = 0;
    nx_leer();
${conRepeticion.length ? `
    /* la repeticion de un boton mantenido, con un tope por si el "soltar"
       se pierde por el camino */
    if (mantenido) {
        uint32_t ahora = millis();
        if (ahora - inicio_rep > 15000 || nx_apagado(mantenido)) mantenido = NULL;   /* o si se apago mientras */
        else if ((int32_t)(ahora - siguiente_rep) >= 0) {
            nx_accion(mantenido);
            siguiente_rep = ahora + 100;
            pronto = ahora + 70;
        }
    }
` : ''}
    /* El refresco extra tras un toque solo se da por hecho cuando le toca
       a EL. Si el periodico cae en el mismo instante que el toque, llega
       antes de que la tarea de control haya visto el evento y pinta lo de
       antes: borrar ahi el extra dejaba la pantalla un periodo entero sin
       reaccionar. */
    uint32_t ahora = millis();
    bool toca_periodo = ahora - ultimo >= REFRESCO_MS;
    bool toca_pronto  = pronto && (int32_t)(ahora - pronto) >= 0;
    if (toca_periodo || toca_pronto) {
        ultimo = ahora;
        if (toca_pronto) pronto = 0;
        ui_refresh();
    }
}
`.replace('@@CACHES@@', [...new Set(caches)].join('\n') || '/* nada que cambie */')
 .replace('@@APAGADOS@@', apagados.length
    ? `/* Los que la logica apaga (enabled: no en looks): sus toques se ignoran */
${apagados.map(id => `static bool apagado_${id} = false;`).join('\n')}
static bool nx_apagado(const char *obj)
{
${apagados.map(id => `    if (strcmp(obj, "${id}") == 0) return apagado_${id};`).join('\n')}
    return false;
}
` : `static bool nx_apagado(const char *obj) { (void)obj; return false; }
`)
 .replace('@@OLVIDAR@@', [...new Set(caches)].map(c => {
    const m = c.match(/static (char|int32_t) (\w+)/);
    return m[1] === 'char' ? `    ${m[2]}[0] = 1;   /* un texto imposible: el siguiente se manda seguro */`
                           : `    ${m[2]} = INT32_MIN;`;
  }).join('\n') || '    /* nada */');
}

/* ---------------------------------------------------------------------
 * El .ino de una pantalla serie: sin LVGL y sin puerto
 * ------------------------------------------------------------------- */
function genInoSerie(){
  const P = placa(), SE = P.serie || {};
  return cabecera(`${E.proyecto} — ${P.nombre} + ${(PANELES[SE.controlador] || {}).nombre || 'pantalla serie'}`,
`Ajustes del IDE (menu Herramientas):
${Object.entries(P.opciones_ide || {}).map(([k,v]) => `  ${k}: ${v}`).join('\n')}

La pantalla no la dibuja este ESP32: ${SE.protocolo === 'lineas'
  ? 'la dibuja lo que haya al otro lado del cable.'
  : 'se dibuja en el Nextion Editor, siguiendo NEXTION.txt.'}
Aqui no hay LVGL: no hace falta instalarla ni tocar lv_conf.h.`) +
`#include <Arduino.h>
#include "state.h"
#include "src/ui/ui.h"
${hayEnlace() ? '#include "enlace.h"\n' : ''}
void setup() {
    Serial.begin(115200);
    Serial.println("${E.proyecto}: arrancando");
${hayEnlace() ? '\n    enlace_iniciar();\n' : ''}
    /* La tarea de control arranca antes que la pantalla: cuando se
       mande el primer valor ya habra una instantanea valida. */
    control_start();
    ui_build();

    Serial.println("listo");
}

void loop() {
    /* Atender la pantalla es barato y tiene que ser frecuente: un toque
       que espera en el bufer es un boton que "no responde". */
    ui_tick();
    vTaskDelay(pdMS_TO_TICKS(5));
}
`;
}

/* ---------------------------------------------------------------------
 * NEXTION.txt — lo que hay que crear en el Nextion Editor
 *
 * Es la mitad del proyecto que Telar no puede escribir: el formato del
 * editor es cerrado. Asi que se escribe como una receta que se copia
 * campo a campo, en el mismo orden en que se hace.
 * ------------------------------------------------------------------- */
function genHojaNextion(){
  const P = placa(), SE = P.serie || {}, pan = PANELES[SE.controlador] || {};
  const paginas = componentesSerie();
  const col = (s, n) => String(s).padEnd(n).slice(0, Math.max(n, String(s).length));
  const L = [];
  L.push(`HOJA DE COMPONENTES — ${E.proyecto}`);
  L.push('='.repeat(64));
  L.push('');
  L.push(`Pantalla: ${pan.nombre || SE.controlador}   (${P.ancho} x ${P.alto}, horizontal)`);
  L.push(`Cable:    TX de la placa (GPIO${SE.tx}) -> RX de la pantalla`);
  L.push(`          RX de la placa (GPIO${SE.rx}) <- TX de la pantalla`);
  L.push(`          5 V y GND. Las masas, unidas.`);
  L.push(`Velocidad: ${SE.baudios} baudios.`);
  L.push('');
  L.push('ANTES DE NADA, EN EL NEXTION EDITOR');
  L.push('-----------------------------------');
  L.push(`1. File > New, el modelo ${SE.controlador} (o su equivalente TJC), orientacion horizontal.`);
  L.push('2. Tools > Font Generator: crea UNA fuente y anadela. Sin fuente, los');
  L.push('   componentes de texto se quedan en blanco y nada lo explica.');
  if (SE.baudios && SE.baudios !== 9600){
    L.push(`3. En la primera pagina, evento Preinitialize, escribe:  bauds=${SE.baudios}`);
    L.push('   (de fabrica van a 9600; la placa ya habla a la velocidad nueva)');
  }
  L.push('');
  L.push('Los nombres (objname) tienen que ser EXACTAMENTE estos: el ESP32 los');
  L.push('usa para escribir en cada componente. El editor pone t0, b0, j0...;');
  L.push('hay que cambiarlos en la casilla objname de cada uno.');
  L.push('');
  L.push('Los colores van en el formato de la Nextion (16 bits, en decimal): se');
  L.push('copian tal cual en bco (fondo) y pco (letra).');
  L.push('');
  L.push('En un Text que cambia, sube txt_maxl a 20. De fabrica es 10, y un');
  L.push('texto mas largo se corta sin avisar.');
  L.push('');

  const tema = E.tema;
  for (const p of paginas){
    L.push('');
    L.push(`PAGINA ${p.ip}: ${p.nombre}`);
    L.push('-'.repeat(12 + p.nombre.length));
    L.push(`  Renombra la pagina a "${p.nombre}" (casilla objname de la pagina).`);
    L.push(`  Fondo: sta = solid color, bco = ${nx565(tema.fondo)}`);
    L.push('');
    L.push(`  ${col('objname', 15)}${col('tipo', 19)}${col('x', 5)}${col('y', 5)}${col('ancho', 6)}${col('alto', 5)}`);
    L.push(`  ${'-'.repeat(15 + 19 + 5 + 5 + 6 + 5)}`);
    for (const c of p.comps){
      const w = c.w;
      L.push(`  ${col(c.obj, 15)}${col(c.tipo, 19)}${col(w.x, 5)}${col(w.y, 5)}${col(w.w, 6)}${col(w.h, 5)}`);
    }
    L.push('');
    L.push('  Y dentro de cada uno:');
    for (const c of p.comps){
      const w = c.w, S = est(w), det = [];
      switch (COMO_SERIE[w.tipo] || w.tipo){
      case 'label':  det.push(`txt = "${quitarTildes(w.texto || '')}"`, `pco = ${nx565(S.texto)}`, `bco = ${nx565(tema.fondo)}`); break;
      case 'value':
      case 'timer':
      case 'state-strip':
        det.push('txt = vacio (lo escribe el ESP32)', 'txt_maxl = 20', `pco = ${nx565(S.texto)}`, `bco = ${nx565(tema.fondo)}`); break;
      case 'bar':    det.push('val = 0 (lo escribe el ESP32, de 0 a 100)', `pco = ${nx565(S.acento)}`, `bco = ${nx565(S.sup)}`); break;
      case 'button': det.push(`txt = "${rotuloSerie(w)}"`, `bco = ${nx565(S.acento)}`, `pco = ${nx565(tema.fondo)}`); break;
      case 'toggle':
      case 'checkbox': det.push(`txt = "${quitarTildes(w.texto || '')}"`, 'val = 0 (lo escribe el ESP32)'); break;
      case 'led':    det.push('txt = vacio', `bco = ${nx565(S.sup)} (apagado; el ESP32 lo cambia)`); break;
      case 'panel':  det.push('txt = vacio', `bco = ${nx565(S.sup)}`, '(es solo un recuadro de color)'); break;
      case 'line':   det.push('txt = vacio', `bco = ${nx565(S.acento)}`, '(una raya: un Text de 2 px de alto)'); break;
      }
      L.push(`    ${c.obj}: ${det.join(' | ')}`);
      if (c.accion){
        if (c.repite || c.suelta){
          L.push(`      Touch Press Event:    print "#${c.obj}"`);
          L.push(`                            printh FF FF FF`);
          L.push(`      Touch Release Event:  print "!${c.obj}"`);
          L.push(`                            printh FF FF FF`);
          L.push(c.repite ? `      (repite mientras se mantiene pulsado)` : `      (avisa al tocar y al soltar)`);
        } else {
          L.push(`      Touch Release Event:  print "#${c.obj}"`);
          L.push(`                            printh FF FF FF`);
        }
        L.push(`      NO marques "Send Component ID": no hace falta.`);
      }
    }
    const fuera = p.pagina.widgets.filter(w => !TIPO_NEXTION[w.tipo]);
    if (fuera.length){
      L.push('');
      L.push(`  Sin equivalente en la Nextion (dibujalos a mano si los quieres): ${fuera.map(w => w.nombre).join(', ')}`);
    }
  }
  L.push('');
  L.push('');
  L.push('SI ALGO NO VA');
  L.push('-------------');
  L.push('- Nada cambia en la pantalla: TX y RX cruzados? misma velocidad en los');
  L.push('  dos lados? objname escrito exactamente igual?');
  L.push('- Un texto sale cortado: txt_maxl de ese componente.');
  L.push('- Un boton no hace nada: el codigo del Touch Release Event, con las');
  L.push('  comillas y el printh FF FF FF en su propia linea.');
  L.push('- Los textos salen en blanco: falta la fuente (Tools > Font Generator).');
  return L.join('\r\n') + '\r\n';
}

/* El protocolo de lineas, para el LEEME: el otro lado tiene que saberlo */
function textoProtocoloLineas(){
  const paginas = componentesSerie();
  return `EL PROTOCOLO DE LINEAS
----------------------
Texto ASCII, una orden por linea terminada en \\n, a ${placa().serie?.baudios || 115200} baudios.

Del ESP32 a la pantalla:
    PAGE <pagina>              cambia de pagina
    SET <objeto>.txt <texto>   pon este texto
    SET <objeto>.val <numero>  pon este numero (barras: 0 a 100; interruptores: 0 o 1)
    SET <objeto>.bco #rrggbb   color de fondo
    SET <objeto>.pco #rrggbb   color de la letra
Se manda solo lo que cambia. Al cambiar de pagina se manda todo otra vez.

De la pantalla al ESP32:
    EVT <objeto>               un toque
    DOWN <objeto>              empieza a mantenerse pulsado (botones que repiten)
    UP <objeto>                se suelta

Paginas y objetos de este proyecto:
${paginas.map(p => `    ${p.nombre}: ${p.comps.map(c => c.obj + (c.accion ? ' (se toca)' : '')).join(', ') || '(vacia)'}`).join('\n')}
`;
}
