/* =====================================================================
 * LOGICA — el lenguaje con el que se programa lo que hace el aparato
 *
 * Vive en su propia seccion del telar.yaml. Este fichero es la UNICA
 * definicion del lenguaje: lo usan el editor (colores, ayuda, frases,
 * sugerencias), el generador (el C) y la documentacion. Si una palabra
 * cambia aqui, cambia en los tres sitios a la vez; no hay manera de que
 * la documentacion diga una cosa y el editor acepte otra.
 *
 * La sintaxis va en ingles, como el resto del manifiesto. Las
 * explicaciones y los errores, en el idioma del alumno: setLang('en')
 * cambia mensajes, frases, diccionario y recetas; la sintaxis no cambia.
 * Sin llamarlo, todo sale en español, como siempre.
 *
 * El lector es propio y no js-yaml por tres razones: tiene que funcionar
 * sin internet en un aula, solo necesita el trozo de YAML que usa este
 * lenguaje, y conoce la LINEA de cada cosa, que es lo que permite decir
 * "linea 14" en vez de "error de sintaxis".
 * ================================================================== */
(function (raiz) {
'use strict';

const SECTIONS = ['variables', 'start_in', 'click', 'states', 'buttons', 'looks'];
const TYPES = {
  setting: ['type', 'unit', 'range', 'step', 'start'],
  timer:   ['type', 'from', 'counts'],
  flag:    ['type', 'start'],
  counter: ['type', 'start', 'max'],
};
/* Un contador va de 0 a su max; sin max, hasta TOPE_CONTADOR (un float
   cuenta enteros exactos hasta 16 millones, asi que sobra) */
const TOPE_CONTADOR = 999999;
const topeContador = v => typeof v.max === 'number' ? v.max : TOPE_CONTADOR;
const inicioContador = v => typeof v.start === 'number' ? v.start : 0;
/* start de una bandera: yes/no (o true/false). Sin start, no */
const banderaInicial = v => v.start === true || v.start === 'yes';
const KEYS = ['type', 'unit', 'range', 'step', 'start', 'max', 'from', 'counts', 'text', 'color', 'enabled', 'disabled'];
/* Lo que se puede apagar desde looks: lo que se toca */
const APAGABLES = ['button', 'toggle', 'checkbox', 'slider', 'dropdown', 'roller'];
/* enabled: yes/no (o true/false), o su contrario disabled: yes/no.
   undefined si la fila no dice ni lo uno ni lo otro. */
const si = v => v === true || v === 'yes';
const habilitadoDe = a => !a ? undefined
  : a.enabled !== undefined ? si(a.enabled)
  : a.disabled !== undefined ? !si(a.disabled)
  : undefined;
/* Una fila de looks puede nombrar VARIOS elementos: "btn_a, btn_b:".
   Todos comparten el mismo bloque, que es lo normal en una botonera. */
const nombresLook = k => String(k).split(',').map(x => x.trim()).filter(Boolean);
/* si la fila habla de esto, en una forma o en la otra */
const mencionaHabilitado = a => !!a && (a.enabled !== undefined || a.disabled !== undefined);
const VERBS = ['go to', 'increase', 'decrease', 'restart', 'count', 'turn on', 'turn off', 'toggle', 'pulse', 'blink', 'set', 'save', 'load'];
const VERB_ARG = { 'go to': 'state', increase: 'setting', decrease: 'setting', restart: 'timer',
                   count: 'timer', 'turn on': 'output', 'turn off': 'output', toggle: 'output',
                   pulse: 'output', blink: 'output', set: 'valor',
                   save: 'setting', load: 'setting' };
const VERB_ES = { 'go to': 'ir a', increase: 'subir', decrease: 'bajar', restart: 'reiniciar',
                  count: 'contar', 'turn on': 'encender', 'turn off': 'apagar', toggle: 'cambiar',
                  pulse: 'dar un pulso a', blink: 'hacer parpadear', set: 'poner',
                  save: 'guardar en la memoria', load: 'cargar de la memoria' };
const VERB_EN = { 'go to': 'go to', increase: 'raise', decrease: 'lower', restart: 'restart',
                  count: 'count', 'turn on': 'turn on', 'turn off': 'turn off', toggle: 'toggle',
                  pulse: 'pulse', blink: 'blink', set: 'set',
                  save: 'save to memory', load: 'load from memory' };
const RE_ACTION = /^(go to|increase|decrease|restart|count|turn on|turn off|toggle|save|load)\s+(\S+)$/;
/* EL TIEMPO, sin bloquear nada: un delay() congelaria la pantalla y el
   enlace. T es un numero de segundos o el nombre de un setting.
     pulse X [for T]                        encender X y apagarlo solo a los T s
     blink X on T1 off T2 [for T | times N] encendido T1, apagado T2, y otra vez
     after T: [...]   /   every T: [...]    en un estado: una vez / cada T s
     click: X [for T]                       un pulso en X con cada boton que hace algo
     on hold T: [...]                       en un boton: mantenerlo pulsado T s */
const T_ = '(\\d+(?:\\.\\d+)?|[A-Za-z_]\\w*)';
const RE_PULSE = new RegExp(`^pulse\\s+(\\w+)(?:\\s+for\\s+${T_})?$`);
const RE_BLINK = new RegExp(`^blink\\s+(\\w+)\\s+on\\s+${T_}\\s+off\\s+${T_}(?:\\s+(for|times)\\s+${T_})?$`);
const RE_AFTER = new RegExp(`^after\\s+${T_}$`);
const RE_EVERY = new RegExp(`^every\\s+${T_}$`);
const RE_ONHOLD = new RegExp(`^on hold\\s+${T_}$`);
const RE_CLICK = new RegExp(`^(\\w+)(?:\\s+for\\s+${T_})?$`);
/* lo que dura un pulso si no se dice, y lo que dura el de click */
const PULSO_DEF = 0.1, CLICK_DEF = 0.05;
/* save/load usan el nombre como clave de la NVS, que admite 15 caracteres */
const NVS_MAX = 15;
/* set <salida con valor o setting> to <numero o nombre>: va aparte porque lleva dos nombres */
const RE_SET = /^set\s+(\w+)\s+to\s+(-?\d+(?:\.\d+)?|\w+)$/;
/* la parte derecha puede llevar una suma o una resta: "setpoint - band" */
const RE_IF = /^if\s+(\w+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?|\w+)(?:\s*([+-])\s*(\d+(?:\.\d+)?|\w+))?$/;
/* UNA comparacion suelta, sin el "if" delante: la pieza con la que se
   construyen las condiciones de varias partes */
const RE_CMP = /^(not\s+)?(\w+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?|\w+)(?:\s*([+-])\s*(\d+(?:\.\d+)?|\w+))?$/;
/* set nombre to <cuenta>: lo de la derecha puede ser un numero, un nombre
   o una cuenta entera (set power to (base + extra) * 2) */
const RE_SET_CUENTA = /^set\s+(\w+)\s+to\s+(.+)$/;

/* ------------------------------------------------------------ las cuentas
   Una cuenta: numeros, nombres, + - * /, parentesis y el menos de delante.
   Como en la calculadora y en C: * y / antes que + y -, y entre iguales de
   izquierda a derecha. Dividir entre cero da 0, en la placa y en el
   simulador: asi un setting a cero no deja una salida en un valor sin
   sentido.
   expresion(txt) -> { arbol } o { error } (el error ya en el idioma elegido).
   El arbol: { n: 2.5 }  { v: 'nombre' }  { neg: x }  { par: x }  { op: '+', a, b } */
function expresion(txt){
  const s = String(txt).trim(), toks = [];
  const RE = /\s*(\d+(?:\.\d+)?|[A-Za-z_]\w*|[-+*\/()])/y;
  for (let p = 0; p < s.length;){
    RE.lastIndex = p;
    const m = RE.exec(s);
    if (!m){
      const raro = s.slice(p).trim().split(/\s+/)[0];
      return { error: tr(`<b>${esc(raro)}</b> no cabe en una cuenta: solo van números, nombres, <b>+ - * /</b> y paréntesis.`,
                         `<b>${esc(raro)}</b> does not fit in a calculation: only numbers, names, <b>+ - * /</b> and brackets go there.`) };
    }
    toks.push(m[1]); p = RE.lastIndex;
  }
  if (!toks.length) return { error: tr('falta el valor: un número, un nombre o una cuenta.', 'the value is missing: a number, a name or a calculation.') };
  let i = 0;
  const tras = () => i ? tr(` después de <b>${esc(toks[i - 1])}</b>`, ` after <b>${esc(toks[i - 1])}</b>`) : tr(' al principio', ' at the start');
  const suma = () => {
    let a = producto();
    while (toks[i] === '+' || toks[i] === '-'){ const op = toks[i++]; a = { op, a, b: producto() }; }
    return a;
  };
  const producto = () => {
    let a = signo();
    while (toks[i] === '*' || toks[i] === '/'){ const op = toks[i++]; a = { op, a, b: signo() }; }
    return a;
  };
  /* el menos de delante de un numero se queda en el numero: -5 es { n: -5 } */
  const signo = () => {
    if (toks[i] === '-'){ i++; const x = signo(); return x.n !== undefined ? { n: -x.n } : { neg: x }; }
    if (toks[i] === '+'){ i++; return signo(); }
    return atomo();
  };
  const atomo = () => {
    const t = toks[i];
    if (t === undefined) throw tr(`falta un número o un nombre${tras()}.`, `a number or a name is missing${tras()}.`);
    if (/^\d/.test(t)){ i++; return { n: +t }; }
    if (/^[A-Za-z_]/.test(t)){ i++; return { v: t }; }
    if (t === '('){
      i++;
      const x = suma();
      if (toks[i] !== ')') throw tr('falta cerrar un paréntesis: <b>)</b>.', 'a bracket is not closed: <b>)</b>.');
      i++;
      return { par: x };
    }
    throw tr(`sobra <b>${esc(t)}</b>${tras()}.`, `<b>${esc(t)}</b> is out of place${tras()}.`);
  };
  try {
    const arbol = suma();
    if (i < toks.length)
      throw toks[i] === ')' ? tr('sobra un paréntesis de cierre: <b>)</b>.', 'there is one closing bracket too many: <b>)</b>.')
        : tr(`entre <b>${esc(toks[i - 1])}</b> y <b>${esc(toks[i])}</b> falta una operación: <b>+ - * /</b>.`,
             `between <b>${esc(toks[i - 1])}</b> and <b>${esc(toks[i])}</b> an operation is missing: <b>+ - * /</b>.`);
    return { arbol };
  } catch (e){ return { error: String(e) }; }
}
/* Los nombres que usa una cuenta */
const nombresDe = x => !x ? [] : x.v !== undefined ? [x.v] : x.n !== undefined ? []
  : x.neg ? nombresDe(x.neg) : x.par ? nombresDe(x.par) : [...nombresDe(x.a), ...nombresDe(x.b)];
/* La cuenta escrita otra vez, en C o en una frase: f.num y f.nombre dicen
   como se escribe cada hoja; f.neg, f.div y f.ops, si hacen falta */
function pintaExpr(x, f){
  if (x.n !== undefined) return f.num(x.n);
  if (x.v !== undefined) return f.nombre(x.v);
  if (x.neg) return f.neg ? f.neg(pintaExpr(x.neg, f)) : '-' + pintaExpr(x.neg, f);
  if (x.par) return `(${pintaExpr(x.par, f)})`;
  const a = pintaExpr(x.a, f), b = pintaExpr(x.b, f);
  if (x.op === '/' && f.div) return f.div(a, b);
  return `${a} ${(f.ops && f.ops[x.op]) || x.op} ${b}`;
}
/* La cuenta hecha: val(nombre) da lo que vale cada nombre */
function calcula(x, val){
  if (x.n !== undefined) return x.n;
  if (x.v !== undefined) return val(x.v);
  if (x.neg) return -calcula(x.neg, val);
  if (x.par) return calcula(x.par, val);
  const a = calcula(x.a, val), b = calcula(x.b, val);
  switch (x.op){
  case '+': return a + b;
  case '-': return a - b;
  case '*': return a * b;
  default:  return b === 0 ? 0 : a / b;
  }
}
/* Una comparacion con cuentas: "a + b > c * 2". Solo se usa cuando la
   forma de siempre (RE_CMP) no encaja, asi que lo ya escrito no cambia. */
const RE_CMP_CUENTA = /^(not\s+)?(.+?)\s*(>=|<=|==|!=|>|<)\s*(.+)$/;
/* Por que una condicion no se entiende: el primer error de sus cuentas,
   o '' si no es eso */
function condError(k){
  const cuerpo = /^if\s+(.+)$/.exec(String(k).trim());
  if (!cuerpo) return '';
  const trozos = cuerpo[1].split(/\s+(and|or|&&|\|\|)\s+/);
  for (let i = 0; i < trozos.length; i += 2){
    const t = trozos[i].trim();
    if (RE_CMP.test(t)) continue;
    const g = RE_CMP_CUENTA.exec(t);
    if (!g) return tr(`a <b>${esc(t)}</b> le falta la comparación: <b>&gt; &lt; &gt;= &lt;= == !=</b>.`, `<b>${esc(t)}</b> is missing the comparison: <b>&gt; &lt; &gt;= &lt;= == !=</b>.`);
    for (const lado of [g[2], g[4]]){ const e = expresion(lado); if (e.error) return `<b>${esc(lado.trim())}</b>: ${e.error}`; }
  }
  return '';
}

/* Una condicion entera: una o varias comparaciones unidas por and / or
   (tambien valen && y ||, y cada una puede llevar "not" delante).
   Devuelve las comparaciones y los enlaces, o null si algo no encaja.
   Como en C, "and" ata mas fuerte que "or":
       if a > 1 and b > 2 or c > 3   es   (a>1 y b>2)  o  c>3 */
function condPartes(k){
  const cuerpo = /^if\s+(.+)$/.exec(String(k).trim());
  if (!cuerpo) return null;
  const trozos = cuerpo[1].split(/\s+(and|or|&&|\|\|)\s+/);
  const partes = [], enlaces = [];
  for (let i = 0; i < trozos.length; i += 2){
    const m = RE_CMP.exec(trozos[i].trim());
    let c;
    if (m){
      /* mismas posiciones que RE_IF (1 nombre, 2 comparacion, 3 valor,
         4 signo, 5 sumando) y, ademas, .no cuando lleva not */
      c = [m[0], m[2], m[3], m[4], m[5], m[6]]; c.no = !!m[1];
    }
    else if (/^(not\s+)?\w+\s+is\s+(not\s+)?\w+$/.test(trozos[i].trim())){
      /* "cycle is RUNNING": el estado de un bloque. 1 el bloque, 3 el
         estado, .es para distinguirlo; "is not" (o "not ... is") es .no */
      const g = /^(not\s+)?(\w+)\s+is\s+(not\s+)?(\w+)$/.exec(trozos[i].trim());
      c = [g[0], g[2], 'is', g[4], undefined, undefined]; c.no = !!g[1] !== !!g[3]; c.es = true;
    }
    else if (/^(not\s+)?\w+$/.test(trozos[i].trim())){
      /* un nombre solo, una bandera o una entrada de si/no: "if armed" es
         "if armed != 0". .solo dice que se escribio asi */
      const g = /^(not\s+)?(\w+)$/.exec(trozos[i].trim());
      c = [g[0], g[2], '!=', '0', undefined, undefined]; c.no = !!g[1]; c.solo = true;
    }
    else {
      /* con cuentas: 1 y 3 son el texto de cada lado, y .cuenta (y
         .cuentaIzq si la izquierda no es un nombre solo) sus arboles */
      const g = RE_CMP_CUENTA.exec(trozos[i].trim());
      if (!g) return null;
      const izq = expresion(g[2]), der = expresion(g[4]);
      if (izq.error || der.error) return null;
      c = [g[0], g[2].trim(), g[3], g[4].trim(), undefined, undefined]; c.no = !!g[1];
      if (izq.arbol.v === undefined) c.cuentaIzq = izq.arbol;
      c.cuenta = der.arbol;
    }
    partes.push(c);
    if (trozos[i + 1]) enlaces.push(/^(and|&&)$/.test(trozos[i + 1]) ? 'and' : 'or');
  }
  return { partes, enlaces };
}
const COLORS = { green: '#3ddc97', amber: '#f5a524', blue: '#3b9dff', red: '#f45b5b', gray: '#5b6475', white: '#e9eef7' };
const COLOR_ES_ = { green: 'verde', amber: 'ámbar', blue: 'azul', red: 'rojo', gray: 'gris', white: 'blanco' };
const COLOR_EN = { green: 'green', amber: 'amber', blue: 'blue', red: 'red', gray: 'gray', white: 'white' };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------ el idioma
   tr(español, inglés): el mensaje en el idioma elegido. El español va
   primero y es el de siempre: sin setLang, nada cambia. */
let LANG = 'es';
const tr = (es, en) => LANG === 'en' ? en : es;
function setLang(c){ LANG = c === 'en' ? 'en' : 'es'; }

/* =====================================================================
 * EL LECTOR
 *
 * Entiende: bloques por sangria, "clave: valor", llaves { } y corchetes
 * [ ] en una sola linea, textos entre comillas, numeros (tambien 0x..)
 * y comentarios con #. No entiende listas con guion ni llaves que
 * ocupen varias lineas: el lenguaje no las usa, y si aparecen lo dice.
 * ================================================================== */
function stripComment(l){
  let q = false;
  for (let i = 0; i < l.length; i++){
    const c = l[i];
    if (c === '"') q = !q;
    else if (c === '#' && !q && (i === 0 || /\s/.test(l[i - 1]))) return l.slice(0, i);
  }
  return l;
}
function balanced(s){
  let d = 0, q = false;
  for (const c of s){
    if (c === '"'){ q = !q; continue; }
    if (q) continue;
    if (c === '{' || c === '[') d++;
    else if (c === '}' || c === ']'){ d--; if (d < 0) return false; }
  }
  return d === 0 && !q;
}
function splitTop(s, sep){
  const out = []; let d = 0, q = false, cur = '';
  for (const c of s){
    if (c === '"'){ q = !q; cur += c; continue; }
    if (!q){
      if (c === '{' || c === '[') d++;
      else if (c === '}' || c === ']') d--;
      else if (c === sep && d === 0){ out.push(cur); cur = ''; continue; }
    }
    cur += c;
  }
  out.push(cur);
  return out;
}
/* El primer ":" fuera de llaves y comillas, seguido de espacio o final */
function splitKey(s){
  let d = 0, q = false;
  for (let i = 0; i < s.length; i++){
    const c = s[i];
    if (c === '"') q = !q;
    else if (!q){
      if (c === '{' || c === '[') d++;
      else if (c === '}' || c === ']') d--;
      else if (c === ':' && d === 0 && (i === s.length - 1 || s[i + 1] === ' '))
        return { key: s.slice(0, i).trim(), rest: s.slice(i + 1).trim() };
    }
  }
  return null;
}
function parseValue(s, cx){
  const err = msg => cx.errs.push({ line: cx.line, msg });
  s = s.trim();
  if (s === '') return null;
  if (s[0] === '{'){
    if (s[s.length - 1] !== '}' || !balanced(s)){
      err(tr('Estas llaves no se cierran en la misma línea. Una llave abre y cierra en la misma línea: <b>{ type: setting, step: 5 }</b>.',
             'These braces do not close on the same line. A brace opens and closes on the same line: <b>{ type: setting, step: 5 }</b>.'));
      return {};
    }
    const obj = {}, inner = s.slice(1, -1).trim();
    if (!inner) return obj;
    for (const part of splitTop(inner, ',')){
      const p = part.trim();
      if (!p){ err(tr('Sobra una coma dentro de las llaves.', 'There is an extra comma inside the braces.')); continue; }
      const kv = splitKey(p);
      if (!kv || !kv.key){
        err(tr(`Dentro de las llaves cada cosa va como <b>nombre: valor</b>, y <b>${esc(p)}</b> no lo tiene. ¿Falta un espacio después de los dos puntos?`,
               `Inside the braces each item is written as <b>name: value</b>, and <b>${esc(p)}</b> is not. Is a space missing after the colon?`));
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(obj, kv.key)){ err(tr(`<b>${esc(kv.key)}</b> aparece dos veces en las mismas llaves.`, `<b>${esc(kv.key)}</b> appears twice inside the same braces.`)); continue; }
      cx.lines[cx.path + '.' + kv.key] = cx.line;
      obj[kv.key] = parseValue(kv.rest, { ...cx, path: cx.path + '.' + kv.key });
    }
    return obj;
  }
  if (s[0] === '['){
    if (s[s.length - 1] !== ']' || !balanced(s)){
      err(tr('Estos corchetes no se cierran en la misma línea: <b>[turn on relay, go to READY]</b>.',
             'These brackets do not close on the same line: <b>[turn on relay, go to READY]</b>.'));
      return [];
    }
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    const out = [];
    for (const part of splitTop(inner, ',')){
      const t = part.trim();
      if (!t){ err(tr('Sobra una coma dentro de los corchetes.', 'There is an extra comma inside the brackets.')); continue; }
      out.push(parseValue(t, cx));
    }
    return out;
  }
  if (s[0] === '"'){
    if (s.length < 2 || s[s.length - 1] !== '"'){ err(tr('A este texto le faltan las comillas de cierre.', 'This text is missing its closing quote.')); return s.slice(1); }
    return s.slice(1, -1);
  }
  if (/[{}\[\]]/.test(s)) err(tr(`Aquí sobra un símbolo: <b>${esc(s)}</b>.`, `There is a stray symbol here: <b>${esc(s)}</b>.`));
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
  if (/^-?\d+,\d+$/.test(s)){ err(tr(`Los decimales llevan punto, no coma: <b>${s.replace(',', '.')}</b>.`, `Decimals use a point, not a comma: <b>${s.replace(',', '.')}</b>.`)); return Number(s.replace(',', '.')); }
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

function parse(txt){
  const errs = [], lines = {}, root = {};
  const stack = [{ indent: -1, path: '', container: root, inline: false }];
  /* Una linea que acaba en coma (y no deja corchetes ni llaves abiertos)
     sigue en la de abajo. Asi una lista larga de nombres se puede partir:
        btn_cl_0, btn_cl_1,
        btn_cl_2:
     El numero de linea que se guarda es el de la primera, que es donde
     empieza lo que el alumno escribio. */
  const crudas = String(txt).replace(/\r/g, '').split('\n');
  const juntas = [];
  for (let i = 0; i < crudas.length; i++){
    let raw = crudas[i], n = i + 1, cuerpo = stripComment(raw).trimEnd();
    /* la coma al final es la que dice "sigo abajo"; si ademas quedaron
       corchetes o llaves abiertos, se sigue juntando hasta cerrarlos */
    let sigue = /,$/.test(cuerpo.trim()), juntadas = 0;
    while (sigue && juntadas < 20){
      let j = i + 1;
      while (j < crudas.length && !stripComment(crudas[j]).trim()) j++;
      if (j >= crudas.length) break;
      cuerpo = cuerpo + ' ' + stripComment(crudas[j]).trim();
      raw = cuerpo; i = j; juntadas++;
      sigue = /,$/.test(cuerpo.trim()) || !balanced(cuerpo.trim());
    }
    juntas.push({ raw, n });
  }
  juntas.forEach(({ raw, n }) => {
    if (/^[ ]*\t/.test(raw)){ errs.push({ line: n, msg: tr('Esta línea empieza con un tabulador. Usa espacios: dos por cada nivel.', 'This line starts with a tab. Use spaces: two per level.') }); return; }
    const body = stripComment(raw);
    if (!body.trim()) return;
    const indent = body.match(/^ */)[0].length, content = body.trim();
    const junk = () => stack.push({ indent, path: '\u0000', container: {}, owner: {}, key: '_', inline: false });

    if (content === '-' || content.startsWith('- ')){
      errs.push({ line: n, msg: tr('Las listas con guion no se usan aquí. Las acciones van entre corchetes, en la misma línea: <b>[turn on relay, go to READY]</b>.',
                                   'Dash lists are not used here. Actions go in brackets, on the same line: <b>[turn on relay, go to READY]</b>.') });
      return;
    }
    const kv = splitKey(content);
    if (!kv || !kv.key){
      errs.push({ line: n, msg: /:\S/.test(content)
        ? tr('Después de los dos puntos va un espacio: <b>start: 15</b>, no <b>start:15</b>.', 'A space goes after the colon: <b>start: 15</b>, not <b>start:15</b>.')
        : tr('A esta línea le faltan los dos puntos. Se escribe <b>nombre: valor</b>, o <b>nombre:</b> con lo de dentro en las líneas de debajo.',
             'This line is missing the colon. Write <b>name: value</b>, or <b>name:</b> with its contents on the lines below.') });
      return;
    }
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent.inline){
      errs.push({ line: parent.line, msg: tr('La línea de debajo tiene más espacios delante que esta, como si fuera parte de ella, pero esta ya tiene su valor en la misma línea. Revisa la sangría de esta línea o de la de debajo: casi siempre a una de las dos le sobran o le faltan dos espacios.',
                                             'The line below has more spaces in front than this one, as if it belonged to it, but this line already has its value on the same line. Check the indentation of this line or the one below: almost always one of them has two spaces too many or too few.') });
      junk(); return;
    }
    if (parent.childIndent === undefined){
      if (parent.indent === -1 && indent !== 0){ errs.push({ line: n, msg: tr('Las secciones van pegadas al margen izquierdo, sin espacios delante.', 'Sections go against the left margin, with no spaces in front.') }); junk(); return; }
      parent.childIndent = indent;
    } else if (parent.childIndent !== indent){
      errs.push({ line: n, msg: tr(`La sangría no cuadra: las líneas de este bloque empiezan con ${parent.childIndent} espacios y esta con ${indent}.`,
                                   `The indentation does not match: the lines in this group start with ${parent.childIndent} spaces and this one with ${indent}.`) });
      junk(); return;
    }
    if (parent.container === null){ parent.container = {}; parent.owner[parent.key] = parent.container; }
    const path = parent.path ? parent.path + '.' + kv.key : kv.key;
    if (Object.prototype.hasOwnProperty.call(parent.container, kv.key)){
      const esSeccion = parent.path === '' && SECTIONS.includes(kv.key);
      errs.push({ line: n, msg: esSeccion
        ? tr(`<b>${esc(kv.key)}</b> ya está más arriba (línea ${lines[path]}). Para añadir otra función con sus propios estados no se repiten las secciones: cada función va en su <b>bloque</b> con nombre —por ejemplo <b>motor:</b> y <b>timer:</b>— con sus secciones dos espacios más adentro.`,
             `<b>${esc(kv.key)}</b> is already further up (line ${lines[path]}). To add another function with its own states, sections are not repeated: each function goes in its own named <b>block</b> — for example <b>motor:</b> and <b>timer:</b> — with its sections two spaces further in.`)
        : tr(`<b>${esc(kv.key)}</b> ya está más arriba en este mismo nivel (línea ${lines[path]}). Cada nombre solo puede aparecer una vez.`,
             `<b>${esc(kv.key)}</b> is already further up at this same level (line ${lines[path]}). Each name can only appear once.`) });
      junk(); return;
    }
    if (parent.path !== '\u0000') lines[path] = n;
    if (kv.rest === ''){
      parent.container[kv.key] = null;
      stack.push({ indent, path, container: null, owner: parent.container, key: kv.key, inline: false });
    } else {
      parent.container[kv.key] = parseValue(kv.rest, { line: n, path, errs, lines });
      stack.push({ indent, path, inline: true, line: n });
    }
  });
  return { data: root, lines, errors: errs };
}

/* =====================================================================
 * PARECIDOS — "¿Querías decir…?"
 * ================================================================== */
function distance(a, b){
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function suggest(x, list){
  let best = null, dm = 3;
  for (const c of list){
    const dd = distance(String(x).toLowerCase(), String(c).toLowerCase());
    if (dd < dm){ dm = dd; best = c; }
  }
  return best ? tr(` ¿Querías decir <b>${esc(best)}</b>?`, ` Did you mean <b>${esc(best)}</b>?`) : '';
}

/* =====================================================================
 * VALIDAR
 *
 * ctx describe lo que existe FUERA de la lógica, porque no se redeclara:
 *   hardware: { nombre: { lee: bool, escribe: bool, booleano: bool, donde } }
 *   widgets:  { nombre: { tipo } }
 * Una salida nace en la pestaña Hardware y un botón en el lienzo; aquí
 * solo se usan por su nombre.
 * ================================================================== */
function validate(txt, ctx){
  ctx = ctx || { hardware: {}, widgets: {} };
  const HW = ctx.hardware || {}, WG = ctx.widgets || {};
  if (!String(txt).trim()) return { model: null, errors: [], lines: {} };

  const unicos = list => { const vistos = new Set(); return list.filter(e => { const k = e.line + '|' + e.msg; if (vistos.has(k)) return false; vistos.add(k); return true; }); };
  const p = parse(txt);
  if (p.errors.length) return { model: null, errors: unicos(p.errors).slice(0, 5), lines: p.lines };
  const d = p.data, lines = p.lines, errs = [];
  /* Solo comentarios o líneas en blanco: no hay lógica, y eso no es un error */
  if (!Object.keys(d).length) return { model: null, errors: [], lines };
  const lineOf = path => { const s = path.split('.'); while (s.length){ const k = s.join('.'); if (lines[k]) return lines[k]; s.pop(); } return null; };
  const err = (path, msg) => errs.push({ line: lineOf(path), msg });
  const fin = model => { const out = unicos(errs).sort((a, b) => (a.line ?? 0) - (b.line ?? 0)); return { model: out.length ? null : model, errors: out, lines }; };
  const esObjeto = x => !!x && typeof x === 'object' && !Array.isArray(x);

  /* ------------------------------------------- suelto o por bloques
     Suelto: las secciones van en el primer nivel (un solo bloque).
     Por bloques: cada clave de primer nivel es una función con nombre y
     sus secciones van dentro. Las dos formas no se mezclan. */
  const top = Object.keys(d);
  const esBloque = k => !SECTIONS.includes(k) && /^[a-z_][a-z0-9_]*$/.test(k)
    && (d[k] === null ? !suggest(k, SECTIONS) : esObjeto(d[k]) && Object.keys(d[k]).some(x => SECTIONS.includes(x)));
  const sueltas = top.filter(k => SECTIONS.includes(k)), nombres = top.filter(esBloque);
  for (const k of top){
    if (SECTIONS.includes(k) || esBloque(k)) continue;
    if (k === 'on enter' || k === 'while' || k === 'else' || /^if\b/.test(k) || /^in\b/.test(k) || k === 'always' || /^after\b/.test(k) || /^every\b/.test(k) || k === 'on release' || k === 'hold')
      err(k, tr(`<b>${esc(k)}</b> está pegado al margen izquierdo. Va dentro de un estado o de un botón, con espacios delante.`,
                `<b>${esc(k)}</b> is against the left margin. It goes inside a state or a button, with spaces in front.`));
    else if (/^[A-Z][A-Z0-9_]*$/.test(k))
      err(k, tr(`<b>${esc(k)}</b> parece un estado, pero está pegado al margen. Los estados van dentro de <b>states:</b>, con dos espacios delante.`,
                `<b>${esc(k)}</b> looks like a state, but it is against the margin. States go inside <b>states:</b>, with two spaces in front.`));
    else if (esObjeto(d[k]))
      err(k, tr(`<b>${esc(k)}</b> parece un bloque, pero dentro no tiene ninguna sección. Un bloque lleva ${SECTIONS.join(', ')}, dos espacios más adentro.${/^[a-z_][a-z0-9_]*$/.test(k) ? '' : ' Y el nombre de un bloque va en minúsculas, sin espacios.'}`,
                `<b>${esc(k)}</b> looks like a block, but it has no section inside. A block holds ${SECTIONS.join(', ')}, two spaces further in.${/^[a-z_][a-z0-9_]*$/.test(k) ? '' : ' And a block name is lowercase, with no spaces.'}`));
    else err(k, tr(`<b>${esc(k)}</b> no es una sección ni un bloque.${suggest(k, SECTIONS)} Las secciones son: ${SECTIONS.join(', ')}.`,
                   `<b>${esc(k)}</b> is not a section or a block.${suggest(k, SECTIONS)} The sections are: ${SECTIONS.join(', ')}.`));
  }
  if (sueltas.length && nombres.length){
    err(nombres[0], tr(`Aquí se mezclan secciones sueltas (<b>${sueltas.join(', ')}</b>) con bloques (<b>${nombres.join(', ')}</b>). O todo va suelto —un solo bloque— o cada función va en su bloque con nombre, con sus secciones dos espacios más adentro.`,
                       `Loose sections (<b>${sueltas.join(', ')}</b>) are mixed here with blocks (<b>${nombres.join(', ')}</b>). Either everything is loose — a single block — or each function goes in its own named block, with its sections two spaces further in.`));
    return fin(null);
  }
  const blocks = nombres.length
    ? nombres.map(nm => ({ name: nm, path: nm + '.', data: esObjeto(d[nm]) ? d[nm] : {} }))
    : [{ name: null, path: '', data: d }];
  const deBloque = B => B.name ? tr(` del bloque <b>${esc(B.name)}</b>`, ` of block <b>${esc(B.name)}</b>`) : '';
  const estadosDe = new Map(blocks.map(B => [B, esObjeto(B.data.states) ? Object.keys(B.data.states) : []]));

  /* ---------------------------------------------------------- variables
     Son de todo el aparato: se declaran una vez y cualquier bloque las usa. */
  const V = {}, dueñoVar = {}, rutaVar = {};
  for (const B of blocks){
    const vars = B.data.variables;
    if (vars !== undefined && vars !== null && !esObjeto(vars))
      err(B.path + 'variables', tr('Dentro de <b>variables</b> va una variable por línea: <b>duration: { type: setting, … }</b>.',
                                   'Inside <b>variables</b> goes one variable per line: <b>duration: { type: setting, … }</b>.'));
    for (const [n, v] of Object.entries(esObjeto(vars) ? vars : {})){
      const path = B.path + 'variables.' + n;
      if (!/^[a-z_][a-z0-9_]*$/.test(n)) err(path, tr(`Los nombres de variable van en minúsculas, con números o _ y sin espacios: <b>${esc(n.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}</b>.`,
                                                      `Variable names are lowercase, with numbers or _ and no spaces: <b>${esc(n.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}</b>.`));
      if (HW[n]){ err(path, tr(`<b>${esc(n)}</b> ya existe: es una pieza de la pestaña Hardware. Elige otro nombre para esta variable.`,
                               `<b>${esc(n)}</b> already exists: it is a part in the Hardware tab. Choose another name for this variable.`)); continue; }
      if (V[n]){ err(path, tr(`<b>${esc(n)}</b> ya está declarada${dueñoVar[n] ? ` en el bloque <b>${esc(dueñoVar[n])}</b>` : ''}. Una variable es de todo el aparato: con declararla una vez, cualquier bloque la puede usar.`,
                              `<b>${esc(n)}</b> is already declared${dueñoVar[n] ? ` in block <b>${esc(dueñoVar[n])}</b>` : ''}. A variable belongs to the whole device: declare it once and any block can use it.`)); continue; }
      if (!esObjeto(v)){
        err(path, tr(`Detrás de <b>${esc(n)}:</b> van llaves con su tipo, por ejemplo <b>{ type: setting, range: [0, 100], step: 1, start: 0 }</b>.`,
                     `After <b>${esc(n)}:</b> come braces with its type, for example <b>{ type: setting, range: [0, 100], step: 1, start: 0 }</b>.`));
        continue;
      }
      if (v.type === 'output' || v.type === 'input'){
        const hay = v.type === 'output' ? Object.keys(HW).filter(x => HW[x].escribe && HW[x].booleano) : Object.keys(HW).filter(x => HW[x].lee);
        err(path, tr(`Las ${v.type === 'output' ? 'salidas' : 'entradas'} no se declaran aquí: nacen en la pestaña <b>Hardware</b> y aquí se usan por su nombre.${hay.length ? ' Las que hay: <b>' + hay.join(', ') + '</b>.' : ' Todavía no hay ninguna.'}`,
                     `${v.type === 'output' ? 'Outputs' : 'Inputs'} are not declared here: they are created in the <b>Hardware</b> tab and used here by name.${hay.length ? ' Existing ones: <b>' + hay.join(', ') + '</b>.' : ' There are none yet.'}`));
        continue;
      }
      if (!(v.type in TYPES)){
        err(path, v.type === undefined ? tr(`A <b>${esc(n)}</b> le falta <b>type</b>: setting, timer, flag o counter.`, `<b>${esc(n)}</b> is missing <b>type</b>: setting, timer, flag or counter.`)
          : tr(`<b>${esc(v.type)}</b> no es un tipo.${suggest(v.type, Object.keys(TYPES))} Los tipos son: setting, timer, flag y counter.`,
               `<b>${esc(v.type)}</b> is not a type.${suggest(v.type, Object.keys(TYPES))} The types are: setting, timer, flag and counter.`));
        continue;
      }
      for (const k of Object.keys(v)) if (!TYPES[v.type].includes(k))
        err(path + '.' + k, tr(`Un ${v.type} no lleva <b>${esc(k)}</b>.${suggest(k, TYPES[v.type])} Lleva: ${TYPES[v.type].join(', ')}.`,
                               `A ${v.type} does not take <b>${esc(k)}</b>.${suggest(k, TYPES[v.type])} It takes: ${TYPES[v.type].join(', ')}.`));
      V[n] = v; dueñoVar[n] = B.name; rutaVar[n] = path;
    }
  }
  for (const [n, v] of Object.entries(V)){
    const path = rutaVar[n];
    if (v.type === 'setting'){
      if (!Array.isArray(v.range) || v.range.length !== 2 || typeof v.range[0] !== 'number' || !(v.range[0] < v.range[1]))
        err(path, tr(`En <b>${n}</b>, range es <b>[mínimo, máximo]</b>, dos números con el mínimo primero.`,
                     `In <b>${n}</b>, range is <b>[minimum, maximum]</b>, two numbers with the minimum first.`));
      if (!(typeof v.step === 'number' && v.step > 0)) err(path, tr(`En <b>${n}</b>, step tiene que ser un número mayor que cero.`, `In <b>${n}</b>, step must be a number greater than zero.`));
      if (v.start === undefined) err(path, tr(`A <b>${n}</b> le falta <b>start</b>: el valor con el que arranca.`, `<b>${n}</b> is missing <b>start</b>: the value it starts with.`));
      else if (Array.isArray(v.range) && (v.start < v.range[0] || v.start > v.range[1])) err(path, tr(`En <b>${n}</b>, start (${esc(v.start)}) se sale de range.`, `In <b>${n}</b>, start (${esc(v.start)}) is outside range.`));
    }
    if (v.type === 'counter'){
      const entero = x => typeof x === 'number' && Number.isInteger(x) && x >= 0;
      if (v.start !== undefined && !entero(v.start))
        err(path, tr(`Un contador empieza en un número entero, 0 o más: <b>${esc(n)}: { type: counter, start: 0 }</b>. <b>${esc(v.start)}</b> no vale.`,
                     `A counter starts at a whole number, 0 or more: <b>${esc(n)}: { type: counter, start: 0 }</b>. <b>${esc(v.start)}</b> is not valid.`));
      if (v.max !== undefined && !(entero(v.max) && v.max > 0))
        err(path, tr(`El <b>max</b> de un contador es un número entero mayor que 0: hasta dónde cuenta. <b>${esc(v.max)}</b> no vale.`,
                     `A counter's <b>max</b> is a whole number greater than 0: how far it counts. <b>${esc(v.max)}</b> is not valid.`));
      else if (v.max !== undefined && entero(v.start) && v.start > v.max)
        err(path, tr(`En <b>${esc(n)}</b>, start (${esc(v.start)}) es mayor que max (${esc(v.max)}).`, `In <b>${esc(n)}</b>, start (${esc(v.start)}) is greater than max (${esc(v.max)}).`));
    }
    if (v.type === 'flag' && v.start !== undefined && !['yes', 'no', true, false].includes(v.start))
      err(path, tr(`Una bandera empieza en <b>yes</b> o en <b>no</b>, no en <b>${esc(v.start)}</b>: <b>${esc(n)}: { type: flag, start: no }</b>.`,
                   `A flag starts at <b>yes</b> or <b>no</b>, not at <b>${esc(v.start)}</b>: <b>${esc(n)}: { type: flag, start: no }</b>.`));
    if (v.type === 'timer'){
      if (v.counts !== undefined && !['down', 'up'].includes(v.counts)) err(path, tr('<b>counts</b> es <b>down</b> o <b>up</b>.', '<b>counts</b> is <b>down</b> or <b>up</b>.'));
      if (v.counts !== 'up'){
        if (v.from === undefined) err(path, tr(`El timer <b>${n}</b> cuenta hacia atrás y necesita <b>from</b>: el setting del que toma su valor.`,
                                               `Timer <b>${n}</b> counts down and needs <b>from</b>: the setting it takes its value from.`));
        else if (!V[v.from] || V[v.from].type !== 'setting')
          err(path, tr(`El timer <b>${n}</b> toma su valor de <b>${esc(v.from)}</b>, que ${V[v.from] ? 'no es un setting' : 'no está declarado'}.${suggest(v.from, Object.keys(V).filter(x => V[x].type === 'setting'))}`,
                       `Timer <b>${n}</b> takes its value from <b>${esc(v.from)}</b>, which ${V[v.from] ? 'is not a setting' : 'is not declared'}.${suggest(v.from, Object.keys(V).filter(x => V[x].type === 'setting'))}`));
      }
    }
  }

  /* ------------------------------------------------ estados y acciones */
  const outputs = Object.keys(HW).filter(n => HW[n].escribe && HW[n].booleano);
  const legibles = () => [...Object.keys(V), ...Object.keys(HW).filter(n => HW[n].lee)];
  /* Lo que tiene un numero para hacer cuentas: las variables, las entradas
     y las salidas con valor (lo que tienen puesto ahora) */
  const numericos = () => [...Object.keys(V), ...Object.keys(HW).filter(n => HW[n].lee || !HW[n].booleano)];
  const conNumero = (n, path) => {
    if (V[n] || (HW[n] && (HW[n].lee || !HW[n].booleano))) return;
    if (HW[n]) err(path, tr(`<b>${esc(n)}</b> es una salida de sí/no: está encendida o apagada, no tiene un número para hacer cuentas.`,
                            `<b>${esc(n)}</b> is an on/off output: it is on or off, it has no number to calculate with.`));
    else err(path, tr(`<b>${esc(n)}</b> no es un número ni un nombre conocido.${suggest(n, numericos())}`, `<b>${esc(n)}</b> is not a number or a known name.${suggest(n, numericos())}`));
  };
  const esEstado = (B, st, path) => {
    const sts = estadosDe.get(B);
    if (sts.includes(String(st))) return;
    const otro = blocks.find(X => X !== B && estadosDe.get(X).includes(String(st)));
    err(path, otro
      ? tr(`<b>${esc(st)}</b> es un estado del bloque <b>${esc(otro.name)}</b>, no${deBloque(B)}. Cada bloque solo cambia sus propios estados; lo que sí se puede es preguntar por él: <b>if ${esc(otro.name)} is ${esc(st)}: […]</b>.`,
           `<b>${esc(st)}</b> is a state of block <b>${esc(otro.name)}</b>, not${deBloque(B)}. Each block only changes its own states; what it can do is ask about it: <b>if ${esc(otro.name)} is ${esc(st)}: […]</b>.`)
      : tr(`<b>${esc(st)}</b> no es un estado${deBloque(B)}.${suggest(st, sts)} Los estados${deBloque(B)} son: ${sts.join(', ') || '(ninguno todavía)'}.`,
           `<b>${esc(st)}</b> is not a state${deBloque(B)}.${suggest(st, sts)} The states${deBloque(B)} are: ${sts.join(', ') || '(none yet)'}.`));
  };
  /* Una palabra del lenguaje escrita en el sitio equivocado: en vez de
     "no vale", se dice donde va. Devuelve true si era eso. */
  const FILA_ESTADO = k => ['on enter', 'while', 'else'].includes(k) || /^(if|after|every)\b/.test(k);
  const FILA_BOTON = k => ['always', 'on release', 'hold', 'repeat'].includes(k) || /^(in|on hold)\s/.test(k);
  const fueraDeSitio = (k, v, pk, dentro) => {
    const enBoton = dentro === 'boton';
    if (k === 'click'){
      const x = esc(String(v).trim().split(/\s+/)[0] || 'bip');
      err(pk, enBoton
        ? tr(`<b>click</b> no va dentro de un botón: va <b>una sola vez, arriba del todo</b>, debajo de <b>start_in</b> (por ejemplo <b>start_in: IDLE</b> y en la línea siguiente <b>click: ${x}</b>), y suena con <b>todos</b> los botones que hacen algo. Si quieres que suene solo este botón, añade el pitido a su acción: <b>always: [… , pulse ${x} for 0.05]</b>.`,
             `<b>click</b> does not go inside a button: it goes <b>once, at the very top</b>, below <b>start_in</b> (for example <b>start_in: IDLE</b> and on the next line <b>click: ${x}</b>), and it sounds with <b>every</b> button that does something. If you want only this button to beep, add the beep to its action: <b>always: [… , pulse ${x} for 0.05]</b>.`)
        : tr(`<b>click</b> no va dentro de un estado: va <b>una sola vez, arriba del todo</b>, debajo de <b>start_in</b>, y suena con los botones. Para pitar al entrar en este estado: <b>on enter: [pulse ${x} for 0.05]</b>.`,
             `<b>click</b> does not go inside a state: it goes <b>once, at the very top</b>, below <b>start_in</b>, and it sounds with the buttons. To beep on entering this state: <b>on enter: [pulse ${x} for 0.05]</b>.`));
      return true;
    }
    if (SECTIONS.includes(k)){
      err(pk, tr(`<b>${esc(k)}</b> es una sección: va pegada al margen izquierdo (o al de su bloque), no dentro de ${enBoton ? 'un botón' : 'un estado'}.`,
                 `<b>${esc(k)}</b> is a section: it goes against the left margin (or its block's), not inside a ${enBoton ? 'button' : 'state'}.`));
      return true;
    }
    if (enBoton && FILA_ESTADO(k)){
      err(pk, tr(`<b>${esc(k.split(/\s+/).slice(0, k.startsWith('on ') ? 2 : 1).join(' '))}</b> va dentro de un <b>estado</b> (en <b>states</b>), no de un botón. En un botón las filas son <b>in ESTADO</b>, <b>always</b>, <b>on release</b>, <b>on hold</b>, <b>hold</b> y <b>repeat</b>.`,
                 `<b>${esc(k.split(/\s+/).slice(0, k.startsWith('on ') ? 2 : 1).join(' '))}</b> goes inside a <b>state</b> (under <b>states</b>), not a button. In a button the rows are <b>in STATE</b>, <b>always</b>, <b>on release</b>, <b>on hold</b>, <b>hold</b> and <b>repeat</b>.`));
      return true;
    }
    if (!enBoton && FILA_BOTON(k)){
      err(pk, tr(`<b>${esc(k.split(/\s+/).slice(0, k.startsWith('on ') ? 2 : 1).join(' '))}</b> va dentro de un <b>botón</b> (en <b>buttons</b>), no de un estado. En un estado las filas son <b>on enter</b>, <b>while</b>, <b>if</b>, <b>else</b>, <b>after</b> y <b>every</b>.`,
                 `<b>${esc(k.split(/\s+/).slice(0, k.startsWith('on ') ? 2 : 1).join(' '))}</b> goes inside a <b>button</b> (under <b>buttons</b>), not a state. In a state the rows are <b>on enter</b>, <b>while</b>, <b>if</b>, <b>else</b>, <b>after</b> and <b>every</b>.`));
      return true;
    }
    return false;
  };
  /* Lo que se puede encender y apagar: una salida de si/no de Hardware */
  const salidaSiNo = (x, path) => {
    const outs = [...Object.keys(HW).filter(n => HW[n].escribe && HW[n].booleano), ...Object.keys(V).filter(n => V[n].type === 'flag')];
    if (V[x] && V[x].type === 'flag') return;   /* una bandera se enciende y se apaga igual */
    if (!HW[x]) err(path, tr(`<b>${esc(x)}</b> no es ninguna pieza de la pestaña Hardware.${suggest(x, outs)}${outs.length ? ' Salidas que se encienden y apagan: <b>' + outs.join(', ') + '</b>.' : ' Añade una salida digital en Hardware.'}`,
                             `<b>${esc(x)}</b> is not a part in the Hardware tab.${suggest(x, outs)}${outs.length ? ' Outputs that turn on and off: <b>' + outs.join(', ') + '</b>.' : ' Add a digital output in Hardware.'}`));
    else if (!HW[x].escribe) err(path, tr(`<b>${esc(x)}</b> es una entrada: se lee, no se enciende.`, `<b>${esc(x)}</b> is an input: it is read, not turned on.`));
    else if (!HW[x].booleano) err(path, tr(`<b>${esc(x)}</b> es una salida con valor, no de encender y apagar.`, `<b>${esc(x)}</b> is an output with a value, not an on/off one.`));
  };
  /* Un tiempo: un numero de segundos (de 0,05 en 0,05: es lo que dura una
     vuelta del control) o un setting, que se lee en segundos */
  const duracion = (t, path) => {
    if (!isNaN(+t)){
      if (+t < 0.05) err(path, tr(`<b>${esc(t)}</b> segundos es menos de lo que dura una vuelta del control (0,05 s): lo mínimo es <b>0.05</b>.`,
                                  `<b>${esc(t)}</b> seconds is less than one turn of the control loop (0.05 s): the minimum is <b>0.05</b>.`));
    }
    else if (!V[t] || V[t].type !== 'setting')
      err(path, tr(`<b>${esc(t)}</b> no es un número de segundos ni un setting.${suggest(t, Object.keys(V).filter(x => V[x].type === 'setting'))}`,
                   `<b>${esc(t)}</b> is not a number of seconds or a setting.${suggest(t, Object.keys(V).filter(x => V[x].type === 'setting'))}`));
  };
  const veces = (n, path) => {
    if (!isNaN(+n)){
      if (+n < 1 || Math.round(+n) !== +n) err(path, tr(`<b>times</b> lleva un número entero de veces, 1 o más; <b>${esc(n)}</b> no.`, `<b>times</b> takes a whole number of times, 1 or more; <b>${esc(n)}</b> is not.`));
    }
    else if (!V[n] || V[n].type !== 'setting') err(path, tr(`<b>${esc(n)}</b> no es un número ni un setting.`, `<b>${esc(n)}</b> is not a number or a setting.`));
  };

  const acciones = (B, list, path, where) => {
    if (!Array.isArray(list)){ err(path, tr('Las acciones van entre corchetes: <b>[go to READY]</b> o <b>[turn off relay, go to READY]</b>.', 'Actions go in brackets: <b>[go to READY]</b> or <b>[turn off relay, go to READY]</b>.')); return; }
    if (!list.length) err(path, tr('Los corchetes están vacíos: no se hace nada.', 'The brackets are empty: nothing is done.'));
    /* Un estado a la vez: con dos go to se ejecutan los dos, uno detras de
       otro, y el aparato acaba en el ultimo sin haber hecho nada en el
       primero (pero con su on enter ya ejecutado). */
    const gotos = list.filter(a => /^go to\s/.test(String(a)));
    if (gotos.length > 1){
      const ultimo = esc(String(gotos[gotos.length - 1]).replace(/^go to\s+/, ''));
      err(path, tr(`Hay ${gotos.length} <b>go to</b> en la misma fila, y el aparato solo puede estar en un estado a la vez: se ejecutarían uno tras otro y acabaría en <b>${ultimo}</b>, sin quedarse en los anteriores. Deja uno solo. Si quieres que dos cosas pasen a la vez (por ejemplo, bajar y sonar una alarma), ponlas en el mismo estado, o la segunda en otra función (bloque nuevo).`,
                   `There are ${gotos.length} <b>go to</b> in the same row, and the device can only be in one state at a time: they would run one after the other and it would end up in <b>${ultimo}</b>, without staying in the earlier ones. Keep just one. If you want two things to happen at once (for example, going down and sounding an alarm), put them in the same state, or the second one in another function (new block).`));
    }
    for (const a of list){
      /* set: un valor para una salida con valor (un PWM), un setting o un
         timer. El valor es un numero, un nombre o una cuenta */
      if (/^set\b/.test(String(a))){
        const ms = String(a).match(RE_SET_CUENTA);
        if (!ms){ err(path, tr(`<b>${esc(a)}</b>: se escribe <b>set nombre to valor</b>, por ejemplo <b>set motor_pwm to 21</b>. El valor también puede ser una cuenta: <b>set motor_pwm to power * 2</b>.`, `<b>${esc(a)}</b>: write <b>set name to value</b>, for example <b>set motor_pwm to 21</b>. The value can also be a calculation: <b>set motor_pwm to power * 2</b>.`)); continue; }
        const [, x, val] = ms;
        const conValor = Object.keys(HW).filter(n => HW[n].escribe && !HW[n].booleano);
        if (HW[x]){
          if (!HW[x].escribe) err(path, tr(`<b>${esc(x)}</b> es una entrada: se lee, no se le pone un valor.`, `<b>${esc(x)}</b> is an input: it is read, it cannot be given a value.`));
          else if (HW[x].booleano) err(path, tr(`<b>${esc(x)}</b> es de sí/no: se usa <b>turn on ${esc(x)}</b> o <b>turn off ${esc(x)}</b>.`, `<b>${esc(x)}</b> is on/off: use <b>turn on ${esc(x)}</b> or <b>turn off ${esc(x)}</b>.`));
        }
        else if (V[x] && V[x].type === 'flag')
          err(path, tr(`<b>${esc(x)}</b> es una bandera: se usa <b>turn on ${esc(x)}</b>, <b>turn off ${esc(x)}</b> o <b>toggle ${esc(x)}</b>.`,
                       `<b>${esc(x)}</b> is a flag: use <b>turn on ${esc(x)}</b>, <b>turn off ${esc(x)}</b> or <b>toggle ${esc(x)}</b>.`));
        else if (V[x]){ if (V[x].type !== 'setting' && V[x].type !== 'timer' && V[x].type !== 'counter') err(path, tr(`<b>set</b> pone el valor de un setting, de un timer o de una salida con valor, y <b>${esc(x)}</b> es un ${V[x].type}.`, `<b>set</b> gives a value to a setting, a timer or an output with a value, and <b>${esc(x)}</b> is a ${V[x].type}.`)); }
        else err(path, tr(`<b>${esc(x)}</b> no es una salida con valor ni un setting.${suggest(x, [...conValor, ...Object.keys(V)])}${conValor.length ? ' Salidas con valor: <b>' + conValor.join(', ') + '</b>.' : ''}`,
                          `<b>${esc(x)}</b> is not an output with a value or a setting.${suggest(x, [...conValor, ...Object.keys(V)])}${conValor.length ? ' Outputs with a value: <b>' + conValor.join(', ') + '</b>.' : ''}`));
        const e = expresion(val);
        if (e.error) err(path, `<b>${esc(a)}</b>: ${e.error}`);
        else for (const n of nombresDe(e.arbol)) conNumero(n, path);
        continue;
      }
      /* pulse y blink: una salida y sus tiempos. En while volverian a
         empezar en cada vuelta, veinte veces por segundo */
      if (/^(pulse|blink)\b/.test(String(a))){
        const esP = /^pulse\b/.test(String(a)), mt = String(a).match(esP ? RE_PULSE : RE_BLINK);
        if (where === 'while')
          err(path, tr(`<b>${esP ? 'pulse' : 'blink'}</b> no va dentro de <b>while</b>: volvería a empezar veinte veces por segundo. Ponlo en <b>on enter</b>, en un <b>if</b>, en <b>after</b> o en un botón: sigue él solo hasta acabar.`,
                       `<b>${esP ? 'pulse' : 'blink'}</b> does not go inside <b>while</b>: it would start over twenty times per second. Put it in <b>on enter</b>, an <b>if</b>, <b>after</b> or a button: it carries on by itself until it ends.`));
        if (!mt){
          err(path, esP ? tr(`<b>${esc(a)}</b>: se escribe <b>pulse nombre for segundos</b>, por ejemplo <b>pulse bip for 0.1</b>. Sin <b>for</b> dura ${PULSO_DEF} s.`, `<b>${esc(a)}</b>: write <b>pulse name for seconds</b>, for example <b>pulse bip for 0.1</b>. Without <b>for</b> it lasts ${PULSO_DEF} s.`)
                        : tr(`<b>${esc(a)}</b>: se escribe <b>blink nombre on segundos off segundos</b>, por ejemplo <b>blink led on 0.5 off 0.5</b>. Para que acabe solo, al final <b>for segundos</b> o <b>times veces</b>: <b>blink bip on 2 off 2 for 14</b>.`, `<b>${esc(a)}</b>: write <b>blink name on seconds off seconds</b>, for example <b>blink led on 0.5 off 0.5</b>. To make it end by itself, add <b>for seconds</b> or <b>times count</b> at the end: <b>blink bip on 2 off 2 for 14</b>.`));
          continue;
        }
        salidaSiNo(mt[1], path);
        if (esP){ if (mt[2] !== undefined) duracion(mt[2], path); }
        else {
          duracion(mt[2], path); duracion(mt[3], path);
          if (mt[4] === 'for') duracion(mt[5], path);
          if (mt[4] === 'times') veces(mt[5], path);
        }
        continue;
      }
      const m = String(a).match(RE_ACTION);
      if (!m){ err(path, tr(`<b>${esc(a)}</b> no es una acción.${suggest(String(a).split(/\s+/)[0], VERBS)} Las acciones son: ${VERBS.join(', ')}.`,
                            `<b>${esc(a)}</b> is not an action.${suggest(String(a).split(/\s+/)[0], VERBS)} The actions are: ${VERBS.join(', ')}.`)); continue; }
      const [, vb, x] = m, kind = VERB_ARG[vb];
      if (vb === 'go to'){
        esEstado(B, x, path);
        if (where === 'while' || where === 'on enter')
          err(path, tr(`<b>go to</b> dentro de <b>${where}</b> cambiaría de estado sin parar. Para salir de un estado usa un botón o un <b>if</b>.`,
                       `<b>go to</b> inside <b>${where}</b> would change state endlessly. To leave a state use a button or an <b>if</b>.`));
        continue;
      }
      if (kind === 'output' && V[x] && V[x].type === 'flag'){ /* una bandera: como una salida de si/no, pero sin cable */ }
      else if (kind === 'output' && V[x])
        err(path, tr(`<b>${esc(x)}</b> es un ${V[x].type}, un número: no se enciende ni se apaga. ${V[x].type === 'setting' ? `Para darle un valor: <b>set ${esc(x)} to 10</b>.` : ''} Para algo de sí/no, declara una bandera: <b>${esc(x)}_on: { type: flag, start: no }</b>.`,
                     `<b>${esc(x)}</b> is a ${V[x].type}, a number: it is not turned on or off. ${V[x].type === 'setting' ? `To give it a value: <b>set ${esc(x)} to 10</b>.` : ''} For something yes/no, declare a flag: <b>${esc(x)}_on: { type: flag, start: no }</b>.`));
      else if (kind === 'output'){
        if (!HW[x]) err(path, tr(`<b>${esc(x)}</b> no es ninguna pieza de la pestaña Hardware.${suggest(x, outputs)}${outputs.length ? ' Salidas que se encienden y apagan: <b>' + outputs.join(', ') + '</b>.' : ' Añade una salida digital en Hardware.'}`,
                                 `<b>${esc(x)}</b> is not a part in the Hardware tab.${suggest(x, outputs)}${outputs.length ? ' Outputs that turn on and off: <b>' + outputs.join(', ') + '</b>.' : ' Add a digital output in Hardware.'}`));
        else if (!HW[x].escribe) err(path, tr(`<b>${esc(x)}</b> es una entrada: se lee, no se enciende.`, `<b>${esc(x)}</b> is an input: it is read, not turned on.`));
        else if (!HW[x].booleano) err(path, tr(`<b>${esc(x)}</b> es una salida con valor, no de encender y apagar. Para darle un valor: <b>set ${esc(x)} to 21</b>.`,
                                               `<b>${esc(x)}</b> is an output with a value, not an on/off one. To give it a value: <b>set ${esc(x)} to 21</b>.`));
      } else {
        if (!V[x]) err(path, tr(`<b>${esc(x)}</b> no está declarado en <b>variables</b>.${suggest(x, Object.keys(V))}`, `<b>${esc(x)}</b> is not declared in <b>variables</b>.${suggest(x, Object.keys(V))}`));
        /* un contador cuenta con count? no: count es el reloj de un timer */
        else if (vb === 'count' && V[x].type === 'counter')
          err(path, tr(`<b>count</b> es para los timers: los hace correr con el tiempo. Para sumar uno a <b>${esc(x)}</b> usa <b>increase ${esc(x)}</b> (en <b>on enter</b>, en un <b>if</b>, en <b>every</b> o en un botón).`,
                       `<b>count</b> is for timers: it makes them run with time. To add one to <b>${esc(x)}</b> use <b>increase ${esc(x)}</b> (in <b>on enter</b>, an <b>if</b>, <b>every</b> or a button).`));
        /* save y load valen tambien para una bandera y un contador; increase,
           decrease y restart, para un contador */
        else if (V[x].type !== kind && !((vb === 'save' || vb === 'load') && (V[x].type === 'flag' || V[x].type === 'counter'))
                 && !(['increase', 'decrease', 'restart'].includes(vb) && V[x].type === 'counter'))
          err(path, tr(`<b>${vb}</b> se usa con un ${kind}, y <b>${x}</b> es un ${V[x].type}.`, `<b>${vb}</b> is used with a ${kind}, and <b>${x}</b> is a ${V[x].type}.`));
      }
      if ((vb === 'increase' || vb === 'decrease') && where === 'while' && V[x] && V[x].type === 'counter')
        err(path, tr(`<b>${vb} ${esc(x)}</b> dentro de <b>while</b> contaría veinte veces por segundo. Para contar cada cierto tiempo usa <b>every 1: [${vb} ${esc(x)}]</b>; para contar una vez, <b>on enter</b>.`,
                     `<b>${vb} ${esc(x)}</b> inside <b>while</b> would count twenty times per second. To count every so often use <b>every 1: [${vb} ${esc(x)}]</b>; to count once, <b>on enter</b>.`));
      if (vb === 'toggle' && where === 'while')
        err(path, tr(`<b>toggle</b> dentro de <b>while</b> cambiaría <b>${esc(x)}</b> veinte veces por segundo. Para que se encienda y apague a un ritmo, usa <b>blink</b>.`,
                     `<b>toggle</b> inside <b>while</b> would flip <b>${esc(x)}</b> twenty times per second. To make it turn on and off at a pace, use <b>blink</b>.`));
      if (vb === 'count' && where !== 'while') err(path, tr('<b>count</b> solo tiene sentido dentro de <b>while</b>: es lo que hace correr al timer.', '<b>count</b> only makes sense inside <b>while</b>: it is what makes the timer run.'));
      /* save y load escriben y leen la flash: nunca 20 veces por segundo */
      if ((vb === 'save' || vb === 'load') && (where === 'while' || where === 'else'))
        err(path, tr(`<b>${vb}</b> no va dentro de <b>${where}</b>: se haría 20 veces por segundo y la memoria flash se gasta con cada escritura. Ponlo en un botón o en <b>on enter</b>.`,
                     `<b>${vb}</b> does not go inside <b>${where}</b>: it would run 20 times per second, and flash memory wears out with every write. Put it on a button or in <b>on enter</b>.`));
      if ((vb === 'save' || vb === 'load') && V[x] && x.length > NVS_MAX)
        err(path, tr(`Para guardar <b>${esc(x)}</b> en la memoria su nombre tiene que tener como mucho ${NVS_MAX} caracteres (tiene ${x.length}). Acórtalo, por ejemplo <b>${esc(x.slice(0, NVS_MAX))}</b>.`,
                     `To save <b>${esc(x)}</b> to memory its name must be at most ${NVS_MAX} characters long (it has ${x.length}). Shorten it, for example <b>${esc(x.slice(0, NVS_MAX))}</b>.`));
    }
  };

  const dueñoBoton = {}, dueñoLook = {};
  const botones = Object.keys(WG).filter(w => WG[w].tipo === 'button');
  for (const B of blocks){
    const D = B.data, P = B.path, sts = estadosDe.get(B);
    /* dentro de un bloque solo van secciones (lo suelto ya se miró arriba) */
    if (B.name) for (const k of Object.keys(D)){
      if (SECTIONS.includes(k)) continue;
      if (k === 'on enter' || k === 'while' || k === 'else' || /^if\b/.test(k) || /^in\b/.test(k) || k === 'always' || /^after\b/.test(k) || /^every\b/.test(k) || k === 'on release' || k === 'hold')
        err(P + k, tr(`<b>${esc(k)}</b> está justo dentro del bloque <b>${esc(B.name)}</b>. Va dentro de un estado o de un botón, más adentro.`,
                      `<b>${esc(k)}</b> is right inside block <b>${esc(B.name)}</b>. It goes inside a state or a button, further in.`));
      else if (/^[A-Z][A-Z0-9_]*$/.test(k))
        err(P + k, tr(`<b>${esc(k)}</b> parece un estado. Los estados van dentro de <b>states:</b>, dos espacios más adentro.`,
                      `<b>${esc(k)}</b> looks like a state. States go inside <b>states:</b>, two spaces further in.`));
      else if (esObjeto(D[k]) && Object.keys(D[k]).some(x => SECTIONS.includes(x)))
        /* un bloque nuevo con sangria de mas: queda metido dentro del anterior */
        err(P + k, tr(`<b>${esc(k)}</b> parece un bloque nuevo, pero está <b>dentro</b> del bloque <b>${esc(B.name)}</b> porque lleva espacios delante. Un bloque va pegado al margen izquierdo: selecciona desde <b>${esc(k)}:</b> hasta el final de lo suyo y pulsa <b>Shift+Tab</b>.`,
                      `<b>${esc(k)}</b> looks like a new block, but it is <b>inside</b> block <b>${esc(B.name)}</b> because it has spaces in front. A block goes against the left margin: select from <b>${esc(k)}:</b> to the end of its contents and press <b>Shift+Tab</b>.`));
      else err(P + k, tr(`<b>${esc(k)}</b> no es una sección.${suggest(k, SECTIONS)} Dentro de un bloque van: ${SECTIONS.join(', ')}.`,
                         `<b>${esc(k)}</b> is not a section.${suggest(k, SECTIONS)} Inside a block go: ${SECTIONS.join(', ')}.`));
    }
    /* click: un pulso en una salida con cada boton que hace algo. Es de
       todo el aparato: vale para los botones de todos los bloques */
    if (D.click !== undefined && D.click !== null && blocks.some(o => o !== B && o.data && o.data.click !== undefined && blocks.indexOf(o) < blocks.indexOf(B)))
      err(P + 'click', tr('<b>click</b> ya está en otro bloque. Va una sola vez: vale para los botones de todos los bloques.',
                          '<b>click</b> is already in another block. It goes only once: it applies to the buttons of every block.'));
    if (D.click !== undefined && D.click !== null){
      const mc = typeof D.click === 'string' ? D.click.match(RE_CLICK) : null;
      if (!mc) err(P + 'click', tr(`<b>click</b> lleva una salida de sí/no, y si quieres, cuánto dura: <b>click: bip</b> o <b>click: bip for 0.08</b>. Cada botón que hace algo da un pulso corto en ella.`,
                                   `<b>click</b> takes an on/off output and, if you like, how long it lasts: <b>click: beep</b> or <b>click: beep for 0.08</b>. Every button that does something gives a short pulse on it.`));
      else { salidaSiNo(mc[1], P + 'click'); if (mc[2] !== undefined) duracion(mc[2], P + 'click'); }
    }
    for (const sec of ['states', 'buttons', 'looks'])
      if (D[sec] !== undefined && D[sec] !== null && !esObjeto(D[sec]))
        err(P + sec, tr(`Dentro de <b>${sec}</b> van líneas con nombre y dos puntos, dos espacios más adentro.`, `Inside <b>${sec}</b> go lines with a name and a colon, two spaces further in.`));

    const tieneVars = esObjeto(D.variables) && Object.keys(D.variables).length > 0;
    if (sts.length || tieneVars || esObjeto(D.buttons) || esObjeto(D.looks) || D.start_in !== undefined){
      const primera = P + (['states', 'variables', 'start_in', 'buttons', 'looks'].find(x => D[x] !== undefined) || '');
      if (!sts.length) err(primera, tr(`Falta la sección <b>states</b>${deBloque(B)}, con cada estado en MAYÚSCULAS seguido de dos puntos.`, `The <b>states</b> section is missing${deBloque(B)}, with each state in CAPITALS followed by a colon.`));
      if (D.start_in === undefined) err(primera, tr(`Falta <b>start_in</b>${deBloque(B)}: el estado en el que arranca.`, `<b>start_in</b> is missing${deBloque(B)}: the state it starts in.`));
      else if (sts.length) esEstado(B, D.start_in, P + 'start_in');
    }

    for (const st of sts){
      const body = D.states[st], path = P + 'states.' + st;
      if (!/^[A-Z][A-Z0-9_]*$/.test(st)) err(path, tr(`Los estados van en MAYÚSCULAS, sin espacios: <b>${esc(st.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}</b>.`, `States are in CAPITALS, with no spaces: <b>${esc(st.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}</b>.`));
      if (body === null) continue;
      if (!esObjeto(body)){ err(path, tr(`Dentro de <b>${esc(st)}</b> van, en las líneas de debajo, <b>on enter</b>, <b>while</b> o <b>if</b>.`, `Inside <b>${esc(st)}</b>, on the lines below, go <b>on enter</b>, <b>while</b> or <b>if</b>.`)); continue; }
      for (const [k, v] of Object.entries(body)){
        const pk = path + '.' + k;
        if (k === 'on enter' || k === 'while') acciones(B, v, pk, k);
        else if (/^(after|every)\b/.test(k)){
          const esA = /^after\b/.test(k), mt = k.match(esA ? RE_AFTER : RE_EVERY);
          if (!mt) err(pk, tr(`Se escribe <b>${esA ? 'after' : 'every'} segundos</b>, por ejemplo <b>${esA ? 'after 3: [go to NEXT]' : 'every 1: [increase counter]'}</b>. Los segundos pueden ser un número o un setting.`,
                              `Write <b>${esA ? 'after' : 'every'} seconds</b>, for example <b>${esA ? 'after 3: [go to NEXT]' : 'every 1: [increase counter]'}</b>. The seconds can be a number or a setting.`));
          else {
            duracion(mt[1], pk);
            /* save/load cada poco gastan la flash, como en while */
            if (!esA && !isNaN(+mt[1]) && +mt[1] < 10 && Array.isArray(v) && v.some(a => /^(save|load)\s/.test(String(a))))
              err(pk, tr(`<b>save</b> y <b>load</b> cada menos de 10 segundos gastarían la memoria flash, que se desgasta con cada escritura. Hazlo más de tarde en tarde o desde un botón.`,
                         `<b>save</b> and <b>load</b> every less than 10 seconds would wear out the flash memory, which wears with every write. Do it less often, or from a button.`));
          }
          acciones(B, v, pk, esA ? 'after' : 'every');
        }
        else if (k === 'else'){
          /* un "si no" sin ningun "si" no dice nada: seria un while */
          if (!Object.keys(body).some(x => /^if\b/.test(x)))
            err(pk, tr(`<b>else</b> es "si no se cumple ningún <b>if</b>", pero en <b>${esc(st)}</b> no hay ningún <b>if</b>. Para hacer algo siempre, usa <b>while</b>.`,
                       `<b>else</b> means "if no <b>if</b> holds", but <b>${esc(st)}</b> has no <b>if</b>. To do something all the time, use <b>while</b>.`));
          acciones(B, v, pk, 'else');
        }
        else if (/^if\b/.test(k)){
          const C = condPartes(k), porQue = C ? '' : condError(k);
          if (!C && porQue) err(pk, porQue.charAt(0) === '<' ? porQue : porQue.charAt(0).toUpperCase() + porQue.slice(1));
          else if (!C) err(pk, tr('La condición se escribe <b>if nombre comparación valor</b>, por ejemplo <b>if temperature > 60</b> o <b>if voltage < setpoint - band</b>. Se pueden unir varias con <b>and</b> y <b>or</b>: <b>if hold_time == 0 or voltage == 0</b>.',
                             'A condition is written <b>if name comparison value</b>, for example <b>if temperature > 60</b> or <b>if voltage < setpoint - band</b>. Several can be joined with <b>and</b> and <b>or</b>: <b>if hold_time == 0 or voltage == 0</b>.'));
          else for (const m of C.partes){
            /* "if cycle is RUNNING": un bloque con nombre y uno de sus estados */
            if (m.es){
              const X = blocks.find(Y => Y.name && Y.name === m[1]);
              const conNombre = blocks.filter(Y => Y.name).map(Y => Y.name);
              if (!X) err(pk, conNombre.length
                ? tr(`<b>${esc(m[1])}</b> no es ningún bloque.${suggest(m[1], conNombre)} Los bloques son: <b>${conNombre.join(', ')}</b>. Se pregunta así: <b>if ${esc(conNombre[0])} is ${esc(estadosDe.get(blocks.find(Y => Y.name === conNombre[0]))[0] || 'IDLE')}</b>.`,
                     `<b>${esc(m[1])}</b> is not a block.${suggest(m[1], conNombre)} The blocks are: <b>${conNombre.join(', ')}</b>. It is asked like this: <b>if ${esc(conNombre[0])} is ${esc(estadosDe.get(blocks.find(Y => Y.name === conNombre[0]))[0] || 'IDLE')}</b>.`)
                : tr(`<b>if ${esc(m[1])} is …</b> pregunta en qué estado está otro <b>bloque</b>, y este programa no tiene bloques: es una sola función. Para mirar el estado propio no hace falta: cada estado ya sabe que está en sí mismo.`,
                     `<b>if ${esc(m[1])} is …</b> asks which state another <b>block</b> is in, and this program has no blocks: it is a single function. To look at its own state there is no need: each state already knows it is in itself.`));
              else if (!estadosDe.get(X).includes(m[3]))
                err(pk, tr(`<b>${esc(m[3])}</b> no es un estado del bloque <b>${esc(m[1])}</b>.${suggest(m[3], estadosDe.get(X))} Sus estados son: ${estadosDe.get(X).join(', ') || '(ninguno todavía)'}.`,
                           `<b>${esc(m[3])}</b> is not a state of block <b>${esc(m[1])}</b>.${suggest(m[3], estadosDe.get(X))} Its states are: ${estadosDe.get(X).join(', ') || '(none yet)'}.`));
              continue;
            }
            /* "if armed": un nombre solo vale para lo que es de si/no */
            if (m.solo){
              const x = m[1];
              if (V[x] && V[x].type === 'flag') continue;
              if (HW[x] && HW[x].lee && HW[x].booleano) continue;
              const banderas = Object.keys(V).filter(n => V[n].type === 'flag');
              err(pk, V[x] ? tr(`<b>${esc(x)}</b> es un ${V[x].type}, un número: hay que compararlo con algo, por ejemplo <b>if ${esc(x)} &gt; 0</b>. Un nombre solo, como <b>if armed</b>, vale para las banderas (<b>type: flag</b>).`,
                                `<b>${esc(x)}</b> is a ${V[x].type}, a number: it has to be compared with something, for example <b>if ${esc(x)} &gt; 0</b>. A name on its own, like <b>if armed</b>, works for flags (<b>type: flag</b>).`)
                : HW[x] && HW[x].lee ? tr(`<b>${esc(x)}</b> es una entrada con valor: hay que compararla con algo, por ejemplo <b>if ${esc(x)} &gt; 2.5</b>.`,
                                          `<b>${esc(x)}</b> is an input with a value: it has to be compared with something, for example <b>if ${esc(x)} &gt; 2.5</b>.`)
                : HW[x] ? tr(`<b>${esc(x)}</b> es una salida: la lógica la enciende y la apaga, no la pregunta. Para recordar algo de sí/no usa una bandera: <b>${esc(x)}_on: { type: flag, start: no }</b>.`,
                             `<b>${esc(x)}</b> is an output: the logic turns it on and off, it does not ask it. To remember something yes/no use a flag: <b>${esc(x)}_on: { type: flag, start: no }</b>.`)
                : tr(`<b>${esc(x)}</b> no es una bandera ni una entrada de sí/no.${suggest(x, [...banderas, ...legibles()])} Una bandera se declara en <b>variables</b>: <b>${esc(x)}: { type: flag, start: no }</b>.`,
                     `<b>${esc(x)}</b> is not a flag or an on/off input.${suggest(x, [...banderas, ...legibles()])} A flag is declared in <b>variables</b>: <b>${esc(x)}: { type: flag, start: no }</b>.`));
              continue;
            }
            /* con cuentas: cada nombre tiene que tener un numero */
            if (m.cuentaIzq) for (const n of nombresDe(m.cuentaIzq)) conNumero(n, pk);
            if (m.cuenta) for (const n of nombresDe(m.cuenta)) conNumero(n, pk);
            if (m[5] !== undefined && isNaN(+m[5]) && !V[m[5]] && !(HW[m[5]] && HW[m[5]].lee))
              err(pk, tr(`<b>${esc(m[5])}</b> no es un número ni un nombre conocido.${suggest(m[5], legibles())}`, `<b>${esc(m[5])}</b> is not a number or a known name.${suggest(m[5], legibles())}`));
            if (!m.cuentaIzq && !V[m[1]] && !(HW[m[1]] && HW[m[1]].lee)){
              if (HW[m[1]]) err(pk, tr(`<b>${esc(m[1])}</b> es una salida: se enciende y se apaga, no se compara.`, `<b>${esc(m[1])}</b> is an output: it is turned on and off, not compared.`));
              else err(pk, tr(`<b>${esc(m[1])}</b> no es una variable ni una entrada de Hardware.${suggest(m[1], legibles())}`, `<b>${esc(m[1])}</b> is not a variable or a Hardware input.${suggest(m[1], legibles())}`));
            }
            if (!m.cuenta && isNaN(+m[3]) && !V[m[3]] && !(HW[m[3]] && HW[m[3]].lee))
              err(pk, tr(`<b>${esc(m[3])}</b> no es un número ni un nombre conocido.${suggest(m[3], legibles())}`, `<b>${esc(m[3])}</b> is not a number or a known name.${suggest(m[3], legibles())}`));
            /* Un timer avanza de 0,05 en 0,05 s y en coma flotante: tras
               cuarenta pasos vale 2,0000002, no 2. Con == ese instante no
               llega nunca. El 0 si vale: la cuenta atras se para en 0 exacto
               y restart pone 0 exacto. */
            if ((m[2] === '==' || m[2] === '!=') && V[m[1]] && V[m[1]].type === 'timer' && !(m[3] !== undefined && +m[3] === 0 && m[4] === undefined))
              err(pk, tr(`<b>${esc(m[1])}</b> es un timer: avanza de 0,05 en 0,05 segundos y casi nunca vale exactamente <b>${esc(m[3])}${m[4] ? ' ' + esc(m[4]) + ' ' + esc(m[5]) : ''}</b>, así que <b>${esc(m[2])}</b> no se cumpliría. Usa <b>&gt;=</b>: <b>if ${esc(m[1])} &gt;= ${esc(m[3])}</b>. Para un tramo, dos comparaciones con <b>and</b>: <b>if ${esc(m[1])} &gt;= 2 and ${esc(m[1])} &lt; 4</b>. (Con <b>== 0</b> sí se puede.)`,
                             `<b>${esc(m[1])}</b> is a timer: it moves in steps of 0.05 seconds and is almost never exactly <b>${esc(m[3])}${m[4] ? ' ' + esc(m[4]) + ' ' + esc(m[5]) : ''}</b>, so <b>${esc(m[2])}</b> would never hold. Use <b>&gt;=</b>: <b>if ${esc(m[1])} &gt;= ${esc(m[3])}</b>. For a stretch, two comparisons with <b>and</b>: <b>if ${esc(m[1])} &gt;= 2 and ${esc(m[1])} &lt; 4</b>. (<b>== 0</b> does work.)`));
          }
          acciones(B, v, pk, 'if');
        }
        else if (!fueraDeSitio(k, v, pk, 'estado')) err(pk, tr(`Dentro de un estado solo caben <b>on enter</b>, <b>while</b>, <b>if …</b>, <b>else</b>, <b>after …</b> y <b>every …</b>; <b>${esc(k)}</b> no.${suggest(k, ['on enter', 'while', 'if', 'else', 'after', 'every'])}`,
                        `Inside a state only <b>on enter</b>, <b>while</b>, <b>if …</b>, <b>else</b>, <b>after …</b> and <b>every …</b> fit; <b>${esc(k)}</b> does not.${suggest(k, ['on enter', 'while', 'if', 'else', 'after', 'every'])}`));
      }
    }

    for (const [b, def] of Object.entries(esObjeto(D.buttons) ? D.buttons : {})){
      const path = P + 'buttons.' + b;
      if (!WG[b]) err(path, tr(`En el lienzo no hay nada llamado <b>${esc(b)}</b>.${suggest(b, botones)}${botones.length ? ' Botones: <b>' + botones.join(', ') + '</b>.' : ' Todavía no hay ningún botón: añádelo en la pestaña Diseño.'}`,
                               `There is nothing called <b>${esc(b)}</b> on the canvas.${suggest(b, botones)}${botones.length ? ' Buttons: <b>' + botones.join(', ') + '</b>.' : ' There are no buttons yet: add one in the Design tab.'}`));
      else if (WG[b].tipo !== 'button') err(path, tr(`<b>${esc(b)}</b> está en el lienzo, pero no es un botón.`, `<b>${esc(b)}</b> is on the canvas, but it is not a button.`));
      else if ((WG[b].pantallas || []).length > 1) err(path, repetidoEnPantallas(b, WG[b]));
      if (Object.prototype.hasOwnProperty.call(dueñoBoton, b)){
        err(path, tr(`<b>${esc(b)}</b> ya tiene lógica en el bloque <b>${esc(dueñoBoton[b])}</b>. Un botón solo puede pertenecer a un bloque.`,
                     `<b>${esc(b)}</b> already has logic in block <b>${esc(dueñoBoton[b])}</b>. A button can only belong to one block.`));
        continue;
      }
      dueñoBoton[b] = B.name;
      if (!esObjeto(def)){ err(path, tr('Dentro del botón van filas como <b>in READY: [go to COUNTING]</b> o <b>always: […]</b>.', 'Inside the button go rows like <b>in READY: [go to COUNTING]</b> or <b>always: […]</b>.')); continue; }
      for (const [k, v] of Object.entries(def)){
        const pk = path + '.' + k, m = k.match(/^in\s+(\S+)$/);
        /* repeat no es una fila de acciones: dice si la acción se repite al dejarlo pulsado */
        if (k === 'repeat'){
          if (!['yes', 'no', true, false].includes(v))
            err(pk, tr(`<b>repeat</b> vale <b>yes</b> o <b>no</b>, y aquí pone <b>${esc(v)}</b>. Con <b>repeat: yes</b>, si dejas pulsado el botón su acción se repite sola.`,
                       `<b>repeat</b> is <b>yes</b> or <b>no</b>, and here it says <b>${esc(v)}</b>. With <b>repeat: yes</b>, holding the button down repeats its action on its own.`));
          continue;
        }
        /* hold: una salida que sigue al dedo, encendida mientras esta pulsado */
        if (k === 'hold'){
          if (typeof v !== 'string' || !/^\w+$/.test(v))
            err(pk, tr('<b>hold</b> lleva el nombre de una salida de sí/no: <b>hold: puerta</b>. Queda encendida mientras el botón está pulsado y se apaga al soltarlo.',
                       '<b>hold</b> takes the name of an on/off output: <b>hold: door</b>. It stays on while the button is held and turns off when released.'));
          else salidaSiNo(v, pk);
          continue;
        }
        /* on hold T: lo que se hace al mantenerlo pulsado T segundos */
        if (/^on hold\b/.test(k)){
          const mh = k.match(RE_ONHOLD);
          if (!mh) err(pk, tr('<b>on hold</b> lleva cuánto hay que mantener pulsado, en segundos o un setting: <b>on hold 2: [go to IDLE]</b>.',
                              '<b>on hold</b> takes how long it has to be held, in seconds or a setting: <b>on hold 2: [go to IDLE]</b>.'));
          else duracion(mh[1], pk);
          acciones(B, v, pk, 'button');
          continue;
        }
        /* "hold 2: [...]": casi seguro quería on hold */
        if (/^hold\s+\S/.test(k)){
          err(pk, tr(`Para hacer algo al mantener pulsado un tiempo se escribe <b>on hold ${esc(k.replace(/^hold\s+/, ''))}: […]</b>. <b>hold: salida</b>, sin tiempo, es otra cosa: una salida encendida mientras el dedo está en el botón.`,
                     `To do something when held for a while, write <b>on hold ${esc(k.replace(/^hold\s+/, ''))}: […]</b>. <b>hold: output</b>, without a time, is something else: an output that is on while the finger is on the button.`));
          continue;
        }
        if (!m && fueraDeSitio(k, v, pk, 'boton')) continue;
        if (m) esEstado(B, m[1], pk);
        else if (k !== 'always' && k !== 'on release') err(pk, tr(`Cada fila de un botón empieza por <b>in ESTADO</b>, <b>always</b>, <b>on release</b> u <b>on hold 2</b> (y aparte puede llevar <b>repeat: yes</b> o <b>hold: salida</b>); <b>${esc(k)}</b> no.${suggest(k, ['always', 'on release', 'on hold', 'hold', 'repeat', ...sts.map(x => 'in ' + x)])}`,
                                            `Each button row starts with <b>in STATE</b>, <b>always</b>, <b>on release</b> or <b>on hold 2</b> (and it may also have <b>repeat: yes</b> or <b>hold: output</b>); <b>${esc(k)}</b> does not.${suggest(k, ['always', 'on release', 'on hold', 'hold', 'repeat', ...sts.map(x => 'in ' + x)])}`));
        acciones(B, v, pk, 'button');
      }
      /* on hold: uno por botón, y no junto a repeat (los dos dicen qué pasa al mantenerlo) */
      const largas = Object.keys(def).filter(k => /^on hold\b/.test(k));
      if (largas.length > 1)
        err(path + '.' + largas[1], tr(`<b>${esc(b)}</b> tiene ${largas.length} filas <b>on hold</b>: un botón lleva una sola pulsación larga.`,
                                       `<b>${esc(b)}</b> has ${largas.length} <b>on hold</b> rows: a button has a single long press.`));
      if (largas.length && (def.repeat === 'yes' || def.repeat === true))
        err(path + '.repeat', tr(`<b>${esc(b)}</b> tiene <b>repeat: yes</b> y <b>on hold</b>, y los dos dicen qué pasa al mantenerlo pulsado: repetir la acción, o hacer otra cosa pasado un tiempo. Deja uno de los dos.`,
                                 `<b>${esc(b)}</b> has <b>repeat: yes</b> and <b>on hold</b>, and both say what happens when it is held down: repeat the action, or do something else after a while. Keep one of the two.`));
      if (Object.prototype.hasOwnProperty.call(def, 'repeat') && !Object.keys(def).some(k => k !== 'repeat'))
        err(path + '.repeat', tr(`<b>${esc(b)}</b> solo tiene <b>repeat</b>, pero ninguna acción que repetir. Añade una fila como <b>always: [increase speed]</b>.`,
                                 `<b>${esc(b)}</b> only has <b>repeat</b>, but no action to repeat. Add a row like <b>always: [increase speed]</b>.`));
    }

    for (const [clave, def] of Object.entries(esObjeto(D.looks) ? D.looks : {})){
      const path = P + 'looks.' + clave, nombres = nombresLook(clave);
      let repetido = false;
      for (const w of nombres){
        if (!WG[w]) err(path, tr(`En el lienzo no hay nada llamado <b>${esc(w)}</b>.${suggest(w, Object.keys(WG))}`, `There is nothing called <b>${esc(w)}</b> on the canvas.${suggest(w, Object.keys(WG))}`));
        else if ((WG[w].pantallas || []).length > 1) err(path, repetidoEnPantallas(w, WG[w]));
        if (Object.prototype.hasOwnProperty.call(dueñoLook, w)){
          err(path, tr(`El aspecto de <b>${esc(w)}</b> ya lo decide el bloque <b>${esc(dueñoLook[w])}</b>. Un elemento solo cambia de aspecto desde un bloque.`,
                       `The look of <b>${esc(w)}</b> is already decided by block <b>${esc(dueñoLook[w])}</b>. An element only changes its look from one block.`));
          repetido = true;
        }
        else dueñoLook[w] = B.name;
      }
      if (repetido) continue;
      /* las comprobaciones de dentro miran el primero: todos comparten el
         mismo bloque, asi que lo que valga para uno vale para los demas */
      const w = nombres[0] || clave;
      if (!esObjeto(def)){ err(path, tr('Dentro van filas como <b>in READY: { text: START, color: green }</b>.', 'Inside go rows like <b>in READY: { text: START, color: green }</b>.')); continue; }
      for (const [k, v] of Object.entries(def)){
        const pk = path + '.' + k, m = k.match(/^in\s+(\S+)$/);
        if (!m){ err(pk, tr('Cada fila de <b>looks</b> empieza por <b>in ESTADO</b>.', 'Each <b>looks</b> row starts with <b>in STATE</b>.')); continue; }
        esEstado(B, m[1], pk);
        if (!esObjeto(v)){ err(pk, tr('Aquí van llaves: <b>{ text: …, color: … }</b>.', 'Braces go here: <b>{ text: …, color: … }</b>.')); continue; }
        for (const kk of Object.keys(v)) if (!['text', 'color', 'enabled', 'disabled'].includes(kk))
          err(pk, tr(`<b>looks</b> lleva text, color y enabled; <b>${esc(kk)}</b> no.${suggest(kk, ['text', 'color', 'enabled', 'disabled'])}`, `<b>looks</b> takes text, color and enabled; <b>${esc(kk)}</b> does not.${suggest(kk, ['text', 'color', 'enabled', 'disabled'])}`));
        if (v.enabled !== undefined && v.disabled !== undefined)
          err(pk, tr('Aquí sobra uno: <b>enabled</b> y <b>disabled</b> dicen lo mismo al revés. Deja solo uno.',
                     'One of these is redundant: <b>enabled</b> and <b>disabled</b> say the same thing the other way round. Keep only one.'));
        const clH = v.enabled !== undefined ? 'enabled' : 'disabled';
        if (v[clH] !== undefined && !['yes', 'no', true, false].includes(v[clH]))
          err(pk, tr(`<b>${clH}</b> es <b>yes</b> o <b>no</b>, no <b>${esc(v[clH])}</b>.`, `<b>${clH}</b> is <b>yes</b> or <b>no</b>, not <b>${esc(v[clH])}</b>.`));
        else if (v[clH] !== undefined)
          for (const x of nombres.filter(x => WG[x] && !APAGABLES.includes(WG[x].tipo)))
            err(pk, tr(`<b>${esc(x)}</b> no se puede tocar, así que no hay nada que apagar. <b>enabled</b> vale para botones, interruptores, casillas, deslizadores y listas.`,
                       `<b>${esc(x)}</b> cannot be touched, so there is nothing to disable. <b>enabled</b> works on buttons, switches, checkboxes, sliders and lists.`));
        if (v.text !== undefined)
          for (const x of nombres.filter(x => WG[x] && !['button', 'label'].includes(WG[x].tipo)))
            err(pk, tr(`<b>${esc(x)}</b> no lleva texto propio; aquí solo se le puede cambiar el color.`, `<b>${esc(x)}</b> has no text of its own; only its color can be changed here.`));
        if (v.color !== undefined && !(v.color in COLORS) && !/^#[0-9a-fA-F]{6}$/.test(v.color))
          err(pk, tr(`<b>${esc(v.color)}</b> no es un color.${suggest(v.color, Object.keys(COLORS))} Vale ${Object.keys(COLORS).join(', ')} o uno propio entre comillas, como <b>"#3b9dff"</b>.`,
                     `<b>${esc(v.color)}</b> is not a color.${suggest(v.color, Object.keys(COLORS))} Valid: ${Object.keys(COLORS).join(', ')} or your own in quotes, like <b>"#3b9dff"</b>.`));
      }
    }
  }

  return fin({
    flat: !nombres.length,
    blocks: blocks.map(B => ({
      name: B.name, path: B.path,
      variables: esObjeto(B.data.variables) ? B.data.variables : {},
      start_in: B.data.start_in,
      click: typeof B.data.click === 'string' ? B.data.click : null,
      states: esObjeto(B.data.states) ? B.data.states : {},
      buttons: esObjeto(B.data.buttons) ? B.data.buttons : {},
      looks: sueltoLooks(esObjeto(B.data.looks) ? B.data.looks : {}),
    })),
  });
}

/* "btn_a, btn_b: { ... }" se guarda como dos entradas iguales: el
   generador, el simulador y las frases ven siempre un elemento por fila. */
function sueltoLooks(looks){
  const out = {};
  for (const [clave, def] of Object.entries(looks))
    for (const w of nombresLook(clave)) out[w] = def;
  return out;
}

/* Un nombre que está en dos pantallas no se puede usar: no se sabe a cuál
   se refiere. Tampoco compilaría: en C cada widget es una variable. */
function repetidoEnPantallas(w, info){
  return tr(`Hay ${info.pantallas.length} elementos que se llaman <b>${esc(w)}</b>, en las pantallas ${info.pantallas.map(p => '<b>' + esc(p) + '</b>').join(' y ')}. Así no se sabe a cuál te refieres, y el código tampoco compilaría: cambia el nombre de uno en la pestaña Diseño.`,
            `There are ${info.pantallas.length} elements called <b>${esc(w)}</b>, on screens ${info.pantallas.map(p => '<b>' + esc(p) + '</b>').join(' and ')}. That way it is unclear which one you mean, and the code would not compile either: rename one in the Design tab.`);
}

/* =====================================================================
 * COLORES DE LA SINTAXIS
 * ================================================================== */
const RE_TOK = new RegExp([
  '(#.*$)', '("[^"]*")', '(\\bon enter\\b|\\bon release\\b|\\bon hold\\b|\\bgo to\\b|\\bturn on\\b|\\bturn off\\b)',
  '(0x[0-9A-Fa-f]+|-?\\b\\d+(?:\\.\\d+)?\\b)', '([A-Za-z_]\\w*)', '(==|!=|>=|<=|>|<|\\+|-|\\*|/|&&|\\|\\|)', '([{}\\[\\],:()])'
].join('|'), 'g');

function classify(w){
  if (SECTIONS.includes(w) || KEYS.includes(w)) return 'k';
  if (['if', 'else', 'in', 'always', 'while', 'repeat', 'to', 'and', 'or', 'not', 'is', 'after', 'every', 'for', 'times', 'on', 'off', 'hold', 'click'].includes(w) || VERBS.includes(w)) return 'kw';
  if (w in TYPES || w === 'down' || w === 'up' || w === 'yes' || w === 'no' || w in COLORS) return 'v';
  if (/^[A-Z][A-Z0-9_]+$/.test(w)) return 'st';
  return 'nm';
}
/* Una línea -> HTML con un <b class> por palabra. Las pulsables llevan data-w. */
function highlightLine(l){
  let out = '', pos = 0, m;
  RE_TOK.lastIndex = 0;
  while ((m = RE_TOK.exec(l))){
    if (!m[0].length){ RE_TOK.lastIndex++; continue; }
    out += esc(l.slice(pos, m.index));
    const t = m[0];
    const cls = m[1] ? 'cm' : m[2] ? 's' : m[3] ? 'kw' : m[4] ? 'n' : m[5] ? classify(t) : m[6] ? 'op' : 'p';
    out += (cls === 'cm' || cls === 'p') ? `<b class="lg-${cls}">${esc(t)}</b>` : `<b class="lg-${cls}" data-w="${esc(t)}">${esc(t)}</b>`;
    pos = m.index + t.length;
  }
  return out + esc(l.slice(pos));
}

/* =====================================================================
 * FRASES — cada línea, con lo que significa
 * ================================================================== */
function sentences(M){
  const out = [], b = x => `<b>${esc(x)}</b>`;
  if (!M) return out;
  const VB = LANG === 'en' ? VERB_EN : VERB_ES, COL = LANG === 'en' ? COLOR_EN : COLOR_ES_;
  const VARS_M = Object.assign({}, ...(M.blocks || []).map(bl => bl.variables || {}));
  /* un tiempo, dicho: "0,5 s" o "los segundos de hold_time" */
  const tt = x => isNaN(+x) ? tr(`los segundos de ${b(x)}`, `the seconds in ${b(x)}`) : `${String(x).replace('.', tr(',', '.'))} s`;
  /* una cuenta, dicha: los nombres en negrita y * / como × ÷ */
  const cuenta = (txt, arbol) => arbol && (arbol.op || arbol.neg || arbol.par)
    ? pintaExpr(arbol, { num: n => esc(n), nombre: b, ops: { '*': '×', '/': '÷' }, div: (x, y) => `${x} ÷ ${y}` }) : b(txt);
  const acts = list => (list || []).map(a => { const ms = String(a).match(RE_SET_CUENTA); if (ms){ const e = expresion(ms[2]); return tr(`poner ${b(ms[1])} a ${cuenta(ms[2], e.arbol)}`, `set ${b(ms[1])} to ${cuenta(ms[2], e.arbol)}`); }
    const mp = String(a).match(RE_PULSE);
    if (mp) return tr(`encender ${b(mp[1])} durante ${tt(mp[2] ?? PULSO_DEF)} y apagarlo solo`, `turn on ${b(mp[1])} for ${tt(mp[2] ?? PULSO_DEF)} and turn it off by itself`);
    const mb = String(a).match(RE_BLINK);
    if (mb) return tr(`hacer parpadear ${b(mb[1])} (${tt(mb[2])} encendido, ${tt(mb[3])} apagado${mb[4] === 'for' ? `, durante ${tt(mb[5])}` : mb[4] === 'times' ? `, ${esc(mb[5])} veces` : ', sin parar'})`,
                      `blink ${b(mb[1])} (${tt(mb[2])} on, ${tt(mb[3])} off${mb[4] === 'for' ? `, for ${tt(mb[5])}` : mb[4] === 'times' ? `, ${esc(mb[5])} times` : ', without stopping'})`);
    const m = String(a).match(RE_ACTION); if (!m) return esc(a);
    /* un contador se dice con numeros: "sumar 1 a rounds" */
    const vc = VARS_M[m[2]];
    if (vc && vc.type === 'counter'){
      if (m[1] === 'increase') return tr(`sumar 1 a ${b(m[2])}`, `add 1 to ${b(m[2])}`);
      if (m[1] === 'decrease') return tr(`restar 1 a ${b(m[2])}`, `subtract 1 from ${b(m[2])}`);
      if (m[1] === 'restart') return tr(`volver ${b(m[2])} a ${inicioContador(vc)}`, `take ${b(m[2])} back to ${inicioContador(vc)}`);
    }
    if (m[1] === 'toggle') return tr(`cambiar ${b(m[2])} (si está encendido se apaga, y al revés)`, `toggle ${b(m[2])} (on becomes off, and vice versa)`);
    if (m[1] === 'save') return tr(`guardar ${b(m[2])} en la memoria`, `save ${b(m[2])} to memory`);
    if (m[1] === 'load') return tr(`cargar ${b(m[2])} de la memoria`, `load ${b(m[2])} from memory`);
    return `${VB[m[1]]} ${b(m[2])}`; }).join(', ');
  const G = { v: tr('Variables', 'Variables'), e: tr('Estados', 'States'), b: tr('Botones', 'Buttons'), a: tr('Aspecto', 'Looks') };
  for (const B of M.blocks){
    const P = B.path, g = x => B.name ? `${B.name} · ${x}` : x;
    const add = (group, path, code, text) => out.push({ group: g(group), block: B.name, path: P + path, code, text });
    for (const [n, v] of Object.entries(B.variables)){
      const code = `${n}: { ${Object.entries(v).map(([k, x]) => `${k}: ${Array.isArray(x) ? '[' + x.join(', ') + ']' : x}`).join(', ')} }`;
      add(G.v, 'variables.' + n, code, v.type === 'counter'
        ? tr(`${b(n)} es un contador de enteros que empieza en ${inicioContador(v)}${typeof v.max === 'number' ? ` y llega como mucho a ${v.max}` : ''}: sube de uno en uno con increase y no baja de 0.`,
             `${b(n)} is a whole-number counter that starts at ${inicioContador(v)}${typeof v.max === 'number' ? ` and goes up to ${v.max} at most` : ''}: it goes up one at a time with increase and never below 0.`)
        : v.type === 'flag'
        ? tr(`${b(n)} es una bandera de sí/no que empieza en ${banderaInicial(v) ? 'sí' : 'no'}: la lógica la enciende, la apaga y pregunta por ella.`,
             `${b(n)} is a yes/no flag that starts at ${banderaInicial(v) ? 'yes' : 'no'}: the logic turns it on, turns it off and asks about it.`)
        : v.type === 'setting'
        ? tr(`${b(n)} es un ajuste de ${v.range[0]} a ${v.range[1]}${v.unit ? ' ' + esc(v.unit) : ''}, que sube y baja de ${v.step} en ${v.step} y empieza en ${v.start}.`,
             `${b(n)} is a setting from ${v.range[0]} to ${v.range[1]}${v.unit ? ' ' + esc(v.unit) : ''}, that goes up and down in steps of ${v.step} and starts at ${v.start}.`)
        : (v.counts === 'up' ? tr(`${b(n)} es un temporizador que cuenta hacia delante desde cero.`, `${b(n)} is a timer that counts up from zero.`)
                             : tr(`${b(n)} es un temporizador que cuenta hacia atrás desde el valor de ${b(v.from)}.`, `${b(n)} is a timer that counts down from the value of ${b(v.from)}.`)));
    }
    if (B.click){ const mc = String(B.click).match(RE_CLICK);
      if (mc) add(G.b, 'click', `click: ${B.click}`, tr(`Cada vez que se pulsa un botón que hace algo, ${b(mc[1])} se enciende ${tt(mc[2] ?? CLICK_DEF)}: un pitido corto de confirmación.`,
                                                      `Every time a button that does something is pressed, ${b(mc[1])} turns on for ${tt(mc[2] ?? CLICK_DEF)}: a short confirmation beep.`)); }
    if (B.start_in !== undefined) add(G.e, 'start_in', `start_in: ${B.start_in}`,
      tr(`Al encenderse, ${B.name ? 'el bloque ' + b(B.name) : 'el aparato'} arranca en ${b(B.start_in)}.`,
         `When powered on, ${B.name ? 'block ' + b(B.name) : 'the device'} starts in ${b(B.start_in)}.`));
    for (const [st, body] of Object.entries(B.states)){
      if (!body){ add(G.e, 'states.' + st, `${st}:`, tr(`${b(st)} es un estado donde no pasa nada especial.`, `${b(st)} is a state where nothing special happens.`)); continue; }
      for (const [k, list] of Object.entries(body)){
        const code = `${st} → ${k}: [${(list || []).join(', ')}]`, path = `states.${st}.${k}`;
        if (k === 'on enter') add(G.e, path, code, tr(`Al entrar en ${b(st)}: ${acts(list)}.`, `On entering ${b(st)}: ${acts(list)}.`));
        else if (k === 'while') add(G.e, path, code, tr(`Mientras está en ${b(st)}: ${acts(list)}.`, `While in ${b(st)}: ${acts(list)}.`));
        else if (k === 'else') add(G.e, path, code, tr(`En ${b(st)}, si no se cumple ninguna de las condiciones de arriba: ${acts(list)}.`, `In ${b(st)}, if none of the conditions above holds: ${acts(list)}.`));
        else if (/^after\b/.test(k)){ const mt = k.match(RE_AFTER); add(G.e, path, code, tr(`Cuando lleva ${mt ? tt(mt[1]) : esc(k)} en ${b(st)}, una vez: ${acts(list)}.`, `After ${mt ? tt(mt[1]) : esc(k)} in ${b(st)}, once: ${acts(list)}.`)); }
        else if (/^every\b/.test(k)){ const mt = k.match(RE_EVERY); add(G.e, path, code, tr(`Cada ${mt ? tt(mt[1]) : esc(k)} mientras está en ${b(st)}: ${acts(list)}.`, `Every ${mt ? tt(mt[1]) : esc(k)} while in ${b(st)}: ${acts(list)}.`)); }
        else { const C = condPartes(k);
               const una = m => m.es ? (m.no ? tr(`el bloque ${b(m[1])} no está en ${b(m[3])}`, `block ${b(m[1])} is not in ${b(m[3])}`) : tr(`el bloque ${b(m[1])} está en ${b(m[3])}`, `block ${b(m[1])} is in ${b(m[3])}`))
                 : m.solo ? (m.no ? tr(`${b(m[1])} está en no`, `${b(m[1])} is off`) : tr(`${b(m[1])} está en sí`, `${b(m[1])} is on`))
                 : `${m.no ? tr('no ', 'not ') : ''}${m.cuentaIzq ? cuenta(m[1], m.cuentaIzq) : b(m[1])} ${esc(m[2])} ${m.cuenta ? cuenta(m[3], m.cuenta) : b(m[3])}${m[4] ? ` ${esc(m[4])} ${b(m[5])}` : ''}`;
               const cond = C ? C.partes.map(una).reduce((a, x, i) => a + (C.enlaces[i - 1] === 'or' ? tr(' o ', ' or ') : tr(' y ', ' and ')) + x) : esc(k);
               add(G.e, path, code, tr(`En ${b(st)}, si ${cond}: ${acts(list)}.`, `In ${b(st)}, if ${cond}: ${acts(list)}.`)); }
      }
    }
    for (const [btn, def] of Object.entries(B.buttons))
      for (const [k, list] of Object.entries(def))
        if (k === 'repeat'){
          if (list === 'yes' || list === true)
            add(G.b, `buttons.${btn}.${k}`, `${btn} → repeat: yes`, tr(`Si se deja pulsado ${b(btn)}, su acción se repite sola.`, `If ${b(btn)} is held down, its action repeats on its own.`));
        }
        else if (k === 'hold')
          add(G.b, `buttons.${btn}.${k}`, `${btn} → hold: ${list}`, tr(`Mientras se mantiene pulsado ${b(btn)}, ${b(list)} está encendido; al soltarlo se apaga.`, `While ${b(btn)} is held down, ${b(list)} is on; releasing it turns it off.`));
        else if (k === 'on release')
          add(G.b, `buttons.${btn}.${k}`, `${btn} → on release: [${list.join(', ')}]`, tr(`Al soltar ${b(btn)}: ${acts(list)}.`, `On releasing ${b(btn)}: ${acts(list)}.`));
        else if (/^on hold\b/.test(k)){
          const mh = k.match(RE_ONHOLD);
          add(G.b, `buttons.${btn}.${k}`, `${btn} → ${k}: [${list.join(', ')}]`, tr(`Si se mantiene pulsado ${b(btn)} ${mh ? tt(mh[1]) : ''}: ${acts(list)} (una vez, sin esperar a soltarlo).`,
                                                                                    `If ${b(btn)} is held down for ${mh ? tt(mh[1]) : ''}: ${acts(list)} (once, without waiting for the release).`));
        }
        else {
          /* con pulsación larga, lo de pulsar es un toque corto y va al soltar */
          const corto = Object.keys(def).some(x => /^on hold\b/.test(x));
          const alPulsar = corto ? tr(`Con un toque corto en ${b(btn)} (al soltarlo)`, `With a short tap on ${b(btn)} (on release)`) : tr(`Al pulsar ${b(btn)}`, `On pressing ${b(btn)}`);
          add(G.b, `buttons.${btn}.${k}`, `${btn} → ${k}: [${list.join(', ')}]`,
            k === 'always' ? tr(`${alPulsar}, en cualquier estado: ${acts(list)}.`, `${alPulsar}, in any state: ${acts(list)}.`)
                           : tr(`${alPulsar} en ${b(k.replace(/^in\s+/, ''))}: ${acts(list)}.`, `${alPulsar} in ${b(k.replace(/^in\s+/, ''))}: ${acts(list)}.`));
        }
    for (const [w, def] of Object.entries(B.looks))
      for (const [k, a] of Object.entries(def)){
        const parts = [];
        if (a.text !== undefined) parts.push(tr(`dice «${esc(a.text)}»`, `shows «${esc(a.text)}»`));
        if (a.color !== undefined) parts.push(tr(`se pinta de ${COL[a.color] || esc(a.color)}`, `turns ${COL[a.color] || esc(a.color)}`));
        const hab = habilitadoDe(a);
        if (hab !== undefined) parts.push(hab ? tr('se puede tocar', 'can be touched') : tr('no se puede tocar', 'cannot be touched'));
        /* "a, b y c": una sola conjunción al final */
        const lista = l => l.length < 2 ? (l[0] || '') : l.slice(0, -1).join(', ') + tr(' y ', ' and ') + l[l.length - 1];
        add(G.a, `looks.${w}.${k}`, `${w} → ${k}: { ${Object.entries(a).map(([x, y]) => `${x}: ${y}`).join(', ')} }`,
          tr(`En ${b(k.replace(/^in\s+/, ''))}, ${b(w)} ${lista(parts)}.`, `In ${b(k.replace(/^in\s+/, ''))}, ${b(w)} ${lista(parts)}.`));
      }
  }
  return out;
}

/* ------------------------------------------------ ayudas para bloques */
/* Mete un programa suelto dentro de un bloque con nombre */
function toBlock(text, name){
  return name + ':\n' + String(text).replace(/\s+$/, '').split('\n').map(l => l.trim() ? '  ' + l : '').join('\n') + '\n';
}
/* Los nombres de bloque de un texto (vacío si va suelto) */
function blockNames(text){
  const d = parse(text).data || {};
  return Object.keys(d).filter(k => !SECTIONS.includes(k));
}
/* true si el texto va suelto: todo lo de primer nivel son secciones */
function isFlat(text){
  const k = Object.keys(parse(text).data || {});
  return k.length > 0 && k.every(x => SECTIONS.includes(x));
}

/* =====================================================================
 * DICCIONARIO — lo leen la ayuda del editor y la documentación
 * ================================================================== */
const HELP = {
  variables: { cat: 'sección', txt: 'Aquí nacen los números que la lógica necesita y no vienen del hardware: los <b>setting</b> (un valor que el usuario ajusta), los <b>timer</b> (un tiempo que cuenta), los <b>flag</b> (un sí o un no) y los <b>counter</b> (un número que se cuenta de uno en uno). Las salidas y entradas —un relé, un sensor— no se declaran aquí: nacen en la pestaña Hardware y aquí se usan por su nombre.', ej: 'variables:\n  duration: { type: setting, unit: s, range: [5, 600], step: 5, start: 15 }\n  time:     { type: timer, from: duration, counts: down }' },
  start_in:  { cat: 'sección', txt: 'El estado en el que arranca el aparato al encenderse.', ej: 'start_in: READY' },
  click:     { cat: 'sección', txt: 'Un pitido de confirmación: cada vez que se pulsa un botón que hace algo, esta salida se enciende un momento (0,05 s, o lo que digas con <b>for</b>). Va una sola vez, arriba, junto a <b>start_in</b>. No pisa nada: si esa salida ya está sonando (un aviso, un <b>hold</b> o un <b>pulse</b> del mismo botón), se queda como está. Para que suene <b>un solo</b> botón, en vez de click pon el pitido en su acción: <b>always: [increase clock, pulse bip for 0.05]</b>.', ej: 'click: bip\nclick: bip for 0.08' },
  after:     { cat: 'dentro de un estado', txt: 'Lo que se hace <b>una vez</b>, cuando el estado lleva ese tiempo (en segundos, o un setting). Sin timers ni condiciones: <b>after 3: [go to NEXT]</b> espera 3 segundos y sigue. Si se sale antes del estado, no pasa.', ej: 'after 3: [go to NEXT]\nafter wait: [turn off relay, go to IDLE]' },
  every:     { cat: 'dentro de un estado', txt: 'Lo que se hace <b>cada</b> ese tiempo mientras se está en el estado. La primera vez, al cumplirse el primer intervalo.', ej: 'every 1: [increase rounds]\nevery 0.5: [toggle led]\nevery wait: [pulse bip]' },
  'on hold': { cat: 'dentro de un botón', txt: 'Una <b>pulsación larga</b>: lo que se hace cuando el botón lleva ese tiempo pulsado (en segundos, o un setting). Se hace <b>una vez</b>, sin esperar a soltar. Si el botón tiene on hold, lo de <b>always</b> o <b>in ESTADO</b> pasa a ser un <b>toque corto</b>: se hace al soltarlo, solo si no llegó al tiempo. Así un mismo botón hace dos cosas. Uno por botón, y no junto a <b>repeat</b>.', ej: 'btn_start:\n  in IDLE: [go to RUNNING]\n  on hold 2: [restart rounds]\nbtn_reset:\n  on hold 3: [turn off fault, go to IDLE]\nbtn_minus:\n  always: [decrease duration]\n  on hold wait: [set duration to 60]' },
  'on release': { cat: 'dentro de un botón', txt: 'Lo que se hace <b>al soltar</b> el botón, en cualquier estado. Junto a <b>always</b> o <b>in ESTADO</b> (que actúan al pulsar) sirve para algo que dura mientras se pulsa.', ej: 'btn_door:\n  always: [turn on door]\n  on release: [turn off door]' },
  hold:      { cat: 'dentro de un botón', txt: 'Una salida que sigue al dedo: encendida mientras el botón está pulsado, apagada al soltarlo (también si el dedo se sale del botón). Es lo de una puerta o un avance manual.', ej: 'btn_door:\n  hold: door' },
  states:    { cat: 'sección', txt: 'Los momentos por los que pasa el aparato, en MAYÚSCULAS. Dentro de cada uno se escribe qué pasa al entrar (<b>on enter</b>), qué pasa mientras dura (<b>while</b>) y cuándo se sale (<b>if</b>).', ej: 'states:\n  COUNTING:\n    on enter: [turn on relay]\n    while: [count time]\n    if time == 0: [go to DONE]' },
  buttons:   { cat: 'sección', txt: 'Qué hace cada botón del lienzo al pulsarlo. Puede hacer cosas distintas según el estado: una fila <b>in ESTADO</b> por cada caso, o <b>always</b> para todos.', ej: 'buttons:\n  btn_main:\n    in READY:    [go to COUNTING]\n    in COUNTING: [go to PAUSED]' },
  looks:     { cat: 'sección', txt: 'Cómo se ve cada elemento del lienzo en cada estado: su <b>text</b>, su <b>color</b> y si se puede tocar (<b>enabled</b>). Lo que no se diga aquí se queda como está en el diseño. Varios elementos que se vean igual pueden compartir una fila, separando sus nombres por comas: <b>btn_1, btn_2, btn_3:</b>. Si la lista es larga, se parte: la línea que acaba en coma sigue en la de abajo.', ej: 'looks:\n  btn_main:\n    in READY:    { text: START, color: green }\n    in COUNTING: { text: STOP,  color: amber }\n  btn_config:\n    in COUNTING: { enabled: no }' },

  type:      { cat: 'dentro de una variable', txt: 'Qué clase de variable es: <b>setting</b>, <b>timer</b>, <b>flag</b> o <b>counter</b>.' },
  setting:   { cat: 'tipo de variable', txt: 'Un número que el usuario sube y baja con botones, siempre dentro de un rango. Se puede enlazar a un widget del lienzo para verlo.', ej: 'power: { type: setting, range: [0, 255], step: 1, start: 20 }\nduration: { type: setting, unit: s, range: [5, 600], step: 5, start: 60 }\nsetpoint: { type: setting, unit: kV, range: [0, 100], step: 0.1, start: 30 }' },
  counter:   { cat: 'tipo de variable', txt: 'Un <b>contador</b>: un número entero que empieza en <b>start</b> (0 si no se dice) y nunca baja de 0. <b>increase</b> le suma 1, <b>decrease</b> le resta 1, <b>restart</b> lo devuelve a su start y <b>set</b> le pone un valor. Sirve para contar vueltas, piezas o intentos, y para repetir algo un número de veces: <b>if rounds &gt;= 3</b>. Con <b>max</b>, no pasa de ahí. Se puede guardar con <b>save</b> y verse en un Número.', ej: 'rounds: { type: counter, start: 0 }\npieces: { type: counter, start: 0, max: 500 }\non enter: [increase rounds]\nalways: [decrease rounds]\nin IDLE: [restart rounds]\non enter: [set rounds to total * 2]\nif rounds >= total: [go to IDLE]\nif rounds == 3: [turn on relay]' },
  flag:      { cat: 'tipo de variable', txt: 'Una <b>bandera</b>: algo de sí o no que la lógica recuerda, como «hubo una falla» o «ya se calibró». Se enciende y se apaga como una salida (<b>turn on</b>, <b>turn off</b>, <b>toggle</b>, también <b>pulse</b> y <b>blink</b>), se pregunta con <b>if armed</b> o <b>if not armed</b>, se puede guardar con <b>save</b> y verse en un LED o un Número (SI/NO). Empieza en <b>no</b> si no se dice otra cosa.', ej: 'fault: { type: flag, start: no }\nready: { type: flag, start: yes }\non enter: [turn on fault]\nalways: [toggle fault]\nin IDLE: [turn off fault]\nif fault: [go to IDLE]\nif not fault and voltage < 10: [go to RUNNING]\nin IDLE: [save fault]' },
  timer:     { cat: 'tipo de variable', txt: 'Un tiempo en segundos que <b>solo corre cuando un estado se lo pide</b> con <b>count</b>. Enlazado a un widget Tiempo, se ve como mm:ss.', ej: 'left: { type: timer, from: duration, counts: down }\nelapsed: { type: timer, counts: up }' },
  unit:      { cat: 'dentro de un setting', txt: 'En qué se mide: s, °C, %, V… Solo sirve para mostrarlo.', ej: 'unit: s' },
  range:     { cat: 'dentro de un setting', txt: 'El mínimo y el máximo, entre corchetes. El valor nunca se sale de ahí.', ej: 'range: [5, 600]' },
  step:      { cat: 'dentro de un setting', txt: '<b>No es una variable ni una función</b>: es cuánto sube o baja el setting con cada <b>increase</b> o <b>decrease</b>.', ej: 'step: 5' },
  start:     { cat: 'dentro de un setting, una bandera o un contador', txt: 'El valor con el que arranca al encender el aparato: un número en un setting, <b>yes</b> o <b>no</b> en una bandera, un entero en un contador (si no se dice, 0). En un contador es también a donde vuelve con <b>restart</b>.', ej: 'start: 15\nstart: no\nstart: 0' },
  max:       { cat: 'dentro de un contador', txt: 'Hasta dónde cuenta: al llegar, <b>increase</b> ya no lo sube. Es opcional; sin max cuenta hasta 999999.', ej: 'pieces: { type: counter, start: 0, max: 500 }' },
  from:      { cat: 'dentro de un timer', txt: 'De qué setting toma su valor al hacer <b>restart</b>. Mientras no está contando, sigue a ese setting: si subes la duración, el timer se pone al nuevo valor. Solo en los que cuentan hacia atrás: uno con <b>counts: up</b> arranca en 0 y sube sin tope, así que no lo necesita (para pararlo, compáralo con <b>&gt;=</b>).', ej: 'from: duration' },
  counts:    { cat: 'dentro de un timer', txt: 'Hacia dónde cuenta: <b>down</b> (desde su valor hasta cero) o <b>up</b> (desde cero hacia arriba).', ej: 'counts: down' },
  down:      { cat: 'valor de counts', txt: 'Cuenta hacia atrás y se para en cero.' },
  up:        { cat: 'valor de counts', txt: 'Cuenta desde cero hacia arriba, sin límite.' },

  'on enter':{ cat: 'dentro de un estado', txt: 'Lo que se hace <b>una sola vez</b>, justo al llegar a este estado.', ej: 'on enter: [turn on relay]' },
  while:     { cat: 'dentro de un estado', txt: 'Lo que se hace <b>continuamente</b> mientras el aparato está en este estado. Es donde un timer cuenta.', ej: 'while: [count time]' },
  else:      { cat: 'dentro de un estado', txt: 'Lo que se hace cuando <b>ninguno</b> de los <b>if</b> de este estado se cumple. Se revisa a la vez que ellos, 20 veces por segundo: si uno se cumple, el else no se hace.', ej: 'if voltage > 50: [turn on fan]\nelse: [turn off fan]' },
  if:        { cat: 'dentro de un estado', txt: 'Una condición: en cuanto se cumple, se hacen las acciones de la derecha. Se escribe <b>if nombre comparación valor</b>. Comparaciones: &gt; &lt; &gt;= &lt;= == != · Cada lado puede ser una cuenta: <b>if voltage &gt;= setpoint * 0.9</b>. Se pueden unir varias con <b>and</b> (las dos) y <b>or</b> (una u otra), y negar una con <b>not</b>.', ej: 'if voltage >= setpoint: [go to HOLDING]\nif voltage >= setpoint * 0.9: [go to NEAR]\nif voltage - offset > setpoint: [go to IDLE]\nif hold_time == 0 or voltage == 0: [go to IDLE]\nif fault: [go to IDLE]\nif not fault: [go to RUNNING]\nif rounds >= total: [go to IDLE]' },
  is:        { cat: 'dentro de un if', txt: 'Pregunta en qué estado está <b>otro bloque</b>: <b>if cycle is RUNNING</b> se cumple mientras el bloque <b>cycle</b> está en <b>RUNNING</b>, e <b>is not</b> al revés. Se une con <b>and</b> y <b>or</b> como cualquier comparación. Solo pregunta: cambiar de estado a otro bloque no se puede, eso lo hace él.', ej: 'if cycle is RUNNING: [turn on lamp]\nif cycle is not RUNNING: [turn off lamp]\nif motor is RUNNING and temperature > 60: [go to WARNING]\nif pump is FULL or pump is OFF: [go to IDLE]' },
  and:       { cat: 'dentro de un if', txt: 'Une dos comparaciones: el <b>if</b> se cumple solo si se cumplen <b>las dos</b>. También vale <b>&amp;&amp;</b>.', ej: 'if voltage >= setpoint and left == 0: [go to DONE]' },
  or:        { cat: 'dentro de un if', txt: 'Une dos comparaciones: basta con que se cumpla <b>una</b>. Si se mezclan con <b>and</b>, los and van primero (como multiplicar antes que sumar). También vale <b>||</b>.', ej: 'if left == 0 or voltage > 90: [go to IDLE]' },
  not:       { cat: 'dentro de un if', txt: 'Delante de una comparación, la invierte: se cumple cuando ella <b>no</b> se cumple.', ej: 'if not voltage > 90: [turn on relay]\nif not fault: [go to RUNNING]' },
  in:        { cat: 'dentro de un botón o de looks', txt: 'En qué estado vale esta fila. En los demás estados, la fila no cuenta.', ej: 'in READY: [go to COUNTING]' },
  always:    { cat: 'dentro de un botón', txt: 'La fila vale esté el aparato en el estado que esté.', ej: 'always: [go to READY]' },
  repeat:    { cat: 'dentro de un botón', txt: 'Con <b>yes</b>, al dejar pulsado el botón su acción se repite sola: la primera nada más tocar y, pasado un momento, unas diez veces por segundo mientras no sueltes. Ideal para subir y bajar un número con − y +.', ej: 'btn_plus:\n  always: [increase speed]\n  repeat: yes' },
  yes:       { cat: 'valor de repeat', txt: 'Sí: la acción se repite mientras el botón sigue pulsado.' },
  no:        { cat: 'valor de repeat', txt: 'No: una pulsación, una acción. Es lo que pasa si no se escribe repeat.' },

  'go to':   { cat: 'acción', txt: 'Cambia de estado.', ej: '[go to COUNTING]' },
  increase:  { cat: 'acción', txt: 'Suma el <b>step</b> a un setting, sin pasar del máximo de su range. En un contador, suma 1 (sin pasar de su max).', ej: 'always: [increase duration]\non enter: [increase rounds]\nevery 1: [increase rounds]' },
  decrease:  { cat: 'acción', txt: 'Resta el <b>step</b> a un setting, sin bajar del mínimo de su range. En un contador, resta 1 (sin bajar de 0).', ej: 'always: [decrease duration]\nalways: [decrease rounds]' },
  restart:   { cat: 'acción', txt: 'Vuelve a poner un timer en su valor de salida: el de su <b>from</b>, o cero si cuenta up. Un contador vuelve a su <b>start</b>.', ej: 'on enter: [restart left]\nin IDLE: [restart rounds]' },
  count:     { cat: 'acción', txt: 'Hace que un timer cuente. Solo tiene sentido dentro de <b>while</b>.', ej: 'while: [count time]' },
  'turn on': { cat: 'acción', txt: 'Enciende una salida de la pestaña Hardware, o pone en sí una bandera. Si la salida está en el otro nodo, la orden viaja sola por el enlace.', ej: '[turn on relay]\n[turn on fault]' },
  'turn off':{ cat: 'acción', txt: 'Apaga una salida de la pestaña Hardware, o pone en no una bandera.', ej: '[turn off relay]\n[turn off fault]' },
  toggle:    { cat: 'acción', txt: 'Cambia una salida de sí/no: si está encendida la apaga, y si está apagada la enciende. Con un botón, un interruptor de los de toda la vida.', ej: 'btn_light:\n  always: [toggle light]\nbtn_arm:\n  always: [toggle armed]' },
  pulse:     { cat: 'acción', txt: 'Enciende una salida y la apaga <b>sola</b> pasado ese tiempo (en segundos, o un setting; sin <b>for</b>, 0,1 s). No detiene nada: mientras tanto el resto sigue. Si se vuelve a pedir antes de acabar, empieza de nuevo. <b>turn on</b>, <b>turn off</b> o <b>toggle</b> sobre la misma salida lo cancelan.', ej: '[pulse bip for 0.1]\n[pulse door for 3]\n[pulse bip]\n[pulse bip for beep_time]' },
  blink:     { cat: 'acción', txt: 'Enciende y apaga una salida a un ritmo: <b>on</b> segundos encendida y <b>off</b> segundos apagada, una y otra vez. Sigue sola hasta que un <b>turn off</b>, <b>turn on</b> o <b>toggle</b> la para, o hasta lo que digas al final: <b>for</b> segundos en total o <b>times</b> veces. Acaba siempre apagada.', ej: '[blink led on 0.5 off 0.5]\n[blink bip on 2 off 2 for 14]\n[blink bip on 0.1 off 0.1 times 3]' },
  set:       { cat: 'acción', txt: 'Pone un <b>valor</b> a una salida con valor —un PWM—, a un setting o a un timer. El valor es un número, un nombre o una <b>cuenta</b> con <b>+ - * /</b> y paréntesis (primero * y /, como en la calculadora), y nunca se sale del rango de la salida o del setting. Dividir entre cero da 0. Para parar un motor por PWM: <b>set motor_pwm to 0</b>.', ej: '[set motor_pwm to 21]\n[set motor_pwm to power]\n[set motor_pwm to power * 2]\n[set motor_pwm to (power + 10) / 2]\n[set remaining to remaining + 30]\n[set rounds to 0]' },
  to:        { cat: 'dentro de set', txt: 'Separa lo que se cambia del valor que se le pone.', ej: '[set motor_pwm to 0]' },
  save:      { cat: 'acción', txt: 'Guarda el valor de un setting (o de una bandera) en la <b>memoria de la placa</b> (la NVS), que no se borra al apagarla. Úsalo en un botón «Guardar»: cada escritura gasta un poco la flash, por eso no vale dentro de <b>while</b>.', ej: '[save hold_time]\n[save fault]\n[save rounds]' },
  load:      { cat: 'acción', txt: 'Vuelve a poner en un setting el valor que se guardó con <b>save</b>, siempre dentro de su range. Si todavía no se guardó nada, el setting no cambia. En <b>on enter</b> del primer estado, carga lo guardado al encender.', ej: '[load hold_time]\n[load fault]\n[load rounds]' },

  text:      { cat: 'dentro de looks', txt: 'El texto que lleva el elemento en ese estado. Solo botones y textos.', ej: '{ text: STOP }' },
  color:     { cat: 'dentro de looks', txt: 'El color en ese estado: green, amber, blue, red, gray, white, o uno propio entre comillas.', ej: '{ color: amber }   { color: "#3b9dff" }' },
  enabled:   { cat: 'dentro de looks', txt: 'Si el elemento se puede tocar en ese estado. Con <b>no</b> se ve atenuado y no responde ni al dedo ni a los botones físicos. En los estados que no lo digan, se puede tocar.', ej: 'in RUNNING: { enabled: no }' },
  disabled:  { cat: 'dentro de looks', txt: 'Lo mismo que <b>enabled</b>, pero al revés: con <b>yes</b> el elemento queda bloqueado en ese estado. Usa el que se lea mejor; en una misma fila va uno u otro, no los dos.', ej: 'in RUNNING: { disabled: yes }' },
};

/* El diccionario en inglés: [categoría, explicación]. Los ejemplos (ej)
   son sintaxis y valen para los dos idiomas: se toman de HELP. */
const HELP_EN_TXT = {
  variables: ['section', 'This is where the numbers the logic needs, and that do not come from the hardware, are created: <b>setting</b> (a value the user adjusts), <b>timer</b> (a time that counts), <b>flag</b> (a yes or a no) and <b>counter</b> (a number counted one by one). Outputs and inputs — a relay, a sensor — are not declared here: they are created in the Hardware tab and used here by name.'],
  start_in:  ['section', 'The state the device starts in when powered on.'],
  click:     ['section', 'A confirmation beep: every time a button that does something is pressed, this output turns on for a moment (0.05 s, or what you say with <b>for</b>). It goes once, at the top, next to <b>start_in</b>. It never overrides anything: if that output is already sounding (a warning, a <b>hold</b> or a <b>pulse</b> from the same button), it is left as it is. To make <b>only one</b> button beep, instead of click put the beep in its action: <b>always: [increase clock, pulse bip for 0.05]</b>.'],
  after:     ['inside a state', 'What is done <b>once</b>, when the state has lasted that long (in seconds, or a setting). No timers or conditions: <b>after 3: [go to NEXT]</b> waits 3 seconds and moves on. If the state is left earlier, it does not happen.'],
  every:     ['inside a state', 'What is done <b>every</b> that long while in the state. The first time, when the first interval is up.'],
  'on hold': ['inside a button', 'A <b>long press</b>: what is done when the button has been held for that time (in seconds, or a setting). It is done <b>once</b>, without waiting for the release. If the button has on hold, what <b>always</b> or <b>in STATE</b> say becomes a <b>short tap</b>: it is done on release, only if the time was not reached. That way one button does two things. One per button, and not together with <b>repeat</b>.'],
  'on release': ['inside a button', 'What is done <b>on releasing</b> the button, in any state. Next to <b>always</b> or <b>in STATE</b> (which act on pressing) it is for something that lasts while pressed.'],
  hold:      ['inside a button', 'An output that follows the finger: on while the button is held, off when released (also if the finger slides off the button). Like a door or a manual jog.'],
  states:    ['section', 'The moments the device goes through, in CAPITALS. Inside each one you write what happens on entering (<b>on enter</b>), what happens while it lasts (<b>while</b>) and when it is left (<b>if</b>).'],
  buttons:   ['section', 'What each button on the canvas does when pressed. It can do different things depending on the state: one <b>in STATE</b> row per case, or <b>always</b> for all of them.'],
  looks:     ['section', 'How each canvas element looks in each state: its <b>text</b> and its <b>color</b>. Anything not stated here stays as it is in the design.'],
  type:      ['inside a variable', 'What kind of variable it is: <b>setting</b>, <b>timer</b>, <b>flag</b> or <b>counter</b>.'],
  setting:   ['variable type', 'A number the user raises and lowers with buttons, always within a range. It can be bound to a canvas widget to see it.'],
  counter:   ['variable type', 'A <b>counter</b>: a whole number that starts at <b>start</b> (0 if not given) and never goes below 0. <b>increase</b> adds 1, <b>decrease</b> subtracts 1, <b>restart</b> takes it back to its start and <b>set</b> gives it a value. Use it to count rounds, pieces or attempts, and to repeat something a number of times: <b>if rounds &gt;= 3</b>. With <b>max</b>, it does not go past it. It can be saved with <b>save</b> and shown on a Number.'],
  flag:      ['variable type', 'A <b>flag</b>: something yes/no the logic remembers, like "there was a fault" or "already calibrated". It is turned on and off like an output (<b>turn on</b>, <b>turn off</b>, <b>toggle</b>, also <b>pulse</b> and <b>blink</b>), asked with <b>if armed</b> or <b>if not armed</b>, can be saved with <b>save</b> and shown on an LED or a Number (YES/NO). It starts at <b>no</b> unless told otherwise.'],
  timer:     ['variable type', 'A time in seconds that <b>only runs when a state asks it to</b> with <b>count</b>. Bound to a Time widget, it shows as mm:ss.'],
  unit:      ['inside a setting', 'What it is measured in: s, °C, %, V… It is only used for display.'],
  range:     ['inside a setting', 'The minimum and the maximum, in brackets. The value never goes outside them.'],
  step:      ['inside a setting', '<b>It is not a variable or a function</b>: it is how much the setting goes up or down with each <b>increase</b> or <b>decrease</b>.'],
  start:     ['inside a setting, a flag or a counter', 'The value it starts with when the device is powered on: a number in a setting, <b>yes</b> or <b>no</b> in a flag, a whole number in a counter (0 if not given). In a counter it is also where <b>restart</b> takes it back to.'],
  max:       ['inside a counter', 'How far it counts: once there, <b>increase</b> no longer raises it. It is optional; without max it counts up to 999999.'],
  from:      ['inside a timer', 'Which setting it takes its value from on <b>restart</b>. While it is not counting, it follows that setting: if you raise the duration, the timer takes the new value. Only for timers that count down: one with <b>counts: up</b> starts at 0 and goes up with no limit, so it does not need it (to stop it, compare it with <b>&gt;=</b>).'],
  counts:    ['inside a timer', 'Which way it counts: <b>down</b> (from its value to zero) or <b>up</b> (from zero upwards).'],
  down:      ['value of counts', 'Counts down and stops at zero.'],
  up:        ['value of counts', 'Counts up from zero, with no limit.'],
  'on enter':['inside a state', 'What is done <b>only once</b>, right on arriving at this state.'],
  while:     ['inside a state', 'What is done <b>continuously</b> while the device is in this state. It is where a timer counts.'],
  else:      ['inside a state', 'What is done when <b>none</b> of the <b>if</b>s in this state holds. It is checked together with them, 20 times per second: if one holds, the else is not done.'],
  if:        ['inside a state', 'A condition: as soon as it is met, the actions on the right are done. Written <b>if name comparison value</b>. Comparisons: &gt; &lt; &gt;= &lt;= == != · Each side can be a calculation: <b>if voltage &gt;= setpoint * 0.9</b>. Several can be joined with <b>and</b> (both) and <b>or</b> (either), and one can be negated with <b>not</b>.'],
  is:        ['inside an if', 'Asks which state <b>another block</b> is in: <b>if cycle is RUNNING</b> holds while block <b>cycle</b> is in <b>RUNNING</b>, and <b>is not</b> the other way round. It is joined with <b>and</b> and <b>or</b> like any comparison. It only asks: changing another block\'s state is not possible, that block does it.'],
  and:       ['inside an if', 'Joins two comparisons: the <b>if</b> holds only if <b>both</b> hold. <b>&amp;&amp;</b> also works.'],
  or:        ['inside an if', 'Joins two comparisons: it is enough for <b>one</b> to hold. When mixed with <b>and</b>, the ands go first (like multiplying before adding). <b>||</b> also works.'],
  not:       ['inside an if', 'In front of a comparison, it inverts it: it holds when that comparison does <b>not</b> hold.'],
  in:        ['inside a button or looks', 'The state this row applies to. In the other states, the row does not count.'],
  always:    ['inside a button', 'The row applies whatever state the device is in.'],
  repeat:    ['inside a button', 'With <b>yes</b>, holding the button down repeats its action on its own: the first time right on touching and, after a moment, about ten times per second until you let go. Ideal for raising and lowering a number with − and +.'],
  yes:       ['value of repeat', 'Yes: the action repeats while the button stays pressed.'],
  no:        ['value of repeat', 'No: one press, one action. This is what happens if repeat is not written.'],
  'go to':   ['action', 'Changes state.'],
  increase:  ['action', 'Adds the <b>step</b> to a setting, without going over the maximum of its range. On a counter, adds 1 (without going past its max).'],
  decrease:  ['action', 'Subtracts the <b>step</b> from a setting, without going below the minimum of its range. On a counter, subtracts 1 (without going below 0).'],
  restart:   ['action', 'Puts a timer back to its starting value: that of its <b>from</b>, or zero if it counts up. A counter goes back to its <b>start</b>.'],
  count:     ['action', 'Makes a timer count. It only makes sense inside <b>while</b>.'],
  'turn on': ['action', 'Turns on an output from the Hardware tab, or sets a flag to yes. If the output is on the other node, the order travels over the link by itself.'],
  'turn off':['action', 'Turns off an output from the Hardware tab, or sets a flag to no.'],
  toggle:    ['action', 'Flips an on/off output: if it is on it turns off, and if it is off it turns on. With a button, a classic switch.'],
  pulse:     ['action', 'Turns an output on and turns it off <b>by itself</b> after that time (in seconds, or a setting; without <b>for</b>, 0.1 s). It does not stop anything: meanwhile everything else carries on. Asked again before it ends, it starts over. <b>turn on</b>, <b>turn off</b> or <b>toggle</b> on the same output cancel it.'],
  blink:     ['action', 'Turns an output on and off at a pace: <b>on</b> seconds on and <b>off</b> seconds off, again and again. It carries on by itself until a <b>turn off</b>, <b>turn on</b> or <b>toggle</b> stops it, or until what you say at the end: <b>for</b> seconds in total or <b>times</b> times. It always ends off.'],
  set:       ['action', 'Gives a <b>value</b> to an output with a value — a PWM —, to a setting or to a timer. The value is a number, a name or a <b>calculation</b> with <b>+ - * /</b> and brackets (* and / first, as on a calculator), and it never goes outside the range of the output or the setting. Dividing by zero gives 0. To stop a motor driven by PWM: <b>set motor_pwm to 0</b>.'],
  to:        ['inside set', 'Separates what is changed from the value it is given.'],
  save:      ['action', 'Saves the value of a setting (or a flag) to the <b>board memory</b> (NVS), which is not erased when the board is powered off. Use it on a "Save" button: every write wears the flash a little, which is why it is not allowed inside <b>while</b>.'],
  load:      ['action', 'Puts back into a setting the value saved with <b>save</b>, always within its range. If nothing has been saved yet, the setting does not change. In the <b>on enter</b> of the first state, it loads the saved value at power-on.'],
  text:      ['inside looks', 'The text the element shows in that state. Buttons and labels only.'],
  color:     ['inside looks', 'The color in that state: green, amber, blue, red, gray, white, or your own in quotes.'],
  disabled:  ['inside looks', 'The other way round from <b>enabled</b>: with <b>yes</b> the element is blocked in that state. Use whichever reads better; one row takes one of them, not both.'],
  enabled:   ['inside looks', 'Whether the element can be touched in that state. With <b>no</b> it looks dimmed and responds neither to a finger nor to physical buttons. In states that do not say it, it can be touched.'],
};
const HELP_EN = Object.fromEntries(Object.entries(HELP).map(([k, h]) =>
  [k, HELP_EN_TXT[k] ? { cat: HELP_EN_TXT[k][0], txt: HELP_EN_TXT[k][1], ...(h.ej ? { ej: h.ej } : {}) } : h]));

const GROUPS = [
  ['Secciones', ['variables', 'start_in', 'click', 'states', 'buttons', 'looks']],
  ['Tipos de variable', ['setting', 'timer', 'flag', 'counter']],
  ['Lo que lleva una variable', ['type', 'unit', 'range', 'step', 'start', 'max', 'from', 'counts', 'down', 'up']],
  ['Dentro de un estado', ['on enter', 'while', 'if', 'else', 'after', 'every']],
  ['Condiciones', ['and', 'or', 'not', 'is']],
  ['Dentro de un botón', ['in', 'always', 'repeat', 'on release', 'on hold', 'hold']],
  ['Acciones', VERBS],
  ['Aspecto', ['text', 'color', 'enabled', 'disabled']],
];
const GROUPS_EN_NAMES = ['Sections', 'Variable types', 'What a variable has', 'Inside a state', 'Conditions', 'Inside a button', 'Actions', 'Looks'];
const GROUPS_EN = GROUPS.map(([, ws], i) => [GROUPS_EN_NAMES[i], ws]);

/* =====================================================================
 * RECETAS — un aparato completo: hardware, lienzo y lógica
 *
 * Una receta no funciona solo con su texto: necesita que existan el relé
 * y los botones a los que se refiere. Por eso trae las tres partes, y el
 * editor crea las que falten al aplicarla.
 * ================================================================== */
const RECIPES = {
  timer: {
    title: 'Temporizador con relé',
    summary: 'Se ajusta la duración con − y +. START arranca, STOP pausa, RESUME sigue, y al llegar a cero se apaga el relé. Si la temperatura pasa de 60 °C mientras cuenta, se pausa solo.',
    teaches: ['setting y timer', 'un botón que hace cosas distintas según el estado', 'on enter y while', 'una condición con un sensor', 'cambiar texto y color'],
    hardware: [
      { clave: 'relay', tipo: 'gpio-out', que: 'módulo de relé' },
      { clave: 'temperature', tipo: 'adc-in', que: 'sensor analógico de temperatura (LM35 o termistor)', params: { unidad: '°C', escala_min: 0, escala_max: 100 } },
    ],
    widgets: [
      { nombre: 'clock',     tipo: 'tiempo', x: 24,  y: 96,  w: 440, h: 200, bind: 'time', fuente: 48 },
      { nombre: 'dial',      tipo: 'lectura', x: 500, y: 96,  w: 276, h: 90,  bind: 'duration', fuente: 32 },
      { nombre: 'btn_minus', tipo: 'button', x: 500, y: 210, w: 130, h: 86,  texto: '-', fuente: 32 },
      { nombre: 'btn_plus',  tipo: 'button', x: 646, y: 210, w: 130, h: 86,  texto: '+', fuente: 32 },
      { nombre: 'btn_reset', tipo: 'button', x: 24,  y: 360, w: 220, h: 90,  texto: 'RESET', fuente: 32 },
      { nombre: 'btn_main',  tipo: 'button', x: 420, y: 360, w: 356, h: 90,  texto: 'START', fuente: 32 },
    ],
    logic:
`# Numbers the logic needs that do not come from the hardware
variables:
  duration: { type: setting, unit: s, range: [5, 600], step: 5, start: 15 }
  time:     { type: timer, from: duration, counts: down }

# The moments the device goes through
start_in: READY
states:
  READY:
    on enter: [turn off relay]
  COUNTING:
    on enter: [turn on relay]
    while: [count time]
    if time == 0: [go to DONE]
    if temperature > 60: [go to PAUSED]
  PAUSED:
    on enter: [turn off relay]
  DONE:
    on enter: [turn off relay]

# What each button does, depending on the state
buttons:
  btn_minus:
    in READY: [decrease duration]
    repeat: yes
  btn_plus:
    in READY: [increase duration]
    repeat: yes
  btn_reset:
    always: [restart time, go to READY]
  btn_main:
    in READY:    [go to COUNTING]
    in COUNTING: [go to PAUSED]
    in PAUSED:   [go to COUNTING]
    in DONE:     [restart time, go to READY]

# How each element looks in each state
looks:
  btn_main:
    in READY:    { text: START,  color: green }
    in COUNTING: { text: STOP,   color: amber }
    in PAUSED:   { text: RESUME, color: green }
    in DONE:     { text: OK,     color: blue }
  clock:
    in COUNTING: { color: amber }
`,
  },

  thermostat: {
    title: 'Termostato',
    summary: 'Mantiene la temperatura en la consigna encendiendo una calefacción. La consigna se ajusta con − y +; ON y OFF lo arrancan y lo paran.',
    teaches: ['condiciones que comparan dos valores', 'un estado que sale y vuelve solo', 'always en un botón'],
    hardware: [
      { clave: 'heater', tipo: 'gpio-out', que: 'relé de la calefacción' },
      { clave: 'temperature', tipo: 'adc-in', que: 'sensor analógico de temperatura', params: { unidad: '°C', escala_min: 0, escala_max: 100 } },
    ],
    widgets: [
      { nombre: 'reading',   tipo: 'lectura', x: 24,  y: 96,  w: 440, h: 200, bind: 'temperature', fuente: 48 },
      { nombre: 'dial',      tipo: 'lectura', x: 500, y: 96,  w: 276, h: 90,  bind: 'setpoint', fuente: 32 },
      { nombre: 'btn_minus', tipo: 'button', x: 500, y: 210, w: 130, h: 86,  texto: '-', fuente: 32 },
      { nombre: 'btn_plus',  tipo: 'button', x: 646, y: 210, w: 130, h: 86,  texto: '+', fuente: 32 },
      { nombre: 'btn_off',   tipo: 'button', x: 24,  y: 360, w: 220, h: 90,  texto: 'OFF', fuente: 32 },
      { nombre: 'btn_on',    tipo: 'button', x: 420, y: 360, w: 356, h: 90,  texto: 'ON', fuente: 32 },
    ],
    logic:
`variables:
  setpoint: { type: setting, unit: °C, range: [10, 40], step: 1, start: 22 }

start_in: IDLE
states:
  IDLE:
    on enter: [turn off heater]
  WAITING:
    on enter: [turn off heater]
    if temperature < setpoint: [go to HEATING]
  HEATING:
    on enter: [turn on heater]
    if temperature >= setpoint: [go to WAITING]

buttons:
  btn_minus:
    always: [decrease setpoint]
    repeat: yes
  btn_plus:
    always: [increase setpoint]
    repeat: yes
  btn_off:
    always: [go to IDLE]
  btn_on:
    in IDLE: [go to WAITING]

looks:
  btn_on:
    in IDLE:    { text: ON,      color: green }
    in WAITING: { text: RUNNING, color: gray }
    in HEATING: { text: HEATING, color: amber }
  reading:
    in HEATING: { color: amber }
`,
  },

  traffic: {
    title: 'Semáforo',
    summary: 'Tres luces que se turnan solas, cada una con su tiempo. PAUSE lo deja en ámbar hasta que se pulsa RESUME.',
    teaches: ['varios timers, uno por fase', 'estados que avanzan solos', 'restart al entrar en un estado', 'looks en varios elementos a la vez'],
    hardware: [
      { clave: 'light_red',   tipo: 'gpio-out', que: 'LED rojo' },
      { clave: 'light_amber', tipo: 'gpio-out', que: 'LED ámbar' },
      { clave: 'light_green', tipo: 'gpio-out', que: 'LED verde' },
    ],
    widgets: [
      { nombre: 'led_red',   tipo: 'led',    x: 60,  y: 90,  w: 90,  h: 90 },
      { nombre: 'led_amber', tipo: 'led',    x: 60,  y: 200, w: 90,  h: 90 },
      { nombre: 'led_green', tipo: 'led',    x: 60,  y: 310, w: 90,  h: 90 },
      { nombre: 'btn_pause', tipo: 'button', x: 420, y: 360, w: 356, h: 90, texto: 'PAUSE', fuente: 32 },
    ],
    logic:
`# One setting and one timer per light: each phase counts its own time
variables:
  red_time:   { type: setting, unit: s, range: [3, 60], step: 1, start: 8 }
  green_time: { type: setting, unit: s, range: [3, 60], step: 1, start: 6 }
  amber_time: { type: setting, unit: s, range: [1, 10], step: 1, start: 2 }
  red_left:   { type: timer, from: red_time,   counts: down }
  green_left: { type: timer, from: green_time, counts: down }
  amber_left: { type: timer, from: amber_time, counts: down }

start_in: RED
states:
  RED:
    on enter: [turn on light_red, turn off light_amber, turn off light_green, restart red_left]
    while: [count red_left]
    if red_left == 0: [go to GREEN]
  GREEN:
    on enter: [turn off light_red, turn on light_green, restart green_left]
    while: [count green_left]
    if green_left == 0: [go to AMBER]
  AMBER:
    on enter: [turn off light_green, turn on light_amber, restart amber_left]
    while: [count amber_left]
    if amber_left == 0: [go to RED]
  PAUSED:
    on enter: [turn off light_red, turn off light_green, turn on light_amber]

buttons:
  btn_pause:
    in PAUSED: [go to RED]
    always:    [go to PAUSED]

# What is not said here stays as in the design
looks:
  led_red:
    in RED:    { color: red }
  led_green:
    in GREEN:  { color: green }
  led_amber:
    in AMBER:  { color: amber }
    in PAUSED: { color: amber }
  btn_pause:
    in PAUSED: { text: RESUME, color: green }
`,
  },
  gate: {
    title: 'Portón con aviso',
    summary: 'AUTO abre el portón 5 segundos, lo deja abierto 10 avisando cada 2 y lo cierra con tres pitidos. MANUAL lo mueve solo mientras lo mantienes pulsado, y BELL suena mientras lo pulsas. Cada botón confirma con un pitido corto.',
    teaches: ['esperar sin timers: after', 'repetir cada tanto: every', 'pulse y blink: encender un rato o a un ritmo', 'hold y on release: un botón que sigue al dedo', 'click y toggle'],
    hardware: [
      { clave: 'motor',  tipo: 'gpio-out', que: 'relé del motor del portón' },
      { clave: 'lamp',   tipo: 'gpio-out', que: 'lámpara de aviso' },
      { clave: 'buzzer', tipo: 'gpio-out', que: 'zumbador' },
    ],
    widgets: [
      { nombre: 'btn_auto',   tipo: 'button', x: 24,  y: 110, w: 356, h: 100, texto: 'AUTO', fuente: 32 },
      { nombre: 'btn_manual', tipo: 'button', x: 420, y: 110, w: 356, h: 100, texto: 'MANUAL', fuente: 32 },
      { nombre: 'btn_lamp',   tipo: 'button', x: 24,  y: 250, w: 356, h: 100, texto: 'LAMP', fuente: 32 },
      { nombre: 'btn_bell',   tipo: 'button', x: 420, y: 250, w: 356, h: 100, texto: 'BELL', fuente: 32 },
    ],
    logic:
`# No timers needed: after and every count the time in each state
start_in: CLOSED
# a short beep every time a button does something
click: buzzer

states:
  CLOSED:
    on enter: [turn off motor]
  OPENING:
    on enter: [turn on motor, blink lamp on 0.5 off 0.5]
    after 5: [go to OPEN]
  OPEN:
    on enter: [turn off motor, turn on lamp]
    every 2: [pulse buzzer for 0.1]
    after 10: [go to CLOSING]
  CLOSING:
    on enter: [blink buzzer on 0.2 off 0.2 times 3]
    after 2: [turn off lamp, go to CLOSED]

buttons:
  btn_auto:
    in CLOSED: [go to OPENING]
  # the motor runs only while the finger is on the button
  btn_manual:
    hold: motor
  btn_lamp:
    always: [toggle lamp]
  # a doorbell that rings while pressed: the same as hold, written out
  btn_bell:
    always: [turn on buzzer]
    on release: [turn off buzzer]

looks:
  btn_auto:
    in OPENING: { text: OPENING, color: amber }
    in OPEN:    { text: OPEN, color: green }
    in CLOSING: { text: CLOSING, color: amber }
`,
  },
};

/* Las recetas en inglés: solo cambian los textos que se leen; el
   hardware, el lienzo y la lógica son los mismos. */
const RECIPES_EN_TXT = {
  timer: {
    title: 'Timer with relay',
    summary: 'The duration is set with − and +. START starts, STOP pauses, RESUME continues, and at zero the relay turns off. If the temperature goes over 60 °C while counting, it pauses by itself.',
    teaches: ['setting and timer', 'a button that does different things depending on the state', 'on enter and while', 'a condition with a sensor', 'changing text and color'],
    que: { relay: 'relay module', temperature: 'analog temperature sensor (LM35 or thermistor)' },
  },
  thermostat: {
    title: 'Thermostat',
    summary: 'Keeps the temperature at the setpoint by turning on a heater. The setpoint is set with − and +; ON and OFF start and stop it.',
    teaches: ['conditions that compare two values', 'a state that leaves and comes back by itself', 'always on a button'],
    que: { heater: 'heater relay', temperature: 'analog temperature sensor' },
  },
  traffic: {
    title: 'Traffic light',
    summary: 'Three lights that take turns by themselves, each with its own time. PAUSE holds it on amber until RESUME is pressed.',
    teaches: ['several timers, one per phase', 'states that move on by themselves', 'restart on entering a state', 'looks on several elements at once'],
    que: { light_red: 'red LED', light_amber: 'amber LED', light_green: 'green LED' },
  },
  gate: {
    title: 'Gate with warning',
    summary: 'AUTO opens the gate for 5 seconds, keeps it open for 10 with a warning every 2, and closes it with three beeps. MANUAL moves it only while you hold it down, and BELL rings while you press it. Every button confirms with a short beep.',
    teaches: ['waiting without timers: after', 'repeating now and then: every', 'pulse and blink: on for a while or at a pace', 'hold and on release: a button that follows the finger', 'click and toggle'],
    que: { motor: 'gate motor relay', lamp: 'warning lamp', buzzer: 'buzzer' },
  },
};
function recetasEn(){
  return Object.fromEntries(Object.entries(RECIPES).map(([k, r]) => {
    const e = RECIPES_EN_TXT[k]; if (!e) return [k, r];
    return [k, { ...r, title: e.title, summary: e.summary, teaches: e.teaches,
                 hardware: r.hardware.map(h => ({ ...h, que: (e.que && e.que[h.clave]) || h.que })) }];
  }));
}

/* HELP, GROUPS, RECIPES, COLOR_ES y VERB_ES se leen en el idioma elegido.
   En español son exactamente los objetos de siempre. */
const API = { SECTIONS, TYPES, banderaInicial, topeContador, inicioContador, KEYS, VERBS, VERB_ARG, RE_ACTION, RE_SET, RE_SET_CUENTA, RE_IF, RE_CMP, condPartes, expresion, nombresDe, pintaExpr, calcula, RE_PULSE, RE_BLINK, RE_AFTER, RE_EVERY, RE_ONHOLD, RE_CLICK, PULSO_DEF, CLICK_DEF, COLORS, APAGABLES, habilitadoDe, mencionaHabilitado,
              parse, validate, suggest, classify, highlightLine, sentences, toBlock, blockNames, isFlat, esc, setLang };
Object.defineProperties(API, {
  lang:     { enumerable: true, get: () => LANG },
  HELP:     { enumerable: true, get: () => LANG === 'en' ? HELP_EN : HELP },
  GROUPS:   { enumerable: true, get: () => LANG === 'en' ? GROUPS_EN : GROUPS },
  RECIPES:  { enumerable: true, get: () => LANG === 'en' ? recetasEn() : RECIPES },
  COLOR_ES: { enumerable: true, get: () => LANG === 'en' ? COLOR_EN : COLOR_ES_ },
  VERB_ES:  { enumerable: true, get: () => LANG === 'en' ? VERB_EN : VERB_ES },
});
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else raiz.LOGICA = API;
})(typeof window !== 'undefined' ? window : globalThis);
