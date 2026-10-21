import * as THREE from 'three';
import { crearResplandor } from './resplandor.js';

// El Hijo del hombre: solo una silueta de luz, sin rostro.
// Vestidura larga hasta los pies, cinto de oro en el pecho,
// y siete estrellas sobre su mano derecha (a la izquierda de quien lo mira).

export function crearFigura(posicion) {
  const grupo = new THREE.Group();
  grupo.position.copy(posicion);
  grupo.rotation.y = Math.PI; // mira hacia la boca de la cueva (-z)

  const luzBlanca = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false });
  luzBlanca.color.setScalar(2.2); // más que blanco, para que el brillo lo envuelva

  // Vestidura: un perfil girado (ancho abajo, angosto en los hombros).
  const perfil = [
    [0.0, 0], [0.48, 0], [0.42, 0.5], [0.34, 1.1], [0.3, 1.5], [0.32, 1.7], [0.22, 1.85], [0.12, 1.9], [0, 1.9],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const vestidura = new THREE.Mesh(new THREE.LatheGeometry(perfil, 24), luzBlanca);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), luzBlanca);
  cabeza.position.y = 2.07;
  cabeza.scale.y = 1.15;

  // Brazos: cilindros sencillos; el derecho algo levantado, con las estrellas.
  const geoBrazo = new THREE.CylinderGeometry(0.06, 0.08, 0.75, 10);
  const brazoDer = new THREE.Mesh(geoBrazo, luzBlanca);
  brazoDer.position.set(-0.42, 1.45, 0.1);
  brazoDer.rotation.set(-0.9, 0, -0.5);
  const brazoIzq = new THREE.Mesh(geoBrazo, luzBlanca);
  brazoIzq.position.set(0.38, 1.35, 0);
  brazoIzq.rotation.z = 0.25;

  const oro = new THREE.MeshStandardMaterial({
    color: 0xd9a640, emissive: 0xb07818, emissiveIntensity: 0, metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0,
  });
  const cinto = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.04, 8, 32), oro);
  cinto.rotation.x = Math.PI / 2;
  cinto.position.y = 1.55;

  const cuerpo = new THREE.Group();
  cuerpo.add(vestidura, cabeza, brazoDer, brazoIzq, cinto);
  grupo.add(cuerpo);

  // Resplandor que rodea la figura y halo de la cabeza ("como el sol").
  const aura = crearResplandor(0xfff4dd, 6);
  aura.position.y = 1.2;
  aura.scale.set(4.5, 6, 1);
  const halo = crearResplandor(0xffffff, 1.4);
  halo.position.y = 2.07;
  grupo.add(aura, halo);

  const luz = new THREE.PointLight(0xfff1dd, 0, 12, 2);
  luz.position.set(0, 1.8, 0.8);
  grupo.add(luz);

  // Siete estrellas girando sobre la mano derecha.
  const estrellas = new THREE.Group();
  estrellas.position.set(-0.62, 2.0, 0.35);
  for (let i = 0; i < 7; i++) {
    const e = crearResplandor(0xcfe2ff, 0.18);
    estrellas.add(e);
  }
  grupo.add(estrellas);

  const estado = { presencia: 0, sol: 0, estrellas: 0 };

  function actualizar(t) {
    const p = estado.presencia;
    grupo.visible = p > 0;
    luzBlanca.opacity = p;
    oro.opacity = p;
    oro.emissiveIntensity = p * 0.8;
    const pulso = 1 + Math.sin(t * 1.3) * 0.04;
    aura.material.opacity = p * 0.55 * pulso + estado.sol * 0.3;
    halo.material.opacity = p * 0.7 + estado.sol * 0.3;
    halo.scale.setScalar(1.4 + estado.sol * 1.6);
    luz.intensity = p * 2.5 + estado.sol * 2;
    estrellas.children.forEach((e, i) => {
      const a = t * 0.4 + (i * Math.PI * 2) / 7;
      e.position.set(Math.cos(a) * 0.22, Math.sin(t * 2 + i) * 0.03, Math.sin(a) * 0.22);
      e.material.opacity = estado.estrellas * (0.8 + Math.sin(t * 5 + i * 2) * 0.2);
    });
  }

  return { grupo, estado, actualizar };
}
