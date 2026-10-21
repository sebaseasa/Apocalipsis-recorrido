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
  const adelante = new THREE.Vector3();
  const derecha = new THREE.Vector3();
  let sensibilidad = 0.004;

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
    libre.mezcla += ((libre.activo ? 1 : 0) - libre.mezcla) * Math.min(1, dt * 2.5);
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
    if (libre.activo) {
      const rumbo = giroFinal; // se avanza hacia donde se mira
      adelante.set(-Math.sin(rumbo), 0, -Math.cos(rumbo));
      derecha.set(Math.cos(rumbo), 0, -Math.sin(rumbo));
      d.addScaledVector(adelante, -libre.y * 1.4 * dt).addScaledVector(derecha, libre.x * 1.4 * dt);
    } else {
      d.multiplyScalar(1 - Math.min(1, dt * 0.8)); // al apagarlo, vuelve despacio al camino
    }
    camara.position.copy(guia.posicion).add(d);
    // Dentro de la cueva (no atravesar las paredes ni salir al precipicio).
    camara.position.x = THREE.MathUtils.clamp(camara.position.x, -3.3, 3.3);
    camara.position.z = THREE.MathUtils.clamp(camara.position.z, -18.5, 4.5);
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
    camara.rotation.set(incFinal + ty, giroFinal + tx, guia.ladeo);
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
      libre.giro = vista.giro;
      libre.inclinacion = vista.inclinacion;
    }
    libre.activo = activo;
    if (!activo) palanca(0, 0);
  }

  return { camara, guia, arrastrar, actualizar, ajustarAspecto, palanca, caminar };
}
