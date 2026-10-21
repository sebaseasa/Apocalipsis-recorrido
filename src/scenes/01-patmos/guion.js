import * as THREE from 'three';
import { animar, esperar, lineal } from '../../core/tiempo.js';
import { leer, ocultarSubtitulo } from '../../core/subtitulos.js';
import { esperarToque } from '../../core/controles.js';
import * as audio from '../../core/audio.js';
import { fundido, mostrarPaso, mostrarCierre } from '../../core/pantalla.js';
import { CENTRO } from './escena.js';

// Guion de la escena 1 (Apocalipsis 1:9-18), en 7 momentos.
// Al final de cada momento aparece "Toca para continuar".

const ALTURA_OJOS = 1.6;
const INICIO_Z = 3;
const ENTRADA_Z = -15;

const mezclar = THREE.MathUtils.lerp;

export async function recorrido(mundo, cam) {
  const { candeleros, figura, luzBoca } = mundo;
  const g = cam.guia;

  g.posicion.set(0, ALTURA_OJOS, INICIO_Z);
  g.giro = 0;
  g.inclinacion = -0.05;
  g.temblor = 0;
  mundo.reiniciar();
  fundido('negro', 1, 0);

  // 1. Oscuridad y mar.
  mostrarPaso(1);
  audio.silencio(false, 0.5);
  audio.nivel('ambiente', 0.5, 4);
  audio.nivel('musica', 0, 1);
  await esperar(2.5);
  await leer('1:9', 0);
  await leer('1:9', 1);
  await esperarToque();

  // 2. La cueva: aparece la imagen y avanzamos despacio hacia la luz.
  mostrarPaso(2);
  ocultarSubtitulo();
  fundido('negro', 0, 5);
  audio.nivel('ambiente', 0.9, 20);
  const caminar = animar(22, (p) => {
    g.posicion.z = mezclar(INICIO_Z, ENTRADA_Z, p);
    // Balanceo leve al caminar.
    g.posicion.y = ALTURA_OJOS + Math.sin(p * 22 * 4) * 0.025 * Math.sin(p * Math.PI);
  });
  await esperar(6);
  await leer('1:10', 0);
  await caminar;
  await esperarToque();

  // 3. La voz: trompeta detrás, y la cámara se vuelve despacio.
  mostrarPaso(3);
  ocultarSubtitulo();
  await esperar(1);
  audio.trompeta(5.5);
  animar(5.5, (p) => (g.temblor = Math.sin(p * Math.PI)), lineal);
  await esperar(0.8);
  await leer('1:10', 1);
  await leer('1:11', 0, 0.5);
  await leer('1:11', 1);
  await leer('1:11', 2);
  leer('1:12', 0);
  audio.nivel('ambiente', 0.5, 6);
  // Gira hacia la izquierda; la mirada queda hacia el fondo de la cueva.
  await animar(8, (p) => {
    g.giro = p * Math.PI;
    g.inclinacion = mezclar(-0.05, 0.02, p);
  });
  luzBoca.intensity = 15; // la entrada queda a la espalda, más tenue
  await esperar(1);
  await esperarToque();

  // 4. Los siete candeleros se encienden uno por uno.
  mostrarPaso(4);
  ocultarSubtitulo();
  leer('1:12', 1);
  const alto = cam.camara.aspect < 1;
  const ojo = g.posicion.clone();
  for (let i = 0; i < 7; i++) {
    const p = candeleros.posiciones[i];
    // En pantallas angostas la mirada sigue a cada llama.
    let objetivo = Math.atan2(-(p.x - ojo.x), -(p.z - ojo.z));
    if (objetivo < 0) objetivo += Math.PI * 2; // mantenerlo cerca de media vuelta
    const desde = g.giro;
    animar(1.2, (k) => (g.giro = mezclar(desde, alto ? objetivo : mezclar(Math.PI, objetivo, 0.4), k)));
    audio.encender(i);
    animar(1.2, (k) => candeleros.encender(i, k));
    await esperar(1.6);
  }
  const giroFinal = g.giro;
  await animar(2.5, (k) => (g.giro = mezclar(giroFinal, Math.PI, k)));
  await esperar(1.5);
  await esperarToque();

  // 5. El Hijo del hombre: aparece una figura de luz en medio.
  mostrarPaso(5);
  ocultarSubtitulo();
  audio.nivel('musica', 0.8, 6);
  animar(6, (p) => (figura.estado.presencia = p));
  animar(30, (p) => (g.posicion.z = mezclar(ENTRADA_Z, ENTRADA_Z + 1.5, p)), lineal);
  await esperar(3);
  await leer('1:13', 0);
  await leer('1:13', 1);
  await leer('1:14', 0);
  audio.nivel('ambiente', 1.2, 3); // "su voz como ruido de muchas aguas"
  await leer('1:15', 0);
  audio.nivel('ambiente', 0.4, 4);
  animar(3, (p) => (figura.estado.estrellas = p));
  await leer('1:16', 0);
  animar(4, (p) => (figura.estado.sol = p));
  await leer('1:16', 1);
  await esperarToque();

  // 6. "No temas": caemos de rodillas, silencio, y luego la voz.
  mostrarPaso(6);
  ocultarSubtitulo();
  const y0 = g.posicion.y;
  const inc0 = g.inclinacion;
  // Inclinación para seguir mirando el rostro desde abajo.
  const distancia = Math.abs(CENTRO.z - g.posicion.z);
  const incRodillas = Math.atan2(1.9 - 0.7, distancia);
  leer('1:17', 0);
  await animar(1.8, (p) => {
    g.posicion.y = mezclar(y0, 0.7, p);
    g.inclinacion = mezclar(inc0, incRodillas, p);
  });
  await esperar(3);
  ocultarSubtitulo();
  audio.silencio(true, 2);
  await esperar(5); // pausa en silencio
  audio.nivel('ambiente', 0.15, 0.1);
  audio.nivel('musica', 0.5, 0.1);
  audio.silencio(false, 4);
  animar(3, (p) => (figura.estado.sol = 1 + p * 0.5));
  await leer('1:17', 1);
  await leer('1:17', 2, 1);
  await leer('1:18', 0, 1);
  await leer('1:18', 1, 1);
  await esperarToque();

  // 7. Cierre: la luz llena la pantalla y aparece la pregunta.
  mostrarPaso(7);
  ocultarSubtitulo();
  audio.nivel('musica', 1, 5);
  animar(5, (p) => (figura.estado.sol = 1.5 + p * 2));
  await fundido('blanco', 1, 5);
  audio.nivel('ambiente', 0, 6);
  mostrarCierre();
}
