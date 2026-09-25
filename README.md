# Telar Studio

**[🇪🇸 Español](#español)** · **[🇬🇧 English](#english)**

---

## Español

Plataforma para el desarrollo fácil y rápido de interfaces con LVGL.

La interfaz y la documentación están en español y en inglés: el idioma se cambia arriba a la derecha.

Diseñas la pantalla arrastrando widgets, conectas sensores y salidas, escribes qué hace el aparato con un lenguaje sencillo y lo pruebas en el simulador. Al exportar, Telar escribe el proyecto de Arduino completo para placas ESP32 con pantalla (Waveshare, CrowPanel, CYD…), con sus fuentes ya generadas: se abre en el IDE y se sube.

### Descargar

En **[Releases](https://github.com/ailoviot/TelarStudio/releases)** está la aplicación de escritorio para Windows, macOS y Linux.

La primera vez que la abras: todavía no está firmada.
- En **Windows**, si sale «Windows protegió su PC»: *Más información* → *Ejecutar de todas formas*.
- En **macOS**: clic derecho sobre Telar Studio → *Abrir* → *Abrir*.

### Sin instalar nada

Telar Studio también funciona en el navegador: descarga el repositorio y abre `telar-studio.html` con **Chrome** o **Edge** (hace falta la API de acceso a archivos para exportar a una carpeta).

### Qué hay aquí

| Carpeta o archivo | Qué es |
|---|---|
| `telar-studio.html` y los `.js` | La aplicación: diseño, estilo, hardware, lógica, simulador y generador de código |
| `docs/logica.html` | La documentación del lenguaje de lógica, con ejemplos |
| `fuentes/` | Las tipografías que usa Telar y sus licencias |
| `lv-font-conv.js` | [lv_font_conv](https://github.com/lvgl/lv_font_conv) empaquetado para el navegador: genera las fuentes al exportar |
| `ejemplos/` | Proyectos de ejemplo (`.telar.json`), para abrir con el botón **Abrir** |
| `escritorio/` | La aplicación de escritorio (Electron) |
| `herramientas/` | Utilidades de desarrollo, como la que empaqueta `lv-font-conv.js` |

### Compilar la aplicación de escritorio

Con [Node.js](https://nodejs.org) 22 o superior:

```
cd escritorio
npm install
node node_modules/electron/install.js
npm start            # abre Telar Studio de escritorio
npm run dist:win     # instalador de Windows en escritorio/dist/
```

`npm run dist:mac` y `npm run dist:linux` generan los de macOS y Linux (cada uno en su sistema). Al subir una etiqueta de versión (`v1.2.0`), GitHub compila los tres y los publica en Releases.

### Licencia

MIT. Las tipografías incluidas tienen su propia licencia (SIL OFL o Apache 2.0), en `fuentes/`. `lv-font-conv.js` incluye lv_font_conv (MIT), FreeType (FTL) y sus dependencias.

<p align="right"><a href="#telar-studio">↑ Arriba</a></p>

---

## English

A platform for building LVGL interfaces quickly and easily.

You design the screen by dragging widgets, connect sensors and outputs, describe what the device does in a simple language and try it in the simulator. On export, Telar writes the complete Arduino project for ESP32 boards with a display (Waveshare, CrowPanel, CYD…), with its fonts already generated: open it in the Arduino IDE and upload.

The interface and the documentation are available in English and Spanish: switch the language at the top right.

### Download

The desktop app for Windows, macOS and Linux is on the **[Releases](https://github.com/ailoviot/TelarStudio/releases)** page.

The first time you open it: the app is not signed yet.
- On **Windows**, if you see "Windows protected your PC": *More info* → *Run anyway*.
- On **macOS**: right-click Telar Studio → *Open* → *Open*.

### Without installing anything

Telar Studio also runs in the browser: download the repository and open `telar-studio.html` in **Chrome** or **Edge** (exporting to a folder needs the File System Access API).

### What is in here

| Folder or file | What it is |
|---|---|
| `telar-studio.html` and the `.js` files | The app: design, style, hardware, logic, simulator and code generator |
| `docs/logica.html` | Documentation of the logic language, with examples |
| `fuentes/` | The typefaces Telar uses, with their licenses |
| `lv-font-conv.js` | [lv_font_conv](https://github.com/lvgl/lv_font_conv) bundled for the browser: generates the fonts on export |
| `ejemplos/` | Example projects (`.telar.json`), to open with the **Open** button |
| `escritorio/` | The desktop app (Electron) |
| `herramientas/` | Development tools, such as the one that bundles `lv-font-conv.js` |

### Building the desktop app

With [Node.js](https://nodejs.org) 22 or later:

```
cd escritorio
npm install
node node_modules/electron/install.js
npm start            # opens Telar Studio desktop
npm run dist:win     # Windows installer in escritorio/dist/
```

`npm run dist:mac` and `npm run dist:linux` build the macOS and Linux installers (each on its own system). Pushing a version tag (`v1.2.0`) makes GitHub build all three and publish them on Releases.

### License

MIT. The bundled typefaces have their own licenses (SIL OFL or Apache 2.0), in `fuentes/`. `lv-font-conv.js` includes lv_font_conv (MIT), FreeType (FTL) and their dependencies.

<p align="right"><a href="#telar-studio">↑ Top</a></p>
