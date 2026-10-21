import * as THREE from 'three';
import { textura } from '../../core/cargador.js';

// Introducción: la Tierra vista desde el espacio y el descenso hasta la isla de Patmos.
// La Tierra mide 1 unidad de radio (1 unidad = 6371 km).
// Imágenes: NASA Blue Marble (mundo) y Sentinel-2 cloudless de EOX (acercamientos).

const RAD = Math.PI / 180;

// Latitud/longitud → punto sobre la esfera (misma convención que SphereGeometry y sus UV).
export function puntoGeo(lat, lon, r = 1) {
  const phi = (lon + 180) * RAD;
  const theta = (90 - lat) * RAD;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)).multiplyScalar(r);
}

export const PATMOS = { lat: 37.31, lon: 26.55 };

const LUGARES = [
  { nombre: 'Mar Egeo', lat: 38.6, lon: 25.0, desde: 0.07, hasta: 0.6, tipo: 'region' },
  { nombre: 'Grecia', lat: 39.4, lon: 22.2, desde: 0.07, hasta: 0.6, tipo: 'region' },
  { nombre: 'Asia (hoy Turquía)', lat: 39.4, lon: 30.2, desde: 0.07, hasta: 0.6, tipo: 'region' },
  { nombre: 'Éfeso', lat: 37.94, lon: 27.34, desde: 0.006, hasta: 0.1, tipo: 'iglesia' },
  { nombre: 'Esmirna', lat: 38.42, lon: 27.14, desde: 0.008, hasta: 0.1, tipo: 'iglesia' },
  { nombre: 'Pérgamo', lat: 39.12, lon: 27.18, desde: 0.008, hasta: 0.1, tipo: 'iglesia' },
  { nombre: 'Tiatira', lat: 38.92, lon: 27.84, desde: 0.008, hasta: 0.1, tipo: 'iglesia' },
  { nombre: 'Sardis', lat: 38.49, lon: 28.04, desde: 0.008, hasta: 0.1, tipo: 'iglesia' },
  { nombre: 'Filadelfia', lat: 38.35, lon: 28.52, desde: 0.008, hasta: 0.1, tipo: 'iglesia' },
  { nombre: 'Laodicea', lat: 37.84, lon: 29.11, desde: 0.008, hasta: 0.1, tipo: 'iglesia' },
  { nombre: 'Patmos', lat: PATMOS.lat, lon: PATMOS.lon, desde: 0, hasta: 0.25, tipo: 'isla' },
];

// Superficie iluminada por el sol; los acercamientos se funden en los bordes.
function materialSuelo(mapa, conBordes) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMapa: { value: mapa },
      uSol: { value: new THREE.Vector3(1, 0, 0) },
      uOpacidad: { value: conBordes ? 0 : 1 },
    },
    transparent: conBordes,
    depthWrite: !conBordes,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vVista;
      void main() {
        vUv = uv;
        vN = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vVista = normalize(cameraPosition - position);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMapa;
      uniform vec3 uSol;
      uniform float uOpacidad;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vVista;
      void main() {
        vec3 c = texture2D(uMapa, vUv).rgb;
        float luz = smoothstep(-0.12, 0.35, dot(vN, uSol));
        // Un poco de brillo azul en el borde del planeta (la atmósfera vista de frente).
        float borde = pow(1.0 - max(dot(vN, vVista), 0.0), 3.0);
        c = c * (0.06 + 1.05 * luz) + vec3(0.25, 0.45, 0.9) * borde * 0.5 * luz;
        float a = uOpacidad;
        ${conBordes ? 'vec2 d = min(vUv, 1.0 - vUv); a *= smoothstep(0.0, 0.12, min(d.x, d.y));' : ''}
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
}

function parche(mapa, lon0, lon1, lat0, lat1, r) {
  const geo = new THREE.SphereGeometry(r, 96, 96, (lon0 + 180) * RAD, (lon1 - lon0) * RAD, (90 - lat1) * RAD, (lat1 - lat0) * RAD);
  const m = new THREE.Mesh(geo, materialSuelo(mapa, true));
  m.renderOrder = 1;
  return m;
}

export function crearTierra() {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x000000);
  const camara = new THREE.PerspectiveCamera(45, 1, 0.001, 200);

  // Estrellas de fondo.
  const n = 2500;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(80);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geoEstrellas = new THREE.BufferGeometry();
  geoEstrellas.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  escena.add(new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false })));

  const mundo = textura('assets/textures/tierra-mundo.webp', { color: true });
  mundo.anisotropy = 8;
  const tierra = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 80), materialSuelo(mundo, false));
  escena.add(tierra);

  const capas = [
    { m: parche(textura('assets/textures/tierra-egeo.webp', { color: true }), 22.5, 31.0, 34.5, 41.0, 1.00002), alto: 0.3, bajo: 0.15 },
    { m: parche(textura('assets/textures/tierra-asia.webp', { color: true }), 25.6, 29.4, 36.6, 39.4, 1.00004), alto: 0.06, bajo: 0.03 },
    { m: parche(textura('assets/textures/tierra-patmos.webp', { color: true }), 26.44, 26.68, 37.24, 37.4, 1.00006), alto: 0.01, bajo: 0.005 },
  ];
  for (const c of capas) escena.add(c.m);

  // Atmósfera: un halo azul alrededor del planeta.
  const atmosfera = new THREE.Mesh(
    new THREE.SphereGeometry(1.03, 96, 48),
    new THREE.ShaderMaterial({
      uniforms: { uSol: { value: new THREE.Vector3(1, 0, 0) } },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vVista;
        void main() {
          vN = normalize(position);
          vVista = normalize(cameraPosition - position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSol;
        varying vec3 vN;
        varying vec3 vVista;
        void main() {
          float k = pow(max(dot(-vN, vVista) + 0.25, 0.0), 4.0) * 3.0;
          float luz = smoothstep(-0.3, 0.4, dot(vN, uSol));
          gl_FragColor = vec4(vec3(0.3, 0.55, 1.0) * k * luz, 1.0);
        }`,
    })
  );
  escena.add(atmosfera);

  // El sol al oeste de Patmos: allí es la tarde, como en la escena de la cueva.
  const p = puntoGeo(PATMOS.lat, PATMOS.lon);
  const oeste = puntoGeo(PATMOS.lat - 8, PATMOS.lon - 70);
  const sol = oeste.clone().normalize();
  for (const o of [tierra, ...capas.map((c) => c.m)]) o.material.uniforms.uSol.value.copy(sol);
  atmosfera.material.uniforms.uSol.value.copy(sol);

  // Rótulos en pantalla (nombres de lugares).
  const contenedor = document.getElementById('rotulos');
  const rotulos = LUGARES.map((l) => {
    const el = document.createElement('div');
    el.className = `rotulo ${l.tipo}`;
    el.textContent = l.nombre;
    contenedor.appendChild(el);
    return { ...l, el, punto: puntoGeo(l.lat, l.lon, 1.0001) };
  });

  // Recorrido de la cámara por puntos de paso: [s, latitud, longitud, altura].
  // Primero el planeta, luego el Egeo, una pausa sobre Asia (las siete iglesias) y al final Patmos.
  const PASOS = [
    [0.0, 38, 12, 2.6],
    [0.35, 37.8, 25.5, 0.22],
    [0.52, 38.25, 27.9, 0.055],
    [0.68, 38.15, 27.8, 0.05],
    [1.0, PATMOS.lat, PATMOS.lon, 0.0019],
  ].map(([t, lat, lon, alt]) => ({ t, dir: puntoGeo(lat, lon).normalize(), alt }));
  const estado = { s: 0, altura: 2.6, visible: false };
  const dir = new THREE.Vector3();
  const objetivo = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const qa = new THREE.Quaternion();

  function colocar(s) {
    estado.s = s;
    let k = 0;
    while (k < PASOS.length - 2 && s > PASOS[k + 1].t) k++;
    const a = PASOS[k];
    const b = PASOS[k + 1];
    const f = THREE.MathUtils.smootherstep(s, a.t, b.t);
    qa.setFromUnitVectors(a.dir, b.dir);
    q.identity().slerp(qa, f);
    dir.copy(a.dir).applyQuaternion(q);
    // La altura cambia en escala logarítmica (de 16 000 km a unos 12 km).
    const alt = Math.exp(THREE.MathUtils.lerp(Math.log(a.alt), Math.log(b.alt), f));
    estado.altura = alt;
    // Abajo del todo la cámara se inclina un poco, para ver la isla con perspectiva.
    const sur = tmp.set(0, -1, 0).projectOnPlane(dir).normalize();
    const inclinar = THREE.MathUtils.smoothstep(s, 0.8, 1);
    camara.position.copy(dir).multiplyScalar(1 + alt).addScaledVector(sur, alt * 0.9 * inclinar);
    const mirarSuelo = THREE.MathUtils.clamp(1 - alt / 0.8, 0, 1) ** 2;
    objetivo.copy(dir).multiplyScalar(mirarSuelo);
    camara.up.set(0, 1, 0);
    camara.lookAt(objetivo);
    camara.near = Math.max(alt * 0.1, 0.00005);
    camara.far = 200;
    camara.updateProjectionMatrix();

    // Cada acercamiento aparece al bajar de su altura (opaco del todo bajo "bajo").
    for (const c of capas) c.m.material.uniforms.uOpacidad.value = 1 - THREE.MathUtils.smoothstep(alt, c.bajo, c.alto);
  }

  function actualizarRotulos() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const r of rotulos) {
      const visible = estado.visible && estado.altura >= r.desde && estado.altura <= r.hasta;
      // Oculto si está detrás del planeta.
      const delante = tmp.copy(camara.position).sub(r.punto).dot(r.punto) > 0;
      tmp.copy(r.punto).project(camara);
      const enPantalla = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      if (visible && delante && enPantalla) {
        r.el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
        r.el.classList.add('visible');
      } else {
        r.el.classList.remove('visible');
      }
    }
  }

  function mostrar(v) {
    estado.visible = v;
    if (!v) for (const r of rotulos) r.el.classList.remove('visible');
  }

  function ajustarAspecto(aspecto) {
    camara.aspect = aspecto;
    // En pantallas angostas, más campo de visión para que quepa el planeta.
    camara.fov = aspecto < 1 ? THREE.MathUtils.clamp(45 / aspecto, 45, 75) : 45;
    camara.updateProjectionMatrix();
  }

  colocar(0);
  return { escena, camara, estado, colocar, actualizarRotulos, mostrar, ajustarAspecto };
}
