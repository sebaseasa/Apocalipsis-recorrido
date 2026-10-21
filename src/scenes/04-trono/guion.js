import * as THREE from 'three';
import { animar, esperar, lineal } from '../../core/tiempo.js';
import { leer, leerVersiculo, ocultarSubtitulo, duracionVersiculo } from '../../core/subtitulos.js';
import { esperarToque } from '../../core/controles.js';
import * as audio from '../../core/audio.js';
import { fundido, mostrarPasoTexto, mostrarCierre, reiniciarCalidez } from '../../core/pantalla.js';

// Apocalipsis 4 (1-11): la puerta abierta en el cielo y el trono de Dios.
// Juan sube por la puerta (4:1) y ve, en el orden del texto, el trono y al que está sentado,
// el arco como esmeralda, los veinticuatro ancianos, los relámpagos y las siete lámparas,
// el mar de vidrio, los cuatro seres vivientes que dicen "Santo, santo, santo",
// y a los ancianos que se postran y echan sus coronas delante del trono.

const ALTURA_OJOS = 1.6;
const mezclar = THREE.MathUtils.lerp;
const juntos = (...tareas) => Promise.all(tareas);
const despues = async (segundos, tarea) => {
  await esperar(segundos);
  await tarea();
};

export const CIERRE_4 = {
  imagen: 'durero-trono.webp',
  pie: 'Alberto Durero, <em>San Juan ante Dios y los ancianos</em>, 1498',
  alt: 'Alberto Durero, San Juan ante Dios y los ancianos (1498)',
  pregunta: 'Los ancianos ponen sus coronas delante del trono. ¿Qué quiero poner yo hoy delante de Dios?',
};

export async function trono(mundo, cam) {
  const cielo = mundo.cielo;
  const E = cielo.estado;
  const A = cielo.ancianos.estado;
  const S = cielo.seres.estado;
  const g = cam.guia;

  const nivel = (obj, clave, v, s) => {
    const desde = obj[clave];
    return animar(s, (p) => (obj[clave] = mezclar(desde, v, p)));
  };
  const mirarA = (punto, s) => {
    const desde = g.foco.clone();
    return animar(s, (p) => g.foco.lerpVectors(desde, punto, p));
  };
  const moverA = (pos, s) => {
    const desde = g.posicion.clone();
    return animar(s, (p) => g.posicion.lerpVectors(desde, pos, p));
  };

  // --- Preparar: de noche, mirando al cielo ---
  ocultarSubtitulo();
  reiniciarCalidez();
  cielo.reiniciar();
  mostrarPasoTexto('Apocalipsis 4');
  fundido('negro', 1, 0);
  mundo.vista = 'cielo';
  cam.fijarLimites({ x0: -80, x1: 80, z0: -80, z1: 80 }); // libre durante la subida
  g.posicion.set(0, ALTURA_OJOS, 8);
  Object.assign(g, { giro: 0, inclinacion: 0, temblor: 0, ladeo: 0, deriva: 0, pesoFoco: 1 });
  const puerta = cielo.punto('puerta');
  g.foco.copy(puerta);
  audio.silencio(false, 0.5);
  audio.nivel('ambiente', 0.25, 3);
  audio.nivel('musica', 0.25, 6);
  await fundido('negro', 0, 3);

  // 4:1 "He aquí una puerta abierta en el cielo… Sube acá".
  const abrir = despues(1.5, async () => {
    audio.destello(true);
    await nivel(E, 'puerta', 1, 5);
  });
  await leer('4:1', 0, 0.5);
  audio.trompeta(5.5);
  animar(5.5, (p) => (g.temblor = Math.sin(p * Math.PI)), lineal);
  await leer('4:1', 1);
  await abrir;
  // "Sube acá": Juan sube hasta la puerta y entra en la luz.
  const desde = g.posicion.clone();
  const hasta = puerta.clone().add(new THREE.Vector3(0, -1, 2));
  g.foco.copy(hasta).addScaledVector(hasta.clone().sub(desde).normalize(), 30);
  audio.nivel('musica', 0.5, 8);
  const subir = animar(9, (p) => g.posicion.lerpVectors(desde, hasta, p * p));
  await leer('4:1', 2, 0.5);
  await fundido('blanco', 1, 2.5);
  await subir;

  // --- En el cielo ---
  E.noche = 0;
  E.puerta = 0;
  E.trono = 1;
  cam.fijarLimites({ x0: -7, x1: 7, z0: -6, z1: 10 });
  g.posicion.set(0, ALTURA_OJOS, 9.5);
  g.foco.copy(cielo.punto('trono'));
  g.temblor = 0;
  audio.nivel('ambiente', 0.08, 4);
  fundido('blanco', 0, 4);
  await esperar(1.5);

  // 4:2 "Un trono que estaba puesto en el cielo, y sobre el trono estaba uno sentado".
  const d42 = duracionVersiculo('4:2', 0.5);
  moverA(new THREE.Vector3(0, ALTURA_OJOS, 6), d42 + 8);
  await juntos(
    leerVersiculo('4:2', 0.5),
    despues(d42 * 0.55, async () => {
      audio.destello(true);
      await nivel(E, 'sentado', 1, 5);
    })
  );

  // 4:3 "Semejante á una piedra de jaspe y de sardio… un arco… semejante á la esmeralda".
  await leer('4:3', 0, 0.5);
  await juntos(
    leer('4:3', 1, 1),
    despues(1.2, async () => {
      audio.destello();
      await nivel(E, 'arco', 1, 4);
    })
  );
  await esperarToque();
  ocultarSubtitulo();

  // 4:4 Las veinticuatro sillas y los ancianos, vestidos de blanco, con coronas de oro.
  const { ancianos } = cielo;
  const derecha = ancianos.lugar(0);
  const fondo = ancianos.lugar(Math.floor(ancianos.N / 2));
  const izquierda = ancianos.lugar(ancianos.N - 1);
  const d44 = duracionVersiculo('4:4');
  const barrido = animar(d44 * 0.85, (p) => {
    if (p < 0.5) g.foco.lerpVectors(derecha, fondo, p * 2);
    else g.foco.lerpVectors(fondo, izquierda, (p - 0.5) * 2);
  });
  mirarA(derecha, 2);
  await esperar(0.8);
  nivel(A, 'nivel', 1, d44 * 0.85);
  await leer('4:4', 0);
  await juntos(leer('4:4', 1, 0.5), nivel(A, 'brillo', 1, 2.5));
  await barrido;
  nivel(A, 'brillo', 0.3, 3);
  await mirarA(cielo.punto('trono'), 3);

  // 4:5 Relámpagos, truenos y voces; siete lámparas de fuego delante del trono.
  const tormenta = (async () => {
    for (const pausa of [0.4, 1.6, 1.1, 2.2]) {
      await esperar(pausa);
      cielo.relampago();
      g.temblor = 0.6;
      animar(1.2, (p) => (g.temblor = 0.6 * (1 - p)));
      await esperar(0.25);
      audio.trueno();
    }
  })();
  await juntos(leer('4:5', 0, 1), tormenta);
  mirarA(cielo.punto('lamparas'), 3);
  await juntos(
    leer('4:5', 1, 0.5),
    (async () => {
      await esperar(1.5);
      for (let i = 0; i < 7; i++) {
        audio.encender(i);
        const k = i;
        animar(1.5, (p) => (E.lamparas[k] = p));
        await esperar(0.7);
      }
    })()
  );

  // 4:6 El mar de vidrio y los cuatro seres vivientes, llenos de ojos.
  mirarA(cielo.punto('mar'), 3);
  await juntos(leer('4:6', 0, 0.5), despues(1, () => nivel(E, 'mar', 1, 4)));
  mirarA(cielo.punto('trono'), 3);
  await juntos(
    leer('4:6', 1, 0.5),
    despues(1, async () => {
      audio.destello(true);
      await nivel(S, 'nivel', 1, 4);
      await nivel(S, 'ojos', 1, 3);
    }),
    moverA(new THREE.Vector3(0, ALTURA_OJOS, 4), 8)
  );

  // 4:7 León, becerro, cara como de hombre, águila volando: la mirada va a cada uno.
  // Juan se acerca a cada uno (sin pasar por delante del trono).
  const CERCA = { leon: [-2.6, -4.2], becerro: [2.6, -4.2], hombre: [-6.4, -5.2], aguila: [6.4, -5.2] };
  const verUno = (nombre) =>
    juntos(mirarA(cielo.seres.punto(nombre), 2.4), moverA(new THREE.Vector3(CERCA[nombre][0], ALTURA_OJOS, CERCA[nombre][1]), 2.6));
  await juntos(
    leer('4:7', 0),
    (async () => {
      await verUno('leon');
      await esperar(2.5);
      await verUno('becerro');
    })()
  );
  await juntos(
    leer('4:7', 1, 0.5),
    (async () => {
      await verUno('hombre');
      await esperar(2.5);
      await verUno('aguila');
    })()
  );

  // 4:8 Seis alas, llenos de ojos; "Santo, santo, santo el Señor Dios Todopoderoso".
  mirarA(cielo.punto('trono'), 3);
  moverA(new THREE.Vector3(0, ALTURA_OJOS, 5.5), 6);
  await juntos(leer('4:8', 0, 0.5), nivel(S, 'ojos', 1.3, 3));
  await juntos(
    leer('4:8', 1, 2),
    despues(2.5, async () => {
      audio.santo();
      const sentado = E.sentado;
      await animar(7.5, (p) => {
        // Tres oleadas, una por cada "Santo".
        const ola = Math.max(0, Math.sin(p * Math.PI * 3));
        S.santo = ola;
        E.sentado = sentado + ola * 0.25;
      }, lineal);
      S.santo = 0;
      E.sentado = sentado;
    })
  );
  await esperarToque();
  ocultarSubtitulo();

  // 4:9 Los seres vivientes dan gloria y honra y alabanza al que está sentado en el trono.
  await juntos(leerVersiculo('4:9', 0.5), nivel(S, 'gloria', 1, 4), nivel(E, 'sentado', 1.15, 4));

  // 4:10 Los ancianos se postran y echan sus coronas delante del trono.
  mirarA(ancianos.lugar(3), 3);
  await juntos(leer('4:10', 0, 0.5), despues(1.5, () => nivel(A, 'postrar', 1, 5)));
  mirarA(new THREE.Vector3(0, 0.6, -12), 3);
  await juntos(
    leer('4:10', 1, 1),
    despues(1, async () => {
      audio.destello();
      await juntos(nivel(A, 'coronas', 1, 5), nivel(A, 'brillo', 1, 2));
    })
  );

  // 4:11 "Señor, digno eres de recibir gloria y honra y virtud".
  mirarA(cielo.punto('trono'), 3);
  audio.nivel('musica', 0.8, 6);
  await juntos(leerVersiculo('4:11', 1), nivel(E, 'sentado', 1.4, 8), moverA(new THREE.Vector3(0, ALTURA_OJOS, 4.5), 10));
  await esperar(2);

  // Cierre: la luz llena la pantalla, el grabado de Durero y la pregunta.
  ocultarSubtitulo();
  audio.nivel('musica', 1, 5);
  await fundido('blanco', 1, 5);
  audio.nivel('ambiente', 0, 6);
  mostrarCierre(CIERRE_4);
}
