/* =====================================================================
 * TELAR STUDIO DE ESCRITORIO — el proceso principal (Electron)
 *
 * Abre Telar Studio (la carpeta web/, copia de la carpeta de arriba) en una
 * ventana, con su propio Chromium: se ve y funciona igual en Windows,
 * macOS y Linux. La pagina no toca el disco: pide por IPC (preload.js)
 * elegir carpeta, guardar, abrir, leer y escribir, y aqui se hace con los
 * dialogos del sistema.
 *
 * Seguridad: la pagina solo puede escribir dentro de lo que el usuario
 * eligio en un dialogo (una carpeta de exportar, un archivo guardado o
 * abierto). Una ruta cualquiera que llegue por IPC se rechaza.
 * ===================================================================== */
'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { fileURLToPath } = require('url');

const WEB = path.join(__dirname, 'web');
const PAGINA = path.join(WEB, 'telar-studio.html');
const ES = (app.getLocale() || 'es').toLowerCase().startsWith('es');

/* Pruebas automaticas, SOLO sin empaquetar: con TELAR_PRUEBA=<carpeta>
   los dialogos no se muestran y devuelven rutas dentro de esa carpeta, y
   los ajustes van ahi tambien. Una app instalada no lo mira. */
const PRUEBA = !app.isPackaged && process.env.TELAR_PRUEBA ? path.resolve(process.env.TELAR_PRUEBA) : null;
if (PRUEBA) app.setPath('userData', path.join(PRUEBA, 'userData'));
const T = (es, en) => (ES ? es : en);

/* ------------------------------------------------ lo que el usuario autorizo */
/* Carpetas elegidas (todo lo de dentro) y archivos concretos (guardados o
   abiertos). La ultima carpeta de exportar se recuerda entre sesiones. */
const AJUSTES = () => path.join(app.getPath('userData'), 'ajustes.json');
let ajustes = {};
function leerAjustes(){ try { ajustes = JSON.parse(fs.readFileSync(AJUSTES(), 'utf8')) || {}; } catch { ajustes = {}; } }
function guardarAjustes(){ try { fs.writeFileSync(AJUSTES(), JSON.stringify(ajustes, null, 2)); } catch {} }

const carpetasPermitidas = new Set();
const archivosPermitidos = new Set();
const normal = r => path.resolve(String(r));
const dentroDe = (r, base) => { const rel = path.relative(base, r); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); };
function permitido(r){
  const n = normal(r);
  if (archivosPermitidos.has(n)) return true;
  for (const c of carpetasPermitidas) if (dentroDe(n, c)) return true;
  return false;
}
function exigir(r){
  if (!permitido(r)) throw new Error(T('Telar solo escribe donde tú has elegido: ', 'Telar only writes where you chose: ') + r);
  return normal(r);
}

/* ------------------------------------------------ IPC */
const ventanaDe = e => BrowserWindow.fromWebContents(e.sender);

ipcMain.handle('telar:elegirCarpeta', async e => {
  const r = PRUEBA ? { filePaths: [path.join(PRUEBA, 'Proyectos')] } : await dialog.showOpenDialog(ventanaDe(e), {
    title: T('Elige dónde guardar el proyecto', 'Choose where to save the project'),
    defaultPath: ajustes.carpetaExportar || app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const c = normal(r.filePaths[0]);
  carpetasPermitidas.add(c);
  ajustes.carpetaExportar = c; guardarAjustes();
  return c;
});

ipcMain.handle('telar:carpetaRecordada', () => {
  const c = ajustes.carpetaExportar;
  if (!c || !fs.existsSync(c)) return null;
  carpetasPermitidas.add(normal(c));
  return c;
});

const FILTRO_TELAR = [{ name: T('Proyecto de Telar Studio', 'Telar Studio project'), extensions: ['json'] }];

ipcMain.handle('telar:guardarComo', async (e, nombre, junto) => {
  const base = junto ? path.dirname(String(junto)) : (ajustes.carpetaProyectos || app.getPath('documents'));
  const r = PRUEBA ? { filePath: path.join(PRUEBA, path.basename(String(nombre))) } : await dialog.showSaveDialog(ventanaDe(e), {
    title: T('Guardar el proyecto', 'Save the project'),
    defaultPath: path.join(base, path.basename(String(nombre || 'proyecto.telar.json'))),
    filters: FILTRO_TELAR,
  });
  if (r.canceled || !r.filePath) return null;
  const f = normal(r.filePath);
  archivosPermitidos.add(f);
  ajustes.carpetaProyectos = path.dirname(f); guardarAjustes();
  return f;
});

ipcMain.handle('telar:abrirArchivo', async e => {
  const r = PRUEBA ? { filePaths: [path.join(PRUEBA, 'abrir.telar.json')] } : await dialog.showOpenDialog(ventanaDe(e), {
    title: T('Abrir un proyecto', 'Open a project'),
    defaultPath: ajustes.carpetaProyectos || app.getPath('documents'),
    properties: ['openFile'], filters: FILTRO_TELAR,
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const f = normal(r.filePaths[0]);
  archivosPermitidos.add(f);
  ajustes.carpetaProyectos = path.dirname(f); guardarAjustes();
  return f;
});

ipcMain.handle('telar:leer', (e, r) => fs.promises.readFile(exigir(r)));
ipcMain.handle('telar:escribir', async (e, r, datos) => {
  const f = exigir(r);
  await fs.promises.mkdir(path.dirname(f), { recursive: true });
  await fs.promises.writeFile(f, typeof datos === 'string' ? datos : Buffer.from(datos));
  return true;
});
ipcMain.handle('telar:crearCarpeta', async (e, r) => { await fs.promises.mkdir(exigir(r), { recursive: true }); return true; });
ipcMain.handle('telar:esCarpeta', (e, r) => { try { return permitido(r) && fs.statSync(normal(r)).isDirectory(); } catch { return false; } });
ipcMain.handle('telar:esArchivo', (e, r) => { try { return permitido(r) && fs.statSync(normal(r)).isFile(); } catch { return false; } });

/* ------------------------------------------------ la ventana */
function crearVentana(){
  const v = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 680,
    backgroundColor: '#14161c', title: 'Telar Studio', show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'recursos', 'icono.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
    },
  });
  v.once('ready-to-show', () => v.show());
  v.loadFile(PAGINA);

  /* Enlaces: la documentacion (local) en otra ventana; lo de internet, en
     el navegador del sistema. Nada navega fuera de Telar. */
  v.webContents.setWindowOpenHandler(({ url }) => {
    let local = null; try { if (url.startsWith('file:')) local = fileURLToPath(url); } catch {}
    if (local && dentroDe(normal(local), WEB))
      return { action: 'allow', overrideBrowserWindowOptions: {
        width: 1200, height: 900, backgroundColor: '#14161c', autoHideMenuBar: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } } };
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  /* Soltar un archivo encima de la ventana la haria navegar a el */
  v.webContents.on('will-navigate', (e, url) => { if (url !== v.webContents.getURL()) e.preventDefault(); });

  /* Cerrar con cambios sin guardar: Telar lo marca con beforeunload; en
     Electron eso no pregunta solo, asi que se pregunta aqui. */
  v.webContents.on('will-prevent-unload', e => {
    const r = dialog.showMessageBoxSync(v, {
      type: 'warning', title: 'Telar Studio',
      message: T('Hay cambios sin guardar', 'There are unsaved changes'),
      detail: T('Si cierras ahora, se pierden.', 'If you close now, they are lost.'),
      buttons: [T('Cerrar sin guardar', 'Close without saving'), T('Cancelar', 'Cancel')],
      defaultId: 1, cancelId: 1,
    });
    if (r === 0) e.preventDefault();       /* preventDefault aqui = dejar cerrar */
  });
  return v;
}

/* Menu: en macOS hace falta el de Edicion para copiar y pegar con Cmd. Sin
   Deshacer: Ctrl+Z / Cmd+Z los lleva Telar (su propio historial). */
function menu(){
  const edicion = { label: T('Edición', 'Edit'), submenu: [
    { role: 'cut', label: T('Cortar', 'Cut') }, { role: 'copy', label: T('Copiar', 'Copy') },
    { role: 'paste', label: T('Pegar', 'Paste') }, { role: 'selectAll', label: T('Seleccionar todo', 'Select all') }] };
  const ver = { label: T('Ver', 'View'), submenu: [
    { role: 'togglefullscreen', label: T('Pantalla completa', 'Full screen') },
    ...(app.isPackaged ? [] : [{ role: 'reload' }, { role: 'toggleDevTools' }])] };
  if (process.platform === 'darwin')
    return Menu.buildFromTemplate([{ role: 'appMenu' }, edicion, ver, { role: 'windowMenu' }]);
  return app.isPackaged ? null : Menu.buildFromTemplate([edicion, ver]);
}

/* Una sola ventana: abrir la app otra vez trae la que ya esta */
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const v = BrowserWindow.getAllWindows()[0];
    if (v){ if (v.isMinimized()) v.restore(); v.focus(); }
  });
  app.whenReady().then(() => {
    leerAjustes();
    Menu.setApplicationMenu(menu());
    crearVentana();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) crearVentana(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
