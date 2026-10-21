import * as THREE from 'three';
import { fbm } from '../../core/ruido.js';
import { materialPBR } from '../../core/cargador.js';

// Cueva de roca: un túnel continuo de paredes irregulares, cerrado al fondo
// y abierto hacia el mar. Va de z = +6 (fondo) a z = BOCA_Z (boca).

export const BOCA_Z = -19.5;
const FONDO_Z = 6.2;
const CENTRO_Y = 1.8;
const RADIO_X = 4.6;
const RADIO_Y = 3.3;

function crearTunel() {
  const anillos = 70;
  const lados = 72;
  const pos = [];
  const uv = [];
  for (let i = 0; i <= anillos; i++) {
    const t = i / anillos;
    const z = THREE.MathUtils.lerp(FONDO_Z, BOCA_Z, t);
    // Fondo redondeado (se cierra como una cúpula) y boca algo más estrecha.
    let escala = 1;
    if (z > 1) escala = Math.sqrt(Math.max(0, 1 - ((z - 1) / (FONDO_Z - 1 + 0.01)) ** 2));
    if (z < BOCA_Z + 5) escala *= THREE.MathUtils.lerp(0.8, 1, (z - BOCA_Z) / 5);
    for (let j = 0; j <= lados; j++) {
      const a = (j / lados) * Math.PI * 2;
      const cx = Math.cos(a);
      const cy = Math.sin(a);
      // Ruido continuo alrededor del túnel (usa la posición sobre un cilindro, sin costura).
      const n1 = fbm(cx * 1.4 + 10, cy * 1.4, z * 0.22, 4);
      const n2 = fbm(cx * 4 + 3, cy * 4, z * 0.7, 3);
      const borde = z < BOCA_Z + 2 ? 1.8 : 1; // la boca, más quebrada
      const r = escala * (1 + 0.22 * n1 * borde + 0.07 * n2);
      let x = cx * RADIO_X * r;
      let y = CENTRO_Y + cy * RADIO_Y * r;
      // Bajo el suelo, la roca se esconde debajo del piso.
      if (y < 0.05) y = -0.05 - Math.abs(n2) * 0.2;
      pos.push(x, y, z + n2 * 0.25 * escala);
      uv.push((j / lados) * 8, (z - FONDO_Z) / -3);
    }
  }
  const indices = [];
  for (let i = 0; i < anillos; i++) {
    for (let j = 0; j < lados; j++) {
      const a = i * (lados + 1) + j;
      const b = a + lados + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function crearSuelo() {
  const geo = new THREE.PlaneGeometry(10, 34, 40, 136);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i) - 9;
    // Desniveles suaves, sin molestar el camino central.
    const lejos = Math.min(1, Math.abs(x) / 2.5);
    p.setY(i, fbm(x * 0.6, 0, z * 0.6, 3) * 0.06 + fbm(x * 0.3 + 5, 1, z * 0.3, 2) * 0.25 * lejos * lejos);
    p.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Rocas sueltas apoyadas contra las paredes.
function crearPiedras(material) {
  const grupo = new THREE.Group();
  const base = new THREE.IcosahedronGeometry(1, 3);
  const variantes = [0, 1, 2].map((k) => {
    const g = base.clone();
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d = 1 + 0.3 * fbm(v.x * 1.3 + k * 7, v.y * 1.3, v.z * 1.3, 4);
      v.multiplyScalar(d);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
  const lugares = [
    [-3.4, 1.2, 0.2], [3.3, 2.5, 1.1], [-3.1, -4.5, 0.9], [3.5, -6, 0.7], [-3.6, -11, 1.0],
    [3.2, -13.5, 0.8], [-2.9, -16.5, 0.6], [2.6, -17.5, 0.5], [-2.2, -1.5, 0.35], [2.4, -9, 0.4],
  ];
  lugares.forEach(([x, z, s], i) => {
    const m = new THREE.Mesh(variantes[i % 3], material);
    m.position.set(x, s * 0.35, z);
    m.scale.set(s * 1.2, s * 0.8, s);
    m.rotation.set(i, i * 2.1, i * 0.7);
    grupo.add(m);
  });
  return grupo;
}

export function crearCueva() {
  const grupo = new THREE.Group();

  const roca = materialPBR('roca', [1, 1], { side: THREE.DoubleSide, color: 0xb8a892 });
  grupo.add(new THREE.Mesh(crearTunel(), roca));

  const suelo = materialPBR('suelo', [4, 13], { color: 0xa09080 });
  grupo.add(new THREE.Mesh(crearSuelo(), suelo));

  grupo.add(crearPiedras(materialPBR('roca', [2, 2], { color: 0xa89884 })));

  return grupo;
}
