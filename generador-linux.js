/* =====================================================================
 * GENERADOR-LINUX — la pantalla en una placa con Linux (Raspberry Pi,
 * Jetson, Orange Pi) y una OLED por I2C
 *
 * No se genera un programa para cada proyecto: el motor, telar_pantalla.py
 * (motor-linux.js), es siempre el mismo. Lo que cambia es proyecto.json,
 * que sale de aqui con TODO ya decidido:
 *
 *   - la logica, ya leida por el MISMO analizador que usan el editor, el
 *     simulador y el generador de C (logica.js). El motor no vuelve a leer
 *     el texto: ejecuta acciones y condiciones ya desmontadas. Asi no hay
 *     dos lectores del lenguaje que puedan discrepar.
 *   - cada widget, con sus medidas ya calculadas por las MISMAS funciones
 *     que el lienzo (geometria, fuenteEfectiva, puntosLinea...). El motor
 *     solo pinta rectangulos, textos, arcos y lineas.
 *
 * La regla de oro es la del simulador: la logica corre con las mismas
 * reglas que el firmware. Se comprueba con un banco que hace correr el
 * simulador y el motor con las mismas pulsaciones y compara, paso a
 * paso, estados y valores.
 * ================================================================== */

/* ------------------------------------------------------------ la logica
   Un valor de tiempo o de comparacion ("2", "1.5", "hold_time") como una
   hoja de cuenta: { n } si es un numero, { v } si es un nombre. Es lo
   mismo que valor() del simulador: isNaN(+x) ? S[x] : +x. */
const hojaLinux = x => isNaN(+x) ? { v: String(x) } : { n: +x };

/* Una accion, desmontada en el MISMO orden en que la prueba el simulador:
   pulse, blink, set y el resto de verbos. Lo que no encaja no hace nada,
   igual que alli. */
function accionLinux(a){
  const L = LOGICA, s = String(a);
  const mp = s.match(L.RE_PULSE);
  if (mp) return { a: 'pulse', x: mp[1], t: hojaLinux(mp[2] ?? String(L.PULSO_DEF)) };
  const mb = s.match(L.RE_BLINK);
  if (mb) return { a: 'blink', x: mb[1], on: hojaLinux(mb[2]), off: hojaLinux(mb[3]),
                   total: mb[4] === 'for' ? hojaLinux(mb[5]) : null,
                   veces: mb[4] === 'times' ? hojaLinux(mb[5]) : null };
  const ms = s.match(L.RE_SET_CUENTA);
  if (ms){
    const e = L.expresion(ms[2]);
    return e.arbol ? { a: 'set', x: ms[1], e: e.arbol } : { a: 'nada', txt: s };
  }
  const m = s.match(L.RE_ACTION);
  return m ? { a: m[1], x: m[2] } : { a: 'nada', txt: s };
}
const accionesLinux = l => Array.isArray(l) ? l.map(accionLinux) : null;

/* Una comparacion: la izquierda y la derecha como cuentas. La derecha de
   la forma de siempre ("voltage >= setpoint - band") pasa a ser la cuenta
   setpoint - band, que es exactamente lo que hacia comparacion(). */
function parteLinux(m){
  if (m.es) return { es: true, bloque: m[1], estado: m[3], no: !!m.no };
  let der = m.cuenta ? m.cuenta : hojaLinux(m[3]);
  if (m[4]) der = { op: m[4], a: der, b: hojaLinux(m[5]) };
  return { no: !!m.no, izq: m.cuentaIzq ? m.cuentaIzq : { v: m[1] }, op: m[2], der };
}

/* Las filas de un estado que se miran en cada paso, en su orden */
function filaEstadoLinux(k, acts){
  const L = LOGICA;
  const ma = k.match(L.RE_AFTER), me = k.match(L.RE_EVERY);
  const hace = accionesLinux(acts) || [];
  if (ma) return { k: 'after', t: hojaLinux(ma[1]), hace, txt: k };
  if (me) return { k: 'every', t: hojaLinux(me[1]), hace, txt: k };
  const C = L.condPartes(k);
  return { k: 'if', c: C ? { partes: C.partes.map(parteLinux), enlaces: C.enlaces } : null, hace, txt: k };
}

function estadoLinux(body){
  body = body || {};
  const w = Array.isArray(body.while) ? body.while : [];
  return {
    entrar: accionesLinux(body['on enter']) || [],
    mientras: accionesLinux(w) || [],
    /* los timer que cuenta su while: lo que pregunta contando() */
    cuenta: w.map(a => String(a).trim()).filter(a => a.startsWith('count ')).map(a => a.slice(6)),
    filas: Object.keys(body).filter(k => /^(if|after|every)\b/.test(k)).map(k => filaEstadoLinux(k, body[k])),
    sino: Array.isArray(body.else) ? accionesLinux(body.else) : null,
  };
}

function botonLinux(filas){
  filas = filas || {};
  const larga = Object.keys(filas).find(k => /^on hold\b/.test(k));
  const ml = larga && larga.match(LOGICA.RE_ONHOLD);
  return {
    hold: typeof filas.hold === 'string' ? filas.hold : null,
    /* in ESTADO, en su orden: gana el primero que coincida */
    en: Object.keys(filas).filter(k => /^in\s/.test(k)).map(k => [k.replace(/^in\s+/, ''), accionesLinux(filas[k]) || []]),
    siempre: filas.always ? accionesLinux(filas.always) : null,
    soltar: filas['on release'] ? accionesLinux(filas['on release']) : null,
    /* on hold T: sin T legible no se cumple nunca, como en el simulador */
    larga: larga ? { t: ml ? hojaLinux(ml[1]) : { n: Infinity }, hace: accionesLinux(filas[larga]) || [] } : null,
    repite: filas.repeat === 'yes' || filas.repeat === true,
  };
}

/* looks: por elemento, las filas en su orden; el color ya como #rrggbb */
function looksLinux(looks){
  const L = LOGICA, out = {};
  for (const [nombre, filas] of Object.entries(looks || {})){
    out[nombre] = Object.entries(filas || {}).map(([k, a]) => {
      a = a || {};
      const f = { en: k.replace(/^in\s+/, '') };
      if (a.color !== undefined) f.color = L.COLORS[a.color] || String(a.color);
      if (a.text !== undefined) f.texto = String(a.text);
      const h = L.habilitadoDe(a);
      if (h !== undefined) f.habilitado = h;
      return f;
    });
  }
  return out;
}

/* El rango con el que se acota cada nombre: rango() del simulador */
function rangoLinux(n, LV, vs){
  const lv = LV[n];
  if (lv && lv.type === 'setting') return lv.range;
  const v = vs.find(x => x.nombre === n);
  return v && !v.booleano && v.min !== undefined && v.max !== undefined ? [v.min, v.max] : null;
}

/* La logica entera, lista para el motor. null si no hay logica o tiene
   errores (entonces el motor solo pinta y atiende lo que no es logica). */
function logicaLinux(){
  const M = logicaModelo();
  const L = LOGICA, vs = variables();
  const LV = M ? Object.assign({}, ...M.blocks.map(b => b.variables)) : {};
  const vars = {};
  for (const [n, v] of Object.entries(LV)){
    const x = { tipo: v.type };
    if (v.type === 'setting'){ x.inicio = v.start; x.rango = v.range; x.paso = v.step; }
    if (v.type === 'timer'){ x.de = v.from ?? null; x.sube = v.counts === 'up'; }
    if (v.type === 'flag') x.inicio = L.banderaInicial(v);
    if (v.type === 'counter'){ x.inicio = L.inicioContador(v); x.tope = L.topeContador(v); }
    vars[n] = x;
  }
  const rangos = {};
  for (const v of vs) rangos[v.nombre] = rangoLinux(v.nombre, LV, vs);
  const c = M ? clickLogica() : null;
  return {
    hay: !!M,
    vars,
    rangos,
    click: c ? { x: c.salida, t: hojaLinux(c.dur) } : null,
    bloques: (M ? M.blocks : []).map(b => ({
      nombre: b.name, inicio: b.start_in,
      estados: Object.fromEntries(Object.entries(b.states).map(([s, body]) => [s, estadoLinux(body)])),
      /* el orden de los estados: la franja y los pasos lo usan */
      orden: Object.keys(b.states),
      botones: Object.fromEntries(Object.entries(b.buttons).map(([n, f]) => [n, botonLinux(f)])),
      looks: looksLinux(b.looks),
    })),
  };
}

/* Las variables del hardware y los ajustes, como las arranca iniciar() */
function variablesLinux(){
  return variables().filter(v => ['lectura', 'escritura', 'ajuste'].includes(v.dir)).map(v => {
    const x = { nombre: v.nombre, dir: v.dir, booleano: !!v.booleano, remota: !!v.remota };
    if (v.min !== undefined) x.min = v.min;
    if (v.max !== undefined) x.max = v.max;
    if (v.inicial !== undefined) x.inicial = v.inicial;
    if (v.pordefecto !== undefined) x.pordefecto = v.pordefecto;
    if (v.unidad) x.unidad = v.unidad;
    return x;
  });
}
/* Todas, tambien las de la logica: lo que un widget enlazado necesita
   saber (varDe() del simulador) */
function todasLinux(){
  const r = {};
  for (const v of variables()) if (!(v.nombre in r))
    r[v.nombre] = { dir: v.dir, min: v.min ?? null, max: v.max ?? null, booleano: !!v.booleano, remota: !!v.remota };
  return r;
}

/* ------------------------------------------------------------ las letras
   Una letra para el motor: el fichero TTF, el tamano y el alto de linea
   de LVGL. La negrita y la cursiva de Montserrat no viajan con Telar (el
   usuario las descarga para generar.cmd): el lienzo las imita a partir de
   la Medium, y el motor hace lo mismo (sint). */
const TTF_ICONOS_LINUX = 'iconos.ttf';
function letraLinux(px, v){
  v = TIPOS[v] ? v : 'medium';
  const T = TIPOS[v];
  const propia = v !== 'medium' && T.ttf && FUENTES_TTF[T.ttf];
  const L = { ttf: propia ? T.ttf : 'Montserrat-Medium.ttf', px: Math.round(px), lh: altoLineaDe(px, v) };
  if (!propia && v !== 'medium') L.sint = { negrita: T.peso >= 600, cursiva: !!T.cursiva };
  return L;
}
/* La letra principal de un widget clasico: la misma que el lienzo */
const letraWidget = w => letraLinux(fuenteEfectiva(w), varianteFuente(w));
/* El texto tal como se vera: con las tildes solo si la fuente las trae */
const textoLinux = (s, px, v) => fuenteEsPropia(px, v) ? String(s ?? '') : comoEnPlaca(s);
/* La decoracion y el espaciado del texto (N C S T del panel) */
function estiloLinux(w){
  const e = w.estilo || {}, r = {};
  if (e.subrayado) r.subrayado = true;
  if (e.tachado) r.tachado = true;
  if (e.espaciado) r.espaciado = Number(e.espaciado) || 0;
  if (e.alinear && ALINEABLE.has(w.tipo)) r.alinear = e.alinear;
  return r;
}

/* Como se escribe el valor de un Numero, un Tiempo o un Reloj */
function numeroLinux(w){
  return { decimales: w.decimales ?? 1, tiempo: esTiempo(w), tasa: !!w.tasa,
           unidad: w.tipo === 'dato' ? unidadDe(w) : '', coma: !!E.tema.coma && !sinComa(w) };
}

/* ------------------------------------------------------------ los widgets
   Lo que el motor necesita de cada uno. Los numeros salen de las mismas
   funciones que usa dibujo(): si el lienzo cambia, esto cambia con el. */
function widgetLinux(w){
  const S = est(w), M = monoTinta() || { tinta: '#ffffff', vacio: '#000000' };
  const b = { tipo: w.tipo, nombre: w.nombre, x: w.x, y: w.y, w: w.w, h: w.h };
  if (w.bind) b.bind = w.bind;
  if (w.auto) b.auto = true;
  const FT = fuenteEfectiva(w), VAR = varianteFuente(w);
  const T = s => fuenteEsPropia(FT, VAR) ? String(s ?? '') : comoEnPlaca(s);
  /* los textos que looks le puede poner, ya como se veran */
  const textosLooks = () => {
    const r = {};
    for (const bl of bloquesLogica()) for (const f of Object.values((bl.looks || {})[w.nombre] || {}))
      if (f && f.text !== undefined) r[String(f.text)] = w.tipo === 'button'
        ? rotulo({ ...w, texto: String(f.text) }, x => fuenteEsPropia(FT, VAR) ? x : comoEnPlaca(x)) : T(String(f.text));
    return r;
  };
  const C = COMPONENTES[w.tipo];
  if (C){
    const tm = temaDe(w), e = w.estilo || {};
    b.componente = true;
    switch (w.tipo){
    case 'tarjeta': {
      const P = C.partes(w), p = C.posRotulo(w);
      Object.assign(b, { fondo: tm.superficie, borde: e.borde || null, radio: e.radio ?? radioTema() });
      if (w.texto) b.rotulo = { texto: textoLinux(w.texto, P.rot.px, P.rot.v), x: p.x, y: p.y, letra: letraLinux(P.rot.px, P.rot.v), color: tm.rotulo_c, espaciado: ROTULO_ESPACIO };
      return b;
    }
    case 'dato': {
      const P = C.partes(w);
      Object.assign(b, { fondo: tm.superficie, radio: radioTema(), color: tm.texto, numero: numeroLinux(w),
        val: { x: 18, y: w.texto ? 26 : Math.round((w.h - altoLineaDe(P.val.px, P.val.v)) / 2), letra: letraLinux(P.val.px, P.val.v) } });
      if (w.texto) b.rotulo = { texto: textoLinux(w.texto, P.rot.px, P.rot.v), x: 18, y: 12, letra: letraLinux(P.rot.px, P.rot.v), color: tm.tenue, espaciado: ROTULO_ESPACIO };
      return b;
    }
    case 'lectura': case 'tiempo': {
      const P = C.partes(w), D = C.disposicion(w, P, C.muestra(w));
      Object.assign(b, {
        tarjeta: !!w.tarjeta, fondo: tm.superficie, radio: e.radio ?? radioTema(),
        num: { letra: letraLinux(P.num.px, P.num.v), color: tm.texto, subrayado: !!e.subrayado, tachado: !!e.tachado, sinComa: sinComa(w) },
        /* lo que hace falta para rehacer disposicion() con cada numero */
        disp: { pad: D.pad, pos: D.pos, gap: D.gap, util: D.util, uniW: D.uniW, hn: D.hn, hu: D.hu, esp: D.esp,
                espBase: e.espaciado || 0, alinear: e.alinear || '', yNum: C.yNum(w, P),
                unidadDx: Number(w.unidadDx) || 0, unidadDy: Number(w.unidadDy) || 0,
                rotX: D.pad + (Number(w.rotuloDx) || 0), rotY: (w.tarjeta ? 12 : 0) + (Number(w.rotuloDy) || 0),
                conRot: !!w.texto },
        numero: numeroLinux(w),
      });
      if (D.pos !== 'no') b.uni = { texto: textoLinux(C.unidad(w), P.uni.px, P.uni.v), letra: letraLinux(P.uni.px, P.uni.v), color: tm.unidad_c };
      if (w.texto) b.rotulo = { texto: textoLinux(w.texto, P.rot.px, P.rot.v), letra: letraLinux(P.rot.px, P.rot.v), color: tm.rotulo_c, espaciado: ROTULO_ESPACIO };
      return b;
    }
    case 'pildora': {
      const P = C.partes(w), sts = estadosDe();
      const de = s => { const d = C.deEstado(w, s); return { texto: textoLinux(d.texto, P.txt.px, P.txt.v), color: d.color, fondo: tinteEstado(d.color, tm) }; };
      Object.assign(b, { letra: letraLinux(P.txt.px, P.txt.v), plano: w.plano === true,
        estados: Object.fromEntries(sts.map(s => [s, de(s)])), primero: sts[0] || 'ESTADO',
        sinEnlace: { texto: 'SIN ENLACE', color: E.tema.alarma, fondo: tinteEstado(E.tema.alarma, tm) } });
      return b;
    }
    case 'pasos': {
      const P = C.partes(w), tx = C.textos(w), n = tx.length || 1, g = C.geometria(w, n);
      Object.assign(b, { letra: letraLinux(P.txt.px, P.txt.v), textos: (tx.length ? tx : ['ESTADO']).map(s => textoLinux(s, P.txt.px, P.txt.v)),
        estados: estadosDe(), columna: g.columna, gap: g.gap,
        /* los mismos colores que el lienzo y la placa: los de Estilo y uno por paso */
        on: C.colores(w).on[0], onI: C.colores(w).on, off: C.colores(w).off });
      return b;
    }
    case 'barra-consigna': {
      const P = C.partes(w), G = C.geo(w), r = rangoDe(w), sp = spVar(w);
      Object.assign(b, { G, pista: tm.pista, acento: tm.acento, ok: tm.ok, marca: marcaVisible(w), min: r.min, max: r.max,
        consigna: sp ? sp.nombre : null, fijo: spFijo(w) });
      if (w.escala !== false) b.escala = { letra: letraLinux(P.lab.px, P.lab.v), color: tm.tenue,
        izq: numEje(r.min), der: textoLinux(numEje(r.max) + (unidadDe(w) ? ' ' + unidadDe(w) : ''), P.lab.px, P.lab.v) };
      return b;
    }
    case 'aguja': {
      const P = C.partes(w), G = C.geo(w), r = rangoDe(w), Cc = C.centro(P, G.medio), sp = spVar(w);
      Object.assign(b, { G, grados: C.grados(w), min: r.min, max: r.max,
        pista: tm.pista, acento: tm.acento, ok: tm.ok, punta: mezclaColor(tm.acento, '#ffffff', 0.7),
        marcaMayor: mezclaColor(tm.superficie, tm.tenue, 0.45), marcaMenor: mezclaColor(tm.superficie, tm.tenue, 0.2),
        marca: marcaVisible(w), consigna: sp ? sp.nombre : null, fijo: spFijo(w), centro: Cc,
        num: { letra: letraLinux(P.num.px, P.num.v), color: tm.texto },
        uni: { letra: letraLinux(P.uni.px, P.uni.v), color: tm.tenue, texto: textoLinux(unidadDe(w), P.uni.px, P.uni.v) },
        cons: { letra: letraLinux(P.cons.px, P.cons.v), color: tm.cons_c, prefijo: textoLinux(C.prefijo(w), P.cons.px, P.cons.v),
                dx: Number(w.consDx) || 0, dy: Number(w.consDy) || 0 },
        numero: numeroLinux(w) });
      return b;
    }
    case 'icono': {
      const P = C.partes(w);
      Object.assign(b, { letra: letraLinux(P.ico.px, P.ico.v), texto: iconoChar(w.icono || 'fa-bolt'), color: tm.texto });
      return b;
    }
    }
    b.noSoportado = true;
    return b;
  }
  switch (w.tipo){
  case 'label':
    Object.assign(b, { texto: T(w.texto || 'Texto'), color: S.texto, letra: letraWidget(w), ...estiloLinux(w), looks: textosLooks() });
    break;
  case 'value': case 'timer':
    Object.assign(b, { color: S.texto, letra: letraWidget(w), ...estiloLinux(w), decimales: w.decimales ?? 1 });
    break;
  case 'panel':
    Object.assign(b, { fondo: S.sup, borde: S.borde, radio: 8 });
    break;
  case 'bar': case 'slider': case 'toggle':
    Object.assign(b, { g: geometria(w), tinta: M.tinta, vacio: M.vacio });
    break;
  case 'checkbox':
    Object.assign(b, { texto: T(w.texto || ''), color: S.texto, letra: letraWidget(w), ...estiloLinux(w), tinta: M.tinta, vacio: M.vacio });
    break;
  case 'led':
    Object.assign(b, { acento: S.acento, apagado: S.sup });
    break;
  case 'line':
    Object.assign(b, { color: S.acento }, w.diag ? { diag: puntosLinea(w) } : {});
    break;
  case 'spinner': {
    const g = geoSpinner(w);
    Object.assign(b, { d: g.d, grosor: g.grosor, pista: g.pista, acento: S.acento, grados: SPINNER_GRADOS });
    break;
  }
  case 'state-strip':
    Object.assign(b, { letra: letraLinux(FT, "bold"), acento: S.acento, sup: S.sup,
      estados: estadosProyecto(), textos: estadosProyecto().map(T) });
    break;
  case 'button': {
    const CB = colorBoton(w);
    Object.assign(b, { fondo: CB.fondo, borde: CB.borde, colorTexto: CB.texto, radio: radioBoton(w), letra: letraWidget(w), ...estiloLinux(w),
      texto: rotulo(w, x => fuenteEsPropia(FT, VAR) ? x : comoEnPlaca(x)), looks: textosLooks() });
    if (w.destino) b.destino = w.destino;
    if (w.evento) b.evento = w.evento;
    const op = ordenPaso(w);
    if (op) b.paso = { n: op.v.nombre, d: op.delta, repite: op.repite };
    if (enLogica(w)){ b.logica = true; b.repite = repiteLogica(w); b.suelta = botonesSuelta().includes(w.nombre); }
    break;
  }
  default:
    b.noSoportado = true;
  }
  return b;
}

/* ------------------------------------------------------------ la pantalla
   Solo las OLED de un color por I2C. luma.oled trae el driver de las dos
   familias que ofrece Telar: SSD1306 (tambien la de 32 filas) y SH1106. */
const DRIVER_LUMA = { Panel_SSD1306: 'ssd1306', Panel_SH110x: 'sh1106' };
function driverLinux(pa){
  const pan = PANELES[(pa || {}).controlador] || {};
  return pan.bus === 'i2c' ? DRIVER_LUMA[pan.clase] || null : null;
}
function pantallaLinux(){
  const n = nodoHMI(), pa = n.pantalla_externa || {}, P = placa();
  const pan = PANELES[pa.controlador] || {};
  const bus = busFijo(placaBase(n), 'i2c', { sda: pa.i2c?.sda, scl: pa.i2c?.scl });
  return {
    controlador: pa.controlador, driver: driverLinux(pa),
    ancho: P.ancho, alto: P.alto,
    ancho_panel: pa.ancho_panel ?? pan.ancho, alto_panel: pa.alto_panel ?? pan.alto,
    rotacion: (pa.rotacion ?? 0) % 4,
    i2c_bus: bus ?? 1,
    direccion: (pa.i2c && pa.i2c.direccion) || pan.direccion || '0x3C',
    fondo: E.tema.fondo, coma: !!E.tema.coma,
    refresco_ms: E.refresco_ms ?? 100,
  };
}

/* Los pines de la placa de la pantalla: entradas y salidas digitales y
   los botones de navegacion. Los numeros son los del chip (BCM). */
function pinesLinuxHMI(){
  const n = nodoHMI(), A = asignarPines(n), base = placaBase(n);
  const pin = clave => { const f = A.filas.find(x => x.clave === clave); return f && f.pinNum !== undefined ? f.pinNum : null; };
  const r = { chip: base.gpiochip || '/dev/gpiochip0', entradas: [], salidas: [], nav: [] };
  for (const c of n.conexiones || []){
    const par = c.params || {}, p = pin(c.clave);
    if (c.tipo === 'gpio-in') r.entradas.push({ nombre: c.clave, pin: p, pull: par.pull || 'pull-up interno' });
    if (c.tipo === 'gpio-out') r.salidas.push({ nombre: c.clave, pin: p, bajo: (par.activo || 'alto') === 'bajo' });
    if (c.tipo === 'boton-nav') r.nav.push({ nombre: c.clave, pin: p, funcion: par.funcion || 'siguiente', pull: par.pull || 'pull-up interno' });
  }
  return r;
}

/* El enlace con el nodo de control, del lado que pregunta */
function enlaceLinuxHMI(){
  if (!hayEnlace()) return null;
  const base = placaBase(nodoHMI());
  return { tipo: E.enlace.tipo, puerto: (base.uart2 && base.uart2.puerto) || '/dev/ttyS0', baudios: baudiosEnlace(),
           medidas: varsRemotas().map(v => v.nombre),
           ordenes: varsOrden().map(v => ({ nombre: v.nombre, booleano: !!v.booleano })),
           pulsos: varsPulso().map(v => v.nombre),
           espera_ms: esperaRespuestaMs(), timeout_ms: 1000, minimo_ms: 40, largo: largoLinea() };
}

/* Las fuentes que usa el proyecto: el motor las busca en fuentes/ */
function fuentesLinux(P){
  const s = new Set(['Montserrat-Medium.ttf']);
  const mira = o => { if (!o || typeof o !== 'object') return; if (o.ttf) s.add(o.ttf); for (const v of Object.values(o)) if (v && typeof v === 'object') mira(v); };
  mira(P.pantallas);
  return [...s];
}

/* proyecto.json entero */
function proyectoLinux(){
  migrarCajas(); migrarTextos(); normalizarAuto();
  const P = {
    telar: 1,
    proyecto: E.proyecto,
    placa: placaBase(nodoHMI()).nombre,
    pantalla: pantallaLinux(),
    pantallas: E.pantallas.map(s => ({ nombre: s.nombre, widgets: s.widgets.map(widgetLinux) })),
    logica: logicaLinux(),
    variables: variablesLinux(),
    todas: todasLinux(),
    pines: pinesLinuxHMI(),
    enlace: enlaceLinuxHMI(),
  };
  P.fuentes = fuentesLinux(P);
  return P;
}

/* ------------------------------------------------------------ los ficheros
   Lo que se escribe al exportar. Con un solo nodo, todo suelto en la
   carpeta del proyecto; con dos, la pantalla en su carpeta y el nodo de
   control en la suya, igual que con un ESP32. */
const b64aBytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const usaIconos = P => /[-]/.test(JSON.stringify(P.pantallas));

function generarFicherosLinux(){
  const P = proyectoLinux();
  const f = {};
  f['telar_pantalla.py'] = MOTOR_PANTALLA_PY;
  f['proyecto.json'] = JSON.stringify(P, null, 1) + '\n';
  for (const fu of P.fuentes) if (FUENTES_TTF[fu]) f['fuentes/' + fu] = b64aBytes(FUENTES_TTF[fu]);
  if (usaIconos(P) && typeof ICONOS_WOFF === 'string') f['fuentes/' + TTF_ICONOS_LINUX] = b64aBytes(ICONOS_WOFF);
  f['LEEME.txt'] = genLeemePantallaLinux(P);
  f['telar-pantalla.service'] = genServicioPantallaLinux();
  f['requisitos.txt'] = 'luma.oled\npython-periphery\npyserial\npillow\n';
  if (E.nodos.length < 2) return f;

  const n = cid(E.proyecto), A = nodoHMI(), B = E.nodos[1];
  const cA = carpetaNodo(A), cB = carpetaNodo(B);
  const dos = {};
  for (const [ruta, x] of Object.entries(f)) dos[cA + '/' + ruta] = x;
  /* el servicio apunta a la carpeta de la pantalla */
  dos[cA + '/telar-pantalla.service'] = genServicioPantallaLinux(cA);
  ficherosControl(B, cB, dos);
  dos['LEEME_' + n + '.txt'] = genLeemeSistemaLinux(A, B);
  return dos;
}

function genServicioPantallaLinux(sub){
  const carpeta = cid(E.proyecto) + (sub ? '/' + sub : '');
  return `# Telar Studio: arrancar la pantalla sola al encender la placa.
# Es un servicio DE USUARIO: corre con tu usuario, no como root. Se
# instala asi (lo explica el LEEME):
#   mkdir -p ~/.config/systemd/user
#   cp telar-pantalla.service ~/.config/systemd/user/
#   systemctl --user daemon-reload
#   systemctl --user enable --now telar-pantalla
#   sudo loginctl enable-linger $USER
# Si copiaste la carpeta a otro sitio, cambia las dos rutas de abajo.
[Unit]
Description=Telar - ${E.proyecto} (pantalla)

[Service]
Type=simple
WorkingDirectory=%h/${carpeta}
ExecStart=%h/telar-env/bin/python %h/${carpeta}/telar_pantalla.py
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
`;
}

/* Lo que hay que hacer en la placa, paso a paso */
function genLeemePantallaLinux(P){
  const base = placaBase(nodoHMI()), pa = P.pantalla, pin = P.pines;
  const esRaspi = /raspberry/i.test(base.nombre), esOrange = /orange/i.test(base.nombre);
  const carpeta = cid(E.proyecto) + (E.nodos.length > 1 ? '/' + carpetaNodo(nodoHMI()) : '');
  const lin = (x, et) => `  ${String(x).padEnd(16)} ${et}`;
  const piezas = [
    ...pin.nav.map(b => lin(b.nombre, `GPIO${b.pin ?? '?'}  boton de navegacion (${b.funcion}); el otro lado del pulsador, a ${b.pull === 'pull-down interno' ? '3,3 V' : 'GND'}`)),
    ...pin.entradas.map(e => lin(e.nombre, `GPIO${e.pin ?? '?'}  entrada digital (${e.pull})`)),
    ...pin.salidas.map(s => lin(s.nombre, `GPIO${s.pin ?? '?'}  salida digital (activa a nivel ${s.bajo ? 'BAJO' : 'ALTO'})`)),
  ];
  return `PANTALLA EN LINUX — ${E.proyecto}
${'='.repeat(56)}

Esta placa no lleva sketch: la pantalla la dibuja un programa de Python,
telar_pantalla.py. Es el MISMO programa para todos los proyectos; lo que
es de este (las pantallas, la logica, los pines) va en proyecto.json.

PLACA:     ${base.nombre}
PANTALLA:  ${pa.controlador} (${pa.ancho}x${pa.alto}), I2C, direccion ${pa.direccion}

QUE CONECTAR
------------
  OLED VCC         3,3 V (pin 1 del conector)
  OLED GND         GND   (pin 6)
  OLED SDA         GPIO2 (pin 3)
  OLED SCL         GPIO3 (pin 5)
${piezas.join('\n')}${piezas.length ? '\n' : ''}
Los numeros GPIO son los del chip (BCM, los de pinout.xyz), no los del
conector: es el error mas comun.${pin.nav.length ? '' : `

Sin botones de navegacion la pantalla solo muestra: no hay dedo que
pulse sus botones. Para moverte por ella, anade en Telar (Hardware) las
piezas "Boton de navegacion": siguiente, anterior y aceptar.`}

QUE HACE FALTA, UNA VEZ
-----------------------
1. Encender el I2C.
${esRaspi ? `     sudo raspi-config nonint do_i2c 0
   (o en raspi-config: Interface Options > I2C > Si)`
  : esOrange ? `   En Orange Pi va por overlay: orangepi-config (o armbian-config) >
   System > Hardware, y activa el i2c que salga en los pines 3 y 5.`
  : `   En la Jetson el I2C de los pines 3 y 5 ya viene encendido.`}

2. Instalar lo necesario, en un entorno de Python aparte (el sistema no
   deja instalar con pip fuera de uno):
     sudo apt install -y python3-venv python3-pil i2c-tools
     python3 -m venv --system-site-packages ~/telar-env
     ~/telar-env/bin/pip install -r requisitos.txt

3. Dar permiso a tu usuario para el I2C y los pines${P.enlace ? ' y el puerto serie' : ''}:
     sudo usermod -aG i2c,gpio${P.enlace ? ',dialout' : ''} $USER
   y cerrar la sesion y volver a entrar.

4. Comprobar que la placa ve la pantalla:
     i2cdetect -y ${pa.i2c_bus}
   Tiene que salir 3c (o 3d). Si no sale nada, revisa SDA y SCL. Si sale
   en 3d, pon "direccion": "0x3D" en proyecto.json.${esOrange ? `
   En Orange Pi el numero del bus cambia de un modelo a otro: mira con
   "i2cdetect -l" cual es y ponlo en "i2c_bus" dentro de proyecto.json.` : ''}

COMO SE ARRANCA
---------------
    cd ~/${carpeta}
    ~/telar-env/bin/python telar_pantalla.py

Sale por la consola lo que pasa (cambios de estado, botones). Ctrl+C
para parar. Cuando funcione, para que arranque sola al encender:

    mkdir -p ~/.config/systemd/user
    cp telar-pantalla.service ~/.config/systemd/user/
    systemctl --user daemon-reload
    systemctl --user enable --now telar-pantalla
    sudo loginctl enable-linger $USER

El servicio supone que la carpeta esta en ~/${carpeta}. Si no, cambia
las dos rutas del fichero antes de copiarlo.

SIN LA PLACA
------------
En cualquier ordenador con Python y Pillow (pip install pillow):

    python3 telar_pantalla.py --sin-placa

guarda en pantalla.png lo que se veria en la OLED cada vez que cambia.
Se maneja escribiendo en la consola n (siguiente), p (anterior) o
a (aceptar), y Intro.

LOS BOTONES DE NAVEGACION
-------------------------
  siguiente / anterior   mueven el foco: el widget marcado sale en negativo
  aceptar                hace lo que haria el dedo: pulsa el boton, cambia
                         el interruptor o la casilla
En un deslizador, aceptar entra a editarlo: siguiente y anterior lo
mueven, y aceptar otra vez sale.

LO QUE NO HACE
--------------
- Mueve las OLED de un color por I2C (SSD1306, tambien la de 32 filas, y
  SH1106). Las TFT por SPI y las pantallas serie, todavia no.
- No tiene convertidor analogico: una placa con Linux no mide tensiones.
  Para eso, un nodo de control (un ESP32 o una Pico) que mida y lo mande.
- Las letras son las mismas del lienzo de Telar, pero en pixeles de un
  solo color: un texto muy pequeno o muy fino puede perder algun punto.
  Si pasa, sube un poco su tamano.

QUE FICHERO ES DE QUIEN
-----------------------
  telar_pantalla.py      generado   el programa, igual en todos los proyectos
  proyecto.json          generado   lo de este proyecto; se rehace al exportar
  fuentes/               generado   las letras que usa la pantalla
  telar-pantalla.service generado   para que arranque sola
  memoria.json           TUYO       lo que guarda la logica (save / load)
`;
}

function genLeemeSistemaLinux(A, B){
  const L = ENLACES[E.enlace.tipo], pb = placaBase(A);
  return `${E.proyecto} — DOS NODOS
${'='.repeat(56)}

  ${carpetaNodo(A)}/
      ${pb.corto}, con la pantalla (Python)
      Pinta la interfaz, lleva la logica y pregunta al otro nodo.

  ${carpetaNodo(B)}/
      ${placaDe(B).corto}
      Lee los sensores, mueve las salidas y contesta.

EL CABLE ENTRE LAS DOS
----------------------
  ${pb.corto}: ${L.nombre} por ${(pb.uart2 && pb.uart2.puerto) || '/dev/ttyS0'} (TX en el GPIO14, pin 8; RX en el GPIO15, pin 10)
  ${placaDe(B).corto}: los pines de su enlace, en su LEEME
  El TX de una va al RX de la otra, y las masas unidas.${L.transceptor ? `
  Con ${L.nombre} hace falta un transceptor en cada placa: ${L.transceptor}.` : ''}

En una Raspberry la consola serie ocupa ese puerto: quitala con
raspi-config (Interface Options > Serial Port: consola NO, puerto SI).

COMO SE MONTA
-------------
1. El nodo de control: su LEEME dice como subirlo.
2. La pantalla: copia la carpeta ${carpetaNodo(A)} a la ${pb.corto} y sigue su LEEME.
3. Conecta el enlace.

Si la pantalla muestra guiones (--) donde deberia haber numeros, el enlace
no esta llegando. Son las mismas tramas que entre dos ESP32: el
protocolo va en el LEEME del nodo de control.
`;
}
