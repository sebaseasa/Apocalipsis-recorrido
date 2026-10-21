import * as THREE from 'three';
import { crearCueva, BOCA_Z } from './cueva.js';
import { crearMar } from './mar.js';
import { crearCandeleros } from './candeleros.js';
import { crearFigura } from './figura.js';
import { crearAtmosfera } from './atmosfera.js';

// Arma el mundo de la escena 1. El guion (guion.js) decide qué pasa y cuándo.

export const CENTRO = new THREE.Vector3(0, 0, -8); // donde aparece el Hijo del hombre

export function crearEscena() {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x000000);
  escena.fog = new THREE.FogExp2(0x1c140e, 0.04);

  escena.add(crearCueva());
  const mar = crearMar();
  escena.add(mar.grupo);

  // Luz del atardecer que entra por la boca y se apaga hacia el fondo.
  const luzBoca = new THREE.PointLight(0xffa060, 40, 32, 1.5);
  luzBoca.position.set(0, 3, BOCA_Z - 1);
  escena.add(luzBoca);
  // Sol bajo que entra rasante y dora el suelo cerca de la boca.
  const sol = new THREE.SpotLight(0xffb070, 30, 30, 0.5, 0.8, 1.2);
  sol.position.set(0, 4, BOCA_Z - 8);
  sol.target.position.set(0, 0, BOCA_Z + 10);
  escena.add(sol, sol.target);
  const ambiente = new THREE.HemisphereLight(0x3a3048, 0x120c08, 0.3);
  escena.add(ambiente);

  const atmosfera = crearAtmosfera(BOCA_Z);
  escena.add(atmosfera.grupo);

  const candeleros = crearCandeleros(CENTRO, 3);
  escena.add(candeleros.grupo);

  const figura = crearFigura(CENTRO);
  escena.add(figura.grupo);

  // Reflejos del cielo, solo para el oro (la roca no debe brillar con el cielo).
  function prepararReflejos(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    mar.mapa.mapping = THREE.EquirectangularReflectionMapping;
    const env = pmrem.fromEquirectangular(mar.mapa).texture;
    mar.mapa.mapping = THREE.UVMapping;
    pmrem.dispose();
    escena.traverse((o) => {
      if (o.material?.metalness > 0.5) {
        o.material.envMap = env;
        o.material.envMapIntensity = 0.35;
        o.material.needsUpdate = true;
      }
    });
  }

  function reiniciar() {
    candeleros.apagarTodo();
    figura.reiniciar();
    luzBoca.intensity = 40;
    sol.intensity = 30;
  }

  function actualizar(t) {
    mar.actualizar(t);
    atmosfera.actualizar(t);
    candeleros.actualizar(t);
    figura.actualizar(t);
  }

  return { escena, candeleros, figura, luzBoca, sol, atmosfera, mar, prepararReflejos, reiniciar, actualizar };
}
