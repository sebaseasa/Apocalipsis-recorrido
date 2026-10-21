import * as THREE from 'three';
import { texturaResplandor } from './resplandor.js';

// Rayos de luz que entran por la boca y polvo que flota en el aire.

export function crearAtmosfera(bocaZ) {
  const grupo = new THREE.Group();

  // Rayos: un cono abierto que sale de la boca hacia adentro, muy tenue.
  const haz = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 3.6, 13, 32, 1, true),
    new THREE.ShaderMaterial({
      uniforms: { uNivel: { value: 1 }, uTiempo: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      vertexShader: /* glsl */ `
        varying float vLargo;
        varying vec3 vNormal;
        varying vec3 vVista;
        varying float vAng;
        void main() {
          vLargo = uv.y;
          vAng = uv.x;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vVista = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uNivel;
        uniform float uTiempo;
        varying float vLargo;
        varying vec3 vNormal;
        varying vec3 vVista;
        varying float vAng;
        void main() {
          // Más fuerte junto a la boca; bordes suaves; franjas que se mueven despacio.
          float borde = pow(abs(dot(normalize(vNormal), normalize(vVista))), 1.5);
          float franjas = 0.6 + 0.4 * sin(vAng * 40.0 + uTiempo * 0.15) * sin(vAng * 17.0 - uTiempo * 0.1);
          float a = borde * pow(vLargo, 2.0) * franjas * 0.07 * uNivel;
          gl_FragColor = vec4(vec3(1.0, 0.7, 0.42) * a, a);
        }`,
    })
  );
  haz.rotation.x = -Math.PI / 2; // el extremo angosto (uv.y = 1) queda hacia la boca
  haz.position.set(0, 2.1, bocaZ + 6.5);
  grupo.add(haz);

  // Polvo: puntitos que flotan, más visibles donde entra la luz.
  const cantidad = 500;
  const pos = new Float32Array(cantidad * 3);
  const fase = new Float32Array(cantidad);
  for (let i = 0; i < cantidad; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 7;
    pos[i * 3 + 1] = Math.random() * 4.2;
    pos[i * 3 + 2] = bocaZ + 1 + Math.random() * 22;
    fase[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
  const polvoMat = new THREE.ShaderMaterial({
    uniforms: {
      uTiempo: { value: 0 },
      uMapa: { value: texturaResplandor() },
      uBoca: { value: bocaZ },
      uNivel: { value: 1 },
      uEscala: { value: 300 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */ `
      attribute float fase;
      uniform float uTiempo;
      uniform float uBoca;
      uniform float uEscala;
      varying float vLuz;
      void main() {
        vec3 p = position;
        p.x += sin(uTiempo * 0.1 + fase) * 0.3;
        p.y += sin(uTiempo * 0.07 + fase * 1.3) * 0.25;
        p.z += cos(uTiempo * 0.05 + fase * 0.7) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        // Brillan más cerca de la boca (donde entra el sol).
        vLuz = 0.15 + 0.85 * smoothstep(uBoca + 14.0, uBoca + 1.0, p.z);
        vLuz *= 0.6 + 0.4 * sin(uTiempo + fase * 5.0);
        gl_PointSize = uEscala * 0.02 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMapa;
      uniform float uNivel;
      varying float vLuz;
      void main() {
        float a = texture2D(uMapa, gl_PointCoord).a * vLuz * uNivel * 0.6;
        gl_FragColor = vec4(vec3(1.0, 0.85, 0.65) * a, a);
      }`,
  });
  const polvo = new THREE.Points(geo, polvoMat);
  polvo.frustumCulled = false;
  grupo.add(polvo);

  function actualizar(t) {
    haz.material.uniforms.uTiempo.value = t;
    polvoMat.uniforms.uTiempo.value = t;
  }

  // Intensidad de los rayos (se apagan al darnos vuelta, la luz queda a la espalda).
  function rayos(valor) {
    haz.material.uniforms.uNivel.value = valor;
  }

  // Tamaño de los puntos según la altura de la pantalla, para que se vean igual en todo equipo.
  function ajustarPantalla(altoPixeles) {
    polvoMat.uniforms.uEscala.value = altoPixeles;
  }

  return { grupo, actualizar, rayos, ajustarPantalla };
}
