/* =====================================================================
 * IDIOMAS
 *
 * El texto en español es la CLAVE, y no un identificador tipo
 * "hardware.titulo". Dos razones:
 *
 *   - El código sigue leyéndose. `t('Lo que hay conectado')` dice lo que
 *     va a salir en pantalla; `t('hw.conectado')` obliga a ir a buscarlo.
 *   - Una traducción que falta no rompe nada: cae al español, se ve, y se
 *     arregla añadiendo una línea aquí. Con claves, lo que sale es el
 *     identificador crudo y parece un fallo.
 *
 * El precio es que cambiar el español obliga a cambiar la clave. Es un
 * precio bajo comparado con un editor lleno de identificadores.
 * ================================================================== */

const IDIOMAS = { es: 'Español', en: 'English' };

const EN = {
  /* ---------- cabecera y pestañas ---------- */
  'DISEÑADOR DE PANTALLAS ESP32': 'ESP32 SCREEN DESIGNER',
  'Diseño': 'Design',
  'Estilo': 'Style',
  'Hardware': 'Hardware',
  'Manifiesto': 'Manifest',
  'Abrir': 'Open',
  'Guardar': 'Save',
  'Exportar ▾': 'Export ▾',
  'Pantalla': 'Screen',
  'Control': 'Control',
  'libres': 'free',

  /* ---------- pestaña Diseño ---------- */
  'Proyecto': 'Project',
  'Nombre': 'Name',
  'Placa de la pantalla': 'Screen board',
  'Refresco de pantalla': 'Screen refresh',
  'Añadir widget': 'Add widget',
  'Pantallas': 'Screens',
  'Nombre en el código': 'Name in the code',
  'Enlazado a': 'Bound to',
  '— sin enlazar —': '— not bound —',
  'Texto visible': 'Visible text',
  'Icono': 'Icon',
  '— ninguno —': '— none —',
  'Al pulsar, ir a': 'On tap, go to',
  '— nada —': '— nothing —',
  'O lanzar el evento': 'Or fire the event',
  'O dar la orden': 'Or give the order',
  'Posición y tamaño': 'Position and size',
  'Decimales': 'Decimals',
  'Ejemplo en el editor': 'Example in the editor',
  /* el estilo de un elemento y el del tema */
  'propio de este elemento': 'own to this element',
  'del tema': 'from the theme',
  'su clase de botón': 'its button class',
  'Sus colores salen de looks, en la Lógica: uno por estado.': 'Its colours come from looks, in the Logic: one per state.',
  'El paso actual se pinta con la clase de botón Seleccionado del tema.': 'The current step is painted with the Selected button class of the theme.',
  'Según el alto de la caja': 'From the height of the box',
  'Heredado del tema': 'Inherited from the theme',
  'Aspecto': 'Appearance',
  'Colores propios:': 'Own colours:',
  'El resto, del tema.': 'The rest, from the theme.',
  'Todo del tema.': 'Everything from the theme.',
  'Colores, clase y letra se cambian en la pestaña Estilo, o con el botón derecho sobre el elemento.':
    'Colours, class and font are changed in the Style tab, or with a right click on the element.',
  'Cambiar su aspecto': 'Change its appearance',
  'Número': 'Number',
  'Rótulo y unidad': 'Caption and unit',
  'Valor': 'Value',
  'Casillas': 'Boxes',
  'Texto de los pasos': 'Step text',
  'Pista': 'Track',
  'Relleno': 'Fill',
  'Marca de consigna': 'Setpoint mark',
  'Curva': 'Trace',
  'Referencia': 'Reference',
  'Línea de consigna': 'Setpoint line',
  'Rejilla': 'Grid',
  'Ejes': 'Axes',
  'Arco': 'Arc',
  'Escala y unidad': 'Scale and unit',
  'Correcto': 'OK',
  'Texto secundario': 'Secondary text',
  'El fondo de barras, arcos y relojes de aguja': 'The background of bars, arcs and gauges',
  'Valen para TODO el proyecto: cada elemento los hereda mientras no tenga uno propio. Para cambiar solo uno, selecciónalo en el lienzo y su estilo sale arriba.':
    'They apply to the WHOLE project: every element inherits them unless it has its own. To change just one, select it on the canvas and its style appears above.',
  'Consigna (la línea discontinua)': 'Setpoint (the dashed line)',
  'Consigna (la marca verde)': 'Setpoint (the green mark)',
  'Sin consigna, la marca no se dibuja.': 'Without a setpoint, the mark is not drawn.',
  'no se ve: falta elegir la consigna': 'not shown: choose the setpoint first',
  'La marca de consigna no se dibuja porque este elemento no tiene consigna.': 'The setpoint mark is not drawn because this element has no setpoint.',
  'Elegir la consigna': 'Choose the setpoint',
  'Mostrar la línea de consigna': 'Show the setpoint line',
  'Su valor sale de': 'Its value comes from',
  '— un valor fijo —': '— a fixed value —',
  'Valor fijo de la consigna': 'Fixed setpoint value',
  'O elige una variable arriba y la marca la seguirá en vivo.': 'Or choose a variable above and the mark will follow it live.',
  'Cuando la lógica tenga un ajuste (setting), podrás enlazar la consigna a él y la marca lo seguirá en vivo.':
    'When the logic has a setting, you can bind the setpoint to it and the mark will follow it live.',
  'oculta (se muestra en Diseño)': 'hidden (shown from Design)',
  'oculta': 'hidden',
  'Mostrar la marca de consigna': 'Show the setpoint mark',
  'Marca la consigna': 'It marks the setpoint',
  'Quítalo para ocultarla; la consigna se conserva.': 'Untick it to hide it; the setpoint is kept.',
  'Oculta. La consigna': 'Hidden. The setpoint',
  'sigue elegida: márcalo para volver a verla.': 'is still chosen: tick it to show it again.',
  'La marca está oculta (pestaña Estilo).': 'The mark is hidden (Style tab).',
  /* las plantillas de pantalla */
  'O empieza con una plantilla:': 'Or start from a template:',
  'Las plantillas necesitan una pantalla de al menos 320×240.': 'Templates need a screen of at least 320×240.',
  'Se ven mejor con el tema Industrial (pestaña Estilo).': 'They look best with the Industrial theme (Style tab).',
  'Operación': 'Operation',
  'Diagnóstico': 'Diagnostics',
  'En blanco': 'Blank',
  'La del día a día: la medida en grande con su consigna, la curva, tres datos, los pasos del proceso y MARCHA/PARO.':
    'The everyday one: the big measurement with its setpoint, the trend, three values, the process steps and START/STOP.',
  'Tres valores que se cambian con − y +, cada uno en su fila, y GUARDAR para que no se pierdan al apagar.':
    'Three values changed with − and +, each on its own row, and SAVE so they are not lost at power-off.',
  'Para el técnico: un reloj de aguja con la salida y, al lado, cuatro valores para revisar de un vistazo.':
    'For the technician: a gauge with the output and, next to it, four values to check at a glance.',
  'Solo la cabecera y la botonera, con VOLVER. El centro, libre para lo tuyo.':
    'Just the header and the button bar, with BACK. The middle, free for your own things.',
  /* los componentes industriales */
  'Industrial': 'Industrial',
  'Tarjeta': 'Card',
  'Un panel del color del tema con su rótulo arriba. Lo que pongas encima queda agrupado.':
    'A panel in the theme colour with its caption on top. Whatever you place on it stays grouped.',
  'Lectura grande': 'Big reading',
  'Número': 'Number',
  'Un número con su unidad y, si quieres, un rótulo encima. Suelto se lee de lejos; en tarjeta queda como un dato de panel. Si la variable es un tiempo, sale como mm:ss.':
    'A number with its unit and, if you want, a caption above. On its own it reads from afar; in a card it looks like a panel value. If the variable is a time, it shows as mm:ss.',
  'En tarjeta': 'In a card',
  "¿Dónde guardo el proyecto?": "Where do I save the project?",
  "La última vez lo guardaste en": "Last time you saved it in",
  "Dentro se creará o se pondrá al día": "Inside it will create or update",
  "Si Chrome pregunta si esta página puede <b>editar archivos</b>, di <b>Permitir</b>. Si te ofrece <b>Permitir en cada visita</b>, elígelo y no volverá a preguntar. Lo tuyo de": "If Chrome asks whether this page may <b>edit files</b>, say <b>Allow</b>. If it offers <b>Allow on every visit</b>, choose it and it will not ask again. Your code in",
  "Elegir otra carpeta": "Choose another folder",
  "Guardar en": "Save in",
  "Sin permiso no puedo escribir": "Without permission I cannot write",
  "Chrome no dio permiso para editar": "Chrome did not give permission to edit",
  "Vuelve a exportar y elige": "Export again and choose",
  "Permitir": "Allow",
  "o elige otra carpeta.": "or choose another folder.",
  "Telar la recordará para la próxima vez.": "Telar will remember it for next time.",
  'Traer al frente': 'Bring to front', 'Enviar al fondo': 'Send to back', 'Traer adelante': 'Bring forward', 'Enviar atrás': 'Send backward',
  'Tarjeta o panel': 'Card or panel',
  'Un fondo del color del tema para agrupar lo que pongas encima. El rótulo es opcional, y con un color de borde queda como un panel con marco.':
    'A background in the theme colour to group whatever you put on it. The caption is optional, and with a border colour it looks like a framed panel.',
  'Estado actual': 'Current state',
  'Barra': 'Bar',
  'Una barra que se llena con la medida. Puede llevar la escala debajo y una marca verde en la consigna; las dos cosas se quitan si no las quieres.':
    'A bar that fills with the measurement. It can show the scale below and a green setpoint mark; both can be turned off.',
  'Un arco con su escala y el valor en el centro, con un punto luminoso en la punta. De 270° (casi cerrado) o de 180° (como un velocímetro).':
    'An arc with its scale and the value in the centre, with a bright dot at the tip. 270° (almost closed) or 180° (like a speedometer).',
  'Mostrar la escala (mínimo y máximo)': 'Show the scale (minimum and maximum)',
  'Apertura del arco': 'Arc opening',
  'Dónde va la unidad': 'Where the unit goes',
  'Grosor de la barra (px)': 'Bar thickness (px)',
  'Grosor del arco (px)': 'Arc thickness (px)',
  'Esquinas redondeadas (px)': 'Rounded corners (px)',
  'Detrás del número': 'After the number',
  'Detrás, arriba': 'After it, at the top',
  'Detrás, en la línea del número': 'After it, on the number\'s baseline',
  'Encima del número': 'Above the number',
  'Mover la unidad X (px)': 'Move the unit X (px)',
  /* los dialogos */
  'Entendido': 'Got it', 'Aceptar': 'OK', 'Cancelar': 'Cancel', 'Cerrar': 'Close', 'Copiar': 'Copy', 'Copiado': 'Copied',
  'Selecciónalo y copia': 'Select it and copy',
  'No puedo leer esa imagen': 'I cannot read that image', 'Prueba con un PNG o un JPG.': 'Try a PNG or a JPG.',
  'Falta el nombre': 'Name missing', 'Falta el tamaño': 'Size missing',
  'Escribe el ancho y el alto en píxeles.': 'Enter the width and height in pixels.',
  'No es un proyecto de Telar': 'Not a Telar project',
  'Ese fichero no se puede abrir: elige un .telar.json guardado con Telar Studio.': 'That file cannot be opened: choose a .telar.json saved with Telar Studio.',
  'La lógica tiene': 'The logic has', 'cosa por arreglar': 'thing to fix', 'cosas por arreglar': 'things to fix',
  'No exporto hasta que esté bien: el sketch compilaría sin esa lógica y el aparato no haría lo que has escrito.':
    'I will not export until it is right: the sketch would compile without that logic and the device would not do what you wrote.',
  '…y más, en la pestaña Lógica.': '…and more, in the Logic tab.', 'Ir a la Lógica': 'Go to Logic',
  'Hay cosas que una placa AVR (UNO/Nano) no puede hacer': 'There are things an AVR board (UNO/Nano) cannot do',
  'Hay cosas que esta placa no puede hacer': 'There are things this board cannot do',
  'Estas placas (AVR como UNO o Nano, y las Linux) no tienen radio ni CAN, y Telar todavía no escribe sus buses. Con ellas el enlace entre nodos va por serie: UART o RS485.': 'These boards (AVR such as UNO or Nano, and Linux ones) have no radio or CAN, and Telar does not write their buses yet. With them the link between nodes goes over serial: UART or RS485.',
  'Clave del enlace': 'Link key',
  'Simular las medidas': 'Simulate the readings',
  'El nodo lee sus sensores de verdad.': 'The node reads its real sensors.',
  'El nodo inventa sus medidas: sirve para probar el enlace sin nada cableado. Quítalo cuando tengas el hardware conectado; se guarda en el proyecto, así que cada exportación lo respeta.': 'The node makes up its readings: useful to test the link with nothing wired. Untick it once the hardware is connected; it is saved in the project, so every export keeps it.',
  'Todos los ESP-NOW cercanos oyen lo que se manda. Los dos nodos ponen esta clave en cada paquete y tiran lo que no la lleve: así dos equipos en la misma sala no se obedecen el uno al otro. Si hay otro equipo cerca con el mismo proyecto, cámbiala y vuelve a exportar los dos nodos.': 'Every nearby ESP-NOW device hears what is sent. Both nodes put this key in every packet and drop anything without it: that way two systems in the same room do not obey each other. If another system with the same project is nearby, change it and export both nodes again.',
  'El enlace': 'The link', 'todavía no está hecho': 'is not done yet',
  'Telar Studio sabe escribir RS485 y UART. Para': 'Telar Studio can write RS485 and UART. For',
  'haría falta otro transporte entero, y no quiero darte código de puerto serie con otro nombre encima.':
    'a whole other transport would be needed, and I do not want to give you serial-port code with another name on top.',
  'Cambia el enlace a RS485 o UART en la pestaña Hardware.': 'Change the link to RS485 or UART in the Hardware tab.',
  'Este navegador no puede escribir carpetas': 'This browser cannot write folders',
  'Abre Telar Studio con Chrome o Edge: así escribe el sketch directamente en tu carpeta de Arduino.':
    'Open Telar Studio with Chrome or Edge: that way it writes the sketch straight into your Arduino folder.',
  'Elige dónde guardar el proyecto': 'Choose where to save the project',
  'Elige la carpeta donde guardas tus sketches (normalmente': 'Choose the folder where you keep your sketches (usually',
  'Dentro se creará': 'Inside it will create',
  'Después Chrome te preguntará si esta página puede <b>editar archivos</b> en esa carpeta. Di <b>Permitir</b>: sin ese permiso no puede escribir el sketch. Solo toca esa carpeta, y lo tuyo de':
    'Chrome will then ask whether this page may <b>edit files</b> in that folder. Say <b>Allow</b>: without that permission it cannot write the sketch. It only touches that folder, and your',
  'nunca se sobrescribe.': 'is never overwritten.', 'Elegir carpeta': 'Choose folder',
  'Activa en lv_conf.h las fuentes que trae LVGL': 'Enable in lv_conf.h the fonts LVGL brings',
  'Imprescindible: genera las fuentes propias': 'Essential: generate the custom fonts',
  'Entra en esta carpeta del proyecto y ejecuta': 'Go into this project folder and run',
  'Los .c van solos a': 'The .c files go by themselves to',
  'Si te lo saltas, el enlazador dirá': 'If you skip it, the linker will say',
  'No las pongas en lv_conf.h: LVGL no las tiene.': 'Do not put them in lv_conf.h: LVGL does not have them.',
  'En Herramientas del IDE de Arduino': 'In Tools of the Arduino IDE',
  'Listo': 'Done', 'ficheros en': 'files in', 'Respetado, porque es tuyo:': 'Left alone, because it is yours:',
  'Antes de subirlo a la placa:': 'Before uploading it to the board:',
  'No se pudo escribir el proyecto': 'The project could not be written', 'El sistema dijo:': 'The system said:',
  'Suele ser una carpeta de solo lectura o un fichero abierto en otro programa (el IDE de Arduino, por ejemplo). Ciérralo y vuelve a exportar.':
    'It is usually a read-only folder or a file open in another program (the Arduino IDE, for example). Close it and export again.',
  'Receta añadida': 'Recipe added', 'Otra función (bloque nuevo)': 'Another function (new block)',
  'Nombre del bloque, en minúsculas y sin espacios': 'Block name, lowercase and without spaces',
  'Escribe un nombre.': 'Type a name.', 'Crear bloque': 'Create block',
  'Tiempo': 'Time',
  'Un tiempo como mm:ss: una cuenta atrás, lo que lleva un ciclo. Se enlaza a una variable en segundos, como un timer de la lógica.':
    'A time as mm:ss: a countdown, how long a cycle has run. Bind it to a variable in seconds, like a timer from the logic.',
  'Valor': 'Value',
  'Valor (segundos)': 'Value (seconds)',
  'Muestra': 'Shows',
  'Icono': 'Icon', 'Sin icono': 'No icon', 'Cambiar': 'Change', 'Elige un icono': 'Choose an icon',
  'Buscar: temperatura, presión, gota…': 'Search: temperature, pressure, drop…',
  'Los de LVGL (no hace falta generar fuente)': 'LVGL built-ins (no font to generate)',
  'Más de cien, por temas: eléctricos, físicos, químicos, de máquinas… En la placa entran en la fuente al exportar; crecen con el tamaño de letra y toman su color.':
    'Over a hundred, by theme: electrical, physical, chemical, machines… On the board they go into the font on export; they grow with the font size and take its colour.',
  'Un símbolo suelto —un rayo, un termómetro, una gota— con el tamaño y el color que quieras. Hay más de cien, por temas.':
    'A standalone symbol — a bolt, a thermometer, a drop — in the size and colour you want. Over a hundred, by theme.',
  'Eléctricas': 'Electrical', 'Físicas': 'Physical', 'Químicas y laboratorio': 'Chemistry and lab', 'Máquinas y proceso': 'Machines and process',
  'Estado y avisos': 'Status and alerts', 'Acciones': 'Actions', 'El valor de la variable': 'The value of the variable',
  'Cuánto cambia por segundo (tasa)': 'How much it changes per second (rate)',
  'Se calcula en la placa, suavizada: sube cuando la variable sube y vale 0 cuando se queda quieta.':
    'Worked out on the board, smoothed: it goes up when the variable goes up and is 0 when it stays still.',
  'Solo para verlo en el editor: en la placa lo pone la variable enlazada.': 'Only to see it in the editor: on the board the bound variable sets it.',
  'Dónde va': 'Where it goes',
  'Detrás, en la línea': 'After it, on the baseline',
  'Debajo': 'Below',
  'Encima': 'Above',
  'Unidad X (px)': 'Unit X (px)',
  'Letra': 'Font', 'Tamaño': 'Size', 'La del tema': 'The theme one',
  'Rótulo X (px)': 'Caption X (px)', 'Rótulo Y (px)': 'Caption Y (px)', 'Arrástralo para moverlo': 'Drag it to move it',
  'O arrástralo en el lienzo con el ratón: con el elemento seleccionado, el rótulo sale recuadrado.': 'Or drag it on the canvas with the mouse: with the element selected, the caption is outlined.',
  'Unidad Y (px)': 'Unit Y (px)',
  'Arrástrala para moverla': 'Drag it to move it',
  'O arrástrala en el lienzo con el ratón: con el Número seleccionado, la unidad sale recuadrada.':
    'Or drag it on the canvas with the mouse: with the Number selected, the unit shows a dashed frame.',
  'Mover la unidad Y (px)': 'Move the unit Y (px)',
  'Positivo, a la derecha y hacia abajo; negativo, al revés. Se suma a la posición elegida arriba.':
    'Positive moves right and down; negative, the other way. It adds to the position chosen above.',
  'Debajo del número': 'Below the number',
  'Sin unidad': 'No unit',
  'Ceñir la caja al texto': 'Fit the box to the text',
  'Esta tipografía se convierte al tamaño exacto que pidas.': 'This typeface is converted to the exact size you ask for.',
  'Montserrat llega hasta 48 px compilada; de ahí en adelante se genera al exportar, y de 280 px en adelante hay que poner a 1 LV_FONT_FMT_TXT_LARGE en lv_conf.h.':
    'Montserrat comes compiled up to 48 px; beyond that it is generated on export, and from 280 px on you must set LV_FONT_FMT_TXT_LARGE to 1 in lv_conf.h.',
  'Escala fija (el rango de la variable)': 'Fixed scale (the range of the variable)',
  'Sin marcar, la escala se ajusta sola a números redondos según lo que entre.': 'Unticked, the scale fits itself to round numbers as data comes in.',
  'Solo el texto, sin fondo': 'Text only, no background',
  'De 280 px en adelante hay que poner a 1 LV_FONT_FMT_TXT_LARGE en lv_conf.h; el generador avisa.':
    'From 280 px on you must set LV_FONT_FMT_TXT_LARGE to 1 in lv_conf.h; the generator warns you.',
  '270° · casi cerrado': '270° · almost closed',
  '180° · velocímetro': '180° · speedometer',
  'Con tarjeta queda como un dato de panel: fondo propio y número mediano. Sin ella, el número manda en la pantalla.':
    'With a card it looks like a panel value: its own background and a medium number. Without it, the number dominates the screen.',
  'El número principal, enorme, con su unidad pegada detrás y un rótulo encima. La unidad se recoloca sola cuando el número crece.':
    'The main number, huge, with its unit right after it and a caption above. The unit moves by itself when the number grows.',
  'Una tarjeta pequeña con un rótulo y un valor: la tasa, la consigna, el tiempo que queda.':
    'A small card with a caption and a value: the rate, the setpoint, the time left.',
  'Píldora de estado': 'Status pill',
  'El estado del aparato en una píldora de color. El texto y el color de cada estado salen de looks en la Lógica; sin looks, el nombre del estado en gris.':
    'The machine state in a coloured pill. The text and colour of each state come from looks in the Logic; without looks, the state name in grey.',
  'Pasos del proceso': 'Process steps',
  'Una casilla por estado, en orden; se ilumina la del estado actual. Escribe en Elementos el texto de cada casilla, uno por línea, en el orden de los estados.':
    'One box per state, in order; the current one lights up. Write each box text in Items, one per line, in the order of the states.',
  'Barra con consigna': 'Bar with setpoint',
  'Una barra que se llena con la medida y una raya verde donde está la consigna, con la escala debajo.':
    'A bar that fills with the measurement and a green tick where the setpoint is, with the scale below.',
  'Curva de proceso': 'Process trend',
  'La medida en el tiempo, con la escala que se ajusta sola a números redondos, la consigna en verde discontinuo y, si quieres, una referencia en gris. Ponla dentro de una Tarjeta.':
    'The measurement over time, with a scale that fits itself to round numbers, the setpoint as a dashed green line and, if you want, a reference in grey. Put it inside a Card.',
  'Reloj de aguja': 'Gauge',
  'Un arco de 270° con su escala, el valor en el centro, un punto luminoso en la punta y la consigna marcada en verde.':
    'A 270° arc with its scale, the value in the centre, a bright dot at the tip and the setpoint marked in green.',
  'Consigna (se marca en verde)': 'Setpoint (marked in green)',
  'Referencia (curva gris detrás)': 'Reference (grey trace behind)',
  'Ventana de tiempo (s)': 'Time window (s)',
  'Desde': 'From',
  'Hasta': 'To',
  'En blanco, el rango de la variable enlazada.': 'Left blank, the range of the bound variable.',
  '— ninguna —': '— none —',
  'Rótulo': 'Caption',
  'sin rótulo': 'no caption',
  'la de la variable': "the variable's",
  'Se ve como': 'Shown as',
  'Automático': 'Automatic',
  'Tiempo (mm:ss)': 'Time (mm:ss)',
  'Señales del gráfico': 'Chart signals',
  'Ceñir la caja al texto': 'Fit the box to the text',
  'Ajustar al texto': 'Fit to text',
  'Estilo de este widget': 'Style of this widget',
  'Fichero': 'File',

  /* ---------- pestaña Hardware ---------- */
  'Nodo que estás editando': 'Node you are editing',
  'Quitar este nodo': 'Remove this node',
  'Placa del nodo': 'Node board',
  'Placa': 'Board',
  'Lo que hay conectado': 'What is connected',
  'Pin': 'Pin',
  'Ajustes': 'Settings',
  'Ojo': 'Careful',
  'Quitar': 'Remove',
  'Cambiar el pin': 'Change the pin',
  'Asignación automática': 'Automatic assignment',
  'ocupado': 'taken',
  'fijado': 'pinned',
  'enlace con el otro nodo': 'link with the other node',
  '+ un sensor o actuador…': '+ a sensor or actuator…',
  '+ una conexión suelta…': '+ a single connection…',
  'Nada todavía. Añade algo abajo.': 'Nothing yet. Add something below.',
  'Nodos del sistema': 'System nodes',
  'Enlace entre nodos': 'Link between nodes',
  'Velocidad': 'Speed',
  '+ Añadir nodo de control': '+ Add a control node',
  'Añadir un segundo nodo': 'Add a second node',
  'Quedan': 'Remaining',
  'pines libres': 'free pins',
  'no gasta ningún pin': 'costs no pin at all',
  'Cuándo usarlo:': 'When to use it:',
  'Cómo se ve de verdad:': 'How it really looks:',

  'Antes de conectar nada': 'Before connecting anything',
  'Trampas de esta placa': 'Traps on this board',
  'Ajustes de Herramientas del IDE': 'IDE Tools settings',
  'Deshacer (Ctrl+Z)': 'Undo (Ctrl+Z)',
  'Rehacer (Ctrl+Y)': 'Redo (Ctrl+Y)',
  'Ninguna todavía.': 'None yet.',
  'Ninguno todavía.': 'None yet.',

  /* ---------- grupos de los catálogos ---------- */
  'Básico': 'Basic',
  'Entrada': 'Input',
  'Visualización': 'Display',
  'Buses': 'Buses',
  'Radio': 'Radio',
  'Pines sueltos': 'Single pins',

  /* ---------- widgets ---------- */
  'Texto': 'Label',
  'Botón': 'Button',
  'Panel': 'Panel',
  'Imagen': 'Image',
  'Línea': 'Line',
  'Lista': 'List',
  'Tabla': 'Table',
  'Aviso modal': 'Message box',
  'Pestañas': 'Tabs',
  'Deslizador': 'Slider',
  'Interruptor': 'Switch',
  'Casilla': 'Checkbox',
  'Desplegable': 'Dropdown',
  'Rueda': 'Roller',
  'Contador': 'Spinbox',
  'Rejilla de botones': 'Button matrix',
  'Campo de texto': 'Text area',
  'Número grande': 'Big number',
  'Barra': 'Bar',
  'Aguja 270°': 'Gauge 270°',
  'Aguja 180°': 'Gauge 180°',
  'Gráfico': 'Chart',
  'Escala': 'Scale',
  'Piloto': 'LED',
  'Cargando': 'Spinner',
  'Tiempo': 'Time',

  /* ---------- periféricos del catálogo ---------- */
  'Entrada analógica': 'Analog input',
  'Sensor SHT31 (temperatura y humedad)': 'SHT31 sensor (temperature and humidity)',
  'Sonda DS18B20 (temperatura)': 'DS18B20 probe (temperature)',
  'Sensor DHT22 (temperatura y humedad)': 'DHT22 sensor (temperature and humidity)',
  'Pulsador o final de carrera': 'Push button or limit switch',
  'Medida de batería (divisor resistivo)': 'Battery measurement (resistive divider)',
  'Módulo de relé': 'Relay module',
  'Salida PWM (motor, válvula, ventilador)': 'PWM output (motor, valve, fan)',
  'Salida aislada de placa': 'Board-isolated output',

  'Selección': 'Selection',
  '+ Nueva pantalla': '+ New screen',
  'widgets seleccionados': 'widgets selected',
  'Color a los': 'Color the',
  'a la vez': 'at once',
  'Acento': 'Accent',
  'Fondo': 'Background',
  'Borde': 'Border',
  'Código QR': 'QR code',

  /* ---------- conexiones ---------- */
  'Bus I2C': 'I2C bus',
  'Puerto serie (UART)': 'Serial port (UART)',
  'RS485': 'RS485',
  'CAN': 'CAN',
  'Bus SPI': 'SPI bus',
  'OneWire': 'OneWire',
  'WiFi': 'WiFi',
  'Bluetooth': 'Bluetooth',
  'ESP-NOW': 'ESP-NOW',
  'Entrada digital': 'Digital input',
  'Salida digital': 'Digital output',
  'Entrada analógica (ADC)': 'Analog input (ADC)',
  'Salida PWM': 'PWM output',
  'Serie directo (UART)': 'Direct serial (UART)',
  'ESP-NOW (sin cables)': 'ESP-NOW (wireless)',
  'todavía no genera código': 'does not generate code yet',

  /* ---------- campos de los catálogos ---------- */
  'Atenuación': 'Attenuation',
  'Suavizado': 'Smoothing',
  'Muestras a promediar': 'Samples to average',
  'Unidad': 'Unit',
  'Valor con el pin a 0 V': 'Value with the pin at 0 V',
  'Valor con el pin al máximo': 'Value with the pin at maximum',
  'Nivel activo': 'Active level',
  'alto': 'high',
  'bajo': 'low',
  'Frecuencia (Hz)': 'Frequency (Hz)',
  'Resolución (bits)': 'Resolution (bits)',
  'Rango': 'Range',
  'Valor al arrancar': 'Value at start-up',
  'Estilo del texto': 'Text style',
  'Encender y apagar (pulso)': 'Switch on and off (pulse)',
  'Subir o bajar un valor': 'Raise or lower a value',
  'Qué hace': 'What it does',
  'Subir': 'Raise',
  'Bajar': 'Lower',
  'Paso': 'Step',
  'Repetir mientras se mantiene pulsado': 'Repeat while held down',
  'Cada pulsación suma o resta el paso a': 'Each press adds or subtracts the step to',
  'sin salirse de': 'without leaving',
  'Pon un botón que suba y otro que baje.': 'Use one button to raise it and another to lower it.',
  'Negrita': 'Bold',
  'Cursiva': 'Italic',
  'Subrayado': 'Underline',
  'Tachado': 'Strikethrough',
  'Espaciado entre letras (px)': 'Letter spacing (px)',
  'Alineación': 'Alignment',
  'Izquierda (por defecto)': 'Left (default)',
  'Centro': 'Center',
  'Derecha': 'Right',
  'La negrita y la cursiva son fuentes propias: al exportar se generan con fuentes/generar.cmd a partir de Montserrat Bold e Italic, que se descargan una vez (lo explica fuentes/LEEME.txt).':
    'Bold and italic are custom fonts: when exporting they are generated with fuentes/generar.cmd from Montserrat Bold and Italic, which you download once (fuentes/LEEME.txt explains how).',
  'En qué unidades se da el valor: en tanto por ciento, de 0 a 255 como analogWrite, o de 0 a 1023. Telar lo convierte a la resolución elegida.':
    'Which units the value is given in: percent, 0 to 255 like analogWrite, or 0 to 1023. Telar converts it to the chosen resolution.',
  'Con qué valor sale al encender, en las unidades del rango. Después lo cambian un widget enlazado o tu código.':
    'The value it has when the device powers on, in the units of the range. After that a linked widget or your code changes it.',
  'Dirección': 'Address',
  'Baudios': 'Baud',
  'ninguno': 'none',
  'poco': 'little',
  'medio': 'medium',
  'mucho': 'a lot',

  /* ---------- reglas y avisos ---------- */
  'Dices <b>qué es</b> y la herramienta resuelve el cómo: bus, dirección, librería y pines.':
    'You say <b>what it is</b> and the tool works out the how: bus, address, library and pins.',
  'Acceso directo a buses y pines, para lo que el catálogo no cubra.':
    'Direct access to buses and pins, for whatever the catalog does not cover.',
  'Un solo nodo: la pantalla lo hace todo. Si te quedas sin pines —en la 4.3B pasa enseguida— puedes añadir una segunda placa que haga el trabajo y le mande los datos.':
    'A single node: the screen does everything. If you run out of pins — on the 4.3B that happens fast — you can add a second board to do the work and send it the data.',
  'El IDE reinicia estas opciones por sketch. Compruébalas antes de cada flasheo:':
    'The IDE resets these options per sketch. Check them before every flash:',

  'Datos verificados en placa.': 'Data verified on the board.',
  'Datos de la comunidad, sin verificar en banco.': 'Community data, not verified on the bench.',

  'telar.yaml': 'telar.yaml',
  'Copiar al portapapeles': 'Copy to clipboard',

  'PWM por LEDC a': 'PWM through LEDC at',
  'y': 'and',

  "Pin libre, apto para leer.": "A free pin, fit for reading.",

  /* ---------- conectar algo ---------- */
  "+ conectar algo…": "+ connect something…",
  "De la placa": "From the board",
  "Salida aislada de placa": "Board-isolated output",

  /* ---------- pestaña Lógica ---------- */
  'Lógica': 'Logic',
  'Código': 'Code',
  'Frases': 'Sentences',
  'Recetas': 'Recipes',
  'Aplicar': 'Apply',
  'Añadir': 'Add',
  'Otra función (bloque nuevo)': 'Another function (new block)',
  'Nombre del bloque nuevo (en minúsculas, sin espacios):': 'Name of the new block (lowercase, no spaces):',
  'Ya hay un bloque con ese nombre.': 'There is already a block with that name.',
  'Un bloque nuevo': 'A new block',
  'Una función más, con sus propios estados. Su nombre va en minúsculas; sus secciones, dos espacios más adentro.': 'One more function, with its own states. Its name is lowercase; its sections go two spaces further in.',
  'estado del bloque': 'state of block',
  'bloque': 'block',
  'Una función con sus propios estados. Corre a la vez que los demás bloques.': 'A function with its own states. It runs at the same time as the other blocks.',
  'La receta se ha añadido como el bloque': 'The recipe was added as the block',
  'y lo que ya había pasa a ser el bloque': 'and what was already there became the block',
  'Para no chocar con lo que ya había, se han renombrado:': 'To avoid clashing with what was already there, these were renamed:',
  'Sus elementos no caben sin tapar a otros: quedaron encima. Muévelos en la pestaña Diseño o pásalos a otra pantalla.': 'Its elements do not fit without covering others, so they were placed on top. Move them in the Design tab or put them on another screen.',
  'Errores': 'Errors',
  '¿Qué es esto?': 'What is this?',
  'Qué puedes escribir aquí': 'What you can write here',
  'Abrir la documentación': 'Open the documentation',  'Todavía no hay lógica.': 'No logic yet.',
  'cosa por arreglar': 'thing to fix',
  'cosas por arreglar': 'things to fix',
  '✓ Válida: se exportará con el proyecto.': '✓ Valid: it will be exported with the project.',
  'Nada que arreglar.': 'Nothing to fix.',
  'línea': 'line',
  'Una acción': 'An action',
  'Una sección': 'A section',
  'Un estado': 'A state',
  'Un estado nuevo': 'A new state',
  'Una variable nueva': 'A new variable',
  'Qué pasa en este estado': 'What happens in this state',
  'Un botón del lienzo': 'A canvas button',
  'Una fila del botón': 'A button row',
  'Un elemento del lienzo': 'A canvas element',
  'En qué estado': 'In which state',
  'Lo que se puede cambiar': 'What can be changed',
  'Sigue escribiendo': 'Keep typing',
  'Empieza por una receta del panel de la izquierda, o escribe aquí.': 'Start from a recipe in the left panel, or type here.',
  'Pulsa cualquier palabra para saber qué es.': 'Click any word to see what it is.',

  /* ---------- pestaña Estilo ---------- */
  "Colores del proyecto":
    "Project colors",
  "Tipografía":
    "Typography",
  "Tamaño base":
    "Base size",
  "Tamaño de letra":
    "Font size",
  "Vista previa":
    "Preview",
  "Estilo de":
    "Style of",
  "Volver a los colores de origen":
    "Back to the original colors",
  "No hay variables de este tipo. Añade hardware en la pestaña <b>Hardware</b>.":
    "There are no variables of this kind. Add hardware on the <b>Hardware</b> tab.",
  "Todos los widgets los heredan mientras no se les ponga uno propio. Cambiar aquí el acento repinta de golpe todo lo que no lo haya pisado.":
    "Every widget inherits these until you give it one of its own. Changing the accent here repaints in one go everything that has not overridden it.",

  /* ---------- pines de la placa ---------- */
  "ADC2, sólo con la radio apagada": "ADC2, only with the radio off",
  "sin convertidor": "no converter",
  "Ocupado por:": "Taken by:",
  "I2C SCL (tactil, expansor, reloj)": "I2C SCL (touch, expander, clock)",
  "I2C SDA (tactil, expansor, reloj)": "I2C SDA (touch, expander, clock)",
  "LDR de placa (sensor de luz)": "on-board LDR (light sensor)",
  "LED RGB de placa (azul)": "on-board RGB LED (blue)",
  "LED RGB de placa (rojo)": "on-board RGB LED (red)",
  "LED RGB de placa (verde)": "on-board RGB LED (green)",
  "USB serie RX": "USB serial RX",
  "USB serie TX": "USB serial TX",
  "altavoz": "speaker",
  "flash interna": "internal flash",
  "interrupcion del tactil": "touch interrupt",
  "panel RGB": "RGB panel",
  "pantalla DC": "display DC",
  "pantalla SPI CS": "display SPI CS",
  "pantalla SPI MISO": "display SPI MISO",
  "pantalla SPI MOSI": "display SPI MOSI",
  "pantalla SPI SCK": "display SPI SCK",
  "retroiluminación": "backlight",
  "táctil IRQ": "touch IRQ",
  "táctil SPI CLK": "touch SPI CLK",
  "táctil SPI CS": "touch SPI CS",
  "táctil SPI MISO": "touch SPI MISO",
  "táctil SPI MOSI": "touch SPI MOSI",

  /* ---------- inspector de widgets ---------- */
  "sin enlazar":
    "not bound",
  "Ahora mismo hereda todo del tema.":
    "Right now it inherits everything from the theme.",
  "x · y · ancho · alto, en píxeles de la pantalla real":
    "x · y · width · height, in pixels of the real screen",
  "Sólo aparece lo que este widget usa de verdad. Sin tocar nada, hereda del tema.":
    "Only what this widget actually uses shows up. Touch nothing and it inherits from the theme.",

  /* ---------- reglas de pines y trampas ---------- */
  "No gasta ningún pin: va por la antena que la placa ya lleva dentro.":
    "It costs no pin: it goes through the antenna the board already has inside.",
  "La placa ya trae el transceptor cableado a estos pines.":
    "The board already brings the transceiver wired to these pins.",
  "La placa ya trae este bus de fábrica, con su transceptor. No cuesta pines libres.":
    "The board brings this bus from the factory, with its transceiver. It costs no free pins.",
  "La placa ya trae este bus de fábrica.":
    "The board brings this bus from the factory.",
  "La radio va dentro del chip. No gasta ningún pin.":
    "The radio is inside the chip. It costs no pin.",
  " A cambio, el ADC2 deja de funcionar en todo el proyecto.":
    " In exchange, ADC2 stops working across the whole project.",
  "Esta placa no tiene expansor. Usa un relé sobre un GPIO libre.":
    "This board has no expander. Use a relay on a free GPIO.",
  "No disponible en ":
    "Not available on ",
  "No quedan salidas aisladas libres.":
    "There are no free isolated outputs left.",
  "Agotadas":
    "All used",
  "No queda ningún canal de ADC1 libre.":
    "There is no free ADC1 channel left.",
  "Sin pines · mira las rutas de escape":
    "Out of pins · look at the escape routes",
  "Recuperado de: ":
    "Reclaimed from: ",
  " Es de sólo entrada, lo que para un sensor es perfecto.":
    " It is input only, which for a sensor is perfect.",
  "Forzado a mano. ":
    "Set by hand. ",
  "Canal de ADC1":
    "ADC1 channel",
  "Canal de ADC1. Obligatorio: el proyecto usa la radio, y con ella el ADC2 deja de leer en silencio.":
    "ADC1 channel. Mandatory: the project uses the radio, and with it ADC2 silently stops reading.",
  "Canal de ADC1. Se prefiere siempre a ADC2, que muere en cuanto se enciende la radio.":
    "ADC1 channel. Always preferred over ADC2, which dies the moment the radio comes on.",
  "GPIO de salida":
    "Output GPIO",
  "No queda ningún pin libre que pueda ser salida.":
    "There is no free pin left that can be an output.",
  "No queda ningún pin libre.":
    "There is no free pin left.",
  "Pin libre con driver de salida, ni de arranque ni de sólo entrada.":
    "A free pin with an output driver, neither a strapping pin nor input only.",
  "Es ADC2: deja de leer en silencio cuando arranca la radio.":
    "This is ADC2: it silently stops reading when the radio starts.",
  "Este pin no tiene convertidor analógico.":
    "This pin has no analog converter.",
  "Es un pin de sólo entrada: no puede encender nada.":
    "This is an input-only pin: it cannot switch anything on.",
  "Es un pin de arranque. Según lo que tenga conectado al encender, la placa puede no arrancar.":
    "This is a strapping pin. Depending on what is connected at power-up, the board may not boot.",
  "Romperás esa función.":
    "You will break that function.",
  "No consume ningún GPIO: sale directamente a los bornes.":
    "It uses no GPIO: it comes straight out to the terminals.",
  "Se monta el bus sobre dos pines libres. A partir del segundo dispositivo I2C, salen gratis.":
    "The bus is built on two free pins. From the second I2C device on, they are free.",
  "El ADC del ESP32 aguanta 3,6 V como máximo y es poco lineal cerca de los extremos. Pon atenuación de 11 dB.":
    "The ESP32 ADC takes 3.6 V at most and is not very linear near the ends. Use 11 dB attenuation.",
  "Promedia 32 o 64 muestras: una lectura suelta baila sola.":
    "Average 32 or 64 samples: a single reading dances on its own.",
  "El modo de alimentación parásita da problemas: conecta siempre el VCC.":
    "Parasite power mode causes trouble: always connect VCC.",
  "Sólo da una lectura cada 2 segundos. No lo leas más rápido.":
    "It only gives one reading every 2 seconds. Do not read it faster.",
  "Hay que filtrar rebotes por software, 20 a 50 ms.":
    "You have to debounce it in software, 20 to 50 ms.",
  "Para un final de carrera, el normalmente cerrado es lo seguro: si se rompe el cable, lee como si hubiera llegado al tope y para el movimiento.":
    "For a limit switch, normally closed is the safe choice: if the cable breaks, it reads as if the end had been reached and stops the movement.",
  "Una batería 3S a plena carga da 12,6 V. NUNCA al pin directo: el ADC muere a 3,6 V.":
    "A fully charged 3S battery gives 12.6 V. NEVER straight to the pin: the ADC dies at 3.6 V.",
  "El divisor descarga la batería siempre. Usa 100 k o más en total.":
    "The divider drains the battery all the time. Use 100 k or more in total.",
  "Muchos módulos se activan con nivel BAJO. Compruébalo antes de programar.":
    "Many modules are active LOW. Check it before you write the code.",
  "La lógica de 3,3 V puede no disparar un módulo opto de 5 V.":
    "3.3 V logic may not trigger a 5 V opto module.",
  "Un pin del micro NUNCA mueve la carga directamente. El driver no es opcional.":
    "A pin of the micro NEVER drives the load directly. The driver is not optional.",
  "Las cargas inductivas necesitan el diodo de descarga: comprueba que el módulo lo lleve.":
    "Inductive loads need the flyback diode: check that the module has one.",
  "Es de colector abierto: absorbe corriente. El positivo de la carga va a su fuente, no al borne.":
    "It is open collector: it sinks current. The positive of the load goes to its own supply, not to the terminal.",
  "Las cargas inductivas necesitan diodo de descarga.":
    "Inductive loads need a flyback diode.",
  "Necesita resistencias de pull-up. Casi todos los módulos ya las traen; con varios a la vez pueden sobrar.":
    "It needs pull-up resistors. Almost every module already has them; with several at once there may be too many.",
  "El UART0 suele estar ocupado por el monitor serie. Usa el 1 o el 2.":
    "UART0 is usually taken by the serial monitor. Use 1 or 2.",
  "Necesita un transceptor en cada punta. Si es de 5 V, su salida mata un pin de 3,3 V.":
    "It needs a transceiver at each end. If it is a 5 V one, its output kills a 3.3 V pin.",
  "El GND común no es opcional: sin referencia común el enlace no engancha.":
    "A common GND is not optional: with no shared reference the link never locks on.",
  "En cables largos, 120 ohm entre A y B en cada extremo.":
    "On long cables, 120 ohm between A and B at each end.",
  "Necesita transceptor y 120 ohm en los dos extremos.":
    "It needs a transceiver and 120 ohm at both ends.",
  "Se comparten MOSI, MISO y SCK; cada dispositivo necesita su propio CS.":
    "MOSI, MISO and SCK are shared; every device needs its own CS.",
  "Resistencia de 4,7 k del dato a 3,3 V.":
    "A 4.7 k resistor from data to 3.3 V.",
  "Con el WiFi encendido, el ADC2 deja de leer. Todo lo analógico tiene que ir a ADC1.":
    "With WiFi on, ADC2 stops reading. Everything analog has to go to ADC1.",
  "WiFi y Bluetooth a la vez comparten la radio: ambos van más lentos.":
    "WiFi and Bluetooth at once share the radio: both get slower.",
  "Ocupa bastante flash: puede que necesites una partición Huge APP.":
    "It eats a fair amount of flash: you may need a Huge APP partition.",
  "Usa la radio WiFi, así que el ADC2 también queda vetado.":
    "It uses the WiFi radio, so ADC2 is vetoed as well.",
  "Máximo 3,6 V absolutos: por encima se rompe el pin.":
    "3.6 V absolute maximum: above that the pin breaks.",
  "Por encima del rango fiable sigue dando números, pero cada vez más aplastados, y sobre 3,1 V se queda clavado en 4095. Si necesitas medir más, usa un divisor resistivo y ajusta la escala.":
    "Above the reliable range it keeps giving numbers, but more and more squashed, and above 3.1 V it sticks at 4095. If you need to measure more, use a resistive divider and adjust the scale.",
  "Para mover un motor o una válvula hace falta un driver: el pin no puede con la carga.":
    "To move a motor or a valve you need a driver: the pin cannot handle the load.",

  /* ---------- enlace entre nodos ---------- */
  "Los pines de fábrica del": "The factory pins of the",
  "Hace falta un transceptor:": "You need a transceiver:",
  "Hace falta un transceptor en cada punta:": "You need a transceiver at each end:",
  "Dos pines libres para TX y RX.": "Two free pins for TX and RX.",
  "No quedan dos pines libres para el enlace.": "There are no two free pins left for the link.",
  "Sin pines para el enlace": "No pins for the link",
  "Se configura abajo, en <b>Nodos del sistema</b>.": "It is configured below, under <b>System nodes</b>.",
  "variable viaja": "variable travels",
  "variables viajan": "variables travel",
  "por el enlace:": "over the link:",
  "Cuando los nodos están lejos o hay motores cerca.": "When the nodes are far apart, or there are motors nearby.",
  "Menos de un metro y sin ruido alrededor.": "Less than a metre, with no noise around.",
  "Cuando vayan a ser más de dos nodos.": "When there are going to be more than two nodes.",
  "Cuando tirar cable es un problema. Veta el ADC2 en los dos nodos.": "When running a cable is a problem. It vetoes ADC2 on both nodes.",
  "ESP32-S3-WROOM-1-N16R8 · 16 MB flash · 8 MB PSRAM OPI": "ESP32-S3-WROOM-1-N16R8 · 16 MB flash · 8 MB OPI PSRAM",
  "ESP32-WROOM-32 · 4 MB flash · sin PSRAM": "ESP32-WROOM-32 · 4 MB flash · no PSRAM",

  /* ---------- prosa de los catalogos ---------- */
  "Potenciómetro, sensor de luz, cualquier señal de 0 a 3 V.":
    "Potentiometer, light sensor, any 0 to 3 V signal.",
  "Sensor digital por I2C. Preciso y sin calibrar.":
    "Digital I2C sensor. Accurate, no calibration needed.",
  "Sonda de temperatura en cable, resistente al agua.":
    "Temperature probe on a cable, waterproof.",
  "El clásico barato. Lento pero suficiente.":
    "The cheap classic. Slow but good enough.",
  "Un contacto. Se lee como encendido o apagado.":
    "A contact. Read as on or off.",
  "Para leer la tensión de una batería con el ADC.":
    "To read a battery voltage with the ADC.",
  "Para encender y apagar algo de corriente alterna o continua.":
    "To switch something on AC or DC mains on and off.",
  "Salida proporcional. Necesita siempre un driver de potencia.":
    "Proportional output. Always needs a power driver.",
  "Las que ya trae la placa en los bornes. No gastan ningún pin.":
    "The ones the board already brings out on its terminals. They cost no pin.",
  "Dos hilos, hasta 127 dispositivos. Lo barato es que se comparte.":
    "Two wires, up to 127 devices. It is cheap because it is shared.",
  "Dos hilos punto a punto. Para hablar con otra placa o un módulo.":
    "Two wires, point to point. To talk to another board or a module.",
  "Serie diferencial. Aguanta cientos de metros y mucho ruido.":
    "Differential serial. Survives hundreds of metres and a lot of noise.",
  "Bus de campo del automóvil. Robusto y con prioridades.":
    "The automotive fieldbus. Robust, with message priorities.",
  "Rápido. Para tarjetas SD, pantallas y convertidores.":
    "Fast. For SD cards, displays and converters.",
  "Un solo hilo, varias sondas. El bus de los DS18B20.":
    "A single wire, several probes. The DS18B20 bus.",
  "El ESP32 lo lleva dentro. No gasta ningún pin.":
    "The ESP32 has it built in. It costs no pin.",
  "BLE o serie por Bluetooth. Tampoco gasta pines.":
    "BLE or Bluetooth serial. It costs no pin either.",
  "Radio directa entre ESP32, sin router. Ideal para unir dos nodos sin cable.":
    "Direct radio between ESP32s, no router. Ideal for joining two nodes without a cable.",
  "Leer un nivel alto o bajo: un contacto, un sensor de presencia.":
    "Read a high or low level: a contact, a presence sensor.",
  "Encender o apagar: un LED, un relé, la entrada de un driver.":
    "Switch on or off: an LED, a relay, a driver input.",
  "Medir una tensión de 0 a 3,3 V.":
    "Measure a voltage from 0 to 3.3 V.",
  "Salida proporcional por LEDC: brillo, velocidad o potencia.":
    "Proportional output through LEDC: brightness, speed or power.",
  "Cuánta tensión cabe en el pin. Siempre son 4095 pasos: con 11 dB cabe mucho y cada paso vale ~0,8 mV; con 2,5 dB cabe poco y cada paso vale ~0,3 mV, así que se lee más fino. Déjalo en 11 dB salvo que tu sensor nunca pase de 1 V.":
    "How much voltage fits into the pin. It is always 4095 steps: at 11 dB a lot fits and each step is worth ~0.8 mV; at 2.5 dB little fits and each step is worth ~0.3 mV, so you read finer. Leave it at 11 dB unless your sensor never goes above 1 V.",
  "Calma el baile del último dígito, a cambio de que la lectura llegue con retraso. Para un mando que se mueve a mano, «ninguno» o «poco»; para una temperatura, «medio» o «mucho».":
    "Settles the dance of the last digit, at the cost of the reading arriving late. For a knob moved by hand, «none» or «little»; for a temperature, «medium» or «a lot».",
  "El ADC del ESP32 es ruidoso y el último dígito baila solo. Promediar lo calma. Más de 64 ya no se nota y ralentiza la lectura.":
    "The ESP32 ADC is noisy and the last digit dances on its own. Averaging settles it. Beyond 64 you no longer notice, and the reading slows down.",
  "Cambia lo que el número SIGNIFICA, no lo que al pin le llega. Para medir de verdad por encima de 3,3 V hace falta un divisor resistivo delante: está en Dispositivos.":
    "This changes what the number MEANS, not what reaches the pin. To really measure above 3.3 V you need a resistive divider in front: it is under Devices.",
  "En la lista de placas hay DOS bloques Waveshare. La 4.3B esta en el segundo, justo debajo de la \"Touch-LCD-4.3\" a secas. La B final importa: la variante sin B compila bien y deja la pantalla negra.":
    "There are TWO Waveshare blocks in the board list. The 4.3B is in the second one, right below the plain \"Touch-LCD-4.3\". That final B matters: the variant without it compiles fine and leaves the screen black.",
  "Medido en placa: el negro sale gris oscuro y los tonos medios suben bastante. El color es fiel. Busca el contraste con el color, no con la oscuridad.":
    "Measured on the board: black comes out dark grey and midtones lift quite a bit. Color is faithful. Get your contrast from color, not from darkness.",
  "El bus ya existe para el táctil. Un sensor I2C no cuesta ningún pin.":
    "The bus already exists for the touch panel. An I2C sensor costs no pin.",
  "Verifica el identificador exacto en boards.txt: el nombre de esta placa cambia entre versiones del core.":
    "Check the exact identifier in boards.txt: this board's name changes between core versions.",
  "No hay bus I2C de fábrica. Se monta sobre los dos pines libres, y a partir de ahí los sensores I2C salen gratis.":
    "There is no factory I2C bus. It is built on two free pins, and from then on I2C sensors are free.",
  "Sin pantalla no hay ajustes delicados. Basta con elegir el puerto correcto.":
    "With no screen there are no delicate settings. Just pick the right port.",
  "El I2C por defecto del ESP32 va en 21 y 22, pero cualquier par de pines vale.":
    "The ESP32 default I2C is on 21 and 22, but any pair of pins will do.",
  "Los pines de fabrica del Serial2 del ESP32.":
    "The factory pins for the ESP32 Serial2.",
  "Comprobado en placa con dos proyectos: HMI del variac y monitor de clima.":
    "Checked on the board with two projects: the variac HMI and a climate monitor.",
  "Los pines vienen de documentación de terceros, no verificados en banco. Confírmalos contra el esquemático antes de soldar nada.":
    "The pins come from third-party documentation, not verified on the bench. Confirm them against the schematic before soldering anything.",
  "La placa de desarrollo de siempre. Pines bien conocidos.":
    "The usual development board. Well-known pins.",
  "Un único GPIO libre de 48. Todo lo que añadas compite por él.":
    "A single free GPIO out of 48. Everything you add competes for it.",
  "Salen por los conectores P3 y CN1. El 35 es sólo entrada. Los tres del LED RGB (4/16/17) se recuperan si no usas el LED.":
    "They come out on connectors P3 and CN1. 35 is input only. The three RGB LED pins (4/16/17) come back if you do not use the LED.",
  "Veinte pines disponibles. Aquí no te vas a quedar sin.":
    "Twenty pins available. You are not going to run out here.",
  "Parece libre y no lo está. Si lo usas, inundas la interrupción del táctil: los botones dejan de responder Y el panel RGB parpadea por falta de ancho de banda.":
    "It looks free and it is not. If you use it you flood the touch interrupt: the buttons stop responding AND the RGB panel flickers for lack of bandwidth.",
  "Es además el TXD de fábrica del UART0, y el core lo arranca aunque la consola vaya por USB. Hay que soltar el UART0 y forzar el pin a entrada, o no llega ni un bit.":
    "It is also the factory TXD of UART0, and the core starts it even when the console goes over USB. You have to release UART0 and force the pin to input, or not one bit gets through.",
  "Es además el RXD de fábrica del UART0. Ver la nota del 43.":
    "It is also the factory RXD of UART0. See the note on 43.",
  "Pin de arranque. Si lo pones a masa al encender, la placa entra en modo carga y no arranca el programa.":
    "Strapping pin. Pull it to ground at power-up and the board enters download mode instead of running your program.",
  "Pin de arranque Y MOSI de la pantalla. Nivel alto al arrancar y la placa no enciende.":
    "Strapping pin AND the display MOSI. High at boot and the board will not start.",
  "Sólo entrada. No tiene driver de salida: sirve para leer, nunca para encender nada.":
    "Input only. It has no output driver: good for reading, never for switching anything.",
  "Pin de arranque. A masa al encender, la placa entra en modo carga y no arranca el programa.":
    "Strapping pin. To ground at power-up and the board enters download mode instead of running your program.",
  "Pin de arranque, y va al LED de la placa. Suele funcionar, pero evítalo si puedes.":
    "Strapping pin, and it goes to the on-board LED. It usually works, but avoid it if you can.",
  "Pin de arranque. Nivel alto al arrancar y la placa no enciende.":
    "Strapping pin. High at boot and the board will not start.",
  "Pin de arranque. Genera ruido por el puerto serie al encender.":
    "Strapping pin. It spits noise out of the serial port at power-up.",
  "Sólo entrada, y sin resistencias internas: perfecto para un sensor, inútil como salida.":
    "Input only, and with no internal pull resistors: perfect for a sensor, useless as an output.",
  "Sólo entrada, sin resistencias internas.":
    "Input only, no internal pull resistors.",
  "Texto fijo: un título, una unidad, una aclaración.":
    "Fixed text: a title, a unit, a clarification.",
  "Lanza una acción o cambia de pantalla.":
    "Fires an action or switches screen.",
  "Una caja de fondo para agrupar cosas.":
    "A background box to group things.",
  "Un mapa de bits. Ojo: ocupa flash.":
    "A bitmap. Careful: it eats flash.",
  "Un separador o una guía.":
    "A separator or a guide.",
  "Lista de elementos con scroll.":
    "A scrollable list of items.",
  "Filas y columnas. Para registros y listados.":
    "Rows and columns. For logs and listings.",
  "Ventana que interrumpe y pide confirmación.":
    "A window that interrupts and asks for confirmation.",
  "Varias vistas en el mismo sitio.":
    "Several views in the same place.",
  "Para que el usuario fije un valor.":
    "So the user can set a value.",
  "Encendido o apagado.":
    "On or off.",
  "Marcar o desmarcar una opción.":
    "Tick or untick an option.",
  "Elegir uno de varios.":
    "Pick one of several.",
  "Rodillo de selección, cómodo con el dedo.":
    "A selection roller, comfortable with a finger.",
  "Número con botones de más y menos.":
    "A number with plus and minus buttons.",
  "Matriz de botones. Para menús y teclados.":
    "A button matrix. For menus and keypads.",
  "Para escribir. Suele ir con un teclado.":
    "For typing. It usually comes with a keyboard.",
  "Teclado en pantalla para los campos de texto.":
    "An on-screen keyboard for the text fields.",
  "Un valor con su unidad. Lo más legible de lejos.":
    "A value with its unit. The most readable from a distance.",
  "Barra de progreso horizontal.":
    "A horizontal progress bar.",
  "Indicador circular casi completo.":
    "An almost complete circular indicator.",
  "Medio arco, como un velocímetro.":
    "A half arc, like a speedometer.",
  "Histórico en el tiempo, una o dos señales.":
    "History over time, one or two signals.",
  "Regla graduada con marcas y números.":
    "A graduated ruler with ticks and numbers.",
  "Muestra un número de segundos como mm:ss. Para cuentas atrás y tiempos de proceso.":
    "Shows a number of seconds as mm:ss. For countdowns and process times.",
  "Un punto que se enciende. Para alarmas y estados.":
    "A dot that lights up. For alarms and states.",
  "Indicador de que algo está en marcha.":
    "An indicator that something is running.",
  "Para enlazar a una web o pasar datos al móvil.":
    "To link to a web page or pass data to a phone.",
  "Una pastilla por estado; se enciende el activo.":
    "One pill per state; the active one lights up.",

  /* ---------- refresco ---------- */
  '10 por segundo · recomendado': '10 per second · recommended',
  '5 por segundo · el más estable': '5 per second · the most stable',
  '20 por segundo · puede parpadear': '20 per second · may flicker',
  '30 por segundo · parpadea casi seguro': '30 per second · will almost certainly flicker',

  /* ---------- la pantalla enchufada ---------- */
  'Con pantalla integrada': 'With a built-in screen',
  'Con una pantalla aparte, por SPI o I2C': 'With a separate screen, over SPI or I2C',
  'pantalla aparte': 'separate screen',
  'La pantalla que le enchufas': 'The screen you plug into it',
  'Controlador': 'Controller',
  'Giro': 'Rotation',
  'El lienzo se dibuja a': 'The canvas is drawn at',
  'Estos pines se descuentan de los libres: el asignador ya no los reparte a los sensores.':
    'These pins come off the free list: the assigner will not hand them to sensors any more.',
  'Pines de la pantalla': 'Screen pins',
  'Un -1 quiere decir que ese pin no se usa: el RESET de muchas pantallas va al de la placa.':
    'A -1 means that pin is not used: on many screens RESET goes to the board reset.',
  'Retroiluminación': 'Backlight',
  'Con -1 no se controla: la pantalla se queda siempre encendida.':
    'With -1 it is not driven: the screen stays lit all the time.',
  'Táctil': 'Touch',
  'El XPT2046 puede ir en su propio bus SPI o compartir el de la pantalla; con pines propios es lo más seguro.':
    'The XPT2046 can have its own SPI bus or share the screen one; its own pins is the safe choice.',
  'Si el dedo cae desplazado, lo que hay que tocar es el giro, no los pines.':
    'If the finger lands off target, what to change is the rotation, not the pins.',

  'En color, por SPI': 'Colour, over SPI',
  'De un color (OLED), por I2C': 'Single colour (OLED), over I2C',
  'Dirección I2C': 'I2C address',
  'Casi todas son 0x3C. Si no se ve nada, prueba 0x3D: lo decide una resistencia de la parte de atrás.':
    'Almost all are 0x3C. If nothing shows, try 0x3D: a resistor on the back decides it.',
  'La pantalla va en su propio bus I2C. Si añades sensores I2C, van en otro par de pines, con su propio controlador: dos buses no se pisan.':
    'The screen gets its own I2C bus. I2C sensors you add go on another pair of pins, with their own controller: two buses do not collide.',
  'No tiene táctil: para moverte por la interfaz, añade en Hardware las piezas «Botón de navegación» (siguiente, anterior y aceptar).':
    'It has no touch: to move around the interface, add "Navigation button" pieces in Hardware (next, previous and accept).',
  'Pantalla de un color: solo aparecen los widgets que se leen en blanco y negro.':
    'Single-colour screen: only the widgets that read well in black and white are offered.',
  'Esta pieza maneja la interfaz: va en el nodo de la pantalla, no en el de control.':
    'This piece drives the interface: it belongs on the screen node, not the control node.',
  'Solo en el nodo de la pantalla': 'Screen node only',
  'Este chip tiene un solo controlador I2C y lo usa la pantalla: aquí no caben sensores I2C.':
    'This chip has a single I2C controller and the screen uses it: there is no room for I2C sensors here.',
  'Sin controlador I2C libre': 'No free I2C controller',
  'Botón de navegación': 'Navigation button',
  'Qué hace': 'What it does',

  'Que se dibujan solas, por puerto serie': 'Self-drawing, over a serial port',
  'Cruzados: el TX de la placa va al RX de la pantalla, y el RX al TX. Y las masas unidas.':
    'Crossed: the board TX goes to the screen RX, and RX to TX. And the grounds joined.',
  'Velocidad': 'Speed',
  'La Nextion se dibuja en su propio editor (Nextion Editor). Al exportar sale NEXTION.txt: la lista exacta de páginas y componentes que hay que crear allí, con su nombre, tipo, posición y el código de cada botón.':
    'The Nextion is drawn in its own editor (Nextion Editor). Exporting produces NEXTION.txt: the exact list of pages and components to create there, with their name, type, position and the code of each button.',
  'De fábrica van a 9600 baudios. Para ir más rápido, en el Nextion Editor pon bauds=115200 en el Preinitialize de la primera página.':
    'They ship at 9600 baud. To go faster, put bauds=115200 in the Preinitialize event of the first page in the Nextion Editor.',
  'El otro lado recibe una línea por cada valor que cambia (SET nombre valor) y contesta una por cada toque (EVT nombre). El protocolo exacto va en el LEEME.':
    'The other side receives one line per changed value (SET name value) and answers one per touch (EVT name). The exact protocol is in the README.',
  'Pantalla por puerto serie: solo aparecen los widgets que tienen equivalente en ella.':
    'Serial-port screen: only the widgets that have an equivalent there are offered.',

  /* ---------- pantalla a medida ---------- */
  '+ Pantalla a medida': '+ Custom screen',
  'Pantalla a medida': 'Custom screen',
  'Para una pantalla que no está en la lista. Se describe una vez y queda guardada dentro del proyecto.':
    'For a screen that is not on the list. Describe it once and it is saved inside the project.',
  'Cómo se conecta': 'How it connects',
  'SPI (pantalla en color o monocromo)': 'SPI (colour or monochrome screen)',
  'I2C (OLED)': 'I2C (OLED)',
  'Puerto serie (se dibuja sola)': 'Serial port (draws itself)',
  'Qué habla': 'What it speaks',
  'Texto por líneas (SET / EVT)': 'Text lines (SET / EVT)',
  'Ancho (px)': 'Width (px)',
  'Alto (px)': 'Height (px)',
  'Es el chip de la pantalla: viene en el anuncio o impreso en el cable plano. El tamaño es el del panel en vertical, antes de girarlo.':
    'It is the screen chip: it comes in the listing or printed on the flat cable. The size is the panel upright, before rotating it.',
  'Ancho del panel (px)': 'Panel width (px)',
  'Alto del panel (px)': 'Panel height (px)',
  'Desplazamiento X': 'X offset',
  'Desplazamiento Y': 'Y offset',
  'Solo si el dibujo sale corrido: hay pantallas cuyo cristal no empieza en la primera columna de la memoria del chip.':
    'Only if the picture comes out shifted: on some screens the glass does not start at the first column of the chip memory.',
  'Colores invertidos': 'Inverted colours',
  'No': 'No',
  'Sí (el negro sale blanco)': 'Yes (black comes out white)',
  'Orden de color': 'Colour order',
  'BGR (el rojo sale azul)': 'BGR (red comes out blue)',
  'Velocidad del SPI (MHz)': 'SPI speed (MHz)',
  'Guardar la pantalla': 'Save the screen',
  'Ponle un nombre a la pantalla.': 'Give the screen a name.',
  'Falta el tamaño: ancho y alto en píxeles.': 'The size is missing: width and height in pixels.',

  'Describe la placa una vez y queda guardada dentro del proyecto. Vale como <b>nodo de control</b>: lee sensores, mueve salidas y habla con la pantalla. Si además quieres que tenga pantalla, elígela como placa de la pantalla con «+ pantalla aparte» en Diseño.':
    'Describe the board once and it is saved inside the project. It works as a <b>control node</b>: it reads sensors, drives outputs and talks to the screen. If you also want it to have a screen, pick it as the screen board with «+ separate screen» in Design.',

  /* ---------- simulador ---------- */
  'Simular': 'Simulate',
  'Probar la pantalla y la lógica sin compilar ni flashear': 'Try the screen and the logic without compiling or flashing',
  '▶ SIMULACIÓN': '▶ SIMULATION',
  'Vuelve a arrancar, como al encender la placa': 'Starts again, as when the board is powered on',
  'Reiniciar': 'Restart',
  'Volver al editor (Esc)': 'Back to the editor (Esc)',
  'Salir': 'Exit',
  'el dibujo es el del lienzo; tipografías y píxeles exactos, en la placa': 'the drawing is the canvas one; exact fonts and pixels, on the board',
  'arranque': 'start-up',
  'pulsado': 'pressed',
  'soltado': 'released',
  'Cuánto dura': 'How long',
  'Un número, un nombre o una cuenta': 'A number, a name or a calculation',
  '+ Placa a medida': '+ Custom board',
  'Editar esta ficha': 'Edit this board',
  'Montserrat negrita': 'Montserrat bold',
  'Montserrat cursiva': 'Montserrat italic',
  'Montserrat negrita cursiva': 'Montserrat bold italic',
  'Chivo negrita': 'Chivo bold',
  'Chivo extranegra': 'Chivo black',
  'IBM Plex Mono seminegra': 'IBM Plex Mono semibold',
  'Barlow Condensed negrita': 'Barlow Condensed bold',
  'Roboto negrita': 'Roboto bold',
  'Roboto Mono seminegra': 'Roboto Mono semibold',
  'Oswald seminegra': 'Oswald semibold',
  'DSEG7 · 7 segmentos': 'DSEG7 · 7-segment',
  'Lo tuyo de': 'Your',
  'lv-font-conv.js no se cargó bien': 'lv-font-conv.js did not load properly',
  'No encuentro lv-font-conv.js junto a Telar Studio': 'I cannot find lv-font-conv.js next to Telar Studio',
  'Generando las fuentes': 'Generating the fonts',
  'Escribiendo los archivos': 'Writing the files',
  'Exportando': 'Exporting',
  'Preparando el conversor…': 'Preparing the converter…',
  'no viene con Telar': 'does not come with Telar',
  'salió casi vacía: no tendría glifos': 'came out almost empty: it would have no glyphs',
  'generadas': 'generated',
  'para generar.cmd': 'left for generar.cmd',
  'escritos': 'written',
  'Telar no pudo generar': 'Telar could not generate',
  'Fuentes generadas': 'Fonts generated',
  'ya en': 'already in',
  'No hay que ejecutar nada.': 'Nothing to run.',
  'En marcha': 'Running',
  'Saltar a un estado': 'Jump to a state',
  'Ahora': 'Now',
  'Ajustado a la ventana': 'Fitted to the window',
  'Volver a ajustar a la ventana': 'Fit to the window again',
  'Índice': 'Index',
  'Variables': 'Variables',
  'Estados': 'States',
  'Estás en': 'You are in',
  'Documentación': 'Documentation',
  'Bloque nuevo': 'New block',
  'Aún no hay nada. Empieza por una receta o escribe en el editor.': 'Nothing yet. Start with a recipe or type in the editor.',
  'Revisa este pin:': 'Check this pin:',
  'Revisa estos pines:': 'Check these pins:',
  'sin pines': 'no pins',
  'pin libre': 'free pin',
  'aviso': 'warning',
  'avisos': 'warnings',
  'Estás configurando el enlace entre los nodos': 'You are setting up the link between the nodes',
  'Estás configurando el nodo': 'You are setting up the node',
  'Nodo de control': 'Control node',
  'si te quedas sin pines': 'if you run out of pins',
  'El enlace entre los nodos': 'The link between the nodes',
  'Tipo de enlace': 'Link type',
  'Estás en el enlace entre los nodos. La pantalla de abajo es solo de referencia.': 'You are on the link between the nodes. The screen below is only for reference.',
  'Estás en el nodo': 'You are on the node',
  'Este nodo no tiene pantalla: la de abajo es la del nodo Pantalla, solo de referencia.': 'This node has no screen: the one below belongs to the Screen node, only for reference.',
  'Conectado': 'Connected',
  'Antes de cablear': 'Before wiring',
  'Por lo que has conectado': 'Because of what you connected',
  'Herramientas del IDE': 'IDE tools',
  'Quitar el nodo': 'Remove the node',
  'Configurar el enlace': 'Set up the link',
  'Tema': 'Theme',
  'Paleta': 'Palette',
  'Botones': 'Buttons',
  'Para exportar': 'For export',
  'fuentes': 'fonts',
  'Toca una parte para ver su color': 'Tap a part to see its colour',
  'Retocado a partir de': 'Tweaked from',
  'Valen para todo el proyecto. Para cambiar un solo widget, selecciónalo en el lienzo.': 'They apply to the whole project. To change a single widget, select it on the canvas.',
  'PRINCIPAL': 'MAIN',
  'LISTO': 'READY',
  'TENSIÓN': 'VOLTAGE',
  'SUBE': 'RISING',
  'FALLO': 'FAULT',
  'Marcha': 'Start',
  'Cambiar placa': 'Change board',
  'La placa de la pantalla se elige en Diseño › Proyecto': 'The display board is chosen in Design › Project',
  'Ver más': 'Show more',
  'Ver menos': 'Show less',
  'Detalles': 'Details',
  'Verificada en placa': 'Verified on the board',
  'Sin verificar': 'Not verified',
  'Pines libres': 'Free pins',
  'Viajan por el enlace': 'Travel over the link',
  'Arrástralo al lienzo, o haz clic para ponerlo en el centro.': 'Drag it onto the canvas, or click to place it in the centre.',
  'Buscar widget…': 'Search widget…',
  'Ningún widget se llama así.': 'No widget is called that.',
  'Capas': 'Layers',
  'Plantillas': 'Templates',
  'El de arriba se dibuja encima. Clic para seleccionar; Ctrl+clic añade o quita.': 'The top one is drawn on top. Click to select; Ctrl+click adds or removes.',
  'Esta pantalla todavía está vacía: añade un widget arriba.': 'This screen is still empty: add a widget above.',
  'Alinear con': 'Align with',
  'Alinear, repartir y colorear juntos': 'Align, distribute and colour together',
  'Propiedades': 'Properties',
  'nada seleccionado': 'nothing selected',
  'Hay cambios sin guardar': 'There are unsaved changes',
  'Guardado a las': 'Saved at',
  'Guardar el proyecto': 'Save the project',
  'Descargado como': 'Downloaded as',
  'está en tu carpeta de Descargas.': 'it is in your Downloads folder.',
  'No se guardó: cerraste la ventana sin elegir dónde.': 'Not saved: you closed the window without choosing where.',
  'Guardado': 'Saved',
  'No se pudo guardar': 'Could not save',
  'Abierto': 'Opened',
  'Si abres otro proyecto, los cambios de': 'If you open another project, the changes to',
  'se perderán.': 'will be lost.',
  'Abrir sin guardar': 'Open without saving',
  'Guardar y abrir': 'Save and open',
  'Falló al escribir': 'It failed while writing',
  'Chrome dice que esa carpeta cambió en el disco desde que la elegiste, y no se fía de escribir en ella. Pasa cuando:': 'Chrome says that folder changed on disk since you chose it, and will not trust writing into it. It happens when:',
  'la carpeta, o una de dentro, se movió, se renombró o se borró después de elegirla;': 'the folder, or one inside it, was moved, renamed or deleted after choosing it;',
  'la está sincronizando OneDrive (Imágenes, Música y Documentos suelen estarlo);': 'OneDrive is syncing it (Pictures, Music and Documents usually are);',
  'el IDE de Arduino tiene abierto el proyecto y guarda a la vez.': 'the Arduino IDE has the project open and saves at the same time.',
  'Cierra el proyecto en el IDE y elige la carpeta de nuevo:': 'Close the project in the IDE and choose the folder again:',
  'así Chrome la vuelve a leer. Ya lo reintenté dos veces.': 'that way Chrome reads it again. I already retried twice.',
  'Elegir la carpeta de nuevo': 'Choose the folder again',
  'Esa carpeta ya es la del proyecto: se pondrá al día tal cual.': 'That folder already is the project folder: it will be updated as it is.',
  'con todo el proyecto dentro.': 'with the whole project inside.',
  'Elige la carpeta donde guardas tus proyectos (por ejemplo': 'Choose the folder where you keep your projects (for example',
  'Chrome no deja elegir Documentos entero (ni el Escritorio ni Descargas). Si quieres el proyecto en': 'Chrome does not allow choosing the whole Documents folder (nor the Desktop or Downloads). If you want the project in',
  'crea ahí esa carpeta con': 'create that folder there with',
  'y elígela: se guarda directo en ella.': 'and choose it: it is saved straight into it.',
  'Nueva carpeta': 'New folder',
  'pulsación larga': 'long press',
  'Volver a su start': 'Back to its start',
  'Clic para cambiarla': 'Click to change it',
  'sí': 'yes',
  'pieza de Hardware': 'Hardware part',
  'una cuenta: + - * / y paréntesis': 'a calculation: + - * / and brackets',
  'Detrás de': 'After',
  'pantalla': 'screen',
  'evento': 'event',
  '(lo atiende tu reglas.cpp: aquí no hace nada)': '(your reglas.cpp handles it: nothing happens here)',
  'La lógica tiene {n} error: se simula la pantalla sin ella. Arréglala en la pestaña <b>Lógica</b> y vuelve a simular.': 'The logic has {n} error: the screen is simulated without it. Fix it in the <b>Logic</b> tab and simulate again.',
  'La lógica tiene {n} errores: se simula la pantalla sin ella. Arréglala en la pestaña <b>Lógica</b> y vuelve a simular.': 'The logic has {n} errors: the screen is simulated without it. Fix it in the <b>Logic</b> tab and simulate again.',
  'Estado': 'State',
  'lógica': 'logic',
  'Elegir un estado aquí salta a él, con su <b>on enter</b>: sirve para ver cómo se ve cada estado sin tener que provocarlo.': 'Picking a state here jumps to it, running its <b>on enter</b>: handy to see how each state looks without having to cause it.',
  'Sin lógica: cada botón hace lo que diga su panel (una orden, cambiar de pantalla o un evento).': 'No logic: each button does what its panel says (an order, a screen change or an event).',
  'Reloj': 'Clock',
  'Acelera los temporizadores: con ×20, 60 segundos pasan en 3.': 'Speeds up the timers: at ×20, 60 seconds pass in 3.',
  'Entradas · lo que mide el hardware': 'Inputs · what the hardware measures',
  'activa': 'active',
  'Bajar {n} · mantén pulsado para ir rápido': 'Down {n} · hold to go faster',
  'Subir {n} · mantén pulsado para ir rápido': 'Up {n} · hold to go faster',
  'Escribe un valor entre {a} y {b}': 'Type a value between {a} and {b}',
  'No hay entradas en la pestaña Hardware.': 'There are no inputs in the Hardware tab.',
  'planta': 'plant',
  'Manual: tú pones los valores': 'Manual: you set the values',
  'Motor: sigue a las salidas': 'Motor: follows the outputs',
  'Onda: se mueven solas': 'Wave: they move on their own',
  'mueve': 'moves',
  'con': 'with',
  'sentido': 'direction',
  'siempre sube': 'always up',
  'velocidad': 'speed',
  'La velocidad es con la salida al máximo: a la mitad, va a la mitad. El sentido: ON sube, OFF baja. Con la salida en 0 se queda quieto.': 'The speed is with the output at maximum: at half, it goes half as fast. Direction: ON goes up, OFF goes down. With the output at 0 it stays still.',
  'Ahora:': 'Now:',
  'quieto': 'still',
  '▲ sube': '▲ rising',
  '▼ baja': '▼ falling',
  'Enlace con el otro nodo': 'Link to the other node',
  'Enlace caído': 'Link down',
  'Lo que mide el otro nodo pasa a «--» y se queda en su último valor; sus salidas dejan de recibir órdenes.': 'What the other node measures shows «--» and holds its last value; its outputs stop receiving orders.',
  'Salidas': 'Outputs',
  'Variables de la lógica': 'Logic variables',
  'contando': 'counting',
  'Los ajustes (<b>setting</b>) se cambian aquí en cualquier momento, de a un <b>step</b>. En la pantalla, sus botones − + solo los cambian donde diga la lógica.': 'Settings (<b>setting</b>) can be changed here at any time, one <b>step</b> at a time. On the screen, their − + buttons only change them where the logic says.',
  'Registro': 'Log',
  '(forzado desde el banco)': '(forced from the bench)',
  '(desde el banco)': '(from the bench)',
  'enlace caído': 'link down',
  'enlace recuperado': 'link restored',
  'está en el otro nodo': 'it is on the other node',
  '⇄ no le llega': '⇄ not reaching it',
  'No hay salidas en la pestaña Hardware.': 'There are no outputs in the Hardware tab.',
  'Tira de estado': 'State strip',
  'Estos son los pines de la consola: con el enlace puesto te quedas sin monitor serie por USB.': 'These are the console pins: with the link in place you lose the serial monitor over USB.',

  /* ---------- placas AVR (UNO/Nano) ---------- */
  'Cómo se enlaza con la pantalla': 'How it links to the screen',
  'Dos pines libres (SoftwareSerial)': 'Two free pins (SoftwareSerial)',
  'El puerto del USB (D0/D1)': 'The USB serial port (D0/D1)',
  'El puerto de verdad: más rápido y fiable. Mientras esté cableado no hay monitor serie, y para programar la placa hay que desconectarlo.': 'The real port: faster and more reliable. While it is wired there is no serial monitor, and you have to unplug it to program the board.',
  'El USB queda libre para el monitor. El puerto lo hace el micro por software: hasta 38400 baudios va bien, más arriba pierde caracteres.': 'USB stays free for the monitor. The port is done by the chip in software: up to 38400 baud it is fine, above that it drops characters.',
  'En una placa AVR (UNO/Nano) esto no existe o necesitaría código que Telar todavía no escribe para esta familia. Lo que sí sabe hacer aquí: entradas analógicas, entradas y salidas digitales y salidas PWM.': 'On an AVR board (UNO/Nano) this does not exist, or it would need code Telar does not write for this family yet. What it does know here: analog inputs, digital inputs and outputs, and PWM outputs.',
  'Una placa AVR no tiene radio ni CAN. Para hablar con la pantalla, elige Serie directo (UART) o RS485.': 'An AVR board has no radio and no CAN. To talk to the screen, choose Direct serial (UART) or RS485.',
  'El puerto serie de verdad de la placa, el mismo del USB.': 'The board\'s real serial port, the same one as USB.',
  'Mientras el enlace esté cableado no hay monitor serie, y para programar la placa hay que desconectarlo.': 'While the link is wired there is no serial monitor, and you have to unplug it to program the board.',
  'Puerto serie por software (SoftwareSerial) en dos pines libres: el USB se queda libre para el monitor.': 'Software serial port (SoftwareSerial) on two free pins: USB stays free for the monitor.',
  'Por software, más de 38400 baudios pierde caracteres. Baja la velocidad del enlace o usa el puerto del USB.': 'In software, above 38400 baud it drops characters. Lower the link speed or use the USB port.',
  'Entrada analógica de la placa. El convertidor es de 10 bits: 0 a 1023, no 0 a 4095.': 'Analog input of the board. The converter is 10-bit: 0 to 1023, not 0 to 4095.',
  'Uno de los seis pines con PWM de la placa:': 'One of the six PWM pins on the board:',
  'En AVR el PWM es de 8 bits y a frecuencia fija: la frecuencia y la resolución que pongas en la pieza aquí no se usan.': 'On AVR the PWM is 8-bit at a fixed frequency: the frequency and resolution you set on the part are not used here.',
  'No queda libre ninguno de los pines con PWM:': 'None of the PWM pins is free:',
  'Hay cosas que una placa AVR (UNO/Nano) no puede hacer:': 'There are things an AVR board (UNO/Nano) cannot do:',
  'Esa placa no tiene radio ni CAN, y Telar todavía no escribe sus buses. Lo que sí sabe: entradas analógicas, entradas y salidas digitales, salidas PWM y el enlace serie (UART o RS485).': 'That board has no radio and no CAN, and Telar does not write its buses yet. What it does know: analog inputs, digital inputs and outputs, PWM outputs and the serial link (UART or RS485).',
  'Quita esas piezas, o pon un ESP32 en ese nodo.': 'Remove those parts, or put an ESP32 on that node.',
  'el enlace': 'the link',
  'Remapeado: los 16/17 de fabrica los usa la PSRAM en esta placa.': 'Remapped: the factory 16/17 are used by the PSRAM on this board.',
  'La unica UART que sale a los pads es la de la consola. Para un enlace serie, cuenta con quedarte sin monitor.': 'The only UART that reaches the pads is the console one. For a serial link, expect to lose the monitor.',
  'La UART que sale a los pines es la de la consola: para un enlace serie, cuentas con perder el monitor.': 'The UART that reaches the pins is the console one: for a serial link, expect to lose the monitor.',
  'El S3 remapea las UART a casi cualquier pin; estos dos son los de los ejemplos.': 'The S3 remaps UARTs to almost any pin; these two are the ones used in the examples.',
  'Es una salida con valor (un PWM): se le da un valor con set, por ejemplo <b>set {x} to 21</b>.': 'It is an output with a value (a PWM): you give it a value with set, for example <b>set {x} to 21</b>.',
  'Elementos (uno por línea)': 'Items (one per line)',
  'Opciones (una por línea)': 'Options (one per line)',
  'Botones (una fila por línea, separados por espacios)': 'Buttons (one row per line, separated by spaces)',
  'Pestañas (una por línea)': 'Tabs (one per line)',
  'Celdas (una fila por línea, columnas con ";")': 'Cells (one row per line, columns with ";")',
  'Título en la primera línea, mensaje debajo': 'Title on the first line, message below',
  'Texto o enlace del QR': 'QR text or link',
  'El QR lo dibuja LVGL en la placa. Hay que encender <b>LV_USE_QRCODE</b> en lv_conf.h; si no, en su sitio sale un aviso que lo dice.': 'The QR is drawn by LVGL on the board. You have to turn on <b>LV_USE_QRCODE</b> in lv_conf.h; otherwise a notice saying so shows up in its place.',
  'Escribe en el campo': 'Types into the field',
  '— el primero de la pantalla —': '— the first one on the screen —',
  'El campo de texto tiene que estar <b>antes</b> que el teclado en la pantalla: los elementos nacen en orden.': 'The text field has to come <b>before</b> the keyboard on the screen: elements are created in order.',
  'No hay ningún Campo de texto en esta pantalla todavía: añade uno y el teclado escribirá en él.': 'There is no Text field on this screen yet: add one and the keyboard will type into it.',
  'guardado en la memoria': 'saved to memory',
  'cargado de la memoria': 'loaded from memory',
  'no hay nada guardado todavía': 'nothing saved yet',
  'Memoria (NVS)': 'Memory (NVS)',
  'Borrar la memoria': 'Erase memory',
  'memoria borrada': 'memory erased',
  'Lo guardado con <b>save</b> sobrevive a <b>Reiniciar</b>, como en la placa al apagarla. Borrar la memoria es como estrenar una placa nueva.': 'What is saved with <b>save</b> survives <b>Restart</b>, like on the board when it is powered off. Erasing the memory is like a brand-new board.',
  'Vacía: todavía no se guardó nada.': 'Empty: nothing has been saved yet.',
  'Este botón ya tiene lógica (<b>buttons:</b> en la pestaña <b>Lógica</b>), y cuando la tiene, <b>manda la lógica</b>: esta orden no se usa. Pon la acción en la lógica, por ejemplo <b>set {salida} to …</b>, o quita el botón de <b>buttons:</b>.': 'This button already has logic (<b>buttons:</b> in the <b>Logic</b> tab), and when it does, <b>the logic wins</b>: this order is not used. Put the action in the logic, for example <b>set {salida} to …</b>, or remove the button from <b>buttons:</b>.',
  'La lógica tiene errores, así que sus variables (<b>setting</b> y <b>timer</b>) todavía no aparecen aquí. Arréglalos en la pestaña <b>Lógica</b> y vuelve.': 'The logic has errors, so its variables (<b>setting</b> and <b>timer</b>) do not show up here yet. Fix them in the <b>Logic</b> tab and come back.',
};

/* =====================================================================
 * PROSA
 *
 * Los párrafos largos de ayuda no caben como clave: son varias frases con
 * <b> dentro, y usarlos de clave haría el código ilegible. Estos sí llevan
 * un identificador, y por eso guardan también el español: t() los busca
 * aquí primero y nunca cae al identificador crudo.
 * ================================================================== */

const PROSA = {
  'ayuda:refresco': {
    es: `Cada cuánto se repintan los valores, y es un <b>compromiso con dos lados</b>.<br><br>
      Más rápido se siente más pegado al mando. Pero el panel de esta placa se dibuja
      directamente sobre la imagen que está mostrando, así que cada repintado puede dejar
      una costura visible: a 20 o 30 por segundo eso se convierte en un <b>parpadeo
      molesto</b>, como si la pantalla fuera a fallar.<br><br>
      Si va lento, mira antes el <b>Suavizado</b> del sensor en Hardware: sin él el último
      decimal baila y el número se repinta aunque no pase nada.`,
    en: `How often the values are repainted. It is a <b>trade-off with two sides</b>.<br><br>
      Faster feels closer to the knob. But this board's panel draws straight onto the image
      it is already showing, so every repaint can leave a visible seam: at 20 or 30 per
      second that turns into an <b>annoying flicker</b>, as if the screen were about to
      fail.<br><br>
      If it feels sluggish, check the sensor's <b>Smoothing</b> in Hardware first: without
      it the last decimal dances and the number repaints even when nothing is happening.`,
  },
  'ayuda:seleccion': {
    es: `Pulsa un widget del lienzo para editarlo. Se arrastra para moverlo y se redimensiona
      desde cualquiera de los ocho tiradores.
      <br><br><b>Doble clic</b> edita el texto ahí mismo &nbsp;·&nbsp; <b>botón derecho</b> abre su paleta
      <br><b>Ctrl+clic</b> selecciona varios &nbsp;·&nbsp; <b>arrastrar sobre el fondo</b> los encierra
      <br><b>Ctrl+A</b> todos &nbsp;·&nbsp; <b>Ctrl+C / Ctrl+V</b> copiar y pegar &nbsp;·&nbsp; <b>Ctrl+D</b> duplicar
      <br><b>flechas</b> mover 4 px (<b>Mayús</b> 1 px) &nbsp;·&nbsp; <b>Supr</b> borrar
      <br><b>Ctrl+Z</b> deshacer &nbsp;·&nbsp; <b>Ctrl+Y</b> rehacer`,
    en: `Tap a widget on the canvas to edit it. Drag to move it, and resize it from any of the
      eight handles.
      <br><br><b>Double click</b> edits the text in place &nbsp;·&nbsp; <b>right click</b> opens its palette
      <br><b>Ctrl+click</b> selects several &nbsp;·&nbsp; <b>drag on the background</b> encloses them
      <br><b>Ctrl+A</b> all &nbsp;·&nbsp; <b>Ctrl+C / Ctrl+V</b> copy and paste &nbsp;·&nbsp; <b>Ctrl+D</b> duplicate
      <br><b>arrows</b> move 4 px (<b>Shift</b> 1 px) &nbsp;·&nbsp; <b>Del</b> delete
      <br><b>Ctrl+Z</b> undo &nbsp;·&nbsp; <b>Ctrl+Y</b> redo`,
  },
  'enlace:i2c': {
    es: "<b>¿Y el I2C?</b> No está aquí a propósito. En la {placa} el bus I2C ya lo usan el táctil, el expansor y el reloj: si el otro nodo se cuelga ahí, <b>se lleva el táctil por delante</b> y el síntoma aparece lejísimos de la causa. Además llega a decenas de centímetros, no a metros, y no aguanta ruido. Para dos placas juntas en la misma caja, el <b>Serie directo (UART)</b> hace lo mismo con menos cosas que fallar. El I2C sí está, como <b>Conexión</b>, para colgar sensores de un nodo.",
    en: "<b>What about I2C?</b> It is missing on purpose. On the {placa} the I2C bus is already taken by the touch panel, the expander and the clock: if the other node hangs on it, <b>it takes the touch panel down with it</b> and the symptom shows up miles from the cause. It also reaches tens of centimetres, not metres, and does not tolerate noise. For two boards sitting in the same box, <b>Direct serial (UART)</b> does the same job with fewer things to go wrong. I2C is there, as a <b>Connection</b>, for hanging sensors off one node.",
  },
  'enlace:protocolo': {
    es: "El generador escribe el protocolo en los dos lados: la pantalla pregunta y el nodo de control contesta (nunca hablan a la vez), tramas con checksum que se repiten si se pierden, pulsos de botón que no se pierden, aviso de enlace caído y, si se pierde la pantalla, las salidas vuelven solas a su valor seguro.",
    en: "The generator writes the protocol on both sides: the screen asks and the control node answers (they never talk at once), frames with a checksum that are repeated if lost, button pulses that are never lost, a link-down warning and, if the screen is lost, the outputs return to their safe value on their own.",
  },
  'enlace:vacio': {
    es: "Todavía no hay nada que enviar. Añade hardware al nodo de control y sus variables viajarán solas hasta la pantalla.",
    en: "There is nothing to send yet. Add hardware to the control node and its variables will travel to the screen on their own.",
  },
  'bind:remota': {
    es: `Esta variable vive en el nodo <b>{nodo}</b>. Viajará por el enlace; el generador se
      encarga. Si el enlace se cae, este widget muestra <b>--</b> en vez de quedarse con el
      último valor.`,
    en: `This variable lives on node <b>{nodo}</b>. It will travel over the link; the generator
      takes care of that. If the link goes down, this widget shows <b>--</b> instead of holding
      the last value.`,
  },
  'estilo:hereda': {
    es: `sin tocar nada hereda del tema. También sale con el <b>botón derecho</b> sobre el widget.`,
    en: `touch nothing and it inherits from the theme. It also comes up with a <b>right click</b>
      on the widget.`,
  },
  'estilo:montserrat': {
    es: `LVGL sólo trae <b>Montserrat</b> de serie, y sólo con <b>ASCII</b> más <b>°</b> y
      <b>•</b>. Sin tildes ni eñes: la placa las pinta como □. Para tenerlas hay que convertir
      una fuente propia a .c y añadirla al proyecto.`,
    en: `LVGL only ships <b>Montserrat</b>, and only with <b>ASCII</b> plus <b>°</b> and
      <b>•</b>. No accents: the board paints them as □. To get them you have to convert your own
      font to .c and add it to the project.`,
  },
  'estilo:lvconf': {
    es: `<b>Activar en lv_conf.h.</b> Estos tamaños los trae LVGL, pero hay que habilitarlos a
      mano o el sketch no compila, con un error que ni menciona la fuente:`,
    en: `<b>Enable these in lv_conf.h.</b> LVGL ships these sizes, but you have to turn them on
      by hand or the sketch will not compile, with an error that does not even mention the font:`,
  },
  'conectar:regla': {
    es: `Buses y pines. Dices <b>cómo se conecta</b> —un bus I2C, una entrada analógica, una
      salida digital— y la herramienta resuelve pines, avisos y código. El <b>qué</b> conectes
      ahí es cosa tuya: la herramienta no se casa con ninguna referencia.`,
    en: `Buses and pins. You say <b>how it connects</b> — an I2C bus, an analog input, a digital
      output — and the tool works out pins, warnings and code. <b>What</b> you connect there is
      up to you: the tool does not tie itself to any particular part.`,
  },
  'manif:intro': {
    es: `La <b>única fuente de verdad</b>. El lienzo, el hardware y todo lo que se exporte
      salen de aquí, y por eso no pueden contradecirse.`,
    en: `The <b>single source of truth</b>. The canvas, the hardware and everything you export
      all come from here, which is why they cannot contradict each other.`,
  },
};

const IDIOMA = { actual: 'es' };

try {
  const g = localStorage.getItem('telar_idioma');
  if (g && IDIOMAS[g]) IDIOMA.actual = g;
} catch (e) { /* navegador sin almacenamiento: se queda en español */ }

/* Traduce. Si no hay entrada, devuelve el español: se ve que falta, pero
   la interfaz sigue siendo usable. */
function t(es){
  const pr = PROSA[es];
  if (pr) return pr[IDIOMA.actual] ?? pr.es;
  if (IDIOMA.actual === 'es') return es;
  return EN[es] ?? es;
}

function cambiarIdioma(cod){
  if (!IDIOMAS[cod]) return;
  IDIOMA.actual = cod;
  try { localStorage.setItem('telar_idioma', cod); } catch (e) {}
}
