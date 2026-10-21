import { esperar } from './tiempo.js';

const caja = document.getElementById('subtitulo');
let versiculos = {};

export async function cargarTexto(url) {
  const datos = await (await fetch(url)).json();
  versiculos = datos.versiculos;
}

export function mostrarSubtitulo(cita, texto) {
  caja.classList.remove('visible');
  // Pequeña pausa para que el cambio de texto se note con un fundido.
  setTimeout(() => {
    caja.innerHTML = '';
    const c = document.createElement('span');
    c.className = 'cita';
    c.textContent = cita;
    caja.append(c, texto);
    caja.classList.add('visible');
  }, 250);
}

export function ocultarSubtitulo() {
  caja.classList.remove('visible');
}

// Tiempo de lectura pausado, pensado para personas mayores.
export function tiempoLectura(texto) {
  return Math.max(4, texto.length / 12 + 1.5);
}

// Muestra una parte de un versículo y espera lo necesario para leerla.
export async function leer(ref, parte, extra = 0) {
  const texto = versiculos[ref]?.[parte] ?? '';
  mostrarSubtitulo(`Apocalipsis ${ref}`, texto);
  await esperar(tiempoLectura(texto) + extra);
}
