import { esperar, ritmoNormal } from './tiempo.js';

const caja = document.getElementById('subtitulo');
let versiculos = {};

// Carga un archivo de versículos y lo suma a los ya cargados.
// Si un versículo viene entero (texto) y es largo, se divide en partes legibles.
export async function cargarTexto(url) {
  const datos = await (await fetch(url)).json();
  for (const [ref, valor] of Object.entries(datos.versiculos)) {
    versiculos[ref] = Array.isArray(valor) ? valor : partir(valor);
  }
}

// Divide un texto largo en partes de hasta ~130 letras, cortando después de ; : o ,
// (sin cambiar ninguna palabra: al unir las partes queda el texto original).
const LARGO = 130;
export function partir(texto) {
  const partes = [];
  let resto = texto.trim();
  while (resto.length > LARGO) {
    let corte = -1;
    for (const signo of ['; ', ': ', ', ']) {
      const i = resto.lastIndexOf(signo, LARGO);
      if (i > LARGO * 0.35) {
        corte = i + 1;
        break;
      }
    }
    if (corte < 0) corte = resto.lastIndexOf(' ', LARGO);
    if (corte <= 0) break;
    partes.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }
  partes.push(resto);
  return partes;
}

export function partesDe(ref) {
  return versiculos[ref]?.length ?? 0;
}

// Lee un versículo completo, parte por parte.
export async function leerVersiculo(ref, extra = 0) {
  const n = partesDe(ref);
  for (let i = 0; i < n; i++) await leer(ref, i, i === n - 1 ? extra : 0);
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
  ritmoNormal(); // cada texto nuevo se muestra a velocidad normal
  const texto = versiculos[ref]?.[parte] ?? '';
  mostrarSubtitulo(`Apocalipsis ${ref}`, texto);
  await esperar(tiempoLectura(texto) + extra);
}
