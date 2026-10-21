import * as THREE from 'three';
import { cargarGeometria, puntosSobre } from './geometria.js';

// Los cuatro seres vivientes (4:6-8): semejantes a un león, a un becerro, con cara como de
// hombre y a un águila volando. Cada uno con seis alas, llenos de ojos delante y detrás,
// y por dentro. Esculturas de Sketchfab (ver CREDITS.md) en marfil claro.
// Los ojos son pequeños, como joyas de luz, sin nada que asuste.

// lugar: [x, z] respecto del trono. alto/largo: tamaño en metros.
const SERES = [
  { nombre: 'leon', ruta: 'assets/models/leon.glb', girar: Math.PI / 2, alto: 1.9, quitarBase: 0.1, lugar: [-4.6, 2.4], alas: 3 },
  { nombre: 'becerro', ruta: 'assets/models/becerro.glb', girar: -Math.PI / 2, largo: 2.5, lugar: [4.6, 2.4], alas: 3 },
  { nombre: 'hombre', ruta: 'assets/models/hombre.glb', girar: 0, alto: 1.5, quitarBase: 0.12, lugar: [-5.2, -3.0], alas: 3 },
  // El águila ya tiene sus dos alas abiertas: se le agregan cuatro.
  { nombre: 'aguila', ruta: 'assets/models/aguila.glb', girar: -Math.PI / 2, largo: 3.0, lugar: [5.2, -3.0], alas: 2 },
];

const ojoVertex = /* glsl */ `
  attribute float aFase;
  uniform float uEscala;
  uniform float uTiempo;
  varying float vAbre;
  varying float vFase;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(0.06 * uEscala / -mv.z, 1.0, 32.0);
    // De vez en cuando, cada ojo parpadea despacio.
    vAbre = 0.15 + 0.85 * smoothstep(-0.97, -0.85, sin(uTiempo * 0.35 + aFase * 6.28));
    vFase = aFase;
  }
`;
const ojoFragment = /* glsl */ `
  uniform sampler2D uMapa;
  uniform float uNivel;
  uniform float uBrillo;
  varying float vAbre;
  varying float vFase;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    uv.y /= max(vAbre, 0.05);
    vec4 c = texture2D(uMapa, uv + 0.5);
    if (abs(uv.y) > 0.5) c = vec4(0.0);
    float halo = (1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5))) * 0.35 * uBrillo;
    vec3 color = c.rgb * (1.0 + uBrillo * 1.5) + vec3(1.0, 0.8, 0.45) * halo;
    float a = max(c.a, halo) * uNivel;
    if (a < 0.01) discard;
    gl_FragColor = vec4(color, a);
  }
`;

// Un ojo almendrado: blanco, iris de oro y pupila oscura.
function texturaOjo() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.beginPath();
  g.moveTo(4, 32);
  g.quadraticCurveTo(32, 6, 60, 32);
  g.quadraticCurveTo(32, 58, 4, 32);
  g.closePath();
  g.fillStyle = '#fbf7ee';
  g.fill();
  g.save();
  g.clip();
  const iris = g.createRadialGradient(32, 32, 2, 32, 32, 13);
  iris.addColorStop(0, '#6b4a12');
  iris.addColorStop(0.5, '#c8952e');
  iris.addColorStop(1, '#8a6420');
  g.fillStyle = iris;
  g.beginPath();
  g.arc(32, 32, 12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1a1206';
  g.beginPath();
  g.arc(32, 32, 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath();
  g.arc(28, 28, 2.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.strokeStyle = 'rgba(150,110,50,0.9)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(4, 32);
  g.quadraticCurveTo(32, 6, 60, 32);
  g.quadraticCurveTo(32, 58, 4, 32);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crearSeres(centro) {
  const grupo = new THREE.Group();
  const estado = { nivel: 0, ojos: 0, santo: 0, gloria: 0 };

  const marfil = new THREE.MeshStandardMaterial({
    color: 0xf4ead2, roughness: 0.5, metalness: 0, emissive: 0xffd890, emissiveIntensity: 0, transparent: true, opacity: 0,
  });
  const plumas = new THREE.MeshStandardMaterial({
    color: 0xf6efe0, roughness: 0.7, emissive: 0xfff0d0, emissiveIntensity: 0, side: THREE.DoubleSide, transparent: true, opacity: 0,
  });
  const uniformesOjos = {
    uMapa: { value: texturaOjo() },
    uNivel: { value: 0 },
    uBrillo: { value: 0 },
    uTiempo: { value: 0 },
    uEscala: { value: 800 },
  };
  const matOjos = new THREE.ShaderMaterial({
    uniforms: uniformesOjos, vertexShader: ojoVertex, fragmentShader: ojoFragment, transparent: true, depthWrite: false,
  });

  function crearOjos(lista) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lista, 3));
    const fases = new Float32Array(lista.length / 3).map(() => Math.random());
    geo.setAttribute('aFase', new THREE.BufferAttribute(fases, 1));
    const p = new THREE.Points(geo, matOjos);
    p.frustumCulled = false;
    return p;
  }

  // Las alas se cargan una vez y se reparten entre los cuatro.
  const esperandoAlas = [];
  let geoAlas = null;
  cargarGeometria('assets/models/alas.glb', { alto: 1 }, (geo) => {
    geo.translate(0, -0.45, -0.1); // la raíz de las alas en el origen
    geoAlas = geo;
    esperandoAlas.forEach((f) => f());
  });

  const seres = SERES.map((d, i) => {
    const s = { ...d, grupo: new THREE.Group(), alasLista: [], alto: 1, fase: i * 1.7 };
    s.grupo.position.set(centro.x + d.lugar[0], 0.9, centro.z + d.lugar[1]);
    // De frente hacia quien mira, apenas vueltos hacia el trono.
    s.grupo.rotation.y = -Math.sign(d.lugar[0]) * 0.35;
    grupo.add(s.grupo);
    cargarGeometria(d.ruta, d, (geo) => {
      const caja = geo.boundingBox;
      s.alto = caja.max.y;
      const cuerpo = new THREE.Mesh(geo, marfil);
      s.grupo.add(cuerpo);
      cuerpo.add(crearOjos(puntosSobre(geo, d.nombre === 'aguila' ? 110 : 90)));
      const ponerAlas = () => {
        // Tres pares: arriba, a los lados y abajo (el águila, solo arriba y abajo).
        const h = s.alto;
        const fondo = caja.min.z * 0.6 - 0.15;
        const pares = [
          { y: h * 0.78, rz: 0, ex: 1.25, ey: 1.15 },
          { y: h * 0.5, rz: 0, ex: 1.5, ey: 0.55 },
          { y: h * 0.35, rz: Math.PI, ex: 1.05, ey: 0.85 },
        ];
        const usar = d.alas === 3 ? pares : [pares[0], pares[2]];
        const tam = Math.max(h, (caja.max.x - caja.min.x) * 0.5) * 0.8;
        for (const par of usar) {
          const ala = new THREE.Mesh(geoAlas, plumas);
          ala.position.set(0, par.y, fondo);
          ala.rotation.z = par.rz;
          ala.scale.set(par.ex * tam, par.ey * tam, tam);
          ala.add(crearOjos(puntosSobre(geoAlas, 22)));
          s.grupo.add(ala);
          s.alasLista.push({ ala, ...par, tam });
        }
      };
      if (geoAlas) ponerAlas();
      else esperandoAlas.push(ponerAlas);
    });
    return s;
  });

  function actualizar(t) {
    const n = estado.nivel;
    grupo.visible = n > 0.001;
    marfil.opacity = n;
    plumas.opacity = n * 0.95;
    marfil.emissiveIntensity = 0.04 + estado.gloria * 0.3;
    plumas.emissiveIntensity = 0.06 + estado.gloria * 0.35;
    uniformesOjos.uNivel.value = estado.ojos * n;
    uniformesOjos.uBrillo.value = estado.santo * 0.6 + estado.gloria * 0.4;
    uniformesOjos.uTiempo.value = t;
    // "No tenían reposo": se mecen en el aire y las alas se mueven siempre (más al decir "Santo").
    const ritmo = 0.9 + estado.santo * 0.8;
    for (const s of seres) {
      s.grupo.position.y = 0.9 + Math.sin(t * 0.6 + s.fase) * 0.08;
      for (const a of s.alasLista) {
        const aleteo = Math.sin(t * ritmo * 1.6 + s.fase + a.y) * (0.1 + estado.santo * 0.12);
        a.ala.rotation.x = aleteo * 0.6;
        a.ala.scale.x = a.ex * a.tam * (1 + aleteo * 0.25);
      }
    }
  }

  // Ajusta el tamaño de los ojos a la pantalla (alto en pixeles y campo de visión).
  function ajustarPantalla(altoPx, fov) {
    uniformesOjos.uEscala.value = altoPx / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  }

  const punto = (nombre) => {
    const s = seres.find((x) => x.nombre === nombre);
    return s.grupo.position.clone().setY(0.9 + s.alto * 0.55);
  };

  return { grupo, estado, actualizar, ajustarPantalla, punto };
}
