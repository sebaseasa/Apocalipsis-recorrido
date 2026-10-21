// Mide los cuadros por segundo y baja la calidad si el dispositivo no llega a 30.

const NIVELES = [
  { pixeles: 1.5, brillo: true },
  { pixeles: 1.25, brillo: true },
  { pixeles: 1, brillo: false },
  { pixeles: 0.75, brillo: false },
];

export function crearDetector(aplicar) {
  let nivel = 0;
  let cuadros = 0;
  let acumulado = 0;
  let lentos = 0;
  let fps = 60;
  const marcador = new URLSearchParams(location.search).has('fps')
    ? document.getElementById('fps')
    : null;
  if (marcador) marcador.hidden = false;
  // ?fija mantiene la calidad máxima (solo para pruebas).
  const fija = new URLSearchParams(location.search).has('fija');

  aplicar(NIVELES[nivel]);

  function medir(dt) {
    cuadros++;
    acumulado += dt;
    if (acumulado < 2) return;
    fps = cuadros / acumulado;
    cuadros = 0;
    acumulado = 0;
    // Dos mediciones seguidas bajo 27 fps: bajamos un nivel.
    lentos = fps < 27 ? lentos + 1 : 0;
    if (!fija && lentos >= 2 && nivel < NIVELES.length - 1) {
      nivel++;
      lentos = 0;
      aplicar(NIVELES[nivel]);
    }
    if (marcador) marcador.textContent = `${fps.toFixed(0)} fps · calidad ${NIVELES.length - nivel}/${NIVELES.length}`;
  }

  return { medir };
}
