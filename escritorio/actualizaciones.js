/* =====================================================================
 * TELAR STUDIO DE ESCRITORIO — las actualizaciones
 *
 * Al abrir (y cada 6 horas) mira en GitHub Releases si hay una version
 * mas nueva. Solo hay version nueva cuando se publica una etiqueta v*:
 * lo que se sube a main sin version no llega a nadie.
 *
 *  - Windows y Linux AppImage: electron-updater la descarga en segundo
 *    plano y pregunta si reiniciar; si no, se instala al cerrar Telar.
 *  - macOS y el .deb: solo se avisa, con un boton a la descarga. Apple no
 *    deja actualizar sola una app sin firmar, y el .deb lo instala el
 *    sistema.
 *
 * Sin conexion, o si algo falla, no molesta: se apunta en
 * actualizaciones.log (en la carpeta de datos de la app) y ya esta.
 * ===================================================================== */
'use strict';
const { app, dialog, shell, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const REPO = 'ailoviot/TelarStudio';
const DESCARGA = `https://github.com/${REPO}/releases/latest`;
const CADA = 6 * 3600 * 1000;

/* 1.2.0 > 1.10.0? No: se compara numero a numero */
function esMasNueva(a, b){
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0), pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++){ if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
  return false;
}

module.exports = function actualizaciones(T){
  if (!app.isPackaged) return;              /* con npm start no hay nada que actualizar */
  const log = m => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'actualizaciones.log'), `${new Date().toISOString()} ${m}\n`); } catch {} };
  const ventana = () => BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const sola = process.platform === 'win32' || (process.platform === 'linux' && !!process.env.APPIMAGE);
  let avisada = null;

  if (sola){
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = { info: log, warn: log, error: log, debug(){} };
    autoUpdater.on('error', e => log('error: ' + (e && e.message)));
    autoUpdater.on('update-downloaded', async info => {
      if (avisada === info.version) return;
      avisada = info.version;
      const r = await dialog.showMessageBox(ventana(), {
        type: 'info', title: 'Telar Studio',
        message: T(`Hay una versión nueva de Telar Studio: ${info.version}`, `A new version of Telar Studio is available: ${info.version}`),
        detail: T('Ya está descargada. Reinicia para usarla; si no, se instala sola al cerrar Telar.',
                  'It is already downloaded. Restart to use it; otherwise it installs when you close Telar.'),
        buttons: [T('Reiniciar ahora', 'Restart now'), T('Más tarde', 'Later')], defaultId: 0, cancelId: 1,
      });
      /* si hay cambios sin guardar, cerrar la ventana todavia pregunta */
      if (r.response === 0) autoUpdater.quitAndInstall();
    });
    const mirar = () => autoUpdater.checkForUpdates().catch(e => log('mirar: ' + (e && e.message)));
    setTimeout(mirar, 8000);
    setInterval(mirar, CADA);
    return;
  }

  /* macOS y .deb: solo el aviso, con la descarga */
  const mirar = async () => {
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'TelarStudio' } });
      if (!r.ok) return log('api: ' + r.status);
      const v = String((await r.json()).tag_name || '').replace(/^v/, '');
      if (!v || avisada === v || !esMasNueva(v, app.getVersion())) return;
      avisada = v;
      const res = await dialog.showMessageBox(ventana(), {
        type: 'info', title: 'Telar Studio',
        message: T(`Hay una versión nueva de Telar Studio: ${v}`, `A new version of Telar Studio is available: ${v}`),
        detail: T('Descárgala en GitHub e instálala encima: tus proyectos no se tocan.',
                  'Download it from GitHub and install it over this one: your projects are not touched.'),
        buttons: [T('Descargar', 'Download'), T('Más tarde', 'Later')], defaultId: 0, cancelId: 1,
      });
      if (res.response === 0) shell.openExternal(DESCARGA);
    } catch (e) { log('mirar: ' + (e && e.message)); }
  };
  setTimeout(mirar, 8000);
  setInterval(mirar, CADA);
};
module.exports.esMasNueva = esMasNueva;
