/* =====================================================================
 * LA PESTAÑA LÓGICA
 *
 * El texto es la fuente: E.logica. El lenguaje —lector, validación,
 * colores, frases, diccionario y recetas— está entero en logica.js; aquí
 * solo está lo que ve y toca el alumno.
 *
 * Mientras se escribe NO se repinta el editor entero: pintarPanel()
 * destruiría el cuadro de texto bajo el cursor. Solo se actualizan la
 * capa de colores, los errores y la ayuda. Al salir de la pestaña se
 * repinta todo, para que el lienzo vea los setting y timer nuevos.
 *
 * Los colores "mientras se escribe" son la técnica de siempre: un
 * <textarea> con el texto transparente, encima de una capa <pre> con el
 * mismo texto coloreado, con la misma letra, el mismo alto de línea y el
 * mismo desplazamiento.
 * ================================================================== */
(function(){
'use strict';

const $ = id => document.getElementById(id);
const L = () => window.LOGICA;
const LG = { vista: 'codigo', errores: [], modelo: null, marcas: { decl: 0, usos: new Set() }, palabra: null, activa: false, espera: null };
const ALTO = 22;   /* alto de línea: el mismo en la capa, el texto y los números */

/* ------------------------------------------------------------ estilo */
document.head.insertAdjacentHTML('beforeend', `<style id="lg-estilo">
.lg-escena{flex:1;display:flex;flex-direction:column;min-height:0}
.lg-barra{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--borde);background:#12151b}
.lg-barra .btn.activo{background:#1d3a63;border-color:var(--acento)}
.lg-pista{margin-left:auto;font:11px var(--mono);color:var(--debil);text-transform:uppercase;letter-spacing:.1em}
.lg-editor{flex:1;display:flex;min-height:0;background:#0f1116}
.lg-numeros{flex:0 0 52px;overflow:hidden;padding:12px 0;text-align:right;font:13px/${ALTO}px var(--mono);color:#4a5263;user-select:none;border-right:1px solid #1d212a}
.lg-numeros span{display:block;height:${ALTO}px;padding-right:12px}
.lg-numeros span.mal{color:var(--error);font-weight:700}
.lg-area{flex:1;position:relative;min-width:0}
.lg-capa,.lg-texto{position:absolute;inset:0;margin:0;border:0;padding:12px 16px;box-sizing:border-box;
  font:14px/${ALTO}px var(--mono);letter-spacing:0;tab-size:2;white-space:pre;overflow:hidden}
.lg-capa{color:#c7cfdb;pointer-events:none}
.lg-capa .lg-linea{display:block;min-height:${ALTO}px;margin:0 -16px;padding:0 16px}
.lg-capa .lg-linea.mal{background:color-mix(in srgb,var(--error) 14%,transparent);box-shadow:inset 3px 0 0 var(--error)}
.lg-capa .lg-linea.decl{background:color-mix(in srgb,var(--acento) 20%,transparent);box-shadow:inset 3px 0 0 var(--acento)}
.lg-capa .lg-linea.uso{background:rgba(255,255,255,.05);box-shadow:inset 3px 0 0 #6b7280}
.lg-texto{background:transparent;color:transparent;caret-color:#e6e9ef;resize:none;outline:none;overflow:auto}
.lg-texto::selection{background:rgba(59,157,255,.35);color:transparent}
.lg-texto::placeholder{color:#5c6577}
.lg-k{color:#8fb8ff} .lg-kw{color:#c9a0ff} .lg-v{color:#9fe0bf} .lg-nm{color:#ffd89a} .lg-n{color:#f5c07a}
.lg-s{color:#b5e8c9} .lg-cm{color:#6b7a90;font-style:italic} .lg-p{color:#6b7280} .lg-op{color:#f0a3a3}
.lg-st{color:#e6f1ff;background:#23324a;border-radius:3px}
.lg-capa b{font-weight:inherit}
.lg-frases{flex:1;overflow:auto;padding:10px 0}
.lg-frases h4{margin:14px 20px 4px;font:11px var(--mono);text-transform:uppercase;letter-spacing:.1em;color:#7fa6d8}
.lg-fr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;padding:6px 20px;border-top:1px dashed #262b36;cursor:pointer}
.lg-fr:hover{background:rgba(255,255,255,.04)}
.lg-fr code{font:12.5px/1.5 var(--mono);color:#9fb3cf;white-space:pre-wrap;word-break:break-word}
.lg-fr span{font-size:13.5px;color:#dfe6f1}
.lg-fr span b{color:#ffd89a;font-weight:600}
.lg-estado{font:12px var(--mono);margin:2px 0 8px}
.lg-estado.ok{color:var(--ok)} .lg-estado.mal{color:var(--error)} .lg-estado.vacia{color:var(--tenue)}
.lg-err{display:flex;gap:9px;width:100%;text-align:left;background:color-mix(in srgb,var(--error) 9%,var(--panel));
  border:1px solid color-mix(in srgb,var(--error) 35%,var(--borde));border-radius:6px;padding:6px 9px;margin-top:6px;
  color:var(--texto);font:12.5px/1.45 var(--ui);cursor:pointer}
.lg-err b.l{font:600 11.5px var(--mono);color:var(--error);white-space:nowrap;padding-top:1px}
.lg-ay-cab{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.lg-ay-cab code{font:700 13.5px var(--mono);color:#cfe3ff}
.lg-ay-cab small{font:10.5px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:#7fa6d8}
.lg-ay-txt{font-size:12.5px;color:#d3dae6;line-height:1.5}
.lg-ay-ej{margin:6px 0 0;background:#0f1116;border:1px solid var(--borde);border-radius:6px;padding:5px 8px;font:12px/1.5 var(--mono);color:#c7cfdb;overflow-x:auto;white-space:pre}
.lg-sug{display:flex;flex-direction:column;gap:4px;max-height:260px;overflow-y:auto}
.lg-sug button{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;background:#1b2638;border:1px solid #2a3b55;
  border-radius:6px;padding:5px 8px;color:var(--texto);font:12px/1.35 var(--ui);cursor:pointer}
.lg-sug button:hover,.lg-sug button:focus-visible{border-color:var(--acento);outline:none}
.lg-sug code{font:600 12px var(--mono);color:#cfe3ff}
.lg-sug span{color:var(--tenue)}
.lg-receta{border-top:1px solid var(--borde);padding:9px 0}
.lg-receta:first-of-type{border-top:0}
.lg-receta b{display:block;font-size:13px}
.lg-receta p{margin:3px 0 7px;font-size:12px;color:var(--tenue);line-height:1.45}
/* cabecera fija del panel: el estado de la logica y las dos acciones */
.lg-cab{position:sticky;top:-16px;z-index:6;margin:-16px -16px 4px;padding:14px 16px 12px;background:var(--panel);
  border-bottom:2px solid var(--borde)}
.lg-cab:has(.lg-estado.ok){border-bottom-color:color-mix(in srgb,var(--ok) 70%,var(--borde))}
.lg-cab:has(.lg-estado.mal){border-bottom-color:var(--error)}
.lg-cab .lg-estado{margin:0 0 10px;font:600 12px var(--mono)}
.lg-cab-botones{display:grid;grid-template-columns:1fr;gap:6px}
.lg-cab-botones .btn{padding:7px 6px;font-size:12px}
details.sec > summary .cuenta.mal{color:var(--error);font-weight:700}
/* el indice */
.ind-bloque{display:block;width:100%;text-align:left;background:none;border:0;padding:6px 0 4px;cursor:pointer;
  font:600 12px var(--mono);color:var(--texto)}
.ind-bloque:hover{color:var(--acento)}
.ind-fila{display:grid;grid-template-columns:74px minmax(0,1fr);gap:8px;align-items:start;padding:5px 0}
.ind-sec{background:none;border:0;padding:3px 0 0;text-align:left;cursor:pointer;font-size:11px;color:var(--debil)}
.ind-sec:hover{color:var(--texto)}
.ind-chips{display:flex;flex-wrap:wrap;gap:4px}
.ind-chip{font:11.5px var(--mono);padding:2px 7px;border-radius:5px;background:var(--panel2);border:1px solid var(--borde);
  color:var(--tenue);cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ind-chip:hover{border-color:#3d4452;color:var(--texto)}
.ind-chip.aqui{border-color:var(--acento);color:var(--texto);background:color-mix(in srgb,var(--acento) 16%,var(--panel2))}
.ind-chip.mal{border-color:color-mix(in srgb,var(--error) 60%,var(--borde));color:#f3c4c4}
.ind-chip.mal::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--error);margin-right:5px;vertical-align:1px}
/* donde esta el cursor, en la barra del editor */
.lg-donde{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;white-space:nowrap;text-transform:none;letter-spacing:0}
.lg-donde small{font:10.5px var(--mono);text-transform:uppercase;letter-spacing:.1em;color:var(--debil)}
.lg-donde b{font:600 12px var(--mono);color:#cfe3ff}
.lg-donde i{font-style:normal;color:var(--debil)}
</style>`);

/* ---------------------------------------------------------- escena */
const ESCENA = () => `<div class="lg-escena" id="lgEscena">
  <div class="lg-barra">
    <button class="btn activo" data-lgvista="codigo">${t('Código')}</button>
    <button class="btn" data-lgvista="frases">${t('Frases')}</button>
    <span class="lg-pista lg-donde" id="lgDonde">telar.yaml · logic</span>
  </div>
  <div class="lg-editor" id="lgEditor">
    <div class="lg-numeros" id="lgNumeros"></div>
    <div class="lg-area">
      <pre class="lg-capa" id="lgCapa" aria-hidden="true"></pre>
      <textarea class="lg-texto" id="lgTexto" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off"
        aria-label="${t('Lógica')}" placeholder="# ${t('Empieza por una receta del panel de la izquierda, o escribe aquí.')}&#10;# ${t('Pulsa cualquier palabra para saber qué es.')}"></textarea>
    </div>
  </div>
  <div class="lg-frases" id="lgFrases" hidden></div>
</div>`;

function escenaLogica(on){
  const escena = document.querySelector('.escena'); if (!escena) return;
  let caja = $('lgEscena');
  if (on && !caja){ escena.insertAdjacentHTML('beforeend', ESCENA()); caja = $('lgEscena'); conectarEscena(); }
  for (const hijo of escena.children) if (hijo !== caja) hijo.style.display = on ? 'none' : '';
  if (caja) caja.style.display = on ? '' : 'none';
  if (on){
    const ta = $('lgTexto');
    if (ta.value !== (E.logica || '')){ ta.value = E.logica || ''; recordarSeleccion(ta, true); }
    revalidar();
    verVista(LG.vista);
  } else if (LG.activa){
    HIST.confirmar();
    pintarLienzo();      /* el lienzo tiene que ver los setting y timer nuevos */
  }
  LG.activa = on;
}

/* ------------------------------------------------ editar como un editor
 *
 * Deshacer, rehacer, seleccionar todo, cortar, copiar y pegar los lleva el
 * propio editor, por dos razones medidas:
 *  - Tab, Enter con sangria, las sugerencias y las recetas cambian el texto
 *    por codigo, y el navegador no lo apunta en su historial: Ctrl+Z dejaba
 *    de funcionar en cuanto se pulsaba Enter.
 *  - Hay navegadores empotrados que entregan la tecla a la pagina pero no
 *    ejecutan el comando de edicion, ni siquiera en un textarea vacio.
 * Copiar, cortar y pegar se dejan al navegador si los hace (llega su evento);
 * si no, se hacen a mano con el portapapeles del sistema o uno interno. */
const HT = { pila: [], futuro: [], previo: null, ultimo: 0, tipoUltimo: '', forzar: false, aplicando: false, porta: '', nativo: {} };

function recordarSeleccion(ta, reiniciar){
  if (reiniciar || !HT.previo || HT.previo.v !== ta.value) HT.previo = { v: ta.value, s: ta.selectionStart, e: ta.selectionEnd };
  else { HT.previo.s = ta.selectionStart; HT.previo.e = ta.selectionEnd; }
}

/* Cada cambio deja en la pila como estaba ANTES. Letras seguidas se juntan
   en un solo paso, como en cualquier editor. */
function anotarCambio(ta, ev){
  if (HT.aplicando){ HT.previo = { v: ta.value, s: ta.selectionStart, e: ta.selectionEnd }; return; }
  if (!HT.previo) HT.previo = { v: '', s: 0, e: 0 };
  if (HT.previo.v === ta.value) return;
  const ahora = Date.now(), tipo = (ev && ev.inputType) || '';
  const escribiendo = !HT.forzar && /^(insertText|deleteContent)/.test(tipo);
  if (!(escribiendo && HT.tipoUltimo === 'escribir' && HT.pila.length && ahora - HT.ultimo < 800)){
    HT.pila.push(HT.previo);
    if (HT.pila.length > 300) HT.pila.shift();
  }
  HT.tipoUltimo = escribiendo ? 'escribir' : 'otro';
  HT.futuro.length = 0; HT.ultimo = ahora; HT.forzar = false;
  HT.previo = { v: ta.value, s: ta.selectionStart, e: ta.selectionEnd };
}

/* Un cambio hecho por codigo, que tambien se puede deshacer */
function editar(ta, texto, desde, hasta){
  HT.forzar = true;
  ta.setRangeText(texto, desde, hasta, 'end');
  ta.dispatchEvent(new Event('input'));
}

/* Una receta o un bloque nuevo sustituyen el texto entero: un paso mas */
function ponerTextoExterno(ta, texto){
  if (ta.value === texto) return;
  HT.pila.push({ v: ta.value, s: ta.selectionStart, e: ta.selectionEnd });
  HT.futuro.length = 0; HT.tipoUltimo = 'otro';
  ta.value = texto;
  HT.previo = { v: texto, s: 0, e: 0 };
}

function moverHistoria(ta, desde, hacia){
  if (!desde.length) return;
  hacia.push({ v: ta.value, s: ta.selectionStart, e: ta.selectionEnd });
  const p = desde.pop();
  HT.aplicando = true;
  ta.value = p.v;
  ta.setSelectionRange(Math.min(p.s, p.v.length), Math.min(p.e, p.v.length));
  ta.dispatchEvent(new Event('input'));
  HT.aplicando = false; HT.tipoUltimo = 'otro';
}

/* Devuelve true si la tecla era un comando de edicion y ya esta atendida */
function atajoEdicion(e, ta){
  const ctrl = (e.ctrlKey || e.metaKey) && !e.altKey, k = (e.key || '').toLowerCase();
  if (!ctrl) return false;
  if (k === 'z' && !e.shiftKey){ e.preventDefault(); moverHistoria(ta, HT.pila, HT.futuro); return true; }
  if (k === 'y' || (k === 'z' && e.shiftKey)){ e.preventDefault(); moverHistoria(ta, HT.futuro, HT.pila); return true; }
  if (k === 'a'){ e.preventDefault(); ta.select(); recordarSeleccion(ta); return true; }
  const s = ta.selectionStart, f = ta.selectionEnd, trozo = ta.value.slice(s, f);
  if (k === 'c' || k === 'x'){
    if (!trozo) return true;
    const ev = k === 'c' ? 'copy' : 'cut';
    HT.porta = trozo; HT.nativo[ev] = false;
    /* si el navegador lo hizo, llega su evento; si no, a mano */
    setTimeout(() => {
      if (HT.nativo[ev]) return;
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(trozo).catch(() => {});
      if (k === 'x' && ta.value.slice(s, f) === trozo) editar(ta, '', s, f);
    }, 60);
    return true;
  }
  if (k === 'v'){
    HT.nativo.paste = false;
    setTimeout(() => {
      if (HT.nativo.paste) return;
      const leer = navigator.clipboard && window.isSecureContext && navigator.clipboard.readText
        ? navigator.clipboard.readText().catch(() => HT.porta) : Promise.resolve(HT.porta);
      leer.then(txt => {
        txt = String(txt || '').replace(/\r\n?/g, '\n').replace(/\t/g, '  ');
        if (txt) editar(ta, txt, s, f);
      });
    }, 60);
    return true;
  }
  return false;
}

function conectarEscena(){
  const ta = $('lgTexto');
  recordarSeleccion(ta, true);
  ['copy', 'cut', 'paste'].forEach(ev => ta.addEventListener(ev, () => { HT.nativo[ev] = true; }));
  ta.addEventListener('select', () => recordarSeleccion(ta));
  ta.addEventListener('focus', () => HIST.iniciar());
  ta.addEventListener('input', e => {
    anotarCambio(ta, e);
    E.logica = ta.value;
    HIST.confirmarLuego(900);
    pintarCapa();                                   /* los colores, al instante */
    clearTimeout(LG.espera);
    LG.espera = setTimeout(() => { revalidar(); ayudaCursor(true); }, 160);
    sugerencias();
  });
  ta.addEventListener('scroll', sincronizar);
  ['click', 'keyup'].forEach(ev => ta.addEventListener(ev, e => {
    if (e.type === 'keyup' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    recordarSeleccion(ta);
    ayudaCursor(); sugerencias();
  }));
  ta.addEventListener('keydown', e => {
    if (atajoEdicion(e, ta)) return;
    const intro = (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (e.key === 'Tab'){
      /* Como en cualquier editor de codigo: sin seleccion, Tab mete dos
         espacios; con seleccion SANGRA las lineas tocadas en vez de
         sustituirlas (antes se borraban). Shift+Tab quita la sangria. */
      e.preventDefault();
      const s0 = ta.selectionStart, f0 = ta.selectionEnd, v = ta.value, NL = '\n';
      if (s0 === f0 && !e.shiftKey){ editar(ta, '  ', s0, f0); return; }
      const ini = v.lastIndexOf(NL, s0 - 1) + 1;
      const hasta = f0 > s0 && v[f0 - 1] === NL ? f0 - 1 : f0;   /* una seleccion que acaba al empezar linea no toca esa linea */
      let fin = v.indexOf(NL, hasta); if (fin < 0) fin = v.length;
      const lineas = v.slice(ini, fin).split(NL);
      const nuevas = lineas.map(l => e.shiftKey ? l.replace(/^ {1,2}/, '') : '  ' + l);
      const bloque = nuevas.join(NL);
      if (bloque === lineas.join(NL)) return;
      editar(ta, bloque, ini, fin);
      if (s0 === f0){
        const quitado = lineas[0].length - nuevas[0].length;
        const c = Math.max(ini, s0 - quitado);
        ta.setSelectionRange(c, c);
      } else ta.setSelectionRange(ini, ini + bloque.length);
      recordarSeleccion(ta);
    } else if (intro){
      /* Sangría automática: la de la línea de arriba, y dos más si terminaba en dos puntos */
      const antes = ta.value.slice(0, ta.selectionStart), linea = antes.slice(antes.lastIndexOf('\n') + 1);
      const sangria = linea.match(/^ */)[0] + (/:\s*$/.test(linea.replace(/\s+#.*$/, '')) ? '  ' : '');
      e.preventDefault(); editar(ta, '\n' + sangria, ta.selectionStart, ta.selectionEnd);
    }
  });
  document.querySelectorAll('[data-lgvista]').forEach(b => b.addEventListener('click', () => verVista(b.dataset.lgvista)));
}

function sincronizar(){
  const ta = $('lgTexto');
  $('lgCapa').scrollTop = ta.scrollTop; $('lgCapa').scrollLeft = ta.scrollLeft;
  $('lgNumeros').scrollTop = ta.scrollTop;
}

function verVista(v){
  LG.vista = v;
  document.querySelectorAll('[data-lgvista]').forEach(b => b.classList.toggle('activo', b.dataset.lgvista === v));
  $('lgEditor').style.display = v === 'codigo' ? '' : 'none';
  $('lgFrases').hidden = v !== 'frases';
  if (v === 'frases') pintarFrases();
}

/* ------------------------------------------------------ capa y estado */
function pintarCapa(){
  const txt = E.logica || '', lineas = txt.split('\n');
  const malas = new Set(LG.errores.map(e => e.line));
  $('lgCapa').innerHTML = lineas.map((l, i) => {
    const n = i + 1, cls = (malas.has(n) ? ' mal' : '') + (LG.marcas.decl === n ? ' decl' : '') + (LG.marcas.usos.has(n) ? ' uso' : '');
    return `<span class="lg-linea${cls}">${L().highlightLine(l) || ' '}</span>`;
  }).join('');
  $('lgNumeros').innerHTML = lineas.map((_, i) => `<span${malas.has(i + 1) ? ' class="mal"' : ''}>${i + 1}</span>`).join('');
  sincronizar();
}

function revalidar(){
  const r = logicaValidada();
  LG.errores = r.errors; LG.modelo = r.model;
  pintarCapa(); pintarErrores(); pintarEstado(); pintarIndice();
  if (LG.vista === 'frases') pintarFrases();
}

function pintarEstado(){
  const el = $('lgEstado'); if (!el) return;
  const vacia = !(E.logica || '').trim(), n = LG.errores.length;
  el.className = 'lg-estado ' + (vacia ? 'vacia' : n ? 'mal' : 'ok');
  el.textContent = vacia ? t('Todavía no hay lógica.') : n ? `${n} ${n === 1 ? t('cosa por arreglar') : t('cosas por arreglar')}` : t('✓ Válida: se exportará con el proyecto.');
}

function pintarErrores(){
  const el = $('lgErrores'); if (!el) return;
  el.innerHTML = LG.errores.length
    ? LG.errores.map(e => `<button class="lg-err" data-l="${e.line ?? ''}"><b class="l">${e.line ? t('línea') + ' ' + e.line : '—'}</b><span>${e.msg}</span></button>`).join('')
    : `<div class="regla">${t('Nada que arreglar.')}</div>`;
  el.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => irALinea(+b.dataset.l)));
  const c = document.querySelector('details[data-sec="lg-errores"] .cuenta');
  if (c){ c.textContent = LG.errores.length || ''; c.classList.toggle('mal', LG.errores.length > 0); }
}

function irALinea(n){
  if (!n) return;
  verVista('codigo');
  const ta = $('lgTexto'), ls = ta.value.split('\n');
  const ini = ls.slice(0, n - 1).reduce((s, l) => s + l.length + 1, 0);
  ta.focus(); ta.setSelectionRange(ini, ini + (ls[n - 1] || '').length);
  ta.scrollTop = Math.max(0, (n - 4) * ALTO); sincronizar();
  ayudaCursor(); sugerencias();
}

function pintarFrases(){
  const el = $('lgFrases'); if (!el) return;
  if (!LG.modelo){
    el.innerHTML = `<p class="regla" style="padding:10px 20px">${(E.logica || '').trim() ? t('Arregla lo que marca el panel para ver las frases.') : t('Todavía no hay lógica.')}</p>`;
    return;
  }
  const lines = L().parse(E.logica).lines;
  let grupo = '', html = '';
  for (const f of L().sentences(LG.modelo)){
    if (f.group !== grupo){ grupo = f.group; html += `<h4>${f.block ? esc(f.block) + ' · ' + t(grupo.slice(f.block.length + 3)) : t(grupo)}</h4>`; }
    html += `<div class="lg-fr" data-l="${lines[f.path] || ''}"><code>${esc(f.code)}</code><span>${f.text}</span></div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('[data-l]').forEach(r => r.addEventListener('click', () => irALinea(+r.dataset.l)));
}

/* -------------------------------------------------------------- ayuda */
function palabraEnCursor(){
  const ta = $('lgTexto'), p = ta.selectionStart, v = ta.value;
  const ini = v.lastIndexOf('\n', p - 1) + 1, fin = v.indexOf('\n', p);
  const linea = v.slice(ini, fin === -1 ? v.length : fin), col = p - ini;
  for (const f of ['on enter', 'go to', 'turn on', 'turn off']){
    let i = linea.indexOf(f);
    while (i >= 0){ if (col >= i && col <= i + f.length) return f; i = linea.indexOf(f, i + 1); }
  }
  const re = /[A-Za-z_]\w*|==|!=|>=|<=|>|</g; let m;
  while ((m = re.exec(linea))) if (col >= m.index && col <= m.index + m[0].length) return m[0];
  return null;
}

function usosDe(w, salvo){
  const re = new RegExp('(^|[^\\w])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[^\\w]|$)'), r = [];
  (E.logica || '').split('\n').forEach((l, i) => { if (i + 1 !== salvo && re.test(l.replace(/(^|\s)#.*$/, ''))) r.push(i + 1); });
  return r;
}

function ayudaCursor(forzar){
  const w = palabraEnCursor(), ta = $('lgTexto');
  const clave = w + '|' + ta.value.slice(0, ta.selectionStart).split('\n').length;
  marcarUbicacion();
  if (!forzar && clave === LG.clave) return;
  LG.palabra = w; LG.clave = clave;
  LG.marcas = { decl: 0, usos: new Set() };
  ayudaPalabra(w);
  pintarCapa();
}

/* ------------------------------------------------ indice y ubicacion
 * La estructura se saca del texto por sangria, no del lector: asi sale
 * aunque haya errores. Cada clave dice su linea y hasta donde llega. */
function estructura(){
  const txt = E.logica || '';
  if (LG.est && LG.est.txt === txt) return LG.est.items;
  const ls = txt.split('\n');
  const items = [];
  /* Una lista de nombres puede ocupar varias lineas («a, b,» y debajo
     «c, d:»): cuenta como una sola clave, en la linea donde empieza. */
  let lista = null;
  ls.forEach((l, i) => {
    const c = l.replace(/(^|\s)#.*$/, '');
    if (lista){
      const f = c.match(/^\s*([\w ,]*?)\s*:(\s|$)/);
      if (f){ items.push({ ...lista, key: (lista.key + ' ' + f[1]).trim() }); lista = null; return; }
      if (/^\s*[\w ,]*,\s*$/.test(c)){ lista.key += ' ' + c.trim(); return; }
      lista = null;
    }
    const sigue = c.match(/^(\s*)([A-Za-z_][\w ,]*,)\s*$/);
    if (sigue){ lista = { n: i + 1, ind: sigue[1].length, key: sigue[2] }; return; }
    const m = c.match(/^(\s*)([A-Za-z_][\w ,]*?)\s*:(\s|$)/);
    if (m) items.push({ n: i + 1, ind: m[1].length, key: m[2] });
  });
  items.forEach((it, j) => {
    let k = j + 1;
    while (k < items.length && items[k].ind > it.ind) k++;
    let fin = k < items.length ? items[k].n - 1 : ls.length;
    while (fin > it.n && !ls[fin - 1].trim()) fin--;          /* sin las lineas en blanco del final */
    it.fin = fin;
  });
  LG.est = { txt, items };
  return items;
}
/* los hijos directos de una clave: los de menor sangria dentro de ella */
function hijosDe(items, it){
  const dentro = items.filter(x => x.n > it.n && x.n <= it.fin);
  if (!dentro.length) return [];
  const ind = Math.min(...dentro.map(x => x.ind));
  return dentro.filter(x => x.ind === ind);
}
const SECCIONES_INDICE = { variables: 'Variables', states: 'Estados', buttons: 'Botones', looks: 'Aspecto' };

function pintarIndice(){
  const el = $('lgIndice'); if (!el) return;
  const items = estructura(), top = items.filter(x => x.ind === 0);
  const malas = LG.errores.map(e => e.line).filter(Boolean);
  const conError = it => malas.some(n => n >= it.n && n <= it.fin);
  const fila = sec => {
    const hijos = hijosDe(items, sec);
    return `<div class="ind-fila"><button type="button" class="ind-sec" data-l="${sec.n}">${esc(t(SECCIONES_INDICE[sec.key]))}</button>
      <div class="ind-chips">${hijos.length ? hijos.map(h => {
          /* una lista de nombres: el primero y cuantos mas, y entera al pasar el raton */
          const ns = h.key.split(',').map(x => x.trim()).filter(Boolean);
          const et = ns.length > 1 ? `${ns[0]} +${ns.length - 1}` : h.key;
          return `<button type="button" class="ind-chip${conError(h) ? ' mal' : ''}" data-l="${h.n}" data-fin="${h.fin}" title="${esc(ns.join(', '))}">${esc(et)}</button>`;
        }).join('')
        : `<span class="regla">—</span>`}</div></div>`;
  };
  const secciones = lista => lista.filter(x => SECCIONES_INDICE[x.key]).map(fila).join('');
  const bloques = top.filter(x => !L().SECTIONS.includes(x.key));
  let h = '';
  if (bloques.length && !top.some(x => L().SECTIONS.includes(x.key)))
    h = bloques.map(b => `<button type="button" class="ind-bloque" data-l="${b.n}">${esc(b.key)}</button>${secciones(hijosDe(items, b))}`).join('');
  else h = secciones(top);
  el.innerHTML = h || `<div class="regla">${t('Aún no hay nada. Empieza por una receta o escribe en el editor.')}</div>`;
  el.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => irALinea(+b.dataset.l)));
  marcarUbicacion();
}

/* Donde esta el cursor: en la barra del editor y marcado en el indice */
function marcarUbicacion(){
  const ta = $('lgTexto'); if (!ta) return;
  const n = ta.value.slice(0, ta.selectionStart).split('\n').length;
  const cadena = estructura().filter(x => x.n <= n && x.fin >= n);
  const d = $('lgDonde');
  if (d) d.innerHTML = cadena.length
    ? `<small>${t('Estás en')}</small> ${cadena.map(x => { const ns = x.key.split(',').map(y => y.trim()).filter(Boolean);
        return `<b>${esc(ns.length > 1 ? `${ns[0]} +${ns.length - 1}` : x.key)}</b>`; }).join('<i>›</i>')}`
    : 'telar.yaml · logic';
  document.querySelectorAll('#lgIndice .ind-chip').forEach(c => c.classList.toggle('aqui', n >= +c.dataset.l && n <= +c.dataset.fin));
}

function tarjeta(titulo, cat, cuerpo){
  const el = $('lgAyuda'); if (!el) return;
  el.innerHTML = `<div class="lg-ay-cab"><code>${esc(titulo)}</code><small>${cat}</small></div><div class="lg-ay-txt">${cuerpo}</div>`;
}
const ejemplo = txt => `<pre class="lg-ay-ej">${txt.split('\n').map(l => L().highlightLine(l)).join('\n')}</pre>`;

/* Los bloques del texto tal como está, aunque tenga errores. Si va
   suelto es un solo bloque sin nombre. */
function bloquesDelTexto(D){
  const S = L().SECTIONS, ks = Object.keys(D || {});
  if (!ks.length || ks.some(k => S.includes(k))) return [{ name: null, path: '', data: D || {} }];
  const bs = ks.filter(k => D[k] && typeof D[k] === 'object' && !Array.isArray(D[k])).map(k => ({ name: k, path: k + '.', data: D[k] }));
  /* Mientras se escribe el texto puede no ser ni suelto ni por bloques
     (una primera linea "READY: x"). Sin esto la lista salia vacia y la
     ayuda y las sugerencias leian BLS[0].data de nada. */
  return bs.length ? bs : [{ name: null, path: '', data: D || {} }];
}
const deObj = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};

function ayudaPalabra(w){
  const el = $('lgAyuda'); if (!el) return;
  if (!w){
    el.innerHTML = `<div class="lg-ay-txt">${t('Pon el cursor sobre cualquier palabra y aquí aparece qué es. Si es un nombre, se marca en azul la línea donde nace y en gris las líneas donde se usa.')}</div>`;
    return;
  }
  /* El nombre de un bloque, en su línea: antes que el diccionario, porque
     un bloque puede llamarse timer y timer también es un tipo */
  {
    const ta = $('lgTexto'), p = ta.selectionStart, ini = ta.value.lastIndexOf('\n', p - 1) + 1, txt = E.logica || '';
    if (ta.value.startsWith(w + ':', ini) && !L().isFlat(txt) && L().blockNames(txt).includes(w)){
      const ln = L().parse(txt).lines[w] || 0;
      LG.marcas = { decl: ln, usos: new Set() };
      tarjeta(w, t('bloque'), `${t('Nace en la línea')} <b>${ln}</b>. ${t('Una función con sus propios estados. Corre a la vez que los demás bloques.')}`);
      return;
    }
  }
  const H = L().HELP[w];
  if (H){ tarjeta(w, H.cat, H.txt + (H.ej ? ejemplo(H.ej) : '')); return; }

  const p = L().parse(E.logica || ''), D = p.data || {}, ctx = ctxLogica();
  const marca = (ruta, donde, desc) => {
    const ln = p.lines[ruta] || 0, usos = usosDe(w, ln);
    LG.marcas = { decl: ln, usos: new Set(usos) };
    tarjeta(w, donde, `${t('Nace en la línea')} <b>${ln}</b>. ${desc} ${usos.length ? `${t('Se usa en')} <b>${usos.join(', ')}</b>.` : t('Todavía no se usa en ningún sitio.')}`);
  };
  const BLS = bloquesDelTexto(D), V = {}, rutaV = {};
  for (const b of BLS) for (const [n, v] of Object.entries(deObj(b.data.variables)))
    if (!V[n]){ V[n] = v; rutaV[n] = b.path + 'variables.' + n; }
  if (V[w] && typeof V[w] === 'object'){
    const v = V[w];
    marca(rutaV[w], `variable · ${esc(v.type || '?')}`, v.type === 'setting'
      ? `Un ajuste de ${esc((v.range || [])[0])} a ${esc((v.range || [])[1])}${v.unit ? ' ' + esc(v.unit) : ''}, de ${esc(v.step)} en ${esc(v.step)}.`
      : v.type === 'timer' ? (v.counts === 'up' ? 'Un temporizador que cuenta hacia delante.' : `Un temporizador que cuenta hacia atrás desde <b>${esc(v.from)}</b>.`)
      : v.type === 'counter' ? `Un contador de enteros; empieza en <b>${esc(L().inicioContador(v))}</b>${typeof v.max === 'number' ? ` y llega hasta <b>${esc(v.max)}</b>` : ''}. Sube con increase, baja con decrease y vuelve a su start con restart.`
      : v.type === 'flag' ? `Una bandera de sí/no; empieza en <b>${L().banderaInicial(v) ? 'yes' : 'no'}</b>. Se cambia con turn on, turn off o toggle, y se pregunta con <b>if ${esc(w)}</b>.` : '');
    return;
  }
  const conEstado = BLS.find(b => w in deObj(b.data.states));
  if (conEstado){ marca(conEstado.path + 'states.' + w, conEstado.name ? `${t('estado del bloque')} ${esc(conEstado.name)}` : t('estado'), ''); return; }
  if (ctx.hardware[w]){
    const h = ctx.hardware[w], usos = usosDe(w, 0);
    LG.marcas = { decl: 0, usos: new Set(usos) };
    tarjeta(w, t('pieza de Hardware'), `${t('Nace en la pestaña')} <b>Hardware</b>${E.nodos.length > 1 ? ` (${t('nodo')} ${esc(h.donde)})` : ''}. ${h.lee ? t('Es una entrada: se lee y se puede comparar en un if.') : h.booleano ? t('Es una salida: se enciende con turn on y se apaga con turn off.') : t('Es una salida con valor (un PWM): se le da un valor con set, por ejemplo <b>set {x} to 21</b>.').replace('{x}', esc(w))} ${usos.length ? `${t('Se usa en')} <b>${usos.join(', ')}</b>.` : ''}`);
    return;
  }
  if (ctx.widgets[w]){
    const x = ctx.widgets[w], usos = usosDe(w, 0);
    LG.marcas = { decl: 0, usos: new Set(usos) };
    tarjeta(w, t('elemento del lienzo'), `${t('Nace en la pestaña')} <b>${t('Diseño')}</b>, ${t('en la pantalla')} <b>${esc(x.pantallas.join(', '))}</b>. ${x.tipo === 'button' ? t('Es un botón: en buttons se dice qué hace.') : t('Qué muestra se elige en su campo «Enlazado a».')}`);
    return;
  }
  if (w in L().COLORS){ tarjeta(w, 'color', `${esc(L().COLOR_ES[w])} <span style="display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:middle;background:${L().COLORS[w]}"></span>`); return; }
  if (/^(==|!=|>=|<=|>|<)$/.test(w)){ tarjeta(w, t('comparación'), '&gt; &lt; &gt;= &lt;= == != — ' + t('se usan en if.')); return; }
  tarjeta(w, t('desconocida'), t('Esta palabra no es del lenguaje ni un nombre que exista.') + L().suggest(w, [...L().VERBS, ...L().KEYS, ...L().SECTIONS, ...Object.keys(V), ...Object.keys(ctx.hardware), ...Object.keys(ctx.widgets)]));
}

/* ------------------------------------- mientras escribes: qué cabe aquí */
function sugerencias(){
  const el = $('lgSug'), ta = $('lgTexto'); if (!el || !ta) return;
  const antes = ta.value.slice(0, ta.selectionStart), lineas = antes.split('\n'), cur = lineas[lineas.length - 1];
  const ind = cur.match(/^ */)[0].length, pila = [];
  for (const l of lineas.slice(0, -1)){
    const s = l.replace(/\s+#.*$/, ''); if (!s.trim() || s.trim().startsWith('#')) continue;
    const i = s.match(/^ */)[0].length; while (pila.length && pila[pila.length - 1].ind >= i) pila.pop();
    const m = s.match(/^\s*([^:#{}\[\],"]+?)\s*:(\s|$)/); if (m) pila.push({ ind: i, k: m[1].trim() });
  }
  while (pila.length && pila[pila.length - 1].ind >= ind) pila.pop();
  const D = L().parse(E.logica || '').data || {}, SECS = L().SECTIONS;
  /* Dentro de un bloque con nombre todo va dos espacios más adentro */
  const bloque = ind > 0 && pila[0] && pila[0].ind === 0 && !SECS.includes(pila[0].k) ? pila[0].k : null;
  const base = bloque ? 2 : 0;
  const sec = ind === base ? null
    : bloque ? (pila[1] && pila[1].ind === 2 ? pila[1].k : null)
    : (pila[0] && pila[0].ind === 0 ? pila[0].k : null);
  const clave = (cur.match(/^\s*([^:#{}\[\],"]+?)\s*:/) || [])[1];
  const enCor = cur.lastIndexOf('[') > cur.lastIndexOf(']'), enLla = cur.lastIndexOf('{') > cur.lastIndexOf('}');
  const tras = k => new RegExp('\\b' + k + '\\s*:\\s*[^,{}\\[\\]]*$').test(cur);
  const trozo = cur.slice(Math.max(cur.lastIndexOf('['), cur.lastIndexOf(',')) + 1).trimStart();

  const ctx = ctxLogica(), H = L().HELP, BLS = bloquesDelTexto(D);
  const V = Object.assign({}, ...BLS.map(b => deObj(b.data.variables)));
  const este = BLS.find(b => b.name === bloque) || BLS[0];
  const ST = Object.keys(deObj(este.data.states));
  const deTipo = tp => Object.keys(V).filter(n => V[n] && V[n].type === tp);
  const salidas = [...Object.keys(ctx.hardware).filter(n => ctx.hardware[n].escribe && ctx.hardware[n].booleano), ...Object.keys(V).filter(n => V[n] && V[n].type === 'flag')];
  const legibles = [...Object.keys(V), ...Object.keys(ctx.hardware).filter(n => ctx.hardware[n].lee)];
  const botones = Object.keys(ctx.widgets).filter(n => ctx.widgets[n].tipo === 'button');
  let titulo = '', items = [];
  const it = (ins, lab, desc) => items.push({ ins, lab, desc });
  const palabras = ws => ws.forEach(w => it(w, w, H[w] ? H[w].txt : ''));

  const acciones = donde => {
    /* detras del nombre de un pulse o un blink: sus tiempos */
    const vt = trozo.match(/^(pulse|blink)\s+\w+\s+$/);
    if (vt){
      titulo = t('Cuánto dura');
      if (vt[1] === 'pulse'){ it('for 0.1', 'for 0.1', H.pulse.txt); it('for 1', 'for 1', H.pulse.txt); }
      else {
        it('on 0.5 off 0.5', 'on 0.5 off 0.5', H.blink.txt);
        it('on 0.5 off 0.5 for 10', 'on 0.5 off 0.5 for 10', H.blink.txt);
        it('on 0.1 off 0.1 times 3', 'on 0.1 off 0.1 times 3', H.blink.txt);
      }
      return;
    }
    /* detras de "set x to": un numero, un nombre o una cuenta */
    const vs = trozo.match(/^set\s+(\w+)\s+to\s+(.*)$/);
    if (vs){
      titulo = t('Un número, un nombre o una cuenta');
      const conNumero = [...Object.keys(V), ...Object.keys(ctx.hardware).filter(n => ctx.hardware[n].lee || !ctx.hardware[n].booleano)];
      if (!vs[2].trim()){
        it(`${vs[1]} + 1`, `${vs[1]} + 1`, t('una cuenta: + - * / y paréntesis'));
        it(`${vs[1]} * 2`, `${vs[1]} * 2`, t('una cuenta: + - * / y paréntesis'));
      }
      conNumero.forEach(n => it(n, n, V[n] ? V[n].type : t('pieza de Hardware')));
      return;
    }
    const vm = trozo.match(/^(go to|increase|decrease|restart|count|turn on|turn off|toggle|pulse|blink|set|save|load)\s+\S*$/);
    if (vm){
      const tipo = L().VERB_ARG[vm[1]];
      /* increase, decrease y restart valen tambien para un contador */
      const conCont = (vm[1] === 'increase' || vm[1] === 'decrease' || vm[1] === 'restart') ? deTipo('counter') : [];
      const lista = tipo === 'state' ? ST : tipo === 'output' ? salidas
        : tipo === 'valor' ? [...Object.keys(ctx.hardware).filter(n => ctx.hardware[n].escribe && !ctx.hardware[n].booleano), ...deTipo('setting'), ...deTipo('counter')] : [...deTipo(tipo), ...conCont];
      titulo = `${t('Detrás de')} ${vm[1]}`;
      lista.forEach(n => it(tipo === 'valor' ? n + ' to ' : n, n, tipo === 'state' ? t('estado') : tipo === 'output' ? t('salida de Hardware') : tipo === 'valor' ? t('salida con valor o setting') : tipo));
      if (!lista.length) titulo += ` — ${tipo === 'output' ? t('no hay salidas: añádelas en Hardware') : t('todavía no hay ninguno declarado')}`;
      return;
    }
    const valen = donde === 'while' ? ['count', 'turn on', 'turn off']
                : donde === 'on enter' ? ['turn on', 'turn off', 'toggle', 'pulse', 'blink', 'set', 'restart', 'increase', 'decrease', 'load', 'save'] : L().VERBS;
    titulo = t('Una acción');
    valen.forEach(v => it(v + ' ', v, H[v].txt));
  };

  if (ind === base && clave === 'start_in'){ titulo = t('Un estado'); ST.forEach(s => it(s, s, t('estado'))); }
  else if (ind === 0 && BLS[0].name){ titulo = t('Un bloque nuevo'); it('new_block:\n  ', 'new_block:', t('Una función más, con sus propios estados. Su nombre va en minúsculas; sus secciones, dos espacios más adentro.')); }
  else if (ind === base){ titulo = t('Una sección'); SECS.forEach(s => it(s === 'start_in' ? 'start_in: ' : s + ':\n' + ' '.repeat(base + 2), s, H[s].txt)); }
  else if (sec === 'variables'){
    if (!enLla){ titulo = t('Una variable nueva');
      it('new_setting: { type: setting, unit: s, range: [0, 100], step: 1, start: 0 }', 'setting', H.setting.txt);
      it(`new_timer: { type: timer, from: ${deTipo('setting')[0] || 'duration'}, counts: down }`, 'timer', H.timer.txt);
      it('new_flag: { type: flag, start: no }', 'flag', H.flag.txt);
      it('new_counter: { type: counter, start: 0 }', 'counter', H.counter.txt); }
    else if (tras('type')){ titulo = 'type'; palabras(['setting', 'timer', 'flag', 'counter']); }
    else if (tras('counts')){ titulo = 'counts'; palabras(['down', 'up']); }
    else if (tras('from')){ titulo = t('Un setting'); deTipo('setting').forEach(n => it(n, n, 'setting')); }
    else { const tp = (cur.match(/type:\s*(\w+)/) || [])[1]; titulo = tp ? tp : 'type'; palabras(tp && L().TYPES[tp] ? L().TYPES[tp].filter(k => k !== 'type') : ['type']); }
  }
  else if (sec === 'states'){
    if (ind <= base + 2){ titulo = t('Un estado nuevo'); it('NEW_STATE:\n' + ' '.repeat(base + 4), 'NEW_STATE:', t('En MAYÚSCULAS y con dos puntos. Lo que pase dentro va debajo, con dos espacios más.')); }
    else if (!enCor){
      titulo = t('Qué pasa en este estado');
      it('on enter: [', 'on enter', H['on enter'].txt); it('while: [', 'while', H.while.txt);
      legibles.filter(n => !(V[n] && V[n].type === 'flag')).slice(0, 4).forEach(n => it(`if ${n} > 0: [`, `if ${n} …`, H.if.txt));
      deTipo('flag').slice(0, 3).forEach(n => it(`if ${n}: [`, `if ${n}`, H.flag.txt));
      it('else: [', 'else', H.else.txt);
      /* el estado de otro bloque, si hay bloques con nombre */
      BLS.filter(x => x.name && x.name !== este.name).slice(0, 3).forEach(x => {
        const s0 = Object.keys(deObj(x.data.states))[0];
        if (s0) it(`if ${x.name} is ${s0}: [`, `if ${x.name} is …`, H.is.txt);
      });
      it('after 3: [', 'after …', H.after.txt);
      it('every 1: [', 'every …', H.every.txt);
    }
    else acciones(clave === 'while' || clave === 'on enter' ? clave : 'if');
  }
  else if (sec === 'buttons'){
    if (ind <= base + 2){ titulo = t('Un botón del lienzo'); botones.forEach(b => it(b + ':\n' + ' '.repeat(base + 4), b, t('botón en la pantalla') + ' ' + ctx.widgets[b].pantallas.join(', ')));
      if (!botones.length) titulo += ` — ${t('no hay botones: añádelos en Diseño')}`; }
    else if (!enCor){ titulo = t('Una fila del botón'); ST.forEach(s => it(`in ${s}: [`, `in ${s}`, t('Lo que hace en') + ' ' + s)); it('always: [', 'always', H.always.txt); it('on release: [', 'on release', H['on release'].txt); it('on hold 2: [', 'on hold', H['on hold'].txt); it('hold: ', 'hold', H.hold.txt); it('repeat: yes', 'repeat', H.repeat.txt); }
    else acciones('button');
  }
  else if (sec === 'looks'){
    if (ind <= base + 2){ titulo = t('Un elemento del lienzo'); Object.keys(ctx.widgets).forEach(w => it(w + ':\n' + ' '.repeat(base + 4), w, ctx.widgets[w].tipo)); }
    else if (!enLla){ titulo = t('En qué estado'); ST.forEach(s => it(`in ${s}: { `, `in ${s}`, t('Cómo se ve en') + ' ' + s)); }
    else if (tras('color')){ titulo = 'color'; Object.keys(L().COLORS).forEach(c => it(c, c, L().COLOR_ES[c])); }
    else { titulo = t('Lo que se puede cambiar'); palabras(['text', 'color', 'enabled']); }
  }

  el.innerHTML = `<div class="regla" style="margin-bottom:6px">${esc(titulo || t('Sigue escribiendo'))}</div>` +
    (items.length ? `<div class="lg-sug">${items.map((x, i) => `<button data-i="${i}"><code>${esc(x.lab)}</code><span>${x.desc}</span></button>`).join('')}</div>` : '');
  el.querySelectorAll('[data-i]').forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); insertar(items[+b.dataset.i].ins); }));
}

function insertar(ins){
  const ta = $('lgTexto'), p = ta.selectionStart, antes = ta.value.slice(0, p);
  const parcial = (antes.match(/\w*$/) || [''])[0];
  const desde = parcial && ins.toLowerCase().startsWith(parcial.toLowerCase()) ? p - parcial.length : p;
  ta.focus(); editar(ta, ins, desde, p);
}

/* ------------------------------------------------------------ recetas */
function aplicarReceta(k){
  const R = L().RECIPES[k]; if (!R) return;
  const txt = E.logica || '', D = L().parse(txt).data || {};
  const hay = Object.keys(D).length > 0, suelto = hay && L().isFlat(txt);
  const bloques = !hay ? [] : suelto ? [{ name: 'main', data: D }] : bloquesDelTexto(D);
  HIST.iniciar();

  /* 1. Lo que la receta no puede reutilizar. Las variables, los botones y
     los aspectos que ya usa la lógica escrita son de su bloque: si la
     receta trae uno con el mismo nombre, el suyo pasa a llamarse _2. */
  const ctx = ctxLogica(), ren = {};
  const varsYa = new Set(bloques.flatMap(b => Object.keys(deObj(b.data.variables))));
  const deLogica = new Set(bloques.flatMap(b => [...Object.keys(deObj(b.data.buttons)), ...Object.keys(deObj(b.data.looks))]));
  const todos = () => E.pantallas.flatMap(s => s.widgets);
  const libre = (n, ocupado) => { if (!ocupado(n)) return n; let i = 2; while (ocupado(n + '_' + i)) i++; return n + '_' + i; };
  const ocupadoNombre = x => varsYa.has(x) || deLogica.has(x) || !!ctx.hardware[x] || todos().some(w => w.nombre === x) || Object.values(ren).includes(x);
  for (const v of Object.keys(deObj((L().parse(R.logic).data || {}).variables)))
    if (varsYa.has(v) || (ctx.hardware[v] && !R.hardware.some(h => h.clave === v))) ren[v] = libre(v, ocupadoNombre);
  for (const w of R.widgets)
    if (deLogica.has(w.nombre) || todos().some(x => x.nombre === w.nombre && x.tipo !== w.tipo)) ren[w.nombre] = libre(w.nombre, ocupadoNombre);
  const nombre = libre(k, x => bloques.some(b => b.name === x));
  /* Renombrar solo en el código, nunca en los comentarios */
  const renombra = s => Object.entries(ren).reduce((acc, [de, a]) => acc.split('\n').map(l => {
    const i = l.search(/(^|\s)#/), cod = i < 0 ? l : l.slice(0, i), com = i < 0 ? '' : l.slice(i);
    return cod.replace(new RegExp('(^|[^A-Za-z0-9_])' + de + '(?![A-Za-z0-9_])', 'g'), '$1' + a) + com;
  }).join('\n'), s);

  /* 2. Las piezas van al nodo de control si lo hay: es donde se cablea */
  const nodo = E.nodos[E.nodos.length > 1 ? 1 : 0];
  const piezasYa = E.nodos.flatMap(n => n.conexiones);
  for (const h of R.hardware)
    if (!piezasYa.some(c => c.clave === h.clave))
      nodo.conexiones.push({ clave: h.clave, tipo: h.tipo, pinForzado: null, params: { ...(h.params || {}) } });

  /* 3. Los elementos del lienzo. Si tapan a los que ya hay, se busca un
     hueco donde quepa el grupo entero; si no lo hay, se quedan encima y
     se avisa. */
  const P = placa(), fx = P.ancho / 800, fy = P.alto / 480, sc = pantalla();
  const nuevos = R.widgets.map(w => ({ w, nombre: ren[w.nombre] || w.nombre })).filter(x => !todos().some(y => y.nombre === x.nombre));
  const rects = nuevos.map(({ w }) => ({ x: Math.round(w.x * fx), y: Math.round(w.y * fy), w: Math.round(w.w * fx), h: Math.round(w.h * fy) }));
  const ocupados = sc.widgets.map(w => ({ x: w.x, y: w.y, w: w.w, h: w.h }));
  const choca = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const chocaCon = (dx, dy) => rects.some(r => ocupados.some(o => choca({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h }, o)));
  let dx = 0, dy = 0, encima = false;
  if (rects.length && chocaCon(0, 0)){
    const x0 = Math.min(...rects.map(r => r.x)), y0 = Math.min(...rects.map(r => r.y));
    const an = Math.max(...rects.map(r => r.x + r.w)) - x0, al = Math.max(...rects.map(r => r.y + r.h)) - y0;
    let hallado = false;
    for (let y = 0; !hallado && y + al <= P.alto; y += 8)
      for (let x = 0; !hallado && x + an <= P.ancho; x += 8)
        if (!chocaCon(x - x0, y - y0)){ dx = x - x0; dy = y - y0; hallado = true; }
    encima = !hallado;
  }
  nuevos.forEach(({ w, nombre: nm }, i) => {
    const nuevo = { id: 'w' + (E.contador++), tipo: w.tipo, nombre: nm,
      x: rects[i].x + dx, y: rects[i].y + dy, w: rects[i].w, h: rects[i].h,
      bind: '', series: [], texto: w.texto ?? '', evento: '', destino: '' };
    /* El tamaño de letra viene fijado en la receta: si lo calculara la
       altura, podría salir uno que lv_conf.h no trae encendido. */
    if (w.fuente) nuevo.estilo = { fuente: w.fuente };
    sc.widgets.push(nuevo);
  });

  /* 4. La lógica: sola si no había nada; si había, un bloque más debajo */
  const logica = renombra(R.logic);
  if (!hay) E.logica = (txt.trim() ? txt.replace(/\s+$/, '') + '\n\n' : '') + logica;
  else E.logica = (suelto ? L().toBlock(txt, 'main') : txt).replace(/\s+$/, '') + '\n\n' + L().toBlock(logica, nombre);
  for (const w of R.widgets) if (w.bind){
    const x = todos().find(y => y.nombre === (ren[w.nombre] || w.nombre));
    if (x && !x.bind) x.bind = ren[w.bind] || w.bind;
  }
  ponerTextoExterno($('lgTexto'), E.logica);
  HIST.confirmar();
  pintar();              /* el panel se rehace: aquí no hay nadie escribiendo */

  const avisos = [];
  if (hay) avisos.push(`${t('La receta se ha añadido como el bloque')} «${nombre}»${suelto ? ` ${t('y lo que ya había pasa a ser el bloque')} «main»` : ''}.`);
  if (Object.keys(ren).length) avisos.push(t('Para no chocar con lo que ya había, se han renombrado:') + ' ' + Object.entries(ren).map(([a, b]) => `${a} → ${b}`).join(', ') + '.');
  if (encima) avisos.push(t('Sus elementos no caben sin tapar a otros: quedaron encima. Muévelos en la pestaña Diseño o pásalos a otra pantalla.'));
  if (avisos.length) avisar(t('Receta añadida'), avisos.map(a => `<p>${a}</p>`).join(''), 'ok');
}

/* Otra función: un bloque nuevo al final. Si lo escrito iba suelto, pasa
   a ser el bloque main para que las dos formas no se mezclen. */
async function nuevoBloque(){
  const txt = E.logica || '', D = L().parse(txt).data || {};
  const hay = Object.keys(D).length > 0, suelto = hay && L().isFlat(txt);
  const usados = suelto ? ['main'] : hay ? L().blockNames(txt) : [];
  const limpio = s => s.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^([0-9])/, 'b_$1');
  /* el nombre se comprueba dentro del dialogo: si choca, se dice ahi mismo */
  let nombre = await pedirTexto(t('Otra función (bloque nuevo)'), t('Nombre del bloque, en minúsculas y sin espacios'),
    'block_' + (usados.length + 1),
    v => !limpio(v) ? t('Escribe un nombre.')
       : (usados.includes(limpio(v)) || L().SECTIONS.includes(limpio(v))) ? t('Ya hay un bloque con ese nombre.') : '',
    { si: t('Crear bloque') });
  if (nombre === null) return;
  nombre = limpio(nombre);
  if (!nombre) return;
  HIST.iniciar();
  const antes = (suelto ? L().toBlock(txt, 'main') : txt).replace(/\s+$/, '');
  E.logica = (antes ? antes + '\n\n' : '') + `${nombre}:\n  start_in: OFF\n  states:\n    OFF:\n    ON:\n`;
  ponerTextoExterno($('lgTexto'), E.logica);
  HIST.confirmar();
  pintar();
  irALinea(E.logica.split('\n').length - 5);
}

/* ------------------------------------------------------------- panel */
function panelLogica(){
  const R = L().RECIPES;
  /* Arriba y fijo, el estado y el bloque nuevo. Debajo, secciones que se
     pliegan; las recetas empiezan plegadas (se usan al principio). */
  return `<div class="lg-cab">
    <div class="lg-estado" id="lgEstado"></div>
    <div class="lg-cab-botones">
      <button class="btn" id="lgBloque" title="${esc(t('Otra función (bloque nuevo)'))}">+ ${t('Bloque nuevo')}</button>
    </div>
  </div>
  <div class="regla" style="margin:10px 0 2px">${t('Qué hace el aparato: estados, botones y aspecto. Las salidas y entradas nacen en Hardware y los botones en el lienzo; aquí se usan por su nombre.')}</div>
  ${seccion('lg-indice', t('Índice'), `<div id="lgIndice"></div>`)}
  ${seccion('lg-errores', t('Errores'), `<div id="lgErrores"></div>`, '')}
  ${seccion('lg-ayuda', t('¿Qué es esto?'), `<div id="lgAyuda"></div>`)}
  ${seccion('lg-sug', t('Qué puedes escribir aquí'), `<div id="lgSug"></div>`)}
  ${seccion('lg-recetas', t('Recetas'), Object.entries(R).map(([k, r]) => `<div class="lg-receta"><b>${esc(r.title)}</b><p>${esc(r.summary)}</p>
      <button class="btn" data-receta="${k}">${t('Añadir')}</button></div>`).join(''), Object.keys(R).length)}`;
}

function conectarLogica(){
  /* la documentación está arriba, en la barra, en cualquier pestaña */
  $('lgBloque').addEventListener('click', nuevoBloque);
  document.querySelectorAll('[data-receta]').forEach(b => b.addEventListener('click', () => aplicarReceta(b.dataset.receta)));
  pintarEstado(); pintarErrores(); pintarIndice();
  ayudaPalabra(LG.palabra); sugerencias();
}

window.panelLogica = panelLogica;
window.conectarLogica = conectarLogica;
window.escenaLogica = escenaLogica;
})();
