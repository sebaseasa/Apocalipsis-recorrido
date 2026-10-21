import { acelerar, ritmoNormal } from './tiempo.js';

// Toques y arrastre. Un toque corto avanza; arrastrar mira alrededor.

export function crearControles(elemento, { alTocar, alArrastrar }) {
  let inicio = null;
  let ultimo = null;

  elemento.addEventListener('pointerdown', (e) => {
    // Los botones y la palanca tienen su propio manejo.
    if (e.target.closest('button, .palanca')) return;
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
  ritmoNormal();
  aviso.textContent = 'Toca para continuar';
  aviso.classList.add('visible');
  return new Promise((resolver) => {
    pendiente = resolver;
  });
}

// Devuelve true si el toque servía para continuar (había un aviso esperando).
export function toqueRecibido() {
  if (!pendiente) return false;
  const r = pendiente;
  pendiente = null;
  aviso.classList.remove('visible');
  r();
  return true;
}

// Toque en medio de un momento: adelanta hasta el siguiente texto.
let ocultarAviso;
export function avanzarRapido() {
  acelerar();
  aviso.textContent = 'Avanzando ⏩';
  aviso.classList.add('visible');
  clearTimeout(ocultarAviso);
  ocultarAviso = setTimeout(() => {
    if (!pendiente) aviso.classList.remove('visible');
  }, 900);
}

export function cancelarToque() {
  pendiente = null;
  aviso.classList.remove('visible');
}

// Palanca en pantalla: devuelve x e y entre -1 y 1 mientras se arrastra la perilla.
export function crearPalanca(elemento, alMover) {
  const perilla = elemento.querySelector('.perilla');
  let activo = null;
  const mover = (e) => {
    const r = elemento.getBoundingClientRect();
    const radio = r.width / 2;
    let x = (e.clientX - (r.left + radio)) / radio;
    let y = (e.clientY - (r.top + radio)) / radio;
    const largo = Math.hypot(x, y);
    if (largo > 1) {
      x /= largo;
      y /= largo;
    }
    perilla.style.transform = `translate(${x * radio * 0.6}px, ${y * radio * 0.6}px)`;
    alMover(x, y);
  };
  elemento.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    activo = e.pointerId;
    elemento.setPointerCapture(e.pointerId);
    mover(e);
  });
  elemento.addEventListener('pointermove', (e) => {
    if (e.pointerId === activo) mover(e);
  });
  const soltar = (e) => {
    if (e.pointerId !== activo) return;
    activo = null;
    perilla.style.transform = '';
    alMover(0, 0);
  };
  elemento.addEventListener('pointerup', soltar);
  elemento.addEventListener('pointercancel', soltar);
}

// Aviso fijo mientras está en pausa.
export function avisoPausa(activo) {
  aviso.textContent = activo ? 'En pausa' : 'Toca para continuar';
  aviso.classList.toggle('visible', activo || pendiente !== null);
}
