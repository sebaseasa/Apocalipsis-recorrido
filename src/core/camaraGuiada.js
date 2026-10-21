import * as THREE from 'three';

// Cámara que sigue el guion (posición, giro y altura de la mirada)
// y suma un pequeño desvío cuando el usuario arrastra para mirar.

export function crearCamaraGuiada() {
  const camara = new THREE.PerspectiveCamera(60, 1, 0.05, 900);
  camara.rotation.order = 'YXZ';

  const guia = {
    posicion: new THREE.Vector3(),
    giro: 0, // radianes; 0 mira hacia -z
    inclinacion: 0, // radianes; positivo mira hacia arriba
    temblor: 0,
    ladeo: 0, // radianes; inclina la cabeza hacia un lado (al caer)
    // Punto al que mira la cámara. Con pesoFoco = 1 manda sobre giro e inclinación.
    foco: new THREE.Vector3(),
    pesoFoco: 0,
    // Deriva: un movimiento lento y suave alrededor de la posición (0 = quieta).
    deriva: 0,
  };
  const hacia = new THREE.Vector3();

  const desvio = { giro: 0, inclinacion: 0, arrastrando: false };
  // Modo caminar (opcional): Juan se mueve con la palanca; el guion sigue igual.
  // En este modo la mirada es totalmente libre (giro completo); al apagarlo vuelve al guion.
  const libre = { activo: false, x: 0, y: 0, mezcla: 0, giro: 0, inclinacion: 0, desplazamiento: new THREE.Vector3() };
  const vista = { giro: 0, inclinacion: 0 }; // lo que se ve ahora (para empezar a caminar sin saltos)
  // Tres formas de ver: 'juan' (sus ojos), 'detras' (detrás de Juan) y 'testigo'
  // (desde otro lugar de la cueva, viendo a Juan y a Jesús juntos).
  const modoVista = { actual: 'juan', transicion: 1, desdePos: new THREE.Vector3(), desdeQuat: new THREE.Quaternion() };
  const testigo = { pos: new THREE.Vector3(), giro: 0, inclinacion: 0, listo: false };
  const objetivo = { punto: new THREE.Vector3(), hay: false }; // a quién mira el testigo además de Juan
  const ojo = new THREE.Vector3(); // dónde están los ojos de Juan
  const atras = new THREE.Vector3();
  const medio = new THREE.Vector3();
  const lado = new THREE.Vector3();
  const destinoPos = new THREE.Vector3();
  const destinoQuat = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const adelante = new THREE.Vector3();
  const derecha = new THREE.Vector3();
  let sensibilidad = 0.004;
  // Hasta dónde se puede caminar (por defecto, dentro de la cueva).
  const CUEVA = { x0: -3.3, x1: 3.3, z0: -18.5, z1: 4.5 };
  const lim = { ...CUEVA };

  function arrastrar(dx, dy, activo) {
    desvio.arrastrando = activo;
    if (!activo) return;
    if (libre.activo) {
      libre.giro += dx * sensibilidad;
      libre.inclinacion = THREE.MathUtils.clamp(libre.inclinacion + dy * sensibilidad, -0.9, 0.9);
      return;
    }
    desvio.giro = THREE.MathUtils.clamp(desvio.giro + dx * sensibilidad, -1.1, 1.1);
    desvio.inclinacion = THREE.MathUtils.clamp(desvio.inclinacion + dy * sensibilidad, -0.6, 0.6);
  }

  function actualizar(t, dt) {
    // Al soltar, la mirada vuelve despacio al encuadre del guion.
    if (!desvio.arrastrando && !libre.activo) {
      const k = 1 - Math.exp(-dt * 0.8);
      desvio.giro -= desvio.giro * k;
      desvio.inclinacion -= desvio.inclinacion * k;
    }
    let giro = guia.giro;
    let inclinacion = guia.inclinacion;
    if (guia.pesoFoco > 0) {
      hacia.subVectors(guia.foco, guia.posicion);
      let giroFoco = Math.atan2(-hacia.x, -hacia.z);
      // Tomar el camino corto, sin dar la vuelta completa.
      while (giroFoco - giro > Math.PI) giroFoco -= Math.PI * 2;
      while (giroFoco - giro < -Math.PI) giroFoco += Math.PI * 2;
      const incFoco = Math.atan2(hacia.y, Math.hypot(hacia.x, hacia.z));
      giro = THREE.MathUtils.lerp(giro, giroFoco, guia.pesoFoco);
      inclinacion = THREE.MathUtils.lerp(inclinacion, incFoco, guia.pesoFoco);
    }
    // Modo caminar: la mirada libre reemplaza a la del guion (con transición suave).
    const enTestigo = modoVista.actual === 'testigo';
    const juanLibre = libre.activo && !enTestigo; // como testigo, quien camina es el testigo
    libre.mezcla += ((juanLibre ? 1 : 0) - libre.mezcla) * Math.min(1, dt * 2.5);
    let giroFinal = giro + desvio.giro;
    let incFinal = inclinacion + desvio.inclinacion;
    if (libre.mezcla > 0.001) {
      let g = libre.giro;
      while (g - giroFinal > Math.PI) g -= Math.PI * 2;
      while (g - giroFinal < -Math.PI) g += Math.PI * 2;
      giroFinal = THREE.MathUtils.lerp(giroFinal, g, libre.mezcla);
      incFinal = THREE.MathUtils.lerp(incFinal, libre.inclinacion, libre.mezcla);
    }
    vista.giro = giroFinal;
    vista.inclinacion = incFinal;

    // Caminar: avanzar hacia donde se mira (palanca hacia arriba) o de lado.
    const d = libre.desplazamiento;
    if (juanLibre) {
      const rumbo = giroFinal; // se avanza hacia donde se mira
      adelante.set(-Math.sin(rumbo), 0, -Math.cos(rumbo));
      derecha.set(Math.cos(rumbo), 0, -Math.sin(rumbo));
      d.addScaledVector(adelante, -libre.y * 1.4 * dt).addScaledVector(derecha, libre.x * 1.4 * dt);
    } else {
      d.multiplyScalar(1 - Math.min(1, dt * 0.8)); // al apagarlo, vuelve despacio al camino
    }
    camara.position.copy(guia.posicion).add(d);
    // Dentro del lugar (no atravesar las paredes de la cueva ni salir al precipicio).
    camara.position.x = THREE.MathUtils.clamp(camara.position.x, lim.x0, lim.x1);
    camara.position.z = THREE.MathUtils.clamp(camara.position.z, lim.z0, lim.z1);
    d.subVectors(camara.position, guia.posicion).setY(0);
    if (guia.deriva > 0) {
      camara.position.x += Math.sin(t * 0.11) * 0.55 * guia.deriva;
      camara.position.y += Math.sin(t * 0.17) * 0.06 * guia.deriva;
      camara.position.z += Math.sin(t * 0.08 + 1) * 0.6 * guia.deriva;
    }
    let tx = 0;
    let ty = 0;
    if (guia.temblor > 0) {
      tx = (Math.sin(t * 37) + Math.sin(t * 23)) * 0.004 * guia.temblor;
      ty = (Math.sin(t * 41) + Math.sin(t * 29)) * 0.004 * guia.temblor;
    }
    ojo.copy(camara.position);
    euler.set(incFinal + ty, giroFinal + tx, guia.ladeo);
    destinoQuat.setFromEuler(euler);
    destinoPos.copy(ojo);

    if (modoVista.actual === 'detras') {
      // Detrás y un poco a la derecha (por encima del hombro), para no tapar lo que mira.
      atras.set(Math.sin(giroFinal), 0, Math.cos(giroFinal)).multiplyScalar(2.3);
      atras.x += Math.cos(giroFinal) * 0.75;
      atras.z += -Math.sin(giroFinal) * 0.75;
      atras.add(ojo);
      atras.y = 1.25 + ojo.y * 0.35;
      limitar(atras);
      destinoPos.copy(atras);
      euler.set(incFinal * 0.5 - 0.16 + ty, giroFinal + tx, 0);
      destinoQuat.setFromEuler(euler);
    } else if (enTestigo) {
      if (libre.activo) {
        // El testigo camina y mira libremente; Juan sigue su recorrido.
        const rumbo = libre.giro;
        adelante.set(-Math.sin(rumbo), 0, -Math.cos(rumbo));
        derecha.set(Math.cos(rumbo), 0, -Math.sin(rumbo));
        testigo.pos.addScaledVector(adelante, -libre.y * 1.4 * dt).addScaledVector(derecha, libre.x * 1.4 * dt);
        limitar(testigo.pos);
        testigo.giro = libre.giro;
        testigo.inclinacion = libre.inclinacion;
      } else {
        // Encuadre automático: en diagonal (de lado y algo detrás de Juan), lo bastante lejos
        // para que en la pantalla quepan Juan y lo que él mira (Jesús, si está).
        if (objetivo.hay) medio.copy(objetivo.punto);
        else medio.set(-Math.sin(giroFinal), 0, -Math.cos(giroFinal)).multiplyScalar(3).add(ojo);
        medio.y = ojo.y;
        const separacion = Math.max(medio.distanceTo(ojo), 1.5);
        // Dirección "hacia atrás" (de lo que mira hacia Juan) y su perpendicular.
        atras.subVectors(ojo, medio).setY(0).normalize();
        lado.set(atras.z, 0, -atras.x);
        medio.add(ojo).multiplyScalar(0.5);
        medio.y = 1.1;
        // Elegir el costado que queda más dentro de la cueva.
        if (Math.abs(medio.x + lado.x * 2) > Math.abs(medio.x - lado.x * 2)) lado.multiplyScalar(-1);
        const anchoVista = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2) * camara.aspect);
        const distancia = THREE.MathUtils.clamp((separacion / 2 + 1.2) / Math.tan(anchoVista / 2), 3.5, 12);
        atras.multiplyScalar(0.75).addScaledVector(lado, 0.66).normalize();
        atras.multiplyScalar(distancia).add(medio);
        atras.y = 2.2;
        limitar(atras);
        if (!testigo.listo) testigo.pos.copy(atras);
        testigo.pos.lerp(atras, Math.min(1, dt * 1.2));
        hacia.subVectors(medio, testigo.pos);
        testigo.giro = Math.atan2(-hacia.x, -hacia.z);
        testigo.inclinacion = Math.atan2(hacia.y, Math.hypot(hacia.x, hacia.z));
      }
      testigo.listo = true;
      destinoPos.copy(testigo.pos);
      euler.set(testigo.inclinacion, testigo.giro, 0);
      destinoQuat.setFromEuler(euler);
    }

    // Transición suave al cambiar de vista.
    if (modoVista.transicion < 1) {
      modoVista.transicion = Math.min(1, modoVista.transicion + dt / 1.3);
      const e = THREE.MathUtils.smootherstep(modoVista.transicion, 0, 1);
      camara.position.lerpVectors(modoVista.desdePos, destinoPos, e);
      camara.quaternion.slerpQuaternions(modoVista.desdeQuat, destinoQuat, e);
    } else {
      camara.position.copy(destinoPos);
      camara.quaternion.copy(destinoQuat);
    }
  }

  // Dentro del lugar (sin atravesar las paredes).
  function limitar(v) {
    v.x = THREE.MathUtils.clamp(v.x, lim.x0 - 0.1, lim.x1 + 0.1);
    v.z = THREE.MathUtils.clamp(v.z, lim.z0 - 0.3, lim.z1 + 0.3);
  }

  // Cambia el lugar donde se puede caminar (null = la cueva).
  function fijarLimites(nuevos) {
    Object.assign(lim, nuevos ?? CUEVA);
  }

  // En pantallas angostas (Fold doblado) se abre el campo de visión
  // para que no se pierdan los lados de la escena.
  function ajustarAspecto(aspecto) {
    camara.aspect = aspecto;
    const horizontalMin = THREE.MathUtils.degToRad(50);
    const vertical = 2 * Math.atan(Math.tan(horizontalMin / 2) / aspecto);
    camara.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vertical), 55, 80);
    camara.updateProjectionMatrix();
    sensibilidad = 2.4 / Math.max(window.innerWidth, 1);
  }

  // Palanca: x e y entre -1 y 1 (y negativo = adelante, como en pantalla).
  function palanca(x, y) {
    libre.x = x;
    libre.y = y;
  }

  function caminar(activo) {
    // Se empieza a caminar mirando exactamente lo mismo que se veía.
    if (activo && !libre.activo) {
      const enTestigo = modoVista.actual === 'testigo';
      libre.giro = enTestigo ? testigo.giro : vista.giro;
      libre.inclinacion = enTestigo ? testigo.inclinacion : vista.inclinacion;
    }
    libre.activo = activo;
    if (!activo) palanca(0, 0);
  }

  // Cambiar de vista: 'juan', 'detras' o 'testigo'.
  function fijarModo(modo) {
    if (modo === modoVista.actual) return;
    modoVista.desdePos.copy(camara.position);
    modoVista.desdeQuat.copy(camara.quaternion);
    modoVista.transicion = 0;
    modoVista.actual = modo;
    if (modo === 'testigo') testigo.listo = false;
    // Si estaba caminando, se sigue caminando con la nueva vista.
    if (libre.activo) {
      libre.activo = false;
      caminar(true);
    }
  }

  // Lo que el testigo encuadra junto a Juan (null = nada en especial).
  function fijarObjetivo(punto) {
    objetivo.hay = !!punto;
    if (punto) objetivo.punto.copy(punto);
  }

  // Juan se ve en las vistas desde fuera (y durante el cambio).
  const juanVisible = () => modoVista.actual !== 'juan' || modoVista.transicion < 1;
  const modo = () => modoVista.actual;

  return {
    camara, guia, arrastrar, actualizar, ajustarAspecto, palanca, caminar, fijarModo, fijarObjetivo,
    fijarLimites, juanVisible, modo, ojo, vista,
  };
}
