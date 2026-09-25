/* Empaqueta lv_font_conv 1.5.3 (el mismo que usa fuentes/generar.cmd) en
   un solo archivo para el navegador: TelarStudio/lv-font-conv.js.

   Sin descargar nada: sale de la copia que npx dejo en la cache. Cada
   modulo se envuelve en function(module, exports, require) y lo que es
   solo de Node (fs, path, util, assert, process, Buffer) se cambia por un
   sustituto minimo. Se reutiliza el propio lib/cli.js: asi las opciones
   se interpretan exactamente igual que en la linea de ordenes. */
'use strict';
const fs = require('fs'), path = require('path');
/* la carpeta del paquete lv_font_conv (con su node_modules): la que deja npx
   en su cache al ejecutar generar.cmd una vez, o la de un npm install */
const RAIZ = process.argv[3] || path.join(__dirname, 'lvfc');
const SALIDA = process.argv[2] || path.join(__dirname, '..', 'lv-font-conv.js');

/* lo que no se lleva: se sustituye por estos modulos */
const SUSTITUTOS = {
  fs: 'SUST_fs', path: 'SUST_path', util: 'SUST_util', assert: 'SUST_assert',
  mkdirp: 'SUST_mkdirp', debug: 'SUST_debug', pngjs: 'SUST_vacio',
};
/* el volcado a PNG (--format dump) no se usa y arrastraria zlib y streams */
const FUERA = [path.join(RAIZ, 'lib', 'writers', 'dump.js')];

const modulos = new Map();   // ruta -> { id, codigo, deps: {peticion: id|sustituto} }
let n = 0;

function resolver(desde, pet){
  if (SUSTITUTOS[pet]) return SUSTITUTOS[pet];
  let base;
  if (pet.startsWith('.')) base = path.resolve(path.dirname(desde), pet);
  else {
    /* un paquete: primero junto a lv_font_conv, luego en su node_modules */
    const dir = path.join(RAIZ, 'node_modules', pet);
    const pk = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    base = path.join(dir, pk.main || 'index.js');
  }
  for (const c of [base, base + '.js', path.join(base, 'index.js')])
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return FUERA.includes(c) ? 'SUST_vacio' : c;
  throw new Error(`No encuentro ${pet} desde ${desde}`);
}

function anadir(ruta){
  if (modulos.has(ruta)) return modulos.get(ruta).id;
  const m = { id: n++, codigo: fs.readFileSync(ruta, 'utf8'), deps: {} };
  /* un .json (cli.js lee package.json para --version) es un modulo que lo exporta */
  if (ruta.endsWith('.json')){ m.codigo = 'module.exports = ' + m.codigo + ';'; modulos.set(ruta, m); return m.id; }
  modulos.set(ruta, m);
  /* require('x') literales; los que estan dentro de funciones de Node
     (opentype.load con fs) tambien se resuelven, al sustituto */
  /* se buscan sin comentarios: app_error.js tiene un require('es6-error')
     comentado que no hay que llevar */
  const sinComent = m.codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ 	]*\/\/.*$/gm, '');
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g; let r;
  while ((r = re.exec(sinComent))){
    const pet = r[1];
    if (m.deps[pet] !== undefined) continue;
    const dest = resolver(ruta, pet);
    m.deps[pet] = typeof dest === 'string' && dest.startsWith('SUST_') ? dest : anadir(dest);
  }
  return m.id;
}

const entrada = anadir(path.join(RAIZ, 'lib', 'cli.js'));
const appError = anadir(path.join(RAIZ, 'lib', 'app_error.js'));

const cuerpo = [...modulos.values()].sort((a, b) => a.id - b.id).map(m =>
  `/* ${m.id} */ [function(module, exports, require){\n${m.codigo}\n}, ${JSON.stringify(m.deps)}]`).join(',\n');

const ver = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;

const texto = `/* =====================================================================
 * lv_font_conv ${ver}, empaquetado para el navegador
 *
 * El conversor de fuentes de LVGL (https://github.com/lvgl/lv_font_conv),
 * el MISMO que ejecuta fuentes/generar.cmd, sin Node ni linea de ordenes:
 * Telar Studio genera las fuentes al exportar. Lo genera
 * empaquetar_lvfc.js a partir del paquete de npm; no se edita a mano.
 *
 * Licencias: lv_font_conv (MIT), FreeType (FTL), opentype.js (MIT),
 * argparse (PSF-2.0), bit-buffer (MIT), make-error (ISC),
 * tiny-inflate (MIT), string.prototype.codepointat (MIT).
 * ===================================================================== */
(function (raiz) {
'use strict';

/* ---- Buffer: lo que usa el conversor, sobre Uint8Array ---- */
class Buffer extends Uint8Array {
  static alloc(n, relleno){ const b = new Buffer(n); if (relleno) b.fill(relleno); return b; }
  static from(x, cod){
    if (typeof x === 'string'){
      if (cod === 'base64'){ const s = atob(x), b = new Buffer(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
      return Buffer.from(new TextEncoder().encode(x));
    }
    if (x instanceof ArrayBuffer) return new Buffer(x);            /* como en Node: comparte memoria */
    const b = new Buffer(x.length); b.set(x); return b;
  }
  static concat(lista, total){
    if (total === undefined) total = lista.reduce((s, x) => s + x.length, 0);
    const b = Buffer.alloc(total); let o = 0;
    for (const x of lista){ if (o >= total) break; const t = x.subarray(0, total - o); b.set(t, o); o += t.length; }
    return b;
  }
  static isBuffer(x){ return x instanceof Buffer; }
  _dv(){ return this.__dv || (this.__dv = new DataView(this.buffer, this.byteOffset, this.byteLength)); }
  /* escribir un texto (las etiquetas de 4 letras de las tablas): utf8, sin pasarse del final */
  write(txt, o = 0){ const b = new TextEncoder().encode(String(txt)).subarray(0, Math.max(0, this.length - o)); this.set(b, o); return b.length; }
  copy(dest, dIni = 0, oIni = 0, oFin = this.length){ const t = this.subarray(oIni, oFin); dest.set(t, dIni); return t.length; }
  writeUInt8(v, o = 0){ this._dv().setUint8(o, v); return o + 1; }
  writeInt8(v, o = 0){ this._dv().setInt8(o, v); return o + 1; }
  writeUInt16LE(v, o = 0){ this._dv().setUint16(o, v, true); return o + 2; }
  writeInt16LE(v, o = 0){ this._dv().setInt16(o, v, true); return o + 2; }
  writeUInt32LE(v, o = 0){ this._dv().setUint32(o, v, true); return o + 4; }
  writeInt32LE(v, o = 0){ this._dv().setInt32(o, v, true); return o + 4; }
  readUInt8(o = 0){ return this._dv().getUint8(o); }
  readUInt16LE(o = 0){ return this._dv().getUint16(o, true); }
  readUInt32LE(o = 0){ return this._dv().getUint32(o, true); }
  readInt16LE(o = 0){ return this._dv().getInt16(o, true); }
  readInt32LE(o = 0){ return this._dv().getInt32(o, true); }
}

/* ---- process: los argumentos y los errores ---- */
let salidaErr = '';
const process = {
  argv: ['node', 'lv_font_conv'], env: {}, platform: 'browser', cwd: () => '/',
  stdout: { write: s => { salidaErr += s; }, columns: 100 },
  stderr: { write: s => { salidaErr += s; } },
  exit: c => { const e = new Error(salidaErr.trim() || ('lv_font_conv termino con ' + c)); salidaErr = ''; throw e; },
};

/* ---- archivos: se leen de lo que se le pasa y se escriben a un objeto ---- */
let ENTRADA = {}, SALIDA = {};
const SUST = {
  SUST_fs: {
    readFileSync: (p, cod) => {
      if (!(p in ENTRADA)) { const e = new Error('ENOENT: ' + p); e.code = 'ENOENT'; throw e; }
      const b = Buffer.from(ENTRADA[p]); return cod ? new TextDecoder().decode(b) : b;
    },
    writeFileSync: (p, d) => { SALIDA[p] = d; },
    existsSync: p => p in ENTRADA,
  },
  SUST_path: {
    sep: '/',
    basename: (p, ext) => { let b = String(p).split(/[\\\\/]/).pop(); if (ext && b.endsWith(ext)) b = b.slice(0, -ext.length); return b; },
    extname: p => { const b = String(p).split(/[\\\\/]/).pop(), i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; },
    dirname: p => { const i = String(p).search(/[\\\\/][^\\\\/]*$/); return i > 0 ? p.slice(0, i) : '.'; },
    join: (...a) => a.join('/'), resolve: (...a) => a.join('/'),
  },
  SUST_util: {
    inspect: Object.assign(x => { try { return JSON.stringify(x); } catch (e) { return String(x); } }, { custom: Symbol('inspect') }),
    deprecate: f => f, format: (...a) => a.join(' '),
  },
  SUST_assert: Object.assign((c, m) => { if (!c) throw new Error(m || 'assert'); }, { ok: (c, m) => { if (!c) throw new Error(m || 'assert'); } }),
  SUST_mkdirp: Object.assign(() => {}, { sync: () => {} }),
  SUST_debug: () => Object.assign(() => {}, { enabled: false }),
  SUST_vacio: {},
};

const MODULOS = [
${cuerpo}
];
const cache = {};
function cargar(id){
  if (cache[id]) return cache[id].exports;
  const [fn, deps] = MODULOS[id], module = { exports: {} };
  cache[id] = module;
  fn.call(module.exports, module, module.exports, pet => {
    const d = deps[pet];
    if (typeof d === 'string') return SUST[d];
    if (d === undefined) throw new Error('lv_font_conv: modulo no empaquetado: ' + pet);
    return cargar(d);
  });
  return module.exports;
}

/* convertir(['--font', 'X.ttf', '--size', '48', ...], { 'X.ttf': Uint8Array })
   -> { 'src/ui/fuente.c': texto }. Las opciones, igual que en la linea de
   ordenes; los archivos, por su nombre. Una conversion cada vez. */
let cola = Promise.resolve();
function convertir(argv, archivos){
  const tarea = cola.then(async () => {
    ENTRADA = archivos || {}; SALIDA = {}; salidaErr = '';
    process.argv = ['node', 'lv_font_conv', ...argv];
    await cargar(${entrada}).run(argv);
    const r = SALIDA; SALIDA = {}; ENTRADA = {};
    return r;
  });
  cola = tarea.catch(() => {});
  return tarea;
}
raiz.LvFontConv = { convertir, version: ${JSON.stringify(ver)}, AppError: () => cargar(${appError}) };
})(typeof self !== 'undefined' ? self : this);
`;
fs.writeFileSync(SALIDA, texto);
console.log('escrito', SALIDA, Math.round(texto.length / 1024) + ' KB,', modulos.size, 'modulos');
