import * as THREE from 'three';
import { crearResplandor, texturaResplandor, texturaRayos } from './resplandor.js';
import { modelo } from '../../core/cargador.js';

// El Hijo del hombre (Apocalipsis 1:13-18), con formas simples.
// Sin rostro detallado: la cara es solo luz. Cada rasgo que describe Juan
// tiene su propio "nivel" (0 a 1) que el guion enciende al leer el versículo:
//   ropa y cinto (1:13), cabello blanco y ojos de fuego (1:14),
//   pies de bronce ardiente (1:15), siete estrellas, espada y rostro como el sol (1:16),
//   la diestra sobre Juan (1:17) y las llaves (1:18).

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
    vuelo: [0, 0, 0, 0, 0, 0, 0], // 1:20: cada estrella va hacia su candelero
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
    color: 0xffffff, roughness: 0.55, metalness: 0, emissive: 0xfff3df, emissiveIntensity: 0.07, transparent: true, opacity: 0,
  });
  tela.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, extra);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform float uBorde;\nuniform float uCabello;\nuniform float uPies;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Colores por zona: túnica de lino, cabello y barba blancos como la nieve,
        // rostro y manos con tono de piel. (Medidas en metros sobre la escultura.)
        float enCabeza = smoothstep(1.58, 1.64, vLocal.y);
        float cara = smoothstep(0.045, 0.075, vLocal.z)
          * (1.0 - smoothstep(0.05, 0.075, abs(vLocal.x + 0.02)))
          * smoothstep(1.735, 1.76, vLocal.y) * (1.0 - smoothstep(1.86, 1.89, vLocal.y));
        float manos = smoothstep(0.37, 0.4, abs(vLocal.x))
          * smoothstep(0.76, 0.8, vLocal.y) * (1.0 - smoothstep(1.1, 1.15, vLocal.y));
        float piel = max(cara, manos);
        vec3 zona = mix(vec3(0.86, 0.82, 0.74), vec3(1.0), enCabeza);
        zona = mix(zona, vec3(0.74, 0.52, 0.38), piel);
        diffuseColor.rgb *= zona;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance *= zona;
        // Bordes que resplandecen, como luz que envuelve la figura.
        float borde = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.5);
        totalEmissiveRadiance += vec3(1.0, 0.96, 0.88) * borde * uBorde;
        // Cabeza y cabellos blancos como la nieve (1:14).
        // (el rostro, al frente, se ilumina menos para que se siga viendo)
        float cabeza = enCabeza * (1.0 - piel);
        totalEmissiveRadiance += vec3(1.0) * cabeza * uCabello * 1.2;
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
  cinto.scale.set(0.215, 0.16, 0.2); // ancho, fondo, grosor
  cinto.position.set(-0.01, 1.33, -0.03);

  // Resplandor del rostro: "como el sol" (sin mostrar facciones).
  const brilloCabello = crearResplandor(0xffffff, 0.8);
  brilloCabello.position.set(-0.02, 1.8, -0.14); // detrás de la cabeza

  // Ojos como llama de fuego: dos destellos pequeños.
  const ojos = [-0.05, 0.01].map((x) => {
    const o = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texturaResplandor(), color: 0xff5a10, transparent: true, opacity: 0, depthWrite: false })
    );
    o.position.set(x, 1.81, 0.105);
    o.scale.setScalar(0.025);
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
  estrellas.position.set(-0.42, 1.13, 0.22);
  for (let i = 0; i < 7; i++) estrellas.add(crearResplandor(0xd8e6ff, 0.13));

  // Llaves de oro en la mano izquierda (1:18).
  const llaves = new THREE.Group();
  llaves.position.set(0.43, 0.93, 0.3);
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
  espada.position.set(-0.02, 1.72, 0.09);
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
  halo.position.set(-0.02, 1.79, 0.05);
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
    tela.emissiveIntensity = 0.06 + e.sol * 0.4;
    extra.uBorde.value = 0.3 + e.sol * 0.7;
    extra.uCabello.value = e.cabello;
    oro.opacity = p;
    oro.emissiveIntensity = 0.15 * p + e.cinto * 1.2;
    luzFrente.intensity = p * 5;
    brilloCabello.material.opacity = e.cabello * 0.35;

    const llama = 0.85 + Math.sin(t * 11) * 0.1 + Math.sin(t * 27) * 0.05;
    for (const o of ojos) {
      o.material.opacity = e.ojos * llama;
      o.scale.setScalar(0.022 + e.ojos * 0.01 * llama);
    }

    const fuego = e.pies * (0.9 + Math.sin(t * 7) * 0.1);
    bronce.opacity = p;
    bronce.emissiveIntensity = fuego * 2.5;
    extra.uPies.value = fuego;
    brasa.material.opacity = fuego * 0.8;
    luzPies.intensity = fuego * 3;

    // Halo: tenue mientras se describen los detalles, fuerte cuando "resplandece".
    const pulso = 1 + Math.sin(t * 1.3) * 0.04;
    aura.material.opacity = (p * 0.14 + e.sol * 0.4) * pulso;
    // Halo del rostro: casi nada de base (para ver su rostro); fuerte solo cuando "resplandece".
    halo.material.opacity = p * 0.08 + e.sol * 0.55;
    halo.scale.setScalar(0.4 + e.sol * 2.2);
    rayos.material.opacity = (p * 0.09 + e.sol * 0.32) * pulso;
    rayos.material.rotation = t * 0.03;
    luz.intensity = p * 2 + e.sol * 2;

    estrellas.children.forEach((s, i) => {
      const a = t * 0.4 + (i * Math.PI * 2) / 7;
      s.position.set(Math.cos(a) * 0.2, Math.sin(t * 2 + i) * 0.03 + 0.04, Math.sin(a) * 0.2);
      // Vuelo en arco desde la mano hasta encima de su candelero.
      const v = e.vuelo[i];
      if (v > 0 && destinos[i]) {
        s.position.lerp(destinos[i], v);
        s.position.y += Math.sin(v * Math.PI) * 0.6;
      }
      s.scale.setScalar(0.13 + v * 0.17);
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

  // Jesús vuelve el rostro hacia Juan cuando este se mueve.
  // (Mientras las estrellas vuelan a los candeleros se queda quieto, para que lleguen a su lugar.)
  function mirarHacia(pos, dt) {
    if (estado.vuelo.some((v) => v > 0)) return;
    const dx = pos.x - grupo.position.x;
    const dz = pos.z - grupo.position.z;
    if (dx * dx + dz * dz < 0.25) return;
    // Su frente mira a +z local: con rotation.y = atan2(dx, dz) queda de cara al punto.
    let objetivo = Math.atan2(dx, dz);
    let actual = grupo.rotation.y;
    while (objetivo - actual > Math.PI) objetivo -= Math.PI * 2;
    while (objetivo - actual < -Math.PI) objetivo += Math.PI * 2;
    grupo.rotation.y = actual + (objetivo - actual) * Math.min(1, dt * 1.2);
  }

  // Destinos de las estrellas (en el espacio del grupo de estrellas), a partir de puntos del mundo.
  const destinos = [];
  function apuntarEstrellas(puntosMundo) {
    cuerpo.updateMatrixWorld(true);
    puntosMundo.forEach((p, i) => (destinos[i] = estrellas.worldToLocal(p.clone())));
  }

  function reiniciar() {
    for (const k of Object.keys(estado)) estado[k] = 0;
    estado.vuelo = [0, 0, 0, 0, 0, 0, 0];
    destinos.length = 0;
    cuerpo.rotation.x = 0;
    grupo.position.copy(posicion);
    grupo.rotation.y = Math.PI;
  }

  // Puntos del cuerpo (en coordenadas del mundo) para dirigir la mirada de la cámara.
  function punto(nombre) {
    grupo.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    switch (nombre) {
      case 'cabeza': v.set(0, 1.79, 0); break;
      case 'pecho': v.set(0, 1.34, 0); break;
      case 'centro': v.set(0, 1.1, 0); break;
      case 'pies': v.set(0, 0.08, 0.15); break;
      case 'estrellas': estrellas.getWorldPosition(v); return v;
      case 'llaves': llaves.getWorldPosition(v); return v;
    }
    return grupo.localToWorld(v);
  }

  return { grupo, estado, actualizar, reiniciar, punto, apuntarEstrellas, mirarHacia };
}
