import * as THREE from 'three';
import { modelo } from '../../core/cargador.js';
import { crearUniformesVida, inyectarVida } from '../../core/vida.js';

// Juan, visto desde fuera (modo "Desde fuera"). Escultura de un anciano con túnica y libro
// (Sketchfab, ver CREDITS.md), con colores de tela, cabello canoso y piel.
// Medidas en metros; los pies en el origen; su frente mira a +z local.

const ALTO = 1.78; // estatura de Juan (sin pedestal)
const PEDESTAL = 0.15; // lo que se hunde bajo el suelo

export function crearJuan() {
  const grupo = new THREE.Group();
  grupo.visible = false;
  const cuerpo = new THREE.Group(); // gira desde los pies al caer
  grupo.add(cuerpo);

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  // Vida: respira, la túnica se mueve y se mece al caminar.
  const vida = crearUniformesVida();
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uAlto = { value: ALTO };
    inyectarVida(sh, vida, { alto: ALTO, cuello: 1.5, pivote: [0, 1.5, 0] });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform float uAlto;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Túnica de lana color tierra; cabeza con cabello y barba canosos; rostro con tono de piel.
        float h = vLocal.y / uAlto;
        float cabeza = smoothstep(0.82, 0.86, h);
        float rostro = cabeza * smoothstep(0.03, 0.08, vLocal.z) * (1.0 - smoothstep(0.06, 0.09, abs(vLocal.x)))
          * smoothstep(0.88, 0.9, h) * (1.0 - smoothstep(0.95, 0.97, h));
        vec3 zona = mix(vec3(0.46, 0.34, 0.24), vec3(0.78, 0.76, 0.72), cabeza);
        zona = mix(zona, vec3(0.7, 0.5, 0.38), rostro);
        diffuseColor.rgb *= zona;`
      );
  };

  modelo('assets/models/juan.glb', (escena) => {
    escena.updateMatrixWorld(true);
    const geos = [];
    escena.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      geos.push(g);
    });
    for (const g of geos) {
      g.computeBoundingBox();
      const b = g.boundingBox;
      const escala = (ALTO + PEDESTAL) / (b.max.y - b.min.y);
      // Centrado en x/z, con los pies (bajo el pedestal) en el suelo.
      g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      g.scale(escala, escala, escala);
      g.translate(0, -PEDESTAL, 0);
      g.computeVertexNormals();
      cuerpo.add(new THREE.Mesh(g, material));
    }
  });

  // Coloca a Juan donde están sus ojos (pos), mirando hacia "giro" (el de la cámara).
  // "caida" (0 de pie, 1 tendido en el suelo) para 1:17: "caí como muerto á sus pies".
  // t: tiempo; andar: 0 quieto a 1 caminando.
  function animar(t, andar) {
    vida.uTiempo.value = t;
    vida.uAndar.value += (andar - vida.uAndar.value) * 0.1;
    vida.uCabezaGiro.value = Math.sin(t * 0.31) * 0.05;
  }

  function colocar(ojo, giro, caida) {
    grupo.position.set(ojo.x, 0, ojo.z);
    // La cámara con giro 0 mira a -z; el frente de Juan es +z: media vuelta.
    grupo.rotation.y = giro + Math.PI;
    cuerpo.rotation.x = caida * 1.45;
    // Al caer, el cuerpo se adelanta para que la cabeza quede donde estaban los ojos.
    cuerpo.position.z = -caida * 0.8;
  }

  return { grupo, colocar, animar };
}
