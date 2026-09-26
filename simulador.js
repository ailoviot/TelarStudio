/* =====================================================================
 * SIMULADOR — probar la pantalla y la lógica antes de flashear
 *
 * Compilar y flashear tarda minutos; esto tarda un clic. Sigue la receta
 * del gemelo de la skill (runtime/twin.md): la lógica corre con las MISMAS
 * reglas que el firmware generado, no con una aproximación. Si el
 * simulador y la placa discreparan, el simulador dejaría de ser una prueba
 * y pasaría a ser un dibujo.
 *
 * Lo que replica, y de dónde:
 *   - la tarea de control a 20 Hz: primero los eventos de la cola, luego
 *     leer las entradas y luego la lógica              (control.cpp · paso)
 *   - estados, on enter, while, los if en orden y el break tras un go to,
 *     set, increase/decrease con su rango, restart, count      (logica.cpp)
 *   - un timer sigue a su setting mientras no está contando    (logica.cpp)
 *   - botones: in ESTADO en cadena y always como "si no"; repeat: yes con
 *     el primer paso al tocar y luego cada 100 ms tras 400 ms  (ui.cpp)
 *   - órdenes de sí/no (pulso), subir/bajar un valor, deslizador e
 *     interruptor                                  (ui.cpp · callbacks)
 *   - el refresco: número, tiempo mm:ss, barra, arcos, piloto, gráfica;
 *     con el enlace caído solo lo del otro nodo pasa a "--"   (ui.cpp)
 *   - looks: texto y color por estado                          (ui.cpp)
 *
 * El dibujo es el del lienzo (dibujo(w, vivo) en telar-studio.html): sirve
 * para ver CÓMO FUNCIONA. Tipografías y píxeles exactos, en la placa.
 * La simulación no toca el proyecto: solo lo lee.
 * ================================================================== */
(function(){
'use strict';

const $ = id => document.getElementById(id);
const L = () => window.LOGICA;
const PERIODO = 0.05;        /* la tarea de control de la placa: 50 ms */

const SIM = {
  activo: false, M: null, errores: 0,
  S: {}, st: {}, cola: [], pulsos: [],
  mult: 1, tSim: 0, iPant: 0,
  bench: {}, planta: 'manual', motor: null, enlaceCaido: false,
  log: [], series: {},
  presionado: null, repetir: null, arrastrando: null,
  intervalos: [],
};

/* ------------------------------------------------------------ estilo */
document.head.insertAdjacentHTML('beforeend', `<style id="sim-estilo">
#simCapa{position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;background:var(--fondo)}
.sim-escena{flex:1;display:flex;flex-direction:column;min-width:0}
.sim-barra{display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid var(--borde);background:#12151b;flex-wrap:wrap}
.sim-barra .titulo{font-weight:700;color:var(--ok);letter-spacing:.02em}
.sim-barra select{width:auto}
.sim-barra .sep{flex:1}
.sim-zona{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;overflow:hidden;padding:18px}
.sim-marco{background:#000;border-radius:14px;padding:9px;box-shadow:0 10px 40px rgba(0,0,0,.5);flex:none}
.sim-pantalla{position:relative;transform-origin:top left;overflow:hidden;touch-action:none;user-select:none}
.sim-w{position:absolute}
.sim-w.pulsable{cursor:pointer}
.sim-w.sim-led .w-int{overflow:visible}
.sim-w.apagado{opacity:.4;pointer-events:none}
/* Caja ceñida al texto = LV_SIZE_CONTENT en la placa: crece con el texto
   desde su esquina, no se recorta a la caja que midió el editor. */
.sim-w.sim-auto{width:max-content!important}
.sim-w.sim-auto .w-int{position:relative;inset:auto;height:100%;overflow:visible;align-items:flex-start;white-space:nowrap}
.sim-pie{padding:7px 16px 10px;font:11px var(--mono);color:var(--debil);text-align:center}
.sim-banco{width:340px;flex:0 0 340px;background:var(--panel);border-left:1px solid var(--borde);overflow-y:auto;padding:16px}
.sim-banco .fila-sim{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px}
.sim-banco .fila-sim .nom{flex:0 0 112px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:12px var(--mono)}
.sim-banco .fila-sim input[type=range]{flex:1;min-width:0}
.sim-banco .fila-sim select{flex:1;width:auto}
.sim-banco .val{font:12px var(--mono);min-width:70px;text-align:right;color:var(--texto)}
.sim-num{flex:1;display:flex;gap:4px;align-items:center;min-width:0}
.sim-num .btn{flex:none;width:30px;padding:5px 0;text-align:center;touch-action:none;user-select:none}
.sim-num input{flex:1;min-width:0;width:100%;text-align:center;font:13px var(--mono);padding:5px 4px}
.sim-num input::-webkit-inner-spin-button,.sim-num input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.sim-num input{-moz-appearance:textfield;appearance:textfield}
.sim-banco .unidad{flex:none;min-width:22px;font:12px var(--mono);color:var(--tenue)}
/* nada del banco lo ensancha: sin barra horizontal */
.sim-banco{overflow-x:hidden}
.sim-banco .fila-sim select,.sim-banco .fila-sim input{min-width:0;max-width:100%}
.sim-banco .fila-sim .nom{flex:0 0 96px}
.sim-chip{font:11px/1 var(--mono);padding:4px 7px;border-radius:5px;background:var(--panel2);border:1px solid var(--borde);color:var(--tenue)}
.sim-chip.on{background:#123524;border-color:var(--ok);color:var(--ok)}
.sim-reloj .btn{padding:5px 10px}
.sim-reloj .btn.activo{background:#1d3a63;border-color:var(--acento)}
.sim-log{font:11.5px/1.55 var(--mono);color:var(--tenue);max-height:220px;overflow-y:auto}
.sim-log b{color:var(--texto);font-weight:600}
.sim-log span{color:var(--debil)}
.sim-nota{font-size:12px;color:var(--tenue);line-height:1.45;margin-top:4px}
.sim-aviso{background:#3a2a10;border:1px solid var(--aviso);color:#ffd89a;border-radius:7px;padding:8px 10px;font-size:12.5px;margin-bottom:14px}
.sim-remoto{font-size:11px;color:var(--aviso);margin-left:4px}
/* cabecera fija del banco: que esta pasando, de un vistazo */
.sim-cab{position:sticky;top:-16px;z-index:5;margin:-16px -16px 6px;padding:14px 16px 12px;background:var(--panel);
  border-bottom:2px solid color-mix(in srgb,var(--ok) 60%,var(--borde))}
.sim-cab-fila{display:flex;align-items:center;justify-content:space-between;gap:10px}
.sim-vivo{display:inline-flex;align-items:center;gap:7px;font:600 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ok)}
.sim-vivo i{width:8px;height:8px;border-radius:50%;background:var(--ok);animation:sim-pulso 1.6s infinite}
@keyframes sim-pulso{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--ok) 55%,transparent)}70%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}
@media (prefers-reduced-motion: reduce){ .sim-vivo i{animation:none} }
.sim-cab #simTiempo{font:600 20px var(--mono);color:var(--texto);min-width:0;text-align:right}
.sim-estados{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.sim-est{display:inline-flex;align-items:baseline;gap:6px;padding:5px 11px;border-radius:7px;
  background:color-mix(in srgb,var(--acento) 14%,var(--panel2));border:1px solid color-mix(in srgb,var(--acento) 45%,var(--borde))}
.sim-est b{font:700 13px var(--mono);color:var(--texto)}
.sim-est small{font:10px var(--mono);color:var(--tenue)}
.sim-reloj.seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:10px}
.sim-reloj.seg .btn{padding:5px 0;text-align:center;font:12px var(--mono)}
.sim-banco details.sec .fila-sim:last-child{margin-bottom:0}
.sim-banco .dato-linea{margin:8px 0 0}
</style>`);

/* ---------------------------------------------------------- utilidades */
const num = x => typeof x === 'boolean' ? (x ? 1 : 0) : (Number(x) || 0);
const acota = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clave = b => b.name || '_';
const mmss = s => { s = Math.max(0, Math.floor(num(s))); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const varDe = n => n ? variables().find(v => v.nombre === n) : null;
const vLogica = () => SIM.M ? Object.assign({}, ...SIM.M.blocks.map(b => b.variables)) : {};
const pantallaSim = () => E.pantallas[SIM.iPant] || E.pantallas[0];
/* Un texto traducido con huecos: tf('Subir {n} …', { n: 5 }) */
const tf = (es, vars) => Object.entries(vars).reduce((s, [k, v]) => s.split('{' + k + '}').join(v), t(es));

/* El rango con el que se acota: el del setting, o el de la salida */
function rango(n){
  const lv = vLogica()[n];
  if (lv && lv.type === 'setting') return lv.range;
  const v = varDe(n);
  return v && !v.booleano && v.min !== undefined && v.max !== undefined ? [v.min, v.max] : null;
}

/* ------------------------------------------------ la memoria (NVS)
   Como la flash de la placa: sobrevive a «Reiniciar» y a cerrar el
   simulador. Vive en el navegador, una por proyecto. */
const claveNVS = () => 'telar_sim_nvs:' + (E.proyecto || '');
function leerNVS(){ try { return JSON.parse(localStorage.getItem(claveNVS()) || '{}') || {}; } catch (e) { return SIM.nvsRam || {}; } }
function escribirNVS(m){ SIM.nvsRam = m; try { localStorage.setItem(claveNVS(), JSON.stringify(m)); } catch (e) {} }

function anotar(html){
  SIM.log.unshift(`<div><span>${mmss(SIM.tSim)}</span> ${html}</div>`);
  if (SIM.log.length > 60) SIM.log.length = 60;
}

/* ============================================================= motor */
/* logica_init: settings, luego timers, luego cada bloque a su start_in */
function iniciar(){
  SIM.S = {}; SIM.st = {}; SIM.cola = []; SIM.pulsos = []; SIM.tSim = 0; SIM.log = []; SIM.series = {};
  SIM.tz = {};    /* salidas con tiempo (pulse, blink, click): como temporizada_t */
  SIM.ten = {};   /* cuanto lleva cada bloque en su estado (after, every) */
  SIM.lp = {};    /* on hold: los botones con pulsación larga que están apretados */
  for (const v of variables()){
    if (v.dir === 'lectura')        SIM.S[v.nombre] = SIM.bench[v.nombre] ?? (v.booleano ? false : (v.min ?? 0));
    else if (v.dir === 'escritura') SIM.S[v.nombre] = v.booleano ? false : (v.inicial ?? 0);
    else if (v.dir === 'ajuste')    SIM.S[v.nombre] = v.pordefecto ?? 0;
  }
  const LV = vLogica();
  for (const [n, v] of Object.entries(LV)) if (v.type === 'setting') SIM.S[n] = v.start;
  for (const [n, v] of Object.entries(LV)) if (v.type === 'timer')   SIM.S[n] = v.counts === 'up' ? 0 : SIM.S[v.from];
  for (const [n, v] of Object.entries(LV)) if (v.type === 'flag')    SIM.S[n] = L().banderaInicial(v);
  for (const [n, v] of Object.entries(LV)) if (v.type === 'counter') SIM.S[n] = L().inicioContador(v);
  anotar(`<b>${t('arranque')}</b>`);
  if (SIM.M) for (const b of SIM.M.blocks) entrar(b, b.start_in);
}

/* entrar(): cambia de estado y hace lo de on enter */
function entrar(b, st){
  SIM.st[clave(b)] = st;
  SIM.ten[clave(b)] = 0;
  anotar(`${b.name ? esc(b.name) + ' → ' : '→ '}<b>${esc(st)}</b>`);
  const body = b.states[st];
  if (body && body['on enter']) for (const a of body['on enter']) accion(b, a, 0);
}

/* ¿Algún bloque está ahora en un estado cuyo while cuenta este timer? */
function contando(t){
  return SIM.M.blocks.some(bb => {
    const body = bb.states[SIM.st[clave(bb)]];
    return !!body && (body.while || []).some(a => String(a).trim() === 'count ' + t);
  });
}

/* SALIDAS CON TIEMPO: lo mismo que tz_pulso / tz_parpadeo / tz_paso */
function tzPulso(x, dur){ SIM.tz[x] = { modo: 1, queda: dur }; SIM.S[x] = true; }
function tzParpadeo(x, on, off, total, veces){
  const t = SIM.tz[x];
  if (t && t.modo === 2 && t.on === on && t.off === off) return;   /* pedirlo igual no lo reinicia */
  SIM.tz[x] = { modo: 2, on, off, fase: 0, total, veces }; SIM.S[x] = true;
}
function tzPaso(dt){
  for (const [x, t] of Object.entries(SIM.tz)){
    if (t.modo === 1){ t.queda -= dt; if (t.queda < -0.5 * dt){ SIM.S[x] = false; t.modo = 0; } continue; }
    if (t.modo !== 2) continue;
    if (t.total > 0){ t.total -= dt; if (t.total <= 0){ SIM.S[x] = false; t.modo = 0; continue; } }
    t.fase += dt;
    const ciclo = t.on + t.off;
    if (ciclo > 0 && t.fase >= ciclo){
      t.fase -= ciclo;
      if (t.veces > 0 && --t.veces === 0){ SIM.S[x] = false; t.modo = 0; continue; }
    }
    SIM.S[x] = t.fase < t.on;
  }
}
/* lo explicito manda: turn on/off o toggle cancela el reloj de esa salida */
const tzCancela = x => { if (SIM.tz[x]) SIM.tz[x].modo = 0; };

/* Una acción. Devuelve true si cambió de estado (go to). */
function accion(b, a, dt){
  const S = SIM.S, LV = vLogica();
  const mp = String(a).match(L().RE_PULSE);
  if (mp){ tzPulso(mp[1], valor(mp[2] ?? String(L().PULSO_DEF))); return false; }
  const mb = String(a).match(L().RE_BLINK);
  if (mb){ tzParpadeo(mb[1], valor(mb[2]), valor(mb[3]), mb[4] === 'for' ? valor(mb[5]) : -1, mb[4] === 'times' ? Math.trunc(valor(mb[5])) : 0); return false; }
  /* set: un numero, un nombre o una cuenta; lo mismo que logica.cpp */
  const ms = String(a).match(L().RE_SET_CUENTA);
  if (ms){
    const [, x, val] = ms, e = L().expresion(val), r = rango(x);
    if (!e.arbol) return false;
    let v = L().calcula(e.arbol, n => num(S[n]));
    if (LV[x] && LV[x].type === 'timer') v = Math.max(0, v);
    else if (LV[x] && LV[x].type === 'counter') v = acota(Math.round(v), 0, L().topeContador(LV[x]));
    else if (r) v = acota(v, r[0], r[1]);
    S[x] = v;
    /* un timer que sale de este setting lo sigue mientras no está contando */
    if (LV[x] && LV[x].type === 'setting')
      for (const [tn, tv] of Object.entries(LV))
        if (tv.type === 'timer' && tv.from === x && !contando(tn)) S[tn] = S[x];
    return false;
  }
  const m = String(a).match(L().RE_ACTION);
  if (!m) return false;
  const [, vb, x] = m, v = LV[x] || {};
  switch (vb){
  case 'go to': entrar(b, x); return true;
  case 'increase':
  case 'decrease':
    if (v.type === 'counter'){ S[x] = acota(num(S[x]) + (vb === 'increase' ? 1 : -1), 0, L().topeContador(v)); return false; }
    S[x] = acota(num(S[x]) + (vb === 'increase' ? v.step : -v.step), v.range[0], v.range[1]);
    /* un timer que sale de este ajuste lo sigue mientras no está contando */
    for (const [tn, tv] of Object.entries(LV))
      if (tv.type === 'timer' && tv.from === x && !contando(tn)) S[tn] = S[x];
    return false;
  case 'restart': if (v.type === 'counter'){ S[x] = L().inicioContador(v); return false; }
    S[x] = v.counts === 'up' ? 0 : num(S[v.from]); return false;
  case 'count':   S[x] = v.counts === 'up' ? num(S[x]) + dt : Math.max(0, num(S[x]) - dt); return false;
  case 'turn on':  tzCancela(x); S[x] = true;  return false;
  case 'turn off': tzCancela(x); S[x] = false; return false;
  case 'toggle':   tzCancela(x); S[x] = !S[x]; return false;
  case 'save': {
    const m = leerNVS(); m[x] = num(S[x]); escribirNVS(m);
    anotar(`${t('guardado en la memoria')}: ${esc(x)} = <b>${esc(m[x])}</b>`);
    return false;
  }
  case 'load': {
    const m = leerNVS();
    if (!(x in m)){ anotar(`${esc(x)}: <span>${t('no hay nada guardado todavía')}</span>`); return false; }
    if (v.type === 'counter'){ S[x] = acota(Math.round(num(m[x])), 0, L().topeContador(v)); anotar(`${t('cargado de la memoria')}: ${esc(x)} = <b>${S[x]}</b>`); return false; }
    if (v.type === 'flag'){ S[x] = num(m[x]) !== 0; anotar(`${t('cargado de la memoria')}: ${esc(x)} = <b>${S[x] ? t('sí') : 'no'}</b>`); return false; }
    S[x] = acota(num(m[x]), v.range[0], v.range[1]);
    for (const [tn, tv] of Object.entries(LV))
      if (tv.type === 'timer' && tv.from === x && !contando(tn)) S[tn] = S[x];
    anotar(`${t('cargado de la memoria')}: ${esc(x)} = <b>${esc(S[x])}</b>`);
    return false;
  }
  }
  return false;
}

const valor = x => isNaN(+x) ? num(SIM.S[x]) : +x;
function comparacion(m){
  /* "if cycle is RUNNING": en qué estado está ese bloque ahora */
  if (m.es){
    const bb = SIM.M.blocks.find(x => x.name === m[1]);
    const r = !!bb && SIM.st[clave(bb)] === m[3];
    return m.no ? !r : r;
  }
  const cuenta = x => L().calcula(x, n => num(SIM.S[n]));
  const a = m.cuentaIzq ? cuenta(m.cuentaIzq) : num(SIM.S[m[1]]);
  let b = m.cuenta ? cuenta(m.cuenta) : valor(m[3]);
  if (m[4]) b = m[4] === '+' ? b + valor(m[5]) : b - valor(m[5]);
  let r = false;
  switch (m[2]){
  case '>': r = a > b; break;   case '<': r = a < b; break;
  case '>=': r = a >= b; break; case '<=': r = a <= b; break;
  case '==': r = a === b; break; case '!=': r = a !== b; break;
  }
  return m.no ? !r : r;
}
/* Una o varias comparaciones con and / or, con el mismo orden que la
   placa: primero los and, y el resultado se une con los or. */
function condicion(k){
  const C = L().condPartes(k); if (!C) return false;
  let ors = false, ands = comparacion(C.partes[0]);
  for (let i = 1; i < C.partes.length; i++){
    const v = comparacion(C.partes[i]);
    if (C.enlaces[i - 1] === 'and') ands = ands && v;
    else { ors = ors || ands; ands = v; }
  }
  return ors || ands;
}

/* logica_paso: primero las salidas con tiempo; luego cada bloque, su
   while y sus if / after / every en el orden en que se escribieron */
function paso(dt){
  pasoLargas(dt);
  for (const b of SIM.M.blocks){
    const kb = clave(b), t0 = SIM.ten[kb] || 0;
    SIM.ten[kb] = t0 + dt;
    const t1 = SIM.ten[kb];
    const body = b.states[SIM.st[kb]];
    if (!body) continue;
    for (const a of (body.while || [])) accion(b, a, dt);
    let alguno = false, salio = false;
    for (const k of Object.keys(body).filter(k => /^(if|after|every)\b/.test(k))){
      const ma = k.match(L().RE_AFTER), me = k.match(L().RE_EVERY);
      if (ma){ const T = valor(ma[1]); if (!(t0 < T && t1 >= T)) continue; }
      else if (me){ const T = valor(me[1]); if (!(T > 0 && Math.trunc(t1 / T) !== Math.trunc(t0 / T))) continue; }
      else { if (!condicion(k)) continue; alguno = true; }
      let cambio = false;
      for (const a of body[k]) if (accion(b, a, dt)) cambio = true;
      if (cambio){ salio = true; break; }     /* el break del switch de logica.cpp */
    }
    /* else: solo si no se cumplio ninguno, igual que en la placa */
    if (!alguno && !salio && Array.isArray(body.else))
      for (const a of body.else) accion(b, a, dt);
  }
  /* al final, las salidas con tiempo: justo antes de "escribirlas" */
  tzPaso(dt);
}

/* el pitido de click, si la logica lo tiene */
/* el click no pisa nada: solo suena si su salida está apagada y sin un
   pulse o blink propio (lo mismo que tz_click en logica.cpp) */
function clic(){
  const c = clickLogica(); if (!c) return;
  const t = SIM.tz[c.salida];
  if (SIM.S[c.salida] || (t && t.modo)) return;
  tzPulso(c.salida, valor(c.dur));
}

/* logica_boton: hold al tocar; in ESTADO en cadena; always como "si no".
   Suena el click si el boton hizo algo. */
function botonLogica(nombre){
  for (const b of SIM.M.blocks){
    const filas = b.buttons[nombre]; if (!filas) continue;
    if (typeof filas.hold === 'string'){ tzCancela(filas.hold); SIM.S[filas.hold] = true; clic(); }
    /* con on hold, al tocar solo empieza a contar (lo mismo que lp_ en logica.cpp) */
    const larga = Object.keys(filas).find(k => /^on hold\b/.test(k));
    if (larga){ SIM.lp[nombre] = { b, nombre, k: larga, lleva: 0, largo: false }; continue; }
    pulsarFilas(b, filas);
  }
}
/* lo de pulsar: in ESTADO o always, y el click si hizo algo */
function pulsarFilas(b, filas){
  const st = SIM.st[clave(b)];
  const fila = Object.entries(filas).find(([k]) => /^in\s/.test(k) && k.replace(/^in\s+/, '') === st);
  const hizo = fila ? fila[1] : filas.always;
  if (hizo){ hizo.forEach(a => accion(b, a, 0)); if (typeof filas.hold !== 'string') clic(); }
}
/* on hold: cuánto lleva pulsado cada botón con pulsación larga */
function pasoLargas(dt){
  for (const lp of Object.values(SIM.lp || {})){
    if (lp.largo) continue;
    lp.lleva += dt;
    const m = lp.k.match(L().RE_ONHOLD);
    if (m && lp.lleva + 0.001 >= valor(m[1])){
      lp.largo = true;
      anotar(`${t('pulsación larga')} <b>${esc(lp.nombre)}</b>`);
      lp.b.buttons[lp.nombre][lp.k].forEach(a => accion(lp.b, a, 0));
      clic();
    }
  }
}
/* al soltar: hold se apaga y se hace lo de "on release" */
function botonSoltar(nombre){
  for (const b of SIM.M.blocks){
    const filas = b.buttons[nombre]; if (!filas) continue;
    /* on hold: si se soltó antes del tiempo, fue un toque corto */
    const lp = SIM.lp && SIM.lp[nombre];
    if (lp){ if (!lp.largo) pulsarFilas(b, filas); delete SIM.lp[nombre]; }
    if (typeof filas.hold === 'string') SIM.S[filas.hold] = false;
    if (filas['on release']) filas['on release'].forEach(a => accion(b, a, 0));
  }
}

/* atender_eventos: lo que encolan los widgets */
function atender(ev){
  const S = SIM.S;
  if (ev.tipo === 'logica'){ anotar(`${t('pulsado')} <b>${esc(ev.w.nombre)}</b>`); if (SIM.M) botonLogica(ev.w.nombre); return; }
  if (ev.tipo === 'suelta'){ anotar(`${t('soltado')} <b>${esc(ev.w.nombre)}</b>`); if (SIM.M) botonSoltar(ev.w.nombre); return; }
  if (ev.tipo === 'set'){
    S[ev.n] = ev.v;
    if (ev.pulso) SIM.pulsos.push(ev.n);
    if (ev.w) anotar(`<b>${esc(ev.w.nombre)}</b> → ${esc(ev.n)} = ${esc(typeof ev.v === 'boolean' ? (ev.v ? 'ON' : 'OFF') : ev.v)}`);
    return;
  }
  if (ev.tipo === 'inc'){
    const r = rango(ev.n);
    S[ev.n] = r ? acota(num(S[ev.n]) + ev.d, r[0], r[1]) : num(S[ev.n]) + ev.d;
    return;
  }
}

/* La planta «Motor»: lo que se mide se mueve según lo que manda la lógica.
   Es un variac con motor: la velocidad va con el PWM (al 100 % es m.vel
   por segundo), el sentido lo da una salida sí/no (ON sube, OFF baja) y
   con el PWM a 0 se queda donde está. Usa las salidas del paso anterior,
   como la máquina real: primero se mide, luego decide la lógica. */
function plantaMotor(dt){
  const m = SIM.motor; if (!m) return;
  const vin = varDe(m.entrada), vout = varDe(m.salida);
  if (!vin || !vout){ m.ahora = 0; return; }
  const lo = vout.min ?? 0, hi = vout.max ?? 1;
  const duty = acota((num(SIM.S[m.salida]) - lo) / ((hi - lo) || 1), 0, 1);
  const sentido = m.dir ? (num(SIM.S[m.dir]) ? 1 : -1) : 1;
  m.ahora = sentido * num(m.vel) * duty;
  SIM.bench[m.entrada] = acota(num(SIM.bench[m.entrada]) + m.ahora * dt, vin.min ?? 0, vin.max ?? 100);
}

/* hal_leer: las entradas vienen del banco (o de la planta) */
function leerEntradas(dt){
  if (SIM.planta === 'motor') plantaMotor(dt);
  let i = 0;
  for (const v of variables()){
    if (v.dir !== 'lectura') continue;
    if (SIM.planta === 'onda' && !v.booleano){
      const lo = v.min ?? 0, hi = v.max ?? 100;
      SIM.bench[v.nombre] = lo + (hi - lo) * (0.5 + 0.42 * Math.sin(SIM.tSim / (7 + 3 * i)));
    }
    i++;
    /* con el enlace caído, lo del otro nodo se queda en lo último que llegó */
    if (SIM.enlaceCaido && v.remota) continue;
    SIM.S[v.nombre] = SIM.bench[v.nombre];
  }
}

function tick(){
  for (const ev of SIM.cola.splice(0)) atender(ev);
  /* ×20 no es un paso veinte veces más largo: son veinte pasos de 50 ms,
     como en la placa. Si no, la tensión saltaría de golpe y se pasaría del
     setpoint antes de que la lógica la viera llegar. */
  for (let k = 0; k < SIM.mult; k++){
    SIM.tSim += PERIODO;
    leerEntradas(PERIODO);
    if (SIM.M) paso(PERIODO);
    for (const n of SIM.pulsos.splice(0)) SIM.S[n] = false;   /* el pulso ya salió */
  }
}

/* ======================================================= la pantalla */
function aspecto(w, V){
  if (!SIM.M) return;
  for (const b of SIM.M.blocks){
    const filas = b.looks[w.nombre]; if (!filas) continue;
    const st = SIM.st[clave(b)];
    const fila = Object.entries(filas).find(([k]) => k.replace(/^in\s+/, '') === st);
    if (!fila) continue;
    const a = fila[1] || {};
    if (a.color !== undefined) V.color = L().COLORS[a.color] || a.color;
    if (a.text !== undefined && (w.tipo === 'button' || w.tipo === 'label')) V.texto = String(a.text);
    if (L().habilitadoDe(a) === false && L().APAGABLES.includes(w.tipo)) V.apagado = true;
  }
}

/* Lo que pondría ui_refresh en cada widget */
function vivoDe(w){
  /* los componentes calculan lo suyo; el color de looks, como cualquiera */
  if (COMPONENTES[w.tipo]){
    const ctx = { estado: SIM.M ? SIM.st[clave(SIM.M.blocks[0])] : '', enlaceCaido: !!SIM.enlaceCaido, t: SIM.tSim };
    const V = COMPONENTES[w.tipo].vivo(w, SIM.S, ctx) || {};
    if (w.tipo !== 'pildora') aspecto(w, V);
    return V;
  }
  const S = SIM.S, v = varDe(w.bind), V = {};
  const caida = x => SIM.enlaceCaido && x && x.remota;
  const frac = () => {
    if (!v) return 0;
    const lo = Math.round(v.min ?? 0), hi = Math.round(v.max ?? 100);
    const x = caida(v) ? lo : Math.trunc(num(S[v.nombre]));
    return acota((x - lo) / ((hi - lo) || 1), 0, 1);
  };
  switch (w.tipo){
  case 'value':
    V.texto = !v || caida(v) ? '--' : (v.booleano ? (S[v.nombre] ? 'SI' : 'NO') : conComa(num(S[v.nombre]).toFixed(w.decimales ?? 1)));
    break;
  case 'timer':
    V.texto = v ? mmss(S[v.nombre]) : '00:00';
    break;
  case 'bar': case 'arc-gauge': case 'semicircle-gauge':
    V.frac = frac(); break;
  case 'slider':
    V.frac = SIM.arrastrando && SIM.arrastrando.id === w.id ? SIM.arrastrando.f : frac(); break;
  case 'toggle':
    V.on = v ? !!num(S[v.nombre]) : false; break;
  /* los de entrada: lo que dice su variable */
  case 'checkbox':
    V.on = v ? !!num(S[v.nombre]) : true; break;
  case 'dropdown': case 'roller': {
    const n = Math.max(1, elementosDe(w).length);
    V.idx = v ? acota(Math.round(num(S[v.nombre])), 0, n - 1) : 0; break;
  }
  case 'spinbox':
    V.texto = conComa(num(v ? S[v.nombre] : 12).toFixed(geoContador(w).dec)); break;
  case 'list':
    if (v) V.idx = Math.round(num(S[v.nombre])); break;
  /* el aviso: se ve en sus estados (o al arrancar) hasta que se cierra */
  case 'msgbox': {
    const est = SIM.M ? SIM.st[clave(SIM.M.blocks[0])] : '', enEst = estadosAviso(w);
    if (AVISOS.visto[w.id] !== est){ AVISOS.visto[w.id] = est; if (enEst) delete AVISOS.cerrado[w.id]; }
    V.oculto = enEst ? (!enEst.includes(est) || AVISOS.cerrado[w.id] === est) : AVISOS.cerrado[w.id] === '*';
    break;
  }
  case 'led':
    V.on = v && !caida(v) ? !!num(S[v.nombre]) : false; break;
  case 'chart':
    V.series = (w.series || []).slice(0, 2).map(n => ({ datos: SIM.series[w.id + '|' + n] || [], v: varDe(n) }));
    break;
  case 'state-strip': {
    V.estados = estadosProyecto();
    V.idx = SIM.M ? V.estados.indexOf(SIM.st[clave(SIM.M.blocks[0])]) : 0;
    break;
  }
  case 'button':
    V.presionado = SIM.presionado === w.id; break;
  }
  aspecto(w, V);
  return V;
}

function refrescar(){
  if (!SIM.activo) return;
  const pant = $('simPant'); if (!pant) return;
  for (const w of pantallaSim().widgets){
    /* la gráfica apunta un punto por refresco; con el enlace caído, lo remoto no */
    if (w.tipo === 'chart' && !(SIM.enlaceCaido && (w.series || []).some(n => (varDe(n) || {}).remota))){
      for (const n of (w.series || []).slice(0, 2)){
        const k = w.id + '|' + n, arr = SIM.series[k] || (SIM.series[k] = []);
        arr.push(Math.trunc(num(SIM.S[n]))); if (arr.length > 60) arr.shift();
      }
    }
    const nodo = pant.querySelector(`.sim-w[data-id="${w.id}"] .w-int`);
    if (!nodo) continue;
    const V = vivoDe(w), html = dibujo(w, V);
    if (nodo.__html !== html){ nodo.innerHTML = html; nodo.__html = html; }
    /* enabled: no → al 40 % y sin toques, como en la placa. Si se apaga
       mientras se mantiene pulsado, la repeticion se corta. */
    const caja = nodo.parentElement, apagado = !!V.apagado;
    if (caja.classList.contains('apagado') !== apagado){
      caja.classList.toggle('apagado', apagado);
      if (apagado && SIM.presionado === w.id){ pararRepeticion(); SIM.presionado = null; }
    }
  }
  refrescarBanco();
}

/* ------------------------------------------------ tocar la pantalla */
function pulsarBoton(w){
  if (w.destino){
    const i = E.pantallas.findIndex(s => s.nombre === w.destino);
    if (i >= 0){ SIM.iPant = i; anotar(`<b>${esc(w.nombre)}</b> → ${t('pantalla')} ${esc(w.destino)}`); construirPantalla(); pintarSelectorPantallas(); }
    return;
  }
  if (enLogica(w)){ SIM.cola.push({ tipo: 'logica', w }); return; }
  if (w.evento){ anotar(`<b>${esc(w.nombre)}</b> → ${t('evento')} ${esc(w.evento)} <span>${t('(lo atiende tu reglas.cpp: aquí no hace nada)')}</span>`); return; }
  const v = varDe(w.bind);
  if (v && v.dir === 'escritura' && v.booleano){ SIM.cola.push({ tipo: 'set', n: v.nombre, v: true, pulso: !!v.remota, w }); return; }
  const op = ordenPaso(w);
  if (op) SIM.cola.push({ tipo: 'inc', n: op.v.nombre, d: op.delta, w });
}

function pararRepeticion(){ clearTimeout(SIM.repetir); SIM.repetir = null; }

function esPulsable(w){
  if (w.tipo === 'button') return true;
  const v = varDe(w.bind);
  if (w.tipo === 'msgbox') return true;
  return ['slider', 'toggle', 'checkbox', 'dropdown', 'roller', 'spinbox', 'list'].includes(w.tipo) && !!v;
}

function conectarWidget(d, w){
  if (w.tipo === 'button'){
    const repite = () => (enLogica(w) && repiteLogica(w)) || !!(ordenPaso(w) && ordenPaso(w).repite);
    const avisaSoltar = () => enLogica(w) && !w.destino && botonesSuelta().includes(w.nombre);
    d.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { d.setPointerCapture(e.pointerId); } catch (_) {}
      SIM.presionado = w.id;
      if (avisaSoltar() && !repite()) pulsarBoton(w);      /* PRESSED */
      if (repite()){
        pulsarBoton(w);                                   /* PRESSED: el primer paso al tocar */
        const rep = () => { pulsarBoton(w); SIM.repetir = setTimeout(rep, 100); };
        SIM.repetir = setTimeout(rep, 400);               /* LONG_PRESSED_REPEAT */
      }
      refrescar();
    });
    const soltar = dentro => {
      if (SIM.presionado !== w.id) return;
      const eraRepite = repite();
      pararRepeticion(); SIM.presionado = null;
      if (avisaSoltar()) SIM.cola.push({ tipo: 'suelta', w });          /* RELEASED o PRESS_LOST */
      else if (!eraRepite && dentro) pulsarBoton(w);      /* CLICKED: al soltar dentro */
      refrescar();
    };
    d.addEventListener('pointerup', e => {
      const r = d.getBoundingClientRect();
      soltar(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
    });
    d.addEventListener('pointercancel', () => soltar(false));
    return;
  }
  const v = varDe(w.bind);
  if (w.tipo === 'slider' && v){
    const lo = Math.round(v.min ?? 0), hi = Math.round(v.max ?? 100);
    const mover = e => {
      const r = d.getBoundingClientRect(), k = r.width / w.w, g = geometria(w);
      const f = acota((e.clientX - (r.left + g.dx * k)) / (g.w * k || 1), 0, 1);
      const val = Math.round(lo + f * (hi - lo));
      SIM.arrastrando = { id: w.id, f: (val - lo) / ((hi - lo) || 1) };
      SIM.cola.push({ tipo: 'set', n: v.nombre, v: val });
      refrescar();
    };
    d.addEventListener('pointerdown', e => { e.preventDefault(); try { d.setPointerCapture(e.pointerId); } catch (_) {} mover(e); });
    d.addEventListener('pointermove', e => { if (SIM.arrastrando && SIM.arrastrando.id === w.id) mover(e); });
    const fin = () => { if (SIM.arrastrando && SIM.arrastrando.id === w.id) anotar(`<b>${esc(w.nombre)}</b> → ${esc(v.nombre)}`); SIM.arrastrando = null; };
    d.addEventListener('pointerup', fin); d.addEventListener('pointercancel', fin);
    return;
  }
  if (w.tipo === 'toggle' && v){
    d.addEventListener('pointerup', () => { SIM.cola.push({ tipo: 'set', n: v.nombre, v: !num(SIM.S[v.nombre]), w }); });
  }
  /* la casilla: como el interruptor (1 o 0) */
  if (w.tipo === 'checkbox' && v)
    d.addEventListener('pointerup', () => { SIM.cola.push({ tipo: 'set', n: v.nombre, v: num(SIM.S[v.nombre]) ? (v.booleano ? false : 0) : (v.booleano ? true : 1), w }); refrescar(); });
  /* el desplegable pasa a la opcion siguiente; la rueda, a la de arriba o
     a la de abajo segun donde se toque */
  if ((w.tipo === 'dropdown' || w.tipo === 'roller') && v)
    d.addEventListener('pointerup', e => {
      const n = Math.max(1, elementosDe(w).length), r = d.getBoundingClientRect();
      const i = acota(Math.round(num(SIM.S[v.nombre])), 0, n - 1);
      const sube = w.tipo === 'roller' && e.clientY < r.top + r.height / 2;
      const nuevo = (i + (sube ? n - 1 : 1)) % n;
      SIM.cola.push({ tipo: 'set', n: v.nombre, v: v.booleano ? !!nuevo : nuevo, w }); refrescar();
    });
  /* la lista: el elemento tocado */
  if (w.tipo === 'list' && v)
    d.addEventListener('pointerup', e => {
      const f = e.target.closest('[data-i]'); if (!f) return;
      const i = +f.dataset.i;
      SIM.cola.push({ tipo: 'set', n: v.nombre, v: v.booleano ? !!i : i, w }); refrescar();
    });
  /* el aviso: la X o su boton lo cierran */
  if (w.tipo === 'msgbox')
    d.addEventListener('pointerup', e => {
      if (!e.target.closest('[data-cerrar]')) return;
      AVISOS.cerrado[w.id] = estadosAviso(w) ? (SIM.M ? SIM.st[clave(SIM.M.blocks[0])] : '') : '*';
      anotar(`<b>${esc(w.nombre)}</b> ${t('cerrado')}`); refrescar();
    });
  /* el contador: - a la izquierda, + a la derecha */
  if (w.tipo === 'spinbox' && v && !v.booleano)
    d.addEventListener('pointerup', e => {
      const lado = e.target.closest('[data-lado]'); if (!lado) return;
      const G2 = geoContador(w), r = rango(v.nombre) || [v.min ?? 0, v.max ?? 100];
      const x = acota(num(SIM.S[v.nombre]) + (lado.dataset.lado === 'mas' ? G2.paso : -G2.paso), r[0], r[1]);
      SIM.cola.push({ tipo: 'set', n: v.nombre, v: +x.toFixed(G2.dec), w }); refrescar();
    });
}

/* los avisos cerrados en el simulador, y el estado en que se vio cada uno */
const AVISOS = { cerrado: {}, visto: {} };

function construirPantalla(){
  const P = placa(), pant = $('simPant'); if (!pant) return;
  pararRepeticion(); SIM.presionado = null; SIM.arrastrando = null;
  pant.innerHTML = '';
  pant.style.width = P.ancho + 'px'; pant.style.height = P.alto + 'px';
  pant.style.background = E.tema.fondo;
  for (const w of pantallaSim().widgets){
    const d = document.createElement('div');
    d.className = 'sim-w' + (w.tipo === 'led' ? ' sim-led' : '') + (esPulsable(w) ? ' pulsable' : '') + (w.auto && AUTOAJUSTABLES.has(w.tipo) ? ' sim-auto' : '');
    d.dataset.id = w.id;
    d.style.cssText = `left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px`;
    d.innerHTML = '<div class="w-int"></div>';
    conectarWidget(d, w);
    pant.appendChild(d);
  }
  encajar();
  refrescar();
}

function encajar(){
  const P = placa(), zona = document.querySelector('.sim-zona'), pant = $('simPant'), marco = $('simMarco');
  if (!zona || !pant) return;
  const s = Math.min((zona.clientWidth - 40) / P.ancho, (zona.clientHeight - 40) / P.alto, P.ancho < 200 ? 5 : 1.6);
  pant.style.transform = `scale(${s})`;
  /* la OLED, en blanco y negro como en la placa: el mismo filtro que el lienzo */
  pant.style.filter = esMono(P) ? FILTRO_MONO : '';
  marco.style.width = (P.ancho * s + 18) + 'px';
  marco.style.height = (P.alto * s + 18) + 'px';
  $('simPie').textContent = `${placa().corto} · ${P.ancho}×${P.alto} px · ${Math.round(s * 100)} % · ${t('el dibujo es el del lienzo; tipografías y píxeles exactos, en la placa')}`;
}

function pintarSelectorPantallas(){
  const sel = $('simPantSel'); if (!sel) return;
  sel.innerHTML = E.pantallas.map((s, i) => `<option value="${i}"${i === SIM.iPant ? ' selected' : ''}>${esc(s.nombre)}</option>`).join('');
}

/* ================================================== banco de pruebas */
/* Un decimal como mucho: la planta automática deja valores con coma */
const redondeo = x => String(Math.round(num(x) * 10) / 10);

/* Tocar una entrada a mano apaga la onda: si no, la pisaría. El motor no:
   con él, tocar el valor es como mover el variac a mano y sigue desde ahí. */
function apagarPlanta(){
  if (SIM.planta !== 'onda') return;
  SIM.planta = 'manual';
  const c = $('simPlanta'); if (c) c.value = 'manual';
}

/* El selector de planta y, con «Motor», qué mide, qué lo mueve y a qué velocidad */
function planta(vs){
  const opt = (lista, sel, vacio) => (vacio ? `<option value="">${vacio}</option>` : '')
    + lista.map(v => `<option value="${esc(v.nombre)}"${v.nombre === sel ? ' selected' : ''}>${esc(v.nombre)}</option>`).join('');
  const m = SIM.motor || {};
  const u = (varDe(m.entrada) || {}).unidad || '';
  const fila = (et, ctl) => `<div class="fila-sim"><span class="nom">${et}</span>${ctl}</div>`;
  return `<div class="fila-sim" style="margin-top:12px"><span class="nom">${t('planta')}</span>
      <select id="simPlanta">
        <option value="manual"${SIM.planta === 'manual' ? ' selected' : ''}>${t('Manual: tú pones los valores')}</option>
        <option value="motor"${SIM.planta === 'motor' ? ' selected' : ''}${SIM.motor ? '' : ' disabled'}>${t('Motor: sigue a las salidas')}</option>
        <option value="onda"${SIM.planta === 'onda' ? ' selected' : ''}>${t('Onda: se mueven solas')}</option>
      </select></div>
    ${SIM.motor ? `<div id="simMotor" style="${SIM.planta === 'motor' ? '' : 'display:none'}">
      ${fila(t('mueve'), `<select data-simmotor="entrada">${opt(vs.filter(v => v.dir === 'lectura' && !v.booleano), m.entrada)}</select>`)}
      ${fila(t('con'), `<select data-simmotor="salida">${opt(vs.filter(v => v.dir === 'escritura' && !v.booleano), m.salida)}</select>`)}
      ${fila(t('sentido'), `<select data-simmotor="dir">${opt(vs.filter(v => v.dir === 'escritura' && v.booleano), m.dir, t('siempre sube'))}</select>`)}
      ${fila(t('velocidad'), `<input type="number" data-simmotor="vel" min="0" step="1" value="${m.vel}" style="flex:1;min-width:0;text-align:center;font:13px var(--mono)"><span class="unidad">${esc(u)}/s</span>`)}
      <div class="dato-linea"><span>${t('Ahora')}</span><b id="simMotorAhora">${t('quieto')}</b></div>
      <div class="sim-nota">${t('La velocidad es con la salida al máximo: a la mitad, va a la mitad. El sentido: ON sube, OFF baja. Con la salida en 0 se queda quieto.')}</div>
    </div>` : ''}`;
}

/* ▼ ▲: de 1 en 1, desde el entero más cercano y dentro del rango */
function pasoEntrada(n, d){
  const v = varDe(n); if (!v) return;
  apagarPlanta();
  SIM.bench[n] = acota(Math.round(num(SIM.bench[n])) + d, v.min ?? 0, v.max ?? 100);
  mostrarEntrada(n);
}

/* Pulsar un ▼ ▲: un paso al tocar; mantenido, repite cada vez más seguido */
function mantener(b, paso){
  const parar = () => { clearTimeout(SIM.repBanco); SIM.repBanco = null; };
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); parar();
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    paso();
    let espera = 400;
    const rep = () => { paso(); espera = Math.max(40, espera * 0.8); SIM.repBanco = setTimeout(rep, espera); };
    SIM.repBanco = setTimeout(rep, espera);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => b.addEventListener(t, parar));
  b.addEventListener('click', e => { if (e.detail === 0) paso(); });   /* con el teclado */
}

/* Un ajuste se muestra con los decimales de su step: 1 → «30», 0.1 → «0.5» */
function redondeoAj(n){
  const v = vLogica()[n] || {}, dec = (String(v.step ?? 1).split('.')[1] || '').length;
  return num(SIM.S[n]).toFixed(dec);
}

/* Poner un ajuste desde el banco: dentro de su rango, y un timer que sale
   de él lo sigue mientras no esté contando (igual que increase/decrease) */
function ponerAjuste(n, x){
  const v = vLogica()[n]; if (!v || v.type !== 'setting') return;
  const dec = (String(v.step ?? 1).split('.')[1] || '').length;
  SIM.S[n] = +acota(x, v.range[0], v.range[1]).toFixed(dec);
  for (const [tn, tv] of Object.entries(vLogica()))
    if (tv.type === 'timer' && tv.from === n && !contando(tn)) SIM.S[tn] = SIM.S[n];
}
function pasoAjuste(n, d){
  const v = vLogica()[n]; if (!v) return;
  const st = num(v.step) || 1;
  ponerAjuste(n, Math.round(num(SIM.S[n]) / st) * st + d * st);
  const i = document.querySelector(`input[data-simaj="${CSS.escape(n)}"]`);
  if (i && document.activeElement !== i) i.value = redondeoAj(n);
}

/* La casilla sigue al valor, salvo mientras alguien escribe en ella */
function mostrarEntrada(n){
  const i = document.querySelector(`input[data-simnum="${CSS.escape(n)}"]`);
  if (i && document.activeElement !== i && i.value !== redondeo(SIM.bench[n])) i.value = redondeo(SIM.bench[n]);
}

function construirBanco(){
  const vs = variables(), M = SIM.M;
  const entradas = vs.filter(v => v.dir === 'lectura');
  let h = '';
  if (SIM.errores)
    h += `<div class="sim-aviso">${tf(SIM.errores === 1
      ? 'La lógica tiene {n} error: se simula la pantalla sin ella. Arréglala en la pestaña <b>Lógica</b> y vuelve a simular.'
      : 'La lógica tiene {n} errores: se simula la pantalla sin ella. Arréglala en la pestaña <b>Lógica</b> y vuelve a simular.', { n: SIM.errores })}</div>`;

  /* Arriba y fijo: que esta pasando. El estado de cada bloque lo pone
     refrescarBanco; la velocidad del reloj, aqui mismo. */
  const cab = `<div class="sim-cab">
    <div class="sim-cab-fila"><span class="sim-vivo"><i></i>${t('En marcha')}</span><span class="val" id="simTiempo">00:00</span></div>
    ${M ? `<div class="sim-estados">${M.blocks.map(b => `<span class="sim-est" data-simestahora="${esc(clave(b))}" title="${esc(t('Estado actual'))}">${
      M.blocks.length > 1 ? `<small>${esc(b.name || t('lógica'))}</small>` : ''}<b>${esc(SIM.st[clave(b)] || '')}</b></span>`).join('')}</div>` : ''}
    <div class="sim-reloj seg" title="${esc(t('Acelera los temporizadores: con ×20, 60 segundos pasan en 3.'))}">${[1, 5, 20].map(m =>
      `<button class="btn${m === SIM.mult ? ' activo' : ''}" data-simmult="${m}">×${m}</button>`).join('')}</div>
  </div>`;
  h = cab + h;

  h += seccion('sim-estado', t('Saltar a un estado'), M
    ? M.blocks.map(b => `<div class="fila-sim"><span class="nom" title="${esc(b.name || t('lógica'))}">${esc(b.name || t('lógica'))}</span>
        <select data-simestado="${esc(clave(b))}">${Object.keys(b.states).map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select></div>`).join('')
      + `<div class="sim-nota">${t('Elegir un estado aquí salta a él, con su <b>on enter</b>: sirve para ver cómo se ve cada estado sin tener que provocarlo.')}</div>`
    : `<div class="sim-nota">${t('Sin lógica: cada botón hace lo que diga su panel (una orden, cambiar de pantalla o un evento).')}</div>`);

  h += seccion('sim-entradas', t('Entradas · lo que mide el hardware'), `${entradas.length
    ? entradas.map(v => v.booleano
        ? `<div class="fila-sim"><span class="nom" title="${esc(v.nombre)}">${esc(v.nombre)}</span>
            <label style="flex:1;display:flex;gap:6px;align-items:center"><input type="checkbox" data-simin="${esc(v.nombre)}" style="width:auto"> ${t('activa')}</label>
            ${v.remota ? '<span class="sim-remoto">⇄</span>' : ''}</div>`
        : `<div class="fila-sim"><span class="nom" title="${esc(v.nombre)}">${esc(v.nombre)}</span>
            <div class="sim-num">
              <button class="btn" data-simpaso="-1" data-simvar="${esc(v.nombre)}" title="${esc(tf('Bajar {n} · mantén pulsado para ir rápido', { n: 1 }))}">▼</button>
              <input type="number" data-simnum="${esc(v.nombre)}" min="${v.min ?? 0}" max="${v.max ?? 100}" step="1" value="${redondeo(SIM.bench[v.nombre])}" title="${esc(tf('Escribe un valor entre {a} y {b}', { a: v.min ?? 0, b: v.max ?? 100 }))}">
              <button class="btn" data-simpaso="1" data-simvar="${esc(v.nombre)}" title="${esc(tf('Subir {n} · mantén pulsado para ir rápido', { n: 1 }))}">▲</button>
            </div>
            <span class="unidad">${esc(v.unidad || '')}</span></div>`).join('')
      + planta(vs)
    : `<div class="sim-nota">${t('No hay entradas en la pestaña Hardware.')}</div>`}`, entradas.length || undefined);

  if (E.nodos.length > 1)
    h += seccion('sim-enlace', t('Enlace con el otro nodo'), `
      <label class="fila-sim" style="gap:6px"><input type="checkbox" id="simEnlace" style="width:auto"> ${t('Enlace caído')}</label>
      <div class="sim-nota">${t('Lo que mide el otro nodo pasa a «--» y se queda en su último valor; sus salidas dejan de recibir órdenes.')}</div>`);

  h += seccion('sim-salidas', t('Salidas'), `<div id="simSalidas"></div>`, vs.filter(v => v.dir === 'escritura').length || undefined);
  if (M) h += seccion('sim-vars', t('Variables de la lógica'), `${Object.entries(vLogica()).map(([n, v]) => v.type === 'flag'
      ? `<div class="fila-sim"><span class="nom" title="${esc(n)}">${esc(n)}</span>
          <button class="sim-chip" data-simflag="${esc(n)}" id="simFlag_${esc(n)}" title="${esc(t('Clic para cambiarla'))}"></button></div>`
      : v.type === 'counter'
      ? `<div class="fila-sim"><span class="nom" title="${esc(n)}">${esc(n)}</span>
          <span class="val" id="simCta_${esc(n)}" style="flex:1;text-align:center"></span>
          <button class="btn" data-simcta="${esc(n)}" title="${esc(t('Volver a su start'))}">↺</button></div>`
      : v.type === 'setting'
      ? `<div class="fila-sim"><span class="nom" title="${esc(n)}">${esc(n)}</span>
          <div class="sim-num">
            <button class="btn" data-simajpaso="-1" data-simvar="${esc(n)}" title="${esc(tf('Bajar {n} · mantén pulsado para ir rápido', { n: v.step }))}">▼</button>
            <input type="number" data-simaj="${esc(n)}" min="${v.range[0]}" max="${v.range[1]}" step="${v.step}" value="${redondeoAj(n)}" title="${esc(tf('Escribe un valor entre {a} y {b}', { a: v.range[0], b: v.range[1] }))}">
            <button class="btn" data-simajpaso="1" data-simvar="${esc(n)}" title="${esc(tf('Subir {n} · mantén pulsado para ir rápido', { n: v.step }))}">▲</button>
          </div>
          <span class="unidad">${esc(v.unit || '')}</span></div>`
      : `<div class="fila-sim"><span class="nom" title="${esc(n)}">${esc(n)}</span>
          <span class="val" id="simVar_${esc(n)}" style="flex:1;text-align:center"></span>
          <span class="sim-chip on" id="simCont_${esc(n)}" style="display:none">${t('contando')}</span></div>`).join('')}
    <div class="sim-nota">${t('Los ajustes (<b>setting</b>) se cambian aquí en cualquier momento, de a un <b>step</b>. En la pantalla, sus botones − + solo los cambian donde diga la lógica.')}</div>`,
    Object.keys(vLogica()).length || undefined);
  /* la memoria solo se muestra si la lógica la usa */
  if (M && /"(save|load)\s/.test(JSON.stringify(M.blocks)))
    h += seccion('sim-nvs', t('Memoria (NVS)'), `<div id="simNVS"></div>
      <button class="btn" id="simBorrarNVS" style="margin-top:6px">${t('Borrar la memoria')}</button>
      <div class="sim-nota">${t('Lo guardado con <b>save</b> sobrevive a <b>Reiniciar</b>, como en la placa al apagarla. Borrar la memoria es como estrenar una placa nueva.')}</div>`);
  h += seccion('sim-log', t('Registro'), `<div class="sim-log" id="simLog"></div>`);
  $('simBanco').innerHTML = h;
  /* las secciones recuerdan si estaban abiertas, como en el resto del panel;
     y lo largo se resume con «Ver más» */
  document.querySelectorAll('#simBanco details.sec[data-sec]').forEach(dt => dt.addEventListener('toggle', () => {
    if (dt.open) SEC_CERRADAS.delete(dt.dataset.sec); else SEC_CERRADAS.add(dt.dataset.sec);
  }));
  resumirTextos();

  document.querySelectorAll('[data-simestado]').forEach(s => s.addEventListener('change', () => {
    const b = SIM.M.blocks.find(x => clave(x) === s.dataset.simestado);
    if (b){ anotar(`<span>${t('(forzado desde el banco)')}</span>`); entrar(b, s.value); refrescar(); }
  }));
  document.querySelectorAll('[data-simmult]').forEach(b => b.addEventListener('click', () => {
    SIM.mult = +b.dataset.simmult;
    document.querySelectorAll('[data-simmult]').forEach(x => x.classList.toggle('activo', x === b));
  }));
  /* ▼ ▲ de las entradas (de 1 en 1) y de los ajustes (de a un step) */
  document.querySelectorAll('[data-simpaso]').forEach(b => mantener(b, () => pasoEntrada(b.dataset.simvar, +b.dataset.simpaso)));
  document.querySelectorAll('[data-simajpaso]').forEach(b => mantener(b, () => pasoAjuste(b.dataset.simvar, +b.dataset.simajpaso)));
  /* un contador vuelve a su start con ↺, para repetir una prueba */
  document.querySelectorAll('[data-simcta]').forEach(b => b.addEventListener('click', () => {
    const n = b.dataset.simcta, v = vLogica()[n]; if (!v) return;
    SIM.S[n] = L().inicioContador(v);
    anotar(`${esc(n)} = <b>${SIM.S[n]}</b> <span>${t('(desde el banco)')}</span>`);
  }));
  /* una bandera se cambia con un clic, para probar los if que la miran */
  document.querySelectorAll('[data-simflag]').forEach(b => b.addEventListener('click', () => {
    const n = b.dataset.simflag;
    tzCancela(n); SIM.S[n] = !SIM.S[n];
    anotar(`${esc(n)} = <b>${SIM.S[n] ? t('sí') : 'no'}</b> <span>${t('(desde el banco)')}</span>`);
  }));
  document.querySelectorAll('input[data-simaj]').forEach(i => {
    const n = i.dataset.simaj;
    const leer = () => { const x = parseFloat(String(i.value).replace(',', '.')); return isFinite(x) ? x : null; };
    i.addEventListener('input', () => { const x = leer(); if (x !== null) ponerAjuste(n, x); });
    i.addEventListener('change', () => { const x = leer(); if (x !== null){ ponerAjuste(n, x); anotar(`${esc(n)} = <b>${esc(redondeoAj(n))}</b> <span>${t('(desde el banco)')}</span>`); } i.value = redondeoAj(n); });
    i.addEventListener('keydown', e => {
      if (e.key === 'Enter') i.blur();
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown'){ e.preventDefault(); pasoAjuste(n, e.key === 'ArrowUp' ? 1 : -1); i.value = redondeoAj(n); }
    });
    i.addEventListener('focus', () => i.select());
  });
  /* escribir el valor: se aplica mientras escribes y se acota al salir */
  document.querySelectorAll('input[data-simnum]').forEach(i => {
    const n = i.dataset.simnum, v = varDe(n) || {};
    const leer = () => { const x = parseFloat(String(i.value).replace(',', '.')); return isFinite(x) ? acota(x, v.min ?? 0, v.max ?? 100) : null; };
    i.addEventListener('input', () => { const x = leer(); if (x !== null){ apagarPlanta(); SIM.bench[n] = x; } });
    i.addEventListener('change', () => { const x = leer(); if (x !== null) SIM.bench[n] = x; i.value = redondeo(SIM.bench[n]); });
    i.addEventListener('keydown', e => {
      if (e.key === 'Enter') i.blur();
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown'){ e.preventDefault(); pasoEntrada(n, e.key === 'ArrowUp' ? 1 : -1); i.value = redondeo(SIM.bench[n]); }
    });
    i.addEventListener('focus', () => i.select());
  });
  document.querySelectorAll('input[type=checkbox][data-simin]').forEach(c => c.addEventListener('change', () => { SIM.bench[c.dataset.simin] = c.checked; }));
  const selPlanta = $('simPlanta');
  if (selPlanta) selPlanta.addEventListener('change', () => {
    SIM.planta = selPlanta.value;
    const caja = $('simMotor'); if (caja) caja.style.display = SIM.planta === 'motor' ? '' : 'none';
    anotar(`planta: <b>${esc(selPlanta.options[selPlanta.selectedIndex].text.split(':')[0])}</b>`);
  });
  document.querySelectorAll('[data-simmotor]').forEach(c => c.addEventListener(c.type === 'number' ? 'input' : 'change', () => {
    if (!SIM.motor) return;
    SIM.motor[c.dataset.simmotor] = c.type === 'number' ? Math.max(0, num(c.value)) : c.value;
  }));
  const borrarNVS = $('simBorrarNVS');
  if (borrarNVS) borrarNVS.addEventListener('click', () => { escribirNVS({}); anotar(`<b>${t('memoria borrada')}</b>`); refrescarBanco(); });
  const enl = $('simEnlace'); if (enl) enl.addEventListener('change', () => { SIM.enlaceCaido = enl.checked; anotar(`<b>${t(enl.checked ? 'enlace caído' : 'enlace recuperado')}</b>`); });
}

const fmtVal = (n, x) => {
  if (typeof x === 'boolean') return x ? 'ON' : 'OFF';
  const r = rango(n);
  return Number.isInteger(num(x)) || (r && r[1] - r[0] >= 50 && Number.isInteger(Math.round(num(x) * 10) / 10)) ? String(Math.round(num(x) * 10) / 10) : num(x).toFixed(2);
};

function refrescarBanco(){
  /* el reloj se llama reloj y no t: t() es la que traduce */
  const S = SIM.S, reloj = $('simTiempo'); if (!reloj) return;
  reloj.textContent = mmss(SIM.tSim);
  const ahora = $('simMotorAhora');
  if (ahora && SIM.motor){
    const u = (varDe(SIM.motor.entrada) || {}).unidad || '';
    const a = SIM.motor.ahora || 0;
    ahora.textContent = a === 0 ? t('quieto') : `${a > 0 ? t('▲ sube') : t('▼ baja')} ${Math.abs(a).toFixed(1)} ${u}/s`;
  }
  for (const v of variables()){
    if (v.dir !== 'lectura') continue;
    mostrarEntrada(v.nombre);
  }
  if (SIM.M) for (const b of SIM.M.blocks){
    const s = document.querySelector(`[data-simestado="${CSS.escape(clave(b))}"]`);
    if (s && document.activeElement !== s && s.value !== SIM.st[clave(b)]) s.value = SIM.st[clave(b)];
    const a = document.querySelector(`[data-simestahora="${CSS.escape(clave(b))}"] b`);
    if (a && a.textContent !== (SIM.st[clave(b)] || '')) a.textContent = SIM.st[clave(b)] || '';
  }
  const sal = $('simSalidas');
  if (sal){
    const salidas = variables().filter(v => v.dir === 'escritura');
    sal.innerHTML = salidas.length ? salidas.map(v => {
      const x = S[v.nombre];
      const chip = v.booleano
        ? `<span class="sim-chip${x ? ' on' : ''}">${x ? 'ON' : 'OFF'}</span>`
        : `<span class="val">${esc(fmtVal(v.nombre, x))}${v.unidad ? ' ' + esc(v.unidad) : ''}</span>`;
      const aviso = v.remota ? `<span class="sim-remoto" title="${t('está en el otro nodo')}">${SIM.enlaceCaido ? t('⇄ no le llega') : '⇄'}</span>` : '';
      return `<div class="fila-sim"><span class="nom" title="${esc(v.nombre)}">${esc(v.nombre)}</span>${chip}${aviso}</div>`;
    }).join('') : `<div class="sim-nota">${t('No hay salidas en la pestaña Hardware.')}</div>`;
  }
  /* Los ajustes: la casilla sigue al valor (también si cambia con − + en la
     pantalla), salvo mientras escribes. Los timers: solo se leen. */
  for (const [n, v] of Object.entries(vLogica())){
    if (v.type === 'counter'){
      const c = $('simCta_' + n), txt = String(Math.round(num(S[n])));
      if (c && c.textContent !== txt) c.textContent = txt;
      continue;
    }
    if (v.type === 'flag'){
      const c = $('simFlag_' + n);
      if (c){ const on = !!S[n], txt = on ? t('sí') : 'no'; if (c.textContent !== txt) c.textContent = txt; c.classList.toggle('on', on); }
      continue;
    }
    if (v.type === 'setting'){
      const i = document.querySelector(`input[data-simaj="${CSS.escape(n)}"]`), txt = redondeoAj(n);
      if (i && document.activeElement !== i && i.value !== txt) i.value = txt;
      continue;
    }
    const s = $('simVar_' + n); if (s) s.textContent = `${mmss(S[n])} · ${num(S[n]).toFixed(1)} s`;
    const c = $('simCont_' + n); if (c) c.style.display = SIM.M && contando(n) ? '' : 'none';
  }
  const nvs = $('simNVS');
  if (nvs){
    const m = leerNVS(), filas = Object.entries(m);
    const html = filas.length
      ? filas.map(([k, x]) => `<div class="fila-sim"><span class="nom" title="${esc(k)}">${esc(k)}</span><span class="val">${esc(x)}</span></div>`).join('')
      : `<div class="sim-nota">${t('Vacía: todavía no se guardó nada.')}</div>`;
    if (nvs.__html !== html){ nvs.innerHTML = html; nvs.__html = html; }
  }
  const log = $('simLog');
  if (log){ const html = SIM.log.join(''); if (log.__html !== html){ log.innerHTML = html; log.__html = html; } }
}

/* ==================================================== abrir y cerrar */
function teclaSalir(e){ if (e.key === 'Escape') cerrar(); }

function abrir(){
  if (SIM.activo) return;
  const r = logicaValidada();
  SIM.errores = (r.errors || []).length;
  SIM.M = r.model || null;
  SIM.activo = true; SIM.mult = 1; SIM.enlaceCaido = false;
  /* Si hay algo que medir y un valor que lo mueva, arranca con el motor:
     así, al dar START, la tensión sube sola como en la máquina */
  const vs = variables();
  const ent = vs.find(v => v.dir === 'lectura' && !v.booleano);
  const sal = vs.find(v => v.dir === 'escritura' && !v.booleano);
  const dir = vs.find(v => v.dir === 'escritura' && v.booleano && /dir|sentido|direc/i.test(v.nombre));
  SIM.motor = ent && sal
    ? { entrada: ent.nombre, salida: sal.nombre, dir: dir ? dir.nombre : '', vel: Math.max(1, Math.round(((ent.max ?? 100) - (ent.min ?? 0)) / 5)), ahora: 0 }
    : null;
  SIM.planta = SIM.motor ? 'motor' : 'manual';
  SIM.iPant = Math.min(E.iPantalla || 0, E.pantallas.length - 1);
  SIM.bench = {};
  for (const v of variables()) if (v.dir === 'lectura') SIM.bench[v.nombre] = v.booleano ? false : (v.min ?? 0);
  iniciar();

  const cab = document.querySelector('header');
  document.body.insertAdjacentHTML('beforeend', `<div id="simCapa" style="top:${cab ? cab.offsetHeight : 0}px">
    <div class="sim-escena">
      <div class="sim-barra">
        <span class="titulo">${t('▶ SIMULACIÓN')}</span>
        <span class="sim-nota" style="margin:0">${t('Pantalla')}</span><select id="simPantSel"></select>
        <span class="sep"></span>
        <button class="btn" id="simReiniciar" title="${t('Vuelve a arrancar, como al encender la placa')}">⟲ ${t('Reiniciar')}</button>
        <button class="btn primario" id="simSalir" title="${t('Volver al editor (Esc)')}">✕ ${t('Salir')}</button>
      </div>
      <div class="sim-zona"><div class="sim-marco" id="simMarco"><div class="sim-pantalla" id="simPant"></div></div></div>
      <div class="sim-pie" id="simPie"></div>
    </div>
    <aside class="sim-banco" id="simBanco"></aside>
  </div>`);

  pintarSelectorPantallas();
  $('simPantSel').addEventListener('change', e => { SIM.iPant = +e.target.value; construirPantalla(); });
  $('simReiniciar').addEventListener('click', () => { iniciar(); construirBanco(); construirPantalla(); });
  $('simSalir').addEventListener('click', cerrar);
  construirBanco();
  construirPantalla();

  SIM.intervalos.push(setInterval(tick, PERIODO * 1000));
  SIM.intervalos.push(setInterval(refrescar, Math.max(50, E.refresco_ms || 100)));
  addEventListener('resize', encajar);
  document.addEventListener('keydown', teclaSalir);
}

function cerrar(){
  if (!SIM.activo) return;
  SIM.activo = false;
  SIM.intervalos.forEach(clearInterval); SIM.intervalos = [];
  pararRepeticion(); clearTimeout(SIM.repBanco); SIM.repBanco = null;
  const capa = $('simCapa'); if (capa) capa.remove();
  removeEventListener('resize', encajar);
  document.removeEventListener('keydown', teclaSalir);
}

const boton = $('btnSimular');
if (boton) boton.addEventListener('click', abrir);

/* para probarlo desde fuera sin tocar la interfaz */
window.SIMULADOR = { abrir, cerrar, estado: () => SIM, tick, refrescar };
})();
