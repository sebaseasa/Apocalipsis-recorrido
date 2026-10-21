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
  };

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
    let tx = 0;
    let ty = 0;
    if (guia.temblor > 0) {
      tx = (Math.sin(t * 37) + Math.sin(t * 23)) * 0.004 * guia.temblor;
      ty = (Math.sin(t * 41) + Math.sin(t * 29)) * 0.004 * guia.temblor;
    }
    camara.rotation.set(guia.inclinacion + desvio.inclinacion + ty, guia.giro + desvio.giro + tx, 0);
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
