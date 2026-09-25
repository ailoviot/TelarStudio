# Telar Studio

[Español](README.es.md) · **English**

A platform for building LVGL interfaces quickly and easily.

You design the screen by dragging widgets, connect sensors and outputs, describe what the device does in a simple language and try it in the simulator. On export, Telar writes the complete Arduino project for ESP32 boards with a display (Waveshare, CrowPanel, CYD…), with its fonts already generated: open it in the Arduino IDE and upload.

The interface and the documentation are available in English and Spanish: switch the language at the top right.

## Download

The desktop app for Windows, macOS and Linux is on the **[Releases](https://github.com/ailoviot/TelarStudio/releases)** page.

The first time you open it: the app is not signed yet.
- On **Windows**, if you see "Windows protected your PC": *More info* → *Run anyway*.
- On **macOS**: right-click Telar Studio → *Open* → *Open*.

## Without installing anything

Telar Studio also runs in the browser: download the repository and open `telar-studio.html` in **Chrome** or **Edge** (exporting to a folder needs the File System Access API).

## What is in here

| Folder or file | What it is |
|---|---|
| `telar-studio.html` and the `.js` files | The app: design, style, hardware, logic, simulator and code generator |
| `docs/logica.html` | Documentation of the logic language, with examples |
| `fuentes/` | The typefaces Telar uses, with their licenses |
| `lv-font-conv.js` | [lv_font_conv](https://github.com/lvgl/lv_font_conv) bundled for the browser: generates the fonts on export |
| `ejemplos/` | Example projects (`.telar.json`), to open with the **Open** button |
| `escritorio/` | The desktop app (Electron) |
| `herramientas/` | Development tools, such as the one that bundles `lv-font-conv.js` |

## Building the desktop app

With [Node.js](https://nodejs.org) 22 or later:

```
cd escritorio
npm install
node node_modules/electron/install.js
npm start            # opens Telar Studio desktop
npm run dist:win     # Windows installer in escritorio/dist/
```

`npm run dist:mac` and `npm run dist:linux` build the macOS and Linux installers (each on its own system). Pushing a version tag (`v1.2.0`) makes GitHub build all three and publish them on Releases.

## License

MIT. The bundled typefaces have their own licenses (SIL OFL or Apache 2.0), in `fuentes/`. `lv-font-conv.js` includes lv_font_conv (MIT), FreeType (FTL) and their dependencies.
