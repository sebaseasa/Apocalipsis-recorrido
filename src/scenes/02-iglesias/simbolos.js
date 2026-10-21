import * as THREE from 'three';
import { crearResplandor, texturaResplandor, texturaRayos } from '../01-patmos/resplandor.js';

// Símbolos que nombra el texto de las cartas (Apocalipsis 2-3).
// Cada uno tiene un nivel de 0 (oculto) a 1 (visible) en `estado`.

const oro = () =>
  new THREE.MeshStandardMaterial({
    color: 0xe0b050, emissive: 0xffb030, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.3, transparent: true, opacity: 0,
  });

// Árbol de la vida (2:7): tronco y ramas de luz, hojas que brillan.
function crearArbol() {
  const grupo = new THREE.Group();
  const madera = new THREE.MeshStandardMaterial({
    color: 0xb08850, emissive: 0x8a6a30, emissiveIntensity: 0.45, roughness: 0.85, transparent: true, opacity: 0,
  });
  const hojas = [];
  let semilla = 3;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
  function rama(origen, dir, largo, grosor, nivel) {
    const fin = origen.clone().addScaledVector(dir, largo);
    const geo = new THREE.CylinderGeometry(grosor * 0.7, grosor, largo, 8);
    geo.translate(0, largo / 2, 0);
    const m = new THREE.Mesh(geo, madera);
    m.position.copy(origen);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    grupo.add(m);
    if (nivel === 0) {
      for (let i = 0; i < 9; i++) hojas.push(fin.clone().add(new THREE.Vector3(azar() - 0.5, azar() - 0.35, azar() - 0.5).multiplyScalar(0.9)));
      return;
    }
    const n = nivel === 3 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + azar();
      // Ramas que se abren hacia los lados, como una copa amplia.
      const nueva = new THREE.Vector3(Math.cos(a) * 1.1, 0.8, Math.sin(a) * 1.1).normalize().lerp(dir, 0.25).normalize();
      rama(fin, nueva, largo * 0.68, grosor * 0.62, nivel - 1);
    }
  }
  rama(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 1.2, 0.14, 3);
  const hojasSprites = hojas.map((p) => {
    const s = crearResplandor(azar() > 0.4 ? 0x9fe08a : 0xfff0a0, 0.4 + azar() * 0.4);
    s.position.copy(p);
    grupo.add(s);
    return s;
  });
  const luz = new THREE.PointLight(0xfff0c0, 0, 8, 2);
  luz.position.set(0, 2.2, 0);
  grupo.add(luz);
  return {
    grupo,
    actualizar(n, t) {
      grupo.visible = n > 0;
      grupo.scale.setScalar(1.5 * (0.5 + 0.5 * n));
      madera.opacity = n;
      hojasSprites.forEach((s, i) => (s.material.opacity = n * (0.4 + 0.15 * Math.sin(t * 1.5 + i))));
      luz.intensity = n * 4;
    },
  };
}

// Corona (2:10 "la corona de la vida"; 3:11 "tu corona"): aro de hojas de oro.
function crearCorona() {
  const grupo = new THREE.Group();
  const mat = oro();
  const hoja = new THREE.SphereGeometry(0.035, 8, 6);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const m = new THREE.Mesh(hoja, mat);
    m.position.set(Math.cos(a) * 0.2, (i % 2) * 0.02, Math.sin(a) * 0.2);
    m.scale.set(1, 0.45, 1.9);
    m.rotation.y = -a;
    m.rotation.z = (i % 2 ? 1 : -1) * 0.5;
    grupo.add(m);
  }
  const halo = crearResplandor(0xffd27a, 0.9);
  grupo.add(halo);
  return {
    grupo,
    actualizar(n, t) {
      grupo.visible = n > 0;
      mat.opacity = n;
      halo.material.opacity = n * 0.5;
      grupo.rotation.y = t * 0.3;
      grupo.rotation.x = 0.35;
    },
  };
}

// Piedrecita blanca con un nombre nuevo escrito que nadie puede leer (2:17).
function crearPiedra() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f1ea';
  g.fillRect(0, 0, 256, 256);
  g.filter = 'blur(2px)';
  g.strokeStyle = 'rgba(200,150,60,0.8)';
  g.lineWidth = 5;
  g.beginPath();
  for (let x = 60; x < 200; x += 10) g.lineTo(x, 128 + Math.sin(x * 0.3) * 12 + ((x * 7) % 9));
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveIntensity: 0.35, emissiveMap: tex, roughness: 0.6, transparent: true, opacity: 0,
  });
  const piedra = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), mat);
  piedra.scale.set(1.3, 0.45, 1);
  const halo = crearResplandor(0xffffff, 0.7);
  const grupo = new THREE.Group();
  grupo.add(piedra, halo);
  return {
    grupo,
    actualizar(n, t) {
      grupo.visible = n > 0;
      mat.opacity = n;
      halo.material.opacity = n * 0.45;
      piedra.rotation.set(1.1, t * 0.4, 0);
      grupo.position.y = grupo.userData.y + Math.sin(t * 1.2) * 0.04;
    },
  };
}

// La estrella de la mañana (2:28): un lucero muy brillante con rayos.
function crearEstrellaManana() {
  const grupo = new THREE.Group();
  const nucleo = crearResplandor(0xffffff, 0.6);
  const brillo = crearResplandor(0xcfe2ff, 2.2);
  const rayos = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texturaRayos(), color: 0xdde8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  rayos.scale.setScalar(2.4);
  grupo.add(brillo, rayos, nucleo);
  return {
    grupo,
    actualizar(n, t) {
      grupo.visible = n > 0;
      nucleo.material.opacity = n;
      brillo.material.opacity = n * 0.6;
      rayos.material.opacity = n * 0.5;
      rayos.material.rotation = t * 0.05;
      grupo.position.y = grupo.userData.y - 0.6 + n * 0.6; // sube al aparecer
    },
  };
}

// El libro de la vida (3:5), abierto y luminoso.
function crearLibro() {
  const grupo = new THREE.Group();
  const tapa = new THREE.MeshStandardMaterial({ color: 0x6a2a18, roughness: 0.7, transparent: true, opacity: 0 });
  const hoja = new THREE.MeshStandardMaterial({
    color: 0xfff6e0, emissive: 0xfff0d0, emissiveIntensity: 0.6, roughness: 0.9, transparent: true, opacity: 0,
  });
  for (const lado of [-1, 1]) {
    const mitad = new THREE.Group();
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.36), tapa);
    t.position.x = lado * 0.13;
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.34), hoja);
    h.position.set(lado * 0.125, 0.02, 0);
    mitad.add(t, h);
    mitad.rotation.z = lado * -0.18;
    grupo.add(mitad);
  }
  const halo = crearResplandor(0xfff0c0, 1);
  halo.position.y = 0.1;
  grupo.add(halo);
  return {
    grupo,
    actualizar(n) {
      grupo.visible = n > 0;
      tapa.opacity = n;
      hoja.opacity = n;
      halo.material.opacity = n * 0.4;
      grupo.rotation.x = -0.9; // inclinado hacia quien mira
    },
  };
}

// La llave de David (3:7): una sola llave de oro, grande.
function crearLlave() {
  const grupo = new THREE.Group();
  const mat = oro();
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 10, 28), mat);
  anillo.position.y = 0.2;
  const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 10), mat);
  vara.position.y = 0;
  const d1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.015), mat);
  d1.position.set(0.04, -0.12, 0);
  const d2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.015), mat);
  d2.position.set(0.03, -0.065, 0);
  const halo = crearResplandor(0xffd27a, 0.6);
  grupo.add(anillo, vara, d1, d2, halo);
  return {
    grupo,
    actualizar(n, t) {
      grupo.visible = n > 0;
      mat.opacity = n;
      halo.material.opacity = n * 0.5;
      grupo.rotation.y = Math.sin(t * 0.8) * 0.4;
    },
  };
}

// Una puerta (3:8 "una puerta abierta"; 3:20 "estoy á la puerta y llamo"):
// marco de piedra y dos hojas de madera; detrás, luz.
function crearPuerta() {
  const grupo = new THREE.Group();
  const piedra = new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.95, transparent: true, opacity: 0 });
  const madera = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8, transparent: true, opacity: 0 });
  const ancho = 1.3;
  const alto = 2.3;
  const lado = new THREE.BoxGeometry(0.22, alto + 0.2, 0.3);
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(lado, piedra);
    m.position.set(s * (ancho / 2 + 0.11), (alto + 0.2) / 2, 0);
    grupo.add(m);
  }
  const dintel = new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.7, 0.28, 0.34), piedra);
  dintel.position.y = alto + 0.24;
  grupo.add(dintel);
  // Hojas que giran desde sus bisagras.
  const hojas = [-1, 1].map((s) => {
    const bisagra = new THREE.Group();
    bisagra.position.set(s * (ancho / 2), 0, 0);
    const h = new THREE.Mesh(new THREE.BoxGeometry(ancho / 2, alto, 0.06), madera);
    h.position.set(-s * (ancho / 4), alto / 2, 0);
    bisagra.add(h);
    grupo.add(bisagra);
    return { bisagra, s };
  });
  // Luz que espera detrás de la puerta.
  const brillo = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, alto),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.4, 1.2), transparent: true, opacity: 0, fog: false })
  );
  brillo.position.set(0, alto / 2, 0.08);
  brillo.rotation.y = Math.PI;
  grupo.add(brillo);
  // El frente de la puerta mira hacia -z (hacia quien mira); la luz está detrás.
  const luz = new THREE.PointLight(0xfff0d0, 0, 10, 1.6);
  luz.position.set(0, 1.4, 0.6);
  grupo.add(luz);
  const estado = { apertura: 0 };
  return {
    grupo,
    estado,
    actualizar(n) {
      grupo.visible = n > 0;
      piedra.opacity = n;
      madera.opacity = n;
      for (const { bisagra, s } of hojas) bisagra.rotation.y = s * estado.apertura * 1.7;
      brillo.material.opacity = n * (0.2 + estado.apertura * 0.6);
      luz.intensity = n * (0.6 + estado.apertura * 5);
    },
  };
}

// Columna en el templo de mi Dios (3:12): columna de mármol con estrías.
function crearColumna() {
  const geo = new THREE.CylinderGeometry(0.22, 0.25, 2.6, 32, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 - 0.05 * Math.max(0, Math.cos(a * 16));
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  geo.translate(0, 1.4, 0);
  const marmol = new THREE.MeshStandardMaterial({
    color: 0xf4efe6, emissive: 0xfff4e0, emissiveIntensity: 0.25, roughness: 0.4, transparent: true, opacity: 0,
  });
  const grupo = new THREE.Group();
  grupo.add(new THREE.Mesh(geo, marmol));
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.62), marmol);
  base.position.y = 0.07;
  const capitel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.62), marmol);
  capitel.position.y = 2.77;
  grupo.add(base, capitel);
  return {
    grupo,
    actualizar(n) {
      grupo.visible = n > 0;
      marmol.opacity = n;
      grupo.scale.set(1, Math.max(n, 0.001), 1); // se levanta desde el suelo
    },
  };
}

// Oro afinado en fuego (3:18): lingotes que brillan entre llamas.
function crearOroFuego() {
  const grupo = new THREE.Group();
  const mat = oro();
  mat.emissiveIntensity = 1;
  const geo = new THREE.BoxGeometry(0.22, 0.07, 0.1);
  [[-0.12, 0], [0.12, 0], [0, 0.07]].forEach(([x, y]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y + 0.035, 0);
    grupo.add(m);
  });
  const llamas = [];
  for (let i = 0; i < 9; i++) {
    const s = crearResplandor(i % 2 ? 0xff7a20 : 0xffb040, 0.28);
    s.position.set((i / 8 - 0.5) * 0.5, 0.12, (i % 3) * 0.05 - 0.05);
    llamas.push(s);
    grupo.add(s);
  }
  const luz = new THREE.PointLight(0xff8a30, 0, 3, 2);
  luz.position.y = 0.3;
  grupo.add(luz);
  return {
    grupo,
    actualizar(n, t) {
      grupo.visible = n > 0;
      mat.opacity = n;
      llamas.forEach((s, i) => {
        const f = 0.8 + Math.sin(t * 9 + i * 1.7) * 0.2;
        s.material.opacity = n * 0.8 * f;
        s.scale.set(0.22, 0.32 * f + 0.1, 1);
        s.position.y = 0.14 + Math.sin(t * 5 + i) * 0.03;
      });
      luz.intensity = n * 2.5;
    },
  };
}

export function crearSimbolos(escena) {
  const lista = {
    arbol: crearArbol(),
    corona: crearCorona(),
    piedra: crearPiedra(),
    estrella: crearEstrellaManana(),
    libro: crearLibro(),
    llave: crearLlave(),
    puerta: crearPuerta(),
    columna: crearColumna(),
    oro: crearOroFuego(),
  };
  const estado = {};
  for (const [nombre, s] of Object.entries(lista)) {
    estado[nombre] = 0;
    s.grupo.visible = false;
    s.grupo.userData.y = 0;
    escena.add(s.grupo);
  }

  // Coloca un símbolo en un punto del mundo.
  function colocar(nombre, x, y, z, giroY = 0) {
    const g = lista[nombre].grupo;
    g.position.set(x, y, z);
    g.userData.y = y;
    g.rotation.y = giroY;
  }

  function actualizar(t) {
    for (const [nombre, s] of Object.entries(lista)) s.actualizar(estado[nombre], t);
  }

  function reiniciar() {
    for (const k of Object.keys(estado)) estado[k] = 0;
    lista.puerta.estado.apertura = 0;
  }

  return { estado, puerta: lista.puerta.estado, colocar, actualizar, reiniciar };
}
