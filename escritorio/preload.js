/* =====================================================================
 * TELAR STUDIO DE ESCRITORIO — el puente con la pagina
 *
 * Deja en window.telarNativo unas pocas funciones del sistema, y nada
 * mas: la pagina no tiene Node ni acceso libre al disco. puente-escritorio.js
 * (dentro de Telar Studio) monta con ellas los selectores de archivos.
 * ===================================================================== */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const pide = canal => (...a) => ipcRenderer.invoke('telar:' + canal, ...a);

contextBridge.exposeInMainWorld('telarNativo', {
  sep: process.platform === 'win32' ? '\\' : '/',
  plataforma: process.platform,
  elegirCarpeta: pide('elegirCarpeta'),
  carpetaRecordada: pide('carpetaRecordada'),
  guardarComo: pide('guardarComo'),
  abrirArchivo: pide('abrirArchivo'),
  leer: pide('leer'),
  escribir: pide('escribir'),
  crearCarpeta: pide('crearCarpeta'),
  esCarpeta: pide('esCarpeta'),
  esArchivo: pide('esArchivo'),
});
