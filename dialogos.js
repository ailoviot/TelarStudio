/* =====================================================================
 * DIALOGOS
 *
 * Sustituyen a alert(), confirm() y prompt() del navegador. Los nativos
 * no se pueden vestir, cortan el texto largo en una ventanita gris que
 * dice "Esta pagina dice", no dejan copiar un comando con un clic y
 * bloquean toda la pagina. Estos llevan el estilo de Telar Studio, se
 * leen bien, y devuelven una promesa: el codigo que los llama espera
 * con await en vez de quedarse congelado.
 *
 *   await avisar('Titulo', 'texto o <b>html</b>', 'ok' | 'aviso' | 'error' | 'info')
 *   if (await confirmar('Titulo', 'texto', { si: 'Borrar', peligro: true })) ...
 *   const nombre = await pedirTexto('Titulo', 'Etiqueta', 'valor inicial', validar)
 *   const que = await dialogo({ titulo, tipo, cuerpo, botones: [{ et, valor, principal, peligro }] })
 *
 * Accesibles: role="dialog", el foco entra al abrir y vuelve adonde
 * estaba al cerrar, Tab no se escapa del dialogo, Esc cancela e Intro
 * pulsa el boton principal.
 * ===================================================================== */

document.head.insertAdjacentHTML('beforeend', `<style id="dialogos-estilo">
.dlg-fondo{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;
  padding:16px;background:rgba(8,10,14,.62);backdrop-filter:blur(3px);animation:dlg-fundir .14s ease-out}
.dlg{width:min(100%,var(--dlg-ancho,480px));max-height:min(86vh,720px);display:flex;flex-direction:column;
  background:var(--panel);border:1px solid var(--borde);border-radius:12px;color:var(--texto);
  box-shadow:0 24px 64px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.02) inset;
  animation:dlg-entrar .16s cubic-bezier(.2,.9,.3,1.2)}
.dlg-cab{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 6px}
.dlg-icono{flex:none;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  font:700 15px/1 system-ui,sans-serif;background:color-mix(in srgb,var(--c) 16%,transparent);color:var(--c)}
.dlg[data-tipo="info"]{--c:var(--acento)} .dlg[data-tipo="ok"]{--c:var(--ok)}
.dlg[data-tipo="aviso"]{--c:var(--aviso)} .dlg[data-tipo="error"]{--c:var(--error)}
.dlg-titulo{margin:4px 0 0;font:650 16px/1.3 system-ui,sans-serif;letter-spacing:.1px;text-wrap:balance}
.dlg-cuerpo{padding:6px 20px 4px 62px;overflow:auto;font-size:13.5px;line-height:1.55;color:var(--tenue)}
.dlg-cuerpo p{margin:0 0 10px} .dlg-cuerpo b,.dlg-cuerpo strong{color:var(--texto);font-weight:600}
.dlg-cuerpo ul{margin:0 0 10px;padding-left:18px} .dlg-cuerpo li{margin:2px 0}
.dlg-cuerpo code{font-family:var(--mono);font-size:12px;background:var(--panel2);border:1px solid var(--borde);
  border-radius:4px;padding:1px 5px;color:var(--texto)}
.dlg-pasos{list-style:none;margin:4px 0 8px;padding:0;counter-reset:paso}
.dlg-pasos>li{position:relative;padding:0 0 12px 32px;counter-increment:paso}
.dlg-pasos>li::before{content:counter(paso);position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font:600 11.5px/1 system-ui;background:var(--panel2);
  border:1px solid var(--borde);color:var(--texto)}
.dlg-pasos>li.clave::before{background:color-mix(in srgb,var(--aviso) 22%,transparent);border-color:var(--aviso);color:var(--aviso)}
.dlg-pasos .t{display:block;color:var(--texto);font-weight:600;margin-bottom:3px}
.dlg-cod{position:relative;margin:6px 0 4px}
.dlg-cod pre{margin:0;padding:9px 40px 9px 11px;background:#0e1016;border:1px solid var(--borde);border-radius:7px;
  font:12px/1.55 var(--mono);color:#d7deea;white-space:pre-wrap;word-break:break-word}
.dlg-copiar{position:absolute;top:5px;right:5px;border:1px solid var(--borde);background:var(--panel2);color:var(--tenue);
  border-radius:5px;font:11px/1 system-ui;padding:5px 7px;cursor:pointer}
.dlg-copiar:hover{color:var(--texto);border-color:var(--acento)}
.dlg-nota{margin:8px 0 10px;padding:9px 11px;border-radius:7px;border:1px solid var(--borde);background:var(--panel2);font-size:12.5px}
.dlg-nota.aviso{border-color:color-mix(in srgb,var(--aviso) 45%,var(--borde));background:color-mix(in srgb,var(--aviso) 9%,var(--panel2))}
.dlg-campo{display:flex;flex-direction:column;gap:6px;margin:4px 0 6px}
.dlg-campo span{font-size:12px;color:var(--tenue)}
.dlg-campo input{background:var(--panel2);border:1px solid var(--borde);border-radius:7px;color:var(--texto);
  padding:9px 11px;font:14px system-ui;outline:none}
.dlg-campo input:focus{border-color:var(--acento);box-shadow:0 0 0 3px color-mix(in srgb,var(--acento) 25%,transparent)}
.dlg-error{min-height:17px;font-size:12px;color:var(--error)}
.dlg-pie{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px 18px;flex-wrap:wrap}
.dlg-btn{border:1px solid var(--borde);background:var(--panel2);color:var(--texto);border-radius:8px;
  padding:9px 16px;font:600 13px/1 system-ui,sans-serif;cursor:pointer;min-width:92px}
.dlg-btn:hover{border-color:#4a5263}
.dlg-btn.principal{background:var(--acento);border-color:var(--acento);color:#fff}
.dlg-btn.principal:hover{background:var(--acento2);border-color:var(--acento2)}
.dlg-btn.peligro{background:var(--error);border-color:var(--error);color:#fff}
.dlg-btn:focus-visible,.dlg-copiar:focus-visible{outline:2px solid var(--acento);outline-offset:2px}
.ico-busca{width:100%;box-sizing:border-box;margin:0 0 10px;background:var(--panel2);border:1px solid var(--borde);border-radius:7px;
  color:var(--texto);padding:8px 10px;font:13px system-ui;outline:none}
.ico-busca:focus{border-color:var(--acento)}
.ico-grupo{margin:10px 0 6px;font:600 11px/1 system-ui;letter-spacing:.6px;text-transform:uppercase;color:var(--tenue)}
.ico-rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px}
.ico-celda{display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 4px 7px;border-radius:8px;cursor:pointer;
  background:var(--panel2);border:1px solid var(--borde);color:var(--texto);font:10.5px/1.2 system-ui;text-align:center}
.ico-celda:hover{border-color:var(--acento)} .ico-celda.activo{border-color:var(--acento);box-shadow:0 0 0 2px color-mix(in srgb,var(--acento) 35%,transparent)}
.ico-celda b{font:22px/1 'TelarIconos';font-weight:normal}
.ico-celda:focus-visible{outline:2px solid var(--acento);outline-offset:1px}
@keyframes dlg-fundir{from{opacity:0}}
@keyframes dlg-entrar{from{opacity:0;transform:translateY(6px) scale(.98)}}
@media (prefers-reduced-motion:reduce){.dlg-fondo,.dlg{animation:none}}
@media (max-width:520px){.dlg-cuerpo{padding-left:20px}}
</style>`);

const ICONO_DLG = { info: 'i', ok: '✓', aviso: '!', error: '×' };
const tr = s => (typeof t === 'function' ? t(s) : s);

/* El dialogo general: todos los demas son atajos de este */
function dialogo({ titulo, cuerpo = '', tipo = 'info', botones, ancho, alAbrir } = {}){
  return new Promise(resolver => {
    const antes = document.activeElement;
    const bots = botones && botones.length ? botones : [{ et: tr('Entendido'), valor: true, principal: true }];
    const id = 'dlg-t-' + Math.random().toString(36).slice(2, 8);
    const fondo = document.createElement('div');
    fondo.className = 'dlg-fondo';
    fondo.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="${id}" data-tipo="${tipo}"
        ${ancho ? `style="--dlg-ancho:${ancho}px"` : ''}>
      <div class="dlg-cab"><div class="dlg-icono" aria-hidden="true">${ICONO_DLG[tipo] || 'i'}</div>
        <h2 class="dlg-titulo" id="${id}"></h2></div>
      <div class="dlg-cuerpo">${cuerpo}</div>
      <div class="dlg-pie">${bots.map((b, i) =>
        `<button type="button" class="dlg-btn${b.principal ? ' principal' : ''}${b.peligro ? ' peligro' : ''}" data-i="${i}">${b.et}</button>`).join('')}</div>
    </div>`;
    fondo.querySelector('.dlg-titulo').textContent = titulo || '';
    document.body.appendChild(fondo);

    /* el valor de "cancelar": el del boton sin principal, o null */
    const cancelar = (bots.find(b => b.cancela) || bots.find(b => !b.principal && !b.peligro) || {}).valor ?? null;
    let hecho = false;
    const cerrar = valor => {
      if (hecho) return;
      hecho = true;
      document.removeEventListener('keydown', teclas, true);
      fondo.remove();
      if (antes && antes.focus) try { antes.focus(); } catch (e) {}
      resolver(valor);
    };
    /* un boton puede validar antes de cerrar (pedirTexto): si devuelve false, sigue abierto */
    fondo.querySelectorAll('.dlg-btn').forEach(b => b.addEventListener('click', () => {
      const def = bots[+b.dataset.i];
      const v = typeof def.valor === 'function' ? def.valor(fondo) : def.valor;
      if (v === undefined) return;
      cerrar(v);
    }));
    fondo.addEventListener('pointerdown', e => { if (e.target === fondo) fondo.querySelector('.dlg').animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }], { duration: 160 }); });
    /* cualquier elemento del cuerpo con data-dlg-valor cierra con ese valor
       (una rejilla de iconos, una lista de opciones) */
    fondo.querySelectorAll('[data-dlg-valor]').forEach(el => el.addEventListener('click', () => cerrar(el.dataset.dlgValor)));
    /* los bloques de codigo: copiar con un clic */
    fondo.querySelectorAll('.dlg-copiar').forEach(b => b.addEventListener('click', async () => {
      const txt = b.parentElement.querySelector('pre').textContent;
      try { await navigator.clipboard.writeText(txt); b.textContent = tr('Copiado'); }
      catch (e) { const r = document.createRange(); r.selectNodeContents(b.parentElement.querySelector('pre'));
                  const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = tr('Selecciónalo y copia'); }
      setTimeout(() => { b.textContent = tr('Copiar'); }, 1600);
    }));

    const enfocables = () => [...fondo.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
    function teclas(e){
      if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); cerrar(cancelar); return; }
      if (e.key === 'Enter' && !(e.target.tagName === 'BUTTON')){
        const p = fondo.querySelector('.dlg-btn.principal') || fondo.querySelector('.dlg-btn.peligro');
        if (p){ e.preventDefault(); e.stopPropagation(); p.click(); }
        return;
      }
      if (e.key === 'Tab'){
        const L = enfocables(); if (!L.length) return;
        const i = L.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0){ e.preventDefault(); L[L.length - 1].focus(); }
        else if (!e.shiftKey && i === L.length - 1){ e.preventDefault(); L[0].focus(); }
      }
      /* el resto de atajos del editor (Supr, Ctrl+Z...) no deben dispararse detras */
      e.stopPropagation();
    }
    document.addEventListener('keydown', teclas, true);
    if (alAbrir) alAbrir(fondo);
    const primero = fondo.querySelector('input') || fondo.querySelector('.dlg-btn.principal') || fondo.querySelector('.dlg-btn');
    if (primero) primero.focus();
  });
}

const avisar = (titulo, cuerpo, tipo = 'info', boton) =>
  dialogo({ titulo, cuerpo, tipo, botones: [{ et: boton || tr('Entendido'), valor: true, principal: true }] });

const confirmar = (titulo, cuerpo, { si, no, peligro, tipo } = {}) =>
  dialogo({ titulo, cuerpo, tipo: tipo || (peligro ? 'aviso' : 'info'),
            botones: [{ et: no || tr('Cancelar'), valor: false, cancela: true },
                      { et: si || tr('Aceptar'), valor: true, principal: !peligro, peligro: !!peligro }] });

/* Pedir un texto. validar(v) devuelve un mensaje de error, o '' si vale. */
function pedirTexto(titulo, etiqueta, valor = '', validar, { si, cuerpo = '' } = {}){
  return dialogo({
    titulo, tipo: 'info',
    cuerpo: `${cuerpo}<label class="dlg-campo"><span>${etiqueta}</span><input type="text" spellcheck="false"></label><div class="dlg-error"></div>`,
    alAbrir: f => { const i = f.querySelector('input'); i.value = valor; setTimeout(() => i.select(), 0); },
    botones: [{ et: tr('Cancelar'), valor: null, cancela: true },
              { et: si || tr('Aceptar'), principal: true, valor: f => {
                  const v = f.querySelector('input').value;
                  const mal = validar ? validar(v) : '';
                  if (mal){ f.querySelector('.dlg-error').textContent = mal; f.querySelector('input').focus(); return undefined; }
                  return v;
                } }],
  });
}

/* Piezas para el cuerpo */
const escDlg = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const codigoDlg = txt => `<div class="dlg-cod"><pre>${escDlg(txt)}</pre><button type="button" class="dlg-copiar">${tr('Copiar')}</button></div>`;
const listaDlg = items => `<ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`;
