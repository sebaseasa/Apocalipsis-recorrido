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
  let sensibilidad = 0.004;

  function arrastrar(dx, dy, activo) {
    desvio.arrastrando = activo;
    if (!activo) return;
    desvio.giro = THREE.MathUtils.clamp(desvio.giro + dx * sensibilidad, -1.1, 1.1);
    desvio.inclinacion = THREE.MathUtils.clamp(desvio.inclinacion + dy * sensibilidad, -0.6, 0.6);
  }

  function actualizar(t, dt) {
    // Al soltar, la mirada vuelve despacio al encuadre del guion.
    if (!desvio.arrastrando) {
      const k = 1 - Math.exp(-dt * 0.8);
      desvio.giro -= desvio.giro * k;
      desvio.inclinacion -= desvio.inclinacion * k;
    }
    camara.position.copy(guia.posicion);
    if (guia.deriva > 0) {
      camara.position.x += Math.sin(t * 0.11) * 0.55 * guia.deriva;
      camara.position.y += Math.sin(t * 0.17) * 0.06 * guia.deriva;
      camara.position.z += Math.sin(t * 0.08 + 1) * 0.6 * guia.deriva;
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
    let tx = 0;
    let ty = 0;
    if (guia.temblor > 0) {
      tx = (Math.sin(t * 37) + Math.sin(t * 23)) * 0.004 * guia.temblor;
      ty = (Math.sin(t * 41) + Math.sin(t * 29)) * 0.004 * guia.temblor;
    }
    camara.rotation.set(inclinacion + desvio.inclinacion + ty, giro + desvio.giro + tx, guia.ladeo);
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

  return { camara, guia, arrastrar, actualizar, ajustarAspecto };
}
