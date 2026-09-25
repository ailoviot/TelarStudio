/* Copia Telar Studio (la carpeta de arriba) a web/, que es lo que va dentro de
   la aplicacion. Solo lo que usa la pagina: el .html, los scripts que
   carga (leidos de sus <script src>), los que carga despues
   (lv-font-conv.js), la documentacion y las licencias de las fuentes.
   Asi no se cuelan copias de seguridad (.antes, .bak) ni herramientas.
   Uso: node copiar-web.js [carpeta de Telar Studio; por defecto, la de arriba] */
'use strict';
const fs = require('fs'), path = require('path');
const ORIGEN = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const DESTINO = path.join(__dirname, 'web');
const PAGINA = 'telar-studio.html';

const html = fs.readFileSync(path.join(ORIGEN, PAGINA), 'utf8');
const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
/* los que la pagina carga a demanda, no con <script src> */
const aDemanda = ['lv-font-conv.js'];
const sueltos = [PAGINA, ...new Set([...scripts, ...aDemanda])];

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });
let n = 0, bytes = 0;
const copiar = rel => {
  const o = path.join(ORIGEN, rel), d = path.join(DESTINO, rel);
  if (!fs.existsSync(o)) throw new Error('Falta ' + o);
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.copyFileSync(o, d); n++; bytes += fs.statSync(o).size;
};
for (const f of sueltos) copiar(f);
for (const f of fs.readdirSync(path.join(ORIGEN, 'docs'))) if (/\.html$/.test(f)) copiar('docs/' + f);
/* las fuentes van dentro de fuentes-datos.js; sus licencias (OFL) viajan con ellas */
for (const f of fs.readdirSync(path.join(ORIGEN, 'fuentes'))) if (/\.txt$/i.test(f)) copiar('fuentes/' + f);

console.log(`web/: ${n} archivos, ${(bytes / 1048576).toFixed(1)} MB (desde ${ORIGEN})`);
