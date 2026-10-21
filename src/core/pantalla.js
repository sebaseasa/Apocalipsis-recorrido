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

// Calidez: luz suave que baja desde arriba, como una mano que toca (1:17).
const calidez = document.getElementById('calidez');
let nivelCalidez = 0;

export function tocarCalidez(destino, segundos) {
  const desde = nivelCalidez;
  return animar(segundos, (p) => {
    nivelCalidez = desde + (destino - desde) * p;
    calidez.style.opacity = nivelCalidez;
  });
}

export function reiniciarCalidez() {
  nivelCalidez = 0;
  calidez.style.opacity = 0;
}

export function mostrarPaso(n) {
  paso.textContent = `${n} / 8`;
}

export function mostrarPasoTexto(texto) {
  paso.textContent = texto;
}

// Tarjeta "Para reflexionar" al final de cada carta. Devuelve la elección:
// 'siguiente', 'repetir' o 'menu'.
const reflexion = document.getElementById('reflexion');
export function pedirReflexion(iglesia, haySiguiente) {
  document.getElementById('reflexion-iglesia').textContent = `La iglesia en ${iglesia.nombre} · Apocalipsis ${iglesia.ref.replace('-', '\u2011')}`;
  document.getElementById('reflexion-pregunta').textContent = iglesia.pregunta;
  const siguiente = document.getElementById('reflexion-siguiente');
  siguiente.hidden = !haySiguiente;
  reflexion.hidden = false;
  requestAnimationFrame(() => reflexion.classList.add('visible'));
  return new Promise((resolver) => {
    const elegir = (valor) => () => {
      ocultarReflexion();
      resolver(valor);
    };
    siguiente.onclick = elegir('siguiente');
    document.getElementById('reflexion-repetir').onclick = elegir('repetir');
    document.getElementById('reflexion-menu').onclick = elegir('menu');
  });
}

export function ocultarReflexion() {
  reflexion.classList.remove('visible');
  reflexion.hidden = true;
}

document.getElementById('grabado').src = `${import.meta.env.BASE_URL}assets/textures/durero-siete-candeleros.webp`;

export function mostrarCierre() {
  cierre.hidden = false;
  requestAnimationFrame(() => cierre.classList.add('visible'));
}

export function ocultarCierre() {
  cierre.classList.remove('visible');
  cierre.hidden = true;
}
