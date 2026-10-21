import * as THREE from 'three';
import { crearResplandor } from './resplandor.js';

// Siete candeleros de oro en semicírculo, abiertos hacia la boca de la cueva.

export function crearCandeleros(centro, radio = 3) {
  const grupo = new THREE.Group();
  const oro = new THREE.MeshStandardMaterial({ color: 0xc99a3a, metalness: 0.85, roughness: 0.35 });
  const geoBase = new THREE.CylinderGeometry(0.28, 0.34, 0.1, 20);
  const geoTallo = new THREE.CylinderGeometry(0.04, 0.06, 1.3, 12);
  const geoCopa = new THREE.CylinderGeometry(0.17, 0.05, 0.16, 20, 1, true);

  const lista = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 6;
    const c = new THREE.Group();
    c.position.set(centro.x + Math.sin(a) * radio, 0, centro.z + Math.cos(a) * radio * 0.8);

    const base = new THREE.Mesh(geoBase, oro);
    base.position.y = 0.05;
    const tallo = new THREE.Mesh(geoTallo, oro);
    tallo.position.y = 0.75;
    const copa = new THREE.Mesh(geoCopa, oro);
    copa.position.y = 1.45;
    c.add(base, tallo, copa);

    const llama = crearResplandor(0xffb050, 0.5);
    llama.position.y = 1.62;
    llama.scale.set(0.3, 0.5, 1);
    const halo = crearResplandor(0xff8a30, 1.6);
    halo.position.y = 1.6;
    const luz = new THREE.PointLight(0xff9a40, 0, 6, 2);
    luz.position.y = 1.7;
    c.add(llama, halo, luz);

    grupo.add(c);
    lista.push({ grupo: c, llama, halo, luz, intensidad: 0, fase: Math.random() * 10 });
  }

  // nivel de 0 (apagado) a 1 (encendido) para el candelero i
  function encender(i, nivel) {
    lista[i].intensidad = nivel;
  }

  function actualizar(t) {
    for (const c of lista) {
      // Antes de encenderse, el candelero no existe: solo hay oscuridad.
      c.grupo.visible = c.intensidad > 0;
      const parpadeo = 1 + Math.sin(t * 9 + c.fase) * 0.06 + Math.sin(t * 23 + c.fase) * 0.04;
      const k = c.intensidad * parpadeo;
      c.luz.intensity = 2 * k;
      c.llama.material.opacity = Math.min(1, c.intensidad * 1.5);
      c.llama.scale.set(0.3 * parpadeo, 0.5 * k + 0.001, 1);
      c.halo.material.opacity = 0.35 * k;
    }
  }

  function apagarTodo() {
    for (let i = 0; i < 7; i++) encender(i, 0);
  }

  // Posiciones (para que la cámara pueda mirarlos uno por uno).
  const posiciones = grupo.children.map((c) => c.position.clone());

  return { grupo, encender, actualizar, apagarTodo, posiciones };
}
