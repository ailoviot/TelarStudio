/* =====================================================================
 * LAS IMAGENES DE LA GUIA DE WIDGETS (docs/widgets/*.png)
 *
 * Las dibuja el propio Telar: cada escena pone uno o varios widgets en una
 * situacion real (un boton de Marcha, un piloto encendido...) con la
 * funcion dibujo() del lienzo, y la pasa a PNG a 2x. Asi la guia enseña lo
 * mismo que el lienzo y, si el dibujo de un widget cambia, basta con volver
 * a sacarlas.
 *
 * Uso: abre telar-studio.html, pega este fichero en la consola del
 * navegador y ejecuta   await fotosGuia()
 * Se descargan los PNG; van a docs/widgets/ con el mismo nombre.
 * La ficha de cada uno (texto y ejemplo) esta en docs/logica.html, FICHAS;
 * el ancho de la escena es el «ancho» de su ficha.
 *
 * Una regla: un MISMO widget en dos momentos va en dos pantallitas con una
 * flecha (decor: marcos), para que no parezcan dos widgets a la vez.
 * ================================================================== */
async function fotoEscena(ancho, alto, piezas, decor = ''){
  const k = 2;
  const fuentes = `@font-face{font-family:'Montserrat';src:url(data:font/ttf;base64,${FUENTES_TTF['Montserrat-Medium.ttf']});font-weight:100 900}`
    + `@font-face{font-family:'TelarIconos';src:url(data:font/ttf;base64,${ICONOS_WOFF})}`;
  /* el foreignObject es XML: un <img> sin cerrar o un atributo sin valor
     (data-cerrar) lo rompen. Se pasa por el DOM y sale como XHTML. */
  const caja = document.createElement('div');
  caja.innerHTML = decor + piezas.map(([w, V, suelto]) => `<div style="position:absolute;left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px"><div class="w-int"${suelto ? ' style="overflow:visible"' : ''}>${dibujo(w, V)}</div></div>`).join('');
  const cuerpo = [...caja.childNodes].map(n => new XMLSerializer().serializeToString(n)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho * k}" height="${alto * k}"><foreignObject x="0" y="0" width="${ancho}" height="${alto}" transform="scale(${k})">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${ancho}px;height:${alto}px;background:${E.tema.fondo};position:relative;font-family:Montserrat,sans-serif">
    <style>${fuentes} *{box-sizing:border-box} .w-int{position:absolute;inset:-1px;display:flex;flex-direction:column;justify-content:center;align-items:center;overflow:hidden;color:#fff}</style>${cuerpo}</div></foreignObject></svg>`;
  const img = new Image();
  await new Promise((ok, mal) => { img.onload = ok; img.onerror = mal; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  await new Promise(r => setTimeout(r, 60));
  const c = document.createElement('canvas'); c.width = ancho * k; c.height = alto * k;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
}

/* Un widget como lo crea el alumno (con sus valores por defecto), y encima lo de la escena */
function nuevo(tipo, props){
  anadirWidget(tipo);
  const w = pantalla().widgets[pantalla().widgets.length - 1];
  return Object.assign(w, { auto: false }, props);
}
/* dos pantallitas y una flecha: el mismo widget en dos momentos */
const marcos = (x1, x2, y, w, h) => {
  const m = x => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:10px;border:2px solid #3a3f4b;background:#181a20"></div>`;
  return m(x1) + m(x2) + `<div style="position:absolute;left:${x1 + w}px;top:${y + h / 2 - 16}px;width:${x2 - x1 - w}px;text-align:center;color:#9aa3b2;font:600 24px Montserrat,sans-serif">→</div>`;
};
/* un dibujo sencillo para la Imagen: una maquina con su motor */
const IMAGEN_EJEMPLO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100">
  <rect x="10" y="30" width="90" height="50" rx="6" fill="#3b9dff"/><rect x="100" y="45" width="40" height="20" rx="3" fill="#9aa3b2"/>
  <circle cx="35" cy="85" r="10" fill="#e6e9ef"/><circle cx="75" cy="85" r="10" fill="#e6e9ef"/><rect x="25" y="15" width="40" height="15" rx="3" fill="#3ddc97"/></svg>`);

/* Cada escena: fichero, la logica que necesita (sus estados), tamaño y piezas [widget, lo que enseña] */
const ESCENAS = [
  /* ---------------------------------------------------------- Basico */
  { fich: 'texto.png', ancho: 360, alto: 90, piezas: () => [
    [nuevo('label', { x: 20, y: 14, w: 320, h: 32, texto: 'Temperatura del horno', estilo: { fuente: 24 } }), null],
    [nuevo('label', { x: 20, y: 52, w: 320, h: 22, texto: 'Pulsa MARCHA para empezar', estilo: { fuente: 14 } }), null]] },
  { fich: 'boton.png', ancho: 300, alto: 72, piezas: () => [
    [nuevo('button', { x: 20, y: 14, w: 120, h: 44, texto: 'MARCHA', estilo: { clase: 'marcha' } }), null],
    [nuevo('button', { x: 160, y: 14, w: 120, h: 44, texto: 'PARO', estilo: { clase: 'paro' } }), null]] },
  { fich: 'imagen.png', ancho: 220, alto: 130, piezas: () => [
    [nuevo('image', { x: 30, y: 15, w: 160, h: 100, img: { src: IMAGEN_EJEMPLO } }), null]] },
  { fich: 'linea.png', ancho: 360, alto: 120, piezas: () => [
    [nuevo('label', { x: 20, y: 10, w: 320, h: 26, texto: 'MEDIDAS', estilo: { fuente: 18 } }), null],
    [nuevo('line', { x: 20, y: 42, w: 320, h: 3 }), null],
    [nuevo('label', { x: 20, y: 64, w: 150, h: 36, texto: '23 °C', estilo: { fuente: 24 } }), null],
    [nuevo('line', { x: 179, y: 58, w: 3, h: 48 }), null],
    [nuevo('label', { x: 190, y: 64, w: 150, h: 36, texto: '45 %', estilo: { fuente: 24 } }), null]] },
  { fich: 'lista.png', ancho: 280, alto: 190, piezas: () => [
    [nuevo('list', { x: 20, y: 14, w: 240, h: 162, elementos: 'Masa madre\nPan\nPizza\nBizcocho' }), { idx: 1 }]] },
  { fich: 'tabla.png', ancho: 360, alto: 150, piezas: () => [
    [nuevo('table', { x: 20, y: 14, w: 320, h: 122, elementos: 'Material;Minutos\nPino;12\nRoble;18\nHaya;15' }), null]] },
  { fich: 'aviso.png', ancho: 340, alto: 180, piezas: () => [
    [nuevo('msgbox', { x: 20, y: 14, w: 300, h: 152, elementos: 'Temperatura alta\nEl horno pasa de 250 °C. Revisa el termostato.' }), null]] },
  { fich: 'pestanas.png', ancho: 420, alto: 200, piezas: () => [
    [nuevo('tabview', { x: 20, y: 14, w: 380, h: 172, elementos: 'Medidas\nAjustes\nAlarmas' }), null]] },
  { fich: 'tarjeta.png', ancho: 340, alto: 150, piezas: () => [
    [nuevo('tarjeta', { x: 20, y: 14, w: 300, h: 122, texto: 'HORNO' }), null],
    [nuevo('lectura', { x: 38, y: 44, w: 260, h: 76, texto: '', unidad: '°C', decimales: 0, ejemplo: 180 }), null]] },
  { fich: 'icono.png', ancho: 330, alto: 90, piezas: () =>
    ['fa-bolt', 'fa-thermometer-half', 'fa-tint', 'fa-fire', 'fa-bell'].map((ic, i) =>
      [nuevo('icono', { x: 20 + i * 60, y: 17, w: 56, h: 56, icono: ic }), null]) },
  /* --------------------------------------------------------- Entrada */
  { fich: 'deslizador.png', ancho: 320, alto: 70, piezas: () => [
    [nuevo('slider', { x: 20, y: 22, w: 280, h: 26 }), { frac: 0.6 }]] },
  { fich: 'interruptor.png', ancho: 300, alto: 80, piezas: () => [
    [nuevo('label', { x: 12, y: 24, w: 60, h: 32, texto: 'Luz', estilo: { fuente: 18 } }), null],
    [nuevo('toggle', { x: 70, y: 20, w: 64, h: 40 }), { on: true }],
    [nuevo('label', { x: 150, y: 24, w: 80, h: 32, texto: 'Bomba', estilo: { fuente: 18 } }), null],
    [nuevo('toggle', { x: 228, y: 20, w: 64, h: 40 }), { on: false }]] },
  { fich: 'casilla.png', ancho: 300, alto: 100, piezas: () => [
    [nuevo('checkbox', { x: 20, y: 14, w: 260, h: 34, texto: 'Modo automático' }), { on: true }],
    [nuevo('checkbox', { x: 20, y: 54, w: 260, h: 34, texto: 'Alarma sonora' }), { on: false }]] },
  { fich: 'desplegable.png', ancho: 280, alto: 76, piezas: () => [
    [nuevo('dropdown', { x: 20, y: 16, w: 240, h: 44, elementos: 'Masa madre\nPan\nPizza' }), { idx: 1 }]] },
  { fich: 'rueda.png', ancho: 220, alto: 160, piezas: () => [
    [nuevo('roller', { x: 30, y: 14, w: 160, h: 132, elementos: 'Masa madre\nPan\nPizza' }), { idx: 1 }]] },
  { fich: 'contador.png', ancho: 260, alto: 80, piezas: () => [
    [nuevo('spinbox', { x: 20, y: 14, w: 220, h: 52 }), { texto: '15' }]] },
  { fich: 'rejilla.png', ancho: 300, alto: 190, piezas: () => [
    [nuevo('buttonmatrix', { x: 20, y: 14, w: 260, h: 162 }), null]] },
  { fich: 'campo.png', ancho: 300, alto: 80, piezas: () => [
    [nuevo('textarea', { x: 20, y: 14, w: 260, h: 52, texto: '25' }), null]] },
  { fich: 'teclado.png', ancho: 420, alto: 210, piezas: () => [
    [nuevo('keyboard', { x: 20, y: 14, w: 380, h: 182, modo: 'numeros' }), null]] },
  /* --------------------------------------------------- Visualizacion */
  { fich: 'escala.png', ancho: 360, alto: 100, piezas: () => [
    [nuevo('barra-consigna', { x: 20, y: 10, w: 320, h: 26, escala: false, marca: false, min: 0, max: 100 }), { frac: 0.62 }],
    [nuevo('scale', { x: 20, y: 40, w: 320, h: 50, min: 0, max: 100 }), null]] },
  { fich: 'piloto.png', ancho: 300, alto: 76, piezas: () => [
    [nuevo('led', { x: 24, y: 20, w: 36, h: 36 }), { on: true, color: '#3ddc97' }, true],
    [nuevo('label', { x: 70, y: 24, w: 80, h: 28, texto: 'Marcha', estilo: { fuente: 18 } }), null],
    [nuevo('led', { x: 164, y: 20, w: 36, h: 36 }), { on: false, color: '#f05252' }, true],
    [nuevo('label', { x: 210, y: 24, w: 80, h: 28, texto: 'Fallo', estilo: { fuente: 18 } }), null]] },
  { fich: 'cargando.png', ancho: 260, alto: 90, piezas: () => [
    [nuevo('spinner', { x: 20, y: 15, w: 60, h: 60 }), null],
    [nuevo('label', { x: 90, y: 30, w: 150, h: 30, texto: 'Conectando...', estilo: { fuente: 18 } }), null]] },
  { fich: 'qr.png', ancho: 300, alto: 150, piezas: () => [
    [nuevo('qrcode', { x: 20, y: 15, w: 120, h: 120, texto: 'https://telar.example/manual' }), null],
    [nuevo('label', { x: 150, y: 50, w: 140, h: 50, texto: 'Manual de la máquina', estilo: { fuente: 16 } }), null]] },
  { fich: 'numero.png', ancho: 340, alto: 120, piezas: () => [
    [nuevo('lectura', { x: 20, y: 14, w: 300, h: 92, texto: 'TEMPERATURA', unidad: '°C', decimales: 1, tarjeta: true, ejemplo: 23.5 }), null]] },
  { fich: 'estado-actual.png', ancho: 440, alto: 92, logica: 'start_in: PARADO\nstates:\n  PARADO:\n  EN_MARCHA:\n', piezas: () => {
    const p = nuevo('pildora', { x: 36, y: 31, w: 150, h: 30, textosEstado: { EN_MARCHA: 'EN MARCHA' }, coloresEstado: { EN_MARCHA: '#3ddc97' } });
    return [[p, COMPONENTES.pildora.deEstado(p, 'PARADO')], [{ ...p, id: p.id + 'b', x: 254 }, COMPONENTES.pildora.deEstado(p, 'EN_MARCHA')]]; },
    decor: () => marcos(18, 236, 12, 186, 68) },
  { fich: 'pasos.png', ancho: 520, alto: 62, logica: 'start_in: ESPERA\nstates:\n  ESPERA:\n  LLENANDO:\n  CALENTANDO:\n  LISTO:\n', piezas: () => [
    [nuevo('pasos', { x: 20, y: 17, w: 480, h: 28 }), { idx: 1 }]] },
  { fich: 'barra.png', ancho: 380, alto: 80, piezas: () => [
    [nuevo('barra-consigna', { x: 20, y: 14, w: 340, h: 50, min: 0, max: 200, unidad: 'L', consignaValor: 140, ejemplo: 110 }), { frac: 0.55, fracSp: 0.7 }]] },
  { fich: 'curva.png', ancho: 380, alto: 170, piezas: () => [
    [nuevo('curva', { x: 20, y: 12, w: 340, h: 146 }), { vmax: 40, sp: 25,
      med: Array.from({ length: 150 }, (_, i) => 18 + 7 * (1 - Math.exp(-i / 30)) + 1.2 * Math.exp(-i / 45) * Math.sin(i / 6)) }]] },
  { fich: 'reloj.png', ancho: 240, alto: 230, piezas: () => [
    [nuevo('aguja', { x: 20, y: 10, w: 200, h: 200, min: 0, max: 10, unidad: 'bar', decimales: 1, consignaValor: 6, ejemplo: 4.2 }), null]] },
  { fich: 'tiempo.png', ancho: 300, alto: 110, piezas: () => [
    [nuevo('tiempo', { x: 20, y: 12, w: 260, h: 86, texto: 'QUEDA', tarjeta: true, ejemplo: 275 }), null]] },
];

/* Todas: con el tema Aula de un proyecto de ejemplo. descargar=false las devuelve en base64 */
async function fotosGuia(descargar = true){
  const txt = await (await fetch('ejemplos/control-var.telar.json', { cache: 'reload' })).text();
  abrirProyectoDesde(txt, null, 'guia');
  E.nodos = [E.nodos[0]]; E.iPantalla = 0;
  const out = {};
  for (const s of ESCENAS){
    E.logica = s.logica || '';
    E.pantallas = [{ nombre: 'p', widgets: [] }];
    const piezas = s.piezas();
    PLAN = planFuentes();                 /* con las tildes de sus textos, como el lienzo */
    const url = await fotoEscena(s.ancho, s.alto, piezas, s.decor ? s.decor() : '');
    out[s.fich] = url.split(',')[1];
    if (descargar){ const a = document.createElement('a'); a.href = url; a.download = s.fich; a.click(); await new Promise(r => setTimeout(r, 300)); }
  }
  return out;
}
