import * as THREE from 'three';
import { crearCueva, BOCA_Z } from './cueva.js';
import { crearMar } from './mar.js';
import { crearCandeleros } from './candeleros.js';
import { crearFigura } from './figura.js';

// Arma el mundo de la escena 1. El guion (guion.js) decide qué pasa y cuándo.

export const CENTRO = new THREE.Vector3(0, 0, -8); // donde aparece el Hijo del hombre

export function crearEscena() {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x000000);
  escena.fog = new THREE.FogExp2(0x1a120c, 0.045);

  escena.add(crearCueva());
  const mar = crearMar();
  escena.add(mar.grupo);

  // Luz del atardecer que entra por la boca y se apaga hacia el fondo.
  const luzBoca = new THREE.PointLight(0xff9a55, 35, 30, 1.6);
  luzBoca.position.set(0, 3, BOCA_Z - 1);
  escena.add(luzBoca);
  const ambiente = new THREE.HemisphereLight(0x40324a, 0x100a06, 0.25);
  escena.add(ambiente);

  const candeleros = crearCandeleros(CENTRO, 3);
  escena.add(candeleros.grupo);

  const figura = crearFigura(CENTRO);
  escena.add(figura.grupo);

  function reiniciar() {
    candeleros.apagarTodo();
    Object.assign(figura.estado, { presencia: 0, sol: 0, estrellas: 0 });
    luzBoca.intensity = 35;
  }

  function actualizar(t) {
    mar.actualizar(t);
    candeleros.actualizar(t);
    figura.actualizar(t);
  }

  return { escena, candeleros, figura, luzBoca, reiniciar, actualizar };
}
