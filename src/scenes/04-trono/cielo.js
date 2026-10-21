import * as THREE from 'three';
import { crearResplandor, texturaRayos, texturaResplandor } from '../01-patmos/resplandor.js';
import { llamaVertex, llamaFragment } from '../01-patmos/candeleros.js';
import { crearAncianos } from './ancianos.js';
import { crearSeres } from './seres.js';

// Apocalipsis 4: el trono en el cielo. Solo se muestra lo que el texto describe:
// la puerta abierta (4:1), el trono y el que está sentado, que se ve como piedra de jaspe y
// de sardio, es decir, luz y no una figura (4:2-3); el arco alrededor del trono, como esmeralda;
// las veinticuatro sillas con los ancianos (4:4); relámpagos y siete lámparas de fuego (4:5);
// el mar de vidrio y los cuatro seres vivientes (4:6-8).

export const TRONO = new THREE.Vector3(0, 0, -12);
const PUERTA = new THREE.Vector3(0, 26, -46);

const cieloVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const cieloFragment = /* glsl */ `
  uniform float uNoche;
  uniform float uDestello;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float y = d.y;
    // De día en el cielo: azul profundo arriba y una claridad dorada hacia el trono.
    vec3 cenit = vec3(0.025, 0.05, 0.14);
    vec3 horizonte = vec3(0.5, 0.38, 0.24);
    vec3 dia = mix(horizonte, cenit, pow(clamp(y, 0.0, 1.0), 0.55));
    dia = mix(dia, vec3(0.55, 0.48, 0.38), clamp(-y * 4.0, 0.0, 1.0));
    float hacia = max(dot(d, normalize(vec3(0.0, 0.12, -1.0))), 0.0);
    dia += vec3(1.0, 0.85, 0.6) * pow(hacia, 8.0) * 0.35;
    // De noche (4:1): oscuro y con estrellas.
    vec3 noche = mix(vec3(0.004, 0.006, 0.016), vec3(0.012, 0.018, 0.045), clamp(y, 0.0, 1.0));
    vec3 c = floor(d * 280.0);
    float h = fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    noche += vec3(0.9, 0.92, 1.0) * step(0.9982, h) * smoothstep(0.0, 0.25, y) * (0.4 + 0.6 * fract(h * 97.0));
    vec3 color = mix(dia, noche, uNoche) + uDestello * vec3(0.55, 0.6, 0.75);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Suelo de nubes, claras y suaves, que se pierden a lo lejos.
const nubesVertex = /* glsl */ `
  varying vec3 vMundo;
  void main() {
    vec4 m = modelMatrix * vec4(position, 1.0);
    vMundo = m.xyz;
    gl_Position = projectionMatrix * viewMatrix * m;
  }
`;
const nubesFragment = /* glsl */ `
  uniform float uNoche;
  uniform float uTiempo;
  uniform float uDestello;
  varying vec3 vMundo;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * n(p); p *= 2.03; a *= 0.5; }
    return s;
  }
  void main() {
    vec2 p = vMundo.xz * 0.07 + vec2(uTiempo * 0.006, uTiempo * 0.004);
    float k = fbm(p + fbm(p * 0.7) * 0.8);
    vec3 dia = mix(vec3(0.36, 0.31, 0.25), vec3(0.62, 0.56, 0.47), k);
    // Más luz cerca del trono.
    float cerca = 1.0 - smoothstep(4.0, 40.0, distance(vMundo.xz, vec2(0.0, -12.0)));
    dia *= 0.7 + 0.5 * cerca;
    vec3 noche = mix(vec3(0.01, 0.012, 0.025), vec3(0.04, 0.045, 0.07), k);
    vec3 color = mix(dia, noche, uNoche) + uDestello * vec3(0.3, 0.32, 0.4);
    float lejos = 1.0 - smoothstep(60.0, 110.0, length(vMundo.xz));
    gl_FragColor = vec4(color, lejos);
  }
`;

// Arco alrededor del trono, "semejante en el aspecto á la esmeralda" (4:3).
const arcoVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vAltura;
  void main() {
    vUv = uv;
    vAltura = (modelMatrix * vec4(position, 1.0)).y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const arcoFragment = /* glsl */ `
  uniform float uNivel;
  uniform float uTiempo;
  varying vec2 vUv;
  varying float vAltura;
  void main() {
    if (vAltura < 0.0) discard; // la parte de abajo queda bajo las nubes
    float r = vUv.x; // 0 por dentro, 1 por fuera (ver crearArco)
    float borde = smoothstep(0.0, 0.3, r) * (1.0 - smoothstep(0.7, 1.0, r));
    // Verde esmeralda, con un leve tornasol de arco iris en los bordes.
    vec3 esmeralda = vec3(0.12, 0.95, 0.5);
    vec3 iris = 0.5 + 0.5 * cos(6.2831 * (r * 0.9 + vec3(0.0, 0.33, 0.67)));
    vec3 color = mix(esmeralda, iris, 0.22 * (1.0 - borde));
    float brillo = 0.85 + 0.15 * sin(uTiempo * 0.8 + vUv.y * 12.0);
    float a = borde * uNivel * brillo;
    gl_FragColor = vec4(color * 1.15, a * 0.8);
  }
`;

const marmolBlanco = () => new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.32, transparent: true, opacity: 0 });

function crearArco(radio, ancho) {
  // Anillo con uv.x = de adentro hacia afuera.
  const geo = new THREE.RingGeometry(radio - ancho / 2, radio + ancho / 2, 128, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - (radio - ancho / 2)) / ancho, Math.atan2(pos.getY(i), pos.getX(i)));
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: { uNivel: { value: 0 }, uTiempo: { value: 0 } },
    vertexShader: arcoVertex,
    fragmentShader: arcoFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, mat);
}

// Relámpago dibujado en un lienzo (se usa en varios lugares, por un instante).
function texturaRelampago() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const g = c.getContext('2d');
  const rama = (x, y, largo, ancho, angulo) => {
    g.lineWidth = ancho;
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 0; i < largo; i++) {
      angulo += (Math.random() - 0.5) * 0.9;
      x += Math.sin(angulo) * 14;
      y += Math.cos(angulo) * 14;
      g.lineTo(x, y);
      if (Math.random() < 0.12 && ancho > 1.5) {
        g.stroke();
        rama(x, y, largo / 3, ancho * 0.55, angulo + (Math.random() - 0.5) * 1.6);
        g.lineWidth = ancho;
        g.beginPath();
        g.moveTo(x, y);
      }
    }
    g.stroke();
  };
  g.strokeStyle = 'rgba(200,215,255,0.35)';
  g.shadowColor = 'rgba(170,190,255,1)';
  g.shadowBlur = 12;
  rama(64, 4, 34, 9, 0);
  g.strokeStyle = 'rgba(255,255,255,1)';
  g.shadowBlur = 4;
  rama(64, 4, 34, 3, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crearCielo() {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x000000);
  escena.fog = new THREE.FogExp2(0x6a5a46, 0.006);
  const estado = {
    noche: 1, puerta: 0, trono: 0, sentado: 0, arco: 0, mar: 0, destello: 0,
    lamparas: [0, 0, 0, 0, 0, 0, 0],
  };

  // --- Cielo y nubes ---
  const uCielo = { uNoche: { value: 1 }, uDestello: { value: 0 } };
  const cielo = new THREE.Mesh(
    new THREE.SphereGeometry(400, 48, 24),
    new THREE.ShaderMaterial({ uniforms: uCielo, vertexShader: cieloVertex, fragmentShader: cieloFragment, side: THREE.BackSide, depthWrite: false })
  );
  cielo.renderOrder = -2;
  escena.add(cielo);
  const uNubes = { uNoche: { value: 1 }, uTiempo: { value: 0 }, uDestello: { value: 0 } };
  const nubes = new THREE.Mesh(
    new THREE.CircleGeometry(115, 64).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms: uNubes, vertexShader: nubesVertex, fragmentShader: nubesFragment, transparent: true, depthWrite: false })
  );
  nubes.position.y = -0.02;
  nubes.renderOrder = -1;
  escena.add(nubes);

  // --- Luces: la luz sale del trono ---
  const ambiente = new THREE.HemisphereLight(0xfff4e0, 0xc8b490, 0);
  const frente = new THREE.DirectionalLight(0xfff0dc, 0);
  frente.position.set(2, 8, 10);
  frente.target.position.copy(TRONO);
  const luzTrono = new THREE.PointLight(0xfff1dc, 0, 0, 1.1);
  luzTrono.position.set(TRONO.x, 3, TRONO.z + 1.5);
  escena.add(ambiente, frente, frente.target, luzTrono);

  // --- La puerta abierta en el cielo (4:1) ---
  const grupoPuerta = new THREE.Group();
  grupoPuerta.position.copy(PUERTA);
  const matPuerta = new THREE.MeshBasicMaterial({ color: 0xfff6e0, transparent: true, opacity: 0, fog: false });
  const hoja = new THREE.Mesh(new THREE.PlaneGeometry(4, 7), matPuerta);
  const haloPuerta = crearResplandor(0xffe2a8, 22);
  haloPuerta.material.fog = false;
  const rayosPuerta = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texturaRayos(), color: 0xffe8c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  rayosPuerta.scale.setScalar(34);
  grupoPuerta.add(rayosPuerta, haloPuerta, hoja);
  grupoPuerta.lookAt(0, 1.6, 8);
  escena.add(grupoPuerta);

  // --- El trono (sobre tres gradas de mármol blanco con bordes de oro) ---
  const grupoTrono = new THREE.Group();
  grupoTrono.position.copy(TRONO);
  escena.add(grupoTrono);
  const marmol = marmolBlanco();
  const oro = new THREE.MeshStandardMaterial({ color: 0xe8b04a, metalness: 1, roughness: 0.25, transparent: true, opacity: 0 });
  const materialesTrono = [marmol, oro];
  [[4.2, 0], [3.6, 0.25], [3.0, 0.5]].forEach(([r, y]) => {
    const grada = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.25, 64), marmol);
    grada.position.y = y + 0.125;
    const borde = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 96).rotateX(Math.PI / 2), oro);
    borde.position.y = y + 0.25;
    grupoTrono.add(grada, borde);
  });
  const pieza = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    grupoTrono.add(m);
  };
  // Asiento, respaldo alto y brazos.
  pieza(1.9, 0.65, 1.3, 0, 1.075, 0, oro);
  pieza(1.6, 0.06, 1.1, 0, 1.43, 0.05, marmol);
  pieza(1.9, 3.0, 0.3, 0, 2.25, -0.6, oro);
  pieza(1.5, 2.6, 0.05, 0, 2.35, -0.43, marmol);
  pieza(0.2, 0.5, 1.2, -0.95, 1.65, 0, oro);
  pieza(0.2, 0.5, 1.2, 0.95, 1.65, 0, oro);
  const remate = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.3, 32, 1, false, -Math.PI / 2, Math.PI), oro);
  remate.rotation.x = Math.PI / 2;
  remate.position.set(0, 3.75, -0.6);
  grupoTrono.add(remate);

  // El que estaba sentado: "semejante á una piedra de jaspe y de sardio" (4:3).
  // Jaspe: claro y resplandeciente como cristal. Sardio: rojo. Solo luz, sin forma humana.
  const presencia = new THREE.Group();
  presencia.position.set(0, 2.35, 0.15);
  grupoTrono.add(presencia);
  const jaspe = crearResplandor(0xf2fff8, 1);
  jaspe.scale.set(2.2, 3.4, 1);
  const jaspe2 = crearResplandor(0xffffff, 1.4);
  const sardio = crearResplandor(0xff2a0c, 5);
  const rayos = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texturaRayos(), color: 0xfff0d6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  rayos.scale.setScalar(10);
  presencia.add(rayos, sardio, jaspe, jaspe2);

  // El arco alrededor del trono, como esmeralda.
  const arco = crearArco(5.6, 0.9);
  arco.position.set(0, 2.4, -0.9);
  grupoTrono.add(arco);

  // --- Siete lámparas de fuego delante del trono (4:5) ---
  const PERFIL = [[0, 0], [0.32, 0], [0.3, 0.05], [0.12, 0.12], [0.06, 0.3], [0.05, 0.95], [0.1, 1.0], [0.3, 1.1], [0.34, 1.18], [0.3, 1.18], [0, 1.12]];
  const geoLampara = new THREE.LatheGeometry(PERFIL.map(([x, y]) => new THREE.Vector2(x, y)), 24);
  const geoLlama = new THREE.PlaneGeometry(0.5, 0.95);
  geoLlama.translate(0, 0.38, 0);
  const lamparas = [];
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Group();
    l.position.set(TRONO.x - 3 + i, 0, TRONO.z + 4.9);
    const base = new THREE.Mesh(geoLampara, oro);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTiempo: { value: 0 }, uFase: { value: i * 2.3 }, uNivel: { value: 0 } },
      vertexShader: llamaVertex,
      fragmentShader: llamaFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const llama = new THREE.Mesh(geoLlama, mat);
    llama.position.y = 1.16;
    llama.frustumCulled = false;
    const halo = crearResplandor(0xff9a40, 2.2);
    halo.position.y = 1.5;
    l.add(base, llama, halo);
    escena.add(l);
    lamparas.push({ grupo: l, mat, halo });
  }
  const luzLamparas = new THREE.PointLight(0xff9a40, 0, 14, 1.5);
  luzLamparas.position.set(TRONO.x, 1.8, TRONO.z + 5.2);
  escena.add(luzLamparas);

  // --- El mar de vidrio, semejante al cristal (4:6), delante del trono ---
  const vidrio = new THREE.MeshStandardMaterial({
    color: 0xb8d2ee, metalness: 1, roughness: 0.04, transparent: true, opacity: 0,
  });
  const mar = new THREE.Mesh(new THREE.CircleGeometry(7, 96).rotateX(-Math.PI / 2), vidrio);
  mar.position.set(TRONO.x, 0.01, TRONO.z + 10.5);
  escena.add(mar);
  // El resplandor del trono reflejado en el vidrio, como un camino de luz.
  const reflejo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 13).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: texturaResplandor(), color: 0xfff0d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  reflejo.position.set(TRONO.x, 0.03, TRONO.z + 10.5);
  escena.add(reflejo);

  // --- Relámpagos, truenos y voces (4:5) ---
  const texRayo = texturaRelampago();
  const relampagos = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texRayo, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    s.scale.set(3, 12, 1);
    escena.add(s);
    relampagos.push({ s, vida: 0 });
  }
  let siguiente = 0;
  function relampago() {
    const r = relampagos[siguiente++ % relampagos.length];
    const a = (Math.random() - 0.5) * 2.4;
    r.s.position.set(TRONO.x + Math.sin(a) * (3 + Math.random() * 3), 6 + Math.random() * 3, TRONO.z + Math.cos(a) * 2 - 1);
    r.s.material.rotation = -a * 0.4;
    r.vida = 1;
    estado.destello = 1;
  }

  // --- Ancianos y seres vivientes ---
  const ancianos = crearAncianos(TRONO, oro);
  escena.add(ancianos.grupo);
  const seres = crearSeres(TRONO);
  escena.add(seres.grupo);

  // Reflejos del cielo para el oro y el vidrio.
  function prepararReflejos(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const soloCielo = new THREE.Scene();
    const copia = cielo.clone();
    copia.material = cielo.material.clone();
    copia.material.uniforms = { uNoche: { value: 0 }, uDestello: { value: 0 } };
    soloCielo.add(copia);
    const env = pmrem.fromScene(soloCielo, 0.02, 1, 1000).texture;
    pmrem.dispose();
    escena.traverse((o) => {
      const m = o.material;
      if (m?.metalness > 0.5) {
        m.envMap = env;
        m.envMapIntensity = m === vidrio ? 0.6 : 0.5;
        m.needsUpdate = true;
      }
    });
  }

  const ojosDe = new THREE.Vector3();
  function actualizar(t, dt) {
    const noche = estado.noche;
    uCielo.uNoche.value = noche;
    uNubes.uNoche.value = noche;
    uNubes.uTiempo.value = t;
    estado.destello = Math.max(0, estado.destello - dt * 3.5);
    uCielo.uDestello.value = estado.destello * 0.5;
    uNubes.uDestello.value = estado.destello * 0.6;
    for (const r of relampagos) {
      r.vida = Math.max(0, r.vida - dt * 4);
      r.s.material.opacity = r.vida > 0.5 ? 1 : r.vida * 2 * (0.6 + 0.4 * Math.sin(t * 90));
      r.s.visible = r.vida > 0;
    }
    const luz = 1 - noche;
    ambiente.intensity = 0.3 * luz + estado.destello * 1.5;
    frente.intensity = 1.2 * luz;
    escena.fog.density = 0.006 * luz;

    // Puerta.
    grupoPuerta.visible = estado.puerta > 0.001;
    hoja.scale.x = Math.max(estado.puerta, 0.001);
    matPuerta.opacity = Math.min(1, estado.puerta * 2);
    haloPuerta.material.opacity = estado.puerta * 0.8;
    rayosPuerta.material.opacity = estado.puerta * 0.5;
    rayosPuerta.material.rotation = t * 0.02;

    // Trono y presencia.
    grupoTrono.visible = estado.trono > 0.001;
    for (const m of materialesTrono) m.opacity = estado.trono;
    const s = estado.sentado;
    const pulso = 1 + Math.sin(t * 0.7) * 0.04;
    jaspe.material.opacity = Math.min(0.85, s) * pulso;
    jaspe2.material.opacity = s * 0.6;
    sardio.material.opacity = Math.min(1, s * 0.85) * pulso;
    rayos.material.opacity = s * 0.22;
    rayos.material.rotation = t * 0.015;
    luzTrono.intensity = s * 18 * pulso;
    arco.material.uniforms.uNivel.value = estado.arco;
    arco.material.uniforms.uTiempo.value = t;

    // Lámparas.
    let fuego = 0;
    lamparas.forEach((l, i) => {
      const n = estado.lamparas[i];
      l.grupo.visible = n > 0.001;
      const parpadeo = 1 + Math.sin(t * 8 + i) * 0.06;
      l.mat.uniforms.uTiempo.value = t;
      l.mat.uniforms.uNivel.value = Math.min(1, n * 1.3);
      l.halo.material.opacity = 0.35 * n * parpadeo;
      fuego += n;
    });
    luzLamparas.intensity = fuego * 1.2;

    // Mar de vidrio.
    vidrio.opacity = estado.mar * 0.92;
    mar.visible = estado.mar > 0.001;
    reflejo.material.opacity = estado.mar * s * 0.55;

    ancianos.actualizar(t);
    seres.actualizar(t);
  }

  function ajustarPantalla(altoPx, fov) {
    seres.ajustarPantalla(altoPx, fov);
  }

  function reiniciar() {
    Object.assign(estado, { noche: 1, puerta: 0, trono: 0, sentado: 0, arco: 0, mar: 0, destello: 0 });
    estado.lamparas.fill(0);
    Object.assign(ancianos.estado, { nivel: 0, postrar: 0, coronas: 0, brillo: 0 });
    Object.assign(seres.estado, { nivel: 0, ojos: 0, santo: 0, gloria: 0 });
  }

  // Puntos para la cámara.
  function punto(nombre) {
    if (nombre === 'puerta') return PUERTA.clone();
    if (nombre === 'trono') return ojosDe.set(TRONO.x, 2.4, TRONO.z).clone();
    if (nombre === 'mar') return new THREE.Vector3(TRONO.x, 0, TRONO.z + 8);
    if (nombre === 'lamparas') return new THREE.Vector3(TRONO.x, 1.3, TRONO.z + 4.9);
    return seres.punto(nombre);
  }

  return {
    escena, estado, ancianos, seres, actualizar, ajustarPantalla, reiniciar, prepararReflejos, punto, relampago,
  };
}
