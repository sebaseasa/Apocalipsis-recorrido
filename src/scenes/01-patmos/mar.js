import * as THREE from 'three';
import { textura } from '../../core/cargador.js';

// Cielo real de atardecer (foto panorámica de Poly Haven) y un mar que lo refleja.
// La foto se gira para que el sol quede justo frente a la boca de la cueva (-z).

// Posición horizontal del sol en la foto (0 a 1), medida sobre la imagen.
const SOL_U = 0.574;

const muestreo = /* glsl */ `
  uniform sampler2D uCielo;
  uniform float uBrillo;
  vec3 cielo(vec3 d) {
    float u = atan(d.z, d.x) / 6.2831853 + 0.5 + ${(SOL_U - 0.25).toFixed(4)};
    float v = asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5;
    return texture2D(uCielo, vec2(fract(u), v)).rgb * uBrillo;
  }
`;

export function crearMar() {
  const grupo = new THREE.Group();
  const mapa = textura('assets/hdri/atardecer-belfast.webp', { color: true });
  mapa.generateMipmaps = false;
  mapa.minFilter = THREE.LinearFilter;
  const uniforms = { uCielo: { value: mapa }, uBrillo: { value: 1 }, uTiempo: { value: 0 } };

  const cieloMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      ${muestreo}
      void main() {
        gl_FragColor = vec4(cielo(normalize(vDir)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), cieloMat);
  cielo.renderOrder = -1;
  grupo.add(cielo);

  const marMat = new THREE.ShaderMaterial({
    fog: false,
    toneMapped: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        vPos = p.xyz;
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      varying vec3 vPos;
      ${muestreo}
      void main() {
        vec2 p = vPos.xz;
        float t = uTiempo;
        float lejos = length(vPos.xz - cameraPosition.xz);
        // Olas: suma de ondas; se suavizan a lo lejos para no titilar.
        float k = 1.0 / (1.0 + lejos * 0.01);
        vec2 g = vec2(0.0);
        g += vec2(0.3, 1.0) * cos(dot(p, vec2(0.03, 0.10)) + t * 0.6) * 0.10;
        g += vec2(-0.7, 0.7) * cos(dot(p, vec2(-0.09, 0.09)) + t * 0.9) * 0.07;
        g += vec2(1.0, 0.2) * cos(dot(p, vec2(0.25, 0.05)) + t * 1.4) * 0.05 * k;
        g += vec2(0.2, -1.0) * cos(dot(p, vec2(0.08, -0.4)) + t * 1.9) * 0.04 * k;
        g += vec2(0.6, 0.8) * cos(dot(p, vec2(0.6, 0.8)) + t * 2.7) * 0.03 * k;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 v = normalize(vPos - cameraPosition);
        vec3 r = reflect(v, n);
        r.y = abs(r.y) + 0.02;
        float fres = 0.03 + 0.97 * pow(1.0 - max(dot(-v, n), 0.0), 5.0);
        vec3 agua = vec3(0.015, 0.03, 0.05) * uBrillo;
        vec3 c = mix(agua, cielo(normalize(r)), fres);
        // Cerca del horizonte el mar se funde con el cielo.
        c = mix(c, cielo(normalize(vec3(v.x, 0.0, v.z))), smoothstep(250.0, 480.0, lejos));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), marMat);
  mar.rotation.x = -Math.PI / 2;
  mar.position.y = -6;
  grupo.add(mar);

  function actualizar(t) {
    uniforms.uTiempo.value = t;
  }

  // Brillo del paisaje exterior (se atenúa cuando miramos hacia el fondo de la cueva).
  function brillo(valor) {
    uniforms.uBrillo.value = valor;
  }

  return { grupo, actualizar, brillo, mapa };
}
