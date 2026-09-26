/* =====================================================================
 * Telar Studio — generador de codigo
 *
 * Convierte el manifiesto en una carpeta de sketch lista para abrir en
 * el IDE de Arduino y darle a Subir.
 *
 * La arquitectura no se inventa aqui: es la que el proyecto del variac
 * dejo probada en placa y que la skill recoge en runtime/patterns.md.
 * La regla de la que cuelga todo:
 *
 *   LA INTERFAZ NUNCA DECIDE. La tarea de control calcula y publica una
 *   instantanea; la interfaz la copia bajo mutex y pinta; los controles
 *   solo encolan eventos.
 *
 * Eso es lo que permite cambiar el modelo simulado por hardware real
 * tocando dos funciones, y regenerar las pantallas sin pisar la logica.
 * ===================================================================== */

/* Nombre C valido a partir de cualquier cosa que escriba el usuario */
/* Nombres que un alumno puede ponerle a un widget o a una variable y que
   en C ya son otra cosa: palabras reservadas, funciones de C y de Arduino,
   y los nombres de trabajo del propio código generado (p, s, buf, lbl...).
   Un widget llamado "clock" chocaba con clock() de <time.h> y el sketch no
   compilaba, con un error que no decía nada útil. A esos se les añade un
   guion bajo al final; cualquier otro nombre sale exactamente igual. */
const C_RESERVADOS = new Set((
  'auto break case char const continue default do double else enum extern float for goto if inline int long ' +
  'register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while ' +
  'bool true false class delete new this public private protected template typename namespace using operator ' +
  'friend virtual explicit mutable catch throw try nullptr and or not xor ' +
  'abs labs div exit free malloc calloc realloc rand srand random time clock difftime mktime printf sprintf ' +
  'snprintf puts putchar getchar exp log log10 pow sqrt sin cos tan asin acos atan atan2 sinh cosh tanh floor ' +
  'ceil round fabs fmod index rindex y0 y1 yn j0 j1 jn select signal raise remove rename system abort atoi atof ' +
  'strlen strcpy strcmp memcpy memset delay millis micros min max constrain map word bit byte boolean yield tone ' +
  'setup loop Serial String HIGH LOW INPUT OUTPUT PI F ' +
  'p s e t v i m on dt buf lbl disp tema act st t_ms ms_en_estado enlace_ok fallo ' +
  'poner_texto ui_pronto refresco_puntual aplicar_aspecto ui_build ui_refresh entrar acota'
).split(/\s+/));
const cid = s => { const c = String(s).replace(/[^A-Za-z0-9_]/g,'_').replace(/^(\d)/,'_$1'); return C_RESERVADOS.has(c) ? c + '_' : c; };
const MAY = s => cid(s).toUpperCase();

/* Un literal float de C necesita punto: "0f" no compila, "0.0f" si.
   El editor guarda los rangos como numeros de JavaScript, y 0 se
   imprime como "0" a secas. */
const flt = x => (Number(x).toFixed(2)) + 'f';

/* Los pines de una fila del asignador vienen como texto legible, y no
   siempre con el mismo formato: "GPIO43 · GPIO44" cuando la placa trae
   el bus de fabrica, "RX 16 · TX 17" cuando se monta sobre el UART2.
   Aqui solo interesan los numeros, en el orden en que aparecen. */
const numsDe = txt => (String(txt ?? '').match(/\d+/g) || []);

/* Las variables que de verdad llegan a la interfaz */
function varsDeUI(){ return variables().filter(v => v.dir !== 'ajuste' || true); }

/* Un widget puede pintar un valor? */
const PINTA = new Set(['value','bar','arc-gauge','semicircle-gauge','led','slider','toggle','chart','scale','timer']);

/* Widgets que el generador sabe construir en v1. El resto se emite como
   comentario, con su nombre, para que se vea que falta y donde. */
const GENERABLES = new Set(['label','value','panel','button','bar','arc-gauge',
  'semicircle-gauge','chart','slider','toggle','led','state-strip','line',
  'checkbox','dropdown','spinbox','textarea','scale','spinner','timer','image',
  'list','table','msgbox','tabview','roller','buttonmatrix','keyboard','qrcode',
  /* los componentes industriales (componentes.js) */
  'tarjeta','lectura','tiempo','dato','pildora','pasos','barra-consigna','curva','aguja','icono']);

/* QUE SABE HACER ESTA PLACA
 *
 * El generador no pregunta "que placa es" sino "que sabe hacer": asi una
 * placa que no estaba en el catalogo —una Pico, una STM32, la que el
 * alumno describa— encaja sin tocar el generador. La familia decide las
 * respuestas; la ficha de la placa puede afinarlas.
 *
 *   esp32     LEDC, atenuacion de ADC, Serial.printf, 12 bits
 *   avr       analogWrite de 8 bits, sin printf, 10 bits, un solo UART
 *   arduino   cualquier core de Arduino: analogWrite, sin printf
 *   linux     no es un sketch: se genera Python (Raspberry, Jetson...)
 */
const esAvr = P => !!P && P.familia === 'avr';
const esLinux = P => !!P && P.familia === 'linux';
const familiaDe = P => (P && P.familia) || 'esp32';

function CAP(P){
  const f = familiaDe(P);
  return {
    familia: f,
    printf:      f === 'esp32',                       /* Serial.printf solo lo trae el core de ESP32 */
    ledc:        f === 'esp32',                       /* PWM por canal; el resto, analogWrite */
    atenuacion:  f === 'esp32',
    fijaResAdc:  f === 'esp32' || (f === 'arduino' && P.fija_res_adc !== false),
    bitsAdc:     P.bits_adc ?? (f === 'avr' ? 10 : 12),
    bitsPwm:     P.bits_pwm ?? (f === 'esp32' ? 13 : 8),
    remapeaUart: f === 'esp32',                       /* begin(baud, SERIAL_8N1, rx, tx) */
    unSoloUart:  f === 'avr',                         /* obliga a elegir: software o USB */
  };
}
const topeAdc = P => (1 << CAP(P).bitsAdc) - 1;
/* nombre viejo, por si queda algun uso */
const bitsAdc = topeAdc;

/* El contenido que escribe el alumno: una linea por elemento. Si no ha
   escrito nada, el ejemplo del catalogo, que es lo que pinta el lienzo:
   asi el codigo y el lienzo enseñan lo mismo. */
function elementosDe(w){
  const d = CON_ELEMENTOS[w.tipo];
  const txt = String(w.elementos ?? (d ? d.def : ''));
  return txt.split('\n').map(s => s.trim()).filter(Boolean);
}

/* =====================================================================
 * CABECERA COMUN
 * ===================================================================== */
function cabecera(titulo, extra){
  return `/*\n * ${titulo}\n *\n * GENERADO POR TELAR STUDIO — no edites este fichero a mano:\n`
       + ` * el proximo Exportar lo sobrescribe. Tu codigo va en src/logic/,\n`
       + ` * que la regeneracion nunca toca.\n`
       + (extra ? ` *\n${extra.split('\n').map(l => ' * ' + l).join('\n')}\n` : '')
       + ` */\n`;
}

/* =====================================================================
 * state.h — el contrato entre control e interfaz
 * ===================================================================== */
/* =====================================================================
 * LA LOGICA DEL MANIFIESTO — logica.h / logica.cpp y el aspecto por estado
 *
 * Sale de la seccion de logica del telar.yaml (el lenguaje esta en
 * logica.js). Es codigo GENERADO: se rehace en cada exportacion. Lo que
 * el alumno escribe a mano sigue en src/logic/, que no se pisa.
 *
 * Todo corre en la tarea de control, dentro del mutex:
 *   logica_init   al arrancar: valores de salida y estado inicial
 *   logica_boton  al atender el evento de un boton
 *   logica_paso   cada ciclo: lo que cuenta y las condiciones
 * Solo el aspecto (texto y color por estado) va en ui.cpp.
 * ===================================================================== */
const lf = x => { const n = Number(x); return (Number.isInteger(n) ? n.toFixed(1) : String(n)) + 'f'; };
/* Los bloques de la logica. El primero manda en s->st, que es lo que ven
   la franja de estados y reglas.cpp. Cada bloque mas tiene su propio
   campo (st_timer), su propio enum (st_timer_t, con ST_TIMER_READY...) y
   su propio entrar_timer(). Un programa suelto es un solo bloque y sale
   exactamente igual que antes de que existieran los bloques. */
function bloquesLogica(){
  const M = logicaModelo(); if (!M) return [];
  return M.blocks.map((b, i) => ({ ...b,
    campo:  i ? 'st_' + cid(b.name) : 'st',
    tipo:   i ? 'st_' + cid(b.name) + '_t' : 'app_state_t',
    entrar: i ? 'entrar_' + cid(b.name) : 'entrar',
    ST:     i ? x => 'ST_' + MAY(b.name) + '_' + MAY(x) : x => 'ST_' + MAY(x) }));
}
/* Las variables son de todo el aparato, las declare el bloque que las declare */
const varsDeLogica = () => Object.assign({}, ...bloquesLogica().map(b => b.variables));
const botonesLogica = () => bloquesLogica().flatMap(b => Object.keys(b.buttons));
/* Los botones que tambien avisan al SOLTAR: los que tienen "on release" o
   "hold". Solo ellos cambian de evento (PRESSED + RELEASED); el resto sigue
   exactamente como antes (CLICKED). */
const botonesSuelta = () => bloquesLogica().flatMap(b => Object.entries(b.buttons)
  .filter(([, f]) => f && (f['on release'] || typeof f.hold === 'string' || Object.keys(f).some(k => /^on hold\b/.test(k)))).map(([n]) => n));
/* El click de la logica: una salida y cuanto dura. Vale para todos los
   botones de la logica (si lo escriben varios bloques, el primero). */
function clickLogica(){
  for (const b of bloquesLogica()){
    const m = b.click && String(b.click).match(LOGICA.RE_CLICK);
    if (m) return { salida: m[1], dur: m[2] ?? String(LOGICA.CLICK_DEF) };
  }
  return null;
}
/* Todas las listas de acciones de la logica, de cualquier sitio */
function accionesDeLogica(){
  const L = [];
  for (const b of bloquesLogica()){
    for (const e of Object.values(b.states)) if (e) for (const [k, l] of Object.entries(e)) if (Array.isArray(l)) L.push(...l);
    for (const f of Object.values(b.buttons)) for (const [k, l] of Object.entries(f || {})) if (Array.isArray(l)) L.push(...l);
  }
  return L.map(String);
}
/* Las salidas que llevan tiempo propio (pulse, blink o el click): cada una
   necesita su temporizada_t en logica.cpp */
function salidasTemporizadas(){
  const t = new Set();
  for (const a of accionesDeLogica()){
    const m = a.match(LOGICA.RE_PULSE) || a.match(LOGICA.RE_BLINK);
    if (m) t.add(m[1]);
  }
  const c = clickLogica(); if (c) t.add(c.salida);
  return [...t];
}
/* after / every: el bloque necesita saber cuanto lleva en su estado */
const usaTiempoEnEstado = b => Object.values(b.states).some(e => e && Object.keys(e).some(k => /^(after|every)\b/.test(k)));
const enLogica = w => w.tipo === 'button' && botonesLogica().includes(w.nombre);
/* Un botón con repeat: yes repite su acción mientras se deja pulsado */
const repiteLogica = w => bloquesLogica().some(b => { const f = b.buttons[w.nombre]; return !!f && (f.repeat === 'yes' || f.repeat === true); });

/* Un botón enlazado a una salida CON VALOR (un PWM) la sube o la baja un
   paso. Devuelve la variable, el paso con signo y si repite al mantener. */
function ordenPaso(w){
  if (w.tipo !== 'button' || w.destino || w.evento || enLogica(w)) return null;
  const v = variables().find(x => x.nombre === w.bind);
  if (!v || v.dir !== 'escritura' || v.booleano) return null;
  const o = w.orden || {};
  const paso = Math.abs(Number(o.paso)) || pasoPorDefecto(v);
  return { v, delta: o.accion === 'bajar' ? -paso : paso, repite: o.repite !== false };
}
/* Las salidas que algún botón sube o baja: cada una necesita su EV_INC_ */
function varsConPaso(){
  const vistas = new Map();
  for (const s of E.pantallas) for (const w of s.widgets){ const op = ordenPaso(w); if (op) vistas.set(op.v.nombre, op.v); }
  return [...vistas.values()];
}
const hayAspecto = () => bloquesLogica().some(b => Object.keys(b.looks).length > 0);

/* Los estados: los de la logica si la hay; si no, como hasta ahora */
function estadosProyecto(){
  const B = bloquesLogica();
  if (B.length) return Object.keys(B[0].states);
  return E.estados.length ? E.estados : ['RUN'];
}

/* state.h: el enum y el campo de cada bloque que no es el primero */
const enumsBloques = () => bloquesLogica().slice(1).map(b => `
/* Estados del bloque ${b.name} de la logica: van en su propio campo, ${b.campo} */
typedef enum {
${Object.keys(b.states).map((s, i) => `    ${b.ST(s)}${i ? '' : ' = 0'},`).join('\n')}
} ${b.tipo};
`).join('');
const camposBloques = () => bloquesLogica().slice(1)
  .map(b => `    ${b.tipo} ${b.campo};   /* estado del bloque ${b.name} */\n`).join('');

function genLogicaH(){
  return cabecera('logica.h — la logica del manifiesto',
`Generado desde la seccion de logica del telar.yaml. No lo edites: cambia
la logica en Telar Studio y vuelve a exportar. Tu codigo propio va en
src/logic/, que la exportacion no pisa.`) +
`#ifndef TELAR_LOGICA_H
#define TELAR_LOGICA_H

#include "state.h"

void logica_init(snapshot_t *s);
void logica_boton(snapshot_t *s, uint8_t evento);
void logica_paso(snapshot_t *s);

#endif /* TELAR_LOGICA_H */
`;
}

function genLogicaCpp(){
  const BL = bloquesLogica(), V = varsDeLogica(), varios = BL.length > 1;
  const campo = n => 's->' + cid(n);
  /* Las condiciones "este timer esta contando", del bloque que sea */
  const cuentaEn = t => BL.flatMap(b => Object.keys(b.states)
    .filter(st => ((b.states[st] || {}).while || []).some(a => String(a).trim() === 'count ' + t))
    .map(st => `s->${b.campo} == ${b.ST(st)}`));

  /* Un timer que sale de este ajuste lo sigue mientras no esta contando */
  const sigue = x => Object.entries(V).filter(([, tv]) => tv.type === 'timer' && tv.from === x).map(([tn]) => {
    const en = cuentaEn(tn);
    return ` ${en.length ? `if (!(${en.join(' || ')})) ` : ''}${campo(tn)} = ${campo(x)};`;
  }).join('');
  /* save/load: la clave de la NVS es el nombre (el editor lo limita a 15) */
  const usaMemoria = BL.some(b => /"(save|load)\s/.test(JSON.stringify(b)));
  /* La Pico no tiene NVS ni Preferences: su memoria es la EEPROM que el
     core emula en la flash, con un hueco fijo por clave */
  const memEeprom = usaMemoria && familiaDe(placa()) !== 'esp32';
  const clavesMem = [...new Set(BL.flatMap(b => [...JSON.stringify(b).matchAll(/"(?:save|load)\s+([A-Za-z_]\w*)/g)].map(m => cid(m[1]))))];

  const TZ = new Set(salidasTemporizadas());
  /* un tiempo en C: un numero, o lo que valga el setting */
  const durC = x => isNaN(+x) ? campo(x) : lf(x);
  /* lo explicito manda: turn on/off o toggle sobre una salida con tiempo lo cancela */
  const cancela = x => TZ.has(x) ? `tz_${cid(x)}.modo = 0; ` : '';
  /* una cuenta en C: los nombres son campos del snapshot y la division
     pasa por divide_o_cero (dividir entre cero da 0, como en el simulador) */
  const exprC = arbol => LOGICA.pintaExpr(arbol, { num: lf, nombre: campo, neg: x => `(-${x})`, div: (x, y) => `divide_o_cero(${x}, ${y})` });
  /* divide_o_cero solo va en logica.cpp si alguna cuenta divide */
  const usaDivision = BL.some(b => /"(?:set\s+\w+\s+to\s|if\s)[^"]*\//.test(JSON.stringify([b.states, b.buttons])));

  const accion = (b, a) => {
    const mp = String(a).match(LOGICA.RE_PULSE);
    if (mp) return `tz_pulso(&tz_${cid(mp[1])}, &${campo(mp[1])}, ${durC(mp[2] ?? String(LOGICA.PULSO_DEF))});`;
    const mb = String(a).match(LOGICA.RE_BLINK);
    if (mb) return `tz_parpadeo(&tz_${cid(mb[1])}, &${campo(mb[1])}, ${durC(mb[2])}, ${durC(mb[3])}, ${mb[4] === 'for' ? durC(mb[5]) : '-1.0f'}, ${mb[4] === 'times' ? `(int32_t)(${durC(mb[5])})` : '0'});`;
    /* set: el valor se acota al rango de la salida o del setting; un
       timer, a 0 o mas. Un timer que sale de este setting lo sigue */
    const ms = String(a).match(LOGICA.RE_SET_CUENTA);
    if (ms){
      const [, x, val] = ms, hw = variables().find(v => v.nombre === x);
      const expr = exprC(LOGICA.expresion(val).arbol);
      if (V[x] && V[x].type === 'timer') return `${campo(x)} = ${expr}; if (${campo(x)} < 0.0f) ${campo(x)} = 0.0f;`;
      /* un contador: al entero mas cercano, de 0 a su max */
      if (V[x] && V[x].type === 'counter') return `${campo(x)} = acota(roundf(${expr}), 0.0f, ${lf(LOGICA.topeContador(V[x]))});`;
      const lo = V[x] ? V[x].range[0] : hw && hw.min, hi = V[x] ? V[x].range[1] : hw && hw.max;
      return (lo !== undefined && hi !== undefined ? `${campo(x)} = acota(${expr}, ${lf(lo)}, ${lf(hi)});` : `${campo(x)} = ${expr};`) + (V[x] ? sigue(x) : '');
    }
    const [, vb, x] = String(a).match(LOGICA.RE_ACTION);
    const v = V[x] || {};
    switch (vb){
    case 'go to': return `${b.entrar}(s, ${b.ST(x)});`;
    case 'increase':
    case 'decrease': {
      /* un contador: de uno en uno, de 0 a su max */
      if (v.type === 'counter') return `${campo(x)} = acota(${campo(x)} ${vb === 'increase' ? '+' : '-'} 1.0f, 0.0f, ${lf(LOGICA.topeContador(v))});`;
      let c = `${campo(x)} = acota(${campo(x)} ${vb === 'increase' ? '+' : '-'} ${lf(v.step)}, ${lf(v.range[0])}, ${lf(v.range[1])});`;
      /* un timer que sale de este ajuste lo sigue mientras no esta contando */
      for (const [tn, tv] of Object.entries(V)){
        if (tv.type !== 'timer' || tv.from !== x) continue;
        const en = cuentaEn(tn);
        c += ` ${en.length ? `if (!(${en.join(' || ')})) ` : ''}${campo(tn)} = ${campo(x)};`;
      }
      return c;
    }
    case 'restart': if (v.type === 'counter') return `${campo(x)} = ${lf(LOGICA.inicioContador(v))};`;
                    return v.counts === 'up' ? `${campo(x)} = 0.0f;` : `${campo(x)} = ${campo(v.from)};`;
    case 'count':   return v.counts === 'up' ? `${campo(x)} += dt;`
                                             : `${campo(x)} -= dt; if (${campo(x)} < 0.0f) ${campo(x)} = 0.0f;`;
    case 'turn on':  return `${cancela(x)}${campo(x)} = true;`;
    case 'turn off': return `${cancela(x)}${campo(x)} = false;`;
    case 'toggle':   return `${cancela(x)}${campo(x)} = !${campo(x)};`;
    case 'save':     return v.type === 'flag' ? `memoria_guardar("${cid(x)}", ${campo(x)} ? 1.0f : 0.0f);` : `memoria_guardar("${cid(x)}", ${campo(x)});`;
    case 'load':     if (v.type === 'counter') return `{ float v; if (memoria_cargar("${cid(x)}", &v)) ${campo(x)} = acota(roundf(v), 0.0f, ${lf(LOGICA.topeContador(v))}); }`;
                     if (v.type === 'flag') return `{ float v; if (memoria_cargar("${cid(x)}", &v)) ${campo(x)} = (v != 0.0f); }`;
                     return `{ float v; if (memoria_cargar("${cid(x)}", &v)) { ${campo(x)} = acota(v, ${lf(v.range[0])}, ${lf(v.range[1])});${sigue(x)} } }`;
    }
    return '';
  };
  const acciones = (b, l) => (l || []).map(a => accion(b, a)).join(' ');
  const cambiaDeEstado = l => (l || []).some(a => /^go to\s/.test(String(a)));
  const valorC = x => isNaN(+x) ? campo(x) : lf(x);
  /* La condicion, tal cual se escribio: una o varias comparaciones con
     and / or. En C, && ata mas fuerte que ||, igual que aqui. */
  const condicion = k => {
    const C = LOGICA.condPartes(k); if (!C) return '0';
    /* "if armed": una bandera o una entrada de si/no, tal cual */
    /* "if cycle is RUNNING": el estado de ese bloque, tal cual */
    const estadoDe = m => { const X = BL.find(x => x.name === m[1]); return X ? `s->${X.campo} ${m.no ? '!=' : '=='} ${X.ST(m[3])}` : '0'; };
    const una = m => m.es ? estadoDe(m) : m.solo ? `${m.no ? '!' : ''}${campo(m[1])}` : `${m.no ? '!(' : ''}${m.cuentaIzq ? exprC(m.cuentaIzq) : campo(m[1])} ${m[2]} ${m.cuenta ? exprC(m.cuenta) : `${valorC(m[3])}${m[4] ? ` ${m[4]} ${valorC(m[5])}` : ''}`}${m.no ? ')' : ''}`;
    /* los "and" seguidos van juntos entre parentesis: el compilador
       avisa si se mezclan && y || sin ellos, y asi se lee mejor */
    const grupos = [[]];
    C.partes.forEach((m, i) => { if (i && C.enlaces[i - 1] === 'or') grupos.push([]); grupos[grupos.length - 1].push(una(m)); });
    return grupos.map(g => g.length > 1 && grupos.length > 1 ? `(${g.join(' && ')})` : g.join(' && ')).join(' || ');
  };

  const entrarDe = b => {
    const alEntrar = Object.keys(b.states).filter(st => b.states[st] && b.states[st]['on enter'])
      .map(st => `    case ${b.ST(st)}: ${acciones(b, b.states[st]['on enter'])} break;`).join('\n');
    return `static void ${b.entrar}(snapshot_t *s, ${b.tipo} st)
{
    s->${b.campo} = st;${usaTiempoEnEstado(b) ? `
    t_en_${b.campo} = 0.0f;   /* after / every cuentan desde aqui */` : ''}
    switch (st) {
${alEntrar || '    /* ningun estado hace nada al entrar */'}
    default: break;
    }
}
`;
  };

  /* el click: un pulso corto cuando un boton hace algo */
  const CK = clickLogica();
  const clic = CK ? ` tz_click(&tz_${cid(CK.salida)}, &${campo(CK.salida)}, ${durC(CK.dur)});` : '';
  /* on hold T: la pulsacion larga de cada boton que la tiene */
  const LARGAS = BL.flatMap(b => Object.entries(b.buttons).map(([bn, filas]) => {
    const k = Object.keys(filas || {}).find(x => /^on hold\b/.test(x));
    return k ? { b, bn, T: k.match(LOGICA.RE_ONHOLD)[1], l: filas[k] } : null;
  }).filter(Boolean));
  const largasDecl = LARGAS.length ? `
/* PULSACION LARGA (on hold). Al pulsar empieza a contar; si llega al tiempo
   se hace lo de on hold, una vez, y al soltar ya no se hace lo de pulsar.
   Si se suelta antes, fue un toque corto: se hace lo de pulsar, al soltar. */
typedef struct { bool apretado, largo; float lleva; } pulsacion_t;
${LARGAS.map(x => `static pulsacion_t lp_${cid(x.bn)};`).join('\n')}
` : '';
  /* en logica_paso: cuanto lleva pulsado cada uno (0,001 s de margen: 40
     pasos de 0,05 suman 1,9999999 en coma flotante) */
  const pasoLargas = LARGAS.map(({ b, bn, T, l }) => `    if (lp_${cid(bn)}.apretado && !lp_${cid(bn)}.largo) {   /* ${bn}: on hold ${T} */
        lp_${cid(bn)}.lleva += dt;
        if (lp_${cid(bn)}.lleva + 0.001f >= ${durC(T)}) { lp_${cid(bn)}.largo = true; ${acciones(b, l)}${clic} }
    }
`).join('');
  const botones = BL.flatMap(b => Object.entries(b.buttons).map(([bn, filas]) => {
    const ins = Object.entries(filas).filter(([k]) => /^in\s/.test(k));   /* ni always ni repeat */
    const hold = typeof filas.hold === 'string' ? filas.hold : null;
    const L = [`    case EV_L_${MAY(bn)}:`];
    /* hold: la salida sigue al dedo. Hace algo siempre, asi que suena siempre */
    if (hold) L.push(`        ${cancela(hold)}${campo(hold)} = true;${clic}`);
    const c = hold ? '' : clic;
    /* lo de pulsar: al tocar o, si hay on hold, al soltar tras un toque corto */
    const pulsar = [];
    ins.forEach(([k, l], i) => pulsar.push(`        ${i ? 'else if' : 'if     '} (s->${b.campo} == ${b.ST(k.replace(/^in\s+/, ''))}) { ${acciones(b, l)}${c} }`));
    if (filas.always) pulsar.push(ins.length ? `        else { ${acciones(b, filas.always)}${c} }` : `        ${acciones(b, filas.always)}${c}`);
    const larga = Object.keys(filas).some(x => /^on hold\b/.test(x)), lp = `lp_${cid(bn)}`;
    if (!larga) L.push(...pulsar);
    else L.push(`        ${lp}.apretado = true; ${lp}.largo = false; ${lp}.lleva = 0.0f;   /* on hold: cuenta desde aqui */`);
    L.push('        break;');
    if (hold || filas['on release'] || larga){
      L.push(`    case EV_S_${MAY(bn)}:   /* al soltar */`);
      if (larga && pulsar.length){
        L.push(`        if (${lp}.apretado && !${lp}.largo) {   /* toque corto: lo de pulsar */`);
        pulsar.forEach(x => L.push('    ' + x));
        L.push('        }');
      }
      if (larga) L.push(`        ${lp}.apretado = false;`);
      if (hold) L.push(`        ${campo(hold)} = false;`);
      if (filas['on release']) L.push(`        ${acciones(b, filas['on release'])}`);
      L.push('        break;');
    }
    return L.join('\n');
  })).join('\n');

  const pasosDe = b => Object.keys(b.states).map(st => {
    const e = b.states[st]; if (!e) return '';
    const mientras = e.while || [], sis = Object.keys(e).filter(k => /^(if|after|every)\b/.test(k));
    if (!mientras.length && !sis.length) return '';
    const L = [`    case ${b.ST(st)}:`];
    mientras.forEach(a => L.push(`        ${accion(b, a)}`));
    /* Con else hace falta saber si se cumplio alguno: se apunta en
       "alguno". Sin else, el C sale exactamente como siempre. */
    const conElse = Array.isArray(e.else) && e.else.length && sis.some(k => /^if\b/.test(k));
    if (conElse) L.push('        {   bool alguno = false;   /* para el else */');
    const sangria = conElse ? '            ' : '        ';
    const fin = k => cambiaDeEstado(e[k]) ? ' break;' : '';
    const tc = b.campo;
    sis.forEach(k => {
      const ma = k.match(LOGICA.RE_AFTER), me = k.match(LOGICA.RE_EVERY);
      /* after: una vez, en la vuelta en que se cruza ese tiempo */
      if (ma) L.push(`${sangria}if (t0_${tc} < ${durC(ma[1])} && t_en_${tc} >= ${durC(ma[1])}) { ${acciones(b, e[k])}${fin(k)} }   /* ${k} */`);
      /* every: cada vez que se cruza un multiplo de ese tiempo */
      else if (me) L.push(`${sangria}if (${durC(me[1])} > 0.0f && (int32_t)(t_en_${tc} / ${durC(me[1])}) != (int32_t)(t0_${tc} / ${durC(me[1])})) { ${acciones(b, e[k])}${fin(k)} }   /* ${k} */`);
      else L.push(`${sangria}if (${condicion(k)}) { ${conElse ? 'alguno = true; ' : ''}${acciones(b, e[k])}${fin(k)} }`);
    });
    if (conElse){
      L.push(`            if (!alguno) { ${acciones(b, e.else)} }`);
      L.push('        }');
    }
    L.push('        break;');
    return L.join('\n');
  }).filter(Boolean).join('\n');
  const otrosPasos = BL.slice(1).map(b => {
    const p = pasosDe(b);
    return p ? `
    switch (s->${b.campo}) {   /* bloque ${b.name} */
${p}
    default: break;
    }
` : '';
  }).join('');

  const valores = [
    ...Object.entries(V).filter(([, v]) => v.type === 'setting').map(([n, v]) => `    ${campo(n)} = ${lf(v.start)};`),
    ...Object.entries(V).filter(([, v]) => v.type === 'timer').map(([n, v]) => `    ${campo(n)} = ${v.counts === 'up' ? '0.0f' : campo(v.from)};`),
    ...Object.entries(V).filter(([, v]) => v.type === 'counter').map(([n, v]) => `    ${campo(n)} = ${lf(LOGICA.inicioContador(v))};   /* contador */`),
    ...Object.entries(V).filter(([, v]) => v.type === 'flag').map(([n, v]) => `    ${campo(n)} = ${LOGICA.banderaInicial(v) ? 'true' : 'false'};   /* bandera */`),
  ].join('\n');

  return cabecera('logica.cpp — la logica del manifiesto',
`Traduccion directa de states, buttons y variables. Cada linea del
manifiesto se reconoce aqui: un "in READY" es un "if (s->st == ST_READY)",
un "go to" es entrar() y un "count" resta dt.${varios ? `

La logica tiene ${BL.length} bloques y corren a la vez: en cada ciclo se
mira uno detras de otro. Cada uno tiene su propio estado:
${BL.map(b => `  ${b.name}: s->${b.campo}`).join('\n')}` : ''}`) +
`#include "logica.h"
${usaMemoria ? (memEeprom ? '#include <EEPROM.h>\n#include <string.h>\n' : '#include <Preferences.h>\n') : ''}
static inline float acota(float v, float lo, float hi) { return v < lo ? lo : (v > hi ? hi : v); }
${usaDivision ? `/* Dividir entre cero da 0: un setting a cero no deja la salida en un valor sin sentido */
static inline float divide_o_cero(float a, float b) { return b == 0.0f ? 0.0f : a / b; }
` : ''}${largasDecl}${memEeprom ? `
/* La memoria que no se borra al apagar. Esta placa no tiene la NVS del
   ESP32: se usa la EEPROM que el core emula en la flash. Cada clave tiene
   su hueco fijo de 5 bytes, una marca (0xA5 = hay algo) y el float.
   commit() es lo que la escribe de verdad en la flash. */
static const char *const MEMORIA_CLAVES[] = { ${clavesMem.map(k => `"${k}"`).join(', ')} };
static const int MEMORIA_N = ${clavesMem.length};
static bool memoria_lista = false;

static int memoria_hueco(const char *clave)
{
    for (int i = 0; i < MEMORIA_N; i++) if (strcmp(MEMORIA_CLAVES[i], clave) == 0) return i * 5;
    return -1;
}

static void memoria_abrir(void)
{
    if (!memoria_lista) { EEPROM.begin(256); memoria_lista = true; }
}

static void memoria_guardar(const char *clave, float valor)
{
    const int h = memoria_hueco(clave);
    if (h < 0) return;
    memoria_abrir();
    EEPROM.write(h, 0xA5);
    EEPROM.put(h + 1, valor);
    EEPROM.commit();
}

/* true si habia algo guardado con esa clave; si no, *valor no se toca */
static bool memoria_cargar(const char *clave, float *valor)
{
    const int h = memoria_hueco(clave);
    if (h < 0) return false;
    memoria_abrir();
    if (EEPROM.read(h) != 0xA5) return false;
    float v;
    EEPROM.get(h + 1, v);
    if (v != v) return false;          /* NaN: el hueco no tiene un numero */
    *valor = v;
    return true;
}
` : usaMemoria ? `
/* La memoria que no se borra al apagar: la NVS del ESP32, con Preferences.
   Todo va en el espacio "telar". Se abre y se cierra en cada uso: guardar
   es cosa de un boton, no de cada ciclo, y asi nada queda a medias. */
static Preferences memoria;

static void memoria_guardar(const char *clave, float valor)
{
    if (!memoria.begin("telar", false)) return;
    memoria.putFloat(clave, valor);
    memoria.end();
}

/* true si habia algo guardado con esa clave; si no, *valor no se toca */
static bool memoria_cargar(const char *clave, float *valor)
{
    if (!memoria.begin("telar", false)) return false;
    const bool hay = memoria.isKey(clave);
    if (hay) *valor = memoria.getFloat(clave, 0.0f);
    memoria.end();
    return hay;
}
` : ''}
${TZ.size ? `/* SALIDAS CON TIEMPO: pulse y blink${CK ? ' (y el click de los botones)' : ''}
 *
 * Nada se queda esperando: un delay() congelaria la pantalla y el enlace.
 * Cada salida con tiempo lleva su propio reloj, que avanza con el dt de
 * cada vuelta (tz_paso, al final de logica_paso). Un turn on, turn off
 * o toggle sobre la salida lo cancela: lo explicito manda.
 *   modo 1 (pulse)  encendida hasta que se acaba "queda"
 *   modo 2 (blink)  "on" encendida, "off" apagada; se para al acabar
 *                   "total" (si es > 0) o tras "veces" ciclos (si es > 0),
 *                   y siempre acaba apagada */
typedef struct { uint8_t modo; float queda, on, off, fase, total; int32_t veces; } temporizada_t;

static void tz_pulso(temporizada_t *t, bool *x, float dur)
{
    t->modo = 1; t->queda = dur; *x = true;
}

static void tz_parpadeo(temporizada_t *t, bool *x, float on, float off, float total, int32_t veces)
{
    /* pedirlo otra vez igual no lo reinicia: en un if que se cumple sin
       parar, el parpadeo seguiria atascado en su primer instante */
    if (t->modo == 2 && t->on == on && t->off == off) return;
    t->modo = 2; t->on = on; t->off = off; t->fase = 0.0f; t->total = total; t->veces = veces; *x = true;
}
${CK ? `
/* El click de los botones no pisa nada: si la salida ya esta encendida o
   lleva su propio pulse o blink (un aviso, un hold, un pulse mas largo del
   mismo boton), se queda como esta. Solo suena si estaba en silencio. */
static void tz_click(temporizada_t *t, bool *x, float dur)
{
    if (*x || t->modo != 0) return;
    tz_pulso(t, x, dur);
}
` : ''}
static void tz_paso(temporizada_t *t, bool *x, float dt)
{
    if (t->modo == 1) {
        t->queda -= dt;
        /* se apaga cuando queda menos de medio ciclo: dura los ciclos mas
           cercanos a lo pedido aunque dt baile un poco (0,1 s = 2 ciclos) */
        if (t->queda < -0.5f * dt) { *x = false; t->modo = 0; }
        return;
    }
    if (t->modo != 2) return;
    if (t->total > 0.0f) {
        t->total -= dt;
        if (t->total <= 0.0f) { *x = false; t->modo = 0; return; }
    }
    t->fase += dt;
    const float ciclo = t->on + t->off;
    if (ciclo > 0.0f && t->fase >= ciclo) {
        t->fase -= ciclo;
        if (t->veces > 0 && --t->veces == 0) { *x = false; t->modo = 0; return; }
    }
    *x = t->fase < t->on;
}

${[...TZ].map(x => `static temporizada_t tz_${cid(x)};   /* ${x} */`).join('\n')}

` : ''}${BL.filter(usaTiempoEnEstado).map(b => `/* Cuanto lleva el bloque${b.name ? ' ' + b.name : ''} en su estado: after / every */
static float t_en_${b.campo} = 0.0f;
`).join('')}${BL.some(usaTiempoEnEstado) ? '\n' : ''}/* Cambiar de estado y hacer lo de "on enter". Un "go to" dentro de
   on enter no existe —el editor no lo deja—, asi que esto no puede
   encadenarse solo. */
${BL.map(entrarDe).join('\n')}
void logica_init(snapshot_t *s)
{
${valores || '    /* la logica no tiene variables propias */'}
${BL.map(b => `    ${b.entrar}(s, ${b.ST(b.start_in)});`).join('\n')}
}

void logica_boton(snapshot_t *s, uint8_t evento)
{
    switch (evento) {
${botones || '    /* ningun boton tiene logica */'}
    default: break;
    }
}

void logica_paso(snapshot_t *s)
{
    /* dt medido y no supuesto: si un ciclo se retrasa, un timer no se
       adelanta ni se atrasa por ello. */
    static uint32_t t_ant = 0;
    const float dt = t_ant ? (s->t_ms - t_ant) / 1000.0f : 0.0f;
    t_ant = s->t_ms;
    (void)dt;
${pasoLargas}${BL.filter(usaTiempoEnEstado).map(b => `    const float t0_${b.campo} = t_en_${b.campo};   /* after / every miran el antes y el ahora */
    t_en_${b.campo} += dt;
`).join('')}
    switch (s->st) {
${pasosDe(BL[0]) || '    /* ningun estado cuenta ni tiene condiciones */'}
    default: break;
    }
${otrosPasos}${TZ.size ? `
    /* Al final, las salidas con tiempo: justo antes de que se escriban.
       Asi un pulso pedido en este ciclo —por un boton, que llega antes, o
       por un estado— sale ya en este ciclo y dura los ciclos que tocan. */
${[...TZ].map(x => `    tz_paso(&tz_${cid(x)}, &${campo(x)}, dt);`).join('\n')}
` : ''}}
`;
}

/* El aspecto por estado va en ui.cpp: es pintar, no decidir */
function genAspecto(){
  if (!hayAspecto()) return '';
  const BL = bloquesLogica(), W = {};
  for (const sc of E.pantallas) for (const w of sc.widgets) W[w.nombre] = w;
  const hexDe = c => colorC(LOGICA.COLORS[c] || c);
  const aspectoDe = b => Object.entries(b.looks).map(([wn, filas]) => {
    const w = W[wn]; if (!w) return '';
    const id = cid(wn), S = est(w), filasV = Object.values(filas);
    const tocaTexto = filasV.some(a => a.text !== undefined) && ['button', 'label'].includes(w.tipo);
    const tocaColor = filasV.some(a => a.color !== undefined);
    const tocaHabil = filasV.some(a => LOGICA.mencionaHabilitado(a)) && LOGICA.APAGABLES.includes(w.tipo);
    const lk = LOOKS_COMPONENTE[w.tipo];
    const colorDiseno = lk ? colorC(temaDe(w)[lk.token])
                      : ['label', 'value', 'timer'].includes(w.tipo) ? colorC(S.texto)
                      : w.tipo === 'button' ? colorC(colorBoton(w).fondo) : colorC(S.acento);
    const textoDiseno = w.tipo === 'button' ? (w.texto || '') : (w.texto || 'Texto');
    const pinta = (color, texto, habil = null) => {
      const o = [];
      if (habil !== null) o.push(habil ? `lv_obj_remove_state(${id}, LV_STATE_DISABLED);` : `lv_obj_add_state(${id}, LV_STATE_DISABLED);`);
      if (color !== null){
        if (lk)                                                 o.push(lk.c(id, color));
        else if (w.tipo === 'button')                                o.push(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${color}), LV_PART_MAIN);`);
        else if (w.tipo === 'led')                              o.push(`lv_led_set_color(${id}, lv_color_hex(${color}));`);
        else if (['label', 'value', 'timer'].includes(w.tipo))  o.push(`lv_obj_set_style_text_color(${id}, lv_color_hex(${color}), LV_PART_MAIN);`);
        else if (['bar', 'slider'].includes(w.tipo))            o.push(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${color}), LV_PART_INDICATOR);`);
        else if (['arc-gauge', 'semicircle-gauge'].includes(w.tipo)) o.push(`lv_obj_set_style_arc_color(${id}, lv_color_hex(${color}), LV_PART_INDICATOR);`);
      }
      if (texto !== null){
        if (w.tipo === 'button')
          o.push(`poner_texto(lv_obj_get_child(${id}, 0), ${rotuloC(w, texto)});`);
        else o.push(`poner_texto(${id}, "${txtC(texto, w)}");`);
      }
      return o.join(' ');
    };
    const casos = Object.entries(filas).map(([k, a]) =>
      `    case ${b.ST(k.replace(/^in\s+/, ''))}: ${pinta(
          a.color !== undefined ? hexDe(a.color) : (tocaColor ? colorDiseno : null),
          tocaTexto ? String(a.text !== undefined ? a.text : textoDiseno) : null,
          tocaHabil ? LOGICA.habilitadoDe(a) !== false : null)} break;`).join('\n');
    return `    switch (s->${b.campo}) {   /* ${wn} */
${casos}
    default: ${pinta(tocaColor ? colorDiseno : null, tocaTexto ? textoDiseno : null, tocaHabil ? true : null)} break;
    }`;
  }).filter(Boolean).join('\n');
  /* Un solo bloque: como siempre. Varios: cada uno se repinta cuando
     cambia SU estado, sin tocar lo de los demas. */
  /* Los que alguna vez se apagan se preparan una sola vez */
  const apagables = [...new Set(BL.flatMap(b => Object.entries(b.looks)
    .filter(([wn, filas]) => W[wn] && LOGICA.APAGABLES.includes(W[wn].tipo) && Object.values(filas).some(a => LOGICA.mencionaHabilitado(a)))
    .map(([wn]) => cid(wn))))];
  const prepara = apagables.length ? `    static bool preparado = false;
    if (!preparado) { preparado = true; ${apagables.map(id => `apagable(${id});`).join(' ')} }
` : '';
  const cuerpo = prepara + (BL.length === 1
    ? `    static int visto = -1;
    if ((int)s->st == visto) return;
    visto = (int)s->st;
${aspectoDe(BL[0])}`
    : BL.filter(b => Object.keys(b.looks).length).map(b => {
        const v = 'visto_' + cid(b.name);
        return `    static int ${v} = -1;   /* bloque ${b.name} */
    if ((int)s->${b.campo} != ${v}) {
        ${v} = (int)s->${b.campo};
${aspectoDe(b).split('\n').map(l => '    ' + l).join('\n')}
    }`;
      }).join('\n'));
  const apoyo = apagables.length ? `/* Un elemento apagado (enabled: no en looks) se ve al 40 % y no se toca.
 *
 * Se atenua POR PARTES —fondo, borde y texto— y no con la opacidad del
 * objeto entero: esa obliga a LVGL a pintarlo en un bufer intermedio del
 * tamano del boton, y con varios apagados a la vez la reserva de memoria
 * se agota. El tema, ademas, los agrisaria con un "recolor", que en LVGL
 * 9.5 tambien va por capa: se anula. Lo de no responder lo hace el propio
 * LV_STATE_DISABLED: LVGL no le manda toques ni teclas, y la navegacion
 * con botones fisicos se lo salta. */
static void apagable(lv_obj_t *o)
{
    static const lv_style_selector_t P[] = { LV_PART_MAIN, LV_PART_INDICATOR, LV_PART_KNOB };
    for (unsigned i = 0; i < sizeof(P) / sizeof(P[0]); i++) {
        lv_style_selector_t sel = P[i] | LV_STATE_DISABLED;
        lv_obj_set_style_recolor_opa(o, LV_OPA_TRANSP, sel);
        lv_obj_set_style_bg_opa(o, LV_OPA_40, sel);
        lv_obj_set_style_border_opa(o, LV_OPA_40, sel);
    }
    lv_obj_set_style_text_opa(o, LV_OPA_40, LV_PART_MAIN | LV_STATE_DISABLED);   /* la etiqueta lo hereda */
}

` : '';
  return apoyo + `/* --- aspecto por estado: la seccion looks del manifiesto ---
 *
 * Solo se toca cuando el estado CAMBIA. Poner un color igual al que ya
 * tiene tambien invalida el objeto, y hacerlo en cada refresco traeria
 * de vuelta el parpadeo que tanto costo quitar. Lo que un estado no
 * menciona vuelve a como esta en el diseno. */
static void aplicar_aspecto(const snapshot_t *s)
{
${cuerpo}
}

`;
}

/* Los ajustes de la logica (setting) que se escriben desde la pantalla:
   los que guarda un Campo de texto. Solo esos llevan su EV_SET_, asi un
   proyecto que no los usa genera lo mismo que antes. */
/* Los widgets que escriben la variable a la que estan enlazados */
const ESCRIBEN = new Set(['slider', 'toggle', 'checkbox', 'dropdown', 'roller', 'spinbox', 'textarea', 'list']);
function ajustesDesdePantalla(){
  const nombres = new Set(E.pantallas.flatMap(s => s.widgets).filter(w => ESCRIBEN.has(w.tipo) && w.bind).map(w => w.bind));
  return variables().filter(v => v.tipoLogica === 'setting' && nombres.has(v.nombre));
}

function genEstado(){
  const vs = variables();
  const estados = estadosProyecto();
  const eventos = [];
  for (const v of vs) if (v.dir === 'escritura' || v.dir === 'ajuste')
    eventos.push({ nombre: 'EV_SET_' + MAY(v.nombre), var: v });
  for (const v of ajustesDesdePantalla()) eventos.push({ nombre: 'EV_SET_' + MAY(v.nombre), var: v });
  for (const s of E.pantallas) for (const w of s.widgets)
    if (w.evento) eventos.push({ nombre: MAY(w.evento), libre:true });
  for (const b of botonesLogica()) eventos.push({ nombre: 'EV_L_' + MAY(b), libre:true });
  for (const b of botonesSuelta()) eventos.push({ nombre: 'EV_S_' + MAY(b), libre:true });
  for (const v of varsConPaso()) eventos.push({ nombre: 'EV_INC_' + MAY(v.nombre), libre:true });

  const campos = vs.map(v => v.booleano
    ? `    bool    ${cid(v.nombre)};`
    : `    float   ${cid(v.nombre)};`).join('\n');

  return cabecera('state.h — instantanea, estados y eventos',
`El contrato entre las dos tareas. La de control escribe; la de interfaz
solo lee, y siempre con snapshot_read().`) +
`#ifndef TELAR_STATE_H
#define TELAR_STATE_H

#include <Arduino.h>
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/queue.h"

/* Estados de la maquina, del manifiesto */
typedef enum {
${estados.map((s,i) => `    ST_${MAY(s)}${i?'':' = 0'},`).join('\n')}
    ST__CUANTOS
} app_state_t;
${enumsBloques()}
extern const char *ST_NOMBRES[ST__CUANTOS];

/* Eventos que la interfaz puede encolar. Nunca escribe salidas: las pide. */
typedef enum {
${eventos.map((e,i) => `    ${e.nombre}${i?'':' = 1'},`).join('\n') || '    EV__NINGUNO = 1,'}
    EV__CUANTOS
} event_type_t;

typedef struct { uint8_t type; int32_t arg; } event_msg_t;

/* La instantanea: un campo por variable del manifiesto */
typedef struct {
    app_state_t st;
${camposBloques()}
    /* LA BASE DE TIEMPO
     *
     * t_ms es el reloj de la placa en el instante de esta instantanea.
     * ms_en_estado es cuanto lleva el aparato en el estado actual, y se
     * pone a cero solo cada vez que st cambia.
     *
     * Ese segundo campo evita el error clasico de las maquinas de estado:
     * guardar un millis() al entrar y olvidarse de guardarlo en alguna de
     * las transiciones. Aqui no hay nada que recordar. */
    uint32_t t_ms;
    uint32_t ms_en_estado;

${campos || '    /* sin variables todavia */'}
    bool  enlace_ok;      /* solo tiene sentido con dos nodos */
    char  fallo[48];
} snapshot_t;

extern SemaphoreHandle_t state_mtx;
extern QueueHandle_t     event_q;

void control_start(void);
void snapshot_read(snapshot_t *dst);   /* la interfaz solo llama a esto */

/* Encolar un evento. Devuelve false si la cola esta llena: nunca bloquea
   la tarea de interfaz, que dejaria la pantalla congelada. */
static inline bool event_send(event_type_t t, int32_t arg) {
    event_msg_t m = { (uint8_t)t, arg };
    return xQueueSend(event_q, &m, 0) == pdTRUE;
}

#endif /* TELAR_STATE_H */
`;
}

/* =====================================================================
 * hal.h — la frontera con el hardware
 * ===================================================================== */
function genHal(){
  const vs = variables();
  const lee  = vs.filter(v => v.dir === 'lectura');
  /* Una salida del OTRO nodo no tiene funcion aqui: la pantalla no la
     escribe, la pide por el enlace. */
  const esc  = vs.filter(v => v.dir === 'escritura' && !v.remota);
  return cabecera('hal.h — frontera con el hardware',
`Una funcion por cada cosa fisica. Mientras no haya hardware, las
implementa plant_sim.cpp con un modelo; cuando lo haya, se sustituye
ese fichero por hal.cpp y no se toca nada mas.`) +
`#ifndef TELAR_HAL_H
#define TELAR_HAL_H

#include <Arduino.h>

void hal_init(void);

${lee.map(v => `${v.booleano?'bool ':'float'} hal_leer_${cid(v.nombre)}(void);`).join('\n') || '/* nada que leer todavia */'}

${esc.map(v => `void  hal_escribir_${cid(v.nombre)}(${v.booleano?'bool':'float'} v);`).join('\n') || '/* nada que escribir todavia */'}

#endif /* TELAR_HAL_H */
`;
}

function genPlantSim(){
  const vs = variables();
  /* Lo que mide OTRO nodo no se simula aqui: llega por el enlace. */
  const lee = vs.filter(v => v.dir === 'lectura' && !v.remota);
  const remotas = vs.filter(v => v.dir === 'lectura' && v.remota);
  const esc = vs.filter(v => v.dir === 'escritura' && !v.remota);
  return cabecera('plant_sim.cpp — la planta simulada',
`Deja que la aplicacion entera funcione sin un solo cable conectado.
Sirve para probar la logica, dar clase sin placas y ensayar los caminos
de fallo. Al pasar a hardware, este fichero se borra y en su lugar va
hal.cpp con las mismas funciones.`) +
`#include "hal.h"
#include <math.h>
${remotas.length ? '#include "enlace.h"\n' : ''}
void hal_init(void) { /* el simulador no necesita nada */ }

${remotas.map(v => `/* ${v.nombre} la mide el nodo de control; aqui solo se recoge */
float hal_leer_${cid(v.nombre)}(void) { return enlace_${cid(v.nombre)}(); }`).join('\n\n')}

${esc.map(v => `static ${v.booleano?'bool':'float'} sal_${cid(v.nombre)} = ${v.booleano?'false':'0.0f'};
void hal_escribir_${cid(v.nombre)}(${v.booleano?'bool':'float'} v) { sal_${cid(v.nombre)} = v; }`).join('\n\n')}

${lee.map((v,i) => {
  if (v.booleano) return `bool hal_leer_${cid(v.nombre)}(void) {
    /* Simulado: conmuta cada 4 s */
    return ((millis() / 4000) % 2) == 0;
}`;
  const min = v.min ?? 0, max = v.max ?? 100, amp = (max-min)/2, med = min+amp;
  return `float hal_leer_${cid(v.nombre)}(void) {
    /* Simulado: seno lento entre ${min} y ${max}, con algo de ruido */
    float t = millis() / 1000.0f;
    float base = ${med.toFixed(2)}f + ${(amp*0.85).toFixed(2)}f * sinf(t / ${(7+i*3)}.0f);
    return base + (random(-100, 100) / 100.0f) * ${(amp*0.02).toFixed(3)}f;
}`;}).join('\n\n')}
`;
}

/* =====================================================================
 * control.cpp — la tarea que decide
 * ===================================================================== */
function genControl(){
  const vs = variables();
  const lee = vs.filter(v => v.dir === 'lectura');
  const esc = vs.filter(v => v.dir === 'escritura' || v.dir === 'ajuste').concat(ajustesDesdePantalla());
  const estados = estadosProyecto();

  return cabecera('control.cpp — la tarea de control',
`Corre en el nucleo 0 a periodo fijo. Es la UNICA que toca salidas y la
unica que escribe la instantanea. La interfaz vive en el nucleo 1 y solo
lee.

El periodo se marca con vTaskDelayUntil, no con delay(): delay() acumula
deriva porque no descuenta lo que tardo el propio ciclo.`) +
`#include "state.h"
#include "hal.h"
#include "src/logic/reglas.h"
${logicaModelo() ? '#include "logica.h"\n' : ''}${tieneBuses(nodoHMI()) ? '#include "buses.h"\n' : ''}
${hayEnlace() ? '#include "enlace.h"\n' : ''}
SemaphoreHandle_t state_mtx = NULL;
QueueHandle_t     event_q   = NULL;

const char *ST_NOMBRES[ST__CUANTOS] = { ${estados.map(s => `"${s}"`).join(', ')} };

static snapshot_t S;     /* el estado vivo; protegido por state_mtx */

void snapshot_read(snapshot_t *dst) {
    xSemaphoreTake(state_mtx, portMAX_DELAY);
    *dst = S;
    xSemaphoreGive(state_mtx);
}

/* Los eventos se atienden DENTRO del mutex: modifican estado compartido */
static void atender_eventos(void) {
    event_msg_t m;
    while (xQueueReceive(event_q, &m, 0) == pdTRUE) {
        switch (m.type) {
${esc.map(v => `        case EV_SET_${MAY(v.nombre)}:
            S.${cid(v.nombre)} = ${v.booleano ? 'm.arg != 0' : `m.arg / 10.0f`};   /* llega en decimas */
            break;`).join('\n') || '        /* sin variables de escritura: todo cae en el default de abajo */'}
${varsConPaso().map(v => `        case EV_INC_${MAY(v.nombre)}:   /* un boton sube o baja: se suma el paso y se acota al rango */
            S.${cid(v.nombre)} += m.arg / 10.0f;
            if (S.${cid(v.nombre)} < ${flt(v.min)}) S.${cid(v.nombre)} = ${flt(v.min)};
            if (S.${cid(v.nombre)} > ${flt(v.max)}) S.${cid(v.nombre)} = ${flt(v.max)};
            break;
`).join('')}${botonesLogica().map(b => `        case EV_L_${MAY(b)}: logica_boton(&S, m.type); break;\n`).join('')}${botonesSuelta().map(b => `        case EV_S_${MAY(b)}: logica_boton(&S, m.type); break;   /* al soltar */\n`).join('')}        default:
            reglas_evento(&S, m.type, m.arg);   /* lo tuyo, en src/logic/ */
            break;
        }
    }
}

static void paso(void) {
${hayEnlace() ? `    /* Vaciar el puerto del enlace. Va AQUI, en la tarea de control
       —nucleo 0—, y no en loop(), que vive en el mismo nucleo que LVGL.
       Puesto en loop() hacen falta despertares cada pocos milisegundos
       para no perder bytes, y esos despertares compiten justo con quien
       esta repintando la pantalla. Peor: si LVGL acapara ese nucleo,
       loop() deja de correr, el buffer del puerto se llena y las tramas
       llegan rotas. */
    enlace_atender();

` : ''}    /* 0. el reloj, antes que nada: las reglas y las lecturas de este
       ciclo tienen que ver todas la MISMA hora. */
    static app_state_t st_previo = (app_state_t)0;
    static uint32_t t_entrada = 0;
    S.t_ms = millis();
    if (S.st != st_previo) { st_previo = S.st; t_entrada = S.t_ms; }
    S.ms_en_estado = S.t_ms - t_entrada;

${varsRemotas().length ? '    S.enlace_ok = enlace_vivo();\n\n' : ''}    /* 1. leer el mundo */
${lee.map(v => `    S.${cid(v.nombre)} = hal_leer_${cid(v.nombre)}();`).join('\n') || '    /* nada que leer */'}

${logicaModelo() ? '    /* 1b. la logica del manifiesto: logica.cpp, generado */\n    logica_paso(&S);\n\n' : ''}    /* 2. decidir — tu codigo, en src/logic/reglas.cpp */
    reglas_paso(&S);

    /* 3. actuar */
${vs.filter(v => v.dir==='escritura' && !v.remota).map(v => `    hal_escribir_${cid(v.nombre)}(S.${cid(v.nombre)});`).join('\n')
  || (varsOrden().length ? '' : '    /* nada que escribir */')}
${hayEnlace() ? `    /* Las salidas del otro nodo no se escriben aqui: se piden. Solo
       cuando cambian, o el enlace se llenaria de repeticiones a 20 Hz. */
    enlace_ordenar(&S);
${varsPulso().length ? `
    /* Un boton es un pulso, no un interruptor: vale 1 el ciclo en que se
       pulsa y vuelve a 0 en cuanto la orden ha salido. */
${varsPulso().map(v => `    S.${cid(v.nombre)} = false;`).join('\n')}` : ''}` : ''}
}

static void control_task(void *arg) {
    const TickType_t periodo = pdMS_TO_TICKS(50);      /* 20 Hz */
    TickType_t ultimo = xTaskGetTickCount();
    for (;;) {
        xSemaphoreTake(state_mtx, portMAX_DELAY);
        atender_eventos();
        paso();
        xSemaphoreGive(state_mtx);
        vTaskDelayUntil(&ultimo, periodo);
    }
}

void control_start(void) {
    state_mtx = xSemaphoreCreateMutex();
    event_q   = xQueueCreate(12, sizeof(event_msg_t));

    memset(&S, 0, sizeof(S));
    S.st = ST_${MAY(estados[0])};
    S.enlace_ok = true;
${[...E.ajustes.map(a => `    S.${cid(a.nombre)} = ${flt(a.pordefecto ?? 0)};`),
   /* salidas con valor al arrancar: tambien las del otro nodo, o la primera
      orden que saliera de aqui seria un 0 */
   ...vs.filter(v => v.dir === 'escritura' && v.inicial !== undefined).map(v => `    S.${cid(v.nombre)} = ${flt(v.inicial)};   /* valor al arrancar */`)].join('\n')}

    hal_init();
${tieneBuses(nodoHMI()) ? '    buses_init();\n' : ''}${logicaModelo() ? '    logica_init(&S);\n' : ''}    reglas_init(&S);

    /* Nucleo 0: la interfaz vive en el 1 y no deben pelearse */
    xTaskCreatePinnedToCore(control_task, "control", 4096, NULL, 3, NULL, 0);
}
`;
}

/* =====================================================================
 * src/logic/ — TU codigo. La regeneracion no lo pisa.
 * ===================================================================== */
function genReglasH(){
  return `/*
 * reglas.h — TU CODIGO
 *
 * Este fichero y reglas.cpp son tuyos. Telar Studio NO los sobrescribe
 * al regenerar: la frontera entre lo generado y lo tuyo son las
 * CARPETAS, no comentarios magicos dentro de un fichero.
 */
#ifndef TELAR_REGLAS_H
#define TELAR_REGLAS_H

#include "../../state.h"

void reglas_init(snapshot_t *s);
void reglas_paso(snapshot_t *s);
void reglas_evento(snapshot_t *s, uint8_t evento, int32_t arg);

#endif /* TELAR_REGLAS_H */
`;
}

function genReglasCpp(){
  const estados = estadosProyecto();
  const lee = variables().filter(v => v.dir === 'lectura' && !v.booleano);
  return `/*
 * reglas.cpp — TU CODIGO
 *
 * Aqui va lo que hace tu aparato. Se llama 20 veces por segundo desde la
 * tarea de control, con el mutex ya tomado: puedes leer y escribir el
 * estado sin preocuparte.
 *
 * Telar Studio no vuelve a tocar este fichero.
 */
#include "reglas.h"

void reglas_init(snapshot_t *s) {
    /* Se llama una vez al arrancar */
}

void reglas_paso(snapshot_t *s) {
    /* Se llama cada 50 ms. Ejemplo de maquina de estados: */
    switch (s->st) {
${estados.map(e => `    case ST_${MAY(e)}:
        /* TODO: que hace el aparato en ${e} */
        break;`).join('\n')}
    default: break;
    }
${lee.length ? `
    /* --- UN TEMPORIZADOR ---
     *
     * No hay widget que cuente el tiempo: quien cuenta es esta funcion,
     * que se llama cada 50 ms. Lo que el sistema te da es el reloj:
     *
     *   s->t_ms          el reloj de la placa, en milisegundos
     *   s->ms_en_estado  cuanto llevas en el estado actual
     *
     * ms_en_estado se pone a cero SOLO cada vez que cambias de estado,
     * asi que un retardo se escribe sin guardar nada:
     *
     *   case ST_CALENTANDO:
     *       if (s->ms_en_estado > 30000) s->st = ST_LISTO;   // 30 s
     *       break;
     *
     * Para una cuenta atras que se vea en pantalla, pon un widget
     * Tiempo enlazado a un ajuste y restale los segundos:
     *
     *   s->restante = 120.0f - s->ms_en_estado / 1000.0f;
     *   if (s->restante < 0) s->restante = 0;
     *
     * Y si necesitas algo periodico dentro de un mismo estado, cuenta
     * ciclos en vez de mirar el reloj: 20 ciclos son un segundo justo.
     *
     *   static uint16_t n = 0;
     *   if (++n >= 20) { n = 0; ... }      // una vez por segundo
     */

    /* Ejemplo de alarma por umbral:
    if (s->${cid(lee[0].nombre)} > ${(lee[0].max*0.9).toFixed(1)}f) {
        s->st = ST_${MAY(estados[estados.length-1])};
        snprintf(s->fallo, sizeof(s->fallo), "${lee[0].nombre} fuera de rango");
    } */` : ''}
}

void reglas_evento(snapshot_t *s, uint8_t evento, int32_t arg) {
    /* Los eventos de los botones que declaraste en el editor llegan aqui */
    switch (evento) {
    default: break;
    }
}
`;
}

/* =====================================================================
 * src/ui/ — las pantallas
 *
 * Cada pantalla se construye UNA vez al arrancar y se refresca a 5 Hz,
 * pero solo la que esta a la vista: repintar una pantalla oculta es
 * trabajo tirado, y con 800x480 se nota.
 * ===================================================================== */
/* En una pantalla de un color no hay colores: cada uno se queda en
   blanco o en negro. El corte va bajo (30 %) a proposito: el fondo y las
   superficies del tema son oscuros y se van a negro, y todo lo que se
   quiere VER —texto, acento, alarma— sale en blanco. Con el corte al
   50 % el rojo de alarma caia en negro sobre negro y desaparecia. */
const colorC = hex => {
  const h = String(hex).replace('#','').toLowerCase();
  if (typeof placa === 'function' && typeof esMono === 'function' && esMono(placa())){
    const n = parseInt(h.slice(0, 6), 16) || 0;
    const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    return lum > 0.3 ? '0xffffff' : '0x000000';
  }
  return '0x' + h;
};

/* El simbolo C de una fuente. Si LVGL la trae compilada se usa la suya;
   si no, la que genera fuentes/generar.cmd a partir de la Montserrat de
   la libreria. El nombre distinto deja claro de un vistazo cual es cual. */
const simboloFuente = (px, variante = 'medium') => variante !== 'medium'
  ? nombreFuente({ px, variante })                /* negrita y cursiva: siempre propias */
  : fuenteEsPropia(px) ? `telar_montserrat_${px}` : `lv_font_montserrat_${px}`;

const CREADOR = {
  label:'lv_label_create', value:'lv_label_create', timer:'lv_label_create', panel:'lv_obj_create',
  button:'lv_button_create', bar:'lv_bar_create', 'arc-gauge':'lv_arc_create',
  'semicircle-gauge':'lv_arc_create', chart:'lv_chart_create', slider:'lv_slider_create',
  toggle:'lv_switch_create', led:'lv_led_create', 'state-strip':'lv_obj_create',
  line:'lv_obj_create', checkbox:'lv_checkbox_create', dropdown:'lv_dropdown_create',
  spinbox:'lv_spinbox_create', textarea:'lv_textarea_create', scale:'lv_scale_create',
  spinner:'lv_spinner_create', image:'lv_image_create',
  list:'lv_list_create', table:'lv_table_create', msgbox:'lv_msgbox_create',
  tabview:'lv_tabview_create', roller:'lv_roller_create',
  buttonmatrix:'lv_buttonmatrix_create', keyboard:'lv_keyboard_create'
  /* qrcode no esta aqui: se crea aparte, entre guardas de LV_USE_QRCODE */
};

/* Texto listo para C. Los caracteres que la fuente no tiene se quitan
   AQUI tambien, para que el .c no lleve bytes que la placa no sabe
   dibujar: el editor ya avisa, pero mas vale no emitir basura. */
/* Con fuente PROPIA las tildes si se dibujan: esa fuente se genera con
   los glifos que usa el texto (o es Chivo/Plex, que traen Latin-1 entero).
   Quitarlas aqui era mentir: el lienzo ensenaba "TENSIÓN" y la placa
   pintaba "TENSION". Solo se quitan cuando la letra es una Montserrat
   compilada de LVGL, que de verdad no las tiene. */
const fuentePropiaDe = w => !!w && fuenteEsPropia(fuenteEfectiva(w), varianteFuente(w));
const txtC = (s, w) => (fuentePropiaDe(w) ? String(s ?? '') : quitarTildes(s)).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/* Declaraciones estaticas que necesita cada widget */
function genDecl(w){
  const id = cid(w.nombre);
  if (!GENERABLES.has(w.tipo)) return '';
  if (COMPONENTES[w.tipo]) return COMPONENTES[w.tipo].decl(w, id);
  let d = `static lv_obj_t *${id};\n`;
  if (w.tipo === 'chart')
    (w.series||[]).slice(0,2).forEach((_,i) => { d += `static lv_chart_series_t *${id}_s${i};\n`; });
  if (w.tipo === 'state-strip')
    d += `static lv_obj_t *${id}_chip[ST__CUANTOS];\n`;
  return d;
}

/* El texto de un botón en C: el icono va FUERA de las comillas, porque
   LV_SYMBOL_OK es una macro que se expande a su propia cadena y dos
   cadenas seguidas las une el compilador. Sin texto, solo el icono; sin
   nada, vacío. Lo mismo que rotulo() en el lienzo. */
function rotuloC(w, texto){
  const t = String(texto ?? ''), ic = iconoValido(w.icono) ? iconoC(w.icono) : '';
  if (ic && t) return `${ic} " ${txtC(t, w)}"`;
  return ic || `"${txtC(t, w)}"`;
}

/* Subrayado, tachado, espaciado y alineacion: LVGL los dibuja sin fuente
   extra. Solo se emite lo que el widget tiene puesto. */
function estiloTextoC(w, obj, ind = ''){
  if (!TEXTO_ESTILABLE.has(w.tipo)) return [];
  const e = w.estilo || {}, L = [];
  const decor = [e.subrayado && 'LV_TEXT_DECOR_UNDERLINE', e.tachado && 'LV_TEXT_DECOR_STRIKETHROUGH'].filter(Boolean);
  if (decor.length) L.push(`${ind}lv_obj_set_style_text_decor(${obj}, ${decor.join(' | ')}, LV_PART_MAIN);`);
  if (e.espaciado) L.push(`${ind}lv_obj_set_style_text_letter_space(${obj}, ${Math.round(e.espaciado)}, LV_PART_MAIN);`);
  const al = ALINEABLE.has(w.tipo) && { centro: 'LV_TEXT_ALIGN_CENTER', derecha: 'LV_TEXT_ALIGN_RIGHT', izquierda: 'LV_TEXT_ALIGN_LEFT' }[e.alinear];
  if (al) L.push(`${ind}lv_obj_set_style_text_align(${obj}, ${al}, LV_PART_MAIN);`);
  return L;
}

/* Un componente en automatico ya trae su caja calculada por el editor:
   aqui solo se usa, igual que en los widgets clasicos. */

/* monoTinta() vive en telar-studio.html; fuera de la pagina no hay OLED */
const monoGen = () => typeof monoTinta === 'function' ? monoTinta() : null;

/* El canal de una barra o un deslizador en una OLED: el fondo con un
   contorno de 1 px, y lo lleno en tinta. El relleno se pinta encima del
   contorno (LVGL dibuja el borde del canal antes que el indicador), igual
   que en el lienzo. */
function canalMono(id, pon){
  const M = monoGen();
  pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(M.vacio)}), LV_PART_MAIN);`);
  pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_COVER, LV_PART_MAIN);`);
  pon(`lv_obj_set_style_border_width(${id}, 1, LV_PART_MAIN);`);
  pon(`lv_obj_set_style_border_color(${id}, lv_color_hex(${colorC(M.tinta)}), LV_PART_MAIN);`);
  pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(M.tinta)}), LV_PART_INDICATOR);`);
}

/* Traduce un widget del manifiesto a llamadas de LVGL 9 */
function genWidget(w){
  const S = est(w), id = cid(w.nombre), L = [];
  /* El MISMO calculo que hace el lienzo. Antes aqui se ponia el tamano
     del tema y en el editor uno proporcional al alto, asi que un numero
     enorme en pantalla salia a 14 px en la placa. */
  const fuente = fuenteEfectiva(w);
  const variante = varianteFuente(w);   /* normal, negrita, cursiva */
  const pon = s => L.push('    ' + s);

  if (!GENERABLES.has(w.tipo))
    return `    /* TODO: "${w.nombre}" es de tipo ${w.tipo}, que el generador todavia\n`
         + `       no construye. Anadelo a mano aqui. */\n`;

  /* El QR va aparte: lv_qrcode solo existe con LV_USE_QRCODE a 1 en
     lv_conf.h. Entre guardas, el sketch compila igual sin el, y en su
     sitio queda un aviso en pantalla que dice que falta encenderlo. */
  if (w.tipo === 'qrcode') return genQR(w, fuente, variante);

  /* Un componente industrial sabe construirse solo */
  if (COMPONENTES[w.tipo]){
    pon(`/* ${w.nombre} — ${WIDGETS[w.tipo].nombre} */`);
    COMPONENTES[w.tipo].crear(w, id, pon);
    return L.join('\n') + '\n';
  }

  /* La linea inclinada es un lv_line entre dos puntos. Los puntos salen
     de puntosLinea(), lo mismo que dibuja el lienzo; static porque LVGL
     guarda el puntero al array, no una copia. La recta sigue abajo, como
     siempre: un rectangulo de color. */
  if (w.tipo === 'line' && w.diag){
    const Lp = puntosLinea(w);
    pon(`/* ${w.nombre} — ${WIDGETS[w.tipo].nombre} inclinada */`);
    pon(`static lv_point_precise_t ${id}_puntos[] = { {${Lp.x1}, ${Lp.y1}}, {${Lp.x2}, ${Lp.y2}} };`);
    pon(`${id} = lv_line_create(p);`);
    pon(`lv_line_set_points(${id}, ${id}_puntos, 2);`);
    pon(`lv_obj_set_pos(${id}, ${w.x}, ${w.y});`);
    pon(`lv_obj_set_size(${id}, ${w.w}, ${w.h});`);
    pon(`lv_obj_set_style_line_width(${id}, ${Lp.g}, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_line_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_MAIN);`);
    return L.join('\n') + '\n';
  }

  const v = variables().find(x => x.nombre === w.bind);
  pon(`/* ${w.nombre} — ${WIDGETS[w.tipo].nombre} */`);
  pon(`${id} = ${CREADOR[w.tipo]}(p);`);
  /* Lo que se ve puede ser mas pequeno que la caja —un deslizador es un
     trazo fino centrado en un area que se toca con el dedo— o estar en
     otro sitio —un arco se centra en su circunferencia, no en la caja—.
     geometria() da la MISMA medida que dibuja el lienzo, para los dos
     casos, y por eso aqui ya no hay ninguna excepcion. */
  const G = geometria(w);
  pon(`lv_obj_set_pos(${id}, ${w.x + G.dx}, ${w.y + G.dy});`);
  /* Si en el editor la caja se cine al texto, aqui tiene que hacer lo
     mismo: LV_SIZE_CONTENT. Emitir los pixeles calculados funcionaria
     casi siempre, pero el ancho del editor es una aproximacion y con un
     texto largo acabaria recortado. Que lo mida LVGL, que sabe. */
  if (w.auto && AUTOAJUSTABLES.has(w.tipo))
    pon(`lv_obj_set_size(${id}, LV_SIZE_CONTENT, LV_SIZE_CONTENT);`);
  else
    pon(`lv_obj_set_size(${id}, ${G.w}, ${G.h});`);

  switch (w.tipo){
  case 'label':
  case 'value':
  case 'timer':
    /* El reloj nace con el molde entero puesto, no con un "0": si la caja
       creciera en el primer refresco daria un salto en pantalla. */
    pon(`lv_label_set_text(${id}, "${w.tipo === 'label' ? txtC(w.texto||'Texto', w) : (w.tipo === 'timer' ? '00:00' : '--')}");`);
    pon(`lv_obj_set_style_text_color(${id}, lv_color_hex(${colorC(S.texto)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    estiloTextoC(w, id).forEach(pon);
    break;
  case 'image':
    if (w.img && w.img.datos){
      pon(`lv_image_set_src(${id}, &img_${id});`);
      /* La imagen se escala al tamano de la caja del editor. Sin esto,
         LVGL la pinta a su tamano natural y se sale del widget. */
      if (w.img.w !== w.w || w.img.h !== w.h){
        pon(`lv_image_set_scale(${id}, ${Math.round(256 * Math.min(w.w / w.img.w, w.h / w.img.h))});`);
        pon(`lv_obj_set_size(${id}, ${w.w}, ${w.h});`);
      }
    } else {
      pon(`/* "${w.nombre}" no tiene imagen cargada todavia */`);
    }
    break;
  case 'panel':
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.sup)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_border_color(${id}, lv_color_hex(${colorC(S.borde)}), LV_PART_MAIN);`);
    pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_SCROLLABLE);`);
    break;
  case 'line':
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_border_width(${id}, 0, LV_PART_MAIN);`);
    break;
  case 'button': {
    /* El mismo color de texto que pinta el lienzo: oscuro sobre el
       acento salvo que el usuario haya elegido otro. Sin esta linea el
       tema por defecto de LVGL lo pinta blanco y no se parece en nada. */
    /* Los colores de su clase (normal, seleccionado, marcha, paro), los
       mismos que pinta el lienzo. Borde fino, esquinas del tema y sin
       sombra: la sombra del tema de LVGL ensucia un diseno plano. */
    const CB = colorBoton(w), sobre = CB.texto;
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(CB.fondo)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_border_color(${id}, lv_color_hex(${colorC(CB.borde)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_border_width(${id}, 1, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_radius(${id}, ${radioBoton(w)}, LV_PART_MAIN);`);   /* el suyo, o el del tema */
    pon(`lv_obj_set_style_shadow_width(${id}, 0, LV_PART_MAIN);`);
    pon(`{ lv_obj_t *lbl = lv_label_create(${id});`);
    /* El icono va FUERA de las comillas: LV_SYMBOL_OK es una macro que
       se expande a su propia cadena, y dos cadenas seguidas las une el
       compilador. Meterlo dentro imprimiria el nombre de la macro. */
    pon(`  lv_label_set_text(lbl, ${rotuloC(w, w.texto)});`);
    pon(`  lv_obj_set_style_text_color(lbl, lv_color_hex(${colorC(sobre)}), LV_PART_MAIN);`);
    pon(`  lv_obj_set_style_text_font(lbl, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    estiloTextoC(w, 'lbl', '  ').forEach(pon);
    pon(`  lv_obj_center(lbl); }`);
    if (w.destino)     pon(`lv_obj_add_event_cb(${id}, cb_ir_${cid(w.destino)}, LV_EVENT_CLICKED, NULL);`);
    else if (enLogica(w) && botonesSuelta().includes(w.nombre)){
      /* on release / hold: la accion va al TOCAR (PRESSED, no CLICKED, que
         llega al soltar) y al levantar el dedo se avisa aparte. PRESS_LOST
         cuenta como soltar: si el dedo se sale del boton, lo que estaba
         encendido por hold tiene que apagarse igual. */
      pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_PRESSED, NULL);`);
      if (repiteLogica(w)) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_LONG_PRESSED_REPEAT, NULL);`);
      pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_RELEASED, NULL);`);
      pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_PRESS_LOST, NULL);`);
    }
    else if (enLogica(w) && repiteLogica(w)){
      /* repeat: yes. PRESSED da el primer paso nada mas tocar, y
         LONG_PRESSED_REPEAT sigue mientras no se suelta (tras 400 ms, cada
         100 ms). Con CLICKED ese primer paso llegaria al soltar y, despues
         de mantenerlo, sumaria uno de mas. */
      pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_PRESSED, NULL);`);
      pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_LONG_PRESSED_REPEAT, NULL);`);
    }
    else if (enLogica(w)) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_CLICKED, NULL);`);
    else if (w.evento) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_CLICKED, NULL);`);
    else if (v && v.booleano) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_CLICKED, NULL);`);
    else if (ordenPaso(w)){
      /* Subir o bajar: si repite, el primer paso al tocar y luego seguido
         mientras no se suelta, igual que repeat: yes en la logica */
      if (ordenPaso(w).repite){
        pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_PRESSED, NULL);`);
        pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_LONG_PRESSED_REPEAT, NULL);`);
      }
      else pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_CLICKED, NULL);`);
    }
    break;
  }
  case 'bar':
    pon(`lv_bar_set_range(${id}, ${Math.round(v?.min ?? 0)}, ${Math.round(v?.max ?? 100)});`);
    /* En una OLED: el canal con contorno (ver monoTinta) */
    if (monoGen()){ canalMono(id, pon); break; }
    /* EL CANAL, OPACO.
       El tema por defecto le pone a esta parte el estilo
       bg_color_primary_muted, que trae bg_opa = LV_OPA_20: el color sale
       al 20% y sobre un fondo oscuro desaparece. Los arcos no lo sufren
       porque van por arc_color, que si es opaco, y por eso el mismo
       color se veia en un sitio y en el otro no. Sin esta linea el
       diseno y la placa no coinciden. */
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.sup)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_COVER, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_INDICATOR);`);
    break;
  case 'arc-gauge':
  case 'semicircle-gauge': {
    /* La geometria ya esta puesta arriba, desde geometria(). Aqui solo
       queda el grosor del trazo, que sale del mismo sitio. */
    pon(`lv_arc_set_range(${id}, ${Math.round(v?.min ?? 0)}, ${Math.round(v?.max ?? 100)});`);
    if (w.tipo === 'semicircle-gauge'){
      pon(`lv_arc_set_bg_angles(${id}, 180, 360);`);
      pon(`lv_arc_set_rotation(${id}, 0);`);
    }
    pon(`lv_obj_set_style_arc_width(${id}, ${G.grosor}, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_arc_width(${id}, ${G.grosor}, LV_PART_INDICATOR);`);
    pon(`lv_obj_set_style_arc_color(${id}, lv_color_hex(${colorC(S.sup)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_arc_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_INDICATOR);`);
    /* El mango es para arrastrar con el dedo. Esto solo indica, asi que
       sobra: en la placa salia un punto de color que el diseno no tenia. */
    pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_0, LV_PART_KNOB);`);
    pon(`lv_obj_set_style_pad_all(${id}, 0, LV_PART_KNOB);`);
    /* Un arco es interactivo por defecto; este solo indica */
    pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_CLICKABLE);`);
    break;
  }
  case 'chart': {
    pon(`lv_chart_set_type(${id}, LV_CHART_TYPE_LINE);`);
    pon(`lv_chart_set_point_count(${id}, 60);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.sup)}), LV_PART_MAIN);`);
    (w.series||[]).slice(0,2).forEach((sn,i) => {
      const vv = variables().find(x => x.nombre === sn);
      pon(`${id}_s${i} = lv_chart_add_series(${id}, lv_color_hex(${colorC(i ? E.tema.ok : S.acento)}), LV_CHART_AXIS_PRIMARY_Y);`);
      if (i === 0)
        pon(`lv_chart_set_range(${id}, LV_CHART_AXIS_PRIMARY_Y, ${Math.round(vv?.min ?? 0)}, ${Math.round(vv?.max ?? 100)});`);
    });
    break;
  }
  case 'slider':
    pon(`lv_slider_set_range(${id}, ${Math.round(v?.min ?? 0)}, ${Math.round(v?.max ?? 100)});`);
    /* EL CANAL, OPACO.
       El tema por defecto le pone a esta parte el estilo
       bg_color_primary_muted, que trae bg_opa = LV_OPA_20: el color sale
       al 20% y sobre un fondo oscuro desaparece. Los arcos no lo sufren
       porque van por arc_color, que si es opaco, y por eso el mismo
       color se veia en un sitio y en el otro no. Sin esta linea el
       diseno y la placa no coinciden. */
    if (monoGen()){
      canalMono(id, pon);
      pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(monoGen().tinta)}), LV_PART_KNOB);`);
    } else {
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.sup)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_COVER, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_INDICATOR);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_KNOB);`);
    }
    /* El mango. LVGL lo dibuja del alto del objeto MAS su relleno, asi
       que el relleno es la mitad de lo que le falta al trazo para llegar
       al diametro que pinta el lienzo. */
    pon(`lv_obj_set_style_pad_all(${id}, ${G.relleno}, LV_PART_KNOB);`);
    /* El trazo es fino a proposito, pero esto se toca con el dedo: el
       area sensible vuelve a ser la caja entera del editor. */
    if (G.toque > 0) pon(`lv_obj_set_ext_click_area(${id}, ${G.toque});`);
    if (v) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_VALUE_CHANGED, NULL);`);
    break;
  case 'toggle':
    if (monoGen()){
      /* OLED: apagado, contorno y mando de tinta; encendido, lleno de
         tinta y el mando hueco (del color del fondo) */
      const M = monoGen();
      pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(M.vacio)}), LV_PART_MAIN);`);
      pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_COVER, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_border_width(${id}, 1, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_border_color(${id}, lv_color_hex(${colorC(M.tinta)}), LV_PART_MAIN);`);
      pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(M.tinta)}), LV_PART_INDICATOR | LV_STATE_CHECKED);`);
      pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(M.tinta)}), LV_PART_KNOB);`);
      pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(M.vacio)}), LV_PART_KNOB | LV_STATE_CHECKED);`);
    } else {
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.sup)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_INDICATOR | LV_STATE_CHECKED);`);
    }
    /* Igual que el deslizador: la pastilla es mas pequena que la caja,
       pero el dedo apunta a la caja. */
    if (G.toque > 0) pon(`lv_obj_set_ext_click_area(${id}, ${G.toque});`);
    if (v) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_VALUE_CHANGED, NULL);`);
    break;
  case 'spinner': {
    /* el mismo grosor y la misma pista que el lienzo (geoSpinner); sin
       esto salia con los del tema de LVGL: 12 px, gris y azul */
    const g = geoSpinner(w);
    pon(`lv_obj_set_style_arc_width(${id}, ${g.grosor}, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_arc_width(${id}, ${g.grosor}, LV_PART_INDICATOR);`);
    pon(`lv_obj_set_style_arc_color(${id}, lv_color_hex(${colorC(g.pista)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_arc_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_INDICATOR);`);
    break;
  }
  case 'led':
    pon(`lv_led_set_color(${id}, lv_color_hex(${colorC(S.acento)}));`);
    pon(`lv_led_off(${id});`);
    break;
  case 'checkbox':
    pon(`lv_checkbox_set_text(${id}, "${txtC(w.texto||'', w)}");`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_text_color(${id}, lv_color_hex(${colorC(S.texto)}), LV_PART_MAIN);`);
    estiloTextoC(w, id).forEach(pon);
    if (monoGen()){
      /* OLED: el cuadro con contorno; marcada, lleno de tinta con la
         marca (su color es el text_color del indicador) en el del fondo */
      const M = monoGen();
      pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(M.vacio)}), LV_PART_INDICATOR);`);
      pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_COVER, LV_PART_INDICATOR);`);
      pon(`lv_obj_set_style_border_width(${id}, 1, LV_PART_INDICATOR);`);
      pon(`lv_obj_set_style_border_color(${id}, lv_color_hex(${colorC(M.tinta)}), LV_PART_INDICATOR);`);
      pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(M.tinta)}), LV_PART_INDICATOR | LV_STATE_CHECKED);`);
      pon(`lv_obj_set_style_text_color(${id}, lv_color_hex(${colorC(M.vacio)}), LV_PART_INDICATOR | LV_STATE_CHECKED);`);
    }
    if (v) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_VALUE_CHANGED, NULL);`);
    break;
  case 'dropdown':
    pon(`lv_dropdown_set_options(${id}, "${elementosDe(w).map(txtC).join('\\n')}");`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    /* la opcion elegida (0, 1, 2...) va a la variable */
    if (v) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_VALUE_CHANGED, NULL);`);
    break;
  case 'spinbox': {
    /* El numero entre sus botones - y +, como en el lienzo (geoContador).
       Los valores del lv_spinbox son enteros: con decimales se cuentan en
       decimas o centesimas, y lv_spinbox_set_digit_format pone la coma. */
    const G2 = geoContador(w), pot = 10 ** G2.dec;
    const lo = Math.round((v?.min ?? 0) * pot), hi = Math.round((v?.max ?? 100) * pot);
    const enteras = Math.max(1, String(Math.max(Math.abs(Math.trunc(v?.min ?? 0)), Math.abs(Math.trunc(v?.max ?? 100)))).length);
    pon(`lv_obj_set_pos(${id}, ${w.x + G2.bw + G2.gap}, ${w.y});`);
    pon(`lv_obj_set_size(${id}, ${G2.anchoNumero}, ${w.h});`);
    pon(`lv_spinbox_set_range(${id}, ${lo}, ${hi});`);
    pon(`lv_spinbox_set_digit_format(${id}, ${enteras + G2.dec}, ${G2.dec ? enteras : 0});`);
    pon(`lv_spinbox_set_step(${id}, ${Math.max(1, Math.round(G2.paso * pot))});`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_text_align(${id}, LV_TEXT_ALIGN_CENTER, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.sup)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_border_color(${id}, lv_color_hex(${colorC(S.borde)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_text_color(${id}, lv_color_hex(${colorC(S.texto)}), LV_PART_MAIN);`);
    /* sin el cursor de digito: se cambia con - y + */
    pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_TRANSP, LV_PART_CURSOR);`);
    pon(`lv_obj_set_style_text_color(${id}, lv_color_hex(${colorC(S.texto)}), LV_PART_CURSOR);`);
    const boton = (x, simbolo, fondo, letra, cb) => {
      pon(`{ lv_obj_t *b = lv_button_create(p);`);
      pon(`  lv_obj_set_pos(b, ${x}, ${w.y});`);
      pon(`  lv_obj_set_size(b, ${G2.bw}, ${w.h});`);
      pon(`  lv_obj_set_style_bg_color(b, lv_color_hex(${colorC(fondo)}), LV_PART_MAIN);`);
      pon(`  lv_obj_set_style_shadow_width(b, 0, LV_PART_MAIN);`);
      pon(`  lv_obj_t *l = lv_label_create(b);`);
      pon(`  lv_label_set_text(l, ${simbolo});`);
      pon(`  lv_obj_set_style_text_color(l, lv_color_hex(${colorC(letra)}), LV_PART_MAIN);`);
      pon(`  lv_obj_center(l);`);
      pon(`  lv_obj_add_event_cb(b, ${cb}, LV_EVENT_CLICKED, ${id});`);
      pon(`  lv_obj_add_event_cb(b, ${cb}, LV_EVENT_LONG_PRESSED_REPEAT, ${id}); }`);
    };
    boton(w.x, 'LV_SYMBOL_MINUS', S.sup, S.texto, 'contador_menos');
    boton(w.x + w.w - G2.bw, 'LV_SYMBOL_PLUS', S.acento, colorBotonSobre(S), 'contador_mas');
    if (v && !v.booleano) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_VALUE_CHANGED, NULL);`);
    break;
  }
  case 'textarea':
    pon(`lv_textarea_set_placeholder_text(${id}, "${txtC(w.texto)}");`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    /* guarda el numero en una variable: una linea, solo cifras, y al
       pulsar OK en el teclado (LV_EVENT_READY) lo manda */
    if (v && !v.booleano){
      pon(`lv_textarea_set_one_line(${id}, true);`);
      pon(`lv_textarea_set_accepted_chars(${id}, "0123456789.,-");`);
      pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_READY, NULL);`);
    }
    break;
  case 'scale': {
    /* La misma regla que el lienzo (geoEscala): rango, marcas, numeros,
       longitudes, colores y el margen de los extremos. Las marcas menores
       son ITEMS; las mayores y sus numeros, INDICATOR; la linea, MAIN. */
    const G3 = geoEscala(w);
    pon(`lv_scale_set_mode(${id}, LV_SCALE_MODE_${MODO_ESCALA[G3.orient]});`);
    pon(`lv_scale_set_range(${id}, ${G3.lo}, ${G3.hi});`);
    pon(`lv_scale_set_total_tick_count(${id}, ${G3.n});`);
    pon(`lv_scale_set_major_tick_every(${id}, ${G3.cada});`);
    pon(`lv_scale_set_label_show(${id}, true);`);
    /* los numeros de la escala son la parte INDICATOR */
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_INDICATOR);`);
    pon(`lv_obj_set_style_text_color(${id}, lv_color_hex(${colorC(E.tema.tenue)}), LV_PART_INDICATOR);`);
    pon(`lv_obj_set_style_length(${id}, ${G3.mayor}, LV_PART_INDICATOR);`);
    pon(`lv_obj_set_style_length(${id}, ${G3.menor}, LV_PART_ITEMS);`);
    pon(`lv_obj_set_style_line_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_line_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_INDICATOR);`);
    pon(`lv_obj_set_style_line_color(${id}, lv_color_hex(${colorC(E.tema.tenue)}), LV_PART_ITEMS);`);
    pon(`lv_obj_set_style_line_width(${id}, 2, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_line_width(${id}, 2, LV_PART_INDICATOR);`);
    pon(`lv_obj_set_style_line_width(${id}, 1, LV_PART_ITEMS);`);
    pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_TRANSP, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_pad_all(${id}, 0, LV_PART_MAIN);`);
    if (G3.horiz){
      pon(`lv_obj_set_style_pad_left(${id}, ${G3.margen}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_pad_right(${id}, ${G3.margen}, LV_PART_MAIN);`);
    } else {
      pon(`lv_obj_set_style_pad_top(${id}, ${G3.margen}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_pad_bottom(${id}, ${G3.margen}, LV_PART_MAIN);`);
    }
    break;
  }
  case 'state-strip':
    pon(`lv_obj_set_flex_flow(${id}, LV_FLEX_FLOW_ROW);`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_0, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_border_width(${id}, 0, LV_PART_MAIN);`);
    pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_SCROLLABLE);`);
    pon(`for (int i = 0; i < ST__CUANTOS; i++) {`);
    pon(`    ${id}_chip[i] = lv_label_create(${id});`);
    pon(`    lv_label_set_text(${id}_chip[i], ST_NOMBRES[i]);`);
    pon(`    lv_obj_set_flex_grow(${id}_chip[i], 1);`);
    pon(`    lv_obj_set_style_text_align(${id}_chip[i], LV_TEXT_ALIGN_CENTER, LV_PART_MAIN);`);
    pon(`    lv_obj_set_style_bg_opa(${id}_chip[i], LV_OPA_COVER, LV_PART_MAIN);`);
    pon(`    lv_obj_set_style_radius(${id}_chip[i], 5, LV_PART_MAIN);`);
    pon(`    lv_obj_set_style_pad_all(${id}_chip[i], 5, LV_PART_MAIN);`);
    pon(`}`);
    break;

  /* ---- los que muestran lo que escribe el alumno, no una variable ---- */
  case 'list':
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.sup)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    if (v){
      /* enlazada: cada elemento avisa con su numero y el elegido queda marcado */
      elementosDe(w).forEach((x, i) => {
        pon(`{ lv_obj_t *b = lv_list_add_button(${id}, NULL, "${txtC(x)}");`);
        pon(`  lv_obj_set_style_bg_color(b, lv_color_hex(${colorC(S.acento)}), LV_PART_MAIN | LV_STATE_CHECKED);`);
        pon(`  lv_obj_set_style_text_color(b, lv_color_hex(${colorC(colorBotonSobre(S))}), LV_PART_MAIN | LV_STATE_CHECKED);`);
        pon(`  lv_obj_add_event_cb(b, cb_${id}, LV_EVENT_CLICKED, (void *)(intptr_t)${i}); }`);
      });
    } else elementosDe(w).forEach(x => pon(`lv_list_add_button(${id}, NULL, "${txtC(x)}");`));
    break;
  case 'table': {
    const filas = elementosDe(w).map(l => l.split(';').map(c => c.trim()));
    const cols = Math.max(1, ...filas.map(f => f.length));
    pon(`lv_table_set_column_count(${id}, ${cols});`);
    pon(`lv_table_set_row_count(${id}, ${Math.max(1, filas.length)});`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_ITEMS);`);
    /* el ancho se reparte: LVGL no lo hace solo y las columnas salen a su aire */
    for (let k = 0; k < cols; k++)
      pon(`lv_table_set_column_width(${id}, ${k}, ${Math.max(40, Math.floor((G.w - 10) / cols))});`);
    filas.forEach((f, r) => f.forEach((c, k) => pon(`lv_table_set_cell_value(${id}, ${r}, ${k}, "${txtC(c)}");`)));
    break;
  }
  case 'roller':
    pon(`lv_roller_set_options(${id}, "${elementosDe(w).map(txtC).join('\\n')}", LV_ROLLER_MODE_NORMAL);`);
    pon(`lv_roller_set_visible_row_count(${id}, 3);`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.sup)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_SELECTED);`);
    /* la opcion elegida (0, 1, 2...) va a la variable */
    if (v) pon(`lv_obj_add_event_cb(${id}, cb_${id}, LV_EVENT_VALUE_CHANGED, NULL);`);
    break;
  case 'tabview': {
    pon(`lv_tabview_set_tab_bar_size(${id}, ${Math.max(28, Math.round(w.h * 0.18))});`);
    pon(`lv_obj_set_style_text_font(lv_tabview_get_tab_bar(${id}), &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    elementosDe(w).forEach(x => pon(`lv_tabview_add_tab(${id}, "${txtC(x)}");`));
    /* Las pestanas nacen vacias: el editor todavia no sabe meter widgets
       DENTRO de otro. Lo que vaya en cada una se anade aqui a mano. */
    break;
  }
  case 'buttonmatrix': {
    const filas = elementosDe(w).map(l => l.split(/\s+/).filter(Boolean)).filter(f => f.length);
    const mapa = filas.flatMap((f, i) => [...f.map(x => `"${txtC(x)}"`), i < filas.length - 1 ? '"\\n"' : '""']);
    /* static: LVGL guarda el puntero al mapa, no una copia */
    pon(`static const char *${id}_mapa[] = { ${mapa.join(', ') || '""'} };`);
    pon(`lv_buttonmatrix_set_map(${id}, ${id}_mapa);`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_ITEMS);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(S.acento)}), LV_PART_ITEMS);`);
    break;
  }
  case 'keyboard': {
    /* Se engancha al campo de texto elegido, y solo si ya esta creado:
       los widgets nacen en el orden del lienzo y el puntero del que viene
       despues todavia seria NULL. */
    const enPantalla = (E.pantallas.find(s => s.widgets.includes(w)) || { widgets: [] }).widgets;
    const antes = enPantalla.slice(0, enPantalla.indexOf(w));
    const ta = antes.find(x => x.tipo === 'textarea' && (!w.campo || x.nombre === w.campo));
    if (ta) pon(`lv_keyboard_set_textarea(${id}, ${cid(ta.nombre)});`);
    else pon(`/* sin campo de texto delante al que engancharse: pon un Campo de texto antes que el teclado */`);
    if (w.modo === 'numeros') pon(`lv_keyboard_set_mode(${id}, LV_KEYBOARD_MODE_NUMBER);`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_ITEMS);`);
    /* los colores del lienzo (coloresTeclado): las teclas de control son
       las CHECKED de LVGL (cambiar de modo, borrar, OK...) */
    const K = coloresTeclado(w);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(K.fondo)}), LV_PART_MAIN);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(K.tecla)}), LV_PART_ITEMS);`);
    pon(`lv_obj_set_style_text_color(${id}, lv_color_hex(${colorC(K.letra)}), LV_PART_ITEMS);`);
    pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(K.control)}), LV_PART_ITEMS | LV_STATE_CHECKED);`);
    pon(`lv_obj_set_style_text_color(${id}, lv_color_hex(${colorC(K.sobre)}), LV_PART_ITEMS | LV_STATE_CHECKED);`);
    break;
  }
  case 'msgbox': {
    const [tit, ...resto] = elementosDe(w);
    pon(`lv_msgbox_add_title(${id}, "${txtC(tit || 'Aviso')}");`);
    if (resto.length) pon(`lv_msgbox_add_text(${id}, "${txtC(resto.join(' '))}");`);
    if (estadosAviso(w)){
      /* sale en unos estados: su boton lo oculta (la X de LVGL lo destruiria) */
      pon(`{ lv_obj_t *b = lv_msgbox_add_footer_button(${id}, "${txtC(w.botonAviso || 'Aceptar')}");`);
      pon(`  lv_obj_add_event_cb(b, aviso_ocultar, LV_EVENT_CLICKED, ${id}); }`);
      pon(`lv_obj_add_flag(${id}, LV_OBJ_FLAG_HIDDEN);   /* aparece al entrar en sus estados */`);
    } else
    pon(`lv_msgbox_add_close_button(${id});`);
    pon(`lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);`);
    /* Nace visible, como en el lienzo. Para esconderlo y sacarlo cuando
       haga falta, desde src/logic/reglas.cpp:
           lv_obj_add_flag(${id}, LV_OBJ_FLAG_HIDDEN);
           lv_obj_remove_flag(${id}, LV_OBJ_FLAG_HIDDEN); */
    break;
  }
  }
  return L.join('\n') + '\n';
}

/* El codigo QR, entre guardas: lv_qrcode vive en src/libs/qrcode y solo
   se compila con LV_USE_QRCODE a 1. Sin el, en su sitio queda un texto
   que dice exactamente que hay que encender, en vez de un error de
   compilacion con el nombre de una funcion que no existe. */
function genQR(w, fuente, variante){
  const id = cid(w.nombre), G = geometria(w), S = est(w);
  const lado = Math.max(32, Math.min(G.w, G.h));
  return `    /* ${w.nombre} — Codigo QR */
#if LV_USE_QRCODE
    ${id} = lv_qrcode_create(p);
    lv_qrcode_set_size(${id}, ${lado});
    lv_qrcode_set_dark_color(${id}, lv_color_hex(0x000000));
    lv_qrcode_set_light_color(${id}, lv_color_hex(0xFFFFFF));
    { static const char ${id}_txt[] = "${txtC(w.texto || 'https://')}";
      lv_qrcode_update(${id}, ${id}_txt, sizeof(${id}_txt) - 1); }
#else
    ${id} = lv_label_create(p);
    lv_label_set_text(${id}, "QR: pon LV_USE_QRCODE a 1 en lv_conf.h");
    lv_obj_set_style_text_color(${id}, lv_color_hex(${colorC(S.texto)}), LV_PART_MAIN);
    lv_obj_set_style_text_font(${id}, &${simboloFuente(fuente, variante)}, LV_PART_MAIN);
#endif
    lv_obj_set_pos(${id}, ${w.x + G.dx}, ${w.y + G.dy});
`;
}

/* Como se deja un widget cuando el enlace se ha caido.
 *
 * Dejar el ultimo valor en pantalla es la opcion peligrosa: el
 * instrumento sigue mostrando un numero perfectamente creible cuando ya
 * no sabe nada. Un guion no se confunde con una medida. */
function genSinSenal(w){
  const id = cid(w.nombre);
  const v = variables().find(x => x.nombre === w.bind);
  if (!v || !v.remota || !PINTA.has(w.tipo)) return '';
  switch (w.tipo){
  case 'value':  return `        poner_texto(${id}, "--");\n`;
  case 'bar':    return `        lv_bar_set_value(${id}, ${Math.round(v.min ?? 0)}, LV_ANIM_OFF);\n`;
  case 'arc-gauge':
  case 'semicircle-gauge':
                 return `        lv_arc_set_value(${id}, ${Math.round(v.min ?? 0)});\n`;
  case 'led':    return `        lv_led_off(${id});\n`;
  default:       return '';
  }
}

/* ---------------------------------------------------------------------
 * IMAGENES
 *
 * Cada imagen sale como un fichero .c propio: un array de bytes mas su
 * descriptor. Separadas y no todas juntas porque asi el compilador solo
 * rehace la que cambie, y porque un array de medio megabyte dentro de
 * ui.cpp hace que el fichero no se pueda abrir con comodidad.
 *
 * El descriptor se escribe con inicializadores por NOMBRE. La cabecera
 * de LVGL tiene los campos en un orden u otro segun el endianness de la
 * placa, y por posicion se escribiria mal en la mitad de los casos.
 * ------------------------------------------------------------------- */
function imagenesDelProyecto(){
  const r = [];
  for (const p of E.pantallas)
    for (const w of p.widgets)
      if (w.tipo === 'image' && w.img && w.img.datos) r.push(w);
  return r;
}

function genImagen(w){
  const id = cid(w.nombre);
  const bin = atob(w.img.datos);
  const n = bin.length;

  /* 16 bytes por linea: cabe en 80 columnas y se puede mirar. */
  const filas = [];
  for (let i = 0; i < n; i += 16){
    const trozo = [];
    for (let k = i; k < Math.min(i + 16, n); k++)
      trozo.push('0x' + bin.charCodeAt(k).toString(16).padStart(2, '0'));
    filas.push('    ' + trozo.join(', ') + ',');
  }

  return cabecera(`img_${id}.c — ${w.img.nombre || 'imagen'} (${w.img.w}x${w.img.h})`,
`Convertida por Telar Studio desde ${w.img.nombre || 'el fichero original'}.

Formato ARGB8888: cuatro bytes por pixel en el orden B, G, R, A, que es
como lv_color32_t los tiene en memoria. Ocupa ${Math.round(n/1024)} KB de flash.

Para cambiarla, carga otra imagen en el editor y vuelve a exportar. Este
fichero se rehace entero.`) +
`#include <lvgl.h>

static const uint8_t img_${id}_datos[] = {
${filas.join('\n')}
};

const lv_image_dsc_t img_${id} = {
    .header = {
        .magic  = LV_IMAGE_HEADER_MAGIC,
        .cf     = LV_COLOR_FORMAT_ARGB8888,
        .flags  = 0,
        .w      = ${w.img.w},
        .h      = ${w.img.h},
        .stride = ${w.img.w * 4},
    },
    .data_size = sizeof(img_${id}_datos),
    .data      = img_${id}_datos,
};
`;
}

/* Lo que hay que refrescar de cada widget en cada ciclo */
function genRefresco(w){
  const id = cid(w.nombre), S = est(w);
  if (COMPONENTES[w.tipo]) return COMPONENTES[w.tipo].refresco(w, id);
  const v = variables().find(x => x.nombre === w.bind);
  if (!GENERABLES.has(w.tipo)) return '';

  if (w.tipo === 'state-strip')
    return `    for (int i = 0; i < ST__CUANTOS; i++)\n`
         + `        lv_obj_set_style_bg_color(${id}_chip[i],\n`
         + `            lv_color_hex(i == (int)s->st ? ${colorC(S.acento)} : ${colorC(S.sup)}), LV_PART_MAIN);\n`;

  if (w.tipo === 'chart')
    return (w.series||[]).slice(0,2)
      .map((sn,i) => `    lv_chart_set_next_value(${id}, ${id}_s${i}, (int32_t)s->${cid(sn)});`).join('\n') + '\n';

  /* el aviso que sale en unos estados: aparece al entrar y se va al salir */
  const enEst = estadosAviso(w);
  if (enEst){
    const cond = enEst.length ? enEst.map(x => `s->st == ST_${MAY(x)}`).join(' || ') : 'false';
    return `    {   /* ${w.nombre}: sale en ${enEst.join(', ') || 'ningun estado'} */
        static int visto_${id} = -1;
        if ((int)s->st != visto_${id}) {
            visto_${id} = (int)s->st;
            if (${cond}) lv_obj_remove_flag(${id}, LV_OBJ_FLAG_HIDDEN);
            else lv_obj_add_flag(${id}, LV_OBJ_FLAG_HIDDEN);
        }
    }\n`;
  }
  /* la lista: el elemento de la variable, marcado */
  if (w.tipo === 'list' && v)
    return `    {   /* ${w.nombre}: el elemento que dice la variable */
        static int32_t visto_${id} = -1;
        int32_t i = (int32_t)lroundf((float)s->${cid(v.nombre)});
        if (i != visto_${id}) {
            visto_${id} = i;
            for (uint32_t k = 0; k < lv_obj_get_child_count(${id}); k++) {
                lv_obj_t *b = lv_obj_get_child(${id}, (int32_t)k);
                if ((int32_t)k == i) lv_obj_add_state(b, LV_STATE_CHECKED);
                else lv_obj_remove_state(b, LV_STATE_CHECKED);
            }
        }
    }\n`;

  /* Los de entrada siguen a la variable si otro la cambia (la logica, un
     boton...), salvo mientras el dedo esta encima */
  if (w.tipo === 'checkbox' && v)
    return `    if (!lv_obj_has_state(${id}, LV_STATE_PRESSED))\n`
         + `        s->${cid(v.nombre)} ? lv_obj_add_state(${id}, LV_STATE_CHECKED)\n`
         + `                            : lv_obj_remove_state(${id}, LV_STATE_CHECKED);\n`;
  if ((w.tipo === 'dropdown' || w.tipo === 'roller') && v){
    const n = Math.max(1, elementosDe(w).length);
    return `    {   /* ${w.nombre}: la opcion que dice la variable */
        int32_t i = (int32_t)lroundf((float)s->${cid(v.nombre)});
        if (i < 0) i = 0;
        if (i > ${n - 1}) i = ${n - 1};
        if (${w.tipo === 'dropdown' ? `!lv_dropdown_is_open(${id})` : `!lv_obj_has_state(${id}, LV_STATE_PRESSED)`} && (int32_t)lv_${w.tipo}_get_selected(${id}) != i)
            lv_${w.tipo}_set_selected(${id}, (uint32_t)i${w.tipo === 'roller' ? ', LV_ANIM_OFF' : ''});
    }\n`;
  }
  if (w.tipo === 'spinbox' && v && !v.booleano)
    return `    {   /* ${w.nombre}: el valor de la variable */
        int32_t r = (int32_t)lroundf(s->${cid(v.nombre)} * ${flt(10 ** geoContador(w).dec)});
        if (lv_spinbox_get_value(${id}) != r) lv_spinbox_set_value(${id}, r);
    }\n`;

  /* el campo que guarda un numero ensena el valor de la variable, salvo
     mientras se esta escribiendo en el (enfocado) */
  if (w.tipo === 'textarea' && v && !v.booleano)
    return `    if (!lv_obj_has_state(${id}, LV_STATE_FOCUSED)) {
        snprintf(buf, sizeof(buf), "%.${w.decimales ?? 1}f", s->${cid(v.nombre)});
${E.tema.coma ? `        for (char *q = buf; *q; q++) if (*q == '.') { *q = ','; break; }
` : ''}        if (strcmp(lv_textarea_get_text(${id}), buf) != 0) lv_textarea_set_text(${id}, buf);
    }
`;

  if (!v || !PINTA.has(w.tipo)) return '';

  switch (w.tipo){
  case 'timer':
    /* De segundos a mm:ss. La division entera y el %02u son todo el
       truco; lo unico que hay que recordar es que a partir de 3600 s
       los minutos pasan de 59 y deja de leerse como un reloj. */
    return `    {
        uint32_t seg_${id} = (uint32_t)(s->${cid(v.nombre)} < 0 ? 0 : s->${cid(v.nombre)});
        snprintf(buf, sizeof(buf), "%02u:%02u",
                 (unsigned)(seg_${id} / 60), (unsigned)(seg_${id} % 60));
        poner_texto(${id}, buf);
    }\n`;
  case 'value':
    return v.booleano
      ? `    poner_texto(${id}, s->${cid(v.nombre)} ? "SI" : "NO");\n`
      : `    snprintf(buf, sizeof(buf), "%.${w.decimales ?? 1}f", s->${cid(v.nombre)});\n`
        + (E.tema.coma && !sinComa(w) ? `    for (char *p = buf; *p; p++) if (*p == '.') *p = ',';   /* coma decimal, como en el tema */\n` : '')
        + `    poner_texto(${id}, buf);\n`;
  case 'bar':    return `    lv_bar_set_value(${id}, (int32_t)s->${cid(v.nombre)}, LV_ANIM_OFF);\n`;
  case 'arc-gauge':
  case 'semicircle-gauge':
    return `    lv_arc_set_value(${id}, (int32_t)s->${cid(v.nombre)});\n`;
  case 'led':    return `    s->${cid(v.nombre)} ? lv_led_on(${id}) : lv_led_off(${id});\n`;
  case 'slider': return `    if (!lv_obj_has_state(${id}, LV_STATE_PRESSED))   /* no pelear con el dedo */\n`
                      + `        lv_slider_set_value(${id}, (int32_t)s->${cid(v.nombre)}, LV_ANIM_OFF);\n`;
  case 'toggle': return `    if (!lv_obj_has_state(${id}, LV_STATE_PRESSED))\n`
                      + `        s->${cid(v.nombre)} ? lv_obj_add_state(${id}, LV_STATE_CHECKED)\n`
                      + `                            : lv_obj_remove_state(${id}, LV_STATE_CHECKED);\n`;
  }
  return '';
}

/* Los callbacks: encolan un evento y nada mas. La interfaz no decide. */
function genCallbacks(){
  const L = [];
  /* el boton de un aviso que sale en unos estados: lo oculta */
  if (E.pantallas.some(s => s.widgets.some(w => estadosAviso(w))))
    L.push(`static void aviso_ocultar(lv_event_t *e) {
    lv_obj_add_flag((lv_obj_t *)lv_event_get_user_data(e), LV_OBJ_FLAG_HIDDEN);
}`);
  /* los botones - y + de los contadores: suben o bajan un paso y avisan
     (lv_spinbox_increment no manda VALUE_CHANGED por su cuenta) */
  if (E.pantallas.some(s => s.widgets.some(w => w.tipo === 'spinbox')))
    L.push(`static void contador_menos(lv_event_t *e) {
    lv_obj_t *c = (lv_obj_t *)lv_event_get_user_data(e);
    lv_spinbox_decrement(c); lv_obj_send_event(c, LV_EVENT_VALUE_CHANGED, NULL);
}
static void contador_mas(lv_event_t *e) {
    lv_obj_t *c = (lv_obj_t *)lv_event_get_user_data(e);
    lv_spinbox_increment(c); lv_obj_send_event(c, LV_EVENT_VALUE_CHANGED, NULL);
}`);
  const vistos = new Set();
  for (const s of E.pantallas){
    if (!vistos.has('ir_'+s.nombre)){
      vistos.add('ir_'+s.nombre);
      L.push(`static void cb_ir_${cid(s.nombre)}(lv_event_t *e) { (void)e; lv_screen_load(pant_${cid(s.nombre)}); }`);
    }
  }
  for (const s of E.pantallas) for (const w of s.widgets){
    const id = cid(w.nombre);
    const v = variables().find(x => x.nombre === w.bind);
    if (w.tipo === 'button' && enLogica(w) && !w.destino && botonesSuelta().includes(w.nombre))
      L.push(`/* ${w.nombre}: avisa al pulsar y al soltar. RELEASED y PRESS_LOST pueden
   llegar los dos: "apretado" hace que el soltar se mande una sola vez. */
static void cb_${id}(lv_event_t *e)
{
    static bool apretado = false;
    const lv_event_code_t c = lv_event_get_code(e);
    if (c == LV_EVENT_RELEASED || c == LV_EVENT_PRESS_LOST) {
        if (apretado) { apretado = false; event_send(EV_S_${MAY(w.nombre)}, 0); ui_pronto(); }
        return;
    }
    if (c == LV_EVENT_PRESSED) apretado = true;
    event_send(EV_L_${MAY(w.nombre)}, 0); ui_pronto();
}`);
    else if (w.tipo === 'button' && enLogica(w) && !w.destino)
      L.push(`static void cb_${id}(lv_event_t *e) { (void)e; event_send(EV_L_${MAY(w.nombre)}, 0); ui_pronto(); }`);
    if (w.tipo === 'button' && w.evento && !w.destino && !enLogica(w))
      L.push(`static void cb_${id}(lv_event_t *e) { (void)e; event_send(${MAY(w.evento)}, 0); ui_pronto(); }`);
    /* Un boton enlazado a un booleano es una ORDEN, no un interruptor:
       manda un 1 y la tarea de control lo devuelve a 0 en cuanto la
       orden ha salido. Eso es "aceptar", "marcha" o "parada". */
    if (w.tipo === 'button' && !w.evento && v && v.booleano && !enLogica(w))
      L.push(`static void cb_${id}(lv_event_t *e) { (void)e; event_send(EV_SET_${MAY(v.nombre)}, 1); ui_pronto(); }`);
    /* Un boton enlazado a una salida con valor la sube o la baja un paso,
       en decimas como todo lo que viaja por la cola */
    const op = ordenPaso(w);
    if (op)
      L.push(`static void cb_${id}(lv_event_t *e) { (void)e; event_send(EV_INC_${MAY(op.v.nombre)}, ${Math.round(op.delta * 10)}); ui_pronto(); }   /* ${op.delta > 0 ? '+' : ''}${op.delta} */`);
    if (w.tipo === 'slider' && v)
      L.push(`static void cb_${id}(lv_event_t *e) {\n`
           + `    int32_t v = lv_slider_get_value(lv_event_get_target_obj(e));\n`
           + `    event_send(EV_SET_${MAY(v.nombre)}, v * 10);   /* en decimas */\n    ui_pronto();\n}`);
    if (w.tipo === 'textarea' && v && !v.booleano)
      L.push(`/* ${w.nombre}: al pulsar OK en el teclado, el numero escrito pasa a ${v.nombre},
   sin salirse de su rango; y el campo vuelve a ensenar el valor */
static void cb_${id}(lv_event_t *e) {
    lv_obj_t *ta = lv_event_get_target_obj(e);
    char txt[24];
    snprintf(txt, sizeof(txt), "%s", lv_textarea_get_text(ta));
    for (char *q = txt; *q; q++) if (*q == ',') *q = '.';   /* la coma tambien vale */
    float x;
    if (sscanf(txt, "%f", &x) == 1) {
${v.min !== undefined && v.min !== '' ? `        if (x < ${flt(v.min)}) x = ${flt(v.min)};
` : ''}${v.max !== undefined && v.max !== '' ? `        if (x > ${flt(v.max)}) x = ${flt(v.max)};
` : ''}        event_send(EV_SET_${MAY(v.nombre)}, (int32_t)lroundf(x * 10.0f));   /* en decimas */
    }
    lv_obj_remove_state(ta, LV_STATE_FOCUSED);
    ui_pronto();
}`);
    /* el interruptor y la casilla: 1 o 0. El evento va en decimas, salvo
       en las de si/no: a una variable con valor le llega 10 (= 1,0) */
    if ((w.tipo === 'toggle' || w.tipo === 'checkbox') && v)
      L.push(`static void cb_${id}(lv_event_t *e) {\n`
           + `    bool on = lv_obj_has_state(lv_event_get_target_obj(e), LV_STATE_CHECKED);\n`
           + `    event_send(EV_SET_${MAY(v.nombre)}, on ? ${v.booleano ? 1 : 10} : 0);\n    ui_pronto();\n}`);
    /* el desplegable y la rueda: el numero de la opcion (0, 1, 2...) */
    if ((w.tipo === 'dropdown' || w.tipo === 'roller') && v)
      L.push(`static void cb_${id}(lv_event_t *e) {\n`
           + `    uint32_t i = lv_${w.tipo}_get_selected(lv_event_get_target_obj(e));\n`
           + `    event_send(EV_SET_${MAY(v.nombre)}, ${v.booleano ? '(int32_t)i' : '(int32_t)i * 10'});\n    ui_pronto();\n}`);
    /* la lista: el numero del elemento tocado, que viaja en su user_data */
    if (w.tipo === 'list' && v)
      L.push(`static void cb_${id}(lv_event_t *e) {\n`
           + `    int32_t i = (int32_t)(intptr_t)lv_event_get_user_data(e);\n`
           + `    event_send(EV_SET_${MAY(v.nombre)}, ${v.booleano ? 'i' : 'i * 10'});\n    ui_pronto();\n}`);
    /* el contador: su valor, que va en enteros de su ultimo decimal */
    if (w.tipo === 'spinbox' && v && !v.booleano)
      L.push(`static void cb_${id}(lv_event_t *e) {\n`
           + `    int32_t r = lv_spinbox_get_value(lv_event_get_target_obj(e));\n`
           + `    event_send(EV_SET_${MAY(v.nombre)}, (int32_t)lroundf(r * 10.0f / ${flt(10 ** geoContador(w).dec)}));   /* en decimas */\n    ui_pronto();\n}`);
  }
  return L.join('\n');
}

function genUiH(){
  return cabecera('ui.h — interfaz generada del manifiesto') +
`#ifndef TELAR_UI_H
#define TELAR_UI_H

#include <lvgl.h>
#include "../../state.h"

void ui_build(void);                 /* crea todas las pantallas y carga la primera */
void ui_refresh(lv_timer_t *t);      /* refresca solo la pantalla visible */

#endif /* TELAR_UI_H */
`;
}

function genUiCpp(){
  const decls = [];
  for (const s of E.pantallas){
    decls.push(`static lv_obj_t *pant_${cid(s.nombre)};`);
    for (const w of s.widgets) decls.push(genDecl(w).trimEnd());
  }

  const constructores = E.pantallas.map(s => {
    const nom = cid(s.nombre);
    return `static void crear_${nom}(void) {
    lv_obj_t *p = lv_obj_create(NULL);
    pant_${nom} = p;
    lv_obj_set_style_bg_color(p, lv_color_hex(${colorC(E.tema.fondo)}), LV_PART_MAIN);
    /* Las coordenadas de un hijo son relativas al AREA DE CONTENIDO del
       padre, no a su esquina: cualquier relleno desplazaria el diseno
       entero abajo y a la derecha.

       El tema por defecto de LVGL no le pone relleno a una PANTALLA
       (styles.scr no trae pad_all; el que si lo trae es styles.card, y
       ese es para objetos normales), asi que hoy esto no cambia nada.
       Se deja explicito para que siga siendo cierto con otro tema: lo que
       el editor coloca en (40, 30) tiene que aparecer en (40, 30). */
    lv_obj_set_style_pad_all(p, 0, LV_PART_MAIN);
    lv_obj_set_style_border_width(p, 0, LV_PART_MAIN);
    lv_obj_remove_flag(p, LV_OBJ_FLAG_SCROLLABLE);

${s.widgets.map(w => genWidget(w)).join('\n')}}`;
  }).join('\n\n');

  const refrescos = E.pantallas.map(s => {
    const cuerpo = s.widgets.map(w => genRefresco(w)).filter(Boolean).join('');
    const blanco = s.widgets.map(w => genSinSenal(w)).filter(Boolean).join('');
    /* Si el enlace se cae, SOLO lo que viene del otro nodo pasa a "--".
       Antes el return cortaba el refresco entero: la cuenta regresiva, el
       setpoint y todo lo que vive en esta placa se quedaban congelados
       aunque no dependieran del cable. */
    const delOtroNodo = w => [w.bind, ...(w.series || [])].some(n => { const v = n && variables().find(x => x.nombre === n); return !!(v && v.remota); });
    const locales = s.widgets.filter(w => !delOtroNodo(w)).map(w => genRefresco(w)).filter(Boolean).join('');
    const remotos = s.widgets.filter(w =>  delOtroNodo(w)).map(w => genRefresco(w)).filter(Boolean).join('');
    const partes = blanco
      ? `${locales ? '    /* lo que vive en esta placa se refresca siempre */\n' + locales : ''}
    /* El otro nodo lleva mas de un segundo sin decir nada: solo lo suyo pasa a "--". */
    if (!s->enlace_ok) {
${blanco}        return;
    }
${remotos}`
      : (cuerpo || '    /* nada que refrescar en esta pantalla */\n');
    return `static void refrescar_${cid(s.nombre)}(const snapshot_t *s) {
    char buf[24]; (void)buf; (void)s;
${partes}}`;
  }).join('\n\n');

  const texto = cabecera('ui.cpp — pantallas generadas del manifiesto',
`Regla de oro: los callbacks solo encolan eventos. Quien decide es la
tarea de control. Si aqui aparece logica, algo se ha hecho mal.`) +
`#include "ui.h"
#include <stdio.h>
#include <string.h>

/* Escribir una etiqueta SOLO si el texto es distinto.
 *
 * lv_label_set_text() no comprueba nada: reasigna e invalida el area
 * aunque le pases exactamente lo que ya habia. A veinte refrescos por
 * segundo eso repinta el numero entero todo el rato, y en un panel RGB
 * como el de esta placa el dibujo entra en el mismo bufer que el panel
 * esta leyendo: se ve un desgarro, que de lejos parece parpadeo.
 *
 * lv_arc_set_value() y compania si comprueban, por eso las agujas no dan
 * guerra y las etiquetas si. */
static void poner_texto(lv_obj_t *lbl, const char *txt)
{
    if (strcmp(lv_label_get_text(lbl), txt) != 0) lv_label_set_text(lbl, txt);
}

${apoyoComponentesC()}
/* Las fuentes que LVGL trae compiladas vienen APAGADAS de fabrica, una a
   una. Sin esta comprobacion el compilador dice
   "lv_font_... was not declared", que no menciona ni fuentes ni
   lv_conf.h, y ahi se atasca cualquiera. Mejor decir que falta y donde
   se enciende. */
@@GUARDAS_DE_FUENTE@@
${imagenesDelProyecto().map(w => `extern const lv_image_dsc_t img_${cid(w.nombre)};`).join('\n')}
${hayFuentesPropias() ? '#include "fuentes.h"\n' : ''}

${decls.filter(Boolean).join('\n')}

/* --- un refresco extra justo despues de tocar algo ---
 *
 * Los widgets que muestran un valor se enteran por la INSTANTANEA, y la
 * instantanea no cambia hasta que la tarea de control atiende el evento
 * —hasta un ciclo despues, 50 ms—. Esperar ademas al refresco periodico
 * hace que el aparato de verdad reaccione ANTES que su indicador en
 * pantalla, que se ve raro aunque sea inofensivo.
 *
 * Esto no adelanta nada ni finge: pide un refresco de una sola pasada
 * poco despues de tocar, cuando la instantanea ya se ha enterado. La
 * pantalla sigue contando lo que ha pasado, solo que sin esperar. */
static void refresco_puntual(lv_timer_t *t) { ui_refresh(t); }

static void ui_pronto(void)
{
    lv_timer_t *t = lv_timer_create(refresco_puntual, 70, NULL);
    if (t) lv_timer_set_repeat_count(t, 1);
}

/* --- callbacks: encolar y nada mas --- */
${genCallbacks()}

/* --- construccion --- */
${constructores}

void ui_build(void) {
    /* El tema, ANTES de crear nada.
     *
     * Sin esta llamada LVGL usa su tema CLARO por defecto, y entonces
     * todo lo que no se pinte explicitamente sale con otros colores: los
     * paneles claros, el texto oscuro, los bordes que no tocan. El
     * diseno del editor es oscuro, asi que el tema tiene que serlo.
     *
     * Los dos colores son el acento y la alarma del proyecto, para que
     * lo que LVGL decida por su cuenta ya vaya en la misma paleta. */
    lv_display_t *disp = lv_display_get_default();
${esMono(placa()) ? `    /* Pantalla de un color: el tema MONO de LVGL. El de por defecto
       usa sombras, degradados y transparencias, y cada gris se convierte
       en un tramado de puntos. Este marca el foco invirtiendo el widget,
       que es lo que hace falta para moverse con botones. */
    lv_theme_t *tema = lv_theme_mono_init(disp, true, &${simboloFuente(E.tema.fuente)});` : `    lv_theme_t *tema = lv_theme_default_init(
        disp,
        lv_color_hex(${colorC(E.tema.acento)}),
        lv_color_hex(${colorC(E.tema.alarma)}),
        true,                       /* oscuro */
        &${simboloFuente(E.tema.fuente)});`}
    lv_display_set_theme(disp, tema);

${E.pantallas.map(s => `    crear_${cid(s.nombre)}();`).join('\n')}
    lv_screen_load(pant_${cid(E.pantallas[0].nombre)});
}

${genAspecto()}/* --- refresco --- */
${refrescos}

void ui_refresh(lv_timer_t *t) {
    (void)t;
    snapshot_t s;
    snapshot_read(&s);           /* copia bajo mutex; despues ya es nuestra */
${hayAspecto() ? '    aplicar_aspecto(&s);\n' : ''}
    lv_obj_t *act = lv_screen_active();
${E.pantallas.map(s => `    if (act == pant_${cid(s.nombre)}) { refrescar_${cid(s.nombre)}(&s); return; }`).join('\n')}
}
`;

  /* Las guardas, al final y mirando lo ESCRITO. Antes salian del plan de
     fuentes, y el plan apunta un tamano por widget aunque ese widget no
     dibuje una sola letra: una barra de 30 px de alto reservaba una
     fuente de 8 px que no usaba nadie, y el proyecto se negaba a
     compilar hasta encenderla en lv_conf.h. Se piden las que el fichero
     nombra, ni una mas. */
  return texto.replace('@@GUARDAS_DE_FUENTE@@', guardasDeFuente(texto));
}

/* Los tamanos de Montserrat que el fichero usa de verdad, en orden. */
function fuentesCompiladasDe(texto){
  return [...new Set([...texto.matchAll(/lv_font_montserrat_(\d+)/g)].map(m => +m[1]))]
         .sort((a, b) => a - b);
}

function guardasDeFuente(texto){
  return fuentesCompiladasDe(texto).map(px =>
`#if !defined(LV_FONT_MONTSERRAT_${px}) || !LV_FONT_MONTSERRAT_${px}
#error "Falta la fuente de ${px} px. Abre Documentos/Arduino/libraries/lv_conf.h y pon a 1 el LV_FONT_MONTSERRAT_${px}."
#endif`).concat([
/* La memoria de LVGL. Si lv_conf.h la saca de la PSRAM, la placa tiene que
   tenerla (y «PSRAM: Enabled» en Herramientas): sin ella compila, pero
   LVGL arranca sin memoria y la placa se cuelga. Mejor pararse aqui. */
`#if defined(LV_MEM_POOL_ALLOC) && !defined(BOARD_HAS_PSRAM)
#error "Tu lv_conf.h saca la memoria de LVGL de la PSRAM y esta placa no tiene PSRAM (o esta apagada en Herramientas > PSRAM). Se colgaria al arrancar. El LEEME, en LA MEMORIA DE LVGL, trae el bloque que vale para todas las placas."
#endif`]).join('\n');
}

/* rtos_pico.h: el programa de pantalla de Telar llama a dos cosas que
   son nombres del ESP32. En la Pico (arduino-pico con FreeRTOS SMP) hay
   lo mismo con otro nombre. Solo va en los proyectos de la Pico. */
const RTOS_PICO = cabecera('rtos_pico.h — la Pico con los nombres del ESP32',
`El programa de pantalla es el mismo que en un ESP32. Aqui se traducen las
dos cosas que tienen otro nombre en la Pico: crear una tarea en un nucleo
y pedir memoria. Hace falta el nucleo arduino-pico (Earle Philhower) con
"Operating System: FreeRTOS SMP" en Herramientas.`) +
`#ifndef TELAR_RTOS_PICO_H
#define TELAR_RTOS_PICO_H

#if !defined(ARDUINO_ARCH_RP2040)
#error "Este proyecto es para la Raspberry Pi Pico: elige su placa en Herramientas."
#endif
#if !defined(__FREERTOS)
#error "Falta FreeRTOS: en Herramientas, Operating System: FreeRTOS SMP (nucleo arduino-pico, de Earle Philhower)."
#endif

#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

/* En el ESP32 la pila se da en bytes; en FreeRTOS, en palabras. El nucleo
   se pide con una mascara: el 0 es 1 << 0 y el 1 es 1 << 1. */
static inline BaseType_t xTaskCreatePinnedToCore(TaskFunction_t funcion, const char *nombre,
                                                 uint32_t pila_bytes, void *param, UBaseType_t prioridad,
                                                 TaskHandle_t *tarea, BaseType_t nucleo)
{
    return xTaskCreateAffinitySet(funcion, nombre, pila_bytes / sizeof(StackType_t), param,
                                  prioridad, (UBaseType_t)(1u << nucleo), tarea);
}

/* La Pico no tiene memoria de varias clases: toda es la misma */
#define MALLOC_CAP_DMA       0
#define MALLOC_CAP_INTERNAL  0
#define heap_caps_malloc(bytes, clase)  malloc(bytes)

#endif /* TELAR_RTOS_PICO_H */
`;

/* =====================================================================
 * pantalla.h — la ficha de la pantalla, para el puerto de LovyanGFX
 *
 * Aqui esta TODO lo que distingue una pantalla SPI de otra: controlador,
 * pines, velocidad, rotacion y tactil. Con ESP32_Display_Panel esto
 * viene dentro de la libreria; con LovyanGFX viene aqui, y por eso vale
 * para cualquier panel.
 * ===================================================================== */
function genPantallaH(){
  const P = placa();
  if ((P.lgfx || {}).bus === 'i2c') return genPantallaOledH(P);
  const C = P.lgfx || {};
  const pan = PANELES[C.controlador] || PANELES['ILI9341'];
  const spi = C.spi || {};
  const luz = C.luz || null;
  const tac = C.tactil || null;
  const T = tac ? (TACTILES[tac.controlador] || null) : null;
  const num = (v, def) => (v === undefined || v === null ? def : v);
  const bool = v => (v ? 'true' : 'false');
  /* la Pico: LovyanGFX quiere el numero de bus y no tiene los campos del ESP32 */
  const pico = !!placaBase(nodoHMI()).rp2040;

  return cabecera('pantalla.h — como es tu pantalla',
`Esto es lo unico que cambia entre una pantalla SPI y otra. Si el dibujo
sale con los colores al reves, mira "invert"; si sale corrido, "offset";
si el dedo cae desplazado, los cuatro numeros del tactil.`) +
`#ifndef TELAR_PANTALLA_H
#define TELAR_PANTALLA_H

#define LGFX_USE_V1
#include <LovyanGFX.hpp>

/* ${P.nombre} — ${pan.nombre}${T ? ' con ' + T.nombre : ' sin tactil'} */
class LGFX : public lgfx::LGFX_Device
{
    lgfx::${pan.clase} _panel;
    lgfx::Bus_SPI      _bus;${luz ? `
    lgfx::Light_PWM    _luz;` : ''}${T && T.clase ? `
    lgfx::${T.clase} _tactil;` : ''}

public:
    LGFX(void)
    {
        {   /* el bus por el que van los pixeles */
            auto cfg = _bus.config();
            cfg.spi_host    = ${pico ? `${num(C.spi_host_num, 0)};   /* el SPI${num(C.spi_host_num, 0)} de la Pico: sale de los pines */` : `${spi.host || 'SPI2_HOST'};`}
            cfg.spi_mode    = ${num(spi.modo, 0)};
            cfg.freq_write  = ${num(spi.freq, pan.freq)};
            cfg.freq_read   = ${num(spi.freq_lectura, pan.freq_lectura)};${pico ? '' : `
            cfg.spi_3wire   = false;
            cfg.use_lock    = true;
            cfg.dma_channel = SPI_DMA_CH_AUTO;`}
            cfg.pin_sclk    = ${num(spi.sck, -1)};
            cfg.pin_mosi    = ${num(spi.mosi, -1)};
            cfg.pin_miso    = ${num(spi.miso, -1)};
            cfg.pin_dc      = ${num(spi.dc, -1)};
            _bus.config(cfg);
            _panel.setBus(&_bus);
        }
        {   /* el panel: tamano real, antes de rotar */
            auto cfg = _panel.config();
            cfg.pin_cs           = ${num(spi.cs, -1)};
            cfg.pin_rst          = ${num(spi.rst, -1)};
            cfg.pin_busy         = -1;
            cfg.panel_width      = ${num(C.ancho_panel, pan.ancho)};
            cfg.panel_height     = ${num(C.alto_panel, pan.alto)};
            cfg.offset_x         = ${num(C.offset_x, pan.offset_x ?? 0)};
            cfg.offset_y         = ${num(C.offset_y, pan.offset_y ?? 0)};
            cfg.offset_rotation  = ${num(C.offset_rotacion, 0)};
            cfg.dummy_read_pixel = 8;
            cfg.dummy_read_bits  = 1;
            cfg.readable         = true;
            cfg.invert           = ${bool(num(C.invertir, pan.invertir))};
            cfg.rgb_order        = ${bool(num(C.orden_rgb, pan.orden_rgb))};
            cfg.dlen_16bit       = false;
            cfg.bus_shared       = ${bool(num(C.bus_compartido, false))};
            _panel.config(cfg);
        }${luz ? `
        {   /* la retroiluminacion, por PWM: asi se puede atenuar */
            auto cfg = _luz.config();
            cfg.pin_bl      = ${num(luz.pin, -1)};
            cfg.invert      = ${bool(luz.invertida)};
            cfg.freq        = ${num(luz.freq, 44100)};
            cfg.pwm_channel = ${num(luz.canal, 7)};
            _luz.config(cfg);
            _panel.setLight(&_luz);
        }` : ''}${T && T.clase && T.bus === 'spi' ? `
        {   /* el tactil resistivo, en su propio bus SPI */
            auto cfg = _tactil.config();
            cfg.x_min           = ${num(tac.x_min, 300)};
            cfg.x_max           = ${num(tac.x_max, 3900)};
            cfg.y_min           = ${num(tac.y_min, 200)};
            cfg.y_max           = ${num(tac.y_max, 3700)};
            cfg.pin_int         = ${num(tac.irq, -1)};
            cfg.bus_shared      = ${bool(num(tac.bus_compartido, false))};
            cfg.offset_rotation = ${num(tac.rotacion, 0)};
            cfg.spi_host        = ${pico ? num(C.spi_host_num, 0) : (tac.host || 'SPI3_HOST')};
            cfg.freq            = ${num(tac.freq, 1000000)};
            cfg.pin_sclk        = ${num(tac.sck, -1)};
            cfg.pin_mosi        = ${num(tac.mosi, -1)};
            cfg.pin_miso        = ${num(tac.miso, -1)};
            cfg.pin_cs          = ${num(tac.cs, -1)};
            _tactil.config(cfg);
            _panel.setTouch(&_tactil);
        }` : ''}${T && T.clase && T.bus === 'i2c' ? `
        {   /* el tactil capacitivo, por I2C */
            auto cfg = _tactil.config();
            cfg.x_min      = 0;
            cfg.x_max      = ${num(C.ancho_panel, pan.ancho) - 1};
            cfg.y_min      = 0;
            cfg.y_max      = ${num(C.alto_panel, pan.alto) - 1};
            cfg.pin_int    = ${num(tac.irq, -1)};
            cfg.pin_rst    = ${num(tac.rst, -1)};
            cfg.bus_shared = true;
            cfg.offset_rotation = ${num(tac.rotacion, 0)};
            cfg.i2c_port   = ${pico ? num(busFijo(placaBase(nodoHMI()), 'i2c', { sda: tac.sda, scl: tac.scl }), 0) : num(tac.puerto_i2c, 0)};
            cfg.i2c_addr   = ${tac.direccion || '0x38'};
            cfg.pin_sda    = ${num(tac.sda, -1)};
            cfg.pin_scl    = ${num(tac.scl, -1)};
            cfg.freq       = ${num(tac.freq, 400000)};
            _tactil.config(cfg);
            _panel.setTouch(&_tactil);
        }` : ''}
        setPanel(&_panel);
    }
};

/* La rotacion con la que se monta: ${num(C.rotacion, 0)} -> ${placa().ancho}x${placa().alto} */
#define PANTALLA_ROTACION  ${num(C.rotacion, 0)}
#define PANTALLA_TIENE_TACTIL ${T && T.clase ? 1 : 0}
#define PANTALLA_TIENE_LUZ    ${luz ? 1 : 0}
#define PANTALLA_MONOCROMO    ${pan.mono ? 1 : 0}

#endif /* TELAR_PANTALLA_H */
`;
}

/* La OLED de un color por I2C: SSD1306 o SH1106 */
function genPantallaOledH(P){
  const C = P.lgfx || {};
  const pan = PANELES[C.controlador] || PANELES['SSD1306'];
  const i2c = C.i2c || {};
  const num = (v, def) => (v === undefined || v === null ? def : v);
  return cabecera('pantalla.h — como es tu pantalla',
`Una OLED de un solo color por I2C. Si no se ve nada, lo primero es la
direccion: la mayoria son 0x3C y algunas 0x3D (lo pone detras, en una
resistencia que se cambia de sitio).`) +
`#ifndef TELAR_PANTALLA_H
#define TELAR_PANTALLA_H

#define LGFX_USE_V1
#include <LovyanGFX.hpp>

/* ${P.nombre} — ${pan.nombre} */
class LGFX : public lgfx::LGFX_Device
{
    lgfx::${pan.clase} _panel;
    lgfx::Bus_I2C      _bus;

public:
    LGFX(void)
    {
        {   /* el bus: la pantalla va en su propio controlador I2C (el ${num(C.i2c_puerto, 1)}),
               para no pelearse con el Wire de los sensores */
            auto cfg = _bus.config();
            cfg.i2c_port    = ${num(C.i2c_puerto, 1)};
            cfg.freq_write  = ${num(i2c.freq, 400000)};
            cfg.freq_read   = ${num(i2c.freq, 400000)};
            cfg.pin_sda     = ${num(i2c.sda, -1)};
            cfg.pin_scl     = ${num(i2c.scl, -1)};
            cfg.i2c_addr    = ${i2c.direccion || pan.direccion || '0x3C'};
            _bus.config(cfg);
            _panel.setBus(&_bus);
        }
        {   /* el panel */
            auto cfg = _panel.config();
            cfg.pin_cs          = -1;
            cfg.pin_rst         = ${num(i2c.rst, -1)};
            cfg.pin_busy        = -1;
            cfg.panel_width     = ${pan.ancho};
            cfg.panel_height    = ${pan.alto};
            cfg.offset_x        = ${num(pan.offset_x, 0)};
            cfg.offset_y        = ${num(pan.offset_y, 0)};
            cfg.offset_rotation = 0;
            cfg.bus_shared      = false;
            _panel.config(cfg);${pan.compins ? `
            _panel.setComPins(${pan.compins});   /* la de 32 filas cablea las filas de otra forma */` : ''}
        }
        setPanel(&_panel);
    }
};

#define PANTALLA_ROTACION     ${num(C.rotacion, 0)}
#define PANTALLA_TIENE_TACTIL 0
#define PANTALLA_TIENE_LUZ    0
#define PANTALLA_MONOCROMO    1

#endif /* TELAR_PANTALLA_H */
`;
}

/* ---------------------------------------------------------------------
 * NAVEGAR CON BOTONES
 *
 * En una pantalla sin tactil, unos pulsadores hacen de dedo. LVGL ya
 * sabe hacerlo: un "grupo" con todo lo que se puede pulsar y un teclado
 * de tres teclas. Siguiente y anterior mueven el foco (el tema lo marca
 * invirtiendo el widget) y aceptar pulsa el que este marcado, que es
 * exactamente lo que haria el dedo: los mismos callbacks, los mismos
 * eventos, nada que cambiar en la logica.
 * ------------------------------------------------------------------- */
function botonesNav(){
  const n = nodoHMI();
  const A = asignarPines(n);
  return n.conexiones.filter(p => p.tipo === 'boton-nav').map(p => {
    const f = A.filas.find(x => x.clave === p.clave);
    const par = p.params || {};
    return { clave: p.clave, pin: f?.pinNum ?? null,
             funcion: par.funcion || 'siguiente',
             bajo: (par.pull || 'pull-up interno') === 'pull-up interno' };
  }).filter(b => b.pin !== null);
}

function genNavegacion(){
  const bs = botonesNav();
  if (!bs.length) return '';
  const TECLA = { siguiente:'LV_KEY_NEXT', anterior:'LV_KEY_PREV', aceptar:'LV_KEY_ENTER' };
  return `
/* --- navegar con botones: ${bs.map(b => b.clave + ' (' + b.funcion + ', GPIO' + b.pin + ')').join(', ')} --- */
${bs.map(b => `#define PIN_${MAY(b.clave)}  ${b.pin}`).join('\n')}

static void nav_leer(lv_indev_t *indev, lv_indev_data_t *data)
{
    (void)indev;
    /* Una tecla cada vez: la primera que este pulsada. LVGL se encarga
       de detectar el flanco, la pulsacion larga y la repeticion. */
${bs.map(b => `    if (digitalRead(PIN_${MAY(b.clave)}) == ${b.bajo ? 'LOW' : 'HIGH'}) {   /* ${b.funcion} */
        data->key = ${TECLA[b.funcion] || 'LV_KEY_NEXT'};
        data->state = LV_INDEV_STATE_PRESSED;
        return;
    }`).join('\n')}
    data->state = LV_INDEV_STATE_RELEASED;
}

/* El grupo tiene los widgets de TODAS las pantallas, porque se crean
   todas al arrancar. Sin esto, "siguiente" acaba marcando un boton de
   una pantalla que no se ve y parece que la navegacion se ha colgado.
   Cada vez que cambia la pantalla activa, el grupo se rehace solo con
   lo que hay en ella. */
static lv_group_t *nav_grupo = NULL;

static void nav_apuntar(lv_obj_t *obj)
{
    uint32_t n = lv_obj_get_child_count(obj);
    for (uint32_t i = 0; i < n; i++) {
        lv_obj_t *hijo = lv_obj_get_child(obj, i);
        if (lv_obj_is_group_def(hijo)) lv_group_add_obj(nav_grupo, hijo);
        nav_apuntar(hijo);
    }
}

static void nav_vigilar(lv_timer_t *t)
{
    (void)t;
    static lv_obj_t *antes = NULL;
    lv_obj_t *ahora = lv_screen_active();
    if (ahora == antes) return;
    antes = ahora;
    lv_group_remove_all_objs(nav_grupo);
    nav_apuntar(ahora);
}

static void nav_iniciar(void)
{
${bs.map(b => `    pinMode(PIN_${MAY(b.clave)}, ${b.bajo ? 'INPUT_PULLUP' : 'INPUT_PULLDOWN'});`).join('\n')}

    /* El grupo por defecto: todo widget que se pueda pulsar y que se cree
       a partir de aqui entra solo en la ronda del foco. */
    nav_grupo = lv_group_create();
    lv_group_set_default(nav_grupo);
    lv_group_set_wrap(nav_grupo, true);      /* del ultimo se vuelve al primero */

    lv_indev_t *teclado = lv_indev_create();
    lv_indev_set_type(teclado, LV_INDEV_TYPE_KEYPAD);
    lv_indev_set_read_cb(teclado, nav_leer);
    lv_indev_set_group(teclado, nav_grupo);

    lv_timer_create(nav_vigilar, 100, NULL);
}
`;
}

/* =====================================================================
 * El .ino
 * ===================================================================== */
function genIno(){
  const P = placa();
  /* Dos puertos posibles: la libreria de Espressif, que trae la placa
     descrita dentro, o LovyanGFX con la ficha de pantalla del proyecto.
     De aqui para arriba no cambia nada mas. */
  const lovyan = puertoDe(P) === 'lovyan';
  return cabecera(`${E.proyecto} — ${P.nombre}`,
`Ajustes del IDE (menu Herramientas):
${Object.entries(P.opciones_ide).map(([k,v]) => `  ${k}: ${v}`).join('\n')}

${P.nota_ide}

IMPORTANTE: esta carpeta NO debe contener un lv_conf.h. LVGL busca
primero cualquiera alcanzable desde el sketch, y si lo encuentra ignora
el de Documentos\\Arduino\\libraries\\.`) +
`#include <Arduino.h>
${lovyan ? `#include <lvgl.h>

#include "pantalla.h"
#include "lvgl_lgfx_port.h"` : `#include <esp_display_panel.hpp>
#include <lvgl.h>

#include "lvgl_v9_port.h"`}
#include "compat.h"
#include "state.h"
#include "src/ui/ui.h"
${(placa().opciones_ide || {})['PSRAM'] === 'Enabled' ? `
/* La PSRAM no es opcional en esta placa.
 *
 * El panel de ${placa().ancho}x${placa().alto} necesita un bufer de
 * ${Math.round(placa().ancho * placa().alto * 2 / 1024)} KB y en la RAM interna no cabe. Y en el menu
 * Herramientas la opcion PSRAM viene DESACTIVADA de fabrica, asi que
 * esto le pasa a todo el mundo la primera vez.
 *
 * Sin este aviso, lo que se ve es la placa reiniciandose sin parar con
 * "no mem for frame buffer" y un volcado de pila, que no menciona ni la
 * PSRAM ni el menu donde se activa. Y mientras tanto la pantalla se
 * queda encendida en gris, como si estuviera funcionando. */
#if !defined(BOARD_HAS_PSRAM)
#error "Falta la PSRAM. En el IDE: Herramientas > PSRAM > Enabled (o OPI PSRAM), y vuelve a subir."
#endif
` : ''}${hayEnlace() ? '#include "enlace.h"\n' : ''}
${lovyan ? `/* La pantalla, descrita en pantalla.h. Se crea aqui, una sola vez, y
   el puerto de LVGL se queda con la direccion. */
static LGFX pantalla;` : `using namespace esp_panel::drivers;
using namespace esp_panel::board;`}
${genNavegacion()}
void setup() {
    Serial.begin(115200);
    Serial.println("${E.proyecto}: arrancando");

${lovyan ? `    pantalla.init();
    pantalla.setRotation(PANTALLA_ROTACION);
#if PANTALLA_TIENE_LUZ
    pantalla.setBrightness(255);   /* 0..255: se puede atenuar */
#endif

    lvgl_port_init(&pantalla, PANTALLA_TIENE_TACTIL);` : `    Board *board = new Board();
    board->init();
    assert(board->begin());

    lvgl_port_init(board->getLCD(), board->getTouch());`}
${hayEnlace() ? '\n    enlace_iniciar();\n' : ''}
    /* La tarea de control arranca antes que la interfaz: cuando la
       pantalla pinte por primera vez ya habra una instantanea valida. */
    control_start();

    lvgl_port_lock(-1);${botonesNav().length ? `
    nav_iniciar();     /* ANTES de ui_build: los widgets se apuntan solos al grupo */` : ''}
    ui_build();
    /* Cada cuanto se repinta. Estaba fijo en 200 ms, y para una aguja
       que sigue a un mando eso se ve: hasta un quinto de segundo de
       retraso solo por esperar al siguiente repintado. Ahora se elige en
       el editor, y por defecto va al mismo ritmo que la tarea de
       control, que es lo que produce los datos. */
    lv_timer_create(ui_refresh, ${E.refresco_ms ?? 100}, NULL);
    lvgl_port_unlock();

    Serial.println("listo");
}

void loop() {
    /* Aqui solo tareas lentas y que puedan bloquear (volcar a tarjeta,
       copias). Ni LVGL ni control: cada uno tiene su tarea.

       Y duerme de verdad: esta tarea comparte nucleo con LVGL, asi que
       despertarla a menudo se paga en repintados entrecortados. */
    vTaskDelay(pdMS_TO_TICKS(200));
}
`;
}

/* =====================================================================
 * Ficheros de apoyo
 * ===================================================================== */
/* --------------------------------------------------------------------
 * FUENTES PROPIAS
 *
 * No se generan aqui: se genera el SCRIPT que las genera. Convertir una
 * tipografia a mapa de bits es trabajo de lv_font_conv, la herramienta
 * oficial de LVGL; reimplementarla en el navegador solo serviria para
 * producir ficheros sutilmente distintos de los buenos.
 * ------------------------------------------------------------------ */
const TTF_LVGL = 'libraries/lvgl/scripts/built_in_font/Montserrat-Medium.ttf';
/* Donde guarda lvgl sus TTF: la 9.6 en adelante, y antes */
const TTF_LVGL_CARPETAS = ['libraries/lvgl/scripts/generators/built_in_font', 'libraries/lvgl/scripts/built_in_font'];

/* LVGL guarda el ancho y el alto de cada letra en un byte, salvo que
   LV_FONT_FMT_TXT_LARGE este a 1. Hasta 256 px las de Montserrat caben;
   mas arriba un parentesis o una W pasan de 255 y la fuente sale rota. */
const FUENTE_MAX_NORMAL = 256;

function genFuentesH(){
  const propias = PLAN.filter(f => f.propia);
  return cabecera('fuentes.h — declaracion de las fuentes propias',
`Los ficheros .c los genera Telar Studio al exportar y los deja en src/ui/.
Para rehacerlos a mano: fuentes/generar.cmd (o .sh).`) +
`#ifndef TELAR_FUENTES_H
#define TELAR_FUENTES_H

#include <lvgl.h>
${propias.some(f => f.px > FUENTE_MAX_NORMAL) ? `
/* Letras de mas de 255 px: sin esto LVGL las guarda en un byte y se rompen */
#if !LV_FONT_FMT_TXT_LARGE
#error "Hay una fuente de mas de ${FUENTE_MAX_NORMAL} px. Abre Documentos/Arduino/libraries/lv_conf.h y pon a 1 el LV_FONT_FMT_TXT_LARGE."
#endif
` : ''}
${propias.map(f => `extern const lv_font_t ${nombreFuente(f)};`).join('\n')}

#endif /* TELAR_FUENTES_H */
`;
}

/* Un script por sistema, con los glifos exactos de cada tamano */
function genScriptFuentes(windows){
  const propias = PLAN.filter(f => f.propia);
  /* En un .cmd de Windows el % abre una expansion de variable. La
     lista de glifos lleva un %, asi que sin duplicarlo el interprete
     se come la cadena entera y lv_font_conv recibe --symbols VACIO:
     genera una fuente valida, que enlaza sin una queja, y con CERO
     glifos. No se ve nada y nada lo explica. */
  /* Los glifos se piden por CODIGO, no como texto.
   *
   * Con --symbols hay que meter la lista entre comillas, y ahi empieza
   * el via crucis: la lista lleva un %, que en un .cmd abre una
   * expansion de variable. Duplicarlo a %% no basta, porque `call`
   * fuerza una segunda ronda de expansion y lo vuelve a comer. El
   * resultado es --symbols VACIO: una fuente sin un solo glifo, que
   * compila y enlaza sin quejarse, y una pantalla en blanco.
   *
   * Con -r 0x20,0x25,... no hay ni comillas ni caracteres especiales,
   * solo digitos hexadecimales. Ni batch ni sh tienen nada que
   * interpretar, y las dos plataformas emiten exactamente lo mismo. */
  const rangos = t => [...new Set([...t])]
    .map(c => c.codePointAt(0))
    .sort((a, b) => a - b)
    .map(c => '0x' + c.toString(16).toUpperCase())
    .join(',');
  /* La TTF de Montserrat (y la de los iconos) se busca en la libreria
     lvgl. LVGL 9.6 las movio de scripts/built_in_font a
     scripts/generators/built_in_font: se prueba primero la ruta nueva y
     luego la vieja, para que el mismo script valga con las dos. Y solo
     se exige si de verdad hay alguna Montserrat que convertir: un
     proyecto todo en Chivo y Plex no la necesita, y exigirla lo paraba
     sin motivo. */
  const [nueva, vieja] = TTF_LVGL_CARPETAS;
  const usaMontserrat = propias.some(f => !f.variante || f.variante === 'medium')
    || E.pantallas.some(p => p.widgets.some(w => iconoValido(w.icono)));   /* los iconos viven en la misma carpeta */
  const cabTTF = !usaMontserrat ? '' : windows
    ? `set LVFONTS=%USERPROFILE%\\Documents\\Arduino\\${nueva.replace(/\//g, '\\')}\r\n`
      + `if not exist "%LVFONTS%\\Montserrat-Medium.ttf" set LVFONTS=%USERPROFILE%\\Documents\\Arduino\\${vieja.replace(/\//g, '\\')}\r\n`
      + `set TTF=%LVFONTS%\\Montserrat-Medium.ttf\r\n`
      + `if not exist "%TTF%" (\r\n  echo No encuentro Montserrat-Medium.ttf en la libreria lvgl.\r\n`
      + `  echo Busque en %USERPROFILE%\\Documents\\Arduino\\${nueva.replace(/\//g, '\\')}\r\n`
      + `  echo y en %USERPROFILE%\\Documents\\Arduino\\${vieja.replace(/\//g, '\\')}\r\n`
      + `  echo Ajusta la variable LVFONTS de este fichero.\r\n  pause\r\n  exit /b 1\r\n)\r\n`
      + `set ICONOS=%LVFONTS%\\${TTF_ICONOS}\r\n\r\n`
    : `D="$HOME/Documents/Arduino/${nueva}"\n`
      + `[ -f "$D/Montserrat-Medium.ttf" ] || D="$HOME/Documents/Arduino/${vieja}"\n`
      + `TTF="$D/Montserrat-Medium.ttf"\n`
      + `[ -f "$TTF" ] || { echo "No encuentro Montserrat-Medium.ttf en la libreria lvgl ($D)"; exit 1; }\n`
      + `ICONOS="$D/${TTF_ICONOS}"\n\n`;
  const cab = (windows
    ? `@echo off\r\nREM Genera las fuentes propias de este proyecto.\r\n`
      + `REM Hace falta Node.js. NO es lento por tu ordenador: casi todo el\r\n`
      + `REM tiempo es npm resolviendo lv_font_conv en cada llamada.\r\n\r\n`
    : `#!/bin/sh\n# Genera las fuentes propias de este proyecto.\n`
      + `# Hace falta Node.js. NO es lento por tu ordenador: casi todo el\n`
      + `# tiempo es npm resolviendo lv_font_conv en cada llamada.\n\n`) + cabTTF;

  /* Sale directo a src/ui/. Pedirle al usuario que mueva los ficheros a
     mano era un paso mas que olvidar, y olvidarlo se castiga con un
     "undefined reference to telar_montserrat_NN" que no dice ni fuentes
     ni scripts ni nada. */
  const destino = windows ? '..\\src\\ui\\' : '../src/ui/';
  /* --no-compress NO es opcional.
   *
   * Sin el, lv_font_conv emite los mapas de bits comprimidos en RLE y
   * pone bitmap_format = 1. LVGL solo sabe leer eso si LV_USE_FONT_COMPRESSED
   * esta a 1 en lv_conf.h, y viene a 0 de fabrica. Con la combinacion
   * mala la fuente COMPILA y ENLAZA sin una queja, y luego no dibuja
   * absolutamente nada: el texto desaparece y no hay ningun sintoma que
   * apunte a la fuente.
   *
   * Las fuentes que LVGL trae de serie se generan con --no-compress; se
   * hace lo mismo. Ocupa aproximadamente el doble y se dibuja mas rapido.
   *
   * --force-fast-kern-format es lo que usan tambien las suyas. */
  /* Si el proyecto usa iconos, la fuente propia tiene que llevarlos
   * DENTRO. Los de LVGL son de FontAwesome, y el Montserrat no los tiene:
   * sin este segundo --font el boton sale con un hueco en blanco donde
   * deberia estar el dibujo, y la fuente compila igual de bien.
   *
   * lv_font_conv admite varios --font, cada uno con su propio -r: es
   * exactamente lo que hace LVGL para construir las suyas. */
  /* Cada fuente lleva los iconos que usa: los de LVGL si el proyecto usa
     alguno (van todos, como en las suyas) y los del catalogo que caigan
     en ella. Van por el segundo --font; del primero se quitan, que el
     Montserrat o el Chivo no los tienen. */
  const usaIconos = E.pantallas.some(p => p.widgets.some(w => esIconoLVGL(w.icono)));
  const iconosDe = f => {
    const cps = [...(usaIconos ? SIMBOLOS_RANGO.split(',').map(Number) : []),
                 ...[...f.glifos].filter(esPUA).map(c => c.codePointAt(0))];
    if (!cps.length) return '';
    const r = [...new Set(cps)].sort((a, b) => a - b).join(',');
    return windows ? ` --font "%ICONOS%" -r ${r}` : ` --font "$ICONOS" -r ${r}`;
  };

  /* La negrita y la cursiva no vienen con LVGL: salen de las TTF de
     Montserrat que se descargan una vez a Documentos\Arduino\fuentes_telar.
     Chivo e IBM Plex Mono vienen con Telar y se copian AL LADO de este
     script al exportar: no hay nada que descargar. */
  const varTTF = f => (f.variante && f.variante !== 'medium') ? 'TTF_' + f.variante.toUpperCase() : 'TTF';
  const variantes = [...new Set(propias.map(f => f.variante || 'medium'))].filter(v => v !== 'medium');
  const ttfVariantes = variantes.map(va => { const V = 'TTF_' + va.toUpperCase(), fich = TIPOS[va].ttf;
    if (tipoLibre(va)) return windows
      ? `set ${V}=%~dp0${fich}\r\nif not exist "%${V}%" (\r\n  echo No encuentro ${fich} al lado de este script: vuelve a exportar desde Telar Studio.\r\n  pause\r\n  exit /b 1\r\n)\r\n\r\n`
      : `${V}="$(dirname "$0")/${fich}"\n[ -f "$${V}" ] || { echo "No encuentro ${fich} al lado de este script: vuelve a exportar desde Telar Studio."; exit 1; }\n\n`;
    return windows
      ? `set ${V}=%USERPROFILE%\\Documents\\Arduino\\fuentes_telar\\${fich}\r\nif not exist "%${V}%" (\r\n  echo No encuentro ${fich} en %${V}%\r\n  echo Descarga Montserrat de https://fonts.google.com/specimen/Montserrat y copia static\\${fich} a esa carpeta.\r\n  pause\r\n  exit /b 1\r\n)\r\n\r\n`
      : `${V}="$HOME/Documents/Arduino/fuentes_telar/${fich}"\n[ -f "$${V}" ] || { echo "No encuentro ${fich} en $${V}. Descarga Montserrat de https://fonts.google.com/specimen/Montserrat y copia static/${fich} ahi."; exit 1; }\n\n`;
  }).join('');

  const linea = f => (windows ? `call npx --yes lv_font_conv@1.5.3 --font "%${varTTF(f)}%"` : `npx --yes lv_font_conv@1.5.3 --font "$${varTTF(f)}"`)
    + ` --size ${f.px} --bpp 4 --no-compress --force-fast-kern-format`
    + ` -r ${rangos([...f.glifos].filter(c => !esPUA(c) && (!(TIPOS[f.variante] || {}).solo || TIPOS[f.variante].solo.includes(c))).join(''))}${iconosDe(f)}`
    + ` --format lvgl --lv-include lvgl.h`
    + ` -o ${destino}${nombreFuente(f)}.c`;

  /* Una fuente sin glifos pesa unos pocos KB y compila perfectamente:
     sin esta comprobacion el fallo no aparece hasta que miras la
     pantalla y no hay nada. */
  /* El umbral depende de lo que se pidio: una Plex de 11 px con 29
     glifos pesa 10 KB de verdad, y un umbral fijo de 20 KB (pensado para
     las Montserrat grandes) daba la alarma sin motivo. Una fuente vacia
     de verdad son unos 4 KB de cabecera. */
  const minimo = f => Math.round(4000 + f.glifos.length * f.px * f.px * 0.6);
  const comprueba = propias.map(f => windows
    ? `for %%F in ("${destino}${nombreFuente(f)}.c") do if %%~zF LSS ${minimo(f)} ` +
      `echo ATENCION: ${nombreFuente(f)}.c salio casi vacio, la fuente no tendra glifos.\r\n`
    : `if [ $(wc -c < "${destino}${nombreFuente(f)}.c") -lt ${minimo(f)} ]; then ` +
      `echo "ATENCION: ${nombreFuente(f)}.c salio casi vacio, la fuente no tendra glifos."; fi\n`
  ).join('');

  const fin = windows
    ? `\r\necho.\r\necho Listo. Los .c estan ya en src\\ui\\ - abre el .ino y sube.\r\npause\r\n`
    : `\necho "Listo. Los .c estan ya en src/ui/ — abre el .ino y sube."\n`;

  /* La comprobacion va DESPUES de generar, no antes */
  return cab + ttfVariantes + propias.map(f =>
    (windows ? `echo Generando ${f.px} px${f.variante && f.variante !== 'medium' ? ' ' + f.variante : ''}... (unos 8 segundos; el PRIMERO tarda cerca de un minuto, que es npm descargando la herramienta)\r\n` : `echo "Generando ${f.px} px${f.variante && f.variante !== 'medium' ? ' ' + f.variante : ''}... (unos 8 segundos; el PRIMERO tarda cerca de un minuto, que es npm descargando la herramienta)"\n`)
    + linea(f) + (windows ? '\r\n' : '\n')).join(windows ? '\r\n' : '\n') + comprueba + fin;
}

/* Montserrat en negrita o cursiva (no una familia propia como Chivo) */
const montVariante = f => !!f.variante && f.variante !== 'medium' && !tipoLibre(f.variante);
/* Como se llama la letra en el LEEME: "Montserrat", "Montserrat negrita", "Oswald 600"... */
const nombreLeeme = f => tipoLibre(f.variante)
  ? ((TIPOS[f.variante] || {}).nombre || f.variante)
  : 'Montserrat' + (montVariante(f) ? ' ' + (NOMBRE_VARIANTE[f.variante] || f.variante) : '');
function genLeemeFuentes(){
  const propias = PLAN.filter(f => f.propia);
  return `FUENTES PROPIAS DE ESTE PROYECTO
${'='.repeat(50)}

Este proyecto usa tamanos o caracteres que LVGL no trae compilados:

${propias.map(f => `  ${f.px} px ${nombreLeeme(f)}  ${tipoLibre(f.variante) ? '(otra tipografia: se genera desde su TTF, en esta carpeta)' : montVariante(f) ? '(negrita o cursiva: LVGL solo trae la normal)' : f.px > FUENTE_MAX_NORMAL ? '(tan grande que necesita LV_FONT_FMT_TXT_LARGE a 1 en lv_conf.h)' : f.px > 48 ? '(pasa de 48, el maximo de LVGL)' : '(lleva caracteres fuera de ASCII)'}
       glifos: ${f.glifos}`).join('\n\n')}
${propias.some(montVariante) ? `
NEGRITA Y CURSIVA
-----------------
LVGL solo trae Montserrat normal. La negrita y la cursiva se generan desde
las TTF de Montserrat (licencia libre OFL), que hay que tener UNA vez:

  1. Descarga Montserrat de https://fonts.google.com/specimen/Montserrat
  2. Abre el zip y, de la carpeta static, copia estos ficheros a
     Documentos\\Arduino\\fuentes_telar\\ :

${[...new Set(propias.filter(montVariante).map(f => TTF_VARIANTE[f.variante]))].map(x => '       ' + x).join('\n')}

Si falta alguno, el script lo dice y se para.
` : ''}
QUE HACER
---------
Normalmente, nada: Telar Studio genera estas fuentes al exportar y deja
los .c en src/ui/. El aviso del final de la exportacion dice si alguna
no se pudo (la negrita y la cursiva de Montserrat no vienen con Telar).

Para generarlas a mano, o rehacerlas, ejecuta aqui dentro:

  Windows:   generar.cmd
  Linux/Mac: sh generar.sh

Hace falta Node.js instalado. La primera vez descarga lv_font_conv, la
herramienta oficial de LVGL; despues ya funciona sin internet.

Los .c salen DIRECTAMENTE a src/ui/. No hay que mover nada: en cuanto
termine, abre el .ino y sube.

SI TE LO SALTAS
---------------
El sketch compila pero NO enlaza, con un error asi:

  undefined reference to \`telar_montserrat_NN'

No menciona fuentes ni scripts. Si lo ves, es esto: vuelve aqui y
ejecuta el script.

POR QUE SOLO ESTOS GLIFOS
-------------------------
Una Montserrat de 72 px con todo el ASCII ocupa 208 KB de flash. Con
solo los caracteres que usan tus pantallas, baja a unos 31 KB. Por eso
la lista de glifos de arriba es la que es: sale de tus textos.

Si anades textos nuevos con letras que no esten en esa lista, vuelve a
exportar desde Telar Studio y ejecuta el script otra vez.
`;
}

function genConfPlaca(){
  const P = placa();
  /* El nombre de la placa dentro de ESP32_Display_Panel. Estuvo clavado
     al de la Waveshare: al elegir otra placa salia su configuracion, y
     el proyecto compilaba y no encendia. */
  const macro = P.esp_panel_macro || 'BOARD_WAVESHARE_ESP32_S3_TOUCH_LCD_4_3_B';
  return `/* Configuracion de placa — generado por Telar Studio */
#pragma once

#define ESP_PANEL_BOARD_DEFAULT_USE_SUPPORTED (1)

#if ESP_PANEL_BOARD_DEFAULT_USE_SUPPORTED
#define ${macro}
#endif

#define ESP_PANEL_BOARD_SUPPORTED_FILE_VERSION_MAJOR 1
#define ESP_PANEL_BOARD_SUPPORTED_FILE_VERSION_MINOR 2
#define ESP_PANEL_BOARD_SUPPORTED_FILE_VERSION_PATCH 0
`;
}

/* La seccion de fuentes del LEEME, tal como estaba: solo tiene sentido con LVGL */
function seccionFuentesLeeme(usadas, propias){
  return `ANTES DE COMPILAR: LA MEMORIA DE LVGL
-------------------------------------
LVGL reserva su memoria como diga Documentos\\Arduino\\libraries\\lv_conf.h,
que es uno solo para todos tus proyectos. Si alli la saca de la PSRAM
(LV_MEM_POOL_ALLOC con MALLOC_CAP_SPIRAM), solo vale en placas CON PSRAM
y con "PSRAM: Enabled" en Herramientas. En una sin ella (un DevKit v1, una
C3...) el sketch se para al compilar con un aviso que lo dice.

Para que valga en todas, deja la memoria asi en lv_conf.h:

     #if defined(BOARD_HAS_PSRAM)
         #define LV_MEM_SIZE (512 * 1024U)
     #else
         #define LV_MEM_SIZE (96 * 1024U)
     #endif
         #define LV_MEM_POOL_EXPAND_SIZE 0
         #define LV_MEM_ADR 0
     #if defined(BOARD_HAS_PSRAM)
         #define LV_MEM_POOL_INCLUDE <esp_heap_caps.h>
         #define LV_MEM_POOL_ALLOC(size) heap_caps_malloc((size), MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT)
     #endif

Con PSRAM, 512 kB sacados de ella; sin PSRAM, 96 kB de la memoria normal:
una OLED o una TFT pequena con unas pocas pantallas van sobradas. Un
proyecto grande (muchas pantallas de 800x480) necesita una placa con PSRAM.

ANTES DE COMPILAR: LAS FUENTES
------------------------------
Hay dos clases de fuente, y se tratan distinto. Confundirlas es la causa
numero uno de perder una tarde.

A) TAMANOS QUE LVGL TRAE COMPILADOS (hasta 48 px, solo ASCII)
   Hay que activarlos a mano. Abre
   Documentos\\Arduino\\libraries\\lv_conf.h y comprueba que estan a 1:

${usadas.length ? usadas.map(px => `     #define LV_FONT_MONTSERRAT_${px} 1`).join('\n')
                : '     (este proyecto no usa ninguno)'}

   Si falta alguno, el error NO menciona la fuente: dice que no
   encuentra un simbolo.

B) FUENTES PROPIAS${propias.length ? ' — ESTE PROYECTO USA ' + propias.map(f=>f.px+' px').join(', ') : ' (este proyecto no usa)'}
${propias.length ? `
   Pasan de 48 px o llevan tildes, asi que LVGL NO las tiene. Telar
   Studio las genera al exportar y las deja en src\\ui\\. Si el aviso del
   final dijo que alguna no se pudo, o para rehacerlas a mano:

     1. entra en la carpeta fuentes\\
     2. ejecuta generar.cmd  (hace falta Node.js; deja los .c en src\\ui\\)

   NO las pongas en lv_conf.h. Escribir ahi
   #define LV_FONT_MONTSERRAT_${propias[0].px} 1 declara un simbolo que
   no define nadie, y el fallo salta en el ENLAZADO:
   "undefined reference to lv_font_montserrat_${propias[0].px}".
` : ''}

`;
}

/* En su lugar, con una pantalla serie: que hay que hacer al otro lado */
function seccionPantallaSerie(){
  const P = placa(), SE = P.serie || {};
  if (SE.protocolo === 'lineas') return textoProtocoloLineas() + '\n';
  return `LA PANTALLA (NEXTION)
---------------------
Este proyecto no dibuja la pantalla: la Nextion se dibuja en su propio
editor (Nextion Editor, gratis, de nextion.tech). Abre NEXTION.txt y
sigue la lista: paginas, componentes con su nombre exacto, su posicion y
el codigo de cada boton. Compila alli el .tft y cargalo en la pantalla
con una tarjeta microSD o por el puerto serie.

Aqui no hace falta LVGL ni ninguna libreria mas: el ESP32 solo manda
textos y numeros por el puerto serie (Serial1, GPIO${SE.tx} y GPIO${SE.rx}).

`;
}

function genLeeme(){
  const P = placa();
  /* Lo que el codigo generado nombra de verdad, no lo que el plan
     apunto: son listas distintas y la que importa es esta. */
  const usadas     = esSerie(placa()) ? [] : fuentesCompiladasDe(genUiCpp());
  const propias    = PLAN.filter(f =>  f.propia);
  return `${E.proyecto} — generado por Telar Studio
${'='.repeat(60)}

QUE HACER CON ESTO
------------------
1. Copia esta carpeta entera dentro de tu carpeta Arduino
   (Documentos\\Arduino\\${cid(E.proyecto)}).
2. Abre ${cid(E.proyecto)}.ino con el IDE de Arduino.
3. En Herramientas, comprueba:
${Object.entries(P.opciones_ide).map(([k,v]) => `     ${k}: ${v}`).join('\n')}
   ${P.nota_ide}
4. Sube.

LIBRERIAS QUE HACEN FALTA
-------------------------
En el IDE: Herramientas > Administrar bibliotecas, y busca cada una.

${esSerie(P) ? '     Ninguna: con una pantalla serie no hace falta LVGL.' : (PUERTOS[puertoDe(P)]?.librerias || ['lvgl 9.x']).map(x => `     ${x}`).join('\n')}
${esSerie(P) ? '' : puertoDe(P) === 'lovyan' ? `
   La pantalla de este proyecto esta descrita en pantalla.h, DENTRO de
   esta carpeta. No hay que editar ningun fichero de dentro de la
   libreria: ni User_Setup.h ni nada parecido.` : `
   La placa esta descrita dentro de ESP32_Display_Panel; aqui solo se
   dice cual es, en esp_panel_board_supported_conf.h.`}

${esSerie(P) ? seccionPantallaSerie() : seccionFuentesLeeme(usadas, propias)}QUE FICHERO ES DE QUIEN
-----------------------
  ${cid(E.proyecto)}.ino   generado   arranque y reparto de tareas
  state.h                  generado   la instantanea y los eventos
  control.cpp              generado   la tarea de control
  hal.h                    generado   la frontera con el hardware
  plant_sim.cpp            generado   planta simulada (borrar al tener hardware)
  src/ui/                  generado   las pantallas
${esSerie(P) ? `  NEXTION.txt / src/ui/    generado   la capa serie y lo que hay que crear en la pantalla
` : puertoDe(P) === 'lovyan' ? `  pantalla.h               generado   controlador, pines y tactil de la pantalla
  lvgl_lgfx_port.*         del runtime  LVGL sobre LovyanGFX
` : `  esp_panel_board_supported_conf.h  generado  que placa es, para la libreria
  lvgl_v9_port.*           del runtime  LVGL sobre ESP32_Display_Panel
`}${logicaModelo() ? `  logica.h / logica.cpp    generado   la logica que escribiste en la pestana Logica
` : ''}${hayEnlace() ? `  enlace.h / enlace.cpp    generado   el protocolo con el otro nodo
` : ''}  src/logic/               TUYO       aqui va tu logica; no se sobrescribe

Al volver a exportar desde Telar Studio, todo lo marcado "generado" se
reescribe. src/logic/ no se toca nunca.

DE SIMULADO A REAL
------------------
plant_sim.cpp implementa hal.h con un modelo, para que la aplicacion
funcione sin un solo cable. Cuando tengas el hardware, borra ese fichero
y crea hal.cpp con las mismas funciones, leyendo de verdad. No hay que
tocar nada mas.
`;
}

/* =====================================================================
 * EL SEGUNDO NODO Y EL ENLACE
 *
 * Todo lo que sigue existe para que un alumno no tenga que escribir ni
 * una linea de protocolo. El profesor declara "una entrada analogica en
 * el nodo de control" y "un numero grande enlazado a ella", y de ahi
 * salen los dos sketches, con las tramas, el checksum y el aviso de
 * enlace caido ya puestos.
 * ===================================================================== */

/* Las variables que el nodo de control mide y manda a la pantalla */
function varsRemotas(){
  return variables().filter(v => v.remota && v.dir === 'lectura');
}

/* Hay enlace si cruza algo, en cualquiera de los dos sentidos. Mirar
   solo las lecturas dejaba sin ficheros de enlace a un sistema que solo
   manda ordenes — una pantalla con un interruptor y un rele al otro
   lado, que es el ejemplo mas simple de todos. */
function hayEnlace(){
  return E.nodos.length > 1 && (varsRemotas().length > 0 || varsOrden().length > 0);
}

/* Lo que viaja en el otro sentido: ordenes de la pantalla al nodo de
   control. Mismo criterio, cambiando la direccion. */
function varsOrden(){
  return variables().filter(v => v.remota && v.dir === 'escritura');
}

/* Las que son un PULSO y no un estado.
   Un Boton no es un interruptor: "aceptar" vale 1 el instante en que se
   pulsa y tiene que volver a 0 solo, o se queda dado para siempre. */
function varsPulso(){
  const conBoton = new Set();
  for (const p of E.pantallas) for (const w of p.widgets)
    if (w.tipo === 'button' && w.bind) conBoton.add(w.bind);
  return varsOrden().filter(v => v.booleano && conBoton.has(v.nombre));
}

/* Nombre de carpeta de cada nodo */
const carpetaNodo = n => cid(E.proyecto) + '_' + (n === nodoHMI() ? 'pantalla' : 'control');

/* ---------------------------------------------------------------------
 * EL PROTOCOLO, explicado una sola vez
 * ------------------------------------------------------------------- */
/* TAMANOS DEL ENLACE
   Una medida o una orden viaja en decimas y cabe en 11 caracteres
   (-2147483648). De aqui salen el tamano de los buffers de los DOS nodos
   (antes 96 fijos: con muchas medidas la trama no cabia y se tiraba
   siempre, y la pantalla daba el enlace por caido sin decir por que) y
   lo que se espera a la respuesta. */
const largoRespuesta = () => 4 + 12 * varsRemotas().length + 4;            /* $TLR ,valor... *XX y salto */
const largoPregunta  = () => 2 + 5 + Math.max(4, ...varsOrden().map(v => v.nombre.length)) + 12 + 4;   /* relleno, $CMD, nombre, valor, *XX */
const largoLinea     = () => Math.max(96, Math.ceil((Math.max(largoRespuesta(), largoPregunta()) + 16) / 16) * 16);
const baudiosEnlace  = () => Number(E.enlace && (E.enlace.baudios ?? ENLACES[E.enlace.tipo].baudios)) || 9600;
/* Lo que tardan como mucho una pregunta y su respuesta, en ms: 10 bits
   por caracter, mas el respiro del otro nodo antes de contestar y un
   margen. Por radio o CAN la trama es corta y rapida. */
/* Cuanto sin noticias de la pantalla hasta poner las salidas a salvo:
   un segundo, o mas si el enlace es tan lento que una pregunta tarda. */
const falloSeguroMs = () => Math.max(1000, 4 * esperaRespuestaMs());
/* El XOR de una trama, para que los ejemplos de los comentarios sean
   tramas de verdad y se puedan comparar con el monitor */
const xorTrama = t => [...t].reduce((x, c) => x ^ c.charCodeAt(0), 0).toString(16).toUpperCase().padStart(2, '0');
/* Una orden de ESTE proyecto para los ejemplos (o una generica) */
function ordenEjemplo(){
  const v = varsOrden()[0];
  if (!v) return { nombre: 'nombre', valor: 1, texto: 'el valor' };
  if (v.booleano) return { nombre: v.nombre, valor: 1, texto: 'encendido (las de si/no van como 0 o 1)' };
  const ej = Math.round((v.inicial ?? 12.5) * 10) || 125;
  return { nombre: v.nombre, valor: ej, texto: `el valor, en decimas: ${(ej / 10).toFixed(1).replace('.', ',')}` };
}
/* La clave que ponen los dos nodos en cada paquete de radio: sin ella,
   dos equipos iguales en la misma sala se obedecerian el uno al otro.
   Sale del proyecto (Hardware la deja cambiar). */
function claveEnlace(){
  if (E.enlace && E.enlace.clave) return String(E.enlace.clave).replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'TELAR';
  let h = 0x811c9dc5;
  for (const c of String(E.proyecto || 'telar')) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return (h & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function esperaRespuestaMs(){
  if (esCAN() || esRadio()) return 30;
  const ms = (largoPregunta() + largoRespuesta()) * 10 * 1000 / baudiosEnlace();
  return Math.min(1000, Math.ceil(ms) + 15);
}

function textoProtocolo(){
  const vs = varsRemotas();
  /* Un ejemplo con numeros de verdad explica el formato mejor que
     cualquier descripcion: se ve la cabecera, se ven las decimas y se ve
     donde acaba el trozo que cuenta para el XOR. */
  const ej = vs.map(v => Math.round(((v.min + v.max) / 2) * 10)).join(',');
  return `La pantalla pregunta y el nodo de control contesta: nunca hablan los
dos a la vez. Cada pregunta lleva una orden (o un "ping" si no hay
ninguna) y la respuesta lleva, en una sola linea, todo lo que mide el
nodo de control. Con ${vs.length === 0 ? 'ninguna medida la respuesta es solo un latido' : vs.length === 1 ? 'un solo valor' : vs.length + ' valores'}${vs.length === 0 ? ':' : ' queda asi:'}

    $TLR,${ej}*XX

  $TLR      cabecera, para reconocer donde empieza la trama
${vs.map((v, k) => `    campo ${k + 1}${' '.repeat(Math.max(1, 4 - String(k + 1).length))}${v.nombre}, en decimas (${v.min} a ${v.max} ${v.unidad || ''})`).join('\n')}
  *XX       XOR de todo lo que hay entre '$' y '*', en hexadecimal

Los valores viajan como ENTEROS en decimas: 24.7 se manda como 247. Se
hace asi para no depender de como cada placa imprime los decimales, que
es una fuente de sorpresas.

Es texto a proposito: puedes abrir el monitor serie del nodo de control
y leer las tramas con los ojos. El XOR descarta las que llegan con ruido
y, de propina, la basura que el arranque escupe por ese puerto.`;
}

/* ---------------------------------------------------------------------
 * NODO DE CONTROL — config.h
 * ------------------------------------------------------------------- */
/* =====================================================================
 * BUSES, PUERTOS Y RADIOS
 *
 * Un bus no produce variables, y el generador del HAL recorre variables.
 * Por eso hasta ahora el editor reservaba los pines de un I2C y el sketch
 * salia sin un solo Wire.begin(): la conexion existia en el diseno y no
 * en el codigo.
 *
 * Esto recorre las CONEXIONES del nodo y emite el arranque de cada una.
 * Lo que se emite es el ARRANQUE y un SITIO DONDE ESCRIBIR, nunca el
 * driver de un chip concreto: quien conecte un sensor de temperatura
 * escribe su lectura, quien conecte otra cosa escribe la suya, y el bus
 * ya esta en pie con los pines correctos. La herramienta no se casa con
 * ninguna referencia.
 * ================================================================== */

/* Los pines que el asignador dio a una pieza, en orden */
const pinesDe = fila => numsDe(fila?.pin);

/* Una entrada por tipo de conexion. Devuelve:
 *   incluye  cabeceras
 *   define   lineas para la zona de constantes
 *   declara  prototipos para el .h
 *   init     cuerpo de buses_init()
 *   cuerpo   funciones del .cpp
 * Lo que no aparece aqui es que no necesita codigo: un pin suelto ya lo
 * emite el HAL. */
const BUSES = {

  i2c: (pz, pn, par) => {
    const N = MAY(pz.clave);
    const frec = par.frecuencia || 400000;
    return {
      incluye: ['<Wire.h>'],
      define: [`#define PIN_${N}_SDA        ${pn[0] ?? -1}`,
               `#define PIN_${N}_SCL        ${pn[1] ?? -1}`,
               `#define ${N}_FRECUENCIA     ${frec}`],
      declara: [`void ${pz.clave}_buscar(void);`,
                `bool ${pz.clave}_escribir(uint8_t dir, const uint8_t *datos, size_t n);`,
                `bool ${pz.clave}_leer(uint8_t dir, uint8_t *datos, size_t n);`,
                `bool ${pz.clave}_registro(uint8_t dir, uint8_t reg, uint8_t *datos, size_t n);`],
      init: `    Wire.begin(PIN_${N}_SDA, PIN_${N}_SCL, ${N}_FRECUENCIA);
    Serial.printf("I2C ${pz.clave}: SDA=%d SCL=%d a %d Hz\\n",
                  PIN_${N}_SDA, PIN_${N}_SCL, ${N}_FRECUENCIA);`,
      cuerpo: `/* ---------------------------------------------------------------------
 * ${pz.clave} — bus I2C
 *
 * Empieza SIEMPRE por ${pz.clave}_buscar(). Si tu chip no aparece en la
 * lista, no es un problema de codigo: o esta mal alimentado, o le faltan
 * las resistencias de pull-up, o has cambiado SDA y SCL de sitio. Seguir
 * escribiendo driver sin ver la direccion es perder la tarde.
 * ------------------------------------------------------------------- */
void ${pz.clave}_buscar(void)
{
    Serial.println("${pz.clave}: buscando...");
    int hallados = 0;
    for (uint8_t d = 1; d < 127; d++) {
        Wire.beginTransmission(d);
        if (Wire.endTransmission() == 0) {
            Serial.printf("  responde 0x%02X\\n", d);
            hallados++;
        }
    }
    if (!hallados) Serial.println("  nadie responde");
}

bool ${pz.clave}_escribir(uint8_t dir, const uint8_t *datos, size_t n)
{
    Wire.beginTransmission(dir);
    Wire.write(datos, n);
    return Wire.endTransmission() == 0;
}

bool ${pz.clave}_leer(uint8_t dir, uint8_t *datos, size_t n)
{
    if (Wire.requestFrom(dir, (uint8_t)n) != n) return false;
    for (size_t i = 0; i < n; i++) datos[i] = Wire.read();
    return true;
}

/* Lo mas comun: apuntar a un registro y leer de ahi. El repeated start
   (endTransmission(false)) importa: muchos chips pierden el puntero si
   entre medias se suelta el bus. */
bool ${pz.clave}_registro(uint8_t dir, uint8_t reg, uint8_t *datos, size_t n)
{
    Wire.beginTransmission(dir);
    Wire.write(reg);
    if (Wire.endTransmission(false) != 0) return false;
    return ${pz.clave}_leer(dir, datos, n);
}`
    };
  },

  spi: (pz, pn) => {
    const N = MAY(pz.clave);
    return {
      incluye: ['<SPI.h>'],
      define: [`#define PIN_${N}_SCK        ${pn[0] ?? -1}`,
               `#define PIN_${N}_MISO       ${pn[1] ?? -1}`,
               `#define PIN_${N}_MOSI       ${pn[2] ?? -1}`,
               `#define PIN_${N}_CS         ${pn[3] ?? -1}`],
      declara: [`void ${pz.clave}_hablar(const uint8_t *envia, uint8_t *recibe, size_t n, uint32_t hz);`],
      init: `    pinMode(PIN_${N}_CS, OUTPUT);
    digitalWrite(PIN_${N}_CS, HIGH);          /* en reposo, sin seleccionar */
    SPI.begin(PIN_${N}_SCK, PIN_${N}_MISO, PIN_${N}_MOSI, PIN_${N}_CS);`,
      cuerpo: `/* ---------------------------------------------------------------------
 * ${pz.clave} — bus SPI
 *
 * El bus se comparte; el CS no. Cada chip necesita el suyo, y el modo y
 * la velocidad son del chip, no del bus: por eso van como argumento.
 * ------------------------------------------------------------------- */
void ${pz.clave}_hablar(const uint8_t *envia, uint8_t *recibe, size_t n, uint32_t hz)
{
    SPI.beginTransaction(SPISettings(hz, MSBFIRST, SPI_MODE0));
    digitalWrite(PIN_${N}_CS, LOW);
    for (size_t i = 0; i < n; i++) {
        uint8_t r = SPI.transfer(envia ? envia[i] : 0x00);
        if (recibe) recibe[i] = r;
    }
    digitalWrite(PIN_${N}_CS, HIGH);
    SPI.endTransaction();
}`
    };
  },

  uart: (pz, pn, par, ctx) => puertoSerie(pz, pn, par, ctx, false),
  rs485: (pz, pn, par, ctx) => puertoSerie(pz, pn, par, ctx, true),

  onewire: (pz, pn) => {
    const N = MAY(pz.clave);
    return {
      /* La libreria no la trae el core. Con __has_include el sketch
         compila igual sin ella y dice por que no hace nada, en vez de
         romperse con un error de cabecera que no explica nada. */
      incluye: [],
      define: [`#define PIN_${N}           ${pn[0] ?? -1}`],
      declara: [],
      preambulo: `#if __has_include(<OneWire.h>)
  #include <OneWire.h>
  static OneWire ${pz.clave}_bus(PIN_${N});
  #define HAY_ONEWIRE_${N} 1
#else
  #define HAY_ONEWIRE_${N} 0
#endif`,
      init: `#if HAY_ONEWIRE_${N}
    Serial.printf("OneWire ${pz.clave} en GPIO%d\\n", PIN_${N});
#else
    Serial.println("OneWire ${pz.clave}: falta la libreria OneWire; "
                   "instalala desde el gestor de librerias");
#endif`,
      cuerpo: `/* ---------------------------------------------------------------------
 * ${pz.clave} — OneWire
 *
 * El bus queda montado en ${pz.clave}_bus. La sonda que cuelgues de el
 * la lees tu: cada familia tiene sus comandos, y ponerlos aqui seria
 * atarte a una referencia concreta.
 *
 * No olvides la resistencia de 4,7 k del dato a 3,3 V: sin ella el bus
 * parece funcionar a ratos, que es peor que no funcionar.
 * ------------------------------------------------------------------- */`
    };
  },

  wifi: (pz, pn, par) => {
    const N = MAY(pz.clave);
    return {
      incluye: ['<WiFi.h>'],
      define: [`#define ${N}_SSID           "${txtC(par.ssid || 'mi-red')}"`,
               `#define ${N}_CLAVE          "${txtC(par.clave || '')}"`,
               `#define ${N}_ESPERA_MS      ${par.espera || 15000}`],
      declara: [`bool ${pz.clave}_conectado(void);`],
      init: `    WiFi.mode(WIFI_STA);
    WiFi.begin(${N}_SSID, ${N}_CLAVE);
    {
        uint32_t t0 = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - t0 < ${N}_ESPERA_MS) delay(200);
    }
    if (WiFi.status() == WL_CONNECTED)
        Serial.printf("WiFi ${pz.clave}: %s\\n", WiFi.localIP().toString().c_str());
    else
        Serial.println("WiFi ${pz.clave}: no conecta; el programa sigue igual");`,
      cuerpo: `/* ---------------------------------------------------------------------
 * ${pz.clave} — WiFi
 *
 * El arranque NO bloquea para siempre: si la red no esta, se rinde a los
 * ${par.espera || 15000} ms y el resto del programa sigue. Un nodo que se queda colgado
 * esperando una red es un nodo muerto, y en un aula la red falla.
 *
 * OJO: con la radio encendida el ADC2 deja de leer, en silencio. Todo lo
 * analogico tiene que estar en ADC1.
 * ------------------------------------------------------------------- */
bool ${pz.clave}_conectado(void) { return WiFi.status() == WL_CONNECTED; }`
    };
  },

  bluetooth: (pz, pn, par, ctx) => {
    const N = MAY(pz.clave);
    const nombre = txtC(par.nombre || 'telar');
    return {
      incluye: ['<BLEDevice.h>', '<BLEServer.h>', '<BLEUtils.h>', '<BLE2902.h>'],
      define: [`#define ${N}_NOMBRE         "${nombre}"`,
               `#define ${N}_SERVICIO       "0000ffe0-0000-1000-8000-00805f9b34fb"`,
               `#define ${N}_CARACT         "0000ffe1-0000-1000-8000-00805f9b34fb"`],
      declara: [`void ${pz.clave}_enviar(const char *txt);`,
                `bool ${pz.clave}_conectado(void);`],
      preambulo: `static BLECharacteristic *${pz.clave}_car = NULL;
static volatile bool ${pz.clave}_hay = false;

class ${pz.clave}_Sesion : public BLEServerCallbacks {
    void onConnect(BLEServer *s)    override { ${pz.clave}_hay = true;  }
    void onDisconnect(BLEServer *s) override { ${pz.clave}_hay = false;
        /* Sin esto, tras la primera desconexion no vuelve a aparecer. */
        BLEDevice::startAdvertising();
    }
};`,
      init: `    BLEDevice::init(${N}_NOMBRE);
    {
        BLEServer *srv = BLEDevice::createServer();
        srv->setCallbacks(new ${pz.clave}_Sesion());
        BLEService *svc = srv->createService(${N}_SERVICIO);
        ${pz.clave}_car = svc->createCharacteristic(
            ${N}_CARACT,
            BLECharacteristic::PROPERTY_READ   |
            BLECharacteristic::PROPERTY_WRITE  |
            BLECharacteristic::PROPERTY_NOTIFY);
        ${pz.clave}_car->addDescriptor(new BLE2902());
        svc->start();
        BLEAdvertising *adv = BLEDevice::getAdvertising();
        adv->addServiceUUID(${N}_SERVICIO);
        adv->setScanResponse(true);
        BLEDevice::startAdvertising();
    }
    Serial.println("BLE ${pz.clave}: anunciando como " ${N}_NOMBRE);`,
      cuerpo: `/* ---------------------------------------------------------------------
 * ${pz.clave} — Bluetooth de baja energia (BLE)
 *
 * Es BLE y no el Bluetooth "de toda la vida" (SPP, BluetoothSerial) por
 * una razon de hardware: el ESP32-S3 NO TIENE Bluetooth clasico. Solo
 * BLE. Un sketch con BluetoothSerial.h ni siquiera compila en esta
 * familia, asi que emitirlo seria darte algo que no arranca.
 *
 * Para probarlo vale cualquier aplicacion de BLE del movil: busca
 * ${nombre}, y la caracteristica acepta escribir y notifica lo que
 * mandes con ${pz.clave}_enviar().
 *
 * La radio tambien veta el ADC2, igual que el WiFi.
 * ------------------------------------------------------------------- */
void ${pz.clave}_enviar(const char *txt)
{
    if (!${pz.clave}_car || !${pz.clave}_hay) return;
    ${pz.clave}_car->setValue((uint8_t *)txt, strlen(txt));
    ${pz.clave}_car->notify();
}

bool ${pz.clave}_conectado(void) { return ${pz.clave}_hay; }`
    };
  },

  can: (pz, pn, par) => {
    const N = MAY(pz.clave);
    const vel = String(par.velocidad || '500').replace(/[^\d]/g, '') || '500';
    return {
      incluye: ['"driver/twai.h"'],
      define: [`#define PIN_${N}_TX         ${pn[0] ?? -1}`,
               `#define PIN_${N}_RX         ${pn[1] ?? -1}`],
      declara: [`bool ${pz.clave}_enviar(uint32_t id, const uint8_t *datos, uint8_t n);`,
                `bool ${pz.clave}_recibir(uint32_t *id, uint8_t *datos, uint8_t *n);`],
      init: `    {
        twai_general_config_t g = TWAI_GENERAL_CONFIG_DEFAULT(
            (gpio_num_t)PIN_${N}_TX, (gpio_num_t)PIN_${N}_RX, TWAI_MODE_NORMAL);
        twai_timing_config_t  t = TWAI_TIMING_CONFIG_${vel}KBITS();
        twai_filter_config_t  fl = TWAI_FILTER_CONFIG_ACCEPT_ALL();
        if (twai_driver_install(&g, &t, &fl) == ESP_OK && twai_start() == ESP_OK)
            Serial.printf("CAN ${pz.clave}: TX=%d RX=%d a ${vel} kbit\\n",
                          PIN_${N}_TX, PIN_${N}_RX);
        else
            Serial.println("CAN ${pz.clave}: no arranca el controlador");
    }`,
      cuerpo: `/* ---------------------------------------------------------------------
 * ${pz.clave} — CAN (el ESP32 lo llama TWAI)
 *
 * Hace falta un transceptor: el controlador esta dentro del chip, pero
 * los niveles del bus no. Y 120 ohm entre CAN_H y CAN_L en los DOS
 * extremos del cable, no en uno.
 *
 * Un mensaje CAN lleva 8 bytes como mucho. Si necesitas mandar mas, van
 * en varios mensajes con identificadores distintos: no se fragmenta.
 * ------------------------------------------------------------------- */
bool ${pz.clave}_enviar(uint32_t id, const uint8_t *datos, uint8_t n)
{
    twai_message_t m = {};
    m.identifier = id;
    m.data_length_code = n > 8 ? 8 : n;
    for (uint8_t i = 0; i < m.data_length_code; i++) m.data[i] = datos[i];
    return twai_transmit(&m, pdMS_TO_TICKS(10)) == ESP_OK;
}

/* No bloquea: si no hay nada, devuelve false y sigues con lo tuyo. */
bool ${pz.clave}_recibir(uint32_t *id, uint8_t *datos, uint8_t *n)
{
    twai_message_t m;
    if (twai_receive(&m, 0) != ESP_OK) return false;
    if (id) *id = m.identifier;
    if (n)  *n  = m.data_length_code;
    if (datos) for (uint8_t i = 0; i < m.data_length_code; i++) datos[i] = m.data[i];
    return true;
}`
    };
  },

  espnow: (pz) => {
    const N = MAY(pz.clave);
    return {
      incluye: ['<WiFi.h>', '<esp_now.h>'],
      define: [],
      declara: [`bool ${pz.clave}_enviar(const uint8_t *datos, uint8_t n);`,
                `void ${pz.clave}_al_recibir(void (*f)(const uint8_t *mac, const uint8_t *datos, int n));`],
      preambulo: `static void (*${pz.clave}_oyente)(const uint8_t *, const uint8_t *, int) = NULL;
static const uint8_t ${pz.clave}_TODOS[6] = { 0xFF,0xFF,0xFF,0xFF,0xFF,0xFF };

static void ${pz.clave}_rx(const esp_now_recv_info_t *info, const uint8_t *datos, int n)
{
    if (${pz.clave}_oyente) ${pz.clave}_oyente(info->src_addr, datos, n);
}`,
      init: `    WiFi.mode(WIFI_STA);
    WiFi.disconnect();                        /* radio en pie, sin red */
    if (esp_now_init() == ESP_OK) {
        esp_now_register_recv_cb(${pz.clave}_rx);
        esp_now_peer_info_t p = {};
        memcpy(p.peer_addr, ${pz.clave}_TODOS, 6);
        p.channel = 0; p.encrypt = false;
        esp_now_add_peer(&p);
        Serial.printf("ESP-NOW ${pz.clave}: mi MAC es %s\\n", WiFi.macAddress().c_str());
    } else {
        Serial.println("ESP-NOW ${pz.clave}: no arranca");
    }`,
      cuerpo: `/* ---------------------------------------------------------------------
 * ${pz.clave} — ESP-NOW
 *
 * Se manda a la direccion de DIFUSION (FF:FF:...), no a una MAC concreta.
 * Asi no hay que apuntar la MAC de la otra placa ni cambiarla cuando se
 * sustituye una: enciendes las dos y se oyen. A cambio, cualquier ESP32
 * cerca con el mismo programa tambien oye, asi que si montas varias
 * parejas en la misma aula, mete un identificador en los datos.
 *
 * Las dos placas tienen que estar en el MISMO canal. Sin router, el canal
 * es el 0 (el que haya), y con esto basta.
 *
 * La radio veta el ADC2 en los dos extremos.
 * ------------------------------------------------------------------- */
bool ${pz.clave}_enviar(const uint8_t *datos, uint8_t n)
{
    return esp_now_send(${pz.clave}_TODOS, datos, n) == ESP_OK;
}

void ${pz.clave}_al_recibir(void (*f)(const uint8_t *mac, const uint8_t *datos, int n))
{
    ${pz.clave}_oyente = f;
}`
    };
  },
};

/* UART y RS485 comparten todo menos el aviso del transceptor. El puerto
   se reparte: si el enlace entre nodos ya ocupa el Serial2, este coge el
   Serial1, porque el Serial0 es la consola. */
function puertoSerie(pz, pn, par, ctx, esRS485){
  const N = MAY(pz.clave);
  const baud = par.baudios || 115200;
  const puerto = ctx.siguientePuerto();
  return {
    incluye: [],
    define: [`#define PIN_${N}_RX         ${pn[0] ?? -1}`,
             `#define PIN_${N}_TX         ${pn[1] ?? -1}`,
             `#define ${N}_BAUDIOS        ${baud}`,
             `#define ${N}_PUERTO         ${puerto}`],
    declara: [`void ${pz.clave}_enviar(const char *txt);`,
              `int  ${pz.clave}_leer_linea(char *dest, int max);`],
    init: `    ${N}_PUERTO.begin(${N}_BAUDIOS, SERIAL_8N1, PIN_${N}_RX, PIN_${N}_TX);
    Serial.printf("${esRS485 ? 'RS485' : 'UART'} ${pz.clave}: RX=%d TX=%d a %d baudios\\n",
                  PIN_${N}_RX, PIN_${N}_TX, ${N}_BAUDIOS);`,
    cuerpo: `/* ---------------------------------------------------------------------
 * ${pz.clave} — ${esRS485 ? 'RS485' : 'puerto serie'}
 *${esRS485 ? `
 * Hace falta un transceptor en cada punta, y el GND comun no es opcional:
 * sin referencia compartida el enlace no engancha. En cables largos, 120
 * ohm entre A y B en los dos extremos.
 *
 * Si tu transceptor NO es de direccion automatica, hace falta ademas un
 * pin de DE/RE: ponlo a nivel alto antes de escribir, espera al flush y
 * bajalo. Con los de direccion automatica (XY-017 y parecidos) no hay
 * que hacer nada.
 *` : `
 * Va al ${puerto}: el Serial de siempre es la consola y ocuparlo deja el
 * monitor serie inservible, que es un rato perdido muy tonto.
 *`}
 * ------------------------------------------------------------------- */
void ${pz.clave}_enviar(const char *txt)
{
    ${N}_PUERTO.print(txt);
    ${N}_PUERTO.flush();${esRS485 ? `   /* con RS485, esperar a que salga el ultimo bit */` : ''}
}

/* Devuelve la longitud cuando hay linea entera, y -1 mientras no la hay.
   No bloquea: llamalo desde loop() y sigue con lo tuyo. */
int ${pz.clave}_leer_linea(char *dest, int max)
{
    static int n = 0;
    while (${N}_PUERTO.available()) {
        char c = ${N}_PUERTO.read();
        if (c == '\\n') { dest[n] = 0; int r = n; n = 0; return r; }
        if (c != '\\r' && n < max - 1) dest[n++] = c;
    }
    return -1;
}`
  };
}


const tieneBuses = nodo => (nodo?.conexiones || []).some(c => BUSES[c.tipo]);

/* Junta las conexiones de un nodo en un par de ficheros. Devuelve null si
   el nodo no tiene ninguna que necesite codigo: no se emiten ficheros
   vacios solo por existir. */
function genBuses(nodo){
  const A = asignarPines(nodo);
  const piezas = (nodo.conexiones || []).filter(c => BUSES[c.tipo]);
  if (!piezas.length) return null;

  /* El Serial0 es la consola y el Serial2 se lo queda el enlace entre
     nodos cuando lo hay. Lo que sobra se reparte por orden. */
  const libres = (E.nodos.length > 1 && E.enlace && ENLACES[E.enlace.tipo].pines > 0)
    ? ['Serial1'] : ['Serial1', 'Serial2'];
  let iPuerto = 0;
  const ctx = { siguientePuerto: () => libres[iPuerto++] || 'Serial1' };

  const trozos = piezas.map(pz => {
    const fila = A.filas.find(f => f.clave === pz.clave);
    return Object.assign({ pz }, BUSES[pz.tipo](pz, pinesDe(fila), pz.params || {}, ctx));
  });

  const unicos = a => [...new Set(a)];
  const junta = campo => trozos.flatMap(t => t[campo] || []);

  const h = cabecera('buses.h — lo que hay conectado a este nodo',
`Cada bus deja aqui su arranque y unas funciones para hablar con el. Lo
que cuelgues del bus lo lees tu: la herramienta pone el bus en pie con
los pines correctos y no decide por ti que chip es.`) +
`#ifndef TELAR_BUSES_H
#define TELAR_BUSES_H

#include <Arduino.h>

void buses_init(void);

${junta('declara').join('\n')}

#endif /* TELAR_BUSES_H */
`;

  const cpp = cabecera('buses.cpp — arranque de los buses') +
`#include "buses.h"
${unicos(junta('incluye')).map(x => `#include ${x}`).join('\n')}

/* --- pines y constantes, juntos para poder cambiarlos de un vistazo --- */
${junta('define').join('\n')}

${trozos.map(t => t.preambulo).filter(Boolean).join('\n\n')}

void buses_init(void)
{
${trozos.map(t => t.init).join('\n\n')}
}

${trozos.map(t => t.cuerpo).filter(Boolean).join('\n\n')}
`;

  return { 'buses.h': h, 'buses.cpp': cpp };
}

function genControlConfig(nodo){
  const P = placaDe(nodo);
  const A = asignarPines(nodo);
  const vs = varsRemotas();
  const L = ENLACES[E.enlace.tipo];

  /* Que pin le toco a cada cosa. El numero lo guarda el asignador: en AVR
     el pin se llama D5 o A0 y sacarlo del texto daria el numero de la A. */
  const pinDe = clave => {
    const f = A.filas.find(x => x.clave === clave);
    if (f && f.pinNum !== undefined) return String(f.pinNum);
    const m = f && f.pin && f.pin.match(/GPIO(\d+)/);
    return m ? m[1] : '/* sin asignar */ -1';
  };
  const fEnl = A.filas.find(f => f.infra);
  const enlacePines = fEnl?.pinNums ?? numsDe(fEnl?.pin);
  const avr = esAvr(P);

  return cabecera(`config.h — los numeros que puedes tocar`,
`Este es el unico fichero del nodo de control que necesitas mirar para
cambiar como se comporta. Todo lo demas se genera solo.`) +
`#ifndef TELAR_CONFIG_H
#define TELAR_CONFIG_H

/* ---------------------------------------------------------------------
 * 1. SIMULAR O LEER DE VERDAD
 *
 * Con SIMULAR a 1 el nodo inventa los valores: puedes probar el enlace
 * entero sin conectar un solo sensor. Ponlo a 0 cuando tengas el
 * hardware cableado.
 * ------------------------------------------------------------------- */
#define SIMULAR             ${nodo.simular === false ? 0 : 1}   /* la casilla "Simular las medidas" de Hardware */

/* ---------------------------------------------------------------------
 * 2. PINES
 *
 * Si mueves un sensor de sitio, cambia aqui el numero. Para las entradas
 * analogicas hace falta un pin con convertidor. En esta placa son:
 *
 *   ${P.adc1.map(x => nombrePin(P, x)).join(', ')}${avr ? '  (se escriben ' + P.adc1.map(x => 'A' + (x - 14)).slice(0, 2).join(', ') + '... o su numero: ' + P.adc1.slice(0, 2).join(', ') + '...)' : ''}
 *
 * Estos van siempre. Cualquier otro pin de fuera de las dos listas no da
 * error al compilar: analogRead() devuelve un numero igual, y el numero
 * no significa nada. Por eso este fallo cuesta tanto de encontrar.
${(P.adc2 || []).length ? ` *
 * Los del ADC2 tambien valen, y no tienen nada de malo mientras el
 * proyecto no encienda WiFi ni Bluetooth. En cuanto lo haga, dejan de
 * leer en silencio: ese es todo el problema, y es tuyo decidirlo.
 *
${(P.adc2 || []).map(x => 'GPIO' + x).reduce((f, x, k) => {
   if (k % 8 === 0) f.push([]); f[f.length - 1].push(x); return f;
 }, []).map(l => ' *   ' + l.join(', ')).join('\n')}
` : ''} * ------------------------------------------------------------------- */
${[...vs, ...varsOrden()].map(v => {
  const clave = v.ref.split('.')[0];
  return `#define PIN_${MAY(clave)}${' '.repeat(Math.max(1, 18 - clave.length))}${pinDe(clave)}`;
}).join('\n')}

${esCAN() ? `/* CAN: ${L.transceptor || 'sin transceptor'} */
#define PIN_ENLACE_RX       ${enlacePines[0] ?? 16}
#define PIN_ENLACE_TX       ${enlacePines[1] ?? 17}` : L.pines > 0 ? `/* ${L.nombre}: ${L.transceptor || 'sin transceptor'} */
#define PIN_ENLACE_RX       ${enlacePines[0] ?? 16}
#define PIN_ENLACE_TX       ${enlacePines[1] ?? 17}
#define ENLACE_BAUDIOS      ${E.enlace.baudios ?? L.baudios}
${avr ? `/* Esta placa tiene UN puerto serie y es el del USB. Con
   ENLACE_POR_SOFTWARE a 1, el enlace se hace por software en los dos
   pines de arriba y el USB queda libre para el monitor; a 0 usa el
   puerto de verdad (D0/D1), que va mejor pero deja sin monitor y hay
   que desconectarlo para programar la placa. */
#define ENLACE_POR_SOFTWARE ${nodo.enlace_usb ? 0 : 1}` : `#define ENLACE_PUERTO       ${P.uart2?.puerto || 'Serial2'}`}` : '/* Enlace por radio: no usa pines */'}

/* Si el monitor serie (USB) queda libre para imprimir. ${avr ? `En esta placa
   depende de ENLACE_POR_SOFTWARE: con el enlace en el puerto de verdad,
   cualquier Serial.print saldria por el cable del enlace y chocaria con
   la pantalla, asi que no se imprime nada.` : `Aqui el enlace
   va por otro puerto, asi que siempre.`} */
#define MONITOR_LIBRE       ${avr ? 'ENLACE_POR_SOFTWARE' : 1}

/* ---------------------------------------------------------------------
 * 3. SI SE PIERDE LA PANTALLA
 *
${varsOrden().length ? ` * Si pasan FALLO_SEGURO_MS sin una sola trama buena de la pantalla
 * (se reinicio, se corto el cable, se quedo sin corriente), cada salida
 * pasa a su valor SEGURO de abajo y se queda ahi hasta que la pantalla
 * vuelva a hablar. Sin esto, una salida activada seguiria activada con
 * nadie al mando.
 *
 * El valor seguro es 0: todo apagado, que es lo que se hace en un
 * equipo cuando se pierde el mando. Si en tu montaje lo seguro es otra
 * cosa (una salida que en reposo debe quedar activada), cambialo aqui.
 * Con FALLO_SEGURO_MS a 0 las salidas se quedan con la ultima orden.
 * ------------------------------------------------------------------- */
#define FALLO_SEGURO_MS     ${falloSeguroMs()}
${varsOrden().map(v => `#define SEGURO_${MAY(v.nombre)}${' '.repeat(Math.max(1, 13 - v.nombre.length))}${v.booleano ? 0 : flt(0)}`).join('\n')}` : ` * Este nodo no tiene salidas que mande la pantalla: no hay nada que
 * poner a salvo si se pierde el enlace.
 * ------------------------------------------------------------------- */`}

/* ---------------------------------------------------------------------
 * 4. ESCALAS
 *
 * Lo que mide el sensor (0..${bitsAdc(P)} del convertidor) se convierte a las
 * unidades de tu proyecto. Estos son los rangos que pusiste en el editor.
 * ------------------------------------------------------------------- */
${vs.map(v => `#define ${MAY(v.nombre)}_MIN${' '.repeat(Math.max(1,14-v.nombre.length))}${flt(v.min)}
#define ${MAY(v.nombre)}_MAX${' '.repeat(Math.max(1,14-v.nombre.length))}${flt(v.max)}`).join('\n')}

${varsOrden().length ? `
/* ---------------------------------------------------------------------
 * ORDENES QUE LLEGAN DE LA PANTALLA
 *
 *   0  callado
 *   1  las ordenes buenas:            recibido: ${ordenEjemplo().nombre} = ${ordenEjemplo().valor}
 *   2  ademas, TODO lo que entra:     linea: $CMD,${ordenEjemplo().nombre},${ordenEjemplo().valor}*${xorTrama(`CMD,${ordenEjemplo().nombre},${ordenEjemplo().valor}`)}  (buena)
 *
 * El nivel 1 separa "la orden no llega" de "llega y no se aplica".
 *
 * El 2 es para cuando no llega: dice si por el cable entra algo. Que
 * salgan lineas marcadas (mala) significa que el cable conduce y lo que
 * falla es el nivel electrico o la velocidad. Que no salga NADA significa
 * que por ahi no viene nada: mira el cableado, las A y B cambiadas, o si
 * el otro nodo esta transmitiendo de verdad.
 * ------------------------------------------------------------------- */
#define ECO_ORDENES         1
` : ''}${tieneAdc(nodo) ? `
/* ---------------------------------------------------------------------
 * 5. BUSCAR EL PIN
 *
 * Ponlo a 1 y este nodo deja de hacer su trabajo: se convierte en una
 * herramienta de banco que imprime TODOS los canales analogicos de la
 * placa en una tabla. Mueve el sensor y mira que columna se mueve: esa
 * es la del pin donde lo tienes conectado de verdad.
 *
 * Sirve para separar tres cosas que desde fuera se ven iguales: el pin
 * equivocado, el cable flojo y la escala mal puesta. Cuando sepas el
 * numero, ponlo arriba en PIN_..., vuelve esto a 0 y sigue.
 * ------------------------------------------------------------------- */
#define BUSCAR_PINES        0
` : ''}
#endif /* TELAR_CONFIG_H */
`;
}

/* ---------------------------------------------------------------------
 * NODO DE CONTROL — hal
 * ------------------------------------------------------------------- */
function genControlHal(nodo){
  const vs = varsRemotas();
  const P = placaDe(nodo || E.nodos[E.nodos.length - 1]);
  return cabecera('hal.h — leer los sensores del nodo de control') +
`#ifndef TELAR_HAL_H
#define TELAR_HAL_H

#include <Arduino.h>

void hal_init(void);
${vs.map(v => `${v.booleano ? 'bool ' : 'float'} hal_leer_${cid(v.nombre)}(void);`).join('\n')}
${vs.some(v => !v.booleano) ? `
/* La cuenta del convertidor antes de escalar, 0..${bitsAdc(P)}. Sirve para
   distinguir "el sensor no se mueve" de "la escala esta mal", que
   desde el numero ya escalado son indistinguibles. Una entrada digital
   no la tiene: entre 0 y 1 no hay nada que mirar. */
${vs.filter(v => !v.booleano).map(v => `float hal_crudo_${cid(v.nombre)}(void);`).join('\n')}` : ''}
${varsOrden().length ? `
/* Las salidas que manda la pantalla. Aqui solo se aplican: quien decide
   es el otro nodo, y este obedece. */
void  hal_salidas_init(void);
${varsOrden().map(v => `void  hal_escribir_${cid(v.nombre)}(${v.booleano ? 'bool' : 'float'} v);`).join('\n')}` : ''}

#endif /* TELAR_HAL_H */
`;
}

/* Los canales analogicos que un alumno puede usar en esta placa: los de
   ADC1 que no esten ya comprometidos con otra cosa. En la placa de la
   pantalla casi todos se los come el panel, y ofrecerlos seria mandar a
   alguien a pinchar una linea de video. */
const canalesAdc = P => P.adc1.filter(x => !P.pines[x]);

/* Si este nodo no lee nada analogico, la herramienta de banco no pinta
   nada y no se emite. */
const tieneAdc = nodo => asignarPines(nodo).filas.some(f => f.nec?.adc);

/* De una variable remota a la pieza que la produce, para poder leer los
   parametros que el alumno ajusto en el editor (muestras, atenuacion). */
const piezaDe = v => piezas().find(p => p.clave === v.ref.split('.')[0]);
const parDe = (v, k, d) => {
  const x = piezaDe(v)?.params?.[k];
  return (x === undefined || x === '') ? d : x;
};

/* El texto que ve el alumno -> la constante del core.
 *
 * Se busca por los DECIBELIOS, no por la etiqueta entera. Un proyecto
 * guardado con una version anterior trae el texto de entonces
 * ("6 dB (0-1,4 V)"), y comparar cadenas completas lo dejaria sin
 * encontrar: caeria al valor por defecto EN SILENCIO y el alumno mediria
 * con otra atenuacion sin enterarse. La cifra de delante no cambia.
 *
 * Las cuatro son las unicas que tiene el chip: es un atenuador de
 * hardware, no un numero que se pueda ajustar. Para medir otro rango se
 * cambia la escala, o se mete un divisor resistivo delante. */
const ATENUACION = {
  '0':   { c:'ADC_0db',   fiable:'0,95 V' },
  '2.5': { c:'ADC_2_5db', fiable:'1,25 V' },
  '6':   { c:'ADC_6db',   fiable:'1,75 V' },
  '11':  { c:'ADC_11db',  fiable:'2,45 V' }
};
/* De la palabra que elige el alumno al coeficiente de la media movil.
   1.0 es no filtrar nada: el valor pasa tal cual. */
const SUAVIZADO = { 'ninguno':'1.00f', 'poco':'0.50f', 'medio':'0.20f', 'mucho':'0.05f' };
const suavizadoDe = txt => SUAVIZADO[String(txt ?? '').trim().toLowerCase()] || SUAVIZADO['poco'];

const atenuacionDe = txt => {
  const db = (String(txt ?? '').match(/^\s*(\d+(?:[.,]\d+)?)/) || [])[1];
  return ATENUACION[String(db).replace(',', '.')] || ATENUACION['11'];
};

function genControlHalCpp(nodo){
  const P = placaDe(nodo || E.nodos[E.nodos.length - 1]);
  const C = CAP(P), avr = !C.ledc, tope = topeAdc(P);
  const vs = varsRemotas();
  /* Una entrada digital no pasa por el convertidor: ni resolucion, ni
     atenuacion, ni media movil. Es un nivel y ya esta. */
  const an = vs.filter(v => !v.booleano), dig = vs.filter(v => v.booleano);
  /* Con el pull-up interno el contacto cerrado pone el pin a masa, asi
     que "cerrado" es LOW. Con pull-down o sin nada, al reves. */
  const tiraDe = v => {
    const p = parDe(v, 'pull', 'pull-up interno');
    if (p === 'pull-up interno')   return { modo:'INPUT_PULLUP', activo:'LOW',  nota:'con el pull-up interno el contacto cerrado pone el pin a masa' };
    if (p === 'pull-down interno') return esAvr(P)
      ? { modo:'INPUT', activo:'HIGH', nota:'el AVR no tiene pull-down interno: hace falta una resistencia de 10k del pin a masa' }
      : { modo:'INPUT_PULLDOWN', activo:'HIGH', nota:'con el pull-down interno el contacto cerrado pone el pin a 3,3 V' };
    return { modo:'INPUT', activo:'HIGH', nota:'sin resistencia interna: si el contacto no tira del pin, el pin flota y la lectura es basura' };
  };
  return cabecera('hal.cpp — de pines a numeros',
`Aqui estan las dos versiones de cada lectura: la simulada y la real.
Cambia SIMULAR en config.h para pasar de una a otra. Esa es toda la
frontera entre "funciona sin hardware" y "funciona con hardware".`) +
`#include "hal.h"
#include "config.h"
#include <math.h>

${an.map(v => `static float ultimo_${cid(v.nombre)} = -1.0f;   /* cuenta cruda, 0..${tope} */`).join('\n')}

void hal_init(void)
{
#if !SIMULAR
${an.length && C.fijaResAdc ? `    analogReadResolution(${C.bitsAdc});                 /* 0..${tope} */` : ''}${an.length && C.atenuacion ? `
${an.map(v => { const a = atenuacionDe(parDe(v, 'atenuacion', '11'));
  return `    analogSetPinAttenuation(PIN_${MAY(v.ref.split('.')[0])}, ${a.c});   /* fiable hasta ${a.fiable}; por encima aplasta */`; }).join('\n')}` : ''}${an.length && !C.fijaResAdc && !C.atenuacion ? `    /* Este convertidor no se configura: lee 0..${tope} tal cual, con la
       referencia que traiga la placa. */` : ''}${dig.length ? `
${dig.map(v => { const d = tiraDe(v);
  return `    pinMode(PIN_${MAY(v.ref.split('.')[0])}, ${d.modo});   /* ${d.nota} */`; }).join('\n')}` : ''}
#endif
}

${varsOrden().length ? `/* Las salidas se preparan aqui tambien: un pin de PWM necesita su canal
   antes de poder escribir nada en el. */
void hal_salidas_init(void)
{
${varsOrden().map(v => {
  const clave = v.ref.split('.')[0];
  const cat = CONEXIONES[piezaDe(v)?.tipo] || {};
  if (cat.nombre === 'Salida PWM')
    return C.ledc
      ? `    ledcAttach(PIN_${MAY(clave)}, ${parDe(v, 'frecuencia', 5000)}, ${parDe(v, 'resolucion', 13)});`
      : `    pinMode(PIN_${MAY(clave)}, OUTPUT);   /* aqui el PWM sale con analogWrite: no hay canal que preparar */${C.bitsPwm !== 8 ? `
    analogWriteResolution(${C.bitsPwm});   /* si tu core no la trae, borra esta linea y deja 8 bits */` : ''}`;
  return `    pinMode(PIN_${MAY(clave)}, OUTPUT);
    digitalWrite(PIN_${MAY(clave)}, ${parDe(v, 'activo', 'alto') === 'bajo' ? 'HIGH' : 'LOW'});   /* apagado al arrancar */`;
}).join('\n\n')}
}

${varsOrden().map(v => {
  const clave = v.ref.split('.')[0];
  const cat = CONEXIONES[piezaDe(v)?.tipo] || {};
  if (cat.nombre === 'Salida PWM'){
    const bits = C.ledc ? parDe(v, 'resolucion', 13) : C.bitsPwm;
    return `void hal_escribir_${cid(v.nombre)}(float v)
{
    /* De las unidades del proyecto (${v.min} a ${v.max}) a los pasos del
       ${avr ? 'PWM' : 'canal'}. Se recorta a los extremos: una orden fuera de rango no debe
       dar la vuelta y salir por el otro lado. */
    float f = (v - ${flt(v.min)}) / (${flt(v.max)} - ${flt(v.min)});
    if (f < 0.0f) f = 0.0f;
    if (f > 1.0f) f = 1.0f;
${C.ledc
  ? `    ledcWrite(PIN_${MAY(clave)}, (uint32_t)lroundf(f * ((1UL << ${bits}) - 1)));   /* redondeando: truncar pierde un paso */`
  : `    /* ${esAvr(P) ? 'En AVR el PWM es de 8 bits y a frecuencia fija (unos 490 Hz, o 980 Hz\n       en D5 y D6). No hay mas resolucion que esta.' : `analogWrite de ${bits} bits, a la frecuencia que traiga el core.`} */
    analogWrite(PIN_${MAY(clave)}, (int)(f * ${((1 << bits) - 1).toFixed(1)}f + 0.5f));   /* +0.5: redondear, no truncar */`}
}`;
  }
  const bajo = parDe(v, 'activo', 'alto') === 'bajo';
  return `void hal_escribir_${cid(v.nombre)}(bool v)
{
    /* Nivel activo ${bajo ? 'BAJO' : 'ALTO'}: ${bajo ? 'casi todos los modulos de rele de 4 patas van asi' : 'lo normal en un LED o un driver'}. */
    digitalWrite(PIN_${MAY(clave)}, v ? ${bajo ? 'LOW' : 'HIGH'} : ${bajo ? 'HIGH' : 'LOW'});
}`;
}).join('\n\n')}
` : ''}

${vs.map((v,i) => v.booleano ? `
bool hal_leer_${cid(v.nombre)}(void)
{
#if SIMULAR
    /* Simulado: conmuta cada 4 s, para ver que el enlace va */
    return ((millis() / 4000) % 2) == 0;
#else
    /* ${tiraDe(v).nota}. */
    return digitalRead(PIN_${MAY(v.ref.split('.')[0])}) == ${tiraDe(v).activo};
#endif
}` : `
float hal_leer_${cid(v.nombre)}(void)
{
#if SIMULAR
    /* Un seno lento entre ${v.min} y ${v.max}, para ver que el enlace va */
    float t = millis() / 1000.0f;
    return ${((v.min+v.max)/2).toFixed(2)}f + ${(((v.max-v.min)/2)*0.9).toFixed(2)}f * sinf(t / ${7+i*3}.0f);
#else
    /* El convertidor es ruidoso: se promedian ${parDe(v, 'muestras', 32)} lecturas
       y se aplica una media movil, o el ultimo digito baila solo. */
    uint32_t suma = 0;
    for (int i = 0; i < ${parDe(v, 'muestras', 32)}; i++) suma += analogRead(PIN_${MAY(v.ref.split('.')[0])});
    float crudo = suma / (float)${parDe(v, 'muestras', 32)};    /* 0..${tope} */

    if (ultimo_${cid(v.nombre)} < 0) ultimo_${cid(v.nombre)} = crudo;
    ultimo_${cid(v.nombre)} += (crudo - ultimo_${cid(v.nombre)}) * ${suavizadoDe(parDe(v, 'suavizado', 'poco'))};   /* suavizado: ${parDe(v, 'suavizado', 'poco')} */

    return ${MAY(v.nombre)}_MIN + (ultimo_${cid(v.nombre)} / ${tope}.0f) * (${MAY(v.nombre)}_MAX - ${MAY(v.nombre)}_MIN);
#endif
}

float hal_crudo_${cid(v.nombre)}(void)
{
#if SIMULAR
    return -1.0f;                             /* simulando no hay convertidor */
#else
    return ultimo_${cid(v.nombre)} < 0 ? 0.0f : ultimo_${cid(v.nombre)};
#endif
}`).join('\n')}
`;
}

/* ---------------------------------------------------------------------
 * EL ENLACE — lado que envia
 * ------------------------------------------------------------------- */
function genEnlaceEnvia(nodo){
  const vs = varsRemotas();
  const L = ENLACES[E.enlace.tipo];
  const avr = !CAP(placaDe(nodo || E.nodos[E.nodos.length - 1])).printf;   /* sin printf: se imprime a trozos */
  return cabecera('enlace.cpp — armar y mandar la trama', textoProtocolo()) +
`#include "enlace.h"
#include "config.h"
#include <stdio.h>
#include <string.h>\n#include <stdlib.h>\n

#define LARGO_LINEA         ${largoLinea()}   /* la trama mas larga de este proyecto, con holgura */
${varsOrden().length ? `
/* SI SE PIERDE LA PANTALLA (ver FALLO_SEGURO_MS en config.h)
 *
 * t_orden es cuando llego la ultima trama buena de la pantalla. Si pasa
 * demasiado sin ninguna, las salidas se van a su valor seguro. */
static volatile uint32_t t_orden = 0;

static bool sin_pantalla(void)
{
    const bool sin = FALLO_SEGURO_MS > 0 && (millis() - t_orden) > (uint32_t)FALLO_SEGURO_MS;
#if MONITOR_LIBRE
    static bool antes = false;
    if (sin != antes) {
        antes = sin;
        if (sin) Serial.println(F("Sin noticias de la pantalla: salidas a su valor seguro (config.h)"));
        else     Serial.println(F("La pantalla ha vuelto: las salidas obedecen otra vez"));
    }
#endif
    return sin;
}
` : ''}
void enlace_iniciar(void)
{
${varsOrden().length ? '    t_orden = millis();\n' : ''}    tr_iniciar();
}

void enlace_enviar(${vs.map(v => `float ${cid(v.nombre)}`).join(', ')})
{
${esCAN() ? `${vs.length ? vs.map((v, i) => `    can_tx(${hexId(0x100 + i)}, ${cid(v.nombre)});   /* ${v.nombre} */`).join('\n')
 : `    can_tx_vacio(0x1FF);   /* latido: este nodo no mide nada, solo obedece */`}` : `    char cuerpo[LARGO_LINEA];
    /* long y %ld: en una placa AVR un int es de 16 bits y 3276,8 ya no
       cabria en decimas */
${vs.length ? `    snprintf(cuerpo, sizeof(cuerpo), "TLR${vs.map(() => ',%ld').join('')}",
             ${vs.map(v => `(long)lroundf(${cid(v.nombre)} * 10.0f)`).join(',\n             ')});`
 : `    /* Este nodo no mide nada, solo obedece. La trama va sin campos y
       sirve de latido: la pantalla necesita algo que llegue para saber
       que el cable sigue conectado. */
    snprintf(cuerpo, sizeof(cuerpo), "TLR");`}

    uint8_t x = 0;
    for (const char *c = cuerpo; *c; c++) x ^= (uint8_t)*c;

    char linea[LARGO_LINEA + 8];
    snprintf(linea, sizeof(linea), "$%s*%02X", cuerpo, x);
    tr_enviar(linea);`}
}


/* ---------------------------------------------------------------------
 * LO QUE MANDA LA PANTALLA
 *
 *     $CMD,${ordenEjemplo().nombre},${ordenEjemplo().valor}*${xorTrama(`CMD,${ordenEjemplo().nombre},${ordenEjemplo().valor}`)}
 *
 *   $CMD       cabecera de orden, para no confundirla con una medida
 *   ${ordenEjemplo().nombre.padEnd(10)} el nombre tal cual lo pusiste en el editor
 *   ${String(ordenEjemplo().valor).padEnd(10)} ${ordenEjemplo().texto}
 *   *${xorTrama(`CMD,${ordenEjemplo().nombre},${ordenEjemplo().valor}`)}        el mismo XOR de siempre
 *
 * Lleva el nombre dentro, y no un numero de orden, para que puedas abrir
 * el monitor serie y leer lo que pasa sin traducir nada.
 * ------------------------------------------------------------------- */
${varsOrden().map(v => `static volatile ${v.booleano ? 'bool ' : 'float'} ord_${cid(v.nombre)} = ${v.booleano ? 'false' : (v.inicial !== undefined ? flt(v.inicial) : '0.0f')};${v.inicial !== undefined ? '   /* valor al arrancar, hasta la primera orden */' : ''}`).join('\n')}

${esCAN() ? '' : `static bool orden_valida(const char *t)
{
    if (t[0] != '$') return false;

    const char *ast = strchr(t, '*');
    if (!ast) return false;

    uint8_t x = 0;
    for (const char *c = t + 1; c < ast; c++) x ^= (uint8_t)*c;
    if (x != (uint8_t)strtoul(ast + 1, NULL, 16)) return false;

    char nombre[24];
    long valor;
    if (sscanf(t, "$CMD,%23[^,],%ld", nombre, &valor) != 2) return false;

    /* Llegados aqui la trama esta BIEN: cabecera, formato y XOR. Que el
       nombre sea conocido o no es otra cosa. Se devuelve true igual,
       porque una trama valida es una pregunta a la que hay que
       contestar aunque no pida nada — asi funciona el "ping". */
${varsOrden().map(v => `    if (strcmp(nombre, "${v.nombre}") == 0) {
        ord_${cid(v.nombre)} = ${v.booleano ? 'valor != 0' : 'valor / 10.0f'};
#if ECO_ORDENES && MONITOR_LIBRE
${avr ? `        Serial.print(F("recibido: ${v.nombre} = "));   /* en AVR no hay printf */
        Serial.println(valor);`
      : `        Serial.printf("recibido: ${v.nombre} = %ld" "\\n", valor);`}
#endif
        return true;
    }`).join('\n')}
    return true;                       /* trama buena, nombre ignorado */
}`}

/* Se levanta al recibir una trama buena de la pantalla, y la baja
   enlace_hay_pregunta() al leerla. Es lo que convierte este nodo en un
   esclavo: no emite hasta que le hablan. */
static volatile bool hay_pregunta = false;

bool enlace_hay_pregunta(void)
{
    if (!hay_pregunta) return false;
    hay_pregunta = false;
    return true;
}

void enlace_atender(void)
{
${esCAN() ? `    can_vigilar();
    twai_message_t m;
    while (twai_receive(&m, 0) == ESP_OK) {
        if (m.identifier < 0x200 || m.identifier > 0x2FF) continue;   /* no viene de la pantalla */
        hay_pregunta = true;               /* toda trama de la pantalla es una pregunta */
${varsOrden().length ? '        t_orden = millis();\n' : ''}
${varsOrden().map((v, i) => `        if (m.identifier == ${hexId(0x200 + i)} && m.data_length_code == 4) {
            float x; memcpy(&x, m.data, 4);
            ord_${cid(v.nombre)} = ${v.booleano ? 'x > 0.5f' : 'x'};
#if ECO_ORDENES && MONITOR_LIBRE
            Serial.printf("recibido: ${v.nombre} = %.1f\\n", x);
#endif
        }`).join('\n')}
    }` : `    static char linea[LARGO_LINEA];

    /* El transporte devuelve tramas enteras; aqui solo se reparten. Da
       igual que hayan venido por un cable o por la radio. */
    while (tr_leer(linea, sizeof(linea)) >= 0) {
        bool buena = orden_valida(linea);
        if (buena) {
            hay_pregunta = true;
${varsOrden().length ? '            t_orden = millis();\n' : ''}        }
#if ECO_ORDENES >= 2 && MONITOR_LIBRE
${avr ? `        Serial.print(F("linea: ")); Serial.print(linea);
        Serial.println(buena ? F("  (buena)") : F("  (mala)"));`
      : `        Serial.printf("linea: %s  (%s)\\n", linea, buena ? "buena" : "mala");`}
#endif
    }`}
}

/* Lo que tiene que hacer cada salida: la ultima orden, o su valor seguro
   si la pantalla lleva demasiado sin dar noticias */
${varsOrden().map(v => `${v.booleano ? 'bool ' : 'float'} enlace_${cid(v.nombre)}(void) { return sin_pantalla() ? ${v.booleano ? `(SEGURO_${MAY(v.nombre)} != 0)` : `(float)SEGURO_${MAY(v.nombre)}`} : ord_${cid(v.nombre)}; }`).join('\n')}
${genTransporte(nodo)}`;
}

/* =====================================================================
 * TRANSPORTE DEL ENLACE
 *
 * El protocolo —trama con checksum, deteccion de flanco, aviso de enlace
 * caido, maestro y esclavo— es el MISMO para los cuatro enlaces. Lo que
 * cambia es por donde salen los bytes.
 *
 * Por eso hay un solo cuerpo de protocolo y tres transportes detras de
 * tres funciones. Tener dos copias del protocolo ya salio caro una vez:
 * se cambio un lado y no el otro, y el sistema empeoro sin que se viera
 * por que. Una copia no se puede desincronizar consigo misma.
 *
 *     tr_iniciar()              levanta el transporte
 *     tr_enviar(linea)          manda UNA trama completa
 *     tr_leer(dest, max)        devuelve la longitud, o -1 si no hay
 *
 * El CAN no entra aqui: no es otro cable para la misma trama, es otro
 * protocolo. Un mensaje CAN lleva 8 bytes y la trama de texto no cabe.
 * Va aparte, en TRAMA_CAN.
 * ================================================================== */

const esCAN = () => E.enlace && E.enlace.tipo === 'can';
const esRadio = () => E.enlace && E.enlace.tipo === 'espnow';

/* Codigo del transporte, para el .cpp de cualquiera de los dos nodos. */

/* ---------------------------------------------------------------------
 * EL CAN, POR DENTRO
 *
 * La trama de texto no cabe en los 8 bytes de un mensaje CAN, y partirla
 * en trozos haria ilegible el bus con un analizador. Asi que en CAN cada
 * variable tiene su propio identificador y viaja como un float de 4
 * bytes. El protocolo de tiempos —cuando se pregunta, cuando se repite,
 * el ping— es el mismo que en los demas enlaces; solo cambia el sobre.
 * ------------------------------------------------------------------- */
const kbitsCAN = () => {
  const k = Number(E.enlace && E.enlace.baudios) || 500;
  const v = [25, 50, 100, 125, 250, 500, 800, 1000].includes(k) ? k : 500;
  return v === 1000 ? '1MBITS' : v + 'KBITS';
};
const hexId = n => '0x' + n.toString(16).toUpperCase();

const DECL_CAN = `
/* El enlace va por CAN: un identificador por variable, ver enlace.cpp. */
#include "driver/twai.h"
void tr_iniciar(void);
void can_tx(uint32_t id, float v);
void can_tx_vacio(uint32_t id);
void can_vigilar(void);
`;

function genTransporteCAN(){
  const med = varsRemotas(), ord = varsOrden();
  return `
/* --- transporte: CAN (el ESP32 lo llama TWAI) ------------------------
 *
 * Un identificador por variable. Con cualquier analizador de CAN se lee
 * el bus sin traducir nada:
 *
${med.map((v, i) => ` *   ${hexId(0x100 + i)}   ${v.nombre}   (control -> pantalla)`).join('\n') || ' *   (este sistema no manda medidas)'}
 *   0x1FF   latido del control, sin datos
${ord.map((v, i) => ` *   ${hexId(0x200 + i)}   ${v.nombre}   (pantalla -> control)`).join('\n') || ' *   (este sistema no manda ordenes)'}
 *   0x2FF   pregunta de la pantalla ("ping"), sin datos
 *
 * Hace falta un transceptor en cada punta —el controlador esta dentro
 * del chip, los niveles del bus no— y 120 ohm entre CAN_H y CAN_L en los
 * DOS extremos del cable. Sin las resistencias el bus parece ir a ratos.
 * ------------------------------------------------------------------ */
void tr_iniciar(void)
{
    twai_general_config_t g = TWAI_GENERAL_CONFIG_DEFAULT(
        (gpio_num_t)PIN_ENLACE_TX, (gpio_num_t)PIN_ENLACE_RX, TWAI_MODE_NORMAL);
    twai_timing_config_t  t = TWAI_TIMING_CONFIG_${kbitsCAN()}();
    twai_filter_config_t  f = TWAI_FILTER_CONFIG_ACCEPT_ALL();
    if (twai_driver_install(&g, &t, &f) != ESP_OK || twai_start() != ESP_OK)
        Serial.println("CAN: no arranca el controlador. Revisa pines y transceptor.");
}

void can_tx(uint32_t id, float v)
{
    twai_message_t m = {};
    m.identifier = id;
    m.data_length_code = 4;
    memcpy(m.data, &v, 4);
    twai_transmit(&m, pdMS_TO_TICKS(5));
}

void can_tx_vacio(uint32_t id)
{
    twai_message_t m = {};
    m.identifier = id;
    twai_transmit(&m, pdMS_TO_TICKS(5));
}

/* Si se desconecta el cable, o el otro nodo se apaga, los errores se
   acumulan y el controlador se APAGA solo ("bus off"). No vuelve por su
   cuenta: sin esto, al reconectar el enlace seguiria muerto hasta
   reiniciar la placa. Se mira en cada vuelta y se levanta de nuevo. */
void can_vigilar(void)
{
    twai_status_info_t e;
    if (twai_get_status_info(&e) != ESP_OK) return;
    if (e.state == TWAI_STATE_BUS_OFF)      twai_initiate_recovery();
    else if (e.state == TWAI_STATE_STOPPED) twai_start();
}
`;
}

function genTransporte(nodo){
  if (esCAN()) return genTransporteCAN();
  if (esRadio()) return `
/* --- transporte: ESP-NOW ---------------------------------------------
 *
 * Se manda a la direccion de DIFUSION. Asi no hay que apuntar la MAC de
 * la otra placa ni cambiarla al sustituir una: se encienden las dos y se
 * oyen.
 *
 * Difusion quiere decir que TODOS los ESP-NOW cercanos lo oyen. Para que
 * dos equipos en la misma sala no se obedezcan el uno al otro, cada
 * paquete empieza con la clave del proyecto (ENLACE_CLAVE) y se tira
 * todo lo que no la lleve. Los dos nodos la sacan del mismo proyecto; si
 * hay otro equipo cerca con el MISMO proyecto, cambiala en la pestana
 * Hardware y vuelve a exportar los dos nodos.
 *
 * Lo que recibe la radio llega en un callback, que corre en OTRA tarea:
 * por eso las lineas se dejan en una cola y se sacan desde tr_leer(), en
 * el hilo de siempre. Tocar el protocolo desde el callback seria pedir
 * una corrupcion rara y dificil de encontrar.
 *
 * OJO: con la radio encendida el ADC2 no lee. En los DOS nodos.
 * ------------------------------------------------------------------ */
#include <WiFi.h>
#include <esp_now.h>

#define TR_COLA      8
#define TR_LARGO    (LARGO_LINEA < 240 ? LARGO_LINEA : 240)   /* ESP-NOW lleva hasta 250 bytes */
#define ENLACE_CLAVE "${claveEnlace()}"

static char     tr_cola[TR_COLA][TR_LARGO];
static volatile uint8_t tr_mete = 0, tr_saca = 0;

static const uint8_t TR_TODOS[6] = { 0xFF,0xFF,0xFF,0xFF,0xFF,0xFF };

static void tr_rx(const esp_now_recv_info_t *info, const uint8_t *datos, int n)
{
    /* de otro equipo, o sin clave: no es para nosotros */
    const int k = (int)strlen(ENLACE_CLAVE);
    if (n <= k || memcmp(datos, ENLACE_CLAVE, k) != 0 || datos[k] != '|') return;
    datos += k + 1;
    n -= k + 1;
    if (n > TR_LARGO - 1) n = TR_LARGO - 1;
    uint8_t sig = (uint8_t)((tr_mete + 1) % TR_COLA);
    if (sig == tr_saca) return;               /* cola llena: se tira la vieja */
    memcpy(tr_cola[tr_mete], datos, n);
    tr_cola[tr_mete][n] = '\\0';
    tr_mete = sig;
}

void tr_iniciar(void)
{
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();                        /* radio en pie, sin red */
    if (esp_now_init() != ESP_OK) {
        Serial.println("ESP-NOW: no arranca");
        return;
    }
    esp_now_register_recv_cb(tr_rx);
    esp_now_peer_info_t p = {};
    memcpy(p.peer_addr, TR_TODOS, 6);
    p.channel = 0; p.encrypt = false;
    esp_now_add_peer(&p);
    Serial.printf("ESP-NOW listo. Mi MAC: %s\\n", WiFi.macAddress().c_str());
}

void tr_enviar(const char *linea)
{
    char paquete[TR_LARGO + 12];
    snprintf(paquete, sizeof(paquete), "%s|%s", ENLACE_CLAVE, linea);
    esp_now_send(TR_TODOS, (const uint8_t *)paquete, strlen(paquete));
}

int tr_leer(char *dest, int max)
{
    if (tr_saca == tr_mete) return -1;
    strncpy(dest, tr_cola[tr_saca], max - 1);
    dest[max - 1] = '\\0';
    tr_saca = (uint8_t)((tr_saca + 1) % TR_COLA);
    return (int)strlen(dest);
}
`;

  /* --- serie: RS485 y UART --- */
  const Pt = placaDe(nodo || E.nodos[E.nodos.length - 1]), Ct = CAP(Pt);
  const avr = Ct.unSoloUart;
  return `
/* --- transporte: puerto serie ----------------------------------------
 *
 * Lo de siempre. tr_leer() junta caracteres hasta el salto de linea y
 * devuelve -1 mientras no haya una entera, para no bloquear nunca.${avr ? `
 *
 * Esta placa tiene un solo puerto de verdad y es el del USB. Con
 * ENLACE_POR_SOFTWARE a 1 el enlace va por software en dos pines
 * cualesquiera —el monitor serie sigue libre, pero por encima de 38400
 * baudios empieza a perder caracteres—; a 0 usa el puerto de verdad, que
 * va fino y deja sin monitor.` : ''}
 * ------------------------------------------------------------------ */
${avr ? `#if ENLACE_POR_SOFTWARE
#include <SoftwareSerial.h>
static SoftwareSerial enlace_puerto(PIN_ENLACE_RX, PIN_ENLACE_TX);
#define ENLACE_PUERTO enlace_puerto
#else
#define ENLACE_PUERTO Serial
#endif

` : ''}void tr_iniciar(void)
{
${Ct.remapeaUart ? `    ENLACE_PUERTO.begin(ENLACE_BAUDIOS, SERIAL_8N1, PIN_ENLACE_RX, PIN_ENLACE_TX);`
                 : `    ENLACE_PUERTO.begin(ENLACE_BAUDIOS);   /* este core no remapea: el puerto lleva sus pines de fabrica */`}
}

void tr_enviar(const char *linea)
{
    ENLACE_PUERTO.print(linea);
    ENLACE_PUERTO.print('\\n');
    /* Esperar a que salga el ultimo bit ANTES de devolver el turno. Sin
       esto la funcion vuelve con la trama aun en el buffer, el otro nodo
       contesta, y las dos se pisan. */
    ENLACE_PUERTO.flush();
}

int tr_leer(char *dest, int max)
{
    static char acumula[LARGO_LINEA];
    static uint16_t n = 0;

    while (ENLACE_PUERTO.available() > 0) {
        char c = (char)ENLACE_PUERTO.read();
        if (c == '\\n' || c == '\\r') {
            if (n == 0) continue;             /* salto suelto: no es una trama */
            acumula[n] = '\\0';
            strncpy(dest, acumula, max - 1);
            dest[max - 1] = '\\0';
            n = 0;
            return (int)strlen(dest);
        }
        if (n < sizeof(acumula) - 1) acumula[n++] = c;
        else                         n = 0;   /* linea absurda: tirarla */
    }
    return -1;
}
`;
}

/* Prototipos, para el .h de los dos nodos */
const DECL_TRANSPORTE = `
/* El transporte del enlace. Lo mismo para RS485, UART y ESP-NOW: lo
   unico que cambia es por donde salen los bytes. */
void tr_iniciar(void);
void tr_enviar(const char *linea);
int  tr_leer(char *dest, int max);
`;

function genEnlaceEnviaH(){
  const vs = varsRemotas();
  return cabecera('enlace.h') +
`#ifndef TELAR_ENLACE_H
#define TELAR_ENLACE_H

#include <Arduino.h>
#include <math.h>

void enlace_iniciar(void);
${esCAN() ? DECL_CAN : DECL_TRANSPORTE}
void enlace_enviar(${vs.map(v => `float ${cid(v.nombre)}`).join(', ')});

/* La pantalla tambien manda. Hay que vaciar el puerto a menudo o el
   buffer se llena y se pierden ordenes sin que nadie se entere. */
void enlace_atender(void);

/* true UNA vez por cada trama buena recibida: es la pregunta a la que
   este nodo contesta. Ver el comentario de maestro y esclavo. */
bool enlace_hay_pregunta(void);
${varsOrden().map(v => `${v.booleano ? 'bool ' : 'float'} enlace_${cid(v.nombre)}(void);`).join('\n')}

#endif /* TELAR_ENLACE_H */
`;
}

/* ---------------------------------------------------------------------
 * NODO DE CONTROL — el .ino
 * ------------------------------------------------------------------- */
function genControlIno(nodo){
  const P = placaDe(nodo);
  const vs = varsRemotas();
  const L = ENLACES[E.enlace.tipo];
  return cabecera(`${E.proyecto} — nodo de control (${P.nombre})`,
`Este nodo no tiene pantalla. Lee sus sensores y manda los valores a la
pantalla por ${L.nombre}.

Ajustes del IDE (menu Herramientas):
${Object.entries(P.opciones_ide).map(([k,v]) => `  ${k}: ${v}`).join('\n')}

Lo unico que necesitas tocar esta en config.h.`) +
`#include <Arduino.h>
#include "config.h"
#include "hal.h"
${tieneBuses(nodo) ? '#include "buses.h"\n' : ''}#include "enlace.h"
${tieneAdc(nodo) ? `
#if BUSCAR_PINES
/* ---------------------------------------------------------------------
 * MODO BANCO — encontrar el pin
 *
 * Lee de golpe todos los canales analogicos de la placa y los saca en
 * una tabla. La columna que se mueva al mover el sensor es el pin donde
 * lo tienes conectado.
 *
 * Se lee de izquierda a derecha como una tabla de verdad:
 *   una columna que barre de ~0 a ~${bitsAdc(P)}  ->  ahi esta el sensor
 *   una columna quieta en un numero raro ->  pin al aire, flotando
 *   una columna clavada en 0             ->  pin a masa, o cable suelto
 * ------------------------------------------------------------------- */
static const int BANCO_PINES[] = { ${canalesAdc(P).join(', ')} };
static const int BANCO_CUANTOS = sizeof(BANCO_PINES) / sizeof(BANCO_PINES[0]);

static void banco_iniciar(void)
{
    Serial.println();
    Serial.println("BUSCAR_PINES — mueve el sensor y mira que columna se mueve");
    Serial.println("Cuando lo sepas, ponlo en PIN_... y vuelve BUSCAR_PINES a 0");
    Serial.println();
${CAP(P).printf
  ? `    analogReadResolution(${CAP(P).bitsAdc});
${CAP(P).atenuacion ? `    for (int i = 0; i < BANCO_CUANTOS; i++)
        analogSetPinAttenuation(BANCO_PINES[i], ADC_11db);
` : ''}    for (int i = 0; i < BANCO_CUANTOS; i++) Serial.printf("  GPIO%-2d", BANCO_PINES[i]);`
  : `    /* Sin printf en el puerto serie: se imprime a trozos */
${CAP(P).fijaResAdc ? `    analogReadResolution(${CAP(P).bitsAdc});\n` : ''}    for (int i = 0; i < BANCO_CUANTOS; i++) {
        Serial.print("  ${esAvr(P) ? 'A' : 'pin '}");
        Serial.print(BANCO_PINES[i]${esAvr(P) ? ' - A0' : ''});
        Serial.print(' ');
    }`}
    Serial.println();
}

static void banco_paso(void)
{
    for (int i = 0; i < BANCO_CUANTOS; i++) {
        /* Ocho lecturas por pin: lo justo para que el numero no baile,
           sin que la tabla se quede atras de la mano. */
        uint32_t suma = 0;
        for (int k = 0; k < 8; k++) suma += analogRead(BANCO_PINES[i]);
${CAP(P).printf
  ? `        Serial.printf("  %5u ", (unsigned)(suma / 8));`
  : `        Serial.print("  ");
        Serial.print((unsigned)(suma / 8));
        Serial.print(' ');`}
    }
    Serial.println();
    delay(200);
}
#endif
` : ''}
void setup()
{
    /* El monitor por USB, salvo que el enlace vaya por ese mismo puerto:
       entonces todo lo que se imprimiera saldria por el cable del enlace
       y chocaria con la pantalla (ver MONITOR_LIBRE en config.h). */
#if MONITOR_LIBRE${tieneAdc(nodo) ? ' || BUSCAR_PINES' : ''}
    Serial.begin(115200);
#endif
${tieneAdc(nodo) ? `#if BUSCAR_PINES
    banco_iniciar();
#else
` : ''}#if MONITOR_LIBRE
    Serial.println("${E.proyecto}: nodo de control");
#if SIMULAR
    Serial.println("MODO SIMULACION — los valores son inventados");
    Serial.println("Pon SIMULAR a 0 en config.h para leer los sensores");
#endif
#endif

    hal_init();
${tieneBuses(nodo) ? '    buses_init();\n' : ''}${varsOrden().length ? '    hal_salidas_init();\n' : ''}    enlace_iniciar();
${tieneAdc(nodo) ? `#endif
` : ''}}

void loop()
{
${tieneAdc(nodo) ? `#if BUSCAR_PINES
    banco_paso();
    return;
#endif
` : ''}
    /* Lo primero, escuchar: si el buffer del puerto se llena se pierden
       ordenes y nadie se entera. No bloquea. */
    enlace_atender();

${varsOrden().map(v => `    hal_escribir_${cid(v.nombre)}(enlace_${cid(v.nombre)}());`).join('\n')}


    /* MAESTRO Y ESCLAVO
     *
     * Este nodo NO transmite por su cuenta: contesta. En un enlace de un
     * solo par de hilos solo puede hablar uno a la vez, y si los dos
     * emiten cuando les parece, antes o despues se pisan y las tramas se
     * pierden. Contestando solo cuando le preguntan, y con la pantalla
     * esperando la respuesta antes de volver a preguntar, el choque no
     * puede ocurrir.
     *
     * La pantalla pregunta a su ritmo; aqui solo hay que responder. */
    if (enlace_hay_pregunta()) {
        /* Un respiro antes de contestar: al otro lado el transceptor
           acaba de transmitir y tarda en volver a modo escucha. Sin esto
           se pierde el principio de la respuesta. */
        delay(2);

${vs.map(v => `        ${v.booleano ? 'bool ' : 'float'} ${cid(v.nombre)} = hal_leer_${cid(v.nombre)}();`).join('\n')}

        enlace_enviar(${vs.map(v => cid(v.nombre)).join(', ')});

        /* Eco por USB, para comprobar sin tocar el enlace */
#if MONITOR_LIBRE
${vs.map(v => v.booleano
  ? (CAP(P).printf
    ? `        Serial.printf("${v.nombre} = %s\\n", ${cid(v.nombre)} ? "si" : "no");`
    : `        /* Sin printf: se imprime a trozos. */
        Serial.print(F("${v.nombre} = ")); Serial.println(${cid(v.nombre)} ? F("si") : F("no"));`)
  : (CAP(P).printf
    ? `        Serial.printf("${v.nombre} = %.1f ${(v.unidad || '').replace(/%/g, '%%')}   (ADC %.0f de ${topeAdc(P)})\\n", ${cid(v.nombre)}, hal_crudo_${cid(v.nombre)}());`
    : `        /* Sin printf: se imprime a trozos. (Con el enlace en el puerto
           del USB esto no se compila: ver MONITOR_LIBRE en config.h.) */
        Serial.print(F("${v.nombre} = ")); Serial.print(${cid(v.nombre)}, 1);
        Serial.print(F(" ${v.unidad || ''}   (ADC ")); Serial.print(hal_crudo_${cid(v.nombre)}(), 0);
        Serial.println(F(" de ${topeAdc(P)})"));`)).join('\n')}
#endif
    }

    delay(2);
}
`;
}

/* ---------------------------------------------------------------------
 * EL ENLACE — lado que recibe (la pantalla)
 * ------------------------------------------------------------------- */
function genEnlaceRecibeH(){
  const vs = varsRemotas();
  return cabecera('enlace.h — lo que llega del nodo de control') +
`#ifndef TELAR_ENLACE_H
#define TELAR_ENLACE_H

#include <Arduino.h>
#include "state.h"   /* enlace_ordenar recibe la instantanea */\n

void enlace_iniciar(void);
${esCAN() ? DECL_CAN : DECL_TRANSPORTE}
void enlace_atender(void);     /* llamar a menudo; no bloquea */
bool enlace_vivo(void);        /* false si hace rato que no llega nada */

${vs.map(v => `float enlace_${cid(v.nombre)}(void);`).join('\n')}

/* El camino de vuelta: la pantalla manda al nodo de control lo que
   haya cambiado. Se le pasa la instantanea entera y el decide que
   merece salir al cable. */
void enlace_ordenar(const snapshot_t *s);

#endif /* TELAR_ENLACE_H */
`;
}

function genEnlaceRecibe(nodoA){
  const vs = varsRemotas();
  const P = placaDe(nodoA);
  const A = asignarPines(nodoA);
  const pines = numsDe(A.filas.find(f => f.infra)?.pin);
  const rx = pines[0] ?? 43;
  const tx = pines[1] ?? 44;
  /* Soltar el UART0 solo tiene sentido con cable: por radio no hay pines
     que soltar, y PIN_ENLACE_RX ni siquiera existe. */
  const usaUart0 = !esRadio() && !esCAN() && (rx == 43 || rx == 44);
  const L = ENLACES[E.enlace.tipo];

  return cabecera('enlace.cpp — recibir y validar las tramas', textoProtocolo() + `

Si pasa TIMEOUT_MS sin una trama buena, enlace_vivo() devuelve false y la
pantalla lo dice. Un instrumento congelado mostrando el ultimo valor es
peligroso: parece que mide cuando ya no sabe nada.`) +
`#include "enlace.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

${esCAN() ? `#define PIN_ENLACE_RX       ${rx}
#define PIN_ENLACE_TX       ${tx}` : esRadio() ? '/* Enlace por radio: no hay puerto ni pines que declarar. */' : `#define ENLACE_PUERTO       Serial1
#define PIN_ENLACE_RX       ${rx}
#define PIN_ENLACE_TX       ${tx}
#define ENLACE_BAUDIOS      ${E.enlace.baudios ?? L.baudios}`}
#define TIMEOUT_MS          1000
#define LARGO_LINEA         ${largoLinea()}   /* la trama mas larga de este proyecto, con holgura */

/* volatile porque estas dos las escribe el loop() (nucleo 1) y las lee
   la tarea de control (nucleo 0). En el ESP32 un acceso de 32 bits
   alineado no se parte por la mitad, asi que no hace falta mutex; lo que
   si hace falta es que el compilador no se guarde el valor en un
   registro y deje de mirar la memoria. */
${vs.map(v => `static volatile float val_${cid(v.nombre)} = 0.0f;`).join('\n')}
static volatile uint32_t t_ultima = 0;
/* Si la ultima pregunta ya tuvo respuesta: hasta entonces no se hace
   otra (ver enlace_ordenar). */
static volatile bool contestada = true;

void enlace_iniciar(void)
{
${usaUart0 ? `    /* VERIFICADO EN BANCO: en esta placa el RS485 va por los pines ${rx}/${tx},
       que son ADEMAS los del UART0. El core arranca el UART0 aunque la
       consola vaya por USB, y deja el ${rx} como SALIDA: no entra ni un
       bit y no hay ningun sintoma que lo delate. Hay que soltarlo. */
#if ARDUINO_USB_CDC_ON_BOOT
    Serial0.end();
#endif
    pinMode(PIN_ENLACE_RX, INPUT);

` : ''}    tr_iniciar();
    t_ultima = millis() - TIMEOUT_MS - 1;    /* arrancar dando el enlace por caido */
}

${esCAN() ? '' : `/* Valida una linea y reparte sus campos. Devuelve false si el XOR no
   cuadra, que es lo que descarta el ruido y la basura del arranque. */
static bool trama_valida(const char *t)
{
    if (t[0] != '$') return false;

    const char *ast = strchr(t, '*');
    if (!ast) return false;

    uint8_t x = 0;
    for (const char *c = t + 1; c < ast; c++) x ^= (uint8_t)*c;
    if (x != (uint8_t)strtoul(ast + 1, NULL, 16)) return false;

${vs.length ? `    long ${vs.map(v => `d_${cid(v.nombre)}`).join(', ')};
    if (sscanf(t, "$TLR${vs.map(() => ',%ld').join('')}",
               ${vs.map(v => `&d_${cid(v.nombre)}`).join(', ')}) != ${vs.length}) return false;

    /* Llegan en decimas */
${vs.map(v => `    val_${cid(v.nombre)} = d_${cid(v.nombre)} / 10.0f;`).join('\n')}` : `    /* Este sistema no manda ninguna medida hacia la pantalla: la trama
       es solo un latido, para que se sepa que el otro nodo sigue vivo. */
    if (strncmp(t, "$TLR", 4) != 0) return false;`}
    return true;
}`}

void enlace_atender(void)
{
${esCAN() ? `    can_vigilar();
    twai_message_t m;
    while (twai_receive(&m, 0) == ESP_OK) {
        if (m.identifier >= 0x100 && m.identifier <= 0x1FF) contestada = true;   /* del nodo de control */
        if (m.identifier == 0x1FF) { t_ultima = millis(); continue; }   /* latido */
${vs.length ? `        if (m.data_length_code != 4) continue;
        float x; memcpy(&x, m.data, 4);
${vs.map((v, i) => `        if (m.identifier == ${hexId(0x100 + i)}) { val_${cid(v.nombre)} = x; t_ultima = millis(); }`).join('\n')}` : ''}
    }` : `    static char linea[LARGO_LINEA];

    while (tr_leer(linea, sizeof(linea)) >= 0)
        if (trama_valida(linea)) { t_ultima = millis(); contestada = true; }`}
}

bool enlace_vivo(void) { return (millis() - t_ultima) < TIMEOUT_MS; }

${vs.map(v => `float enlace_${cid(v.nombre)}(void) { return val_${cid(v.nombre)}; }`).join('\n')}


/* ---------------------------------------------------------------------
 * EL CAMINO DE VUELTA — de la pantalla al nodo de control
 *
 * Una orden que se manda UNA vez y se pierde (ruido, un choque en el
 * cable) deja la salida como estaba hasta que alguien vuelva a tocar el
 * control. Por eso las ordenes no solo salen al cambiar: se repiten por
 * turnos, y una trama perdida es un retraso de unas decimas en vez de
 * un fallo permanente. Ver enlace_ordenar().
 * ------------------------------------------------------------------- */
static void mandar(const char *nombre, int32_t decimas)
{
${esCAN() ? `    uint32_t id = 0x2FF;                  /* "ping", o un nombre que no es orden */
${varsOrden().map((v, i) => `    if (strcmp(nombre, "${v.nombre}") == 0) id = ${hexId(0x200 + i)};`).join('\n')}
    if (id == 0x2FF) can_tx_vacio(id);
    else             can_tx(id, decimas / 10.0f);` : `    char cuerpo[64];
    snprintf(cuerpo, sizeof(cuerpo), "CMD,%s,%ld", nombre, (long)decimas);

    uint8_t x = 0;
    for (const char *c = cuerpo; *c; c++) x ^= (uint8_t)*c;

    /* PREAMBULO
     *
     * Medido en placa: cuando el otro nodo acaba de transmitir, su
     * transceptor de direccion automatica tarda en volver a modo escucha
     * y se come los primeros caracteres de lo que llega. En el monitor
     * se ve siempre el mismo patron, principio roto y final intacto:
     *
     *     ..MD,nombre,1*5B   (mala)
     *
     * Mandando relleno delante, lo que se pierde es el relleno. Son dos
     * saltos de linea: el receptor los descarta como lineas vacias, asi
     * que no hay que cambiar nada al otro lado. */
${esRadio() ? `    /* Por radio no hay relleno que valga: el paquete llega entero o no
       llega. El problema del cambio de sentido es del cable. */` : `    ENLACE_PUERTO.print("\\n\\n");`}
    char linea[112];
    snprintf(linea, sizeof(linea), "$%s*%02X", cuerpo, x);
    tr_enviar(linea);`}
}

/* UNA PREGUNTA CADA VEZ
 *
 * El nodo de control es un esclavo: contesta a cada trama que le llega.
 * En un enlace de un solo par de hilos (RS485) solo puede hablar uno a
 * la vez, y si la pantalla vuelve a hablar antes de que acabe la
 * respuesta, las dos tramas se pisan y se pierden. Por eso:
 *
 *   - sale UNA sola trama por vuelta del control, nunca varias seguidas;
 *   - la siguiente no sale hasta que llega la respuesta, o hasta que pasa
 *     ESPERA_MAX_MS (con el enlace caido hay que seguir preguntando).
 *
 * Que trama sale:
 *   1. la primera orden de la lista que ha cambiado. En las de si/no,
 *      tambien un ENCENDIDO apuntado: se apuntan siempre, aunque toque
 *      esperar, porque un pulso de boton, un click o un pulse corto
 *      pueden durar un solo ciclo y se perderian si en ese ciclo sale
 *      otra orden. Cada una sale en su puesto de la lista, asi que el
 *      orden de llegada es siempre el mismo;
 *   2. si no hay nada nuevo, la siguiente orden por turnos.
 * Lo mismo vale para UART, CAN y radio: alli no chocarian, pero asi el
 * protocolo es uno solo y se comporta igual con cualquier enlace. */

/* Lo que tardan como mucho una pregunta y su respuesta en ESTE enlace
   (${esCAN() ? 'CAN: tramas cortas y rapidas' : esRadio() ? 'radio: paquetes cortos' : `${largoPregunta()} + ${largoRespuesta()} caracteres a ${baudiosEnlace()} baudios, 10 bits cada uno`}),
   mas el respiro del otro nodo antes de contestar y un margen. */
#define ESPERA_MAX_MS       ${esperaRespuestaMs()}

/* Nunca dos preguntas con menos de esto entre medias */
#define MINIMO_ENTRE_MS     40

void enlace_ordenar(const snapshot_t *s)
{
    static uint32_t t_pregunta = 0;
    const uint32_t ahora = millis();
${varsOrden().some(v => v.booleano) ? `
    /* los encendidos se apuntan antes de cualquier espera (flanco de subida) */
${varsOrden().filter(v => v.booleano).map(v => `    static bool visto_${cid(v.nombre)} = false, pend_${cid(v.nombre)} = false;
    if (s->${cid(v.nombre)} && !visto_${cid(v.nombre)}) pend_${cid(v.nombre)} = true;
    visto_${cid(v.nombre)} = s->${cid(v.nombre)};`).join('\n')}
` : ''}
    if (!contestada && (ahora - t_pregunta) < ESPERA_MAX_MS) return;
    if ((ahora - t_pregunta) < MINIMO_ENTRE_MS) return;
    t_pregunta = ahora;
    contestada = false;
${varsOrden().length ? `
    /* lo que vale ahora cada orden, y lo ultimo que se mando */
${varsOrden().map(v => v.booleano
  ? `    static int32_t ult_${cid(v.nombre)} = INT32_MIN;   /* aun no se mando nada */
    const int32_t d_${cid(v.nombre)} = s->${cid(v.nombre)} ? 1 : 0;`
  : `    static int32_t ult_${cid(v.nombre)} = INT32_MIN;   /* aun no se mando nada */
    const int32_t d_${cid(v.nombre)} = (int32_t)lroundf(s->${cid(v.nombre)} * 10.0f);`).join('\n')}

    /* 1. un cambio: el primero que haya, y solo ese. Un encendido apuntado
       sale a 1 aunque ya haya vuelto a 0; el 0 va en la vuelta siguiente,
       porque ya no coincide */
${varsOrden().map(v => (v.booleano ? `    if (pend_${cid(v.nombre)}) { pend_${cid(v.nombre)} = false; ult_${cid(v.nombre)} = 1; mandar("${v.nombre}", 1); return; }\n` : '')
  + `    if (d_${cid(v.nombre)} != ult_${cid(v.nombre)}) { ult_${cid(v.nombre)} = d_${cid(v.nombre)}; mandar("${v.nombre}", d_${cid(v.nombre)}); return; }`).join('\n')}

    /* 2. sin cambios: se repite la siguiente, por turnos. Cada trama es
       tambien la pregunta a la que el otro nodo contesta con sus medidas. */
    static uint8_t turno = 0;
    switch (turno++ % ${varsOrden().length}) {
${varsOrden().map((v, i) => `    case ${i}: mandar("${v.nombre}", d_${cid(v.nombre)}); break;`).join('\n')}
    default: break;
    }` : `
    (void)s;
    /* Nada que ordenar: se pregunta igual, con un ping. El otro nodo solo
       habla cuando se le habla: sin esto se quedaria mudo y la pantalla
       daria el enlace por caido. */
    mandar("ping", 0);`}
}
${genTransporte(nodoA)}`;
}

/* =====================================================================
 * NODO DE CONTROL CON LINUX — Python, no un sketch
 *
 * Una Raspberry, una Jetson o una Orange Pi no se programan con el IDE de
 * Arduino: corren un programa. Este habla el MISMO protocolo que el nodo
 * de ESP32 —las mismas tramas, el mismo XOR—, asi que la pantalla no
 * distingue quien hay al otro lado del cable.
 *
 * Los pines van por /dev/gpiochip (la interfaz moderna del kernel), con
 * python-periphery: funciona igual en Raspberry, Jetson y Orange Pi. El
 * puerto serie, con pyserial.
 * ===================================================================== */
function genLinuxPy(nodo){
  const P = placaDe(nodo);
  const A = asignarPines(nodo);
  const vs = varsRemotas(), ords = varsOrden();
  const L = ENLACES[E.enlace.tipo];
  const pinDe = clave => { const f = A.filas.find(x => x.clave === clave); return f?.pinNum ?? '?'; };
  const chip = P.gpiochip || '/dev/gpiochip0';
  const puerto = P.uart2?.puerto || '/dev/ttyS0';
  const baud = E.enlace.baudios ?? L.baudios ?? 19200;
  const py = s => s.replace(/"/g, '\\"');

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""${E.proyecto} — nodo de control (${py(P.nombre)})

GENERADO POR TELAR STUDIO — no lo edites a mano: el proximo Exportar lo
sobrescribe. Lo tuyo va en mi_logica.py, que la exportacion no toca.

Esta placa no tiene pantalla. Lee sus entradas, mueve sus salidas y habla
con la pantalla por ${py(L.nombre)}, con las mismas tramas que usaria un
ESP32: la pantalla no nota la diferencia.

Hace falta, una vez:

    sudo apt install -y python3-venv
    python3 -m venv ~/telar-env
    ~/telar-env/bin/pip install python-periphery pyserial

Y que tu usuario pueda abrir los pines y el puerto:

    sudo usermod -aG gpio,dialout $USER      # y volver a entrar
"""

import time
import serial
from periphery import GPIO

# ---------------------------------------------------------------------
# 1. LO QUE PUEDES TOCAR
# ---------------------------------------------------------------------
CHIP     = "${chip}"          # en una Raspberry Pi 5 suele ser /dev/gpiochip4
PUERTO   = "${puerto}"
BAUDIOS  = ${baud}
ECO      = True                     # imprime por pantalla lo que entra y sale

# Si se pierde la pantalla: pasados FALLO_SEGURO segundos sin una sola
# trama buena (se reinicio, se corto el cable), cada salida pasa a su
# valor de SEGURO y se queda ahi hasta que la pantalla vuelva a hablar.
# El valor seguro es 0: todo apagado. Cambialo si en tu montaje lo
# seguro es otra cosa. Con FALLO_SEGURO a 0 las salidas se quedan con la
# ultima orden.
FALLO_SEGURO = ${(falloSeguroMs() / 1000).toFixed(1)}
SEGURO = {
${varsOrden().map(v => `    "${v.nombre}": ${v.booleano ? 'False' : 0},`).join('\n') || '    # (la pantalla no manda nada a este nodo)'}
}

# Los numeros son los del chip (BCM en una Raspberry), no los del conector
${[...vs, ...ords].map(v => {
  const clave = v.ref.split('.')[0];
  return `PIN_${MAY(clave)}${' '.repeat(Math.max(1, 16 - clave.length))}= ${pinDe(clave)}`;
}).join('\n') || '# (este nodo no tiene pines asignados todavia)'}

# ---------------------------------------------------------------------
# 2. LOS PINES
#
# Se abren al arrancar, no al importar: si uno esta ocupado o faltan
# permisos, sale una frase que se entiende en vez de un traceback.
# ---------------------------------------------------------------------
entradas = {}
salidas = {}


def abrir_pines():
    pendientes = [
${[...vs.map(v => ['in', v]), ...ords.map(v => ['out', v])].map(([modo, v]) =>
  `        ("${v.nombre}", PIN_${MAY(v.ref.split('.')[0])}, "${modo}"),`).join('\n') || '        # (este nodo no tiene pines todavia)'}
    ]
    for nombre, pin, modo in pendientes:
        try:
            g = GPIO(CHIP, pin, modo)
        except Exception as e:
            print("No puedo abrir el pin %d (%s): %s" % (pin, nombre, e))
            print("  - ¿es el numero del chip y no el del conector?")
            print("  - ¿esta ese pin ocupado por otro programa?")
            print("  - ¿tu usuario esta en el grupo gpio?  sudo usermod -aG gpio $USER")
            print("  - en una Raspberry Pi 5, prueba CHIP = \\"/dev/gpiochip4\\"")
            raise SystemExit(1)
        (entradas if modo == "in" else salidas)[nombre] = g

# Lo que ha pedido la pantalla. Arranca como arranca la salida.
ordenes = {
${ords.map(v => `    "${v.nombre}": ${v.booleano ? 'False' : (v.inicial ?? 0)},`).join('\n') || '    # (la pantalla no manda nada a este nodo)'}
}

# Las de si/no se guardan como True o False; las demas vienen en decimas
BOOLEANAS = {${ords.filter(v => v.booleano).map(v => `"${v.nombre}"`).join(', ')}}

# ---------------------------------------------------------------------
# 3. EL PROTOCOLO
#
#     $TLR,123,45*7B      lo que mide este nodo, en decimas
#     $CMD,rele,1*4F      lo que pide la pantalla
#
# El *XX es el XOR de todo lo que hay entre el $ y el *. Es una cuenta
# de dos lineas que caza el 99% de los cables flojos.
# ---------------------------------------------------------------------
def xor(cuerpo):
    x = 0
    for c in cuerpo:
        x ^= ord(c)
    return x


def armar(valores):
    cuerpo = "TLR" + "".join(",%d" % round(v * 10) for v in valores)
    return "$%s*%02X\\n" % (cuerpo, xor(cuerpo))


def aplicar(linea):
    """True si la trama es valida, aunque el nombre no se conozca."""
    linea = linea.strip()
    if not linea.startswith("$") or "*" not in linea:
        return False
    cuerpo, _, suma = linea[1:].partition("*")
    try:
        if xor(cuerpo) != int(suma, 16):
            return False
    except ValueError:
        return False

    partes = cuerpo.split(",")
    if len(partes) != 3 or partes[0] != "CMD":
        return True                     # trama buena que no pide nada: un ping
    nombre, valor = partes[1], partes[2]
    if nombre in ordenes:
        try:
            crudo = int(valor)
        except ValueError:
            return True
        ordenes[nombre] = (crudo != 0) if nombre in BOOLEANAS else crudo / 10.0
        if ECO:
            print("recibido: %s = %s" % (nombre, ordenes[nombre]))
    return True


# ---------------------------------------------------------------------
# 4. EL BUCLE
#
# Igual que en el nodo de ESP32: primero escuchar, luego mover las
# salidas, y contestar SOLO si la pantalla ha preguntado. En un enlace de
# un solo par de hilos, si este nodo hablara por su cuenta sus tramas
# chocarian con las de la pantalla y se perderian ordenes.
# ---------------------------------------------------------------------
def main():
    abrir_pines()
    try:
        puerto = serial.Serial(PUERTO, BAUDIOS, timeout=0)
    except Exception as e:
        print("No puedo abrir %s: %s" % (PUERTO, e))
        print("  - ¿existe ese puerto?  ls -l /dev/tty*")
        print("  - ¿tu usuario esta en el grupo dialout?")
        print("  - en una Raspberry, la consola serie ocupa el puerto: quitala con raspi-config")
        raise SystemExit(1)
    pendiente = ""
    t_orden = time.monotonic()           # la ultima trama buena de la pantalla
    sin_pantalla_antes = False
    print("${py(E.proyecto)}: nodo de control en ${py(P.corto)}")

    try:
        while True:
            # 4.1 lo que entra. Cada trama buena es una pregunta.
            pregunta = False
            datos = puerto.read(256).decode("ascii", "ignore")
            if datos:
                pendiente += datos
                while "\\n" in pendiente:
                    linea, _, pendiente = pendiente.partition("\\n")
                    if linea.strip():
                        buena = aplicar(linea)
                        if buena:
                            pregunta = True
                            t_orden = time.monotonic()
                        elif ECO:
                            print("linea mala: %r" % linea)
                # ruido sin saltos de linea: no dejar que crezca sin fin
                if len(pendiente) > ${largoLinea() * 2}:
                    pendiente = ""

            # si la pantalla lleva demasiado callada, las salidas a salvo
            sin_pantalla = FALLO_SEGURO > 0 and time.monotonic() - t_orden > FALLO_SEGURO
            if sin_pantalla != sin_pantalla_antes:
                sin_pantalla_antes = sin_pantalla
                print("Sin noticias de la pantalla: salidas a su valor seguro" if sin_pantalla
                      else "La pantalla ha vuelto: las salidas obedecen otra vez")
            manda = SEGURO if sin_pantalla else ordenes

            # 4.2 las salidas hacen lo que diga la ultima orden
${ords.map(v => `            salidas["${v.nombre}"].write(${v.booleano ? `bool(manda["${v.nombre}"])` : `manda["${v.nombre}"] > 0`})`).join('\n') || '            pass'}

            # 4.3 y se contesta con lo que se mide, solo si han preguntado.
            # Un respiro antes: el transceptor de la pantalla acaba de
            # transmitir y tarda un poco en volver a escuchar.
            if pregunta:
                time.sleep(0.002)
${vs.length
  ? `                valores = [${vs.map(v => `1.0 if entradas["${v.nombre}"].read() else 0.0`).join(',\n                           ')}]`
  : `                valores = []          # este nodo no mide nada: la trama es un latido`}
                trama = armar(valores)
                puerto.write(trama.encode("ascii"))
                if ECO:
                    print(trama.strip())

            time.sleep(0.005)
    except KeyboardInterrupt:
        pass
    finally:
        for g in list(entradas.values()) + list(salidas.values()):
            g.close()
        puerto.close()


if __name__ == "__main__":
    main()
`;
}

function genLeemeLinux(nodo){
  const P = placaDe(nodo);
  const A = asignarPines(nodo);
  const L = ENLACES[E.enlace.tipo];
  const pin = clave => A.filas.find(x => x.clave === clave)?.pin || '(sin asignar)';
  const carpeta = cid(E.proyecto) + '/' + carpetaNodo(nodo);
  return `NODO DE CONTROL (LINUX) — ${E.proyecto}
${'='.repeat(56)}

Esta placa no lleva sketch: corre un programa de Python.

PLACA: ${P.nombre}

QUE HACE FALTA, UNA VEZ
-----------------------
    sudo apt install -y python3-venv
    python3 -m venv ~/telar-env
    ~/telar-env/bin/pip install python-periphery pyserial
    sudo usermod -aG gpio,dialout $USER      # y vuelve a entrar

COMO SE ARRANCA
---------------
    cd ~/${carpeta}
    ~/telar-env/bin/python control.py

Sale por pantalla lo que manda y lo que recibe. Ctrl+C para parar.
Cuando funcione, para que arranque solo al encender:

    mkdir -p ~/.config/systemd/user
    cp telar.service ~/.config/systemd/user/
    systemctl --user daemon-reload
    systemctl --user enable --now telar
    sudo loginctl enable-linger $USER

Es un servicio de tu usuario, no de root: asi tiene los permisos de los
grupos gpio y dialout de arriba. El "enable-linger" hace que arranque al
encender aunque nadie entre en la placa. Para ver si esta en marcha:

    systemctl --user status telar

El servicio supone que la carpeta esta en

    ~/${carpeta}

Si no, cambia las dos rutas del fichero antes de copiarlo.

QUE CONECTAR
------------
${(nodo.conexiones || []).map(c => `  ${c.clave}  ->  ${pin(c.clave)}`).join('\n') || '  (todavia no hay nada conectado)'}

  ${L.nombre}${L.transceptor ? `  (hace falta: ${L.transceptor})` : ''}
     ${P.uart2?.puerto || '/dev/ttyS0'}

LOS NUMEROS DE PIN
------------------
Son los del CHIP, no los del conector: en una Raspberry son los BCM, los
que salen en "pinout.xyz". El conector fisico numera distinto y es el
error mas comun.

En una Raspberry Pi 5 el chip cambio de nombre: si da error al abrir,
prueba CHIP = "/dev/gpiochip4" en control.py.

LO QUE NO HACE ESTA PLACA
-------------------------
No tiene convertidor analogico: no puede leer un sensor de tension
directamente. Para eso, un ADC por I2C (un ADS1115) o un micro que mida y
lo mande. El PWM depende del overlay de cada modelo y tampoco se genera.

QUE FICHERO ES DE QUIEN
-----------------------
  control.py        generado   el programa; se reescribe al exportar
  telar.service     generado   para que arranque solo
  mi_logica.py      TUYO       si lo creas, no se toca nunca
`;
}

/* Servicio DE USUARIO, como el de la pantalla (genServicioPantallaLinux):
   copiado a /etc/systemd/system corria como root, %h era /root y las
   rutas no llevaban a la carpeta del alumno. Sin After=: con
   WantedBy=default.target, After=default.target hace un ciclo. */
function genServicioLinux(nodo){
  const carpeta = cid(E.proyecto) + '/' + carpetaNodo(nodo);
  return `# Telar Studio: arrancar el nodo de control solo al encender la placa.
# Es un servicio DE USUARIO: corre con tu usuario, no como root. Se
# instala asi (lo explica el LEEME):
#   mkdir -p ~/.config/systemd/user
#   cp telar.service ~/.config/systemd/user/
#   systemctl --user daemon-reload
#   systemctl --user enable --now telar
#   sudo loginctl enable-linger $USER
# Si copiaste la carpeta a otro sitio, cambia las dos rutas de abajo.
[Unit]
Description=Telar - ${E.proyecto} (nodo de control)

[Service]
Type=simple
WorkingDirectory=%h/${carpeta}
ExecStart=%h/telar-env/bin/python %h/${carpeta}/control.py
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
`;
}

/* ---------------------------------------------------------------------
 * LOS DOS LEEME DE UN SISTEMA DE DOS NODOS
 * ------------------------------------------------------------------- */
function genLeemeControl(nodo){
  const P = placaDe(nodo);
  const vs = varsRemotas();
  const L = ENLACES[E.enlace.tipo];
  const A = asignarPines(nodo);
  const pin = clave => {
    const f = A.filas.find(x => x.clave === clave);
    return f && f.pin ? f.pin : '(sin asignar)';
  };
  return `NODO DE CONTROL — ${E.proyecto}
${'='.repeat(56)}

Esta placa no tiene pantalla. Lee sus sensores y manda los valores a la
pantalla por ${L.nombre}.

PLACA: ${P.nombre}

QUE CONECTAR
------------
${vs.map(v => {
  const clave = v.ref.split('.')[0];
  return `  ${v.nombre}  ->  ${pin(clave)}
${esAvr(P)
  ? `     Entre 0 V y 5 V, que es la referencia de esta placa. El
     convertidor es de 10 bits: 0 a 1023.
     Para probar sin nada mas, un potenciometro de 10 k vale: un
     extremo a 5V, el otro a GND y el cursor (la pata del medio)
     al pin de arriba.`
  : `     Entre 0 V y el fondo de escala de la atenuacion elegida. Nunca
     por encima de 3,6 V: el pin no lo aguanta.
     Para probar sin nada mas, un potenciometro de 10 k vale: un
     extremo a 3V3, el otro a GND y el cursor (la pata del medio)
     al pin de arriba.`}`;
}).join('\n\n')}

  ${L.nombre}${L.transceptor ? `  (hace falta: ${L.transceptor})` : ''}
     ${A.filas.find(f => f.infra)?.pin || '(radio)'}

EL ORDEN EN QUE CONVIENE PROBARLO
---------------------------------
1. Sube este sketch con "Simular las medidas" marcada en la pestana
   Hardware (en config.h queda SIMULAR a 1).
   Abre el monitor serie a 115200: veras los valores moverse solos.
   Si eso funciona, el nodo y el enlace estan bien.

2. Conecta el hardware, desmarca "Simular las medidas", vuelve a
   exportar y a subir (SIMULAR queda a 0). No lo cambies solo en
   config.h: la proxima exportacion lo volveria a escribir.
   Vuelve a mirar el monitor. Cada linea lleva DOS numeros:

       ${vs[0] ? `${vs[0].nombre} = ${String(Math.round((vs[0].min + vs[0].max) / 2 * 10) / 10)} ${vs[0].unidad || ''}` : 'medida = 12.3'}   (ADC ${Math.round(bitsAdc(P) / 2)} de ${bitsAdc(P)})

   Mira primero el de la derecha, no el de la izquierda. Al recorrer el
   sensor de un extremo a otro tiene que barrer casi todo el 0..${bitsAdc(P)}.

   Si se queda corto -por ejemplo se planta en 1000 y no sube mas-, al
   pin no le esta llegando toda la tension: es cosa del cableado o de lo
   que tengas colgado de ese pin, y no se arregla cambiando la escala.
   Si barre entero y el de la izquierda no cuadra, entonces si es la
   escala, y se ajusta en el editor.

   Los dos fallos se ven igual mirando solo el numero de la izquierda.
   Por eso esta el otro.

   Y si no se mueve NADA, antes de revisar cables uno por uno: pon
   BUSCAR_PINES a 1 en config.h y vuelve a subir. El nodo se convierte en
   una tabla con todos los canales analogicos de la placa, y la columna
   que se mueva te dice en que pin esta el sensor de verdad. Luego ese
   numero va arriba, en PIN_..., y BUSCAR_PINES vuelve a 0.

3. Conecta el ${L.nombre} a la pantalla y sube el otro sketch.

Hacerlo en este orden separa los problemas. Si lo montas todo de golpe
y no funciona, no sabras si falla el sensor, el cable o la pantalla.

QUE PUEDES TOCAR
----------------
  config.h        pines, escalas, que hacer si se pierde la pantalla
  hal.cpp         como se convierte la lectura del pin en un numero

  enlace.cpp      el protocolo — funciona, no hace falta tocarlo
`;
}

function genLeemeSistema(A, B){
  const L = ENLACES[E.enlace.tipo];
  const vs = varsRemotas();
  return `${E.proyecto} — DOS NODOS
${'='.repeat(56)}

Este proyecto son DOS placas que se reparten el trabajo:

  ${carpetaNodo(A)}/
      ${placaDe(A).corto}
      Pinta la interfaz. No lee ningun sensor.

  ${carpetaNodo(B)}/
      ${placaDe(B).corto}
      Lee los sensores y manda los valores. No tiene pantalla.

POR QUE DOS PLACAS
------------------
La pantalla de la ${placaDe(A).corto} ocupa casi todos los pines del
chip, y la placa viene en caja, asi que a los que quedan no se llega.
Un segundo nodo resuelve eso: tiene pines de sobra y se comunica por
${L.nombre}, que la pantalla ya trae de fabrica en sus bornes.

LO QUE VIAJA POR EL ENLACE
--------------------------
${vs.map(v => `  ${v.nombre}  (${v.min} a ${v.max} ${v.unidad || ''})`).join('\n')}

${textoProtocolo()}

EL CABLE ENTRE LAS DOS
----------------------
${(() => {
  const pA = asignarPines(A).filas.find(f => f.infra)?.pin || '(radio)';
  const pB = asignarPines(B).filas.find(f => f.infra)?.pin || '(radio)';
  if (L.pines === 0) return '  Nada que cablear: el enlace va por radio.';
  return `  ${placaDe(B).corto}  ${pB}
      va al transceptor (${L.transceptor || 'sin transceptor'}), y de ahi
      los dos hilos A y B hasta los bornes de la pantalla.

  ${placaDe(A).corto}  ${pA}
      la placa ya trae el transceptor dentro: los hilos van
      directos a los bornes A y B.

  A con A y B con B. Si se cruzan no se rompe nada, pero no llega
  ni una trama: es el primer sitio donde mirar.
  Masa comun entre las dos placas.`;
})()}

COMO SE MONTA
-------------
Al exportar, Telar Studio deja esto:

    ${cid(E.proyecto)}\\
        ${carpetaNodo(A)}\\${carpetaNodo(A)}.ino
        ${carpetaNodo(B)}\\${carpetaNodo(B)}.ino
        (este fichero)

Cada nodo es un sketch independiente, con su propia carpeta. Abre cada
.ino con doble clic: asi da igual donde esten y el IDE no se lia.

1. Abre ${carpetaNodo(B)}\\${carpetaNodo(B)}.ino y subelo al
   ${placaDe(B).corto}. La primera vez, con "Simular las medidas" marcada en
   la pestana Hardware.
2. Abre ${carpetaNodo(A)}\\${carpetaNodo(A)}.ino y subelo a la pantalla.
3. Conecta el enlace entre las dos.

Si la pantalla muestra guiones (--) donde deberia haber numeros, el enlace
no esta llegando: mira el LEEME del nodo de control, que lleva el orden de
pruebas.
`;
}
