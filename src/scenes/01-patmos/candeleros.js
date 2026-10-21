import * as THREE from 'three';
import { crearResplandor } from './resplandor.js';

// Siete candeleros de oro en semicírculo, abiertos hacia la boca de la cueva.
// Cada uno: base, columna con nudos, y una copa de aceite con llama viva.

// Perfil del candelero (radio, altura), de abajo hacia arriba.
const PERFIL = [
  [0.0, 0.0], [0.3, 0.0], [0.31, 0.03], [0.26, 0.07], [0.14, 0.13], [0.07, 0.2],
  [0.05, 0.3], [0.09, 0.34], [0.05, 0.38], [0.04, 0.7], [0.08, 0.74], [0.04, 0.78],
  [0.035, 1.1], [0.07, 1.14], [0.035, 1.18], [0.04, 1.3], [0.1, 1.34], [0.2, 1.42],
  [0.22, 1.47], [0.19, 1.47], [0.17, 1.44], [0.0, 1.43],
];

// Llama: un plano que siempre mira a la cámara, dibujado con ruido que ondula.
export const llamaVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Siempre de frente a la cámara (solo gira sobre el eje vertical).
    vec4 centro = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 escala = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), 1.0);
    centro.xy += position.xy * escala.xy;
    gl_Position = projectionMatrix * centro;
  }
`;
export const llamaFragment = /* glsl */ `
  uniform float uTiempo;
  uniform float uFase;
  uniform float uNivel;
  varying vec2 vUv;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv - vec2(0.5, 0.15);
    float t = uTiempo * 2.2 + uFase;
    // La llama sube y se mece; más ancha abajo, en punta arriba.
    float ondula = (n(vec2(p.y * 4.0 - t, uFase)) - 0.5) * 0.18 * p.y * 2.0;
    p.x += ondula;
    float alto = clamp(p.y / 0.8, 0.0, 1.0);
    float ancho = mix(0.2, 0.0, pow(alto, 0.8)) + 0.03;
    float forma = 1.0 - smoothstep(0.0, ancho, abs(p.x));
    forma *= smoothstep(-0.12, 0.02, p.y) * (1.0 - smoothstep(0.55, 0.85, p.y + n(vec2(t * 1.3, uFase)) * 0.12));
    float nucleo = 1.0 - smoothstep(0.0, ancho * 0.55, abs(p.x));
    nucleo *= 1.0 - smoothstep(0.1, 0.45, p.y);
    vec3 color = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.75, 0.3), forma);
    color = mix(color, vec3(1.0, 0.97, 0.85), nucleo);
    float a = forma * uNivel;
    gl_FragColor = vec4(color * 3.0 * a, a);
  }
`;

export function crearCandeleros(centro, radio = 3, envMap = null) {
  const grupo = new THREE.Group();
  const oro = new THREE.MeshStandardMaterial({
    color: 0xe8b04a, metalness: 1, roughness: 0.28, envMap, envMapIntensity: 0.35,
  });
  const geo = new THREE.LatheGeometry(PERFIL.map(([x, y]) => new THREE.Vector2(x, y)), 32);
  const geoLlama = new THREE.PlaneGeometry(0.22, 0.42);
  geoLlama.translate(0, 0.17, 0);

  const lista = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 6;
    const c = new THREE.Group();
    c.position.set(centro.x + Math.sin(a) * radio, 0, centro.z + Math.cos(a) * radio * 0.8);
    c.add(new THREE.Mesh(geo, oro));

    const matLlama = new THREE.ShaderMaterial({
      uniforms: { uTiempo: { value: 0 }, uFase: { value: i * 3.7 }, uNivel: { value: 0 } },
      vertexShader: llamaVertex,
      fragmentShader: llamaFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const llama = new THREE.Mesh(geoLlama, matLlama);
    llama.position.y = 1.47;
    llama.frustumCulled = false;
    const halo = crearResplandor(0xff8a30, 1.4);
    halo.position.y = 1.62;
    const luz = new THREE.PointLight(0xff9a40, 0, 6, 2);
    luz.position.y = 1.75;
    c.add(llama, halo, luz);

    grupo.add(c);
    lista.push({ grupo: c, matLlama, halo, luz, intensidad: 0, fase: Math.random() * 10 });
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
      c.luz.intensity = 2.2 * k;
      c.matLlama.uniforms.uTiempo.value = t;
      c.matLlama.uniforms.uNivel.value = Math.min(1, c.intensidad * 1.3);
      c.halo.material.opacity = 0.3 * k;
    }
  }

  function apagarTodo() {
    for (let i = 0; i < 7; i++) encender(i, 0);
  }

  // Posiciones (para que la cámara pueda mirarlos uno por uno).
  const posiciones = grupo.children.map((c) => c.position.clone());

  return { grupo, encender, actualizar, apagarTodo, posiciones };
}
