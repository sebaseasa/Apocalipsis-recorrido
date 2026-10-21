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
  paso.textContent = `Apocalipsis 1 · ${n} de 8`;
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

// Cierre con un grabado de Durero y una pregunta (por defecto, el de Apocalipsis 1).
const CIERRE_1 = {
  imagen: 'durero-siete-candeleros.webp',
  pie: 'Alberto Durero, <em>La visión de los siete candeleros</em>, 1498',
  alt: 'Alberto Durero, La visión de los siete candeleros (1498)',
  pregunta: '¿Qué te dice que Jesús camine en medio de su iglesia?',
};

// Se cargan de antemano para que aparezcan al instante.
for (const f of ['durero-siete-candeleros.webp', 'durero-trono.webp']) new Image().src = `${import.meta.env.BASE_URL}assets/textures/${f}`;

export function mostrarCierre(datos = CIERRE_1) {
  const img = document.getElementById('grabado');
  img.src = `${import.meta.env.BASE_URL}assets/textures/${datos.imagen}`;
  img.alt = datos.alt;
  document.getElementById('grabado-pie').innerHTML = datos.pie;
  document.getElementById('cierre-pregunta').textContent = datos.pregunta;
  cierre.hidden = false;
  requestAnimationFrame(() => cierre.classList.add('visible'));
}

export function ocultarCierre() {
  cierre.classList.remove('visible');
  cierre.hidden = true;
}
