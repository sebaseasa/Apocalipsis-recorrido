// Toques y arrastre. Un toque corto avanza; arrastrar mira alrededor.

export function crearControles(elemento, { alTocar, alArrastrar }) {
  let inicio = null;
  let ultimo = null;

  elemento.addEventListener('pointerdown', (e) => {
    inicio = { x: e.clientX, y: e.clientY, t: performance.now() };
    ultimo = { x: e.clientX, y: e.clientY };
  });

  elemento.addEventListener('pointermove', (e) => {
    if (!inicio) return;
    alArrastrar(e.clientX - ultimo.x, e.clientY - ultimo.y, true);
    ultimo = { x: e.clientX, y: e.clientY };
  });

  const terminar = (e) => {
    if (!inicio) return;
    const dist = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y);
    const dur = performance.now() - inicio.t;
    inicio = null;
    alArrastrar(0, 0, false);
    if (dist < 12 && dur < 500) alTocar();
  };
  elemento.addEventListener('pointerup', terminar);
  elemento.addEventListener('pointercancel', terminar);
}

// Devuelve una promesa que se cumple con el siguiente toque, mostrando el aviso.
const aviso = document.getElementById('aviso');
let pendiente = null;

export function esperarToque() {
  aviso.classList.add('visible');
  return new Promise((resolver) => {
    pendiente = resolver;
  });
}

export function toqueRecibido() {
  if (!pendiente) return;
  const r = pendiente;
  pendiente = null;
  aviso.classList.remove('visible');
  r();
}

export function cancelarToque() {
  pendiente = null;
  aviso.classList.remove('visible');
}
