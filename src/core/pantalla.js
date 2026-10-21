import { animar, esperar } from './tiempo.js';

// Capas de pantalla: fundidos a negro o blanco, número de momento y cierre.

const capa = document.getElementById('fundido');
const paso = document.getElementById('paso');
const cierre = document.getElementById('cierre');
let opacidad = 1;

export function fundido(color, destino, segundos) {
  capa.style.background = color === 'blanco' ? '#fffaf0' : '#000';
  if (segundos <= 0) {
    opacidad = destino;
    capa.style.opacity = destino;
    return esperar(0);
  }
  const desde = opacidad;
  return animar(segundos, (p) => {
    opacidad = desde + (destino - desde) * p;
    capa.style.opacity = opacidad;
  });
}

export function mostrarPaso(n) {
  paso.textContent = `${n} / 7`;
}

export function mostrarCierre() {
  cierre.hidden = false;
  requestAnimationFrame(() => cierre.classList.add('visible'));
}

export function ocultarCierre() {
  cierre.classList.remove('visible');
  cierre.hidden = true;
}
