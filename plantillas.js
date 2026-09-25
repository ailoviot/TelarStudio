/* =====================================================================
 * PLANTILLAS DE PANTALLA
 *
 * Una pantalla profesional en un clic. En una pantalla de 800x480 salen
 * las medidas del HMI del variac: cabecera de 52 px, margenes de 16,
 * tarjetas con rotulo y botonera de 58 px abajo.
 *
 * No se escala un dibujo fijo: cada plantilla se CALCULA para la pantalla
 * que haya. Escalar no sirve, porque los componentes llevan dentro letras
 * y margenes que no encogen (un rotulo de 11 px sigue midiendo 11): a
 * 320x240 todo se pisaba. Aqui las medidas bajan con la pantalla hasta un
 * minimo legible, y en una estrecha la distribucion cambia (la curva no
 * cabe y se quita; la medida ocupa todo el ancho).
 *
 * Los nombres son los de los ejemplos de la guia de la logica (btn_start,
 * reading, countdown...): un programa de la guia encaja sin renombrar.
 *
 * Nada viene enlazado: cada plantilla trae la forma, y el alumno decide
 * que variable va en cada sitio (Enlazado a, en el panel de la derecha).
 * Lo que si viene hecho es la navegacion: VOLVER lleva a Operacion, y
 * los botones de la cabecera de Operacion, a Ajustes y a Diagnostico,
 * en cuanto esas pantallas existen.
 * ===================================================================== */

/* Las plantillas necesitan sitio: por debajo de esto, mejor a mano */
const PLANTILLA_MIN = { ancho: 320, alto: 240 };
const plantillasCaben = P => P.ancho >= PLANTILLA_MIN.ancho && P.alto >= PLANTILLA_MIN.alto;

/* Lo minimo que necesita cada componente para que su letra quepa */
const MIN_DATO = 52, MIN_PASOS = 22, ALTO_BARRA = 42;

/* La reticula de una pantalla: todas las medidas salen de aqui */
function reticula(W, H){
  const s = Math.min(W / 800, H / 480);
  const R = n => Math.round(n);
  const G = {
    W, H, s,
    ancha: W >= 600,                               /* caben dos columnas */
    m:    Math.max(6, R(16 * s)),                  /* margen */
    gap:  Math.max(6, R(10 * s)),                  /* entre piezas */
    cab:  Math.max(30, R(52 * s)),                 /* alto de la cabecera */
    pie:  Math.max(44, R(94 * s)),                 /* alto de la botonera */
    /* la letra no encoge al mismo ritmo que la pantalla: a mitad de
       tamano, un boton de 22 px se queda en 15, no en 11 */
    letra: px => Math.max(11, R(px * Math.pow(Math.min(1, s), 0.55))),
  };
  G.bot = G.pie - 2 * Math.max(4, R(18 * s));      /* alto de los botones de abajo */
  G.yBot = H - G.pie + (G.pie - G.bot) / 2 | 0;
  G.arriba = G.cab + Math.max(6, R(14 * s));       /* donde empieza el cuerpo */
  G.abajo = H - G.pie - G.gap;                     /* donde acaba */
  return G;
}

/* La cabecera y la botonera: iguales en todas, para que al cambiar de
   pantalla nada salte de sitio */
function CABECERA(G, titulo){
  return [
    ['tarjeta', 'header', 0, 0, G.W, G.cab, { estilo: { radio: 0 } }],
    ['label', 'title', G.m, (G.cab - 22) / 2 | 0, anchoTitulo(G), 22, { texto: titulo, estilo: { papel: 'titulo', fuente: G.letra(15) } }],
  ];
}
const anchoTitulo = G => G.ancha ? 220 : Math.round(G.W * 0.27);
/* La pildora va en el hueco entre el titulo y lo que haya a la derecha
   (hasta): centrada en el si cabe entera, y si no, tan ancha como el hueco */
function PILDORA(G, nombre, hasta = G.W - G.m){
  const desde = G.m + anchoTitulo(G) + G.gap, hueco = hasta - G.gap - desde;
  const w = Math.max(60, Math.min(168, Math.round(168 * G.s), hueco)), h = Math.min(28, G.cab - 8);
  return ['pildora', nombre, desde + (hueco - w) / 2 | 0, (G.cab - h) / 2 | 0, w, h];
}
const BOTONERA = G => [['tarjeta', 'footer', 0, G.H - G.pie, G.W, G.pie, { estilo: { radio: 0 } }]];
const ancho = (G, px, min) => Math.max(min, Math.round(px * G.s));
const VOLVER = G => [['button', 'btn_back', G.m, G.yBot, ancho(G, 176, 84), G.bot, { texto: 'VOLVER', irA: 'operacion', estilo: { fuente: G.letra(22) } }]];

const PLANTILLAS = {
  operacion: {
    nombre: 'Operación',
    desc: 'La del día a día: la medida en grande con su consigna, la curva, tres datos, los pasos del proceso y MARCHA/PARO.',
    piezas(G){
      const { W, m, gap } = G;
      /* los dos botones de la cabecera, a la derecha; la pildora, en medio */
      const bh = G.cab - 2 * Math.max(3, Math.round(8 * G.s)), bw = ancho(G, 108, 56), by = (G.cab - bh) / 2 | 0;
      const L = [...CABECERA(G, 'OPERACIÓN'), PILDORA(G, 'status', W - m - 2 * bw - gap)];
      L.push(['button', 'btn_settings', W - m - 2 * bw - gap, by, bw, bh, { texto: 'AJUSTES', irA: 'ajustes', estilo: { fuente: G.letra(13) } }],
             ['button', 'btn_diag', W - m - bw, by, bw, bh, { texto: G.ancha ? 'DIAGNÓSTICO' : 'DIAG.', irA: 'diagnostico', estilo: { fuente: G.letra(13) } }]);

      /* de abajo arriba: pasos, datos y lo que quede para las tarjetas */
      const hPasos = Math.max(MIN_PASOS, Math.round(28 * G.s)), hDato = Math.max(MIN_DATO, Math.round(56 * G.s));
      const yPasos = G.abajo - hPasos, yDato = yPasos - gap - hDato;
      const hTarj = yDato - gap - G.arriba;
      const wTarj = G.ancha ? Math.round((W - 2 * m - gap) * 0.52) : W - 2 * m;
      const pad = Math.max(10, Math.round(20 * G.s));
      const conBarra = hTarj - 2 * pad >= 60 + ALTO_BARRA;
      const hLect = hTarj - 2 * pad - (conBarra ? ALTO_BARRA + 4 : 0);
      L.push(['tarjeta', 'card_reading', m, G.arriba, wTarj, hTarj, { texto: '' }],
             ['lectura', 'reading', m + pad, G.arriba + pad - 2, wTarj - 2 * pad, hLect,
              { texto: 'MEDIDA', ejemplo: 33.3, suelta: true, estilo: { fuente: Math.min(78, Math.round((hLect - 20) * 0.9)) } }]);
      if (conBarra) L.push(['barra-consigna', 'reading_bar', m + pad, G.arriba + hTarj - pad - ALTO_BARRA + 4, wTarj - 2 * pad, ALTO_BARRA]);
      if (G.ancha){
        const x = m + wTarj + gap, w = W - m - x;
        L.push(['tarjeta', 'card_trend', x, G.arriba, w, hTarj, { texto: 'TENDENCIA' }],
               ['curva', 'trend', x + 12, G.arriba + 30, w - 24, hTarj - 40, { ventana: 60 }]);
      }
      const wDato = Math.floor((W - 2 * m - 2 * gap) / 3);
      [['sp_view', 'CONSIGNA', 30, {}], ['output_view', 'SALIDA', 45, {}], ['countdown', 'TIEMPO', 60, { formato: 'tiempo' }]]
        .forEach(([n, rot, ej, mas], i) => { const { formato, ...resto } = mas;
          L.push([formato === 'tiempo' ? 'tiempo' : 'lectura', n, m + i * (wDato + gap), yDato, wDato, hDato, { texto: rot, ejemplo: ej, ...resto }]); });
      L.push(['pasos', 'steps', m, yPasos, W - 2 * m, hPasos]);

      /* la botonera: - y + a la izquierda, PARO y MARCHA a la derecha */
      const f = G.letra(22), fs = G.letra(26), wPM = ancho(G, 64, 44), wMarcha = ancho(G, 224, 96), wParo = ancho(G, 176, 80);
      L.push(...BOTONERA(G),
        ['button', 'btn_minus', m, G.yBot, wPM, G.bot, { texto: '−', estilo: { fuente: fs } }],
        ['button', 'btn_plus', m + wPM + gap, G.yBot, wPM, G.bot, { texto: '+', estilo: { fuente: fs } }],
        ['button', 'btn_stop', W - m - wMarcha - gap * 2 - wParo, G.yBot, wParo, G.bot, { texto: 'PARO', estilo: { clase: 'paro', fuente: f } }],
        ['button', 'btn_start', W - m - wMarcha, G.yBot, wMarcha, G.bot, { texto: 'MARCHA', estilo: { clase: 'marcha', fuente: f } }]);
      return L;
    },
  },
  ajustes: {
    nombre: 'Ajustes',
    desc: 'Tres valores que se cambian con − y +, cada uno en su fila, y GUARDAR para que no se pierdan al apagar.',
    piezas(G){
      const { W, m, gap } = G;
      const L = [...CABECERA(G, 'AJUSTES')];
      /* tres filas, o las que quepan sin aplastar el valor */
      const cuerpo = G.abajo - G.arriba;
      const filas = [['CONSIGNA', 30], ['TIEMPO DE RETENCIÓN', 60], ['VELOCIDAD', 1]]
        .slice(0, Math.max(1, Math.min(3, Math.floor((cuerpo + gap) / (MIN_DATO + gap)))));
      const hFila = Math.max(MIN_DATO, Math.min(92, Math.floor((cuerpo - (filas.length - 1) * gap) / filas.length)));
      const wBtn = ancho(G, 88, 48), hBtn = Math.min(58, hFila - 8), fs = G.letra(26);
      filas.forEach(([rot, ej], i) => {
        const y = G.arriba + i * (hFila + gap), n = i + 1;
        L.push(['lectura', 'setting_' + n, m, y, W - 2 * m - 2 * (wBtn + gap), hFila, { texto: rot, ejemplo: ej }],
               ['button', 'setting_' + n + '_minus', W - m - 2 * wBtn - gap, y + (hFila - hBtn) / 2 | 0, wBtn, hBtn, { texto: '−', estilo: { fuente: fs } }],
               ['button', 'setting_' + n + '_plus', W - m - wBtn, y + (hFila - hBtn) / 2 | 0, wBtn, hBtn, { texto: '+', estilo: { fuente: fs } }]);
      });
      const wG = ancho(G, 224, 96);
      L.push(...BOTONERA(G), ...VOLVER(G),
        ['button', 'btn_save', W - m - wG, G.yBot, wG, G.bot, { texto: 'GUARDAR', estilo: { clase: 'marcha', fuente: G.letra(22) } }]);
      return L;
    },
  },
  diagnostico: {
    nombre: 'Diagnóstico',
    desc: 'Para el técnico: un reloj de aguja con la salida y, al lado, cuatro valores para revisar de un vistazo.',
    piezas(G){
      const { W, m, gap } = G;
      const L = [...CABECERA(G, 'DIAGNÓSTICO'), PILDORA(G, 'status_diag')];
      const hCuerpo = G.abajo - G.arriba;
      /* el reloj, cuadrado y tan grande como deje el alto */
      const wTarj = Math.min(Math.round((W - 2 * m - gap) * 0.52), hCuerpo + 60);
      const lado = Math.max(120, Math.min(wTarj - 24, hCuerpo - 34));
      L.push(['tarjeta', 'card_gauge', m, G.arriba, wTarj, hCuerpo, { texto: 'SALIDA' }],
             ['aguja', 'gauge', m + (wTarj - lado) / 2 | 0, G.arriba + 26 + (hCuerpo - 26 - lado) / 2 | 0, lado, lado, { ejemplo: 33.3 }]);
      /* a su derecha, tantos datos como quepan (hasta cuatro) */
      const cuantos = Math.max(1, Math.min(4, Math.floor((hCuerpo + gap) / (MIN_DATO + gap))));
      const hDato = Math.min(68, Math.floor((hCuerpo - (cuantos - 1) * gap) / cuantos));
      const x = m + wTarj + gap;
      ['ENTRADA', 'SALIDA', 'TEMPERATURA', 'CONSIGNA'].slice(0, cuantos).forEach((rot, i) =>
        L.push(['lectura', 'diag_' + (i + 1), x, G.arriba + i * (hDato + gap), W - m - x, hDato, { texto: rot, ejemplo: [24.1, 33.3, 41.5, 30][i] }]));
      L.push(...BOTONERA(G), ...VOLVER(G));
      return L;
    },
  },
  marco: {
    nombre: 'En blanco',
    desc: 'Solo la cabecera y la botonera, con VOLVER. El centro, libre para lo tuyo.',
    piezas: G => [...CABECERA(G, 'PANTALLA'), ...BOTONERA(G), ...VOLVER(G)],
  },
};

/* Lo que la pantalla sabe mostrar (una OLED o una Nextion no dibujan
   una curva) */
function piezaCabe(tipo, P){
  if (esMono(P) && !WIDGETS_MONO.has(tipo)) return false;
  if (esSerie(P) && !WIDGETS_SERIE.has(tipo)) return false;
  return true;
}
const piezasPara = (clave, P) => PLANTILLAS[clave].piezas(reticula(P.ancho, P.alto)).filter(p => piezaCabe(p[0], P));

/* Un dibujo pequeno de la plantilla, en la pantalla de verdad y con los
   colores del tema: se ve lo que se va a crear antes de crearlo */
function miniaturaPlantilla(clave, anchoMin = 120){
  const tm = E.tema, P = placa(), k = anchoMin / P.ancho, alto = Math.round(P.alto * k);
  const r = (x, y, w, h, fondo, borde, rad = 2) =>
    `<rect x="${(x * k).toFixed(1)}" y="${(y * k).toFixed(1)}" width="${(w * k).toFixed(1)}" height="${(h * k).toFixed(1)}" rx="${rad}" fill="${fondo}"${borde ? ` stroke="${borde}" stroke-width="0.6"` : ''}/>`;
  const partes = piezasPara(clave, P).map(([tipo, , x, y, w, h, extra = {}]) => {
    const e = extra.estilo || {};
    switch (tipo){
      case 'panel':   return r(x, y, w, h, tm.superficie, tm.borde, 0);
      case 'tarjeta': return r(x, y, w, h, tm.superficie, tm.borde);
      case 'dato':    return r(x, y, w, h, tm.superficie, tm.borde) + r(x + w * 0.08, y + h * 0.55, w * 0.35, h * 0.12, tm.texto, null, 1);
      case 'button':  { const c = colorBoton({ estilo: e }); return r(x, y, w, h, c.fondo, c.borde); }
      case 'lectura': return r(x, y + h * 0.25, w * 0.55, h * 0.55, tm.texto, null, 2);
      case 'barra-consigna': return r(x, y + 6, w, 12, tm.pista, null, 3) + r(x, y + 6, w * 0.33, 12, tm.acento, null, 3);
      case 'curva':   return `<polyline fill="none" stroke="${tm.acento}" stroke-width="1.4" points="${[[0, 1], [0.45, 1], [0.7, 0.25], [1, 0.25]].map(([a, b]) => `${((x + w * a) * k).toFixed(1)},${((y + h * b) * k).toFixed(1)}`).join(' ')}"/>`;
      case 'aguja':   { const cx = (x + w / 2) * k, cy = (y + h / 2) * k, rr = w * 0.38 * k, g = w * 0.09 * k;
                        return `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${tm.pista}" stroke-width="${g}"/>`
                             + `<path d="M ${cx - rr * 0.707} ${cy + rr * 0.707} A ${rr} ${rr} 0 0 1 ${cx - rr} ${cy - rr * 0.2}" fill="none" stroke="${tm.acento}" stroke-width="${g}"/>`; }
      case 'pildora': return r(x, y, w, h, tm.sub, tm.tenue, h * k / 2);
      case 'pasos':   return [0, 1, 2, 3].map(i => r(x + i * (w + 10) / 4, y, (w + 10) / 4 - 10, h, i === 1 ? colorBoton({ estilo: { clase: 'seleccion' } }).fondo : tm.sub, null)).join('');
      case 'label':   return r(x, y + 4, Math.min(w, 90), 12, tm.texto, null, 1);
      default:        return '';
    }
  }).join('');
  return `<svg width="${anchoMin}" height="${alto}" viewBox="0 0 ${anchoMin} ${alto}" style="display:block;border-radius:4px;background:${tm.fondo}">${partes}</svg>`;
}

/* Crea la pantalla. Si la actual esta vacia, la usa (asi no queda una
   pantalla en blanco colgando); si no, crea una nueva. */
function aplicarPlantilla(clave){
  const pl = PLANTILLAS[clave], P = placa();
  if (!pl || !plantillasCaben(P)) return;
  HIST.iniciar();
  let sc = pantalla();
  if (sc.widgets.length){
    let i = 1, n = clave;
    while (E.pantallas.some(s => s.nombre === n)) n = clave + '_' + ++i;
    sc = { nombre: n, widgets: [] };
    E.pantallas.push(sc);
    E.iPantalla = E.pantallas.length - 1;
  }
  sc.plantilla = clave;

  const estados = estadosEscritos();
  for (const [tipo, base, x, y, w, h, extra = {}] of piezasPara(clave, P)){
    const pieza = {
      id: 'w' + (E.contador++), tipo, nombre: nombreLibre(base),
      x: Math.round(x), y: Math.round(y), w: Math.max(8, Math.round(w)), h: Math.max(8, Math.round(h)),
      bind: '', series: [], texto: '', evento: '', destino: '',
    };
    if (GEOMETRIA_ANTERIOR[tipo] || PROPORCION[tipo]) pieza.caja = CAJA_VERSION;
    if ((tipo === 'lectura' || tipo === 'tiempo') && extra.tarjeta === undefined && !extra.suelta) pieza.tarjeta = true;
    const { estilo, irA, suelta, ...resto } = extra;
    Object.assign(pieza, resto);
    if (estilo) pieza.estilo = { ...estilo };
    if (irA) pieza.irA = irA;
    /* la marca de consigna, con la consigna del proyecto si la hay */
    if (CON_CONSIGNA.has(tipo) && !pieza.consigna){ const sp = consignaPropuesta(''); if (sp) pieza.consigna = sp; }
    /* los pasos del proceso, con los estados de la logica si ya hay */
    if (tipo === 'pasos') pieza.elementos = estados.length ? estados.join('\n') : 'REPOSO\nMARCHA\nFIN';
    sc.widgets.push(pieza);
  }
  enlazarNavegacion();
  limpiarSeleccion(); pintar();
}

/* Los estados que hay escritos en la logica, aunque todavia tenga
   errores: justo al poner una plantilla es normal que la logica nombre
   botones que aun no existen, y los pasos del proceso deben salir igual */
function estadosEscritos(){
  if (bloquesLogica().length) return estadosProyecto();
  try {
    const d = LOGICA.parse(E.logica || '').data || {};
    const bloque = d.states ? d : Object.values(d).find(x => x && typeof x === 'object' && x.states);
    if (bloque && bloque.states && typeof bloque.states === 'object') return Object.keys(bloque.states);
  } catch (e) { /* sin logica legible: los de ejemplo */ }
  return [];
}

/* Los botones con irA van a la pantalla que se creo con esa plantilla.
   Se repasa cada vez: crear Ajustes despues de Operacion engancha el
   boton AJUSTES que ya estaba esperando. Un destino puesto a mano no se
   toca. */
function enlazarNavegacion(){
  const de = clave => E.pantallas.find(s => s.plantilla === clave);
  for (const sc of E.pantallas) for (const w of sc.widgets){
    if (!w.irA || w.destino) continue;
    const dest = de(w.irA) || (w.irA === 'operacion' ? E.pantallas[0] : null);
    if (dest && dest !== sc) w.destino = dest.nombre;
  }
}

/* El bloque del panel: una tarjeta por plantilla, con su dibujo */
function bloquePlantillas(){
  const P = placa();
  if (!plantillasCaben(P))
    return `<div class="regla" style="margin-top:10px">${t('Las plantillas necesitan una pantalla de al menos 320×240.')}</div>`;
  return `<div class="plantillas">
    <div class="regla" style="margin:10px 0 6px">${t('O empieza con una plantilla:')}</div>
    <div class="plantillas-rejilla">${Object.entries(PLANTILLAS).map(([k, pl]) =>
      `<button class="plantilla" data-plantilla="${k}" title="${esc(t(pl.desc))}">
        ${miniaturaPlantilla(k)}<span>${esc(t(pl.nombre))}</span></button>`).join('')}</div>
    ${E.tema.base === 'aula' ? `<div class="regla" style="margin-top:6px">${t('Se ven mejor con el tema Industrial (pestaña Estilo).')}</div>` : ''}
  </div>`;
}
