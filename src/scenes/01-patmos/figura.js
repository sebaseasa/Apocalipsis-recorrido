import * as THREE from 'three';
import { crearResplandor, texturaResplandor } from './resplandor.js';
import { modelo } from '../../core/cargador.js';

// El Hijo del hombre (Apocalipsis 1:13-18), con formas simples.
// Sin rostro detallado: la cara es solo luz. Cada rasgo que describe Juan
// tiene su propio "nivel" (0 a 1) que el guion enciende al leer el versículo:
//   ropa y cinto (1:13), cabello blanco y ojos de fuego (1:14),
//   pies de bronce ardiente (1:15), siete estrellas, espada y rostro como el sol (1:16),
//   la diestra sobre Juan (1:17) y las llaves (1:18).

// Rayos de luz detrás de la figura (dibujados una vez en un lienzo).
function texturaRayos() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.translate(256, 256);
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2 + Math.random() * 0.05;
    const largo = 140 + Math.random() * 116;
    const ancho = 0.008 + Math.random() * 0.02;
    const grad = g.createLinearGradient(0, 0, Math.cos(a) * largo, Math.sin(a) * largo);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, largo, a - ancho, a + ancho);
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crearFigura(posicion) {
  const grupo = new THREE.Group();
  grupo.position.copy(posicion);
  grupo.rotation.y = Math.PI; // mira hacia la boca de la cueva (-z); su frente es +z local

  const estado = {
    presencia: 0,
    cinto: 0,
    cabello: 0,
    ojos: 0,
    pies: 0,
    estrellas: 0,
    espada: 0,
    sol: 0,
    mano: 0, // 0: diestra en alto con las estrellas; 1: extendida hacia Juan
    llaves: 0,
  };

  // Cuerpo: escultura real de Cristo con túnica hasta los pies (Sketchfab, ver CREDITS.md),
  // con material de mármol que brilla por sí mismo y bordes de luz.
  // Medidas en metros, con la figura de 2 m de alto mirando a +z local.
  const extra = {
    uBorde: { value: 0.9 },
    uCabello: { value: 0 },
    uPies: { value: 0 },
  };
  const tela = new THREE.MeshStandardMaterial({
    color: 0xf6f1e8, roughness: 0.55, metalness: 0, emissive: 0xfff3df, emissiveIntensity: 0.12, transparent: true, opacity: 0,
  });
  tela.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, extra);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform float uBorde;\nuniform float uCabello;\nuniform float uPies;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // Bordes que resplandecen, como luz que envuelve la figura.
        float borde = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.5);
        totalEmissiveRadiance += vec3(1.0, 0.96, 0.88) * borde * uBorde;
        // Cabeza y cabellos blancos como la nieve (1:14).
        float cabeza = smoothstep(1.62, 1.75, vLocal.y);
        totalEmissiveRadiance += vec3(1.0) * cabeza * uCabello * 1.4;
        // Pies ardientes como en un horno (1:15).
        float pie = 1.0 - smoothstep(0.0, 0.16, vLocal.y);
        totalEmissiveRadiance += vec3(1.0, 0.42, 0.08) * pie * uPies * 2.5;`
      );
  };
  const cuerpo = new THREE.Group();
  modelo('assets/models/jesus.glb', (escena) => {
    escena.updateMatrixWorld(true);
    escena.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      geo.scale(2 / 880, 2 / 880, 2 / 880);
      geo.translate(0, -0.06, 0); // el pedestal queda bajo el suelo
      geo.computeVertexNormals();
      cuerpo.add(new THREE.Mesh(geo, tela));
    });
  });

  // Cinto de oro "por los pechos".
  const oro = new THREE.MeshStandardMaterial({
    color: 0xd9a640, emissive: 0xffb030, emissiveIntensity: 0, metalness: 0.8, roughness: 0.3, transparent: true, opacity: 0,
  });
  const cinto = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 10, 48), oro);
  cinto.rotation.x = Math.PI / 2;
  cinto.scale.set(0.24, 0.17, 0.2); // ancho, fondo, grosor
  cinto.position.set(-0.01, 1.36, -0.03);

  // Resplandor del rostro: "como el sol" (sin mostrar facciones).
  const brilloCabello = crearResplandor(0xffffff, 0.8);
  brilloCabello.position.set(-0.02, 1.86, -0.05);

  // Ojos como llama de fuego: dos destellos pequeños.
  const ojos = [-0.055, 0.02].map((x) => {
    const o = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texturaResplandor(), color: 0xff5a10, transparent: true, opacity: 0, depthWrite: false })
    );
    o.position.set(x, 1.82, 0.11);
    o.scale.setScalar(0.05);
    return o;
  });

  // Pies de bronce que asoman bajo la túnica.
  const bronce = new THREE.MeshStandardMaterial({
    color: 0xb87333, emissive: 0xff5a10, emissiveIntensity: 0, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0,
  });
  const pies = [-0.08, 0.07].map((x) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), bronce);
    p.position.set(x, 0.02, 0.13);
    p.scale.set(0.9, 0.55, 1.8);
    return p;
  });
  const brasa = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({
      map: texturaResplandor(), color: 0xff6a20, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  brasa.rotation.x = -Math.PI / 2;
  brasa.position.set(0, 0.03, 0.1);
  const luzPies = new THREE.PointLight(0xff6a20, 0, 4, 2);
  luzPies.position.set(0, 0.3, 0.6);

  // Siete estrellas sobre la mano derecha (a la izquierda de quien mira).
  const estrellas = new THREE.Group();
  estrellas.position.set(-0.42, 1.2, 0.22);
  for (let i = 0; i < 7; i++) estrellas.add(crearResplandor(0xd8e6ff, 0.13));

  // Llaves de oro en la mano izquierda (1:18).
  const llaves = new THREE.Group();
  llaves.position.set(0.43, 0.98, 0.3);
  for (const [dx, giro] of [[-0.03, 0.3], [0.03, -0.3]]) {
    const llave = new THREE.Group();
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 16), oro);
    anillo.position.y = 0.05;
    const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.15, 6), oro);
    vara.position.y = -0.04;
    const diente = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.01), oro);
    diente.position.set(0.02, -0.1, 0);
    llave.add(anillo, vara, diente);
    llave.position.x = dx;
    llave.rotation.z = giro;
    llaves.add(llave);
  }
  const brilloLlaves = crearResplandor(0xffd27a, 0.35);
  llaves.add(brilloLlaves);

  // Espada aguda de dos filos que sale de su boca.
  const filo = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, fog: false });
  filo.color.setRGB(2.6, 2.7, 3.0);
  const hoja = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.08, 0.8, 4), filo);
  hoja.scale.set(1, 1, 0.3); // aplanada: dos filos
  hoja.rotation.x = Math.PI / 2; // la punta mira al frente
  hoja.position.z = 0.4;
  const espada = new THREE.Group();
  espada.position.set(-0.02, 1.77, 0.09);
  // Un poco hacia abajo y de lado, para que se distinga (como en el grabado de Durero).
  espada.rotation.set(0.15, 0.7, 0);
  espada.add(hoja);

  cuerpo.add(cinto, brilloCabello, ...ojos, ...pies, brasa, luzPies, estrellas, llaves, espada);
  // Luz propia que dibuja los pliegues de la escultura.
  const luzFrente = new THREE.SpotLight(0xfff4e6, 0, 8, 0.6, 0.8, 1.5);
  luzFrente.position.set(0.6, 3, 2.2);
  luzFrente.target.position.set(0, 1.1, 0);
  cuerpo.add(luzFrente, luzFrente.target);
  grupo.add(cuerpo);

  // Resplandor que lo rodea y halo del rostro ("como el sol cuando resplandece en su fuerza").
  const aura = crearResplandor(0xfff4dd, 1);
  aura.position.y = 1.2;
  aura.scale.set(4, 5.5, 1);
  const halo = crearResplandor(0xffffff, 1);
  halo.position.set(-0.02, 1.84, 0.12);
  const rayos = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texturaRayos(), color: 0xfff0d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  rayos.position.set(0, 1.6, -0.3);
  rayos.scale.setScalar(4.5);
  grupo.add(rayos, aura, halo);

  const luz = new THREE.PointLight(0xfff1dd, 0, 12, 2);
  luz.position.set(0, 1.8, 0.8);
  grupo.add(luz);

  const mezclar = THREE.MathUtils.lerp;

  function actualizar(t) {
    const e = estado;
    const p = e.presencia;
    grupo.visible = p > 0;

    tela.opacity = p;
    tela.emissiveIntensity = 0.12 + e.sol * 0.45;
    extra.uBorde.value = 0.55 + e.sol * 0.8;
    extra.uCabello.value = e.cabello;
    oro.opacity = p;
    oro.emissiveIntensity = 0.15 * p + e.cinto * 1.2;
    luzFrente.intensity = p * 9;
    brilloCabello.material.opacity = e.cabello * 0.5;

    const llama = 0.85 + Math.sin(t * 11) * 0.1 + Math.sin(t * 27) * 0.05;
    for (const o of ojos) {
      o.material.opacity = e.ojos * llama;
      o.scale.setScalar(0.06 + e.ojos * 0.03 * llama);
    }

    const fuego = e.pies * (0.9 + Math.sin(t * 7) * 0.1);
    bronce.opacity = p;
    bronce.emissiveIntensity = fuego * 2.5;
    extra.uPies.value = fuego;
    brasa.material.opacity = fuego * 0.8;
    luzPies.intensity = fuego * 3;

    // Halo: tenue mientras se describen los detalles, fuerte cuando "resplandece".
    const pulso = 1 + Math.sin(t * 1.3) * 0.04;
    aura.material.opacity = (p * 0.3 + e.sol * 0.45) * pulso;
    halo.material.opacity = p * 0.5 + e.sol * 0.5;
    halo.scale.setScalar(0.5 + e.sol * 2.2);
    rayos.material.opacity = (p * 0.18 + e.sol * 0.35) * pulso;
    rayos.material.rotation = t * 0.03;
    luz.intensity = p * 2 + e.sol * 2;

    estrellas.children.forEach((s, i) => {
      const a = t * 0.4 + (i * Math.PI * 2) / 7;
      s.position.set(Math.cos(a) * 0.2, Math.sin(t * 2 + i) * 0.03 + 0.04, Math.sin(a) * 0.2);
      s.material.opacity = e.estrellas * (0.8 + Math.sin(t * 5 + i * 2) * 0.2);
    });

    espada.scale.set(1, 1, Math.max(e.espada, 0.001));
    filo.opacity = Math.min(1, e.espada * 1.5);

    // "Puso su diestra sobre mí": se inclina hacia Juan, tendido a sus pies.
    cuerpo.rotation.x = mezclar(0, 0.16, e.mano);
    llaves.visible = e.llaves > 0;
    llaves.scale.setScalar(Math.max(e.llaves, 0.001));
    brilloLlaves.material.opacity = e.llaves * 0.7;
  }

  function reiniciar() {
    for (const k of Object.keys(estado)) estado[k] = 0;
    grupo.position.copy(posicion);
  }

  // Puntos del cuerpo (en coordenadas del mundo) para dirigir la mirada de la cámara.
  function punto(nombre) {
    grupo.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    switch (nombre) {
      case 'cabeza': v.set(0, 1.84, 0); break;
      case 'pecho': v.set(0, 1.4, 0); break;
      case 'centro': v.set(0, 1.15, 0); break;
      case 'pies': v.set(0, 0.08, 0.15); break;
      case 'estrellas': estrellas.getWorldPosition(v); return v;
      case 'llaves': llaves.getWorldPosition(v); return v;
    }
    return grupo.localToWorld(v);
  }

  return { grupo, estado, actualizar, reiniciar, punto };
}
