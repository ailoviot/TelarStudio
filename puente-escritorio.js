/* =====================================================================
 * TELAR STUDIO DE ESCRITORIO
 *
 * (No se llama escritorio.js a proposito: al lado esta la carpeta
 * escritorio/ con la app, y Electron, al arrancar esa carpeta, cogia
 * este archivo en su lugar.)
 *
 * En el navegador este archivo no hace nada. Dentro de la aplicacion de
 * escritorio (Electron), el preload deja en window.telarNativo unas pocas
 * funciones del sistema: elegir carpeta, guardar como, abrir, leer y
 * escribir. Con ellas se montan aqui showDirectoryPicker,
 * showSaveFilePicker y showOpenFilePicker con la misma forma que los de
 * Chrome, y el resto de Telar no cambia: exportar, guardar y abrir siguen
 * siendo el mismo codigo, con los dialogos del sistema, sin avisos de
 * permisos y con Documentos, el Escritorio y Descargas disponibles.
 *
 * Los errores se lanzan como en Chrome (DOMException AbortError al
 * cancelar, NotFoundError si no existe), porque el codigo de Telar los
 * mira por su nombre.
 * ===================================================================== */
(function () {
  'use strict';
  const N = window.telarNativo;
  if (!N) return;

  document.documentElement.classList.add('escritorio');

  const nombreDe = r => String(r).split(/[\\/]/).pop();
  const une = (a, b) => String(a).replace(/[\\/]+$/, '') + N.sep + b;
  const cancelado = () => new DOMException('Cancelado', 'AbortError');
  const noExiste = n => new DOMException(`No existe: ${n}`, 'NotFoundError');

  /* Lo que se escribe en un createWritable: un texto, o bytes */
  async function juntar(partes){
    if (partes.length === 1 && typeof partes[0] === 'string') return partes[0];
    const b = new Blob(partes.map(p => p instanceof ArrayBuffer || ArrayBuffer.isView(p) || typeof p === 'string' ? p : String(p)));
    return new Uint8Array(await b.arrayBuffer());
  }

  function archivo(ruta){
    return {
      kind: 'file', name: nombreDe(ruta), __ruta: ruta,
      async getFile(){ return new File([await N.leer(ruta)], nombreDe(ruta)); },
      async createWritable(){
        const partes = [];
        return { async write(x){ partes.push(x); }, async close(){ await N.escribir(ruta, await juntar(partes)); } };
      },
      async queryPermission(){ return 'granted'; },
      async requestPermission(){ return 'granted'; },
    };
  }

  function carpeta(ruta){
    return {
      kind: 'directory', name: nombreDe(ruta), __ruta: ruta,
      async getDirectoryHandle(n, o = {}){
        const r = une(ruta, n);
        if (o.create) await N.crearCarpeta(r);
        else if (!(await N.esCarpeta(r))) throw noExiste(n);
        return carpeta(r);
      },
      async getFileHandle(n, o = {}){
        const r = une(ruta, n);
        if (!o.create && !(await N.esArchivo(r))) throw noExiste(n);
        return archivo(r);
      },
      async queryPermission(){ return 'granted'; },
      async requestPermission(){ return 'granted'; },
    };
  }

  window.showDirectoryPicker = async () => {
    const r = await N.elegirCarpeta();
    if (!r) throw cancelado();
    return carpeta(r);
  };
  window.showSaveFilePicker = async (o = {}) => {
    const r = await N.guardarComo(o.suggestedName || 'proyecto.telar.json', o.startIn && o.startIn.__ruta);
    if (!r) throw cancelado();
    return archivo(r);
  };
  window.showOpenFilePicker = async () => {
    const r = await N.abrirArchivo();
    if (!r) throw cancelado();
    return [archivo(r)];
  };

  /* La carpeta de exportar la recuerda el proceso principal (la apunta al
     elegirla): en IndexedDB no cabe un objeto con funciones.
     OJO: se ponen al terminar de cargar. Telar define carpetaRecordada y
     recordarCarpeta en un <script> que va DESPUES de este archivo, y esa
     definicion pisaria la de aqui. */
  const sustituir = () => {
    window.carpetaRecordada = async () => {
      const r = await N.carpetaRecordada();
      return r ? carpeta(r) : null;
    };
    window.recordarCarpeta = async () => {};
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sustituir);
  else sustituir();
})();
