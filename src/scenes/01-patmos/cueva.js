import * as THREE from 'three';

// Cueva hecha con formas básicas: un suelo y muchas rocas (poliedros) apiladas.
// Medidas: la cueva va de z = +5 (fondo) a z = -19 (boca hacia el mar).

export const BOCA_Z = -19;

function azar(semilla) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function crearCueva() {
  const grupo = new THREE.Group();
  const r = azar(7);

  const roca = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });

  const suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 30, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 1 })
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.z = -7;
  grupo.add(suelo);

  // Lista de rocas: [x, y, z, tamaño]
  const rocas = [];
  for (let z = 6; z > BOCA_Z - 1; z -= 1.3) {
    const cerca = z < BOCA_Z + 4; // la boca se estrecha un poco
    const ancho = cerca ? 3.6 : 4.8;
    for (const lado of [-1, 1]) {
      rocas.push([lado * (ancho + r() * 0.8), 0.3 + r() * 0.8, z, 1.2 + r() * 0.8]);
      rocas.push([lado * (ancho - 0.3 + r() * 0.8), 2.2 + r() * 0.8, z + r(), 1.1 + r() * 0.7]);
      rocas.push([lado * (ancho - 1.4 + r()), 4 + r() * 0.6, z + r(), 1.2 + r() * 0.6]);
    }
    for (let x = -2.5; x <= 2.5; x += 1.6) {
      rocas.push([x + r() * 0.6, (cerca ? 4.4 : 5.2) + r() * 0.6, z + r(), 1.2 + r() * 0.6]);
    }
  }
  // Pared del fondo.
  for (let x = -5; x <= 5; x += 1.5) {
    for (let y = 0; y <= 5; y += 1.5) {
      rocas.push([x + r() * 0.5, y + r() * 0.5, 6.5 + r(), 1.4 + r() * 0.6]);
    }
  }
  // Piedras sueltas en el suelo, lejos del camino central.
  for (let i = 0; i < 14; i++) {
    const lado = r() < 0.5 ? -1 : 1;
    rocas.push([lado * (2 + r() * 2), 0, 4 - r() * 20, 0.2 + r() * 0.4]);
  }

  const geo = new THREE.IcosahedronGeometry(1, 0);
  const malla = new THREE.InstancedMesh(geo, roca, rocas.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  rocas.forEach(([x, y, z, s], i) => {
    e.set(r() * 3, r() * 3, r() * 3);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.7 + r() * 0.5), s));
    malla.setMatrixAt(i, m);
    malla.setColorAt(i, color.setHSL(0.07 + r() * 0.03, 0.18, 0.16 + r() * 0.08));
  });
  grupo.add(malla);

  // Repisa de roca fuera de la boca y caída hacia el mar.
  const repisa = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 4), new THREE.MeshStandardMaterial({ color: 0x2e241b, roughness: 1 }));
  repisa.position.set(0, -0.5, BOCA_Z - 2);
  grupo.add(repisa);

  return grupo;
}
