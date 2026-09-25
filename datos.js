

/* =====================================================================
 * Telar Studio — catalogos
 *
 * Este fichero es DATO, no codigo. Anadir una placa o un periferico es
 * anadir una entrada aqui; no se toca ni una linea del editor.
 *
 * Los perfiles de placa salen de ~/.claude/skills/telar/references/profiles/.
 * La columna `procedencia` dice cuanto te puedes fiar de cada uno:
 *   verificado  - comprobado sobre la placa real, con proyecto funcionando
 *   comunidad   - documentado por terceros, sin verificar en banco
 * ===================================================================== */

/* ---------------------------------------------------------------------
 * PLACAS
 *
 * `pines` mapea numero de GPIO -> por que esta ocupado. Lo que no
 * aparece esta libre. `trampa: true` marca los que PARECEN libres y no
 * lo estan: son los que cuestan tardes de depuracion.
 * ------------------------------------------------------------------- */
const PLACAS = {

  'waveshare-esp32s3-touch-lcd-4.3b': {
    nombre: 'Waveshare ESP32-S3-Touch-LCD-4.3B',
    corto: 'Waveshare 4.3B',
    procedencia: 'verificado',
    nota_procedencia: 'Comprobado en placa con dos proyectos: HMI del variac y monitor de clima.',
    mcu: 'ESP32-S3-WROOM-1-N16R8 · 16 MB flash · 8 MB PSRAM OPI',
    ancho: 800, alto: 480,
    panel: 'RGB565 paralelo de 800x480, 20 GPIO',
    tactil: 'GT911 capacitivo por I2C',
    fqbn: 'esp32:esp32:waveshare_esp32_s3_touch_lcd_43B',
    puerto_codigo: 'esp_panel',
    esp_panel_macro: 'BOARD_WAVESHARE_ESP32_S3_TOUCH_LCD_4_3_B',
    opciones_ide: { 'PSRAM': 'Enabled', 'Partition Scheme': 'Huge APP (3MB No OTA/1MB SPIFFS)' },
    nota_ide: 'En la lista de placas hay DOS bloques Waveshare. La 4.3B esta en el segundo, justo debajo de la "Touch-LCD-4.3" a secas. La B final importa: la variante sin B compila bien y deja la pantalla negra.',
    librerias: ['ESP32_Display_Panel >= 1.0.4', 'ESP32_IO_Expander >= 1.1', 'lvgl 9.x'],
    puerto: 'ESP32_Display_Panel + el port LVGL 9 de Telar',
    lv_mem: 131072,
    pila_loop: 8192,

    /* ADC1 del S3 = GPIO1..10. ADC2 = GPIO11..20 (inutil con WiFi). */
    adc1: [1,2,3,4,5,6,7,8,9,10],
    adc2: [11,12,13,14,15,16,17,18,19,20],
    solo_entrada: [],
    arranque: [0,45,46],

    pines: {
      0:'panel RGB', 1:'panel RGB', 2:'panel RGB', 3:'panel RGB', 5:'panel RGB',
      7:'panel RGB', 10:'panel RGB', 14:'panel RGB', 17:'panel RGB', 18:'panel RGB',
      21:'panel RGB', 38:'panel RGB', 39:'panel RGB', 40:'panel RGB', 41:'panel RGB',
      42:'panel RGB', 45:'panel RGB', 46:'panel RGB', 47:'panel RGB', 48:'panel RGB',
      8:'I2C SDA (tactil, expansor, reloj)', 9:'I2C SCL (tactil, expansor, reloj)',
      11:'microSD MOSI', 12:'microSD SCK', 13:'microSD MISO',
      15:'CAN TX', 16:'CAN RX',
      19:'USB D-', 20:'USB D+',
      43:'RS485 RX', 44:'RS485 TX',
      26:'flash/PSRAM', 27:'flash/PSRAM', 28:'flash/PSRAM', 29:'flash/PSRAM',
      30:'flash/PSRAM', 31:'flash/PSRAM', 32:'flash/PSRAM', 33:'flash/PSRAM',
      34:'flash/PSRAM', 35:'flash/PSRAM', 36:'flash/PSRAM', 37:'flash/PSRAM',
      4:'interrupcion del tactil'
    },
    /* MEDIDO EN PLACA (2026-09-12) con seis franjas de 000000 a 808080:
     *
     *   - El color es FIEL. El 3a3649 se ve azul grisaceo, que es lo que
     *     es; los grises se ven grises. No hay canales cambiados.
     *   - El negro puro sale gris oscuro. La retroiluminacion se filtra
     *     por el cristal. Se distingue de 111111, o sea que hay recorrido
     *     en los oscuros, pero el negro de verdad no existe.
     *   - Los tonos medios suben: un 808080 se ve casi blanco.
     *
     * Consecuencia de diseno: lo que pintes saldra mas claro de lo que
     * ves en el editor, y mas cuanto mas al medio este. El contraste
     * conviene buscarlo con el COLOR, no con la diferencia entre dos
     * oscuros que el panel no separa. */
    nota_panel: 'Medido en placa: el negro sale gris oscuro y los tonos medios '
              + 'suben bastante. El color es fiel. Busca el contraste con el color, '
              + 'no con la oscuridad.',

    trampas: {
      4: 'Parece libre y no lo está. Si lo usas, inundas la interrupción del táctil: los botones dejan de responder Y el panel RGB parpadea por falta de ancho de banda.',
      43: 'Es además el TXD de fábrica del UART0, y el core lo arranca aunque la consola vaya por USB. Hay que soltar el UART0 y forzar el pin a entrada, o no llega ni un bit.',
      44: 'Es además el RXD de fábrica del UART0. Ver la nota del 43.'
    },
    libres: [6],
    nota_libres: 'Un único GPIO libre de 48. Todo lo que añadas compite por él.',

    bus_i2c: { sda: 8, scl: 9, existe: true,
               nota: 'El bus ya existe para el táctil. Un sensor I2C no cuesta ningún pin.' },

    expansor: {
      chip: 'CH422G',
      salidas: [ {id:'OD0', desc:'salida aislada 5-36 V, 450 mA'},
                 {id:'OD1', desc:'salida aislada 5-36 V, 450 mA'} ],
      entradas: [ {id:'EXIO0', desc:'entrada aislada DI0'},
                  {id:'EXIO5', desc:'entrada aislada DI1'} ],
      aviso_entradas: 'El registro de dirección del CH422G es GLOBAL, no por pin. La placa lo deja en salida para manejar retroiluminación y resets; leer DI0/DI1 obliga a cambiarlo entero y se pierde ese control.'
    },

    rutas_escape: [
      'Salidas aisladas OD0/OD1 del expansor, en los bornes verdes. No cuestan ningún GPIO.',
      'Un expansor I2C más sobre el bus que ya existe (GPIO8/9).',
      'Un segundo nodo por RS485 (bornes A/B) o por CAN (bornes H/L).'
    ],

    quirks: [
      'El CH422G tiene la dirección global: nunca llames a pinMode() sobre el expansor después del arranque. digitalWrite solo es seguro.',
      'El bus I2C 0 lo instala ESP32_Display_Panel con el driver legacy. No hagas Wire.begin() en 8/9: un segundo driver en el puerto falla y mata el táctil.',
      'El chip select de la microSD es el EXIO4 del expansor, no un GPIO.'
    ]
  },

  'elecrow-crowpanel-7': {
    nombre: 'Elecrow CrowPanel 7" (ESP32-S3)',
    corto: 'CrowPanel 7"',
    procedencia: 'comunidad',
    nota_procedencia: 'Los pines salen del fichero de placa de ESP32_Display_Panel (BOARD_ELECROW_CROWPANEL_7_0.h), que es donde los pone el fabricante de la libreria. Los que quedan libres NO estan verificados en banco: mira el esquematico de Elecrow antes de soldar.',
    mcu: 'ESP32-S3-WROOM-1 N4R8 · 4 MB flash · 8 MB PSRAM octal',
    ancho: 800, alto: 480,
    panel: 'RGB de 800x480, 16 bits de datos',
    tactil: 'GT911 capacitivo, por I2C',
    fqbn: 'esp32:esp32:esp32s3',
    puerto_codigo: 'esp_panel',
    esp_panel_macro: 'BOARD_ELECROW_CROWPANEL_7_0',
    opciones_ide: { 'PSRAM': 'OPI PSRAM', 'Flash Size': '4MB (32Mb)', 'Partition Scheme': 'Huge APP (3MB No OTA/1MB SPIFFS)' },
    nota_ide: 'La PSRAM es OBLIGATORIA: un panel RGB de 800x480 necesita 768 KB de bufer y en la RAM interna no cabe. Si el IDE la trae en Disabled, la placa se reinicia sin parar.',
    librerias: ['ESP32_Display_Panel 1.0.x', 'lvgl 9.x'],
    puerto: 'ESP32_Display_Panel: la placa viene descrita dentro de la libreria',
    lv_mem: 49152,
    pila_loop: 8192,

    adc1: [1,2,3,4,5,6,7,8,9,10],
    adc2: [11,12,13,14,15,16,17,18,19,20],
    solo_entrada: [],
    arranque: [0,3,45,46],

    pines: {
      0:'panel RGB (PCLK)', 1:'panel RGB', 3:'panel RGB', 4:'panel RGB', 5:'panel RGB',
      6:'panel RGB', 7:'panel RGB', 8:'panel RGB', 9:'panel RGB', 14:'panel RGB',
      15:'panel RGB', 16:'panel RGB', 21:'panel RGB', 39:'panel RGB (HSYNC)',
      40:'panel RGB (VSYNC)', 41:'panel RGB (DE)', 45:'panel RGB', 46:'panel RGB',
      47:'panel RGB', 48:'panel RGB',
      2:'retroiluminacion',
      19:'I2C SDA (tactil y expansor)', 20:'I2C SCL (tactil y expansor)', 38:'interrupcion del tactil',
      10:'microSD CS', 11:'microSD MOSI', 12:'microSD SCK', 13:'microSD MISO',
      26:'flash/PSRAM', 27:'flash/PSRAM', 28:'flash/PSRAM', 29:'flash/PSRAM',
      30:'flash/PSRAM', 31:'flash/PSRAM', 32:'flash/PSRAM', 33:'PSRAM octal',
      34:'PSRAM octal', 35:'PSRAM octal', 36:'PSRAM octal', 37:'PSRAM octal',
      43:'UART0 TX (consola)', 44:'UART0 RX (consola)'
    },
    trampas: {
      0:  'Pin de arranque Y reloj del panel. No lo toques.',
      38: 'Parece libre y no lo esta: es la interrupcion del tactil.',
      42: 'Sale al conector, pero tambien es una linea de JTAG. Vale como GPIO si no depuras por JTAG.'
    },
    libres: [17, 18, 42],
    nota_libres: 'Tres pines, y salen por los conectores de expansion. Los cuatro de la microSD (10..13) se recuperan si no usas la tarjeta.',
    recuperables: { 10:'microSD (CS)', 11:'microSD (MOSI)', 12:'microSD (SCK)', 13:'microSD (MISO)' },

    bus_i2c: { sda: 19, scl: 20, existe: true,
               nota: 'El bus ya existe para el tactil y el expansor. Un sensor I2C no cuesta ningun pin.' },
    uart2: { rx: 18, tx: 17, puerto: 'Serial1',
             nota: 'El S3 remapea las UART: se usan los dos pines de expansion para no tocar la consola.' },
    expansor: null,
    rutas_escape: [
      'Un sensor I2C sobre el bus que ya existe (GPIO19/20): no cuesta pines.',
      'Recuperar los cuatro de la microSD si no la usas.',
      'Un segundo nodo por UART o por ESP-NOW.'
    ],
    quirks: [
      'Panel RGB: el bufer vive en la PSRAM. Sin PSRAM no arranca.',
      'El tactil y el expansor comparten el I2C con lo que tu anadas: usa Wire con cuidado y no reinicies el bus.',
      'Quedan pocos GPIO sueltos. Si el proyecto necesita entradas, cuenta con un segundo nodo o con un expansor.'
    ]
  },

  'esp32-2432s028r': {
    nombre: 'ESP32-2432S028R · "Cheap Yellow Display"',
    corto: 'CYD 2.8"',
    procedencia: 'comunidad',
    nota_procedencia: 'Los pines vienen de documentación de terceros, no verificados en banco. Confírmalos contra el esquemático antes de soldar nada.',
    mcu: 'ESP32-WROOM-32 · 4 MB flash · sin PSRAM',
    ancho: 320, alto: 240,
    panel: 'ILI9341 de 320x240 por SPI',
    tactil: 'XPT2046 resistivo, en su propio bus SPI',
    fqbn: 'esp32:esp32:jczn_2432s028r',
    puerto_codigo: 'lovyan',

    /* La descripcion de la pantalla, que es lo que el generador escribe
       en pantalla.h. Antes esta placa se podia elegir en el catalogo y
       el codigo que salia era el de la Waveshare: no arrancaba. */
    lgfx: {
      controlador: 'ILI9341',
      ancho_panel: 240, alto_panel: 320,   /* el panel, antes de rotar */
      rotacion: 1,                          /* 1 = apaisado, 320x240 */
      spi: { host:'SPI2_HOST', sck:14, mosi:13, miso:12, dc:2, cs:15, rst:-1,
             freq:40000000, freq_lectura:16000000, modo:0 },
      invertir: false, orden_rgb: false, bus_compartido: false,
      luz: { pin:21, invertida:false, canal:7, freq:44100 },
      /* El tactil va en SU PROPIO bus SPI, no en el de la pantalla: por
         eso lleva host aparte. Los cuatro numeros de calibracion son los
         de la comunidad; si el dedo cae desplazado, se retocan aqui. */
      tactil: { controlador:'XPT2046', host:'SPI3_HOST', sck:25, mosi:32, miso:39,
                cs:33, irq:36, freq:1000000, rotacion:0,
                x_min:300, x_max:3900, y_min:200, y_max:3700 }
    },
    opciones_ide: { 'Partition Scheme': 'Huge APP (3MB No OTA/1MB SPIFFS)' },
    nota_ide: 'En el core 3.x la placa se llama "ESP32-2432S028R CYD". El nombre cambia entre versiones del core: si no la ves, cualquier "ESP32 Dev Module" con 4 MB tambien vale.',
    librerias: ['TFT_eSPI o LovyanGFX', 'XPT2046_Touchscreen', 'lvgl 9.x'],
    puerto: 'TFT_eSPI + flush propio (no lleva ESP32_Display_Panel)',
    lv_mem: 49152,
    pila_loop: 8192,

    /* ADC1 del ESP32 clasico = GPIO32..39. ADC2 = 0,2,4,12..15,25..27. */
    adc1: [32,33,34,35,36,37,38,39],
    adc2: [0,2,4,12,13,14,15,25,26,27],
    solo_entrada: [34,35,36,39],
    arranque: [0,2,12,15],

    pines: {
      13:'pantalla SPI MOSI', 12:'pantalla SPI MISO', 14:'pantalla SPI SCK',
      15:'pantalla SPI CS', 2:'pantalla DC', 21:'retroiluminación',
      25:'táctil SPI CLK', 32:'táctil SPI MOSI', 39:'táctil SPI MISO',
      33:'táctil SPI CS', 36:'táctil IRQ',
      23:'microSD MOSI', 19:'microSD MISO', 18:'microSD SCK', 5:'microSD CS',
      4:'LED RGB de placa (rojo)', 16:'LED RGB de placa (verde)', 17:'LED RGB de placa (azul)',
      34:'LDR de placa (sensor de luz)',
      26:'altavoz'
    },
    trampas: {
      0:  'Pin de arranque. Si lo pones a masa al encender, la placa entra en modo carga y no arranca el programa.',
      12: 'Pin de arranque Y MOSI de la pantalla. Nivel alto al arrancar y la placa no enciende.',
      35: 'Sólo entrada. No tiene driver de salida: sirve para leer, nunca para encender nada.'
    },
    libres: [22, 27, 35],
    nota_libres: 'Salen por los conectores P3 y CN1. El 35 es sólo entrada. Los tres del LED RGB (4/16/17) se recuperan si no usas el LED.',
    recuperables: { 4:'LED rojo de placa', 16:'LED verde de placa', 17:'LED azul de placa', 34:'LDR de placa' },

    bus_i2c: { sda: 27, scl: 22, existe: false,
               nota: 'No hay bus I2C de fábrica. Se monta sobre los dos pines libres, y a partir de ahí los sensores I2C salen gratis.' },

    expansor: null,

    rutas_escape: [
      'Un expansor I2C (PCF8574) sobre los pines libres 22/27: ocho E/S más por dos pines.',
      'Recuperar los tres pines del LED RGB de placa (4/16/17) si no lo usas.',
      'Un segundo nodo por UART.'
    ],

    quirks: [
      'Sin PSRAM: los búferes de LVGL tienen que ser pequeños (modo parcial, ~1/10 de pantalla) y LV_MEM_SIZE modesto.',
      'El táctil vive en un SPI aparte. No lo juntes con el bus de la pantalla.',
      'Los pines 34-39 del ESP32 clásico son sólo entrada: nunca valen para una salida.'
    ]
  }
};

/* ---------------------------------------------------------------------
 * PLACA SIN PANTALLA
 *
 * El "nodo B": una placa normal y corriente que hace el trabajo sucio
 * (leer sensores, mover motores) y le manda los datos a la pantalla.
 * Existe porque las placas con pantalla RGB no dejan pines libres.
 * ------------------------------------------------------------------- */
PLACAS['esp32-devkit-v1'] = {
  nombre: 'ESP32 DevKit v1 (WROOM-32)',
  corto: 'DevKit v1',
  procedencia: 'verificado',
  nota_procedencia: 'La placa de desarrollo de siempre. Pines bien conocidos.',
  mcu: 'ESP32-WROOM-32 · 4 MB flash · sin PSRAM',
  sin_pantalla: true,
  ancho: 0, alto: 0,
  fqbn: 'esp32:esp32:esp32',
  opciones_ide: { 'Partition Scheme': 'Default 4MB with spiffs' },
  nota_ide: 'Sin pantalla no hay ajustes delicados. Basta con elegir el puerto correcto.',
  librerias: [],
  puerto: 'ninguno: esta placa no pinta nada',
  pila_loop: 8192,

  adc1: [32,33,34,35,36,39],
  adc2: [0,2,4,12,13,14,15,25,26,27],
  solo_entrada: [34,35,36,39],
  arranque: [0,2,12,15],

  pines: {
    1:'USB serie TX', 3:'USB serie RX',
    6:'flash interna', 7:'flash interna', 8:'flash interna',
    9:'flash interna', 10:'flash interna', 11:'flash interna'
  },
  trampas: {
    0:  'Pin de arranque. A masa al encender, la placa entra en modo carga y no arranca el programa.',
    12: 'Pin de arranque. Nivel alto al arrancar y la placa no enciende.',
    2:  'Pin de arranque, y va al LED de la placa. Suele funcionar, pero evítalo si puedes.',
    15: 'Pin de arranque. Genera ruido por el puerto serie al encender.',
    34: 'Sólo entrada, y sin resistencias internas: perfecto para un sensor, inútil como salida.',
    35: 'Sólo entrada, sin resistencias internas.',
    36: 'Sólo entrada, sin resistencias internas.',
    39: 'Sólo entrada, sin resistencias internas.'
  },
  libres: [4,5,13,14,16,17,18,19,21,22,23,25,26,27,32,33,34,35,36,39],
  nota_libres: 'Veinte pines disponibles. Aquí no te vas a quedar sin.',

  bus_i2c: { sda: 21, scl: 22, existe: false,
             nota: 'El I2C por defecto del ESP32 va en 21 y 22, pero cualquier par de pines vale.' },

  /* Los pines nativos del UART2. El ESP32 los puede remapear a casi
     cualquier sitio, pero todos los tutoriales, todos los modulos y
     todos los esquemas usan estos dos: si el alumno busca ayuda fuera,
     lo que encuentre va a coincidir con lo que tiene delante. */
  uart2: { rx: 16, tx: 17, puerto: 'Serial2',
           nota: 'Los pines de fabrica del Serial2 del ESP32.' },
  expansor: null,
  rutas_escape: ['Con veinte pines libres, difícilmente los necesites.'],
  quirks: ['Los pines 34 a 39 son sólo entrada: nunca valen para una salida.']
};

/* ---------------------------------------------------------------------
 * MAS PLACAS SIN PANTALLA
 *
 * Todas valen como nodo de control. Los pines salen de la documentacion
 * del fabricante, no de banco: por eso van como `comunidad` y la guia de
 * cableado lo dice. Confirmalos contra el esquematico antes de soldar.
 * ------------------------------------------------------------------- */
PLACAS['esp32-wrover'] = {
  nombre: 'ESP32-WROVER (DevKit con PSRAM)',
  corto: 'WROVER',
  procedencia: 'comunidad',
  nota_procedencia: 'Igual que la DevKit v1 salvo por la PSRAM, que se come dos pines. Confirma el 16 y el 17 en tu placa: en los modulos WROVER van a la PSRAM.',
  mcu: 'ESP32-WROVER-E · 4 MB flash · 8 MB PSRAM',
  sin_pantalla: true,
  ancho: 0, alto: 0,
  fqbn: 'esp32:esp32:esp32wrover',
  opciones_ide: { 'Partition Scheme': 'Default 4MB with spiffs', 'PSRAM': 'Enabled' },
  nota_ide: 'En la lista es "ESP32 Wrover Module". Si eliges "ESP32 Dev Module" la PSRAM no se enciende.',
  librerias: [],
  puerto: 'ninguno: esta placa no pinta nada',
  pila_loop: 8192,

  adc1: [32,33,34,35,36,39],
  adc2: [0,2,4,12,13,14,15,25,26,27],
  solo_entrada: [34,35,36,39],
  arranque: [0,2,12,15],

  pines: {
    1:'USB serie TX', 3:'USB serie RX',
    6:'flash interna', 7:'flash interna', 8:'flash interna',
    9:'flash interna', 10:'flash interna', 11:'flash interna',
    16:'PSRAM', 17:'PSRAM'
  },
  trampas: {
    16: 'En la WROVER va a la PSRAM. Parece libre porque en la DevKit v1 lo esta, y es el fallo clasico al cambiar de placa: el programa arranca y la PSRAM deja de responder.',
    17: 'Lo mismo que el 16: PSRAM.',
    0:  'Pin de arranque. A masa al encender, la placa entra en modo carga y no arranca el programa.',
    12: 'Pin de arranque. Nivel alto al arrancar y la placa no enciende.',
    2:  'Pin de arranque, y va al LED de la placa.',
    15: 'Pin de arranque. Genera ruido por el puerto serie al encender.',
    34: 'Solo entrada, sin resistencias internas.',
    35: 'Solo entrada, sin resistencias internas.',
    36: 'Solo entrada, sin resistencias internas.',
    39: 'Solo entrada, sin resistencias internas.'
  },
  libres: [4,5,13,14,18,19,21,22,23,25,26,27,32,33,34,35,36,39],
  nota_libres: 'Dieciocho pines. Dos menos que la DevKit v1, que son los que se lleva la PSRAM.',

  bus_i2c: { sda: 21, scl: 22, existe: false,
             nota: 'El I2C por defecto del ESP32 va en 21 y 22, pero cualquier par de pines vale.' },
  /* Los 16/17 de fabrica del Serial2 aqui los tiene la PSRAM, asi que el
     UART2 se remapea. El ESP32 deja ponerlo donde quieras. */
  uart2: { rx: 25, tx: 26, puerto: 'Serial2',
           nota: 'Remapeado: los 16/17 de fabrica los usa la PSRAM en esta placa.' },
  expansor: null,
  rutas_escape: ['Un expansor I2C (PCF8574) sobre 21/22: ocho E/S mas por dos pines.'],
  quirks: [
    'La PSRAM usa el 16 y el 17. Si vienes de una DevKit v1, ese es el cambio que hay que recordar.',
    'Los pines 34 a 39 son solo entrada: nunca valen para una salida.'
  ]
};

PLACAS['seeed-xiao-esp32s3'] = {
  nombre: 'Seeed XIAO ESP32-S3',
  corto: 'XIAO S3',
  procedencia: 'comunidad',
  nota_procedencia: 'Pines segun la wiki de Seeed. Del tamano de un pulgar: once pines en total, asi que el reparto aprieta.',
  mcu: 'ESP32-S3R8 · 8 MB flash · 8 MB PSRAM',
  sin_pantalla: true,
  ancho: 0, alto: 0,
  fqbn: 'esp32:esp32:XIAO_ESP32S3',
  opciones_ide: { 'PSRAM': 'OPI PSRAM', 'USB CDC On Boot': 'Enabled' },
  nota_ide: 'Con "USB CDC On Boot" apagado, el monitor serie no dice nada por USB y parece que la placa no arranca.',
  librerias: [],
  puerto: 'ninguno: esta placa no pinta nada',
  pila_loop: 8192,

  /* Los que salen a los pads: D0..D10 son GPIO1..9, 43 y 44 */
  adc1: [1,2,3,4,5,6,7,8,9],
  adc2: [],
  solo_entrada: [],
  arranque: [0,3,45,46],

  pines: {
    26:'flash/PSRAM', 27:'flash/PSRAM', 28:'flash/PSRAM', 29:'flash/PSRAM',
    30:'flash/PSRAM', 31:'flash/PSRAM', 32:'flash/PSRAM',
    33:'flash/PSRAM', 34:'flash/PSRAM', 35:'flash/PSRAM', 36:'flash/PSRAM', 37:'flash/PSRAM',
    19:'USB D-', 20:'USB D+',
    21:'LED de la placa (encendido a nivel bajo)',
    43:'UART0 TX (consola)', 44:'UART0 RX (consola)'
  },
  trampas: {
    43: 'Sale al pad D6, pero es el TX de la consola. Si lo usas para otra cosa, pierdes el monitor serie.',
    44: 'Sale al pad D7 y es el RX de la consola. Lo mismo que el 43.',
    21: 'Es el LED de la placa y va al reves: nivel BAJO enciende.'
  },
  libres: [1,2,3,4,5,6,7,8,9],
  nota_libres: 'Nueve pines comodos (D0..D5, D8..D10). Los D6 y D7 (43/44) valen si renuncias al monitor serie.',

  bus_i2c: { sda: 5, scl: 6, existe: false,
             nota: 'Los D4 y D5, que es lo que usan todos los ejemplos de Seeed. Gastan dos de los nueve.' },
  uart2: { rx: 44, tx: 43, puerto: 'Serial0',
           nota: 'La unica UART que sale a los pads es la de la consola. Para un enlace serie, cuenta con quedarte sin monitor.' },
  expansor: null,
  rutas_escape: [
    'Un expansor I2C sobre D4/D5: ocho E/S mas por dos pines.',
    'Renunciar al monitor serie y recuperar D6 y D7.'
  ],
  quirks: [
    'Todo el analogico esta en ADC1 (GPIO1..9), que es justo lo que sale a los pads: con WiFi encendido sigue leyendo.',
    'El LED de la placa (GPIO21) enciende con nivel bajo.'
  ]
};

PLACAS['esp32-s3-devkitc-1'] = {
  nombre: 'ESP32-S3-DevKitC-1',
  corto: 'S3-DevKitC',
  procedencia: 'comunidad',
  nota_procedencia: 'Pines segun la documentacion de Espressif. Mira la version de tu placa: el LED RGB cambio de pin entre la v1.0 y la v1.1.',
  mcu: 'ESP32-S3-WROOM-1 · 8 o 16 MB flash · 8 MB PSRAM en las N8R8/N16R8',
  sin_pantalla: true,
  ancho: 0, alto: 0,
  fqbn: 'esp32:esp32:esp32s3',
  opciones_ide: { 'PSRAM': 'OPI PSRAM', 'USB CDC On Boot': 'Enabled', 'Partition Scheme': 'Default 4MB with spiffs' },
  nota_ide: 'Si tu modulo no lleva PSRAM (N8 a secas), deja PSRAM en Disabled o el arranque se queda a medias.',
  librerias: [],
  puerto: 'ninguno: esta placa no pinta nada',
  pila_loop: 8192,

  adc1: [1,2,3,4,5,6,7,8,9,10],
  adc2: [11,12,13,14,15,16,17,18,19,20],
  solo_entrada: [],
  arranque: [0,3,45,46],

  pines: {
    19:'USB D-', 20:'USB D+',
    26:'flash/PSRAM', 27:'flash/PSRAM', 28:'flash/PSRAM', 29:'flash/PSRAM',
    30:'flash/PSRAM', 31:'flash/PSRAM', 32:'flash/PSRAM',
    33:'flash/PSRAM (modulos con PSRAM octal)', 34:'flash/PSRAM (octal)',
    35:'flash/PSRAM (octal)', 36:'flash/PSRAM (octal)', 37:'flash/PSRAM (octal)',
    43:'UART0 TX (consola)', 44:'UART0 RX (consola)',
    48:'LED RGB de la placa (v1.1; en la v1.0 es el 38)'
  },
  trampas: {
    0:  'Boton BOOT. A masa al encender, la placa entra en modo carga.',
    45: 'Pin de arranque: fija la tension de la flash. Nivel alto al encender y el modulo no arranca.',
    46: 'Pin de arranque, y ademas solo se lee bien en el arranque.',
    3:  'Pin de arranque (modo JTAG). Suele funcionar, pero evitalo si puedes.',
    35: 'En los modulos N8R8/N16R8 va a la PSRAM octal, aunque el pin salga al conector.',
    36: 'Igual que el 35: PSRAM octal.',
    37: 'Igual que el 35: PSRAM octal.'
  },
  libres: [1,2,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,21,38,39,40,41,42,47],
  nota_libres: 'Veinticuatro pines. Con WiFi encendido, el analogico tiene que ir a GPIO1..10 (ADC1).',

  bus_i2c: { sda: 8, scl: 9, existe: false,
             nota: 'Los que usa el core por defecto en el S3. Cualquier par vale.' },
  uart2: { rx: 18, tx: 17, puerto: 'Serial1',
           nota: 'El S3 remapea las UART a casi cualquier pin; estos dos son los de los ejemplos.' },
  expansor: null,
  rutas_escape: [
    'Un expansor I2C sobre 8/9.',
    'Los pines 38..42 y 47 estan libres en casi todas las versiones: mira la serigrafia.'
  ],
  quirks: [
    'ADC2 (GPIO11..20) deja de leer en cuanto se enciende la radio.',
    'El LED RGB es un WS2812: en la v1.0 esta en el 38 y en la v1.1 en el 48.'
  ]
};

PLACAS['esp32-c3-supermini'] = {
  nombre: 'ESP32-C3 SuperMini',
  corto: 'C3 SuperMini',
  procedencia: 'comunidad',
  nota_procedencia: 'Placa de clon, sin documentacion oficial. Los pines vienen de la serigrafia y de la comunidad: confirmalos con un multimetro antes de soldar.',
  mcu: 'ESP32-C3 (RISC-V, un nucleo) · 4 MB flash · sin PSRAM',
  i2c_controladores: 1,
  sin_pantalla: true,
  ancho: 0, alto: 0,
  fqbn: 'esp32:esp32:esp32c3',
  opciones_ide: { 'USB CDC On Boot': 'Enabled', 'Partition Scheme': 'Default 4MB with spiffs' },
  nota_ide: 'Sin "USB CDC On Boot" no hay monitor serie por el USB de la placa.',
  librerias: [],
  puerto: 'ninguno: esta placa no pinta nada',
  pila_loop: 8192,

  adc1: [0,1,2,3,4],
  adc2: [5],
  solo_entrada: [],
  arranque: [2,8,9],

  pines: {
    18:'USB D-', 19:'USB D+',
    8:'LED de la placa (encendido a nivel bajo)',
    20:'UART0 RX (consola)', 21:'UART0 TX (consola)'
  },
  trampas: {
    8: 'Es el LED de la placa Y pin de arranque. Si lo dejas a masa al encender, la placa no arranca.',
    9: 'Boton BOOT. A masa al encender, entra en modo carga.',
    2: 'Pin de arranque: tiene que estar alto al encender.',
    5: 'Es ADC2: con WiFi encendido deja de leer, en silencio.'
  },
  libres: [0,1,2,3,4,5,6,7,10],
  nota_libres: 'Nueve pines. El analogico fiable es GPIO0..4 (ADC1); el 5 solo sin radio.',

  bus_i2c: { sda: 8, scl: 9, existe: false,
             nota: 'Los del core por defecto, pero los dos son pines de arranque: si puedes, monta el bus en 6/7 y evita sorpresas al encender.' },
  uart2: { rx: 20, tx: 21, puerto: 'Serial0',
           nota: 'La UART que sale a los pines es la de la consola: para un enlace serie, cuentas con perder el monitor.' },
  expansor: null,
  rutas_escape: [
    'Un expansor I2C: ocho E/S mas por dos pines.',
    'Un segundo nodo por UART si te quedas corto.'
  ],
  quirks: [
    'Un solo nucleo: la tarea de control y la radio se turnan. No la cargues de trabajo fino.',
    'La antena de estas placas es floja: con el WiFi lejos del router, el enlace se cae antes que en una WROOM.'
  ]
};

/* ---------------------------------------------------------------------
 * LAS AVR: UNO Y NANO
 *
 * Otra familia, no un ESP32 mas pequeno. No tienen radio, ni CAN, ni el
 * PWM por hardware del ESP32; el convertidor es de 10 bits y el unico
 * puerto serie es el del USB. Todo eso lo mira el editor antes de
 * exportar, y lo dice en vez de escribir codigo que no compila.
 *
 * `familia: 'avr'` es lo que enciende ese camino. Los pines se numeran
 * como en el IDE: 0..13 digitales y 14..19 (o 21) las entradas A0..A5.
 * ------------------------------------------------------------------- */
const AVR_COMUN = {
  familia: 'avr',
  procedencia: 'comunidad',
  sin_pantalla: true,
  ancho: 0, alto: 0,
  librerias: [],
  puerto: 'ninguno: esta placa no pinta nada',
  pila_loop: 0,
  adc2: [],
  solo_entrada: [],
  arranque: [],
  /* Los unicos pines con PWM por hardware. Fuera de estos, analogWrite
     no existe: enciende o apaga, y el motor va a tirones. */
  pwm: [3, 5, 6, 9, 10, 11],
  bits_pwm: 8,
  bits_adc: 10,
  expansor: null,
  uart2: null,
};

PLACAS['esp32-s3-supermini'] = {
  nombre: 'ESP32-S3 SuperMini',
  corto: 'S3 SuperMini',
  procedencia: 'comunidad',
  nota_procedencia: 'Placa de clon, sin documentacion oficial. El modulo suele ser un ESP32-S3FH4R2. Las revisiones cambian: hay unas que sacan hasta el GPIO18 y otras que llevan almohadillas por detras (21, 33..42, 45..48). Aqui solo se dan por buenos los que estan en TODAS: GPIO1 a GPIO13, mas TX y RX. Si la tuya saca mas, anadelos con "Placa a medida".',
  mcu: 'ESP32-S3FH4R2 (Xtensa, dos nucleos) · 4 MB flash · 2 MB PSRAM',
  sin_pantalla: true,
  ancho: 0, alto: 0,
  fqbn: 'esp32:esp32:esp32s3',
  opciones_ide: { 'PSRAM': 'QSPI PSRAM', 'USB CDC On Boot': 'Enabled', 'Flash Size': '4MB (32Mb)', 'Partition Scheme': 'Default 4MB with spiffs' },
  nota_ide: 'La PSRAM de este modulo es QSPI, no OPI: con OPI la placa no arranca. Si la tuya no lleva PSRAM, dejala en Disabled. Sin "USB CDC On Boot" no hay monitor serie por el USB.',
  librerias: [],
  puerto: 'ninguno: esta placa no pinta nada',
  pila_loop: 8192,

  adc1: [1,2,3,4,5,6,7,8,9,10],
  adc2: [11,12,13],
  solo_entrada: [],
  arranque: [0,3,45,46],

  pines: {
    0:'boton BOOT (no sale al conector)',
    19:'USB D-', 20:'USB D+',
    26:'flash/PSRAM', 27:'flash/PSRAM', 28:'flash/PSRAM', 29:'flash/PSRAM',
    30:'flash/PSRAM', 31:'flash/PSRAM', 32:'flash/PSRAM',
    43:'UART0 TX (consola)', 44:'UART0 RX (consola)',
    48:'LED RGB de la placa (WS2812)'
  },
  trampas: {
    0:  'Boton BOOT. A masa al encender, la placa entra en modo carga.',
    3:  'Pin de arranque (modo JTAG). Suele funcionar, pero si puedes elegir, elige otro.',
    45: 'Pin de arranque: fija la tension de la flash. Alto al encender y el modulo no arranca.',
    46: 'Pin de arranque, y ademas solo se lee bien en el arranque.',
    11: 'Es ADC2: con WiFi encendido deja de leer, en silencio.',
    12: 'Es ADC2: con WiFi encendido deja de leer, en silencio.',
    13: 'Es ADC2: con WiFi encendido deja de leer, en silencio.',
    19: 'Va al USB-C de la placa: no sale al conector.',
    20: 'Va al USB-C de la placa: no sale al conector.',
    48: 'Es el LED RGB de la placa. En algunas revisiones esta en otro pin: miralo antes de contar con el.'
  },
  libres: [1,2,3,4,5,6,7,8,9,10,11,12,13],
  nota_libres: 'Trece pines en los laterales. Con la radio encendida, lo analogico tiene que ir a GPIO1..10 (ADC1): el 11, 12 y 13 son ADC2 y se apagan con el WiFi.',

  bus_i2c: { sda: 8, scl: 9, existe: false,
             nota: 'Los que usa el core por defecto en el S3. Aqui cualquier par de los laterales vale.' },
  uart2: { rx: 13, tx: 12, puerto: 'Serial1',
           nota: 'El S3 remapea las UART a casi cualquier pin. Se usan dos de los laterales para no tocar la consola, que va por GPIO43/44.' },
  expansor: null,
  rutas_escape: [
    'Un expansor I2C sobre 8/9: ocho E/S mas por dos pines.',
    'Las almohadillas de detras (21, 33..42, 45..48), si tu revision las trae: anadelas con "Placa a medida".'
  ],
  quirks: [
    'Dos nucleos, como una WROOM: la tarea de control no se pelea con la radio.',
    'ADC2 (GPIO11..13 aqui) deja de leer en cuanto se enciende el WiFi.',
    'La PSRAM es QSPI. Con OPI puesto en el IDE, la placa no arranca y el mensaje no lo dice.',
    'La antena es de pista: con el router lejos, el enlace se cae antes que en una WROOM.'
  ]
};

PLACAS['arduino-uno'] = {
  ...AVR_COMUN,
  nombre: 'Arduino UNO (ATmega328P)',
  corto: 'UNO',
  nota_procedencia: 'Los pines de la UNO son de manual y no cambian. Lo que hay que mirar es lo que NO tiene: ni radio, ni CAN, ni PWM configurable.',
  mcu: 'ATmega328P · 32 KB flash · 2 KB RAM · 16 MHz',
  fqbn: 'arduino:avr:uno',
  opciones_ide: { 'Placa': 'Arduino Uno' },
  nota_ide: 'No hay opciones que tocar. Elige el puerto y sube.',
  adc1: [14, 15, 16, 17, 18, 19],
  pines: {
    0: 'USB serie RX', 1: 'USB serie TX',
    13: 'LED de la placa'
  },
  trampas: {
    0:  'Es el RX del USB. Si cuelgas algo aqui, no puedes programar la placa sin desconectarlo.',
    1:  'Es el TX del USB. Lo mismo que el 0.',
    13: 'Va al LED de la placa y lleva una resistencia. Vale como salida, pero no para leer nada.',
    18: 'Es el SDA del I2C. En AVR el bus es fijo: si usas I2C, este pin deja de estar libre.',
    19: 'Es el SCL del I2C, fijo tambien.'
  },
  libres: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  nota_libres: 'Dieciocho pines: D2..D13 y A0..A5. Las A valen tambien como digitales.',
  bus_i2c: { sda: 18, scl: 19, existe: false,
             nota: 'En AVR el I2C no se mueve: A4 y A5, y solo esos.' },
  rutas_escape: [
    'Un expansor I2C (PCF8574) en A4/A5: ocho E/S mas por dos pines.',
    'Si te faltan pines analogicos, un multiplexor CD4051 sobre una sola entrada.'
  ],
  quirks: [
    'El PWM solo existe en D3, D5, D6, D9, D10 y D11, y es de 8 bits a frecuencia fija.',
    'El convertidor es de 10 bits (0..1023), no de 12 como en el ESP32.',
    'Son 2 KB de RAM: nada de buffers grandes ni de textos largos en variables.'
  ]
};

PLACAS['arduino-nano'] = {
  ...AVR_COMUN,
  nombre: 'Arduino Nano (ATmega328P)',
  corto: 'Nano',
  nota_procedencia: 'La misma UNO en formato pequeno. Ojo con el gestor de arranque: las clonicas suelen necesitar el "viejo".',
  mcu: 'ATmega328P · 32 KB flash · 2 KB RAM · 16 MHz',
  fqbn: 'arduino:avr:nano',
  opciones_ide: { 'Placa': 'Arduino Nano', 'Processor': 'ATmega328P (o "Old Bootloader" en las clonicas)' },
  nota_ide: 'Si al subir sale "programmer is not responding", cambia Processor a ATmega328P (Old Bootloader): es lo que llevan casi todas las clonicas.',
  /* La Nano saca dos entradas mas, A6 y A7, que SOLO valen para leer */
  adc1: [14, 15, 16, 17, 18, 19, 20, 21],
  solo_entrada: [20, 21],
  pines: {
    0: 'USB serie RX', 1: 'USB serie TX',
    13: 'LED de la placa'
  },
  trampas: {
    0:  'Es el RX del USB. Si cuelgas algo aqui, no puedes programar la placa sin desconectarlo.',
    1:  'Es el TX del USB. Lo mismo que el 0.',
    13: 'Va al LED de la placa y lleva una resistencia. Vale como salida, pero no para leer nada.',
    18: 'Es el SDA del I2C. En AVR el bus es fijo.',
    19: 'Es el SCL del I2C, fijo tambien.',
    20: 'A6: SOLO entrada analogica. No es un pin digital, no vale ni para leer un boton.',
    21: 'A7: igual que el A6, solo entrada analogica.'
  },
  libres: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
  nota_libres: 'Veinte pines: D2..D13, A0..A5 y las dos analogicas A6/A7, que solo leen.',
  bus_i2c: { sda: 18, scl: 19, existe: false,
             nota: 'En AVR el I2C no se mueve: A4 y A5, y solo esos.' },
  rutas_escape: [
    'Un expansor I2C (PCF8574) en A4/A5: ocho E/S mas por dos pines.',
    'A6 y A7 para dos sensores analogicos mas.'
  ],
  quirks: [
    'El PWM solo existe en D3, D5, D6, D9, D10 y D11, y es de 8 bits a frecuencia fija.',
    'A6 y A7 solo leen: no tienen driver de salida ni resistencias internas.',
    'Son 2 KB de RAM: nada de buffers grandes ni de textos largos en variables.'
  ]
};

/* ---------------------------------------------------------------------
 * LA PICO Y LAS DE LINUX
 *
 * La Pico es un micro con core de Arduino: nodo de control normal. Las
 * otras tres corren Linux y no llevan sketch: Telar les escribe un
 * programa en Python que habla el mismo protocolo.
 *
 * En las de Linux los numeros son los de /dev/gpiochip, no los del
 * conector. Varian entre modelos e imagenes: `gpioinfo` los dice.
 * ------------------------------------------------------------------- */
PLACAS['raspberry-pi-pico'] = {
  nombre: 'Raspberry Pi Pico (RP2040)',
  corto: 'Pico',
  familia: 'arduino',
  procedencia: 'comunidad',
  nota_procedencia: 'Pines segun la documentacion de Raspberry. Con el core arduino-pico de Earle Philhower.',
  mcu: 'RP2040 · 2 MB flash · 264 KB RAM',
  sin_pantalla: true, ancho: 0, alto: 0,
  fqbn: 'rp2040:rp2040:rpipico',
  opciones_ide: { 'Placa': 'Raspberry Pi Pico', 'Flash Size': '2MB (no FS)' },
  nota_ide: 'Hace falta el core "Raspberry Pi Pico/RP2040" (arduino-pico, de Earle Philhower) en el gestor de tarjetas. El de Arduino Mbed (arduino:mbed_rp2040:pico) compila este mismo codigo sin tocar nada; solo cambia el nombre de la placa en el menu.',
  librerias: [],
  puerto: 'ninguno: esta placa no pinta nada',
  pila_loop: 8192,
  bits_adc: 12, bits_pwm: 8,

  /* El convertidor solo esta en tres pines; el PWM, en todos */
  adc1: [26, 27, 28],
  adc2: [],
  solo_entrada: [],
  arranque: [],
  pines: {
    0: 'UART0 TX (el del enlace)', 1: 'UART0 RX (el del enlace)',
    23: 'control del regulador de la placa', 24: 'detecta si hay USB',
    25: 'LED de la placa', 29: 'mide la alimentacion (ADC3)'
  },
  trampas: {
    23: 'Parece libre en el diagrama y no lo esta: cambia el modo del regulador y con el, el ruido de la alimentacion.',
    24: 'Va al detector de USB. Leerlo vale; escribirlo no sirve de nada.',
    29: 'Es el ADC3, cableado al divisor de VSYS: no es una entrada libre.'
  },
  libres: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,26,27,28],
  nota_libres: 'Veinticuatro pines. Lo analogico, solo en GP26, GP27 y GP28.',
  bus_i2c: { sda: 4, scl: 5, existe: false, nota: 'El I2C0 de los ejemplos. La Pico lo deja en casi cualquier par.' },
  uart2: { rx: 1, tx: 0, puerto: 'Serial1', nota: 'El UART0 tal como sale de fabrica: GP0 es TX y GP1 es RX. La consola va por el USB, asi que estos dos quedan para el enlace. El core no los remapea solo: si los mueves, hay que decirselo con Serial1.setTX()/setRX().' },
  expansor: null,
  rutas_escape: ['Un expansor I2C sobre GP4/GP5.', 'Un multiplexor analogico si te faltan entradas: solo hay tres.'],
  quirks: [
    'El ADC son tres pines y nada mas: GP26, GP27 y GP28.',
    'El PWM esta en todos los pines, pero van por parejas: dos pines que comparten "slice" comparten frecuencia.',
    'No lleva radio: para hablar con la pantalla, cable.'
  ]
};

const LINUX_COMUN = {
  familia: 'linux',
  sin_pantalla: true,
  ancho: 0, alto: 0,
  procedencia: 'comunidad',
  librerias: ['python-periphery', 'pyserial'],
  puerto: 'ninguno: esta placa no pinta nada',
  pila_loop: 0,
  bits_adc: 0, bits_pwm: 0,
  adc1: [], adc2: [], solo_entrada: [], arranque: [], pwm: null,
  expansor: null,
};

PLACAS['raspberry-pi'] = {
  ...LINUX_COMUN,
  nombre: 'Raspberry Pi (cabecera de 40 pines)',
  corto: 'Raspberry Pi',
  nota_procedencia: 'Numeracion BCM, la de pinout.xyz. Comprueba con "gpioinfo" antes de cablear: la Pi 5 cambio el chip a /dev/gpiochip4.',
  mcu: 'Broadcom · Linux',
  fqbn: 'python3 control.py',
  opciones_ide: {},
  nota_ide: 'No hay IDE: se copia la carpeta a la placa y se ejecuta con python3.',
  gpiochip: '/dev/gpiochip0',
  pines: {
    0: 'EEPROM del HAT (ID_SD)', 1: 'EEPROM del HAT (ID_SC)',
    2: 'I2C SDA', 3: 'I2C SCL',
    14: 'UART TX (consola)', 15: 'UART RX (consola)'
  },
  trampas: {
    0:  'Reservado para la EEPROM de los HAT. Usarlo rompe la deteccion de sombreros.',
    1:  'Lo mismo que el 0.',
    14: 'Es la consola serie de fabrica. Para usarlo como enlace hay que quitar la consola con raspi-config.',
    15: 'Lo mismo que el 14.'
  },
  libres: [4,5,6,7,8,9,10,11,12,13,16,17,18,19,20,21,22,23,24,25,26,27],
  nota_libres: 'Veintidos lineas. Son numeros BCM, no los del conector: el 7 fisico es el BCM 4.',
  bus_i2c: { sda: 2, scl: 3, existe: true, nota: 'El I2C de la cabecera, ya montado.' },
  uart2: { rx: 15, tx: 14, puerto: '/dev/ttyS0', nota: 'La UART de la cabecera. En algunos modelos es /dev/ttyAMA0.' },
  rutas_escape: ['Un expansor I2C sobre la cabecera.', 'Un ADC por I2C (ADS1115) si hace falta medir algo analogico.'],
  quirks: [
    'No tiene convertidor analogico: para medir tension hace falta un ADC externo.',
    'En la Pi 5 el chip pasa a ser /dev/gpiochip4; el programa lo dice si falla.',
    'El puerto serie de la cabecera lo ocupa la consola hasta que la quitas con raspi-config.'
  ]
};

PLACAS['jetson-nano'] = {
  ...LINUX_COMUN,
  nombre: 'NVIDIA Jetson Nano (cabecera de 40 pines)',
  corto: 'Jetson Nano',
  procedencia: 'unverified',
  nota_procedencia: 'La cabecera es compatible con la de Raspberry en forma, pero las lineas del chip no coinciden siempre. Comprueba cada una con "gpioinfo" antes de cablear.',
  mcu: 'Tegra X1 · Linux',
  fqbn: 'python3 control.py',
  opciones_ide: {},
  nota_ide: 'No hay IDE. Si prefieres la libreria de NVIDIA (Jetson.GPIO), el programa generado se adapta cambiando las dos lineas de GPIO.',
  gpiochip: '/dev/gpiochip0',
  pines: {
    2: 'I2C SDA', 3: 'I2C SCL',
    14: 'UART TX (consola)', 15: 'UART RX (consola)'
  },
  trampas: {
    14: 'Consola serie de fabrica: hay que liberarla antes de usarla como enlace.',
    15: 'Lo mismo que el 14.'
  },
  libres: [4,5,6,7,8,9,10,11,12,13,16,17,18,19,20,21,22,23,24,25,26,27],
  nota_libres: 'Los mismos numeros que la Raspberry, por compatibilidad de la cabecera. Confirmalos con gpioinfo.',
  bus_i2c: { sda: 2, scl: 3, existe: true, nota: 'El I2C de la cabecera.' },
  uart2: { rx: 15, tx: 14, puerto: '/dev/ttyTHS1', nota: 'La UART de la cabecera en la Jetson suele ser ttyTHS1.' },
  rutas_escape: ['ADC por I2C (ADS1115).', 'Un micro (ESP32, Pico) como tercer nodo si hace falta analogico rapido.'],
  quirks: [
    'Sin convertidor analogico, como todas las de Linux.',
    'Los pines salen a 3,3 V pero la placa NO tolera 5 V en las entradas.',
    'Las lineas de /dev/gpiochip0 cambian entre imagenes: gpioinfo manda.'
  ]
};

PLACAS['orange-pi'] = {
  ...LINUX_COMUN,
  nombre: 'Orange Pi (cabecera de 40 pines)',
  corto: 'Orange Pi',
  procedencia: 'unverified',
  nota_procedencia: 'Cada modelo de Orange Pi numera distinto. Esta ficha es un punto de partida: comprueba con "gpioinfo" y corrigela en Placa a medida.',
  mcu: 'Allwinner / Rockchip · Linux',
  fqbn: 'python3 control.py',
  opciones_ide: {},
  nota_ide: 'No hay IDE: se copia la carpeta y se ejecuta con python3.',
  gpiochip: '/dev/gpiochip0',
  pines: { 14: 'UART TX (consola)', 15: 'UART RX (consola)' },
  trampas: {
    14: 'Consola serie de fabrica en casi todas las imagenes.',
    15: 'Lo mismo que el 14.'
  },
  libres: [2,3,4,5,6,7,8,9,10,11,12,13,16,17,18,19,20,21,22,23,24,25,26,27],
  nota_libres: 'Orientativo: en Orange Pi los numeros dependen del modelo. Verifica con gpioinfo.',
  bus_i2c: { sda: 2, scl: 3, existe: false, nota: 'Depende del modelo y del overlay activado.' },
  uart2: { rx: 15, tx: 14, puerto: '/dev/ttyS1', nota: 'Varia por modelo: ttyS1, ttyS3... mira "ls /dev/ttyS*".' },
  rutas_escape: ['ADC por I2C (ADS1115).', 'Un micro como nodo de medida.'],
  quirks: [
    'Sin convertidor analogico.',
    'La numeracion de los pines cambia entre modelos: es el fallo numero uno con estas placas.',
    'Muchas imagenes traen el puerto serie ocupado por la consola.'
  ]
};

/* Como se llama un pin en su placa. En el ESP32 todos son GPIO; en AVR,
   D2 y A0, que es lo que lleva serigrafiado y lo que dice cualquier
   tutorial. La guia de cableado y el codigo usan este nombre. */
function nombrePin(P, n){
  if (P && P.familia === 'avr') return n >= 14 ? 'A' + (n - 14) : 'D' + n;
  return 'GPIO' + n;
}

/* Lo unico que una AVR sabe hacer en Telar. Lo demas —radio, CAN, buses
   con diagnostico por printf— necesitaria codigo que el generador no
   escribe para esta familia, y prefiere decirlo a inventarlo. */
const AVR_PIEZAS = new Set(['adc-in', 'gpio-in', 'gpio-out', 'pwm-out']);
const AVR_ENLACES = new Set(['uart', 'rs485']);

/* Una Linux (Raspberry, Jetson, Orange Pi) no tiene convertidor: sus
   pines son digitales y punto. Lo analogico pide un ADC externo, y el
   PWM depende del overlay de cada placa: ninguno de los dos se inventa. */
const LINUX_PIEZAS = new Set(['gpio-in', 'gpio-out']);
const LINUX_ENLACES = new Set(['uart', 'rs485']);

/* ---------------------------------------------------------------------
 * PLACAS A MEDIDA
 *
 * El catalogo nunca va a tener todas las placas. Esto deja describir una
 * —una Pico, una STM32, una Jetson— con lo poco que el generador
 * necesita saber, y se guarda DENTRO del proyecto: el .telar.json viaja
 * con su placa y no depende de que la herramienta la conozca.
 *
 * `familia` es la pregunta que decide como se escribe el codigo:
 *   esp32     LEDC, atenuacion de ADC, Serial.printf
 *   avr       analogWrite de 8 bits, un solo UART, sin printf
 *   arduino   cualquier otro core de Arduino (Pico, STM32, SAMD...)
 *   linux     no es un sketch: se genera Python
 * ------------------------------------------------------------------- */
const FAMILIAS = {
  esp32:   { et: 'ESP32 (cualquier variante)', ayuda: 'PWM por LEDC, ADC configurable, Serial.printf.' },
  arduino: { et: 'Arduino genérica (Pico, STM32, SAMD…)', ayuda: 'PWM con analogWrite, un puerto serie por hardware, sin printf.' },
  avr:     { et: 'AVR (UNO, Nano, Mega…)', ayuda: 'PWM de 8 bits en pines fijos, ADC de 10 bits, un solo UART.' },
  linux:   { et: 'Linux (Raspberry, Jetson, Orange Pi…)', ayuda: 'No hay sketch: se genera un programa en Python que habla por el puerto serie.' },
};

function plantillaPlaca(){
  return {
    propia: true,
    id: '',
    nombre: '', corto: '',
    familia: 'arduino',
    procedencia: 'propia',
    nota_procedencia: 'Ficha escrita por ti. Telar no ha visto esta placa: comprueba los pines contra el esquemático antes de soldar.',
    mcu: '',
    sin_pantalla: true, ancho: 0, alto: 0,
    fqbn: '',
    opciones_ide: {},
    nota_ide: '',
    librerias: [],
    puerto: 'ninguno: esta placa no pinta nada',
    pila_loop: 8192,
    bits_adc: 12, bits_pwm: 8,
    adc1: [], adc2: [], pwm: null, solo_entrada: [], arranque: [],
    pines: {}, trampas: {}, libres: [],
    nota_libres: '',
    bus_i2c: null,
    uart2: null,
    expansor: null,
    rutas_escape: [],
    quirks: [],
  };
}

/* "2-13, 26,27" -> [2,3,...,13,26,27]. Acepta A0..A5 en las AVR. */
function pinesDeTexto(txt){
  const out = [];
  for (const trozo of String(txt || '').split(/[,\s]+/)){
    if (!trozo) continue;
    const t = trozo.trim().toUpperCase();
    const rango = t.match(/^(A?\d+)-(A?\d+)$/);
    const uno = x => x.startsWith('A') ? 14 + Number(x.slice(1)) : Number(x);
    if (rango){
      const a = uno(rango[1]), b = uno(rango[2]);
      if (Number.isFinite(a) && Number.isFinite(b) && b >= a) for (let i = a; i <= b; i++) out.push(i);
      continue;
    }
    const n = uno(t);
    if (Number.isFinite(n)) out.push(n);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}
const textoDePines = lista => (lista || []).join(', ');

/* ---------------------------------------------------------------------
 * PERIFERICOS
 *
 * Cada entrada declara QUE necesita del asignador de pines y QUE tiene
 * que salir en la guia de cableado. `trampas` son los avisos que evitan
 * que alguien queme algo.
 * ------------------------------------------------------------------- */
const CONEXIONES = {
  /* No es una salida digital: va por el expansor de la placa y sale por
     los bornes, sin gastar ni un GPIO. Por eso esta aqui y no se puede
     sustituir por "Salida digital", que si reserva un pin. */
  'salida-aislada': {
    nombre:'Salida aislada de placa', grupo:'De la placa', icono:'⎓',
    ayuda:'Las que ya trae la placa en los bornes. No gastan ningún pin.',
    necesita:{ expansor:'salida' },
    toma_variable:{ unidad:'', booleano:true },
    cableado:['La carga entre el borne y su propia alimentación, de 5 a 36 V'],
    trampas:[
      'Es de colector abierto: absorbe corriente. El positivo de la carga va a su fuente, no al borne.',
      'Las cargas inductivas necesitan diodo de descarga.'
    ]
  },
  'i2c': {
    nombre: 'Bus I2C', grupo:'Buses', icono:'⇄',
    ayuda:'Dos hilos, hasta 127 dispositivos. Lo barato es que se comparte.',
    pines: 2, compartible: true,
    campos: { direccion:{et:'Dirección', val:'0x00'}, frecuencia:{et:'Frecuencia (Hz)', val:400000} },
    trampas:['Necesita resistencias de pull-up. Casi todos los módulos ya las traen; con varios a la vez pueden sobrar.']
  },
  'uart': {
    nombre: 'Puerto serie (UART)', grupo:'Buses', icono:'⇅',
    ayuda:'Dos hilos punto a punto. Para hablar con otra placa o un módulo.',
    pines: 2,
    campos: { baudios:{et:'Baudios', val:115200} },
    trampas:['El UART0 suele estar ocupado por el monitor serie. Usa el 1 o el 2.']
  },
  'rs485': {
    nombre: 'RS485', grupo:'Buses', icono:'⇄',
    ayuda:'Serie diferencial. Aguanta cientos de metros y mucho ruido.',
    pines: 2, transceptor:'MAX3485 o XY-017 (a 3,3 V)',
    campos: { baudios:{et:'Baudios', val:19200} },
    trampas:[
      'Necesita un transceptor en cada punta. Si es de 5 V, su salida mata un pin de 3,3 V.',
      'El GND común no es opcional: sin referencia común el enlace no engancha.',
      'En cables largos, 120 ohm entre A y B en cada extremo.'
    ]
  },
  'can': {
    nombre: 'CAN', grupo:'Buses', icono:'⇄',
    ayuda:'Bus de campo del automóvil. Robusto y con prioridades.',
    pines: 2, transceptor:'SN65HVD230 o TJA1050',
    campos: { velocidad:{et:'Velocidad (kbit/s)', val:500} },
    trampas:['Necesita transceptor y 120 ohm en los dos extremos.']
  },
  'spi': {
    nombre: 'Bus SPI', grupo:'Buses', icono:'⇶',
    campos:{
      velocidad:{ et:'Velocidad sugerida (Hz)', val:1000000,
                  ayuda:'La manda el chip que cuelgues, no el bus. Va como argumento en cada transacción, así que puedes tener varios a velocidades distintas.' }
    },
    ayuda:'Rápido. Para tarjetas SD, pantallas y convertidores.',
    pines: 4, compartible: true,
    trampas:['Se comparten MOSI, MISO y SCK; cada dispositivo necesita su propio CS.']
  },
  'onewire': {
    nombre: 'OneWire', grupo:'Buses', icono:'⌇',
    ayuda:'Un solo hilo, varias sondas. El bus de los DS18B20.',
    pines: 1, compartible: true,
    trampas:['Resistencia de 4,7 k del dato a 3,3 V.']
  },

  'wifi': {
    nombre: 'WiFi', grupo:'Radio', icono:'📶',
    campos:{
      ssid:  { et:'Nombre de la red (SSID)', val:'mi-red',
               ayuda:'El nombre exacto, con sus mayúsculas. El ESP32 sólo ve redes de 2,4 GHz: si tu router separa las bandas, ésta tiene que ser la de 2,4.' },
      clave: { et:'Contraseña', val:'',
               ayuda:'Se queda escrita en el código y viaja con el sketch. Para un aula está bien; para algo de verdad, no repartas ese fichero.' },
      espera:{ et:'Espera al conectar (ms)', val:15000,
               ayuda:'Pasado este tiempo el programa sigue, sin red, en vez de quedarse colgado. Un nodo esperando para siempre es un nodo muerto.' }
    },
    ayuda:'El ESP32 lo lleva dentro. No gasta ningún pin.',
    pines: 0, veta_adc2: true,
    trampas:['Con el WiFi encendido, el ADC2 deja de leer. Todo lo analógico tiene que ir a ADC1.']
  },
  'bluetooth': {
    nombre: 'Bluetooth', grupo:'Radio', icono:'📶',
    ayuda:'BLE: el móvil se conecta sin cables. No gasta pines.',
    /* Que lo diga el catálogo y no el compilador tres minutos después. */
    campos:{
      nombre:{ et:'Nombre visible', val:'telar',
               ayuda:'Con este nombre aparece en el móvil al buscar dispositivos BLE.' }
    },
    pines: 0,
    trampas:['El ESP32-S3 NO tiene Bluetooth clásico: sólo BLE. Un sketch con BluetoothSerial.h ni siquiera compila en esa familia.',
      'WiFi y Bluetooth a la vez comparten la radio: ambos van más lentos.',
             'Ocupa bastante flash: puede que necesites una partición Huge APP.']
  },
  'espnow': {
    nombre: 'ESP-NOW', grupo:'Radio', icono:'📡',
    ayuda:'Radio directa entre ESP32, sin router. Ideal para unir dos nodos sin cable.',
    pines: 0, veta_adc2: true,
    trampas:['Usa la radio WiFi, así que el ADC2 también queda vetado.']
  },

  'gpio-in':  { nombre:'Entrada digital', grupo:'Pines sueltos', icono:'↓',
                ayuda:'Leer un nivel alto o bajo: un contacto, un sensor de presencia.',
                pines:1, dir:'entrada', da_variable:{ unidad:'', booleano:true },
                campos:{ pull:{et:'Resistencia', val:'pull-up interno', ops:['pull-up interno','pull-down interno','ninguna']} } },
  /* Para moverse por la interfaz cuando la pantalla no tiene tactil. No
     crea variable: no es un dato del proyecto, es un mando de la pantalla.
     Se cablea al foco de LVGL: siguiente y anterior mueven el recuadro,
     aceptar pulsa lo que este marcado. */
  'boton-nav': { nombre:'Botón de navegación', grupo:'Pines sueltos', icono:'⇥',
                ayuda:'Un pulsador para moverse por la interfaz en una pantalla sin táctil: siguiente, anterior o aceptar. Con dos basta (siguiente y aceptar); con tres es más cómodo.',
                pines:1, dir:'entrada', solo_pantalla:true,
                campos:{ funcion:{et:'Qué hace', val:'siguiente', ops:['siguiente','anterior','aceptar']},
                         pull:{et:'Resistencia', val:'pull-up interno', ops:['pull-up interno','pull-down interno']} } },
  'gpio-out': { nombre:'Salida digital', grupo:'Pines sueltos', icono:'↑',
                ayuda:'Encender o apagar: un LED, un relé, la entrada de un driver.',
                pines:1, dir:'salida', toma_variable:{ unidad:'', booleano:true },
                campos:{ activo:{et:'Nivel activo', val:'alto', ops:['alto','bajo']} } },
  'adc-in':   { nombre:'Entrada analógica (ADC)', grupo:'Pines sueltos', icono:'◑',
                ayuda:'Medir una tensión de 0 a 3,3 V.',
                pines:1, adc:true, da_variable:{ unidad:'%', min:0, max:100 },
                /* Los rangos son los que Espressif da por FIABLES, no donde
                   el convertidor satura. Entre uno y otro hay un tramo en el
                   que sigue leyendo y cada vez miente mas: poner ahi el tope
                   invita a medir justo donde no se debe. */
                campos:{ atenuacion:{et:'Atenuación', val:'11 dB · fiable hasta 2,45 V',
                         ops:['0 dB · fiable hasta 0,95 V','2,5 dB · fiable hasta 1,25 V',
                              '6 dB · fiable hasta 1,75 V','11 dB · fiable hasta 2,45 V'],
                         ayuda:'Cuánta tensión cabe en el pin. Siempre son 4095 pasos: '
                             + 'con 11 dB cabe mucho y cada paso vale ~0,8 mV; con 2,5 dB '
                             + 'cabe poco y cada paso vale ~0,3 mV, así que se lee más fino. '
                             + 'Déjalo en 11 dB salvo que tu sensor nunca pase de 1 V.'},
                         /* El suavizado era un 0,2 escrito a mano dentro de hal.cpp.
                            A 20 lecturas por segundo eso son unos 250 ms hasta
                            alcanzar el valor, y se NOTA al girar un mando: la aguja
                            va detras de la mano. Ahora se elige. */
                         suavizado:{et:'Suavizado', val:'poco', ops:['ninguno','poco','medio','mucho'],
                           ayuda:'Calma el baile del último dígito, a cambio de que la lectura '
                               + 'llegue con retraso. Para un mando que se mueve a mano, «ninguno» '
                               + 'o «poco»; para una temperatura, «medio» o «mucho».'},
                         muestras:{et:'Muestras a promediar', val:32,
                         ayuda:'El ADC del ESP32 es ruidoso y el último dígito baila solo. '
                             + 'Promediar lo calma. Más de 64 ya no se nota y ralentiza la lectura.'},
                         /* La escala: a que numero corresponde el pin al minimo y
                            al maximo. Es lo primero que un alumno quiere cambiar,
                            porque "0 a 100 %" solo vale mientras no mida nada real. */
                         unidad:{et:'Unidad', val:'%'},
                         escala_min:{et:'Valor con el pin a 0 V', val:0},
                         escala_max:{et:'Valor con el pin al máximo', val:100,
                         ayuda:'Cambia lo que el número SIGNIFICA, no lo que al pin le llega. '
                             + 'Para medir de verdad por encima de 3,3 V hace falta un divisor '
                             + 'resistivo delante: está en Dispositivos.'} },
                trampas:['Máximo 3,6 V absolutos: por encima se rompe el pin.',
                         'Por encima del rango fiable sigue dando números, pero cada vez más aplastados, y sobre 3,1 V se queda clavado en 4095. Si necesitas medir más, usa un divisor resistivo y ajusta la escala.'] },
  'pwm-out':  { nombre:'Salida PWM', grupo:'Pines sueltos', icono:'◐',
                ayuda:'Salida proporcional por LEDC: brillo, velocidad o potencia.',
                pines:1, dir:'salida', toma_variable:{ unidad:'%', min:0, max:100 },
                campos:{ frecuencia:{et:'Frecuencia (Hz)', val:5000},
                         resolucion:{et:'Resolución (bits)', val:13, ops:[8,10,12,13,14]},
                         rango:{et:'Rango', val:'0–100 %', ops:['0–100 %', '0–255', '0–1023'],
                                ayuda:'En qué unidades se da el valor: en tanto por ciento, de 0 a 255 como analogWrite, o de 0 a 1023. Telar lo convierte a la resolución elegida.'},
                         inicial:{et:'Valor al arrancar', val:0,
                                  ayuda:'Con qué valor sale al encender, en las unidades del rango. Después lo cambian un widget enlazado o tu código.'} },
                trampas:['Para mover un motor o una válvula hace falta un driver: el pin no puede con la carga.'] }
};

/* Los rangos de la Salida PWM: lo que vale su variable en el proyecto. El
   paso a la resolución de LEDC lo hace hal_escribir, sea cual sea. */
const RANGOS_PWM = {
  '0–100 %': { min: 0, max: 100,  unidad: '%' },
  '0–255':   { min: 0, max: 255,  unidad: '' },
  '0–1023':  { min: 0, max: 1023, unidad: '' },
};

/* ---------------------------------------------------------------------
 * ENLACES ENTRE NODOS
 *
 * Lo que une el nodo de la pantalla con el nodo que hace el trabajo.
 * Cada uno declara que hace falta a los dos lados y cuanto cuesta.
 * ------------------------------------------------------------------- */
const ENLACES = {
  'rs485':  { generado:true, nombre:'RS485', icono:'⇄', pines:2, baudios:19200,
              transceptor:'MAX3485, SP3485 o XY-017 (alimentado a 3,3 V)',
              ayuda:'Dos hilos diferenciales. Aguanta cientos de metros y ambiente industrial.',
              cuando:'Cuando los nodos están lejos o hay motores cerca.' },
  'uart':   { generado:true, nombre:'Serie directo (UART)', icono:'⇅', pines:2, baudios:115200,
              transceptor:null,
              ayuda:'Dos cables entre placa y placa. Lo más simple si están juntas.',
              cuando:'Menos de un metro y sin ruido alrededor.' },
  'can':    { generado:true, nombre:'CAN', icono:'⇄', pines:2, baudios:500,
              transceptor:'SN65HVD230 o TJA1050',
              ayuda:'Bus de campo con prioridades y detección de errores.',
              cuando:'Cuando vayan a ser más de dos nodos.' },
  'espnow': { generado:true, nombre:'ESP-NOW (sin cables)', icono:'📡', pines:0, baudios:null,
              transceptor:null,
              ayuda:'Radio directa entre ESP32. Ni cables ni router.',
              cuando:'Cuando tirar cable es un problema. Veta el ADC2 en los dos nodos.' }
};

/* ---------------------------------------------------------------------
 * WIDGETS
 *
 * `acepta` dice a que se puede enlazar cada uno; el editor lo usa para
 * no ofrecer enlaces imposibles, que es la mitad de los errores.
 * `grupo` solo ordena la paleta.
 * ------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
 * SIMBOLOS DE LVGL
 *
 * LVGL trae un puñado de iconos DENTRO de la fuente, en el rango de
 * FontAwesome. Por eso no hay que convertir ninguna imagen, no ocupan
 * memoria aparte y crecen con el tamaño de letra.
 *
 * `ver` es el carácter que se pinta en el lienzo del editor. No es el
 * mismo dibujo que saldrá en la placa —los de LVGL son de FontAwesome y
 * estos son de Unicode— pero ocupa lo mismo y se parece, que es lo que
 * hace falta para colocar el botón. El nombre de al lado es el que manda.
 * ------------------------------------------------------------------- */
/* Los codigos de los simbolos, COPIADOS de la propia LVGL:
   lvgl/scripts/built_in_font/built_in_font_gen.py, variable `syms`.
   No de memoria: un codigo mal puesto da un hueco en blanco, la fuente
   compila igual y no hay nada que apunte al error. */
const SIMBOLOS_RANGO = '61441,61448,61451,61452,61453,61457,61459,61461,61465,61468,'
  + '61473,61478,61479,61480,61502,61507,61512,61515,61516,61517,61521,61522,61523,'
  + '61524,61543,61544,61550,61552,61553,61556,61559,61560,61561,61563,61587,61589,'
  + '61636,61637,61639,61641,61664,61671,61674,61683,61724,61732,61787,61931,62016,'
  + '62017,62018,62019,62020,62087,62099,62212,62189,62810,63426,63650';

/* El fichero de iconos vive junto al Montserrat, en la propia LVGL */
const TTF_ICONOS = 'FontAwesome5-Solid+Brands+Regular.woff';

const SIMBOLOS = {
  '':                  { et:'— sin icono —',  ver:'' },
  'LV_SYMBOL_OK':      { et:'Aceptar',        ver:'✓' },
  'LV_SYMBOL_CLOSE':   { et:'Cancelar',       ver:'✕' },
  'LV_SYMBOL_POWER':   { et:'Encendido',      ver:'⏻' },
  'LV_SYMBOL_PLAY':    { et:'Marcha',         ver:'▶' },
  'LV_SYMBOL_PAUSE':   { et:'Pausa',          ver:'❙❙' },
  'LV_SYMBOL_STOP':    { et:'Paro',           ver:'■' },
  'LV_SYMBOL_REFRESH': { et:'Reiniciar',      ver:'↻' },
  'LV_SYMBOL_SETTINGS':{ et:'Ajustes',        ver:'⚙' },
  'LV_SYMBOL_HOME':    { et:'Inicio',         ver:'⌂' },
  'LV_SYMBOL_WARNING': { et:'Aviso',          ver:'⚠' },
  'LV_SYMBOL_UP':      { et:'Subir',          ver:'▲' },
  'LV_SYMBOL_DOWN':    { et:'Bajar',          ver:'▼' },
  'LV_SYMBOL_LEFT':    { et:'Izquierda',      ver:'◀' },
  'LV_SYMBOL_RIGHT':   { et:'Derecha',        ver:'▶' },
  'LV_SYMBOL_PLUS':    { et:'Más',            ver:'+' },
  'LV_SYMBOL_MINUS':   { et:'Menos',          ver:'−' },
  'LV_SYMBOL_SAVE':    { et:'Guardar',        ver:'🖫' },
  'LV_SYMBOL_TRASH':   { et:'Borrar',         ver:'🗑' },
  'LV_SYMBOL_EDIT':    { et:'Editar',         ver:'✎' },
  'LV_SYMBOL_BELL':    { et:'Alarma',         ver:'🔔' },
  'LV_SYMBOL_CHARGE':  { et:'Carga',          ver:'⚡' },
  'LV_SYMBOL_WIFI':    { et:'WiFi',           ver:'📶' },
  'LV_SYMBOL_USB':     { et:'USB',            ver:'⎘' },
  'LV_SYMBOL_SD_CARD': { et:'Tarjeta SD',     ver:'▤' },
  'LV_SYMBOL_EYE_OPEN':{ et:'Ver',            ver:'👁' }
};

const WIDGETS = {
  /* --- Basico --- */
  label:       { grupo:'Básico', nombre:'Texto',        icono:'Aa', acepta:'ninguno',  w:140, h:36,  ayuda:'Texto fijo: un título, una unidad, una aclaración.' },
  button:      { grupo:'Básico', nombre:'Botón',        icono:'⬜', acepta:'accion',   w:150, h:52,  ayuda:'Lanza una acción o cambia de pantalla.' },
  panel:       { grupo:'Básico', nombre:'Panel',        icono:'▭',  acepta:'ninguno',  w:300, h:180, ayuda:'Una caja de fondo para agrupar cosas.' },
  image:       { grupo:'Básico', nombre:'Imagen',       icono:'🖼', acepta:'ninguno',  w:120, h:120, ayuda:'Un mapa de bits. Ojo: ocupa flash.' },
  line:        { grupo:'Básico', nombre:'Línea',        icono:'╱',  acepta:'ninguno',  w:200, h:4,   ayuda:'Un separador o una guía.' },
  list:        { grupo:'Básico', nombre:'Lista',        icono:'☰',  acepta:'ninguno',  w:240, h:200, ayuda:'Lista de elementos con scroll.' },
  table:       { grupo:'Básico', nombre:'Tabla',        icono:'▦',  acepta:'ninguno',  w:360, h:180, ayuda:'Filas y columnas. Para registros y listados.' },
  msgbox:      { grupo:'Básico', nombre:'Aviso modal',  icono:'💬', acepta:'ninguno',  w:300, h:160, ayuda:'Ventana que interrumpe y pide confirmación.' },
  tabview:     { grupo:'Básico', nombre:'Pestañas',     icono:'⎘',  acepta:'ninguno',  w:400, h:240, ayuda:'Varias vistas en el mismo sitio.' },

  /* --- Entrada --- */
  slider:      { grupo:'Entrada', nombre:'Deslizador',  icono:'⇹',  acepta:'escritura', w:240, h:24,  ayuda:'Para que el usuario fije un valor.' },
  toggle:      { grupo:'Entrada', nombre:'Interruptor', icono:'⏼',  acepta:'escritura', w:72,  h:40,  ayuda:'Encendido o apagado.' },
  checkbox:    { grupo:'Entrada', nombre:'Casilla',     icono:'☑',  acepta:'escritura', w:180, h:36,  ayuda:'Marcar o desmarcar una opción.' },
  dropdown:    { grupo:'Entrada', nombre:'Desplegable', icono:'▼',  acepta:'escritura', w:220, h:44,  ayuda:'Elegir uno de varios.' },
  roller:      { grupo:'Entrada', nombre:'Rueda',       icono:'⌸',  acepta:'escritura', w:160, h:140, ayuda:'Rodillo de selección, cómodo con el dedo.' },
  spinbox:     { grupo:'Entrada', nombre:'Contador',    icono:'⇕',  acepta:'escritura', w:200, h:52,  ayuda:'Número con botones de más y menos.' },
  buttonmatrix:{ grupo:'Entrada', nombre:'Rejilla de botones', icono:'⣿', acepta:'accion', w:320, h:180, ayuda:'Matriz de botones. Para menús y teclados.' },
  textarea:    { grupo:'Entrada', nombre:'Campo de texto', icono:'✎', acepta:'ninguno', w:280, h:60,  ayuda:'Para escribir. Suele ir con un teclado.' },
  keyboard:    { grupo:'Entrada', nombre:'Teclado',     icono:'⌨',  acepta:'ninguno',   w:560, h:180, ayuda:'Teclado en pantalla para los campos de texto.' },

  /* --- Visualizacion --- */
  value:             { grupo:'Visualización', nombre:'Número grande', icono:'42', acepta:'lectura', w:180, h:90,  ayuda:'Un valor con su unidad. Lo más legible de lejos.' },
  bar:               { grupo:'Visualización', nombre:'Barra',         icono:'▬',  acepta:'lectura', w:220, h:16,  ayuda:'Barra de progreso horizontal.' },
  'arc-gauge':       { grupo:'Visualización', nombre:'Aguja 270°',    icono:'◕',  acepta:'lectura', w:200, h:200, ayuda:'Indicador circular casi completo.' },
  'semicircle-gauge':{ grupo:'Visualización', nombre:'Aguja 180°',    icono:'◠',  acepta:'lectura', w:220, h:120, ayuda:'Medio arco, como un velocímetro.' },
  chart:             { grupo:'Visualización', nombre:'Gráfico',       icono:'📈', acepta:'series',  w:360, h:200, ayuda:'Histórico en el tiempo, una o dos señales.' },
  scale:             { grupo:'Visualización', nombre:'Escala',        icono:'⦀',  acepta:'lectura', w:320, h:60,  ayuda:'Regla graduada con marcas y números.' },
  /* No es un temporizador: es la ESFERA de uno. Quien cuenta es la tarea
     de control, con la base de tiempo de la instantanea; esto solo pone
     los dos puntos en medio. */
  timer:             { grupo:'Visualización', nombre:'Tiempo',        icono:'⏱',  acepta:'lectura', w:180, h:70,  ayuda:'Muestra un número de segundos como mm:ss. Para cuentas atrás y tiempos de proceso.' },
  led:               { grupo:'Visualización', nombre:'Piloto',        icono:'●',  acepta:'lectura', w:44,  h:44,  ayuda:'Un punto que se enciende. Para alarmas y estados.' },
  spinner:           { grupo:'Visualización', nombre:'Cargando',      icono:'◜',  acepta:'ninguno', w:70,  h:70,  ayuda:'Indicador de que algo está en marcha.' },
  qrcode:            { grupo:'Visualización', nombre:'Código QR',     icono:'▣',  acepta:'ninguno', w:140, h:140, ayuda:'Para enlazar a una web o pasar datos al móvil.' },
  'state-strip':     { grupo:'Visualización', nombre:'Tira de estado',icono:'▪▪', acepta:'ninguno', w:320, h:40,  ayuda:'Una pastilla por estado; se enciende el activo.' }
};

/* ---------------------------------------------------------------------
 * WIDGETS CON CONTENIDO PROPIO
 *
 * Una lista, una rueda o una tabla no muestran una variable: muestran lo
 * que el alumno escribe. Una linea por elemento, porque es lo que se
 * escribe sin pensar; las celdas de una tabla van separadas por ";".
 * `def` es lo que traen al nacer, y es tambien lo que pinta el lienzo
 * mientras no se escriba otra cosa.
 * ------------------------------------------------------------------- */
const CON_ELEMENTOS = {
  list:         { et: 'Elementos (uno por línea)',                          def: 'Primero\nSegundo\nTercero' },
  roller:       { et: 'Opciones (una por línea)',                           def: 'Uno\nDos\nTres' },
  dropdown:     { et: 'Opciones (una por línea)',                           def: 'Opción 1\nOpción 2\nOpción 3' },
  buttonmatrix: { et: 'Botones (una fila por línea, separados por espacios)', def: '1 2 3\n4 5 6\n7 8 9' },
  tabview:      { et: 'Pestañas (una por línea)',                           def: 'Uno\nDos\nTres' },
  table:        { et: 'Celdas (una fila por línea, columnas con ";")',      def: 'Hora;Valor\n10:00;21.5\n10:05;21.8' },
  msgbox:       { et: 'Título en la primera línea, mensaje debajo',         def: '¿Confirmas?\nEsto no se puede deshacer.' },
};

/* =====================================================================
 * GEOMETRIA DE LO QUE NO LLENA SU CAJA
 *
 * Un deslizador no es una barra gorda: es un trazo fino en medio de una
 * caja alta. La caja es lo que se toca con el dedo; el trazo es lo que
 * se ve. Lo mismo el interruptor y la barra de progreso.
 *
 * El lienzo ya lo dibujaba asi, pero el generador emitia el tamano de la
 * CAJA, y en la placa salia una barra del alto entero. Aqui esta el
 * calculo una sola vez, y lo leen los dos: el que dibuja y el que emite.
 * Si vuelven a separarse, el diseno y la placa vuelven a mentir.
 * ================================================================== */

const GEOMETRIA = {
  /* ancho, alto y — si lo tiene — el diametro del mango */
  /* El mango sale del RELLENO, no al reves: LVGL lo dibuja del alto del
     trazo mas su relleno arriba y abajo. Calculando aqui el relleno y
     derivando el diametro, el lienzo dibuja exactamente lo que la placa
     va a pintar, sin un pixel de diferencia. */
  /* LA CAJA ES LO QUE SE VE. Antes estos tres dibujaban algo más pequeño
     que su caja, y la caja parecía un contenedor vacío alrededor. Ahora
     el alto del deslizador es su mango y la pastilla del interruptor llena
     la caja. Lo que se toca con el dedo no encoge: eso es `toque`, que el
     generador emite como lv_obj_set_ext_click_area, para que el área
     sensible siga midiendo al menos 44 px de alto. */
  slider: (W, H) => { const h = 5;
    const relleno = Math.max(0, Math.round((H - h) / 2)), mango = h + 2 * relleno;
    /* el trazo deja medio mango a cada lado: en los extremos, el mango
       se centra en la punta del trazo y así no se sale de la caja */
    return { w: Math.max(8, W - mango), h, relleno, mango, toque: Math.max(relleno, 20) }; },
  bar:    (W, H) => ({ w: W, h: H }),
  toggle: (W, H) => ({ w: W, h: H, toque: Math.max(0, Math.round((44 - H) / 2)) }),

  /* LOS ARCOS
   *
   * LVGL centra el arco en el objeto y toma min(w,h)/2 como radio, con el
   * trazo CENTRADO en ese radio: la mitad del grosor sobresale. Restar un
   * margen fijo funciona con arcos pequenos y corta los grandes, porque
   * el grosor crece con el radio y el margen no. Hay que despejar:
   *
   *     r + r*K/2 <= R     ->     r = R / (1 + K/2)
   *
   * Lo que se emite es un objeto CUADRADO de lado 2r+grosor, puesto donde
   * esta la circunferencia, que no es donde esta la caja. */
  'arc-gauge': (W, H) => {
    const K = .22, r = (Math.min(W, H) / 2) / (1 + K / 2);
    const grosor = Math.max(4, Math.round(r * K));
    const lado = Math.round(2 * r + grosor);
    return { w: lado, h: lado, r, grosor };      /* centrado, sin mas */
  },
  /* Igual, y ademas los centros NO coinciden: el medio arco se apoya en
     la base de la caja y LVGL lo centra en su objeto. Se corrige moviendo
     el objeto, no cambiando el dibujo: por eso este trae su propio dy. */
  'semicircle-gauge': (W, H) => {
    const K = .2, r = Math.min(W / 2, H) / (1 + K / 2);
    const grosor = Math.max(4, Math.round(r * K));
    const lado = Math.round(2 * r + grosor);
    return { w: lado, h: lado, r, grosor,
             dx: Math.round(W / 2 - lado / 2),
             dy: Math.round(H - grosor / 2 - lado / 2) };
  },
};

/* Proporción fija, ancho : alto. Al estirar un lado, el otro le sigue:
   un piloto ovalado o un arco en una caja apaisada vuelven a dejar hueco.
   El medio arco es (2+K) : (1+K), con el K de su geometría: así su caja
   mide justo el arco con su trazo. */
const PROPORCION = { 'arc-gauge': 1, 'semicircle-gauge': 2.2 / 1.2, led: 1, spinner: 1, qrcode: 1 };

/* Las fórmulas de ANTES, solo para ceñir las cajas de los proyectos
   guardados con ellas (migrarCajas, en telar-studio.html). No se usan
   para dibujar ni para generar. */
const GEOMETRIA_ANTERIOR = {
  slider: (W, H) => { const h = 5;
    const relleno = Math.max(0, Math.round((Math.max(14, Math.round(H * .5)) - h) / 2));
    return { w: Math.round(W * .92), h, relleno, mango: h + 2 * relleno }; },
  bar:    (W, H) => ({ w: Math.round(W * .92), h: Math.max(8, Math.round(H * .5)) }),
  toggle: (W, H) => ({ w: Math.round(Math.min(W, H * 1.8)), h: Math.round(H * .62) }),
  'semicircle-gauge': GEOMETRIA['semicircle-gauge'],
};

/* Lo dibujado, y cuanto hay que desplazarlo para que quede centrado en
   la caja. Para todo lo demas, la caja ES el widget. */
function geometria(w){
  const f = GEOMETRIA[w.tipo];
  if (!f) return { w: w.w, h: w.h, dx: 0, dy: 0, mango: 0 };
  const g = f(w.w, w.h);
  /* El centrado es el reparto por defecto; si la entrada trae su propio
     dx/dy —el medio arco— manda ella, por eso va despues. */
  return { dx: Math.round((w.w - g.w) / 2), dy: Math.round((w.h - g.h) / 2), ...g };
}

/* =====================================================================
 * PANTALLAS
 *
 * Hasta aqui Telar sabia pintar en UNA pantalla: la de la Waveshare, que
 * viene descrita dentro de ESP32_Display_Panel. Una pantalla SPI
 * corriente —las de 2,4", 2,8", 3,5" que se venden sueltas, y las placas
 * tipo "Cheap Yellow Display"— no esta en esa libreria, y con ella no
 * hay manera.
 *
 * Por eso hay DOS puertos. El puerto es la capa que traduce lo que LVGL
 * dibuja al panel que tengas delante; de ahi para arriba, la interfaz y
 * la logica son las mismas en los dos casos.
 * ------------------------------------------------------------------- */
const PUERTOS = {
  'esp_panel': {
    nombre: 'ESP32_Display_Panel',
    librerias: ['ESP32_Display_Panel 1.0.x', 'esp-lib-utils', 'lvgl 9.x'],
    nota: 'La placa entera esta descrita dentro de la libreria: basta con nombrarla y ella pone los pines.'
  },
  'serie': {
    nombre: 'Pantalla por puerto serie',
    librerias: [],
    nota: 'La pantalla se dibuja sola (Nextion) o la dibuja otro micro: el ESP32 solo le manda los valores por el puerto serie y recibe los toques. No lleva LVGL.'
  },
  'lovyan': {
    nombre: 'LovyanGFX',
    librerias: ['LovyanGFX 1.2.x', 'lvgl 9.x'],
    nota: 'La pantalla se describe en pantalla.h, DENTRO del proyecto: controlador, pines, rotacion y tactil. '
        + 'Por eso vale para cualquier panel SPI, y por eso dos proyectos con pantallas distintas no se estorban.'
  }
};

/* Los controladores de panel que Telar sabe escribir. El nombre de la
   clase es el de LovyanGFX; el resto son los valores con los que ese
   controlador suele funcionar. */
const PANELES = {
  'ILI9341': { nombre:'ILI9341 (240x320)',  clase:'Panel_ILI9341', ancho:240, alto:320, freq:40000000, freq_lectura:16000000, invertir:false, orden_rgb:false },
  'ST7789':  { nombre:'ST7789 (240x320)',   clase:'Panel_ST7789',  ancho:240, alto:320, freq:40000000, freq_lectura:16000000, invertir:true,  orden_rgb:false },
  'ST7789-240': { nombre:'ST7789 (240x240)', clase:'Panel_ST7789', ancho:240, alto:240, freq:40000000, freq_lectura:16000000, invertir:true,  orden_rgb:false },
  'ST7735':  { nombre:'ST7735 (128x160)',   clase:'Panel_ST7735S', ancho:128, alto:160, freq:27000000, freq_lectura:16000000, invertir:false, orden_rgb:false },
  'ILI9488': { nombre:'ILI9488 (320x480)',  clase:'Panel_ILI9488', ancho:320, alto:480, freq:27000000, freq_lectura:16000000, invertir:false, orden_rgb:false },
  'ST7796':  { nombre:'ST7796 (320x480)',   clase:'Panel_ST7796',  ancho:320, alto:480, freq:40000000, freq_lectura:16000000, invertir:false, orden_rgb:false },

  /* Las OLED de un solo color, por I2C. Un pixel esta encendido o
     apagado: no hay grises. Por eso la interfaz se pinta en blanco y
     negro puros; un gris lo convertiria la libreria en un tramado de
     puntos que se ve sucio. */
  'SSD1306':    { nombre:'SSD1306 OLED (128x64, I2C)', clase:'Panel_SSD1306', ancho:128, alto:64, bus:'i2c', mono:true, direccion:'0x3C' },
  'SSD1306-32': { nombre:'SSD1306 OLED (128x32, I2C)', clase:'Panel_SSD1306', ancho:128, alto:32, bus:'i2c', mono:true, direccion:'0x3C',
                  compins:'0x02' },   /* sin esto, la de 32 filas pinta una linea si y otra no */
  'SH1106':     { nombre:'SH1106 OLED (128x64, I2C)',  clase:'Panel_SH110x',  ancho:128, alto:64, bus:'i2c', mono:true, direccion:'0x3C',
                  offset_x:2 }        /* su memoria es de 132 columnas y el cristal va centrado */
};

/* Las pantallas que se dibujan solas y reciben ordenes por el puerto
   serie. La Nextion (y la TJC, que es la misma) tiene su propio editor:
   ahi se dibuja, y el ESP32 solo cambia textos, numeros y colores. El
   tamano es el de la pantalla: las coordenadas de la hoja de componentes
   se copian tal cual en su editor. */
const PANELES_SERIE = {
  'NX3224':  { nombre:'Nextion 2,4" / 2,8" (320x240)', ancho:320, alto:240, protocolo:'nextion', baudios:9600 },
  'NX4024':  { nombre:'Nextion 3,2" (400x240)',         ancho:400, alto:240, protocolo:'nextion', baudios:9600 },
  'NX4832':  { nombre:'Nextion 3,5" (480x320)',         ancho:480, alto:320, protocolo:'nextion', baudios:9600 },
  'NX4827':  { nombre:'Nextion 4,3" (480x272)',         ancho:480, alto:272, protocolo:'nextion', baudios:9600 },
  'NX8048':  { nombre:'Nextion 5" / 7" (800x480)',      ancho:800, alto:480, protocolo:'nextion', baudios:9600 },
  /* Cualquier otra cosa que sepa leer lineas de texto: otra pantalla con
     su propio micro, un segundo Arduino, un programa en el PC. El
     protocolo esta escrito en el LEEME para que el otro lado lo copie. */
  'UART-LINEAS': { nombre:'Otra pantalla o micro: texto por lineas', ancho:480, alto:320, protocolo:'lineas', baudios:115200 }
};
for (const [k, v] of Object.entries(PANELES_SERIE)) PANELES[k] = { ...v, bus:'uart' };

/* Lo que una pantalla serie sabe mostrar. Lo que no esta aqui o se dibuja
   a mano en su editor (fondos, lineas, imagenes) o no tiene equivalente. */
const WIDGETS_SERIE = new Set(['label', 'value', 'timer', 'bar', 'button', 'toggle', 'checkbox',
                               'led', 'state-strip', 'panel', 'line']);

/* Los widgets que tienen sentido en una pantalla de un color y 128 px:
   texto, numeros, barras y botones. Lo demas o necesita color (una
   grafica de varias series, una imagen) o no cabe. */
const WIDGETS_MONO = new Set(['label', 'value', 'timer', 'bar', 'panel', 'line', 'led',
                              'button', 'toggle', 'checkbox', 'state-strip', 'slider', 'spinner']);

/* Widgets que siguen funcionando en los proyectos que ya los usan, pero
   que ya no se ofrecen: otro componente hace lo mismo y tenerlos los dos
   solo obligaba a elegir a ciegas. La equivalencia, en OCULTOS_POR. */
const OCULTOS_POR = {
  value: 'lectura', timer: 'tiempo', dato: 'lectura',
  bar: 'barra-consigna', chart: 'curva', panel: 'tarjeta',
  'arc-gauge': 'aguja', 'semicircle-gauge': 'aguja', 'state-strip': 'pildora',
};
Object.keys(OCULTOS_POR).forEach(k => { if (WIDGETS[k]) WIDGETS[k].oculto = true; });

const esMono = P => !!(P && P.mono);
/* Los componentes caben en una OLED (se ven sencillos, pero se ven) */
/* la curva no: necesita color y espacio, como la grafica */
['tarjeta', 'lectura', 'tiempo', 'dato', 'pildora', 'pasos', 'barra-consigna', 'aguja', 'icono'].forEach(k => WIDGETS_MONO.add(k));
['tarjeta', 'lectura', 'tiempo', 'dato', 'pildora', 'pasos', 'barra-consigna', 'aguja'].forEach(k => WIDGETS_SERIE.add(k));

/* Los tactiles. El de SPI (XPT2046) es el de las resistivas baratas; los
   de I2C son los de las capacitivas. */
const TACTILES = {
  'ninguno':  { nombre:'sin tactil', clase:null, bus:null },
  'XPT2046':  { nombre:'XPT2046 (resistivo, SPI)', clase:'Touch_XPT2046', bus:'spi' },
  'FT5x06':   { nombre:'FT5x06 / FT6236 (capacitivo, I2C)', clase:'Touch_FT5x06', bus:'i2c' },
  'GT911':    { nombre:'GT911 (capacitivo, I2C)', clase:'Touch_GT911', bus:'i2c' },
  'CST816S':  { nombre:'CST816S (capacitivo, I2C)', clase:'Touch_CST816S', bus:'i2c' }
};

/* Que puerto le toca a cada placa. Sin ficha de pantalla no hay nada que
   pintar: las placas sin pantalla no tienen puerto. */
function puertoDe(P){
  if (!P || P.sin_pantalla) return null;
  return P.puerto_codigo || (P.lgfx ? 'lovyan' : 'esp_panel');
}

const esSerie = P => puertoDe(P) === 'serie';
const protocoloDe = P => (PANELES[P?.serie?.controlador] || {}).protocolo || null;

/* ---------------------------------------------------------------------
 * UNA PANTALLA ENCHUFADA A UNA PLACA QUE NO LA TRAE
 *
 * Un DevKit y una TFT de 2,4" del cajon son una pantalla tan valida como
 * una placa integrada. Lo que cambia respecto al catalogo es que los
 * pines los eliges tu, asi que hay que apuntarlos EN EL PROYECTO y
 * descontarlos de los libres: si no, el asignador reparte como sensor un
 * pin que lleva el reloj de la pantalla, y el fallo no se ve hasta que
 * la pantalla se queda en blanco.
 * ------------------------------------------------------------------- */

/* Lo que ve el usuario: el panel, ya girado. */
function medidaPantalla(pa){
  const pan = PANELES[pa?.controlador] || PANELES['ILI9341'];
  if (pan.bus === 'uart') return { ancho: pan.ancho, alto: pan.alto };
  const a = pa?.ancho_panel ?? pan.ancho, b = pa?.alto_panel ?? pan.alto;
  const girada = (pa?.rotacion ?? 0) % 2 === 1;
  return girada ? { ancho: b, alto: a } : { ancho: a, alto: b };
}

/* Todos los pines que se lleva la pantalla, con su descripcion. */
function pinesDePantalla(pa){
  const r = {};
  const pon = (pin, que) => { if (pin !== undefined && pin !== null && pin >= 0) r[pin] = que; };
  if ((PANELES[pa?.controlador] || {}).bus === 'uart'){
    pon(pa.uart?.tx, 'pantalla serie TX (va al RX de la pantalla)');
    pon(pa.uart?.rx, 'pantalla serie RX (viene del TX de la pantalla)');
    return r;
  }
  if ((PANELES[pa?.controlador] || {}).bus === 'i2c'){
    pon(pa.i2c?.sda, 'pantalla I2C SDA'); pon(pa.i2c?.scl, 'pantalla I2C SCL');
    pon(pa.i2c?.rst, 'pantalla RESET');
    return r;                     /* una OLED no lleva ni luz ni tactil */
  }
  const s = pa?.spi || {};
  pon(s.sck, 'pantalla SPI SCK'); pon(s.mosi, 'pantalla SPI MOSI');
  pon(s.miso, 'pantalla SPI MISO'); pon(s.dc, 'pantalla DC');
  pon(s.cs, 'pantalla CS'); pon(s.rst, 'pantalla RESET');
  if (pa?.luz) pon(pa.luz.pin, 'retroiluminacion');
  const t = pa?.tactil;
  if (t && t.controlador && t.controlador !== 'ninguno'){
    const T = TACTILES[t.controlador];
    if (T && T.bus === 'spi'){
      pon(t.sck, 'tactil SPI SCK'); pon(t.mosi, 'tactil SPI MOSI');
      pon(t.miso, 'tactil SPI MISO'); pon(t.cs, 'tactil CS');
    } else {
      pon(t.sda, 'tactil I2C SDA'); pon(t.scl, 'tactil I2C SCL');
      pon(t.rst, 'tactil RESET');
    }
    pon(t.irq, 'interrupcion del tactil');
  }
  return r;
}

/* La ficha de la placa CON la pantalla puesta: mismo formato que una del
   catalogo, para que el resto del programa no tenga que enterarse. */
function fichaConPantalla(base, pa){
  if (!pa) return base;
  const med = medidaPantalla(pa);
  const mios = pinesDePantalla(pa);
  const ocupados = new Set(Object.keys(mios).map(Number));
  const pan = PANELES[pa.controlador] || PANELES['ILI9341'];

  /* Una OLED por I2C va en SU PROPIO bus: la libreria de la pantalla y
     el Wire de los sensores no pueden mandar a la vez sobre el mismo
     controlador. Si la pantalla se ha quedado con los pines del bus de
     la placa, los sensores I2C se van a otro par de pines libres. */
  let bus_i2c = base.bus_i2c;
  if (pan.bus === 'i2c' && bus_i2c && (ocupados.has(bus_i2c.sda) || ocupados.has(bus_i2c.scl))){
    const otros = (base.libres || []).filter(x => !ocupados.has(x) && !(base.solo_entrada || []).includes(x)
                                             && !(base.arranque || []).includes(x));
    /* del final de la lista: el asignador reparte los libres desde el
       principio, y asi un sensor digital no acaba en el pin del bus */
    const dos = otros.slice(-2);
    bus_i2c = { sda: dos[0] ?? -1, scl: dos[1] ?? -1, existe: false,
                nota: 'La pantalla tiene su propio bus I2C. Los sensores I2C van en este otro par de pines, con su propio controlador.' };
  }
  /* Y en un chip con un solo controlador I2C (el C3) no caben dos buses */
  if (pan.bus === 'i2c' && (base.i2c_controladores ?? 2) < 2)
    bus_i2c = { ...(bus_i2c || {}), sin_controlador: true,
                nota: 'Este chip tiene un solo controlador I2C y lo usa la pantalla: aqui no caben sensores I2C.' };

  if (pan.bus === 'uart'){
    return {
      ...base,
      sin_pantalla: false,
      ancho: med.ancho, alto: med.alto,
      puerto_codigo: 'serie',
      panel: pan.nombre,
      tactil: pan.protocolo === 'nextion' ? 'el de la propia pantalla' : 'lo que tenga el otro lado',
      pines:  { ...(base.pines || {}), ...mios },
      libres: (base.libres || []).filter(x => !ocupados.has(x)),
      nota_libres: (base.nota_libres || '') + ' Descontados los que se lleva la pantalla.',
      serie: { controlador: pa.controlador, protocolo: pan.protocolo,
               tx: pa.uart?.tx ?? -1, rx: pa.uart?.rx ?? -1,
               baudios: pa.uart?.baudios || pan.baudios,
               /* la consola va por el 0; el enlace con otro nodo, por el 2 */
               puerto: 'Serial1' }
    };
  }

  return {
    ...base,
    bus_i2c,
    mono: !!pan.mono,
    sin_pantalla: false,
    ancho: med.ancho, alto: med.alto,
    puerto_codigo: 'lovyan',
    panel: pan.nombre + (pan.bus === 'i2c' ? '' : ' por SPI'),
    tactil: pan.bus !== 'i2c' && pa.tactil && pa.tactil.controlador !== 'ninguno'
              ? (TACTILES[pa.tactil.controlador] || {}).nombre : 'sin tactil',
    lv_mem: base.lv_mem ?? 49152,
    pines:  { ...(base.pines || {}), ...mios },
    libres: (base.libres || []).filter(x => !ocupados.has(x)),
    nota_libres: (base.nota_libres || '') + ' Descontados los que se lleva la pantalla.',
    lgfx: {
      controlador: pa.controlador,
      bus: pan.bus || 'spi',
      i2c: pa.i2c || null,
      i2c_puerto: pan.bus === 'i2c' ? ((base.i2c_controladores ?? 2) < 2 ? 0 : 1) : null,
      ancho_panel: pa.ancho_panel ?? (PANELES[pa.controlador] || PANELES['ILI9341']).ancho,
      alto_panel:  pa.alto_panel  ?? (PANELES[pa.controlador] || PANELES['ILI9341']).alto,
      rotacion: pa.rotacion ?? 0,
      spi: pa.spi || {},
      invertir: pa.invertir, orden_rgb: pa.orden_rgb,
      bus_compartido: pa.bus_compartido ?? false,
      /* una OLED no tiene retroiluminacion ni tactil, aunque la ficha
         conserve los de una TFT elegida antes */
      luz: pan.bus === 'i2c' ? null : (pa.luz || null),
      tactil: pan.bus !== 'i2c' && pa.tactil && pa.tactil.controlador !== 'ninguno' ? pa.tactil : null
    }
  };
}

/* ---------------------------------------------------------------------
 * PANTALLA A MEDIDA
 *
 * Lo que no esta en el catalogo se describe una vez y viaja dentro del
 * proyecto, como las placas a medida. Para una pantalla SPI o I2C basta
 * con saber su controlador: LovyanGFX trae el driver de muchos mas de los
 * que Telar ofrece de serie, y con el controlador, el tamano y un par de
 * ajustes (desplazamiento, colores invertidos, orden RGB/BGR) sale el
 * pantalla.h entero.
 * ------------------------------------------------------------------- */
const CLASES_LGFX = {
  /* en color, por SPI */
  'Panel_GC9A01':  { nombre:'GC9A01 (redonda)',      ancho:240, alto:240, buses:['spi'], invertir:true },
  'Panel_GC9107':  { nombre:'GC9107',                ancho:128, alto:128, buses:['spi'] },
  'Panel_GC9307':  { nombre:'GC9307',                ancho:240, alto:320, buses:['spi'] },
  'Panel_ILI9163': { nombre:'ILI9163',               ancho:128, alto:128, buses:['spi'] },
  'Panel_ILI9225': { nombre:'ILI9225',               ancho:176, alto:220, buses:['spi'] },
  'Panel_ILI9341': { nombre:'ILI9341',               ancho:240, alto:320, buses:['spi'] },
  'Panel_ILI9342': { nombre:'ILI9342',               ancho:320, alto:240, buses:['spi'] },
  'Panel_ILI9481': { nombre:'ILI9481',               ancho:320, alto:480, buses:['spi'] },
  'Panel_ILI9486': { nombre:'ILI9486',               ancho:320, alto:480, buses:['spi'] },
  'Panel_ILI9488': { nombre:'ILI9488',               ancho:320, alto:480, buses:['spi'] },
  'Panel_HX8357B': { nombre:'HX8357B',               ancho:320, alto:480, buses:['spi'] },
  'Panel_HX8357D': { nombre:'HX8357D',               ancho:320, alto:480, buses:['spi'] },
  'Panel_R61529':  { nombre:'R61529',                ancho:320, alto:480, buses:['spi'] },
  'Panel_ST7735':  { nombre:'ST7735',                ancho:128, alto:160, buses:['spi'] },
  'Panel_ST7735S': { nombre:'ST7735S',               ancho:128, alto:160, buses:['spi'] },
  'Panel_ST7789':  { nombre:'ST7789',                ancho:240, alto:320, buses:['spi'], invertir:true },
  'Panel_ST7796':  { nombre:'ST7796',                ancho:320, alto:480, buses:['spi'] },
  'Panel_SSD1331': { nombre:'SSD1331 (OLED color)',  ancho:96,  alto:64,  buses:['spi'] },
  'Panel_SSD1351': { nombre:'SSD1351 (OLED color)',  ancho:128, alto:128, buses:['spi'] },
  /* de un color (o de grises): por I2C o por SPI */
  'Panel_SSD1306': { nombre:'SSD1306 / SSD1309',     ancho:128, alto:64,  buses:['i2c', 'spi'], mono:true },
  'Panel_SH110x':  { nombre:'SH1106 / SH1107',       ancho:128, alto:64,  buses:['i2c', 'spi'], mono:true },
  'Panel_SSD1327': { nombre:'SSD1327 (grises)',      ancho:128, alto:128, buses:['i2c', 'spi'], mono:true },
  'Panel_ST7565':  { nombre:'ST7565 (LCD monocromo)', ancho:128, alto:64, buses:['spi'], mono:true }
};

/* Una ficha de pantalla propia, en el mismo formato que las del catalogo */
function fichaPanelPropio(p){
  if (p.bus === 'uart')
    return { nombre: p.nombre, ancho: +p.ancho, alto: +p.alto, bus: 'uart',
             protocolo: p.protocolo || 'nextion', baudios: +p.baudios || 9600, propia: true };
  const C = CLASES_LGFX[p.clase] || {};
  const f = { nombre: p.nombre, clase: (p.clase || 'Panel_ILI9341').replace(/^Panel_/, 'Panel_'),
              ancho: +p.ancho || C.ancho, alto: +p.alto || C.alto, propia: true,
              invertir: !!p.invertir, orden_rgb: !!p.orden_rgb,
              offset_x: +p.offset_x || 0, offset_y: +p.offset_y || 0 };
  if (p.bus === 'i2c'){ f.bus = 'i2c'; f.direccion = p.direccion || '0x3C'; }
  else { f.freq = Math.round((+p.freq_mhz || 40) * 1e6); f.freq_lectura = 16000000; }
  if (C.mono) f.mono = true;
  /* una SSD1306 de 32 filas necesita otro cableado de las filas */
  if (p.clase === 'Panel_SSD1306' && f.alto === 32) f.compins = '0x02';
  return f;
}

/* Mete en el catalogo las pantallas del proyecto abierto, y saca las de
   un proyecto anterior: cada proyecto trae las suyas. */
function registrarPantallasPropias(propias){
  for (const k of Object.keys(PANELES)) if (PANELES[k].propia) delete PANELES[k];
  for (const [id, p] of Object.entries(propias || {})) PANELES[id] = fichaPanelPropio(p);
}

/* =====================================================================
 * TIPOGRAFIA
 *
 * Una interfaz de planta no se lee con una sola letra. El HMI del variac,
 * que es la vara de medir, usa DOS familias con un oficio cada una:
 *
 *   - Chivo (700 y 900): los numeros grandes, los titulos y los botones.
 *     Es ancha y muy negra: un 33,3 se lee desde el otro lado del banco.
 *   - IBM Plex Mono (400 y 600): los datos y los rotulos. Monoespaciada,
 *     asi que un valor que cambia no baila de ancho, y los rotulos en
 *     mayusculas pequenas con espaciado se leen como en un instrumento.
 *
 * Las dos son libres (SIL OFL) y viven en TelarStudio/fuentes/. Al
 * exportar se copian al proyecto y generar.cmd las convierte al tamano
 * que pida cada texto, con lv_font_conv, como la Montserrat.
 *
 * Cada estilo tipografico es un "tipo": familia + peso. El de LVGL
 * (Montserrat Medium) es "medium", y la negrita y la cursiva de
 * Montserrat siguen siendo "bold", "italic" y "bolditalic".
 * ------------------------------------------------------------------- */
const TIPOS = {
  medium:     { nombre:'Montserrat',            familia:'Montserrat',    peso:500, cursiva:false, ttf:null,                      linea:1.09 },
  bold:       { nombre:'Montserrat negrita',    familia:'Montserrat',    peso:700, cursiva:false, ttf:'Montserrat-Bold.ttf',      linea:1.09 },
  italic:     { nombre:'Montserrat cursiva',    familia:'Montserrat',    peso:500, cursiva:true,  ttf:'Montserrat-MediumItalic.ttf', linea:1.09 },
  bolditalic: { nombre:'Montserrat negrita cursiva', familia:'Montserrat', peso:700, cursiva:true, ttf:'Montserrat-BoldItalic.ttf', linea:1.09 },
  chivo700:   { nombre:'Chivo negrita',         familia:'Chivo',         peso:700, cursiva:false, ttf:'Chivo-Bold.ttf',           linea:1.21, propia:true },
  chivo900:   { nombre:'Chivo extranegra',      familia:'Chivo',         peso:900, cursiva:false, ttf:'Chivo-Black.ttf',          linea:1.21, propia:true },
  plex400:    { nombre:'IBM Plex Mono',         familia:'IBM Plex Mono', peso:400, cursiva:false, ttf:'IBMPlexMono-Regular.ttf',  linea:1.24, propia:true, mono:true },
  plex600:    { nombre:'IBM Plex Mono seminegra', familia:'IBM Plex Mono', peso:600, cursiva:false, ttf:'IBMPlexMono-SemiBold.ttf', linea:1.24, propia:true, mono:true },
  /* Estrecha y de panel: caben mas cifras en poco ancho */
  barlow500:  { nombre:'Barlow Condensed',      familia:'Barlow Condensed', peso:500, cursiva:false, ttf:'BarlowCondensed-Medium.ttf', linea:1.20, propia:true },
  barlow700:  { nombre:'Barlow Condensed negrita', familia:'Barlow Condensed', peso:700, cursiva:false, ttf:'BarlowCondensed-Bold.ttf', linea:1.20, propia:true },
  /* Neutra y completa (tildes, µ, Ω) */
  roboto500:  { nombre:'Roboto',                familia:'Roboto',        peso:500, cursiva:false, ttf:'Roboto-Medium.ttf',        linea:1.17, propia:true },
  roboto700:  { nombre:'Roboto negrita',        familia:'Roboto',        peso:700, cursiva:false, ttf:'Roboto-Bold.ttf',          linea:1.17, propia:true },
  rmono400:   { nombre:'Roboto Mono',           familia:'Roboto Mono',   peso:400, cursiva:false, ttf:'RobotoMono-Regular.ttf',   linea:1.32, propia:true, mono:true },
  rmono600:   { nombre:'Roboto Mono seminegra', familia:'Roboto Mono',   peso:600, cursiva:false, ttf:'RobotoMono-SemiBold.ttf',  linea:1.32, propia:true, mono:true },
  /* Condensada y con caracter, para titulos que se leen de lejos */
  oswald500:  { nombre:'Oswald',                familia:'Oswald',        peso:500, cursiva:false, ttf:'Oswald-Medium.ttf',        linea:1.48, propia:true },
  oswald600:  { nombre:'Oswald seminegra',      familia:'Oswald',        peso:600, cursiva:false, ttf:'Oswald-SemiBold.ttf',      linea:1.48, propia:true },
  /* Un display de siete segmentos: cifras, punto, dos puntos, guion y
     letras aproximadas. NO tiene coma, ni tildes: se le pide solo lo que
     tiene (solo), y el panel avisa si el tema usa coma decimal. */
  dseg7:      { nombre:'DSEG7 · 7 segmentos',   familia:'DSEG7 Classic', peso:700, cursiva:false, ttf:'DSEG7Classic-Bold.ttf',    linea:1.00, propia:true,
                solo:' !-.0123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz' }
};
/* Los que viajan en TelarStudio/fuentes/ y se copian al proyecto */
const TIPOS_DE_TELAR = Object.keys(TIPOS).filter(k => TIPOS[k].propia);

/* El papel de cada texto en la interfaz. El tema dice que tipo lleva cada
   papel; cada widget tiene un papel por defecto y se puede cambiar. */
const PAPELES_TEXTO = {
  numero: 'Números grandes',
  titulo: 'Títulos y botones',
  dato:   'Datos',
  rotulo: 'Rótulos',
  texto:  'Texto corrido'
};
const PAPEL_DE_WIDGET = { value:'numero', timer:'dato', button:'titulo', label:'texto', checkbox:'texto', 'state-strip':'rotulo' };

/* =====================================================================
 * TEMAS
 *
 * Un tema ya no son ocho colores sueltos: son COLORES CON OFICIO. El HMI
 * del variac se ve profesional porque cada color significa siempre lo
 * mismo —el fondo, el panel, el hueco dentro del panel, la linea, tres
 * tintas de texto de mas a menos importante, cuatro clases de boton y
 * cuatro colores de estado— y nada se elige "a ojo" en cada widget.
 *
 * "industrial" es exactamente la paleta de ese HMI (ui.h, copiada del
 * prototipo). "aula" es la de siempre de Telar: un proyecto viejo se
 * abre igual que antes.
 * ------------------------------------------------------------------- */
const TEMAS = {
  aula: {
    nombre: 'Aula', desc: 'El de siempre de Telar: colores vivos y Montserrat.',
    fondo:'#222121', superficie:'#3a3649', sub:'#433e53', borde:'#23202c',
    texto:'#fffcfc', tenue:'#9aa3b2', tinta3:'#6b7280',
    acento:'#3b9dff', ok:'#3ddc97', aviso:'#f5a524', alarma:'#e74c3c',
    pista:'#2c2838', rejilla:'#4a4560',
    boton:    { fondo:'#3b9dff', borde:'#3b9dff', texto:'#04121f' },
    seleccion:{ fondo:'#1e4a73', borde:'#3b9dff', texto:'#cfe3ff' },
    marcha:   { fondo:'#3ddc97', borde:'#3ddc97', texto:'#04121f' },
    paro:     { fondo:'#e74c3c', borde:'#e74c3c', texto:'#ffffff' },
    radio: 6, coma: false,
    tipografia: { numero:'medium', titulo:'medium', dato:'medium', rotulo:'medium', texto:'medium' },
    fuente: 14
  },
  industrial: {
    nombre: 'Industrial', desc: 'Oscuro y sobrio, como un instrumento de banco. Es el del HMI del variac.',
    fondo:'#0b1015', superficie:'#131a21', sub:'#182027', borde:'#253039',
    texto:'#e6edf2', tenue:'#8a99a6', tinta3:'#5c6b77',
    acento:'#4da3e8', ok:'#3fbf87', aviso:'#e8b23c', alarma:'#e5544a',
    pista:'#1d2831', rejilla:'#2a3540',
    boton:    { fondo:'#1a222a', borde:'#2e3b45', texto:'#a9b7c2' },
    seleccion:{ fondo:'#2a3e52', borde:'#4da3e8', texto:'#8fc5f2' },
    marcha:   { fondo:'#1e5f44', borde:'#2c7d5b', texto:'#dff3e8' },
    paro:     { fondo:'#b8322a', borde:'#d0453c', texto:'#fff1ef' },
    radio: 6, coma: true,
    tipografia: { numero:'chivo900', titulo:'chivo700', dato:'plex600', rotulo:'plex400', texto:'plex400' },
    fuente: 14
  },
  'industrial-claro': {
    nombre: 'Industrial claro', desc: 'La misma disciplina sobre fondo claro: para paneles a pleno sol o bajo luz fuerte.',
    fondo:'#e7ebee', superficie:'#ffffff', sub:'#f2f4f6', borde:'#c9d1d8',
    texto:'#14202b', tenue:'#566674', tinta3:'#8795a1',
    acento:'#1f6fb8', ok:'#1e8a5b', aviso:'#b7791f', alarma:'#c0392b',
    pista:'#dce3e9', rejilla:'#d3dae1',
    boton:    { fondo:'#f2f4f6', borde:'#c1cad2', texto:'#2c3a46' },
    seleccion:{ fondo:'#dcebf8', borde:'#1f6fb8', texto:'#1b5d9b' },
    marcha:   { fondo:'#1e7a50', borde:'#176641', texto:'#ffffff' },
    paro:     { fondo:'#c0392b', borde:'#a93226', texto:'#ffffff' },
    radio: 6, coma: true,
    tipografia: { numero:'chivo900', titulo:'chivo700', dato:'plex600', rotulo:'plex400', texto:'plex400' },
    fuente: 14
  },
  contraste: {
    nombre: 'Alto contraste', desc: 'Negro y colores puros: se lee desde lejos y con mala vista.',
    fondo:'#000000', superficie:'#111111', sub:'#1a1a1a', borde:'#5a5a5a',
    texto:'#ffffff', tenue:'#d0d0d0', tinta3:'#9a9a9a',
    acento:'#29b6ff', ok:'#00e676', aviso:'#ffd600', alarma:'#ff3d00',
    pista:'#262626', rejilla:'#3a3a3a',
    boton:    { fondo:'#1a1a1a', borde:'#ffffff', texto:'#ffffff' },
    seleccion:{ fondo:'#003a57', borde:'#29b6ff', texto:'#ffffff' },
    marcha:   { fondo:'#006b36', borde:'#00e676', texto:'#ffffff' },
    paro:     { fondo:'#b71c00', borde:'#ff3d00', texto:'#ffffff' },
    radio: 4, coma: true,
    tipografia: { numero:'chivo900', titulo:'chivo700', dato:'plex600', rotulo:'plex600', texto:'plex400' },
    fuente: 14
  }
};

/* Las clases de boton. "acento" es la de siempre (el color del widget);
   las otras cuatro salen del tema y son las del variac. */
const CLASES_BOTON = {
  boton:     'Normal',
  seleccion: 'Seleccionado',
  marcha:    'Marcha (acción principal)',
  paro:      'Paro (detener, borrar)'
};

/* Los tres colores de un boton: los de su clase en el tema, salvo que el
   widget traiga los suyos. Lo usan el lienzo, el simulador y el generador. */
function colorBoton(w, tema){
  const e = (w && w.estilo) || {}, tm = tema || E.tema;
  const c = tm[e.clase || 'boton'] || tm.boton || { fondo: tm.acento, borde: tm.acento, texto: '#04121f' };
  return { fondo: e.color || c.fondo,
           borde: e.color && !e.clase ? e.color : c.borde,
           texto: e.texto || c.texto };
}

/* Mezcla dos colores #rrggbb: t=0 es a, t=1 es b */
function mezclaColor(a, b, t){
  const p = h => { const n = parseInt(String(h).replace('#', '').slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b);
  return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join('');
}
const esOscuro = hex => { const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16) || 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) < 128; };

/* El fondo apagado de un color de estado: el de las pildoras y las
   insignias del variac (#1b3a2c para el verde, #3a2e10 para el ambar...).
   Sale de mezclar el color con el panel, asi vale para cualquier tema. */
const tinteEstado = (color, tema) => esOscuro(tema.superficie)
  ? mezclaColor(tema.fondo, color, 0.22) : mezclaColor(tema.superficie, color, 0.14);

/* Un tema viejo (de antes de los temas con oficio) se completa con lo que
   le falta, sin tocar lo que ya tenia: sus colores siguen siendo suyos. */
function completarTema(tm){
  const base = TEMAS.aula;
  const r = { ...JSON.parse(JSON.stringify(base)), ...(tm || {}) };
  for (const k of ['boton', 'seleccion', 'marcha', 'paro', 'tipografia'])
    r[k] = { ...base[k], ...((tm || {})[k] || {}) };
  /* En "aula" el boton normal ES el acento: si el alumno lo cambio, que siga */
  if (!(tm && tm.boton) && tm && tm.acento) r.boton = { fondo: tm.acento, borde: tm.acento, texto: base.boton.texto };
  return r;
}
