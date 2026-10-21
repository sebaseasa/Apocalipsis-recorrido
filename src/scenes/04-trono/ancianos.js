import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cargarGeometria } from './geometria.js';

// Los veinticuatro ancianos (4:4): sentados en sillas alrededor del trono, vestidos de ropas
// blancas y con coronas de oro. En 4:10 se postran y echan sus coronas delante del trono.
// Escultura de un anciano sentado (Sketchfab, ver CREDITS.md), repetida 24 veces.

const N = 24;
const ALTO = 1.5; // anciano sentado, de los pies a la cabeza
const RADIO = 9.5;
const ASIENTO = 0.37; // altura del asiento (bajo los muslos)

// Agrega a un material el "nivel" de cada copia (0 = no está, 1 = se ve entera).
function conNivel(material, extra = null) {
  material.transparent = true;
  material.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aNivel;\nvarying float vNivel;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNivel = aNivel;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vNivel;')
      .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nif (vNivel < 0.002) discard;\ndiffuseColor.a *= vNivel;');
    extra?.(sh);
  };
  return material;
}

export function crearAncianos(centro, oro) {
  const grupo = new THREE.Group();
  const estado = { nivel: 0, postrar: 0, coronas: 0, brillo: 0 };
  const tiempo = { value: 0 };

  // Lugares: un arco alrededor del trono, abierto hacia donde está Juan (+z).
  const lugares = [];
  for (let k = 0; k < N; k++) {
    const a = THREE.MathUtils.degToRad(35 + (k * 290) / (N - 1));
    const pos = new THREE.Vector3(centro.x + Math.sin(a) * RADIO, 0, centro.z + Math.cos(a) * RADIO);
    // De frente al trono.
    lugares.push({ pos, giro: Math.atan2(centro.x - pos.x, centro.z - pos.z), angulo: a });
  }
  const niveles = new Float32Array(N);

  // --- Sillas: piedra blanca con bordes de oro ---
  const piedra = conNivel(new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.45 }));
  const oroSilla = conNivel(oro.clone());
  const partesPiedra = [
    new THREE.BoxGeometry(0.85, ASIENTO, 0.6).translate(0, ASIENTO / 2, -0.17),
    new THREE.BoxGeometry(0.85, 1.55, 0.12).translate(0, 0.78, -0.5),
    new THREE.BoxGeometry(0.1, 0.25, 0.55).translate(-0.43, ASIENTO + 0.12, -0.17),
    new THREE.BoxGeometry(0.1, 0.25, 0.55).translate(0.43, ASIENTO + 0.12, -0.17),
  ];
  const partesOro = [
    new THREE.BoxGeometry(0.95, 0.07, 0.16).translate(0, 1.58, -0.5),
    new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12).translate(-0.4, 1.66, -0.5),
    new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12).translate(0.4, 1.66, -0.5),
    new THREE.BoxGeometry(0.9, 0.04, 0.64).translate(0, 0.02, -0.17),
  ];
  const sillas = new THREE.InstancedMesh(mergeGeometries(partesPiedra), piedra, N);
  const sillasOro = new THREE.InstancedMesh(mergeGeometries(partesOro), oroSilla, N);

  // --- Coronas de oro: aro con puntas ---
  const aro = new THREE.CylinderGeometry(0.15, 0.13, 0.1, 20, 1, true);
  const puntas = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    puntas.push(new THREE.ConeGeometry(0.03, 0.11, 6).translate(Math.sin(a) * 0.145, 0.1, Math.cos(a) * 0.145));
  }
  const geoCorona = mergeGeometries([aro.toNonIndexed(), ...puntas.map((g) => g.toNonIndexed())]);
  const oroCorona = conNivel(oro.clone());
  oroCorona.side = THREE.DoubleSide;
  oroCorona.emissive = new THREE.Color(0xffb040);
  oroCorona.emissiveIntensity = 0;
  const coronas = new THREE.InstancedMesh(geoCorona, oroCorona, N);

  // --- Los ancianos ---
  const tela = conNivel(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), (sh) => {
    sh.uniforms.uTiempo = tiempo;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTiempo;\nvarying vec3 vLocal;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vLocal = position;
        // Respiración, cada uno a su ritmo.
        float pecho = smoothstep(${(ALTO * 0.45).toFixed(3)}, ${(ALTO * 0.65).toFixed(3)}, position.y) * (1.0 - smoothstep(${(ALTO * 0.75).toFixed(3)}, ${(ALTO * 0.82).toFixed(3)}, position.y));
        transformed.xz *= 1.0 + 0.012 * sin(uTiempo * 1.3 + float(gl_InstanceID) * 1.7) * pecho;`
      );
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;').replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // Ropas blancas; cabello y barba canosos; rostro y manos con tono de piel.
      float h = vLocal.y / ${ALTO.toFixed(3)};
      float cabeza = smoothstep(0.8, 0.83, h);
      float rostro = cabeza * smoothstep(-0.07, -0.04, vLocal.z) * smoothstep(0.85, 0.87, h) * (1.0 - smoothstep(0.93, 0.95, h));
      vec3 zona = mix(vec3(0.97, 0.96, 0.93), vec3(0.86, 0.85, 0.82), cabeza);
      zona = mix(zona, vec3(0.78, 0.6, 0.48), rostro);
      diffuseColor.rgb *= zona;`
    );
  });
  const cabeza = new THREE.Vector3(0, ALTO, 0); // centro de la coronilla, se mide al cargar
  let ancianos = null;
  cargarGeometria('assets/models/anciano.glb', { alto: ALTO }, (geo) => {
    // La coronilla: promedio de los puntos más altos.
    const p = geo.attributes.position;
    let n = 0;
    cabeza.set(0, 0, 0);
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < ALTO * 0.96) continue;
      cabeza.x += p.getX(i);
      cabeza.z += p.getZ(i);
      n++;
    }
    cabeza.x /= n;
    cabeza.z /= n;
    cabeza.y = ALTO * 0.955;
    ancianos = new THREE.InstancedMesh(geo, tela, N);
    for (const m of [ancianos]) {
      m.geometry.setAttribute('aNivel', new THREE.InstancedBufferAttribute(niveles, 1));
      m.frustumCulled = false;
    }
    grupo.add(ancianos);
  });
  for (const m of [sillas, sillasOro, coronas]) {
    m.geometry.setAttribute('aNivel', new THREE.InstancedBufferAttribute(niveles, 1));
    m.frustumCulled = false;
    grupo.add(m);
  }

  // Las sillas no cambian de lugar.
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const ejeY = new THREE.Vector3(0, 1, 0);
  const uno = new THREE.Vector3(1, 1, 1);
  lugares.forEach((l, k) => {
    q.setFromAxisAngle(ejeY, l.giro);
    m4.compose(l.pos, q, uno);
    sillas.setMatrixAt(k, m4);
    sillasOro.setMatrixAt(k, m4);
  });

  // Postrarse: el cuerpo se inclina hacia adelante desde las rodillas, hasta el suelo.
  const base = new THREE.Matrix4();
  const inclinar = new THREE.Matrix4();
  const pivote = new THREE.Matrix4();
  const volver = new THREE.Matrix4();
  const cuerpo = new THREE.Matrix4();
  const punto = new THREE.Vector3();
  const destino = new THREE.Vector3();
  const qCorona = new THREE.Quaternion();
  const ejeX = new THREE.Vector3(1, 0, 0);
  const clamp01 = (v) => THREE.MathUtils.clamp(v, 0, 1);
  const suave = (v) => v * v * (3 - 2 * v);

  function actualizar(t) {
    tiempo.value = t;
    oroCorona.emissiveIntensity = 0.35 + estado.brillo * 1.2;
    // Aparecen uno tras otro, de un lado al otro del arco.
    for (let k = 0; k < N; k++) niveles[k] = suave(clamp01(estado.nivel * 1.6 - (k / N) * 0.6));
    for (const m of [sillas, sillasOro, coronas, ancianos]) if (m) m.geometry.attributes.aNivel.needsUpdate = true;

    lugares.forEach((l, k) => {
      const p = suave(clamp01(estado.postrar * 1.4 - (k % 6) * 0.06));
      q.setFromAxisAngle(ejeY, l.giro);
      base.compose(l.pos, q, uno);
      // Pivote en el frente de las rodillas, a ras del suelo.
      pivote.makeTranslation(0, 0, 0.42);
      volver.makeTranslation(0, 0, -0.42);
      inclinar.makeRotationX(p * 1.25);
      cuerpo.copy(base).multiply(pivote).multiply(inclinar).multiply(volver);
      if (ancianos) ancianos.setMatrixAt(k, cuerpo);

      // La corona: sobre la cabeza, o volando hasta el pie del trono (4:10).
      const c = suave(clamp01(estado.coronas * 1.35 - (k / N) * 0.35));
      punto.copy(cabeza).applyMatrix4(cuerpo);
      destino.set(Math.sin(l.angulo) * 4.35, 0.27, Math.cos(l.angulo) * 4.35).add(centro);
      punto.lerp(destino, c);
      punto.y += Math.sin(c * Math.PI) * 1.6;
      qCorona.setFromAxisAngle(ejeX, (1 - c) * p * 1.25).premultiply(q);
      m4.compose(punto, qCorona, uno);
      coronas.setMatrixAt(k, m4);
    });
    if (ancianos) ancianos.instanceMatrix.needsUpdate = true;
    coronas.instanceMatrix.needsUpdate = true;
    sillas.instanceMatrix.needsUpdate = true;
    sillasOro.instanceMatrix.needsUpdate = true;
  }

  // Dónde está un anciano (para que la cámara lo mire).
  const lugar = (k) => lugares[k].pos.clone().setY(1.1);

  return { grupo, estado, actualizar, lugar, N };
}
