# Telar Studio

**Español** · [English](README.md)

Plataforma para el desarrollo fácil y rápido de interfaces con LVGL.

La interfaz y la documentación están en español y en inglés: el idioma se cambia arriba a la derecha.

Diseñas la pantalla arrastrando widgets, conectas sensores y salidas, escribes qué hace el aparato con un lenguaje sencillo y lo pruebas en el simulador. Al exportar, Telar escribe el proyecto de Arduino completo para placas ESP32 con pantalla (Waveshare, CrowPanel, CYD…), con sus fuentes ya generadas: se abre en el IDE y se sube.

## Descargar

En **[Releases](https://github.com/ailoviot/TelarStudio/releases)** está la aplicación de escritorio para Windows, macOS y Linux.

La primera vez que la abras: todavía no está firmada.
- En **Windows**, si sale «Windows protegió su PC»: *Más información* → *Ejecutar de todas formas*.
- En **macOS**: clic derecho sobre Telar Studio → *Abrir* → *Abrir*.

## Sin instalar nada

Telar Studio también funciona en el navegador: descarga el repositorio y abre `telar-studio.html` con **Chrome** o **Edge** (hace falta la API de acceso a archivos para exportar a una carpeta).

## Qué hay aquí

| Carpeta o archivo | Qué es |
|---|---|
| `telar-studio.html` y los `.js` | La aplicación: diseño, estilo, hardware, lógica, simulador y generador de código |
| `docs/logica.html` | La documentación del lenguaje de lógica, con ejemplos |
| `fuentes/` | Las tipografías que usa Telar y sus licencias |
| `lv-font-conv.js` | [lv_font_conv](https://github.com/lvgl/lv_font_conv) empaquetado para el navegador: genera las fuentes al exportar |
| `ejemplos/` | Proyectos de ejemplo (`.telar.json`), para abrir con el botón **Abrir** |
| `escritorio/` | La aplicación de escritorio (Electron) |
| `herramientas/` | Utilidades de desarrollo, como la que empaqueta `lv-font-conv.js` |

## Compilar la aplicación de escritorio

Con [Node.js](https://nodejs.org) 22 o superior:

```
cd escritorio
npm install
node node_modules/electron/install.js
npm start            # abre Telar Studio de escritorio
npm run dist:win     # instalador de Windows en escritorio/dist/
```

`npm run dist:mac` y `npm run dist:linux` generan los de macOS y Linux (cada uno en su sistema). Al subir una etiqueta de versión (`v1.2.0`), GitHub compila los tres y los publica en Releases.

## Licencia

MIT. Las tipografías incluidas tienen su propia licencia (SIL OFL o Apache 2.0), en `fuentes/`. `lv-font-conv.js` incluye lv_font_conv (MIT), FreeType (FTL) y sus dependencias.
