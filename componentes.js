/* =====================================================================
 * Telar Studio — COMPONENTES INDUSTRIALES
 *
 * Piezas compuestas, con las medidas y los colores del HMI del variac:
 * una tarjeta con su rotulo, una lectura grande con la unidad pegada al
 * numero, un dato en su tarjeta, la pildora de estado, los pasos del
 * proceso...
 *
 * Cada componente vive ENTERO aqui: lo que pinta el lienzo, lo que
 * calcula el simulador y el C que se genera. Si estuvieran repartidos
 * entre tres ficheros, tarde o temprano el editor ensenaria una cosa y
 * la placa otra (ver "Lienzo y generador, un solo numero").
 *
 * Todos siguen el tema: colores con oficio y tipografia por papeles. Con
 * el tema Aula salen con Montserrat y los colores de siempre; con el
 * Industrial, exactamente como el variac.
 * ===================================================================== */

/* ------------------------------------------------------------ ayudas */

/* La letra de una parte del componente: el tipo que el tema da a su
   papel y un tamano. Con Montserrat el tamano se pega a los que LVGL
   trae compilados; con Chivo o Plex se usa tal cual. */
function letraParte(w, papel, px){
  const e = (w && w.estilo) || {};
  /* 1. la elegida para ESA parte; 2. la elegida para el elemento, si esta
     es su parte principal; 3. la que el tema da a ese papel */
  const principal = typeof papelDe === 'function' ? papelDe(w) : null;
  let v = e['tipo_' + papel] || (papel === principal && e.tipo) || (E.tema.tipografia || {})[papel] || 'medium';
  /* la negrita y la cursiva de siempre, mientras la familia sea Montserrat */
  if (v === 'medium' && (e.negrita || e.cursiva))
    v = e.negrita && e.cursiva ? 'bolditalic' : e.negrita ? 'bold' : 'italic';
  const tam = Math.max(10, Math.round(px));   /* por debajo de 10 no se lee en un panel */
  /* Montserrat se ajusta al tamano mas cercano de los que se pueden usar,
     que son los compilados en LVGL Y los grandes que se generan al
     exportar (hasta 360). Con solo los compilados, un numero enorme se
     quedaba clavado en 48 px por mucho que creciera su caja. */
  const p = tipoLibre(v) ? tam : TODAS_FUENTES.reduce((a, b) => Math.abs(b - tam) < Math.abs(a - tam) ? b : a);
  return { v, px: p };
}
/* Texto listo para C con esa letra: las tildes, solo si la fuente las trae */
const txtParte = (s, L) => (fuenteEsPropia(L.px, L.v) ? String(s ?? '') : quitarTildes(s))
  .replace(/\\/g, '\\\\').replace(/"/g, '\\"');
/* Texto para el lienzo con esa letra: lo que se vera de verdad */
const verParte = (s, L) => esc(fuenteEsPropia(L.px, L.v) ? String(s ?? '') : comoEnPlaca(s));
const cssParte = L => letraCSS(L.v, L.px);
const radioTema = () => E.tema.radio ?? 6;

/* Los colores que usa DE VERDAD cada componente, con el nombre que tiene
   en el tema y el que se le ensena al alumno. Es la unica lista: de aqui
   salen el panel de estilo, el menu del boton derecho, el dibujo del
   lienzo y el C. Antes el panel ofrecia "Acento" y "Fondo" a todos, y el
   componente no los leia: se cambiaba el color y no pasaba nada. */
const COLORES_COMPONENTE = {
  tarjeta:          [['superficie', 'Fondo'], ['borde', 'Borde'], ['rotulo_c', 'Rótulo', 'tenue']],
  /* un tercer nombre = de que color del tema sale si nadie lo toca: el
     rotulo y la unidad parten los dos del texto secundario, pero cada uno
     se cambia por su lado */
  lectura:          [['texto', 'Número'], ['rotulo_c', 'Rótulo', 'tenue'], ['unidad_c', 'Unidad', 'tenue']],
  tiempo:           [['texto', 'Número'], ['rotulo_c', 'Rótulo', 'tenue']],
  dato:             [['superficie', 'Fondo'], ['tenue', 'Rótulo'], ['texto', 'Valor']],
  pildora:          [],
  pasos:            [['superficie', 'Casillas'], ['tinta3', 'Texto de los pasos'],
                     ['act_fondo', 'Paso actual: fondo', 'seleccion.fondo'], ['act_borde', 'Paso actual: borde', 'seleccion.borde'],
                     ['act_texto', 'Paso actual: texto', 'seleccion.texto']],
  'barra-consigna': [['pista', 'Pista'], ['acento', 'Relleno'], ['ok', 'Marca de consigna'], ['tenue', 'Escala']],
  curva:            [['acento', 'Curva'], ['tinta3', 'Referencia'], ['ok', 'Línea de consigna'], ['rejilla', 'Rejilla'], ['tenue', 'Ejes']],
  aguja:            [['pista', 'Pista'], ['acento', 'Arco'], ['ok', 'Marca de consigna'], ['cons_c', 'Texto de la consigna', 'ok'], ['texto', 'Número'], ['tenue', 'Escala y unidad']],
};
/* Los que marcan una consigna (la raya de la barra, la linea discontinua
   de la curva, la marca del reloj). Sin consigna elegida esa marca no se
   dibuja, ni en el lienzo ni en la placa. */
const CON_CONSIGNA = new Set(['barra-consigna', 'curva', 'aguja']);
/* La marca de consigna son tres cosas separadas:
 *   - si se dibuja: w.marca (por defecto si; false la oculta),
 *   - de donde sale su valor: una variable (w.consigna) o, si no hay,
 *     un numero fijo (w.consignaValor, o el 30 % de la escala),
 *   - de que color es: el estilo (ok), en la pestana Estilo.
 * Asi se ve desde el primer momento, aunque el proyecto aun no tenga
 * logica: antes solo aparecia con una variable enlazada, y en un diseno
 * que empieza de cero no salia nunca. */
const marcaVisible = w => w.marca !== false;
const spVar = w => marcaVisible(w) && w.consigna ? varPorNombre(w.consigna) : null;
function spFijo(w){
  if (w.consignaValor !== undefined && w.consignaValor !== '' && !isNaN(w.consignaValor)) return Number(w.consignaValor);
  const r = rangoDe(w);
  return r.min + (r.max - r.min) * 0.3;
}
/* el valor de la consigna: en el C (expresion) y en el simulador (numero) */
const spC = w => { const v = spVar(w); return v ? `s->${cid(v.nombre)}` : flt(spFijo(w)); };
const spAhora = (w, S) => { const v = spVar(w); return v ? Number(S[v.nombre] || 0) : spFijo(w); };
/* un valor, como fraccion de la escala del elemento (0..1) */
const fracRango = (w, x) => { const r = rangoDe(w); return Math.min(1, Math.max(0, (Number(x) - r.min) / (r.max - r.min))); };
/* La consigna que se propone al crear uno: un ajuste del proyecto, mejor
   si se llama como una consigna (setpoint, sp, consigna, objetivo...) */
function consignaPropuesta(bind){
  const vs = typeof variables === 'function' ? variables() : [];
  const med = vs.find(v => v.nombre === bind) || {};
  /* un ajuste: del hardware (dir ajuste) o un setting de la logica */
  const aj = vs.filter(v => (v.dir === 'ajuste' || v.tipoLogica === 'setting') && v.nombre !== bind && !v.booleano);
  const nombre = v => /set|^sp|_sp|consig|objet|target|ref/i.test(v.nombre);
  const unidad = v => med.unidad && v.unidad === med.unidad;
  return (aj.find(v => nombre(v) && unidad(v)) || aj.find(nombre) || aj.find(unidad) || aj[0] || {}).nombre || '';
}

/* La parte de cada componente que manda: la que lleva el tamano de letra
   y la tipografia que se ofrecen en el panel. El resto de partes salen
   de ella o del tema. */
const PARTE_FUENTE = {
  lectura: 'num', tiempo: 'num', dato: 'val', pildora: 'txt', pasos: 'txt',
  aguja: 'num', 'barra-consigna': 'lab', curva: 'lab', tarjeta: 'rot',
};
/* Una letra que no trae la coma (el display de 7 segmentos): ahi el
   numero sale con punto decimal, en el lienzo y en la placa, porque
   una coma que la fuente no tiene no se dibujaria. */
function sinComa(w){
  const C = COMPONENTES[w.tipo], k = PARTE_FUENTE[w.tipo];
  let v;
  try { v = C && k ? (C.partes(w)[k] || {}).v : varianteFuente(w); } catch (e) { return false; }
  const s = (TIPOS[v] || {}).solo;
  return !!(s && !s.includes(','));
}
/* El tamano que tendria esa parte si nadie lo hubiera fijado a mano */
function fuenteAutoComponente(w){
  const C = COMPONENTES[w.tipo], k = PARTE_FUENTE[w.tipo];
  if (!C || !k) return 0;
  const e = { ...(w.estilo || {}) }; delete e.fuente;
  return (C.partes({ ...w, estilo: e })[k] || {}).px || 0;
}

/* El tema tal como lo ve un elemento: el del proyecto, con sus colores
   propios encima. Todo componente pinta con esto, nunca con E.tema. */
function temaDe(w){
  const e = (w && w.estilo) || {}, tm = { ...E.tema };
  const L = COLORES_COMPONENTE[w && w.tipo] || [];
  for (const [k] of L) if (e[k]) tm[k] = e[k];
  /* los que salen de otro: el suyo, o el de su base (el propio del
     elemento si lo tenia, como los proyectos de antes con "tenue") */
  for (const [k, , base] of L) if (base && !e[k]) tm[k] = e[base] || valorTema(base);
  /* Y los derivados que ESTE componente no ofrece en su panel siguen
     existiendo: el Tiempo hereda del Numero el codigo de la unidad
     (aunque la oculte), y sin esto el C salia con lv_color_hex(0xundefined)
     y no compilaba. */
  for (const [k, base] of Object.entries(COLOR_DERIVADO))
    if (tm[k] === undefined) tm[k] = e[k] || e[base] || E.tema[base];
  return tm;
}
/* Colores que no estan en el tema: salen de otro color del tema */
const COLOR_DERIVADO = { rotulo_c: 'tenue', unidad_c: 'tenue' };
/* Un color del tema por su nombre; con punto, dentro de un grupo
   ('seleccion.fondo': el fondo de lo Seleccionado) */
const valorTema = k => String(k).includes('.') ? String(k).split('.').reduce((o, p) => (o || {})[p], E.tema) : E.tema[k];

/* El rotulo: pequeno, en mayusculas, espaciado y apagado */
const ROTULO_PX = 11, ROTULO_ESPACIO = 2;

/* Los estados del primer bloque, en orden: la pildora y los pasos */
/* los escritos en la logica aunque aun tenga errores (plantillas.js); si no, los de siempre */
const estadosDe = () => (typeof estadosEscritos === 'function' && estadosEscritos().length ? estadosEscritos()
  : (typeof estadosProyecto === 'function' ? estadosProyecto() : E.estados)) || [];

/* El color de cada estado para la pildora: el que diga la logica en
   looks (un color con nombre o un #rrggbb), o el apagado. */
function lookDe(w, estado){
  const B = typeof bloquesLogica === 'function' ? bloquesLogica() : [];
  for (const b of B){
    const filas = b.looks && b.looks[w.nombre];
    if (!filas) continue;
    const f = Object.entries(filas).find(([k]) => k.replace(/^in\s+/, '') === estado);
    if (f) return f[1] || {};
  }
  return {};
}
const colorLook = c => (c && ((window.LOGICA && LOGICA.COLORS && LOGICA.COLORS[c]) || c)) || null;

/* Lo que dice un numero con sus decimales, coma y unidad */
function formatoNumero(v, dec){ return conComa(Number(v || 0).toFixed(dec ?? 1)); }
/* La cifra mas ancha de una letra (en Montserrat el 1 es la mitad que el
   0). Se guarda por letra y tamano, pero solo cuando las fuentes ya
   cargaron: medida con la de respaldo daria otra. */
/* El ancho de cada caracter que puede salir en un numero, por letra y
   tamano. Solo se guarda cuando las fuentes ya cargaron: medido con la
   de respaldo daria otro. */
const ANCHO_CARACTER = {};
function anchosCaracter(L){
  const k = L.v + '|' + L.px;
  if (ANCHO_CARACTER[k]) return ANCHO_CARACTER[k];
  const W = {};
  for (const c of '0123456789.,:-') W[c] = medirTexto(c, L.px, { tipo: 'x', estilo: { tipo: L.v } }).w;
  if (typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded') ANCHO_CARACTER[k] = W;
  return W;
}
/* La cifra mas ancha entre dos (incluidas) */
function cifraMasAncha(W, desde = 0, hasta = 9){
  let mejor = String(desde);
  for (let d = desde; d <= hasta; d++) if (W[d] > W[mejor]) mejor = String(d);
  return mejor;
}
/* El numero MAS ANCHO que no pasa de "tope" ("100.00", con sus decimales
   y su separador). Mira todas las formas posibles cifra a cifra (con el
   mismo numero de cifras que el tope sin pasarse de el, o con menos
   cifras enteras y cualquier cifra), sumando el ancho de cada caracter.
   Con tope 100.00 en Montserrat sale 100.00; con tope 250.0, 208.8. */
function numeroMasAncho(tope, W){
  const t = String(tope), sep = t.includes('.') ? '.' : t.includes(',') ? ',' : '';
  const [ent, dec = ''] = sep ? t.split(sep) : [t, ''];
  const ancho = x => [...x].reduce((a, c) => a + (W[c] || 0), 0);
  const cands = [];
  /* misma forma que el tope, sin pasarse: cifra a cifra, mientras se va
     "pegado" al tope solo valen cifras hasta la suya */
  const cifras = ent + dec, n = cifras.length, memo = {};
  const mejor = (i, pegado) => {
    if (i === n) return '';
    const k = i + '|' + pegado;
    if (memo[k] !== undefined) return memo[k];
    const lim = pegado ? +cifras[i] : 9, min = i === 0 && ent.length > 1 ? 1 : 0;
    let res = null;
    for (let d = min; d <= lim; d++){
      const resto = mejor(i + 1, pegado && d === lim);
      if (resto === null) continue;
      const c = d + resto;
      if (res === null || ancho(c) > ancho(res)) res = c;
    }
    return (memo[k] = res);
  };
  const m = mejor(0, true);
  if (m !== null) cands.push(m.slice(0, ent.length) + (sep ? sep + m.slice(ent.length) : ''));
  /* con menos cifras enteras, cualquier cifra vale */
  const fr = dec ? sep + cifraMasAncha(W).repeat(dec.length) : '';
  for (let l = 1; l < ent.length; l++)
    cands.push((l > 1 ? cifraMasAncha(W, 1) : cifraMasAncha(W)) + cifraMasAncha(W).repeat(l - 1) + fr);
  return cands.reduce((a, b) => ancho(b) > ancho(a) ? b : a, cands[0] || t);
}
/* El mm:ss mas ancho que no pasa de "seg" segundos */
function tiempoMasAncho(seg, W){
  const tope = Math.max(0, Math.round(seg)), mmMax = Math.floor(tope / 60);
  const ancho = x => [...x].reduce((a, c) => a + (W[c] || 0), 0);
  let res = '00:00';
  for (let mm = 0; mm <= mmMax; mm++){
    const ssMax = mm === mmMax ? tope % 60 : 59;
    let ss = '00';
    for (let v = 0; v <= ssMax; v++){ const c = String(v).padStart(2, '0'); if (ancho(c) > ancho(ss)) ss = c; }
    const c = String(mm).padStart(2, '0') + ':' + ss;
    if (ancho(c) > ancho(res)) res = c;
  }
  return res;
}
const mmssJS = s => { const t = Math.max(0, Math.round(Number(s) || 0)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };

/* La variable enlazada y su unidad */
const varDeW = w => (typeof variables === 'function' ? variables() : []).find(x => x.nombre === w.bind);
/* La unidad: la escrita, o la de la variable. Si se ensena la tasa, la
   de la variable por segundo (kV -> kV/s). */
const unidadDe = w => {
  if (w.unidad !== undefined && w.unidad !== '') return w.unidad;
  const u = (varDeW(w) || {}).unidad || '';
  return w.tasa ? (u ? u + '/s' : '/s') : u;
};
/* ¿Se ensena como tiempo? Un temporizador de la logica o una variable en segundos */
/* Un tiempo se ensena como mm:ss. Lo es el widget Tiempo, siempre; el
   Numero, nunca (por eso hay dos widgets: antes el Numero adivinaba por la
   unidad "s" y el alumno no sabia que iba a salir). El Dato de antes, que
   ya no se ofrece, conserva su adivinanza para que nada cambie. */
const esTiempo = w => w.tipo === 'tiempo' || w.formato === 'tiempo'
  || (w.tipo === 'dato' && w.formato !== 'numero' && /^s$/.test(unidadDe(w)) && !!varDeW(w));

/* =====================================================================
 * EL CATALOGO
 * ===================================================================== */
const COMPONENTES = {

  /* ------------------------------------------------------ TARJETA */
  tarjeta: {
    catalogo: { grupo:'Básico', nombre:'Tarjeta o panel', icono:'▢', acepta:'ninguno', w:396, h:200,
                ayuda:'Un fondo del color del tema para agrupar lo que pongas encima. El rótulo es opcional, y con un color de borde queda como un panel con marco.' },
    textoPorDefecto: '',   /* nace sin rotulo: se escribe en el panel si hace falta */
    papel(){ return 'rotulo'; },
    /* el rotulo, con la misma libertad que el del Numero: su letra y su
       tamano (tipo_rot / fuente_rot; si no, los del elemento o del tema)
       y su sitio (rotuloDx / rotuloDy, desde la esquina de siempre) */
    partes(w){
      const e = w.estilo || {}, ww = e.tipo_rot ? { ...w, estilo: { ...e, tipo_rotulo: e.tipo_rot } } : w;
      return { rot: letraParte(ww, 'rotulo', Math.min(360, e.fuente_rot || e.fuente || ROTULO_PX)) };
    },
    posRotulo(w){ return { x: Math.max(0, 20 + (Number(w.rotuloDx) || 0)), y: Math.max(0, 18 + (Number(w.rotuloDy) || 0)) }; },
    fuentes(w){ const P = this.partes(w); return w.texto ? [{ px: P.rot.px, variante: P.rot.v, texto: w.texto }] : []; },
    dibujo(w){
      const P = this.partes(w), tm = temaDe(w), e = w.estilo || {}, bde = e.borde, rad = e.radio ?? radioTema();
      return `<div style="width:100%;height:100%;background:${tm.superficie};border-radius:${rad}px;position:relative${bde ? `;border:1px solid ${bde};box-sizing:border-box` : ''}">
        ${w.texto ? `<div data-parte="rot" title="${esc(t('Arrástralo para moverlo'))}" style="position:absolute;left:${this.posRotulo(w).x}px;top:${this.posRotulo(w).y}px;white-space:nowrap;font:${cssParte(P.rot)};letter-spacing:${ROTULO_ESPACIO}px;color:${tm.rotulo_c}">${verParte(w.texto, P.rot)}</div>` : ''}
      </div>`;
    },
    decl(w, id){ return `static lv_obj_t *${id};\n`; },
    crear(w, id, pon){
      const P = this.partes(w), tm = temaDe(w);
      pon(`${id} = lv_obj_create(p);`);
      pon(`lv_obj_set_pos(${id}, ${w.x}, ${w.y});`);
      pon(`lv_obj_set_size(${id}, ${w.w}, ${w.h});`);
      pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(tm.superficie)}), LV_PART_MAIN);`);
      pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_COVER, LV_PART_MAIN);`);
      const e = w.estilo || {}, bde = e.borde;
      pon(`lv_obj_set_style_border_width(${id}, ${bde ? 1 : 0}, LV_PART_MAIN);`);
      if (bde) pon(`lv_obj_set_style_border_color(${id}, lv_color_hex(${colorC(bde)}), LV_PART_MAIN);`);
      pon(`lv_obj_set_style_radius(${id}, ${e.radio ?? radioTema()}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_pad_all(${id}, 0, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_shadow_width(${id}, 0, LV_PART_MAIN);`);
      pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_SCROLLABLE);`);
      pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_CLICKABLE);`);
      if (w.texto){
        pon(`{ lv_obj_t *r = lv_label_create(${id});`);
        pon(`  lv_obj_set_pos(r, ${this.posRotulo(w).x}, ${this.posRotulo(w).y});`);
        pon(`  lv_label_set_text(r, "${txtParte(w.texto, P.rot)}");`);
        pon(`  lv_obj_set_style_text_font(r, &${simboloFuente(P.rot.px, P.rot.v)}, LV_PART_MAIN);`);
        pon(`  lv_obj_set_style_text_color(r, lv_color_hex(${colorC(tm.rotulo_c)}), LV_PART_MAIN);`);
        pon(`  lv_obj_set_style_text_letter_space(r, ${ROTULO_ESPACIO}, LV_PART_MAIN); }`);
      }
    },
    refresco(){ return ''; },
    vivo(){ return {}; }
  },

  /* ----------------------------------------------- LECTURA GRANDE */
  lectura: {
    catalogo: { grupo:'Visualización', nombre:'Número', icono:'33', acepta:'lectura', w:356, h:120,
                ayuda:'Un número con su unidad y, si quieres, un rótulo encima. Suelto se lee de lejos; en tarjeta queda como un dato de panel. Si la variable es un tiempo, sale como mm:ss.' },
    textoPorDefecto: 'MEDIDA',
    /* Un solo componente para las dos presentaciones del variac:
     *   - suelto: rotulo arriba y el numero enorme (la medida principal),
     *   - en tarjeta: fondo, rotulo pequeno y el numero mediano (un dato).
     * Antes eran dos widgets distintos, y encima habia otros dos clasicos
     * que hacian lo mismo: el alumno no tenia forma de saber cual elegir. */
    pad(w){ return w.tarjeta ? 18 : 0; },
    /* su parte principal: de ahi salen la tipografia y la negrita */
    papel(w){ return w.tarjeta ? 'dato' : 'numero'; },
    /* un mm:ss ya dice que son segundos: repetir la unidad sobra */
    unidad(w){ return w.unidadPos === 'oculta' || esTiempo(w) ? '' : unidadDe(w); },
    /* Donde va la unidad, respecto al numero:
     *   detras  pegada detras, a la altura de la cabeza (el variac)
     *   base    pegada detras, apoyada en la misma linea que el numero
     *   debajo / encima
     * y desde ahi se mueve lo que se quiera con unidadDx / unidadDy. */
    unidadPos(w){
      if (!this.unidad(w)) return 'no';
      return ['base', 'debajo', 'encima'].includes(w.unidadPos) ? w.unidadPos : 'detras';
    },
    muestra(w){ return esTiempo(w) ? mmssJS(w.ejemplo ?? 60) : formatoNumero(w.ejemplo ?? 0, w.decimales); },
    /* Hasta donde puede llegar en la placa: el ancho con el valor mas
       ancho del rango. La caja abraza el ejemplo (es lo que se pidio);
       esto solo se ensena en el lienzo y avisa si choca con algo. */
    anchoMaximo(w){
      const P = this.partes(w), texto = this.muestraAncha(w, P.num);
      const D = this.disposicion({ ...w, estilo: { ...(w.estilo || {}), alinear: '' } }, P, texto);
      const ancho = Math.max(D.num.x + D.numW, D.pos === 'no' ? 0 : D.uni.x + D.uniW) + D.pad + 4;
      /* lo que se le ensena al alumno es el valor de verdad (100.00), no
         la plantilla con la que se mide (000.00) */
      return { ancho: Math.round(ancho), texto: texto + (this.unidad(w) && D.pos !== 'no' ? ' ' + this.unidad(w) : '') };
    },
    /* El texto MAS ANCHO que puede salir en la placa dentro del rango de
       la variable: un valor real (100.00), no una plantilla (000.00, que
       en Montserrat sobraba una cifra entera porque el 1 es estrecho). */
    muestraAncha(w, L){
      const ej = this.muestra(w);
      if (!varDeW(w)) return ej;
      const r = rangoDe(w), W = anchosCaracter(L);
      const cands = [ej];
      if (esTiempo(w)) cands.push(tiempoMasAncho(Math.max(Math.abs(r.max), Math.abs(r.min)), W));
      else {
        if (r.max > 0) cands.push(numeroMasAncho(formatoNumero(r.max, w.decimales), W));
        if (r.min < 0) cands.push('-' + numeroMasAncho(formatoNumero(-r.min, w.decimales), W));
      }
      const mide = x => medirTexto(x, L.px, { tipo: 'x', estilo: { tipo: L.v } }).w;
      return cands.reduce((a, b) => mide(b) > mide(a) ? b : a);
    },
    partes(w){
      /* sin tope: el Numero grande de antes crecia con la caja hasta el
         limite del generador de fuentes (360 px), y hay que conservarlo.
         Con la unidad debajo o encima se le deja su linea. */
      const e = w.estilo || {}, hueco = w.h - (w.texto ? 24 : 6);
      /* Con la caja cenida al texto manda la LETRA y la caja va detras.
         Deducirla del alto seria una pescadilla: cada recalculo encogeria
         la caja, y con ella la letra, y el plan de fuentes y el C
         acabarian pidiendo tamanos distintos. */
      const apilada = ['debajo', 'encima'].includes(w.unidadPos);
      const auto = w.auto ? (typeof E !== 'undefined' ? E.tema.fuente * 2 : 32)
                 : w.tarjeta ? Math.max(12, w.h * 0.41)
                 : apilada ? Math.max(16, hueco * 0.59)
                 : Math.max(16, hueco * 0.82);
      const num = letraParte(w, this.papel(w), Math.min(360, e.fuente || auto));
      /* el rotulo y la unidad pueden llevar su propia letra y tamano
         (tipo_rot / fuente_rot, tipo_uni / fuente_uni); si no, los de siempre */
      const conTipo = k => e[k] ? { ...w, estilo: { ...e, tipo_rotulo: e[k], tipo_titulo: e[k] } } : w;
      return { rot: letraParte(conTipo('tipo_rot'), 'rotulo', Math.min(360, e.fuente_rot || ROTULO_PX)), num,
               uni: letraParte(conTipo('tipo_uni'), 'titulo', Math.min(360, e.fuente_uni || Math.max(11, num.px * 0.38))) };
    },
    /* donde empieza el numero: bajo el rotulo, o centrado si no lo hay */
    yNum(w, P){
      if (w.texto) return w.tarjeta ? 26 : 20;
      return w.tarjeta ? Math.round((w.h - altoLineaDe(P.num.px, P.num.v)) / 2) : 0;
    },
    /* El espaciado que lleva el numero: el elegido, o el apretado del
       variac en los numeros grandes */
    espaciado(w, P){ const e = w.estilo || {}; return e.espaciado ? Math.round(e.espaciado) : (P.num.px >= 48 ? -2 : 0); },
    /* LA disposicion: donde van el numero y la unidad. La usan el lienzo,
       el C y la caja cenida, asi que los tres dicen siempre lo mismo. */
    disposicion(w, P, numTxt){
      const pad = this.pad(w), e = w.estilo || {}, pos = this.unidadPos(w), gap = 6;
      const esp = this.espaciado(w, P);
      const nm = medirTexto(numTxt, P.num.px, w);
      const numW = nm.w + (esp - (e.espaciado || 0)) * String(numTxt).length;
      const uniW = pos === 'no' ? 0 : medirTexto(this.unidad(w), P.uni.px, { tipo: 'x', estilo: { tipo: P.uni.v } }).w;
      const hn = altoLineaDe(P.num.px, P.num.v), hu = altoLineaDe(P.uni.px, P.uni.v);
      const detras = pos === 'detras' || pos === 'base';
      const util = w.w - 2 * pad;
      const alinX = ancho => pad + Math.round(({ centro: (util - ancho) / 2, derecha: util - ancho }[e.alinear]) || 0);
      const yN = this.yNum(w, P) + (pos === 'encima' ? hu : 0);
      const numX = detras ? alinX(numW + gap + uniW) : alinX(numW);
      let ux = 0, uy = 0;
      if (pos === 'detras'){ ux = numX + numW + gap; uy = yN + Math.round(P.num.px * 0.13); }
      if (pos === 'base'){   ux = numX + numW + gap; uy = yN + Math.round(hn * 0.8 - hu * 0.8); }
      if (pos === 'debajo'){ ux = alinX(uniW); uy = yN + hn; }
      if (pos === 'encima'){ ux = alinX(uniW); uy = yN - hu; }
      ux += Number(w.unidadDx) || 0; uy += Number(w.unidadDy) || 0;
      /* Si el ajuste saca la unidad por la izquierda o por arriba, se corre
         TODO (rotulo, numero y unidad) lo justo para que quepa: fuera de la
         caja LVGL no dibuja nada, y la unidad desapareceria sin avisar. */
      /* el rotulo, igual: desde su sitio de siempre, lo que se quiera */
      const rx = pad + (Number(w.rotuloDx) || 0), ry = (w.tarjeta ? 12 : 0) + (Number(w.rotuloDy) || 0);
      const conUni = pos !== 'no', conRot = !!w.texto;
      const offX = Math.max(0, conUni ? pad - ux : 0, conRot ? pad - rx : 0);
      const offY = Math.max(0, conUni ? -uy : 0, conRot ? -ry : 0);
      return { pad, pos, gap, util, numW, uniW, hn, hu, esp, offX, offY,
               rot: { x: rx + offX, y: ry + offY },
               num: { x: numX + offX, y: yN + offY }, uni: { x: ux + offX, y: uy + offY } };
    },
    /* la caja cenida al texto: el mismo automatico del Numero grande */
    medida(w){
      const P = this.partes(w), D = this.disposicion({ ...w, estilo: { ...(w.estilo || {}), alinear: '' } }, P, this.muestra(w));
      const rot = w.texto ? medirTexto(comoEnPlaca(w.texto), P.rot.px, { tipo: 'x', estilo: { tipo: P.rot.v } }).w + ROTULO_ESPACIO * w.texto.length : 0;
      const ancho = Math.max(D.num.x + D.numW, D.pos === 'no' ? 0 : D.uni.x + D.uniW, D.rot.x + rot) + D.pad;
      const alto = Math.max(D.num.y + D.hn, D.pos === 'no' ? 0 : D.uni.y + D.hu,
                            w.texto ? D.rot.y + altoLineaDe(P.rot.px, P.rot.v) : 0) + (w.tarjeta ? 12 : 0);
      /* unos pixeles de holgura: las letras sobresalen un poco de su ancho
         medido (el suavizado, la cursiva) y LVGL recorta lo que se sale
         del contenedor */
      return { w: Math.max(8, Math.round(ancho) + 4), h: Math.max(8, Math.round(alto) + 2) };
    },
    fuentes(w){
      const P = this.partes(w);
      return [{ px: P.rot.px, variante: P.rot.v, texto: w.texto || '' },
              { px: P.num.px, variante: P.num.v, texto: '-' },
              { px: P.uni.px, variante: P.uni.v, texto: this.unidad(w) }];
    },
    dibujo(w, V){
      const P = this.partes(w), tm = temaDe(w), e = w.estilo || {};
      /* el ejemplo sale como saldra en la placa: mm:ss si es un tiempo */
      /* una letra sin coma (el display de 7 segmentos) ensena el punto, como la placa */
      const val0 = V && V.texto !== undefined ? V.texto : this.muestra(w), val = sinComa(w) ? String(val0).replace(/,/g, '.') : val0;
      const D = this.disposicion(w, P, val);
      const decor = [e.subrayado && 'underline', e.tachado && 'line-through'].filter(Boolean).join(' ') || 'none';
      const rad = e.radio ?? radioTema();
      return `<div style="width:100%;height:100%;position:relative${w.tarjeta ? `;background:${tm.superficie};border-radius:${rad}px` : ''}">
        ${w.texto ? `<div data-parte="rot" title="${esc(t('Arrástralo para moverlo'))}" style="position:absolute;left:${D.rot.x}px;top:${D.rot.y}px;white-space:nowrap;font:${cssParte(P.rot)};letter-spacing:${ROTULO_ESPACIO}px;color:${tm.rotulo_c}">${verParte(w.texto, P.rot)}</div>` : ''}
        <div style="position:absolute;left:${D.num.x}px;top:${D.num.y}px;white-space:nowrap;font:${cssParte(P.num)};line-height:${D.hn}px;letter-spacing:${D.esp}px;text-decoration:${decor};color:${V && V.color || tm.texto}">${esc(val)}</div>
        ${D.pos === 'no' ? '' : `<div data-parte="uni" title="${esc(t('Arrástrala para moverla'))}" style="position:absolute;left:${D.uni.x}px;top:${D.uni.y}px;white-space:nowrap;font:${cssParte(P.uni)};line-height:${D.hu}px;color:${tm.unidad_c}">${verParte(this.unidad(w), P.uni)}</div>`}
      </div>`;
    },
    decl(w, id){ return `static lv_obj_t *${id}, *${id}_num, *${id}_uni;\n`; },
    crear(w, id, pon){
      const P = this.partes(w), tm = temaDe(w), D = this.disposicion(w, P, this.muestra(w));
      if (w.tarjeta) tarjetaC(id, w, pon); else contenedor(id, w, pon);
      if (w.texto) rotuloEn(id, D.rot.x, D.rot.y, w.texto, P.rot, pon, tm.rotulo_c);
      pon(`${id}_num = lv_label_create(${id});`);
      pon(`lv_obj_set_pos(${id}_num, ${D.num.x}, ${D.num.y});`);
      pon(`lv_label_set_text(${id}_num, "--");`);
      pon(`lv_obj_set_style_text_font(${id}_num, &${simboloFuente(P.num.px, P.num.v)}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_text_color(${id}_num, lv_color_hex(${colorC(tm.texto)}), LV_PART_MAIN);`);
      if (P.num.px >= 48) pon(`lv_obj_set_style_text_letter_space(${id}_num, -2, LV_PART_MAIN);   /* un numero grande se lee mejor un poco apretado */`);
      /* subrayado, tachado y espaciado: los del Numero de siempre */
      estiloTextoC(w, `${id}_num`).forEach(pon);
      pon(`${id}_uni = lv_label_create(${id});`);
      pon(`lv_obj_set_pos(${id}_uni, ${D.uni.x}, ${D.uni.y});`);
      pon(`lv_label_set_text(${id}_uni, "${txtParte(this.unidad(w), P.uni)}");`);
      pon(`lv_obj_set_style_text_font(${id}_uni, &${simboloFuente(P.uni.px, P.uni.v)}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_text_color(${id}_uni, lv_color_hex(${colorC(tm.unidad_c)}), LV_PART_MAIN);`);
    },
    refresco(w, id){
      const v = varDeW(w);
      if (!v) return '';
      const P = this.partes(w), D = this.disposicion(w, P, this.muestra(w)), e = w.estilo || {};
      const detras = D.pos === 'detras' || D.pos === 'base';
      const alin = g => ({ centro: `(${D.util} - ${g}) / 2`, derecha: `${D.util} - ${g}` }[e.alinear]) || '0';
      const dx = Number(w.unidadDx) || 0;
      /* Cuando el ancho del numero cambia (y solo entonces: hacerlo en cada
         refresco invalidaria el objeto y volveria el parpadeo):
           1. recolocar, si la unidad va detras o el conjunto va alineado;
           2. que la caja abrace el texto. LVGL recorta a los hijos por el
              borde del padre, y la caja se diseno con el ejemplo (0.00): con
              10.10 la ultima cifra salia cortada. Crece lo justo y nunca baja
              del tamano del diseno. (LV_OBJ_FLAG_OVERFLOW_VISIBLE no vale:
              solo deja salir hasta el ext_draw_size del padre, que es 0.) */
      const xNum = detras ? 'x0' : e.alinear ? `(${D.pad + D.offX} + ${alin('nw')})` : `${D.num.x}`;
      const xUni = D.pos === 'no' ? null : detras ? `(x0 + nw + ${D.gap} + (${dx}))` : `${D.uni.x}`;
      return formatoC(w, v, id + '_num') +
`    {   /* ${w.nombre}: si el numero cambia de ancho, recolocar y que la caja lo abrace */
        static int32_t ult_${id} = -1;
        lv_obj_update_layout(${id}_num);
        int32_t nw = lv_obj_get_width(${id}_num);
        if (nw != ult_${id}) {
            ult_${id} = nw;
            int32_t uw = lv_obj_get_width(${id}_uni); (void)uw;
${detras
  ? `            int32_t x0 = ${D.pad + D.offX} + ${alin(`(nw + ${D.gap} + uw)`)};
            lv_obj_set_x(${id}_num, x0);
            lv_obj_set_x(${id}_uni, x0 + nw + ${D.gap} + (${dx}));
`
  : e.alinear ? `            lv_obj_set_x(${id}_num, ${xNum});
` : ''}            int32_t der = ${xNum} + nw;
${xUni ? `            if (uw > 0 && ${xUni} + uw > der) der = ${xUni} + uw;
` : ''}            der += ${D.pad} + 4;
            lv_obj_set_width(${id}, der > ${w.w} ? der : ${w.w});
        }
    }
`;
    },
    vivo(w, S, ctx){ return { texto: textoVivo(w, S, '', ctx) }; }
  },

  /* ------------------------------------------------------- DATO */
  dato: {
    catalogo: { grupo:'Industrial', nombre:'Dato', icono:'▤', acepta:'lectura', w:248, h:56, oculto:true,
                ayuda:'Una tarjeta pequeña con un rótulo y un valor: la tasa, la consigna, el tiempo que queda.' },
    textoPorDefecto: 'DATO',
    papel(){ return 'dato'; },
    /* variac: tarjeta de 56, rotulo a 12, valor de 23 a 26 */
    partes(w){
      const e = w.estilo || {};
      return { rot: letraParte(w, 'rotulo', ROTULO_PX), val: letraParte(w, 'dato', e.fuente || Math.max(12, w.h * 0.41)) };
    },
    fuentes(w){
      const P = this.partes(w);
      return [{ px: P.rot.px, variante: P.rot.v, texto: w.texto || '' },
              { px: P.val.px, variante: P.val.v, texto: ' ' + unidadDe(w) }];
    },
    dibujo(w, V){
      const P = this.partes(w), tm = temaDe(w);
      const val = V && V.texto !== undefined ? V.texto : textoEjemplo(w);
      return `<div style="width:100%;height:100%;background:${tm.superficie};border-radius:${radioTema()}px;position:relative">
        ${w.texto ? `<div style="position:absolute;left:18px;top:12px;white-space:nowrap;font:${cssParte(P.rot)};letter-spacing:${ROTULO_ESPACIO}px;color:${tm.tenue}">${verParte(w.texto, P.rot)}</div>` : ''}
        <div style="position:absolute;left:18px;top:${w.texto ? 26 : Math.round((w.h - altoLineaDe(P.val.px, P.val.v)) / 2)}px;white-space:nowrap;font:${cssParte(P.val)};color:${V && V.color || tm.texto}">${verParte(val, P.val)}</div>
      </div>`;
    },
    decl(w, id){ return `static lv_obj_t *${id}, *${id}_val;\n`; },
    crear(w, id, pon){
      const P = this.partes(w), tm = temaDe(w);
      tarjetaC(id, w, pon);
      if (w.texto) rotuloEn(id, 18, 12, w.texto, P.rot, pon, tm.tenue);
      pon(`${id}_val = lv_label_create(${id});`);
      pon(`lv_obj_set_pos(${id}_val, 18, ${w.texto ? 26 : Math.round((w.h - altoLineaDe(P.val.px, P.val.v)) / 2)});`);
      pon(`lv_label_set_text(${id}_val, "--");`);
      pon(`lv_obj_set_style_text_font(${id}_val, &${simboloFuente(P.val.px, P.val.v)}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_text_color(${id}_val, lv_color_hex(${colorC(tm.texto)}), LV_PART_MAIN);`);
    },
    refresco(w, id){ const v = varDeW(w); return v ? formatoC(w, v, id + '_val', unidadDe(w)) : ''; },
    vivo(w, S, ctx){ return { texto: textoVivo(w, S, unidadDe(w), ctx) }; }
  },

  /* --------------------------------------------- PILDORA DE ESTADO */
  pildora: {
    catalogo: { grupo:'Visualización', nombre:'Estado actual', icono:'⬭', acepta:'ninguno', w:168, h:28,
                ayuda:'Enseña en qué estado está la máquina, con un texto y un color para cada uno. Se eligen en su panel, estado por estado.' },
    papel(){ return 'titulo'; },
    /* variac: 168x28, radio 14, Chivo 700 a 13 con 1 px de espacio */
    partes(w){ const e = w.estilo || {}; return { txt: letraParte(w, 'titulo', e.fuente || Math.max(9, w.h * 0.46)) }; },
    fuentes(w){ const P = this.partes(w); return [{ px: P.txt.px, variante: P.txt.v, texto: estadosDe().map(s => this.deEstado(w, s).texto).join('') + 'SIN ENLACE' }]; },
    /* Texto y color de un estado. Manda lo elegido en su panel (por
       estado: w.textosEstado, w.coloresEstado); si no, lo que diga looks en
       la Logica; si tampoco, el nombre del estado en gris. */
    deEstado(w, s){
      const l = lookDe(w, s), tx = (w.textosEstado || {})[s], co = (w.coloresEstado || {})[s];
      return { texto: tx ? String(tx) : l.text !== undefined ? String(l.text) : s, color: co || colorLook(l.color) || E.tema.tenue };
    },
    dibujo(w, V){
      const P = this.partes(w), tm = temaDe(w);
      const st = estadosDe();
      /* en el editor, el estado de arranque */
      const M0 = typeof logicaModelo === 'function' ? logicaModelo() : null, ini = M0 && M0.blocks[0] ? M0.blocks[0].start_in : '';
      const d = V && V.texto !== undefined ? { texto: V.texto, color: V.color || tm.tenue } : this.deEstado(w, st.includes(ini) ? ini : (st[0] || 'ESTADO'));
      const plano = w.plano === true;   /* solo el texto, como la tira de estado de antes */
      return `<div style="width:100%;height:100%;border-radius:${Math.round(w.h / 2)}px;${plano ? '' : `background:${tinteEstado(d.color, tm)};border:1px solid ${d.color};`}
        display:flex;align-items:center;justify-content:center;font:${cssParte(P.txt)};letter-spacing:1px;color:${d.color};white-space:nowrap;overflow:hidden">${verParte(d.texto, P.txt)}</div>`;
    },
    decl(w, id){ return `static lv_obj_t *${id}, *${id}_txt;\n`; },
    crear(w, id, pon){
      const P = this.partes(w), tm = temaDe(w), d = this.deEstado(w, estadosDe()[0] || '');
      pon(`${id} = lv_obj_create(p);`);
      pon(`lv_obj_set_pos(${id}, ${w.x}, ${w.y});`);
      pon(`lv_obj_set_size(${id}, ${w.w}, ${w.h});`);
      pon(`lv_obj_set_style_radius(${id}, ${Math.round(w.h / 2)}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_border_width(${id}, ${w.plano === true ? 0 : 1}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_pad_all(${id}, 0, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_shadow_width(${id}, 0, LV_PART_MAIN);`);
      pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_SCROLLABLE);`);
      pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_CLICKABLE);`);
      pon(`${id}_txt = lv_label_create(${id});`);
      pon(`lv_obj_set_style_text_font(${id}_txt, &${simboloFuente(P.txt.px, P.txt.v)}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_text_letter_space(${id}_txt, 1, LV_PART_MAIN);`);
      pon(`lv_obj_center(${id}_txt);`);
      pon(`pildora_poner(${id}, ${id}_txt, "${txtParte(d.texto, P.txt)}", ${colorC(d.color)}, ${w.plano === true ? "0xFFFFFFFF" : colorC(tinteEstado(d.color, tm))});`);
    },
    /* Solo se repinta cuando cambia el estado (o el enlace): poner un
       color igual al que ya tiene tambien invalida el objeto. */
    refresco(w, id){
      const P = this.partes(w), tm = temaDe(w), st = estadosDe();
      if (!st.length) return '';
      const casos = st.map((s, i) => { const d = this.deEstado(w, s);
        return `        case ${i}: pildora_poner(${id}, ${id}_txt, "${txtParte(d.texto, P.txt)}", ${colorC(d.color)}, ${w.plano === true ? "0xFFFFFFFF" : colorC(tinteEstado(d.color, tm))}); break;`; }).join('\n');
      const enlace = typeof hayEnlace === 'function' && hayEnlace();
      return `    {   /* ${w.nombre}: la pildora de estado */
        static int visto_${id} = -2;
        int ahora = ${enlace ? `s->enlace_ok ? (int)s->st : -1` : `(int)s->st`};
        if (ahora != visto_${id}) {
            visto_${id} = ahora;
            switch (ahora) {
${enlace ? `        case -1: pildora_poner(${id}, ${id}_txt, "SIN ENLACE", ${colorC(tm.alarma)}, ${w.plano === true ? "0xFFFFFFFF" : colorC(tinteEstado(tm.alarma, tm))}); break;\n` : ''}${casos}
            }
        }
    }
`;
    },
    /* ctx: lo que el simulador sabe y los componentes no pueden ver:
       el estado actual del primer bloque y si el enlace esta caido */
    vivo(w, S, ctx){
      if (ctx && ctx.enlaceCaido) return { texto: 'SIN ENLACE', color: E.tema.alarma };
      return this.deEstado(w, (ctx && ctx.estado) || estadosDe()[0] || '');
    }
  },

  /* -------------------------------------------- PASOS DEL PROCESO */
  pasos: {
    catalogo: { grupo:'Visualización', nombre:'Pasos del proceso', icono:'▭▭', acepta:'ninguno', w:768, h:28,
                ayuda:'Una casilla por estado de la lógica, en orden; se ilumina la del estado actual. El texto de cada casilla y sus colores (uno por paso) se cambian en su panel.' },
    partes(w){ const e = w.estilo || {}; return { txt: letraParte(w, 'rotulo', e.fuente || Math.max(8, w.h * 0.36)) }; },
    papel(){ return 'rotulo'; },
    /* El texto de cada casilla va CON SU ESTADO (w.textosPaso): asi, al
       anadir o quitar estados en la Logica, cada uno conserva el suyo. Los
       proyectos de antes lo tenian por orden de lineas (w.elementos), y se
       siguen leyendo igual hasta que se toque un texto. */
    textos(w){
      const st = estadosDe(), por = w.textosPaso || {};
      const el = String(w.elementos || '').split('\n').map(x => x.trim());
      return st.map((s, i) => (por[s] ? por[s] : el[i]) || s);
    },
    fuentes(w){ const P = this.partes(w); return [{ px: P.txt.px, variante: P.txt.v, texto: this.textos(w).join('') }]; },
    /* En fila mientras quepan; si a cada paso le tocan menos de 64 px, se
       apilan en columna (un lateral estrecho, una pantalla pequena). */
    geometria(w, n){
      const gap = 10;
      const columna = n > 1 && (w.w - gap * (n - 1)) / n < 64 && w.h >= n * 20;
      return columna
        ? { gap, columna, cw: w.w, ch: Math.floor((w.h - gap * (n - 1)) / n) }
        : { gap, columna: false, cw: n ? Math.floor((w.w - gap * (n - 1)) / n) : w.w, ch: w.h };
    },
    /* Los colores: los de la pestana Estilo (o, sin tocar, los del tema) y,
       si se ha elegido, uno por estado para el paso actual: su borde y su
       texto de ese color y el fondo un tono apagado, como la pildora. */
    colores(w){
      const tm = temaDe(w), por = w.coloresPaso || {}, st = estadosDe();
      const on = s => por[s] ? { fondo: tinteEstado(por[s], tm), borde: por[s], texto: por[s] }
                             : { fondo: tm.act_fondo, borde: tm.act_borde, texto: tm.act_texto };
      return { off: { fondo: tm.superficie, texto: tm.tinta3 }, on: (st.length ? st : ['ESTADO']).map(on) };
    },
    /* Si tiene algo propio. Sin nada, el C es exactamente el de siempre
       (pasos_poner, con los colores del tema) */
    propio(w){
      const e = w.estilo || {}, por = w.coloresPaso || {};
      return !!(e.superficie || e.tinta3 || e.act_fondo || e.act_borde || e.act_texto || estadosDe().some(s => por[s]));
    },
    dibujo(w, V){
      const P = this.partes(w), tx = this.textos(w), n = tx.length || 1, g = this.geometria(w, n), C = this.colores(w);
      /* en el editor se ilumina el paso de arranque: es donde empieza la
         maquina (antes, siempre el segundo, y parecia un boton pulsado) */
      const M0 = typeof logicaModelo === 'function' ? logicaModelo() : null;
      const act = V && V.idx !== undefined ? V.idx : Math.max(0, estadosDe().indexOf(M0 && M0.blocks[0] ? M0.blocks[0].start_in : ''));
      return `<div style="display:flex;flex-direction:${g.columna ? 'column' : 'row'};gap:${g.gap}px;width:100%;height:100%">${(tx.length ? tx : ['ESTADO']).map((s, i) => {
        const on = i === act, c = C.on[i] || C.on[0];
        return `<div style="flex:1;min-width:0;border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap;
          background:${on ? c.fondo : C.off.fondo};box-shadow:${on ? 'inset 0 0 0 2px ' + c.borde : 'none'};
          font:${cssParte(P.txt)};color:${on ? c.texto : C.off.texto}">${verParte(s, P.txt)}</div>`; }).join('')}</div>`;
    },
    decl(w, id){
      const n = Math.max(1, estadosDe().length);
      let d = `static lv_obj_t *${id}_chip[${n}], *${id}_lbl[${n}];\n`;
      /* colores propios: apagado (fondo, texto) y, por paso, el actual (fondo, borde, texto) */
      if (this.propio(w)){
        const C = this.colores(w);
        d += `static const uint32_t ${id}_col[] = { ${colorC(C.off.fondo)}, ${colorC(C.off.texto)},\n${C.on.map((c, i) =>
          `    ${colorC(c.fondo)}, ${colorC(c.borde)}, ${colorC(c.texto)}${i < C.on.length - 1 ? ',' : ''}   /* ${estadosDe()[i] || ''} */`).join('\n')} };\n`;
      }
      return d;
    },
    crear(w, id, pon){
      const P = this.partes(w), tm = temaDe(w), tx = this.textos(w), n = tx.length, g = this.geometria(w, n);
      if (!n) return;
      tx.forEach((s, i) => {
        const x = g.columna ? w.x : w.x + i * (g.cw + g.gap);
        const y = g.columna ? w.y + i * (g.ch + g.gap) : w.y;
        const cw = g.columna ? w.w : (i === n - 1 ? w.w - i * (g.cw + g.gap) : g.cw);
        const ch = g.columna ? (i === n - 1 ? w.h - i * (g.ch + g.gap) : g.ch) : w.h;
        pon(`${id}_chip[${i}] = lv_obj_create(p);`);
        pon(`lv_obj_set_pos(${id}_chip[${i}], ${x}, ${y});`);
        pon(`lv_obj_set_size(${id}_chip[${i}], ${cw}, ${ch});`);
        pon(`lv_obj_set_style_radius(${id}_chip[${i}], 4, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_border_color(${id}_chip[${i}], lv_color_hex(${colorC(tm.seleccion.borde)}), LV_PART_MAIN);`);
        pon(`lv_obj_set_style_pad_all(${id}_chip[${i}], 0, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_shadow_width(${id}_chip[${i}], 0, LV_PART_MAIN);`);
        pon(`lv_obj_remove_flag(${id}_chip[${i}], LV_OBJ_FLAG_SCROLLABLE);`);
        pon(`lv_obj_remove_flag(${id}_chip[${i}], LV_OBJ_FLAG_CLICKABLE);`);
        pon(`${id}_lbl[${i}] = lv_label_create(${id}_chip[${i}]);`);
        pon(`lv_label_set_text(${id}_lbl[${i}], "${txtParte(s, P.txt)}");`);
        pon(`lv_obj_set_style_text_font(${id}_lbl[${i}], &${simboloFuente(P.txt.px, P.txt.v)}, LV_PART_MAIN);`);
        pon(`lv_obj_center(${id}_lbl[${i}]);`);
      });
      pon(this.propio(w) ? `pasos_colores(${id}_chip, ${id}_lbl, ${n}, -1, ${id}_col);` : `pasos_poner(${id}_chip, ${id}_lbl, ${n}, -1);`);
    },
    refresco(w, id){
      const n = estadosDe().length;
      if (!n) return '';
      const poner = this.propio(w) ? `pasos_colores(${id}_chip, ${id}_lbl, ${n}, visto_${id}, ${id}_col)` : `pasos_poner(${id}_chip, ${id}_lbl, ${n}, visto_${id})`;
      return `    {   /* ${w.nombre}: los pasos, solo cuando cambia el estado */
        static int visto_${id} = -2;
        if ((int)s->st != visto_${id}) { visto_${id} = (int)s->st; ${poner}; }
    }
`;
    },
    vivo(w, S, ctx){ return { idx: estadosDe().indexOf((ctx && ctx.estado) || '') }; }
  }
};

/* ------------------------------------------------ ayudas para el C */

/* Un contenedor invisible, para agrupar las partes de un componente */
function contenedor(id, w, pon){
  pon(`${id} = lv_obj_create(p);`);
  pon(`lv_obj_set_pos(${id}, ${w.x}, ${w.y});`);
  pon(`lv_obj_set_size(${id}, ${w.w}, ${w.h});`);
  pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_TRANSP, LV_PART_MAIN);`);
  pon(`lv_obj_set_style_border_width(${id}, 0, LV_PART_MAIN);`);
  pon(`lv_obj_set_style_pad_all(${id}, 0, LV_PART_MAIN);`);
  pon(`lv_obj_set_style_shadow_width(${id}, 0, LV_PART_MAIN);`);
  pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_SCROLLABLE);`);
  pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_CLICKABLE);`);
}
/* Un contenedor con el fondo y el radio de las tarjetas */
function tarjetaC(id, w, pon){
  contenedor(id, w, pon);
  pon(`lv_obj_set_style_bg_color(${id}, lv_color_hex(${colorC(temaDe(w).superficie)}), LV_PART_MAIN);`);
  pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_COVER, LV_PART_MAIN);`);
  pon(`lv_obj_set_style_radius(${id}, ${radioTema()}, LV_PART_MAIN);`);
}
/* El rotulo dentro de un componente */
function rotuloEn(padre, x, y, texto, L, pon, color = E.tema.tenue){
  pon(`{ lv_obj_t *r = lv_label_create(${padre});`);
  pon(`  lv_obj_set_pos(r, ${x}, ${y});`);
  pon(`  lv_label_set_text(r, "${txtParte(texto, L)}");`);
  pon(`  lv_obj_set_style_text_font(r, &${simboloFuente(L.px, L.v)}, LV_PART_MAIN);`);
  pon(`  lv_obj_set_style_text_color(r, lv_color_hex(${colorC(color)}), LV_PART_MAIN);`);
  pon(`  lv_obj_set_style_text_letter_space(r, ${ROTULO_ESPACIO}, LV_PART_MAIN); }`);
}
/* El C que pone el valor de una variable en una etiqueta: numero con sus
   decimales y coma, o mm:ss si es un tiempo; y la unidad detras si se pide */
function formatoC(w, v, lbl, unidad){
  const uni = unidad ? ' ' + txtC(unidad) : '';
  /* La tasa: cuanto cambia la variable por segundo. Se mide cada 250 ms y
     se suaviza (35 % de lo nuevo), para que el ultimo decimal no baile con
     el ruido del sensor; si la variable se queda quieta, baja a 0. */
  if (w.tasa && !v.booleano && !esTiempo(w)){
    const k = lbl.replace(/[^A-Za-z0-9_]/g, '_');
    return `    {   /* ${w.nombre}: la tasa de ${v.nombre}, en ${unidad || 'unidades'} */
        static float ant_${k} = 0.0f, tasa_${k} = 0.0f;
        static uint32_t t_${k} = 0;
        static bool hay_${k} = false;
        float x = s->${cid(v.nombre)};
        if (!hay_${k}) { hay_${k} = true; ant_${k} = x; t_${k} = s->t_ms; }
        else if (s->t_ms - t_${k} >= 250) {
            float r = (x - ant_${k}) * 1000.0f / (float)(s->t_ms - t_${k});
            tasa_${k} += 0.35f * (r - tasa_${k});
            ant_${k} = x; t_${k} = s->t_ms;
        }
        snprintf(buf, sizeof(buf), "%.${w.decimales ?? 1}f${uni.replace(/%/g, '%%')}", fabsf(tasa_${k}) < 0.05f ? 0.0f : tasa_${k});
${E.tema.coma && !sinComa(w) ? `        for (char *q = buf; *q; q++) if (*q == '.') { *q = ','; break; }
` : ''}        poner_texto(${lbl}, buf);
    }
`;
  }
  const campo = `s->${cid(v.nombre)}`;
  if (v.booleano)
    return `    poner_texto(${lbl}, ${campo} ? "SI" : "NO");\n`;
  if (esTiempo(w))
    return `    { uint32_t seg = (uint32_t)(${campo} < 0 ? 0 : ${campo} + 0.5f);
      snprintf(buf, sizeof(buf), "%02u:%02u", (unsigned)(seg / 60), (unsigned)(seg % 60));
      poner_texto(${lbl}, buf); }\n`;
  return `    snprintf(buf, sizeof(buf), "%.${w.decimales ?? 1}f${uni.replace(/%/g, '%%')}", ${campo});\n`
    + (E.tema.coma && !sinComa(w) ? `    for (char *q = buf; *q; q++) if (*q == '.') { *q = ','; break; }\n` : '')
    + `    poner_texto(${lbl}, buf);\n`;
}

/* Lo que ensena el lienzo sin simular, y el simulador con valores */
function textoEjemplo(w){
  const u = unidadDe(w);
  if (esTiempo(w)) return mmssJS(w.ejemplo ?? 60);
  return formatoNumero(w.ejemplo ?? 0, w.decimales) + (u ? ' ' + u : '');
}
/* la tasa en el simulador: lo mismo que en la placa, con el reloj simulado */
const TASAS = {};
function tasaSim(w, x, t){
  const h = TASAS[w.id];
  if (!h || t < h.t){ TASAS[w.id] = { x, t, tasa: 0 }; return 0; }
  if (t - h.t >= 0.25){ const r = (x - h.x) / (t - h.t); h.tasa += 0.35 * (r - h.tasa); h.x = x; h.t = t; }
  return Math.abs(h.tasa) < 0.05 ? 0 : h.tasa;
}
function textoVivo(w, S, unidad, ctx){
  const v = varDeW(w);
  if (!v) return '--';
  if (ctx && ctx.enlaceCaido && v.remota) return '--';
  if (v.booleano) return S[v.nombre] ? 'SI' : 'NO';
  if (w.tasa && !esTiempo(w)) return formatoNumero(tasaSim(w, Number(S[v.nombre] || 0), (ctx && ctx.t) || 0), w.decimales) + (unidad ? ' ' + unidad : '');
  if (esTiempo(w)) return mmssJS(S[v.nombre]);
  return formatoNumero(S[v.nombre], w.decimales) + (unidad ? ' ' + unidad : '');
}

/* Las funciones de apoyo que usan los componentes, en C. Se emiten una
   vez por proyecto, y solo las que hacen falta. */
function apoyoComponentesC(){
  const tipos = new Set(E.pantallas.flatMap(p => p.widgets.map(w => w.tipo)));
  const tm = E.tema, L = [];
  if (tipos.has('pildora')) L.push(`/* La pildora: fondo apagado, borde y texto del color del estado */
static void pildora_poner(lv_obj_t *o, lv_obj_t *t, const char *txt, uint32_t color, uint32_t fondo)
{
    /* con fondo TRANSPARENTE (0xFFFFFFFF) queda solo el texto */
    lv_obj_set_style_bg_opa(o, fondo == 0xFFFFFFFFu ? LV_OPA_TRANSP : LV_OPA_COVER, LV_PART_MAIN);
    if (fondo != 0xFFFFFFFFu) lv_obj_set_style_bg_color(o, lv_color_hex(fondo), LV_PART_MAIN);
    lv_obj_set_style_border_color(o, lv_color_hex(color), LV_PART_MAIN);
    lv_obj_set_style_text_color(t, lv_color_hex(color), LV_PART_MAIN);
    lv_label_set_text(t, txt);
    lv_obj_center(t);
}
`);
  /* Los Pasos sin nada propio, con los colores del tema (pasos_poner, el
     de siempre); los que tienen colores propios, con su tabla (pasos_colores) */
  const pasosW = E.pantallas.flatMap(p => p.widgets).filter(w => w.tipo === 'pasos');
  if (pasosW.some(w => COMPONENTES.pasos.propio(w))) L.push(`/* Los pasos con colores propios. col: el fondo y el texto apagados, y
   luego, por cada paso, el fondo, el borde y el texto cuando es el actual */
static void pasos_colores(lv_obj_t **chip, lv_obj_t **lbl, int n, int activo, const uint32_t *col)
{
    for (int i = 0; i < n; i++) {
        bool on = (i == activo);
        const uint32_t *c = col + 2 + 3 * i;
        lv_obj_set_style_bg_color(chip[i], lv_color_hex(on ? c[0] : col[0]), LV_PART_MAIN);
        lv_obj_set_style_border_color(chip[i], lv_color_hex(c[1]), LV_PART_MAIN);
        lv_obj_set_style_border_width(chip[i], on ? 2 : 0, LV_PART_MAIN);
        lv_obj_set_style_text_color(lbl[i], lv_color_hex(on ? c[2] : col[1]), LV_PART_MAIN);
    }
}
`);
  if (tipos.has('pasos') && pasosW.some(w => !COMPONENTES.pasos.propio(w))) L.push(`/* Los pasos: el activo con el color de lo seleccionado y su borde */
static void pasos_poner(lv_obj_t **chip, lv_obj_t **lbl, int n, int activo)
{
    for (int i = 0; i < n; i++) {
        bool on = (i == activo);
        lv_obj_set_style_bg_color(chip[i], lv_color_hex(on ? ${colorC(tm.seleccion.fondo)} : ${colorC(tm.superficie)}), LV_PART_MAIN);
        lv_obj_set_style_border_width(chip[i], on ? 2 : 0, LV_PART_MAIN);
        lv_obj_set_style_text_color(lbl[i], lv_color_hex(on ? ${colorC(tm.seleccion.texto)} : ${colorC(tm.tinta3)}), LV_PART_MAIN);
    }
}
`);
  if (tipos.has('curva')) L.push(`/* El tope de la escala: el primer numero redondo por encima */
static float escala_redonda(float v)
{
    static const float M[] = { 1, 1.2f, 1.5f, 2, 2.5f, 3, 4, 5, 6, 8 };
    float e = powf(10.0f, floorf(log10f(v > 1e-6f ? v : 1e-6f)));
    for (int k = 0; k < 2; k++, e *= 10.0f)
        for (unsigned i = 0; i < sizeof(M) / sizeof(M[0]); i++) if (M[i] * e >= v) return M[i] * e;
    return 10.0f * e;
}
/* Un numero de eje: sin decimales si es entero${E.tema.coma ? ', y con coma' : ''} */
static void numero_eje(char *b, size_t n, float v)
{
    if (v == (int)v) snprintf(b, n, "%d", (int)v);
    else { snprintf(b, n, "%.1f", v);${E.tema.coma ? ` for (char *q = b; *q; q++) if (*q == '.') *q = ',';` : ''} }
}
`);
  const hayTasa = E.pantallas.some(p => p.widgets.some(w => w.tasa));
  if (tipos.has('curva') || tipos.has('aguja') || hayTasa) L.unshift('#include <math.h>\n');
  return L.join('\n');
}


/* =====================================================================
 * SEGUNDO LOTE: barra con consigna, curva de proceso y reloj de aguja
 * ===================================================================== */

/* El rango de lo enlazado: el de la variable, o el que se escriba a mano */
function rangoDe(w){
  const v = varDeW(w) || {};
  const min = w.min !== undefined && w.min !== '' ? Number(w.min) : (v.min ?? 0);
  const max = w.max !== undefined && w.max !== '' ? Number(w.max) : (v.max ?? 100);
  return { min, max: max > min ? max : min + 1 };
}
const varPorNombre = n => (typeof variables === 'function' ? variables() : []).find(x => x.nombre === n);
/* Un numero "redondo" por encima de v: la escala de la curva del variac */
function escalaRedonda(v){
  const m = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8];
  const e = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1e-6))));
  for (const k of [1, 10]) for (const x of m) if (x * e * k >= v) return x * e * k;
  return 10 * e;
}
const numEje = v => conComa(Number.isInteger(v) ? String(v) : v.toFixed(1));

/* La historia que el simulador va guardando para cada curva */
const HISTORIAS = {};

Object.assign(COMPONENTES, {

  /* -------------------------------------------- BARRA CON CONSIGNA */
  'barra-consigna': {
    catalogo: { grupo:'Visualización', nombre:'Barra', icono:'▭|', acepta:'lectura', w:356, h:42,
                ayuda:'Una barra que se llena con la medida. Puede llevar la escala debajo y una marca verde en la consigna; las dos cosas se quitan si no las quieres.' },
    papel(){ return 'rotulo'; },
    /* el grosor de la barra; la marca sobresale la mitad por arriba y
       por abajo, y la escala va justo debajo de todo */
    geo(w){
      const gr = Math.max(4, Number(w.grosor) || 12);
      const marca = gr + 12;                       /* sobresale 6 px por lado */
      return { gr, marca, yBarra: Math.round((marca - gr) / 2), yEsc: Math.round((marca - gr) / 2) + gr + 8 };
    },
    partes(w){ return { lab: letraParte(w, 'rotulo', (w.estilo || {}).fuente || ROTULO_PX) }; },
    fuentes(w){ const P = this.partes(w), r = rangoDe(w);
      return w.escala === false ? [] : [{ px: P.lab.px, variante: P.lab.v, texto: numEje(r.min) + numEje(r.max) + ' ' + unidadDe(w) }]; },
    dibujo(w, V){
      const P = this.partes(w), tm = temaDe(w), r = rangoDe(w), G = this.geo(w);
      const f = V && V.frac !== undefined ? V.frac : 0.33, g = V && V.fracSp !== undefined ? V.fracSp : fracRango(w, spFijo(w));
      return `<div style="width:100%;height:100%;position:relative">
        <div style="position:absolute;left:0;top:${G.yBarra}px;width:100%;height:${G.gr}px;background:${tm.pista};border-radius:${G.gr / 2}px"></div>
        <div style="position:absolute;left:0;top:${G.yBarra}px;width:${f * 100}%;height:${G.gr}px;background:${V && V.color || tm.acento};border-radius:${G.gr / 2}px"></div>
        ${marcaVisible(w) ? `<div style="position:absolute;left:calc(${g * 100}% - 1px);top:0;width:3px;height:${G.marca}px;background:${tm.ok}"></div>` : ''}
        ${w.escala === false ? '' : `<div style="position:absolute;left:0;top:${G.yEsc}px;font:${cssParte(P.lab)};color:${tm.tenue}">${esc(numEje(r.min))}</div>
        <div style="position:absolute;right:0;top:${G.yEsc}px;font:${cssParte(P.lab)};color:${tm.tenue}">${verParte(numEje(r.max) + (unidadDe(w) ? ' ' + unidadDe(w) : ''), P.lab)}</div>`}
      </div>`;
    },
    decl(w, id){ return `static lv_obj_t *${id}, *${id}_llena, *${id}_sp;\n`; },
    crear(w, id, pon){
      const P = this.partes(w), tm = temaDe(w), r = rangoDe(w), G = this.geo(w);
      contenedor(id, w, pon);
      const caja = (nom, x, y, ww, hh, col, rad) => {
        pon(`${nom} = lv_obj_create(${id});`);
        pon(`lv_obj_set_pos(${nom}, ${x}, ${y});`);
        pon(`lv_obj_set_size(${nom}, ${ww}, ${hh});`);
        pon(`lv_obj_set_style_bg_color(${nom}, lv_color_hex(${colorC(col)}), LV_PART_MAIN);`);
        pon(`lv_obj_set_style_border_width(${nom}, 0, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_radius(${nom}, ${rad}, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_pad_all(${nom}, 0, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_shadow_width(${nom}, 0, LV_PART_MAIN);`);
        pon(`lv_obj_remove_flag(${nom}, LV_OBJ_FLAG_SCROLLABLE);`);
        pon(`lv_obj_remove_flag(${nom}, LV_OBJ_FLAG_CLICKABLE);`);
      };
      pon(`{ lv_obj_t *pista;`);
      caja('pista', 0, G.yBarra, w.w, G.gr, tm.pista, Math.round(G.gr / 2));
      pon(`}`);
      caja(`${id}_llena`, 0, G.yBarra, 0, G.gr, tm.acento, Math.round(G.gr / 2));
      /* nace en el valor fijo; si hay variable, el refresco la mueve */
      if (marcaVisible(w)) caja(`${id}_sp`, Math.max(0, Math.round(w.w * fracRango(w, spFijo(w))) - 1), 0, 3, G.marca, tm.ok, 0);
      else pon(`${id}_sp = NULL;`);
      const etq = (x, texto, derecha) => {
        pon(`{ lv_obj_t *e = lv_label_create(${id});`);
        pon(`  lv_label_set_text(e, "${txtParte(texto, P.lab)}");`);
        pon(`  lv_obj_set_style_text_font(e, &${simboloFuente(P.lab.px, P.lab.v)}, LV_PART_MAIN);`);
        pon(`  lv_obj_set_style_text_color(e, lv_color_hex(${colorC(tm.tenue)}), LV_PART_MAIN);`);
        pon(derecha ? `  lv_obj_align(e, LV_ALIGN_TOP_RIGHT, 0, ${G.yEsc}); }` : `  lv_obj_set_pos(e, ${x}, ${G.yEsc}); }`);
      };
      if (w.escala !== false){
        etq(0, numEje(r.min), false);
        etq(0, numEje(r.max) + (unidadDe(w) ? ' ' + unidadDe(w) : ''), true);
      }
    },
    refresco(w, id){
      const v = varDeW(w); if (!v) return '';
      const r = rangoDe(w), sp = spVar(w);
      return `    {   /* ${w.nombre}: la barra y la raya de la consigna, solo si se mueven */
        static int ult_${id} = -1, ult_sp_${id} = -1;
        float f = (s->${cid(v.nombre)} - (${flt(r.min)})) / (${flt(r.max - r.min)});
        if (f < 0.0f) f = 0.0f; if (f > 1.0f) f = 1.0f;
        int a = (int)(${w.w}.0f * f + 0.5f);
        if (a != ult_${id}) { ult_${id} = a; lv_obj_set_width(${id}_llena, a); }
${sp ? `        float g = (s->${cid(sp.nombre)} - (${flt(r.min)})) / (${flt(r.max - r.min)});
        if (g < 0.0f) g = 0.0f; if (g > 1.0f) g = 1.0f;
        int x = (int)(${w.w}.0f * g + 0.5f) - 1;
        if (x != ult_sp_${id}) { ult_sp_${id} = x; lv_obj_set_x(${id}_sp, x); }
` : ''}    }
`;
    },
    vivo(w, S){
      const r = rangoDe(w), v = varDeW(w), sp = spVar(w);
      const fr = x => Math.min(1, Math.max(0, (Number(x || 0) - r.min) / (r.max - r.min)));
      return { frac: v ? fr(S[v.nombre]) : 0, fracSp: fracRango(w, spAhora(w, S)) };
    }
  },

  /* ------------------------------------------------ CURVA DE PROCESO */
  curva: {
    catalogo: { grupo:'Visualización', nombre:'Curva', icono:'⌇', acepta:'lectura', w:340, h:146,
                ayuda:'La medida en el tiempo, con la escala que se ajusta sola a números redondos, la consigna en verde discontinuo y, si quieres, una referencia en gris. Ponla dentro de una Tarjeta.' },
    N: 150,
    geo(w){ return { L: 31, R: w.w - 8, T: 7, B: w.h - 15 }; },
    ventana(w){ return Math.max(5, Number(w.ventana) || 60); },
    /* la escala: se ajusta sola a numeros redondos, o se queda fija en el
       rango de la variable (como el Grafico de antes) */
    topeFijo(w){ return w.escalaFija === true ? rangoDe(w).max : 0; },
    papel(){ return 'rotulo'; },
    partes(w){ return { lab: letraParte(w, 'rotulo', (w.estilo || {}).fuente || ROTULO_PX) }; },
    etiquetasX(w){ const v = this.ventana(w); return [0, 1, 2, 3].map(i => i === 3 ? 'ahora' : '-' + Math.round(v * (3 - i) / 3) + ' s'); },
    fuentes(w){ const P = this.partes(w); return [{ px: P.lab.px, variante: P.lab.v, texto: '0123456789,.-' + this.etiquetasX(w).join('') }]; },
    dibujo(w, V){
      const P = this.partes(w), tm = temaDe(w), g = this.geo(w), cw = g.R - g.L, ch = g.B - g.T;
      const vmax = this.topeFijo(w) || (V && V.vmax) || 50;
      const y = v => g.T + ch * (1 - Math.min(1, Math.max(0, v / vmax)));
      const traza = (pts, col) => pts && pts.length > 1
        ? `<polyline fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" points="${pts.map((v, i) => `${(g.L + cw * (i + this.N - pts.length) / (this.N - 1)).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>` : '';
      const ejemplo = V ? null : Array.from({ length: 90 }, (_, i) => Math.min(30, i * 0.5) + (i > 60 ? 0 : 0));
      const sp = V ? V.sp : spFijo(w);
      /* por debajo de 39 px de ancho cw sale negativo y el navegador se
         queja del <rect>; con 0 tampoco se dibuja, pero sin error */
      return `<svg width="${w.w}" height="${w.h}" style="display:block;overflow:visible">
        ${[0, 1, 2].map(i => `<rect x="${g.L}" y="${Math.round(g.B - ch * i / 2)}" width="${Math.max(0, cw)}" height="1" fill="${tm.rejilla}"/>`).join('')}
        ${[0, 1, 2].map(i => `<text x="${g.L - 5}" y="${Math.round(g.B - ch * i / 2) + 4}" text-anchor="end" fill="${tm.tenue}" style="font:${cssParte(P.lab)}">${esc(numEje(vmax * i / 2))}</text>`).join('')}
        ${this.etiquetasX(w).map((t, i) => `<text x="${g.L + cw * i / 3}" y="${g.B + 13}" text-anchor="${i === 3 ? 'end' : 'middle'}" fill="${tm.tenue}" style="font:${cssParte(P.lab)}">${esc(t)}</text>`).join('')}
        ${marcaVisible(w) && sp !== undefined ? `<line x1="${g.L}" x2="${g.R}" y1="${y(sp)}" y2="${y(sp)}" stroke="${tm.ok}" stroke-width="2" stroke-dasharray="8 7"/>` : ''}
        ${traza(V ? V.ref : null, tm.tinta3)}${traza(V ? V.med : ejemplo, V && V.color || tm.acento)}
      </svg>`;
    },
    decl(w, id){
      return `static lv_obj_t *${id}, *${id}_ejey[3], *${id}_sp;\n`
           + `static lv_chart_series_t *${id}_med, *${id}_ref;\n`
           + `static lv_point_precise_t ${id}_pts[2];\n`
           + `static float ${id}_hist[${this.N}];\n`;
    },
    crear(w, id, pon){
      const P = this.partes(w), tm = temaDe(w), g = this.geo(w), ref = w.serie2 && varPorNombre(w.serie2);
      const X = w.x, Y = w.y;
      /* la rejilla: el cero, la mitad y el tope */
      [0, 1, 2].forEach(i => {
        pon(`{ lv_obj_t *r = lv_obj_create(p);`);
        pon(`  lv_obj_set_pos(r, ${X + g.L}, ${Y + Math.round(g.B - (g.B - g.T) * i / 2)}); lv_obj_set_size(r, ${g.R - g.L}, 1);`);
        pon(`  lv_obj_set_style_bg_color(r, lv_color_hex(${colorC(tm.rejilla)}), LV_PART_MAIN); lv_obj_set_style_border_width(r, 0, LV_PART_MAIN);`);
        pon(`  lv_obj_set_style_radius(r, 0, LV_PART_MAIN); lv_obj_remove_flag(r, LV_OBJ_FLAG_CLICKABLE); }`);
      });
      pon(`${id} = lv_chart_create(p);`);
      pon(`lv_obj_set_pos(${id}, ${X + g.L}, ${Y + g.T});`);
      pon(`lv_obj_set_size(${id}, ${g.R - g.L}, ${g.B - g.T});`);
      pon(`lv_chart_set_type(${id}, LV_CHART_TYPE_LINE);`);
      pon(`lv_chart_set_point_count(${id}, ${this.N});`);
      pon(`lv_chart_set_range(${id}, LV_CHART_AXIS_PRIMARY_Y, 0, 1000);`);
      pon(`lv_chart_set_div_line_count(${id}, 0, 0);`);
      pon(`lv_chart_set_update_mode(${id}, LV_CHART_UPDATE_MODE_SHIFT);`);
      pon(`lv_obj_set_style_bg_opa(${id}, LV_OPA_TRANSP, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_border_width(${id}, 0, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_pad_all(${id}, 0, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_size(${id}, 0, 0, LV_PART_INDICATOR);   /* sin marcadores en los puntos */`);
      pon(`lv_obj_set_style_line_width(${id}, 3, LV_PART_ITEMS);`);
      pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_SCROLLABLE);`);
      pon(`lv_obj_remove_flag(${id}, LV_OBJ_FLAG_CLICKABLE);`);
      /* la referencia detras y en gris; la medida encima, del acento */
      pon(ref ? `${id}_ref = lv_chart_add_series(${id}, lv_color_hex(${colorC(tm.tinta3)}), LV_CHART_AXIS_PRIMARY_Y);`
              : `${id}_ref = NULL;`);
      pon(`${id}_med = lv_chart_add_series(${id}, lv_color_hex(${colorC(tm.acento)}), LV_CHART_AXIS_PRIMARY_Y);`);
      if (ref) pon(`lv_chart_set_all_values(${id}, ${id}_ref, LV_CHART_POINT_NONE);`);
      pon(`lv_chart_set_all_values(${id}, ${id}_med, LV_CHART_POINT_NONE);   /* la curva entra por la derecha */`);
      if (marcaVisible(w)){
        pon(`${id}_sp = lv_line_create(p);`);
        pon(`${id}_pts[0].x = 0; ${id}_pts[0].y = 0; ${id}_pts[1].x = ${g.R - g.L}; ${id}_pts[1].y = 0;`);
        pon(`lv_line_set_points(${id}_sp, ${id}_pts, 2);`);
        pon(`lv_obj_set_pos(${id}_sp, ${X + g.L}, ${Y + g.T});`);
        pon(`lv_obj_set_style_line_color(${id}_sp, lv_color_hex(${colorC(tm.ok)}), LV_PART_MAIN);`);
        pon(`lv_obj_set_style_line_width(${id}_sp, 2, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_line_dash_width(${id}_sp, 8, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_line_dash_gap(${id}_sp, 7, LV_PART_MAIN);`);
      } else pon(`${id}_sp = NULL;`);
      const etq = (nom, x, y, ancho, alin, texto) => {
        pon(`${nom} = lv_label_create(p);`);
        pon(`lv_obj_set_pos(${nom}, ${x}, ${y}); lv_obj_set_width(${nom}, ${ancho});`);
        pon(`lv_label_set_text(${nom}, "${txtParte(texto, P.lab)}");`);
        pon(`lv_obj_set_style_text_font(${nom}, &${simboloFuente(P.lab.px, P.lab.v)}, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_text_color(${nom}, lv_color_hex(${colorC(tm.tenue)}), LV_PART_MAIN);`);
        pon(`lv_obj_set_style_text_align(${nom}, ${alin}, LV_PART_MAIN);`);
      };
      [0, 1, 2].forEach(i => etq(`${id}_ejey[${i}]`, X, Y + Math.round(g.B - (g.B - g.T) * i / 2) - 7, g.L - 5, 'LV_TEXT_ALIGN_RIGHT', ''));
      this.etiquetasX(w).forEach((t, i) => {
        pon(`{ lv_obj_t *ex;`);
        /* la ultima ("ahora") pegada al borde derecho: centrada, se saldria de la caja */
        if (i === 3) etq('ex', X + g.R - 44, Y + g.B + 4, 44, 'LV_TEXT_ALIGN_RIGHT', t);
        else etq('ex', X + g.L + Math.round((g.R - g.L) * i / 3) - 22, Y + g.B + 4, 44, 'LV_TEXT_ALIGN_CENTER', t);
        pon(`}`);
      });
    },
    refresco(w, id){
      const v = varDeW(w); if (!v) return '';
      const g = this.geo(w), ref = w.serie2 && varPorNombre(w.serie2), sp = spVar(w);
      const paso = Math.round(this.ventana(w) * 1000 / this.N);
      return `    {   /* ${w.nombre}: un punto cada ${paso} ms; la escala, redonda y solo cuando cambia */
        static uint32_t t_${id} = 0;
        static float tope_${id} = -1.0f, sp_ant_${id} = -1.0f;
        static int n_${id} = 0;
        if (t_${id} == 0 || s->t_ms - t_${id} >= ${paso}) {
            t_${id} = s->t_ms;
            float m = s->${cid(v.nombre)};
            memmove(&${id}_hist[0], &${id}_hist[1], sizeof(float) * (${this.N} - 1));
            ${id}_hist[${this.N} - 1] = m;
            if (n_${id} < ${this.N}) n_${id}++;
            lv_chart_set_next_value(${id}, ${id}_med, (int32_t)(m * 10.0f));
${ref ? `            lv_chart_set_next_value(${id}, ${id}_ref, (int32_t)(s->${cid(ref.nombre)} * 10.0f));\n` : ''}        }
        float pico = 0.0f;
        for (int i = ${this.N} - n_${id}; i < ${this.N}; i++) if (${id}_hist[i] > pico) pico = ${id}_hist[i];
        float cons = ${marcaVisible(w) ? spC(w) : '0.0f'};
        float tope = ${this.topeFijo(w) ? flt(this.topeFijo(w)) + ';   /* escala fija: el rango de la variable */'
                                        : 'escala_redonda(fmaxf(fmaxf(cons * 1.25f, pico * 1.12f), 2.0f));'}
        if (tope != tope_${id}) {
            tope_${id} = tope;
            lv_chart_set_range(${id}, LV_CHART_AXIS_PRIMARY_Y, 0, (int32_t)(tope * 10.0f));
            for (int i = 0; i < 3; i++) { numero_eje(buf, sizeof(buf), tope * i / 2.0f); lv_label_set_text(${id}_ejey[i], buf); }
            sp_ant_${id} = -1.0f;
        }
${marcaVisible(w) ? `        if (cons != sp_ant_${id}) {
            sp_ant_${id} = cons;
            int y = (int)(${g.B - g.T}.0f * (1.0f - fminf(cons / tope, 1.0f)));
            ${id}_pts[0].y = y; ${id}_pts[1].y = y;
            lv_line_set_points(${id}_sp, ${id}_pts, 2);
        }
` : ''}    }
`;
    },
    vivo(w, S, ctx){
      const v = varDeW(w); if (!v) return {};
      const h = HISTORIAS[w.id] = HISTORIAS[w.id] || { t: -1, med: [], ref: [] };
      const paso = this.ventana(w) / this.N, t = ctx && ctx.t !== undefined ? ctx.t : 0;
      if (t < h.t) { h.med = []; h.ref = []; h.t = -1; }            /* reinicio del simulador */
      /* Una muestra por paso de tiempo. Si el simulador va acelerado y se
         salto varios pasos entre dos repintados, los rellena: si no, la
         curva se comprimiria y el eje de tiempo mentiria. */
      const pasos = h.t < 0 ? 1 : Math.min(this.N, Math.floor((t - h.t) / paso));
      if (pasos > 0){
        h.t = h.t < 0 ? t : h.t + pasos * paso;
        const r = w.serie2 && varPorNombre(w.serie2);
        for (let i = 0; i < pasos; i++){
          h.med.push(Number(S[v.nombre] || 0));
          if (r) h.ref.push(Number(S[r.nombre] || 0));
        }
        h.med.splice(0, Math.max(0, h.med.length - this.N));
        h.ref.splice(0, Math.max(0, h.ref.length - this.N));
      }
      const cons = marcaVisible(w) ? spAhora(w, S) : 0;
      const pico = Math.max(0, ...h.med, ...h.ref);
      return { med: h.med.slice(), ref: h.ref.slice(), sp: cons,
               vmax: this.topeFijo(w) || escalaRedonda(Math.max(cons * 1.25, pico * 1.12, 2)) };
    }
  },

  /* ------------------------------------------------ RELOJ DE AGUJA */
  aguja: {
    catalogo: { grupo:'Visualización', nombre:'Reloj de aguja', icono:'◔', acepta:'lectura', w:260, h:260,
                ayuda:'Un arco con su escala y el valor en el centro, con un punto luminoso en la punta. De 270° (casi cerrado) o de 180° (como un velocímetro).' },
    /* 270 grados (casi cerrado) o 180 (velocimetro). En el de 180 el
       centro baja: el arco ocupa solo la mitad de arriba. */
    grados(w){ return Number(w.apertura) === 180 ? 180 : 270; },
    geo(w){
      const medio = this.grados(w) === 180;
      const s = Math.min(w.w / 250, w.h / (medio ? 160 : 250));
      return { s, medio, cx: Math.round(w.w / 2), cy: Math.round(medio ? w.h - 32 * s : w.h / 2),
               R: Math.round(95 * s), LW: Math.max(3, Math.round(Number(w.grosor) || 22 * s)) };
    },
    partes(w){ const G = this.geo(w), e = w.estilo || {};
      /* el texto de la consigna puede llevar su letra y tamano (tipo_cons / fuente_cons) */
      const conTipo = e.tipo_cons ? { ...w, estilo: { ...e, tipo_rotulo: e.tipo_cons } } : w;
      return { num: letraParte(w, 'numero', e.fuente || Math.max(16, 48 * G.s)), uni: letraParte(w, 'titulo', Math.max(11, 15 * G.s)),
               cons: letraParte(conTipo, 'rotulo', Math.min(360, e.fuente_cons || Math.max(10, 11 * G.s))) }; },
    /* Lo que va delante del valor de la consigna: «consigna» si nadie lo
       ha cambiado; vacio, solo el numero */
    prefijo(w){ return w.textoCons === undefined ? 'consigna' : String(w.textoCons); },
    conPrefijo(w, valor){ const p = this.prefijo(w); return p ? p + ' ' + valor : String(valor); },
    fuentes(w){ const P = this.partes(w);
      /* las letras del texto que se escriba tienen que estar en la fuente */
      return [{ px: P.num.px, variante: P.num.v, texto: '-' }, { px: P.uni.px, variante: P.uni.v, texto: unidadDe(w) },
              { px: P.cons.px, variante: P.cons.v, texto: this.conPrefijo(w, '0123456789,.-') }]; },
    papel(){ return 'numero'; },
    ang(w, f){ const g = this.grados(w); return ((g === 180 ? 180 : 135) + g * Math.min(1, Math.max(0, f))) * Math.PI / 180; },
    /* Donde empieza cada linea del centro, en px respecto al centro. Se
       apilan por el alto de su letra, no por el tamano del reloj: la letra
       tiene un minimo legible y no encoge al mismo ritmo, y en un reloj de
       120 px unas posiciones proporcionales montaban la unidad sobre el
       numero. A 250 px salen casi las del variac (-29, 13, 43), con algo
       mas de aire bajo la coma. */
    centro(P, medio){
      const hn = altoLineaDe(P.num.px, P.num.v), hu = altoLineaDe(P.uni.px, P.uni.v);
      /* en el de 180 los textos no caben en el centro del arco: van debajo */
      const num = medio ? -Math.round(hn * 1.25) : -Math.round(hn * 0.62), uni = num + Math.round(hn * 0.9);
      return { num, uni, cons: uni + hu + Math.max(3, Math.round(hu * 0.3)) };
    },
    dibujo(w, V){
      const P = this.partes(w), G = this.geo(w), tm = temaDe(w), r = rangoDe(w), C = this.centro(P, G.medio);
      const ej = w.ejemplo ?? (r.min + (r.max - r.min) / 3), ejSp = spFijo(w);
      const fr = x => Math.min(1, Math.max(0, (x - r.min) / (r.max - r.min)));
      const f = V && V.frac !== undefined ? V.frac : fr(ej);
      const pt = (a, r) => [G.cx + Math.cos(a) * r, G.cy + Math.sin(a) * r];
      const arco = (f0, f1, r) => { const [x0, y0] = pt(this.ang(w, f0), r), [x1, y1] = pt(this.ang(w, f1), r);
        return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${(f1 - f0) * 270 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
      const r0 = G.R + G.LW / 2 + 3 * G.s;
      const marcas = Array.from({ length: 41 }, (_, i) => { const may = i % 10 === 0, a = this.ang(w, i / 40);
        const [x0, y0] = pt(a, r0), [x1, y1] = pt(a, r0 + (may ? 9 : 5) * G.s);
        return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${may ? mezclaColor(tm.superficie, tm.tenue, 0.45) : mezclaColor(tm.superficie, tm.tenue, 0.2)}" stroke-width="${may ? 2 : 1}"/>`; }).join('');
      const g = V && V.fracSp !== undefined ? V.fracSp : fr(ejSp);
      const [sx0, sy0] = pt(this.ang(w, g), G.R - G.LW / 2 - 5 * G.s), [sx1, sy1] = pt(this.ang(w, g), G.R + G.LW / 2 + 7 * G.s), [dx, dy] = pt(this.ang(w, g), G.R + G.LW / 2 + 11 * G.s);
      const [tx, ty] = pt(this.ang(w, f), G.R);
      const val = V && V.texto !== undefined ? V.texto : formatoNumero(ej, w.decimales);
      /* los textos del centro, en cajas de linea como las de LVGL (no en SVG) */
      const linea = (dy, L, color, html) => `<div style="position:absolute;left:0;width:100%;top:${Math.round(G.cy + dy)}px;text-align:center;white-space:nowrap;font:${cssParte(L)};line-height:${altoLineaDe(L.px, L.v)}px;color:${color}">${html}</div>`;
      return `<div style="position:relative;width:100%;height:100%"><svg width="${w.w}" height="${w.h}" style="display:block;overflow:visible;position:absolute;left:0;top:0">
        ${marcas}
        <path d="${arco(0, 1, G.R)}" fill="none" stroke="${tm.pista}" stroke-width="${G.LW}"/>
        ${f > 0.002 ? `<path d="${arco(0, f, G.R)}" fill="none" stroke="${V && V.color || tm.acento}" stroke-width="${G.LW}"/>` : ''}
        ${marcaVisible(w) ? `<line x1="${sx0}" y1="${sy0}" x2="${sx1}" y2="${sy1}" stroke="${tm.ok}" stroke-width="4"/><circle cx="${dx}" cy="${dy}" r="${3 * G.s}" fill="${tm.ok}"/>` : ''}
        <circle cx="${tx}" cy="${ty}" r="${5.5 * G.s}" fill="${mezclaColor(tm.acento, '#ffffff', 0.7)}"/>
      </svg>
        ${linea(C.num, P.num, tm.texto, esc(val))}
        ${linea(C.uni, P.uni, tm.tenue, verParte(unidadDe(w), P.uni))}
        ${marcaVisible(w) ? `<div style="position:absolute;left:${Number(w.consDx) || 0}px;width:100%;top:${Math.round(G.cy + C.cons + (Number(w.consDy) || 0))}px;text-align:center;white-space:nowrap;pointer-events:none;font:${cssParte(P.cons)};line-height:${altoLineaDe(P.cons.px, P.cons.v)}px;color:${tm.cons_c}"><span data-parte="cons" title="${esc(t('Arrástralo para moverlo'))}">${verParte(this.conPrefijo(w, V && V.cons !== undefined ? V.cons : formatoNumero(ejSp, w.decimales)), P.cons)}</span></div>` : ''}
      </div>`;
    },
    decl(w, id){
      return `static lv_obj_t *${id}, *${id}_arco, *${id}_punta, *${id}_sp, *${id}_spd, *${id}_val, *${id}_cons;\n`
           + `static lv_point_precise_t ${id}_marcas[41][2], ${id}_pts[2];\n`;
    },
    crear(w, id, pon){
      const P = this.partes(w), G = this.geo(w), tm = temaDe(w), r0 = G.R + G.LW / 2 + 3 * G.s, C = this.centro(P, G.medio);
      contenedor(id, w, pon);
      pon(`for (int i = 0; i <= 40; i++) {   /* la escala: 41 marcas, mayores cada diez */`);
      pon(`    bool may = (i % 10 == 0);`);
      pon(`    float a = (${this.grados(w) === 180 ? 180 : 135}.0f + ${this.grados(w)}.0f * i / 40.0f) * (float)M_PI / 180.0f;`);
      pon(`    float r1 = ${flt(r0)} + (may ? ${flt(9 * G.s)} : ${flt(5 * G.s)});`);
      pon(`    ${id}_marcas[i][0].x = ${G.cx} + lroundf(cosf(a) * ${flt(r0)}); ${id}_marcas[i][0].y = ${G.cy} + lroundf(sinf(a) * ${flt(r0)});`);
      pon(`    ${id}_marcas[i][1].x = ${G.cx} + lroundf(cosf(a) * r1);  ${id}_marcas[i][1].y = ${G.cy} + lroundf(sinf(a) * r1);`);
      pon(`    lv_obj_t *l = lv_line_create(${id});`);
      pon(`    lv_line_set_points(l, ${id}_marcas[i], 2);`);
      pon(`    lv_obj_set_style_line_color(l, lv_color_hex(may ? ${colorC(mezclaColor(tm.superficie, tm.tenue, 0.45))} : ${colorC(mezclaColor(tm.superficie, tm.tenue, 0.2))}), LV_PART_MAIN);`);
      pon(`    lv_obj_set_style_line_width(l, may ? 2 : 1, LV_PART_MAIN);`);
      pon(`}`);
      const d = G.R + Math.round(G.LW / 2);
      pon(`${id}_arco = lv_arc_create(${id});`);
      pon(`lv_obj_set_pos(${id}_arco, ${G.cx - d}, ${G.cy - d});`);
      pon(`lv_obj_set_size(${id}_arco, ${2 * d}, ${2 * d});`);
      pon(`lv_arc_set_rotation(${id}_arco, ${this.grados(w) === 180 ? 180 : 135});`);
      pon(`lv_arc_set_bg_angles(${id}_arco, 0, ${this.grados(w)});`);
      pon(`lv_arc_set_range(${id}_arco, 0, 1000);`);
      pon(`lv_arc_set_value(${id}_arco, 0);`);
      pon(`lv_obj_set_style_arc_width(${id}_arco, ${G.LW}, LV_PART_MAIN);`);
      pon(`lv_obj_set_style_arc_width(${id}_arco, ${G.LW}, LV_PART_INDICATOR);`);
      pon(`lv_obj_set_style_arc_color(${id}_arco, lv_color_hex(${colorC(tm.pista)}), LV_PART_MAIN);`);
      pon(`lv_obj_set_style_arc_color(${id}_arco, lv_color_hex(${colorC(tm.acento)}), LV_PART_INDICATOR);`);
      pon(`lv_obj_set_style_arc_rounded(${id}_arco, false, LV_PART_MAIN);     /* sin remate: el redondeo alarga el arco */`);
      pon(`lv_obj_set_style_arc_rounded(${id}_arco, false, LV_PART_INDICATOR);`);
      pon(`lv_obj_remove_style(${id}_arco, NULL, LV_PART_KNOB);`);
      pon(`lv_obj_remove_flag(${id}_arco, LV_OBJ_FLAG_CLICKABLE);`);
      if (marcaVisible(w)){
        pon(`${id}_sp = lv_line_create(${id});`);
        pon(`lv_obj_set_style_line_color(${id}_sp, lv_color_hex(${colorC(tm.ok)}), LV_PART_MAIN);`);
        pon(`lv_obj_set_style_line_width(${id}_sp, 4, LV_PART_MAIN);`);
        punto(pon, `${id}_spd`, id, Math.round(6 * G.s), tm.ok);
        /* nace en el valor fijo; si hay variable, el refresco la mueve */
        const b = this.ang(w, fracRango(w, spFijo(w))), px = (rr, d = 0) => [G.cx + Math.round(Math.cos(b) * rr) - d, G.cy + Math.round(Math.sin(b) * rr) - d];
        const [x0, y0] = px(G.R - G.LW / 2 - 5 * G.s), [x1, y1] = px(G.R + G.LW / 2 + 7 * G.s), [xd, yd] = px(G.R + G.LW / 2 + 11 * G.s, Math.round(3 * G.s));
        pon(`${id}_pts[0].x = ${x0}; ${id}_pts[0].y = ${y0}; ${id}_pts[1].x = ${x1}; ${id}_pts[1].y = ${y1};`);
        pon(`lv_line_set_points(${id}_sp, ${id}_pts, 2);`);
        pon(`lv_obj_set_pos(${id}_spd, ${xd}, ${yd});`);
      } else pon(`${id}_sp = NULL; ${id}_spd = NULL;`);
      punto(pon, `${id}_punta`, id, Math.round(11 * G.s), mezclaColor(tm.acento, '#ffffff', 0.7));
      const centro = (nom, dy, L, color, texto, dx = 0) => {
        pon(`${nom} = lv_label_create(${id});`);
        pon(`lv_obj_set_width(${nom}, ${w.w});`);
        pon(`lv_obj_set_pos(${nom}, ${dx}, ${Math.round(G.cy + dy)});`);
        pon(`lv_label_set_text(${nom}, "${txtParte(texto, L)}");`);
        pon(`lv_obj_set_style_text_align(${nom}, LV_TEXT_ALIGN_CENTER, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_text_font(${nom}, &${simboloFuente(L.px, L.v)}, LV_PART_MAIN);`);
        pon(`lv_obj_set_style_text_color(${nom}, lv_color_hex(${colorC(color)}), LV_PART_MAIN);`);
      };
      centro(`${id}_val`, C.num, P.num, tm.texto, '--');
      pon(`{ lv_obj_t *u;`); centro('u', C.uni, P.uni, tm.tenue, unidadDe(w)); pon(`}`);
      if (marcaVisible(w)) centro(`${id}_cons`, C.cons + (Number(w.consDy) || 0), P.cons, tm.cons_c,
        spVar(w) ? this.conPrefijo(w, '') : this.conPrefijo(w, formatoNumero(spFijo(w), w.decimales)), Number(w.consDx) || 0);
      else pon(`${id}_cons = NULL;`);
    },
    refresco(w, id){
      const v = varDeW(w); if (!v) return '';
      const G = this.geo(w), r = rangoDe(w), sp = spVar(w);
      const frac = e => `fminf(fmaxf((${e} - (${flt(r.min)})) / (${flt(r.max - r.min)}), 0.0f), 1.0f)`;
      return `    {   /* ${w.nombre}: el reloj de aguja */
        float f = ${frac('s->' + cid(v.nombre))};
        lv_arc_set_value(${id}_arco, (int32_t)(f * 1000.0f));
        float a = (${this.grados(w) === 180 ? 180 : 135}.0f + ${this.grados(w)}.0f * f) * (float)M_PI / 180.0f;
        lv_obj_set_pos(${id}_punta, ${G.cx} + lroundf(cosf(a) * ${G.R}) - ${Math.round(5.5 * G.s)}, ${G.cy} + lroundf(sinf(a) * ${G.R}) - ${Math.round(5.5 * G.s)});
        snprintf(buf, sizeof(buf), "%.${w.decimales ?? 1}f", s->${cid(v.nombre)});
${E.tema.coma && !sinComa(w) ? `        for (char *q = buf; *q; q++) if (*q == '.') { *q = ','; break; }\n` : ''}        poner_texto(${id}_val, buf);
${marcaVisible(w) ? `        static float sp_ant = -1e9f;
        if ((${spC(w)}) != sp_ant) {   /* con un valor fijo, entra una sola vez */
            sp_ant = ${spC(w)};
            float g = ${frac('sp_ant')};
            float b = (${this.grados(w) === 180 ? 180 : 135}.0f + ${this.grados(w)}.0f * g) * (float)M_PI / 180.0f;
            ${id}_pts[0].x = ${G.cx} + lroundf(cosf(b) * ${flt(G.R - G.LW / 2 - 5 * G.s)}); ${id}_pts[0].y = ${G.cy} + lroundf(sinf(b) * ${flt(G.R - G.LW / 2 - 5 * G.s)});
            ${id}_pts[1].x = ${G.cx} + lroundf(cosf(b) * ${flt(G.R + G.LW / 2 + 7 * G.s)}); ${id}_pts[1].y = ${G.cy} + lroundf(sinf(b) * ${flt(G.R + G.LW / 2 + 7 * G.s)});
            lv_line_set_points(${id}_sp, ${id}_pts, 2);
            lv_obj_set_pos(${id}_spd, ${G.cx} + lroundf(cosf(b) * ${flt(G.R + G.LW / 2 + 11 * G.s)}) - ${Math.round(3 * G.s)}, ${G.cy} + lroundf(sinf(b) * ${flt(G.R + G.LW / 2 + 11 * G.s)}) - ${Math.round(3 * G.s)});
            snprintf(buf, sizeof(buf), "${this.prefijo(w) ? txtParte(this.prefijo(w), this.partes(w).cons).replace(/%/g, '%%') + ' ' : ''}%.${w.decimales ?? 1}f", sp_ant);
${E.tema.coma && !sinComa(w) ? `            for (char *q = buf; *q; q++) if (*q == '.') { *q = ','; break; }\n` : ''}            poner_texto(${id}_cons, buf);
        }
` : ''}    }
`;
    },
    vivo(w, S){
      const r = rangoDe(w), v = varDeW(w), sp = spVar(w);
      const fr = x => Math.min(1, Math.max(0, (Number(x || 0) - r.min) / (r.max - r.min)));
      return { frac: v ? fr(S[v.nombre]) : 0, fracSp: fracRango(w, spAhora(w, S)),
               texto: v ? formatoNumero(S[v.nombre], w.decimales) : '--',
               cons: marcaVisible(w) ? formatoNumero(spAhora(w, S), w.decimales) : '' };
    }
  }
});

/* Un punto redondo (la punta de la aguja, el remate de la consigna) */
function punto(pon, nom, padre, d, color){
  pon(`${nom} = lv_obj_create(${padre});`);
  pon(`lv_obj_set_size(${nom}, ${d}, ${d});`);
  pon(`lv_obj_set_style_radius(${nom}, LV_RADIUS_CIRCLE, LV_PART_MAIN);`);
  pon(`lv_obj_set_style_bg_color(${nom}, lv_color_hex(${colorC(color)}), LV_PART_MAIN);`);
  pon(`lv_obj_set_style_border_width(${nom}, 0, LV_PART_MAIN);`);
  pon(`lv_obj_set_style_shadow_width(${nom}, 0, LV_PART_MAIN);`);
  pon(`lv_obj_set_style_pad_all(${nom}, 0, LV_PART_MAIN);`);
  pon(`lv_obj_remove_flag(${nom}, LV_OBJ_FLAG_CLICKABLE);`);
  pon(`lv_obj_remove_flag(${nom}, LV_OBJ_FLAG_SCROLLABLE);`);
}

/* El color de looks: que parte de cada componente cambia (en el C) y de
   que color del tema parte cuando el estado no dice nada. El simulador
   lo pinta igual con V.color. Sin esto, "reading en ambar mientras sube"
   se veia en el simulador y no en la placa. */
const LOOKS_COMPONENTE = {
  lectura:          { token: 'texto',  c: (id, col) => `lv_obj_set_style_text_color(${id}_num, lv_color_hex(${col}), LV_PART_MAIN);` },
  tiempo:           { token: 'texto',  c: (id, col) => `lv_obj_set_style_text_color(${id}_num, lv_color_hex(${col}), LV_PART_MAIN);` },
  dato:             { token: 'texto',  c: (id, col) => `lv_obj_set_style_text_color(${id}_val, lv_color_hex(${col}), LV_PART_MAIN);` },
  'barra-consigna': { token: 'acento', c: (id, col) => `lv_obj_set_style_bg_color(${id}_llena, lv_color_hex(${col}), LV_PART_MAIN);` },
  aguja:            { token: 'acento', c: (id, col) => `lv_obj_set_style_arc_color(${id}_arco, lv_color_hex(${col}), LV_PART_INDICATOR);` },
  curva:            { token: 'acento', c: (id, col) => `lv_chart_set_series_color(${id}, ${id}_med, lv_color_hex(${col})); lv_chart_refresh(${id});` },
};

/* ------------------------------------------------------- TIEMPO
   El mismo componente que el Numero (hereda todo: tamano, rotulo, en
   tarjeta, caja cenida, alineacion, colores), pero sin unidad y siempre
   como mm:ss. Un widget aparte para que no haya que adivinar. */
COMPONENTES.tiempo = Object.assign(Object.create(COMPONENTES.lectura), {
  catalogo: { grupo:'Visualización', nombre:'Tiempo', icono:'⏱', acepta:'lectura', w:240, h:100,
              ayuda:'Un tiempo como mm:ss: una cuenta atrás, lo que lleva un ciclo. Se enlaza a una variable en segundos, como un timer de la lógica.' },
  textoPorDefecto: 'TIEMPO',
  unidad(){ return ''; },
  unidadPos(){ return 'no'; },
  muestra(w){ return mmssJS(w.ejemplo ?? 60); },
});


/* =====================================================================
 * ICONOS: lo que necesitan el lienzo, el panel y el generador
 *
 * Un icono se guarda en w.icono con una de dos formas:
 *   'LV_SYMBOL_OK'  los que LVGL trae dentro de sus Montserrat (los de
 *                   siempre: en una fuente compilada no hay que convertir)
 *   'fa-bolt'       cualquiera del catalogo ICONOS_FA (iconos.js): entra
 *                   en la fuente del widget al exportar, con generar.cmd
 * ===================================================================== */
const ICONO_POR_K = Object.fromEntries((typeof ICONOS_FA !== 'undefined' ? ICONOS_FA : []).map(i => [i.k, i]));
const esIconoLVGL = k => !!(k && SIMBOLOS[k] && k !== '');
const iconoValido = k => esIconoLVGL(k) || !!(k && ICONO_POR_K[k]);
const iconoCp = k => ICONO_POR_K[k] ? ICONO_POR_K[k].cp : ((typeof CP_SIMBOLO_LVGL !== 'undefined' && CP_SIMBOLO_LVGL[k]) || 0);
const iconoChar = k => { const cp = iconoValido(k) ? iconoCp(k) : 0; return cp ? String.fromCodePoint(cp) : ''; };
const iconoEt = k => ICONO_POR_K[k] ? ICONO_POR_K[k].et : (SIMBOLOS[k] ? SIMBOLOS[k].et : '');
/* Un caracter del area privada de Unicode: donde viven los iconos */
const esPUA = c => { const n = c.codePointAt(0); return n >= 0xE000 && n <= 0xF8FF; };
/* El icono en C: la macro de LVGL, o su cadena UTF-8 escapada ("\xEF\x83\xA7").
   Va fuera de las comillas del texto, y el compilador une las dos cadenas. */
function iconoC(k){
  if (esIconoLVGL(k)) return k;
  const ch = iconoChar(k);
  if (!ch) return '';
  const BS = String.fromCharCode(92);
  return '"' + [...new TextEncoder().encode(ch)].map(b => BS + 'x' + b.toString(16).toUpperCase().padStart(2, '0')).join('') + '"';
}

/* ------------------------------------------------------------- ICONO
   Un icono suelto: un termometro junto a una lectura, un rayo en la
   cabecera. Toma el color y el tamano que se quiera, y la logica puede
   cambiarle el color por estado (looks), como a un texto. */
COMPONENTES.icono = {
  catalogo: { grupo:'Básico', nombre:'Icono', icono:'★', acepta:'ninguno', w:56, h:56,
              ayuda:'Un símbolo suelto —un rayo, un termómetro, una gota— con el tamaño y el color que quieras. Hay más de cien, por temas.' },
  papel(){ return 'texto'; },
  partes(w){
    const e = w.estilo || {};
    return { ico: letraParte(w, 'texto', e.fuente || Math.max(10, Math.min(w.w, w.h) * 0.78)) };
  },
  fuentes(w){ const P = this.partes(w); return [{ px: P.ico.px, variante: P.ico.v, texto: iconoChar(w.icono || 'fa-bolt') }]; },
  dibujo(w, V){
    const P = this.partes(w), tm = temaDe(w);
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;
      font:${cssParte(P.ico)};line-height:1;color:${V && V.color || tm.texto}">${iconoChar(w.icono || 'fa-bolt')}</div>`;
  },
  decl(w, id){ return `static lv_obj_t *${id}, *${id}_ico;\n`; },
  crear(w, id, pon){
    const P = this.partes(w), tm = temaDe(w);
    contenedor(id, w, pon);
    pon(`${id}_ico = lv_label_create(${id});`);
    pon(`lv_label_set_text(${id}_ico, ${iconoC(w.icono || 'fa-bolt')});   /* ${iconoEt(w.icono || 'fa-bolt')} */`);
    pon(`lv_obj_set_style_text_font(${id}_ico, &${simboloFuente(P.ico.px, P.ico.v)}, LV_PART_MAIN);`);
    pon(`lv_obj_set_style_text_color(${id}_ico, lv_color_hex(${colorC(tm.texto)}), LV_PART_MAIN);`);
    pon(`lv_obj_center(${id}_ico);`);
  },
  refresco(){ return ''; },
  vivo(){ return {}; },
};
COLORES_COMPONENTE.icono = [['texto', 'Color']];
PARTE_FUENTE.icono = 'ico';
LOOKS_COMPONENTE.icono = { token: 'texto', c: (id, col) => `lv_obj_set_style_text_color(${id}_ico, lv_color_hex(${col}), LV_PART_MAIN);` };

/* Los componentes entran en el catalogo de widgets del editor */
for (const [k, c] of Object.entries(COMPONENTES)) WIDGETS[k] = c.catalogo;
