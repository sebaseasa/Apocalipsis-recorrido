import * as THREE from 'three';
import { animar, esperar, lineal } from '../../core/tiempo.js';
import { leer, ocultarSubtitulo } from '../../core/subtitulos.js';
import { esperarToque } from '../../core/controles.js';
import * as audio from '../../core/audio.js';
import { fundido, mostrarPaso, mostrarCierre, tocarCalidez, reiniciarCalidez } from '../../core/pantalla.js';

// Guion de la escena 1 (Apocalipsis 1:9-18), en 7 momentos.
// Al final de cada momento aparece "Toca para continuar".

const ALTURA_OJOS = 1.6;
const INICIO_Z = 3;
const ENTRADA_Z = -15;

const mezclar = THREE.MathUtils.lerp;
const caer = (t) => t * t; // acelera, como algo que se desploma

// Espera a que terminen varias cosas a la vez (texto y movimiento).
const juntos = (...tareas) => Promise.all(tareas);

export async function recorrido(mundo, cam) {
  const { candeleros, figura, luzBoca } = mundo;
  const g = cam.guia;
  const e = figura.estado;

  // Lleva la mirada de la cámara a una parte de la figura.
  function mirarA(parte, segundos) {
    const desde = g.foco.clone();
    const hasta = figura.punto(parte);
    return animar(segundos, (p) => g.foco.lerpVectors(desde, hasta, p));
  }

  // Acerca o aleja la cámara (solo hacia adelante o atrás).
  function acercarA(z, segundos) {
    const desde = g.posicion.z;
    return animar(segundos, (p) => (g.posicion.z = mezclar(desde, z, p)));
  }

  g.posicion.set(0, ALTURA_OJOS, INICIO_Z);
  g.giro = 0;
  g.inclinacion = -0.05;
  g.temblor = 0;
  g.ladeo = 0;
  g.pesoFoco = 0;
  mundo.reiniciar();
  reiniciarCalidez();
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

  // 5. El Hijo del hombre: cada rasgo aparece cuando se lee (1:13-16).
  mostrarPaso(5);
  ocultarSubtitulo();
  g.foco.copy(figura.punto('centro'));
  await animar(1.5, (p) => (g.pesoFoco = p));
  audio.nivel('musica', 0.8, 6);

  // "uno semejante al Hijo del hombre": aparece en medio de los candeleros.
  acercarA(-12.5, 8);
  await juntos(leer('1:13', 0), animar(5, (p) => (e.presencia = p)));

  // "vestido de una ropa que llegaba hasta los pies, y ceñido ... con una cinta de oro"
  acercarA(-11, 7);
  await juntos(leer('1:13', 1), (async () => {
    await mirarA('pies', 3);
    await mirarA('pecho', 2.5);
    audio.destello(true);
    await animar(1.5, (p) => (e.cinto = p));
  })());

  // "su cabeza y sus cabellos eran blancos como la lana ... y sus ojos como llama de fuego"
  await juntos(leer('1:14', 0), (async () => {
    await mirarA('cabeza', 2.5);
    await animar(2, (p) => (e.cabello = p));
    await esperar(2.5);
    await animar(1.5, (p) => (e.ojos = p));
  })());

  // "sus pies semejantes al latón fino, ardientes como en un horno; y su voz como ruido de muchas aguas"
  await juntos(leer('1:15', 0), (async () => {
    await mirarA('pies', 2.5);
    audio.horno(8);
    await animar(2, (p) => (e.pies = p));
    await esperar(2);
    audio.nivel('ambiente', 1.3, 2);
    await mirarA('centro', 2.5);
  })());
  audio.nivel('ambiente', 0.4, 4);

  // "tenía en su diestra siete estrellas: y de su boca salía una espada aguda de dos filos"
  await juntos(leer('1:16', 0), (async () => {
    await mirarA('estrellas', 2);
    audio.destello();
    await animar(2, (p) => (e.estrellas = p));
    await esperar(1);
    await mirarA('cabeza', 2);
    audio.destello(true);
    await animar(1.5, (p) => (e.espada = p));
  })());

  // "su rostro era como el sol cuando resplandece en su fuerza": retrocedemos ante la luz.
  audio.nivel('musica', 1, 4);
  await juntos(leer('1:16', 1), acercarA(-12, 4), mirarA('centro', 3), animar(4, (p) => (e.sol = p)));
  await esperarToque();

  // 6. "No temas": Juan cae como muerto, silencio, y Él pone su diestra sobre él (1:17-18).
  mostrarPaso(6);
  ocultarSubtitulo();
  leer('1:17', 0);
  await esperar(1.6); // que se alcance a leer "caí" antes de caer
  audio.nivel('musica', 0.2, 1);
  {
    const y0 = g.posicion.y;
    const z0 = g.posicion.z;
    const focoDesde = g.foco.clone();
    const focoHasta = figura.punto('pies');
    animar(1.5, (p) => {
      e.sol = mezclar(1, 0.3, p);
      e.espada = 1 - p; // la espada se retira; ya no se dibuja vista desde el suelo
    });
    // Caída rápida hasta el suelo, con la cabeza ladeada, mirando sus pies.
    await animar(1.1, (p) => {
      g.posicion.y = mezclar(y0, 0.3, p);
      g.posicion.z = mezclar(z0, z0 + 0.5, p);
      g.ladeo = mezclar(0, 0.4, p);
      g.foco.lerpVectors(focoDesde, focoHasta, p);
    }, caer);
  }
  audio.golpe();
  animar(0.5, (p) => (g.temblor = 4 * (1 - p)), lineal);
  fundido('negro', 0.6, 1.5); // "como muerto"
  await esperar(3.5);

  // Silencio total. Sus pies se acercan a Juan, tendido en el suelo.
  ocultarSubtitulo();
  audio.silencio(true, 2);
  {
    const fz0 = figura.grupo.position.z;
    const fz1 = g.posicion.z + 2.6;
    await animar(6, (p) => {
      figura.grupo.position.z = mezclar(fz0, fz1, p);
      g.foco.copy(figura.punto('pies'));
    });
  }
  await esperar(1);

  // "Y él puso su diestra sobre mí": la mano baja hacia nosotros, la oscuridad se va.
  audio.nivel('ambiente', 0.15, 0.1);
  audio.nivel('musica', 0.5, 0.1);
  audio.silencio(false, 4);
  await juntos(leer('1:17', 1), (async () => {
    animar(3, (p) => (e.mano = p));
    await esperar(1.2);
    tocarCalidez(1, 2);
    await fundido('negro', 0, 3);
  })());

  // "No temas": levantamos la mirada hacia su rostro, aún de rodillas.
  {
    const y1 = g.posicion.y;
    const ladeo = g.ladeo;
    const focoDesde = g.foco.clone();
    const focoHasta = figura.punto('cabeza');
    await juntos(
      leer('1:17', 2, 1),
      animar(4, (p) => {
        g.posicion.y = mezclar(y1, 0.75, p);
        g.ladeo = mezclar(ladeo, 0, p);
        g.foco.lerpVectors(focoDesde, focoHasta, p);
      }),
      tocarCalidez(0.35, 4)
    );
  }

  // "el que vivo, y he sido muerto; y he aquí que vivo por siglos de siglos"
  audio.nivel('musica', 0.9, 4);
  await juntos(leer('1:18', 0, 1), animar(5, (p) => (e.sol = mezclar(0.3, 1, p))), animar(3, (p) => (e.mano = 1 - p)));

  // "Y tengo las llaves del infierno y de la muerte."
  await juntos(leer('1:18', 1, 1), (async () => {
    await mirarA('llaves', 2);
    audio.destello(true);
    await animar(1.5, (p) => (e.llaves = p));
    await esperar(1.5);
    await mirarA('cabeza', 2);
  })());
  await esperarToque();

  // 7. Cierre: la luz llena la pantalla y aparece la pregunta.
  mostrarPaso(7);
  ocultarSubtitulo();
  audio.nivel('musica', 1, 5);
  tocarCalidez(0, 3);
  animar(5, (p) => (e.sol = 1 + p * 2.5));
  await fundido('blanco', 1, 5);
  audio.nivel('ambiente', 0, 6);
  mostrarCierre();
}
