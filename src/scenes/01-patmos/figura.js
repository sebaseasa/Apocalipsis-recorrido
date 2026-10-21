import * as THREE from 'three';
import { crearResplandor, texturaResplandor } from './resplandor.js';

// El Hijo del hombre (Apocalipsis 1:13-18), con formas simples.
// Sin rostro detallado: la cara es solo luz. Cada rasgo que describe Juan
// tiene su propio "nivel" (0 a 1) que el guion enciende al leer el versículo:
//   ropa y cinto (1:13), cabello blanco y ojos de fuego (1:14),
//   pies de bronce ardiente (1:15), siete estrellas, espada y rostro como el sol (1:16),
//   la diestra sobre Juan (1:17) y las llaves (1:18).

// Material "de luz": la tela brilla por sí misma, con bordes más luminosos
// y vetas suaves que suben, como luz que fluye. Valores mayores a 1 para que resplandezca.
function materialLuz(color, borde) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uBorde: { value: new THREE.Color(borde) },
      uOpacidad: { value: 0 },
      uBrillo: { value: 1 },
      uTiempo: { value: 0 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vP = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uBorde;
      uniform float uOpacidad;
      uniform float uBrillo;
      uniform float uTiempo;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      void main() {
        vec3 n = normalize(vN);
        float borde = pow(1.0 - abs(dot(n, normalize(vV))), 2.2);
        float luz = 0.68 + 0.32 * max(dot(n, normalize(vec3(0.3, 0.8, 0.5))), 0.0);
        float vetas = 0.97 + 0.03 * sin(vP.y * 9.0 - uTiempo * 0.8);
        vec3 c = (uColor * luz * vetas + uBorde * borde * 1.6) * uBrillo;
        gl_FragColor = vec4(c, uOpacidad);
      }`,
  });
}

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

  // Vestidura larga hasta los pies: blanca, con algo de volumen.
  const tela = materialLuz(0xfff3e2, 0xffffff);
  tela.uniforms.uColor.value.multiplyScalar(1.05);
  const perfil = [
    [0.0, 0.02], [0.5, 0.02], [0.44, 0.4], [0.36, 0.9], [0.3, 1.3], [0.29, 1.55], [0.33, 1.72], [0.24, 1.84], [0.1, 1.9], [0, 1.9],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  // Perfil suavizado y pliegues verticales que se abren hacia abajo, como tela que cae.
  const geoVestidura = new THREE.LatheGeometry(new THREE.SplineCurve(perfil).getPoints(48), 64);
  {
    const p = geoVestidura.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(z, x);
      const caida = THREE.MathUtils.clamp(1 - y / 1.5, 0, 1);
      const pliegue = 1 + (0.07 * Math.sin(a * 9 + y * 0.6) + 0.03 * Math.sin(a * 17 - y)) * caida;
      p.setX(i, x * pliegue);
      p.setZ(i, z * pliegue);
    }
    geoVestidura.computeVertexNormals();
  }
  const vestidura = new THREE.Mesh(geoVestidura, tela);

  // Cinto de oro a la altura del pecho.
  const oro = new THREE.MeshStandardMaterial({
    color: 0xd9a640, emissive: 0xffb030, emissiveIntensity: 0, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0,
  });
  const cinto = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.035, 8, 40), oro);
  cinto.rotation.x = Math.PI / 2;
  cinto.position.y = 1.56;

  // Cabeza: solo luz, sin facciones.
  const luzRostro = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, fog: false });
  luzRostro.color.setRGB(2.4, 2.3, 2.1);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), luzRostro);
  cabeza.position.y = 2.06;
  cabeza.scale.y = 1.15;

  // Cabello blanco como la lana, como la nieve: cae detrás de la cabeza hasta los hombros.
  const lana = materialLuz(0xffffff, 0xffffff);
  const cabelloArriba = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), lana);
  cabelloArriba.position.set(0, 2.1, -0.04);
  const cabelloAtras = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 0.42, 16, 1, true), lana);
  cabelloAtras.position.set(0, 1.86, -0.07);
  const brilloCabello = crearResplandor(0xffffff, 0.9);
  brilloCabello.position.set(0, 2.06, -0.1);

  // Ojos como llama de fuego: dos destellos pequeños, sin dibujar un rostro.
  const ojos = [-0.05, 0.05].map((x) => {
    const o = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texturaResplandor(), color: 0xff5a10, transparent: true, opacity: 0, depthWrite: false })
    );
    o.position.set(x, 2.08, 0.15);
    o.scale.setScalar(0.07);
    return o;
  });

  // Pies semejantes al latón fino, ardientes como en un horno.
  const bronce = new THREE.MeshStandardMaterial({
    color: 0xb87333, emissive: 0xff5a10, emissiveIntensity: 0, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0,
  });
  const pies = [-0.12, 0.12].map((x) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), bronce);
    p.position.set(x, 0.04, 0.48);
    p.scale.set(0.9, 0.55, 1.7);
    return p;
  });
  const brasa = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.8),
    new THREE.MeshBasicMaterial({
      map: texturaResplandor(), color: 0xff6a20, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  brasa.rotation.x = -Math.PI / 2;
  brasa.position.set(0, 0.02, 0.35);
  const luzPies = new THREE.PointLight(0xff6a20, 0, 4, 2);
  luzPies.position.set(0, 0.3, 0.7);

  // Brazos con hombro como bisagra. La diestra (a la izquierda de quien mira) tiene las estrellas.
  // Mangas anchas que caen desde el hombro.
  const geoBrazo = new THREE.CylinderGeometry(0.07, 0.13, 0.72, 16, 1, true);
  geoBrazo.translate(0, -0.36, 0); // que gire desde el hombro
  const hombroDer = new THREE.Group();
  hombroDer.position.set(-0.3, 1.76, 0);
  hombroDer.add(new THREE.Mesh(geoBrazo, tela));
  const hombroIzq = new THREE.Group();
  hombroIzq.position.set(0.3, 1.76, 0);
  hombroIzq.add(new THREE.Mesh(geoBrazo, tela));

  // Siete estrellas en la diestra.
  const estrellas = new THREE.Group();
  estrellas.position.set(0, -0.86, 0);
  for (let i = 0; i < 7; i++) estrellas.add(crearResplandor(0xd8e6ff, 0.16));
  hombroDer.add(estrellas);

  // Llaves de oro en la mano izquierda (1:18).
  const llaves = new THREE.Group();
  llaves.position.set(0, -0.8, 0.02);
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
  hombroIzq.add(llaves);

  // Espada aguda de dos filos que sale de su boca, hacia quien mira.
  const filo = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, fog: false });
  filo.color.setRGB(2.6, 2.7, 3.0);
  const hoja = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.1, 0.9, 4), filo);
  hoja.scale.set(1, 1, 0.3); // aplanada: dos filos
  hoja.rotation.x = Math.PI / 2; // la punta mira al frente
  hoja.position.z = 0.42;
  const espada = new THREE.Group();
  espada.position.set(0, 2.0, 0.13);
  // Un poco hacia abajo y de lado, para que se distinga (como en el grabado de Durero).
  espada.rotation.set(0.15, 0.7, 0);
  espada.add(hoja);

  const cuerpo = new THREE.Group();
  cuerpo.add(vestidura, cinto, cabeza, cabelloArriba, cabelloAtras, brilloCabello, ...ojos, ...pies, brasa, luzPies,
    hombroDer, hombroIzq, espada);
  grupo.add(cuerpo);

  // Resplandor que lo rodea y halo del rostro ("como el sol cuando resplandece en su fuerza").
  const aura = crearResplandor(0xfff4dd, 1);
  aura.position.y = 1.2;
  aura.scale.set(4, 5.5, 1);
  const halo = crearResplandor(0xffffff, 1);
  halo.position.set(0, 2.06, 0.1);
  const rayos = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texturaRayos(), color: 0xfff0d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  rayos.position.set(0, 1.7, -0.3);
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

    tela.uniforms.uOpacidad.value = p;
    tela.uniforms.uBrillo.value = 0.85 + e.sol * 0.5;
    tela.uniforms.uTiempo.value = t;
    oro.opacity = p;
    oro.emissiveIntensity = 0.15 * p + e.cinto * 1.2;
    luzRostro.opacity = p;

    lana.uniforms.uOpacidad.value = p * (0.45 + e.cabello * 0.5);
    lana.uniforms.uBrillo.value = 0.9 + e.cabello * 0.9;
    lana.uniforms.uTiempo.value = t;
    brilloCabello.material.opacity = e.cabello * 0.6;

    const llama = 0.85 + Math.sin(t * 11) * 0.1 + Math.sin(t * 27) * 0.05;
    for (const o of ojos) {
      o.material.opacity = e.ojos * llama;
      o.scale.setScalar(0.06 + e.ojos * 0.03 * llama);
    }

    const fuego = e.pies * (0.9 + Math.sin(t * 7) * 0.1);
    bronce.opacity = p;
    bronce.emissiveIntensity = fuego * 2.5;
    brasa.material.opacity = fuego * 0.8;
    luzPies.intensity = fuego * 3;

    // Halo: tenue mientras se describen los detalles, fuerte cuando "resplandece".
    const pulso = 1 + Math.sin(t * 1.3) * 0.04;
    aura.material.opacity = (p * 0.3 + e.sol * 0.45) * pulso;
    halo.material.opacity = p * 0.5 + e.sol * 0.5;
    halo.scale.setScalar(0.7 + e.sol * 2.2);
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

    // Diestra: en alto con las estrellas, o extendida hacia abajo, hacia Juan.
    hombroDer.rotation.x = mezclar(-1.9, -1.2, e.mano);
    hombroDer.rotation.z = mezclar(-0.35, -0.1, e.mano);
    hombroIzq.rotation.x = mezclar(-0.25, -0.9, e.llaves);
    hombroIzq.rotation.z = 0.2;
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
      case 'cabeza': v.set(0, 2.0, 0); break;
      case 'pecho': v.set(0, 1.5, 0); break;
      case 'centro': v.set(0, 1.2, 0); break;
      case 'pies': v.set(0, 0.1, 0.4); break;
      case 'estrellas': estrellas.getWorldPosition(v); return v;
      case 'llaves': llaves.getWorldPosition(v); return v;
    }
    return grupo.localToWorld(v);
  }

  return { grupo, estado, actualizar, reiniciar, punto };
}
