import * as THREE from 'three';

// Escena de prueba (paso 1): fondo oscuro, luz cálida y un candelero dorado girando.
export function crearEscenaPrueba() {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x050403);

  const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camara.position.set(0, 1.2, 5.5);
  camara.lookAt(0, 0.4, 0);

  escena.add(new THREE.AmbientLight(0x332211, 0.6));
  const luzCalida = new THREE.PointLight(0xffb060, 30, 20);
  luzCalida.position.set(1.5, 3, 2.5);
  escena.add(luzCalida);

  const oro = new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 0.9, roughness: 0.3 });
  const candelero = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.15, 32), oro);
  base.position.y = 0.075;
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.6, 24), oro);
  tallo.position.y = 0.95;
  const nudo = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 12, 32), oro);
  nudo.rotation.x = Math.PI / 2;
  nudo.position.y = 0.9;
  const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.08, 0.25, 32, 1, true), oro);
  copa.position.y = 1.85;
  candelero.add(base, tallo, nudo, copa);

  const llama = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd27a })
  );
  llama.scale.y = 1.8;
  llama.position.y = 2.05;
  const luzLlama = new THREE.PointLight(0xffa040, 4, 6);
  luzLlama.position.y = 2.1;
  candelero.add(llama, luzLlama);
  escena.add(candelero);

  function actualizar(t) {
    candelero.rotation.y = t * 0.3;
    luzLlama.intensity = 4 + Math.sin(t * 9) * 0.4 + Math.sin(t * 23) * 0.2;
  }

  // Encuadre: en pantallas angostas (Fold doblado) alejamos la cámara para que quepa el candelero.
  function ajustarEncuadre(aspecto) {
    camara.aspect = aspecto;
    camara.position.z = aspecto < 0.8 ? 4.4 / Math.max(aspecto, 0.4) : 5.5;
    camara.updateProjectionMatrix();
  }

  return { escena, camara, actualizar, ajustarEncuadre };
}
