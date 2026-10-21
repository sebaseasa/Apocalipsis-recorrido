import * as THREE from 'three';
import { animar, esperar, lineal } from '../../core/tiempo.js';
import { leerVersiculo, ocultarSubtitulo, mostrarSubtitulo } from '../../core/subtitulos.js';
import * as audio from '../../core/audio.js';
import { fundido, mostrarPasoTexto, reiniciarCalidez, pedirReflexion } from '../../core/pantalla.js';
import { CENTRO } from '../01-patmos/escena.js';
import { LUGARES } from '../01-patmos/tierra.js';

// Escena 2: las cartas a las siete iglesias (Apocalipsis 2-3).
// Habla Jesús en la misma visión de Patmos; el texto se lee completo (RV 1909).
// En cada carta solo se muestra lo que el texto nombra; donde no, solo texto.

const mezclar = THREE.MathUtils.lerp;
const juntos = (...tareas) => Promise.all(tareas);
const VISTA_ASIA = [38.25, 27.9, 0.055];

// Datos de cada iglesia: versículos, pregunta para reflexionar y lo que se ve en cada versículo.
// "vela" es el candelero de esa iglesia (Efeso a la izquierda, Laodicea a la derecha).
export const IGLESIAS = [
  { nombre: 'Efeso', cap: 2, desde: 1, hasta: 7, pregunta: '¿Amo hoy a Jesús como al principio? ¿Qué hacía antes por Él que necesito volver a hacer?' },
  { nombre: 'Smirna', cap: 2, desde: 8, hasta: 11, pregunta: 'Cuando paso por pruebas, ¿qué me ayuda a seguir siendo fiel a Jesús?' },
  { nombre: 'Pérgamo', cap: 2, desde: 12, hasta: 17, pregunta: '¿En qué momentos me cuesta mostrar que soy de Jesús?' },
  { nombre: 'Tiatira', cap: 2, desde: 18, hasta: 29, pregunta: 'Jesús conoce mi corazón. ¿Hay algo que me está pidiendo cambiar?' },
  { nombre: 'Sardis', cap: 3, desde: 1, hasta: 6, pregunta: '¿Mi fe está viva de verdad, o solo lo parece por fuera?' },
  { nombre: 'Filadelfia', cap: 3, desde: 7, hasta: 13, pregunta: '¿Qué puerta ha abierto Dios para mí o para nuestra iglesia?' },
  { nombre: 'Laodicea', cap: 3, desde: 14, hasta: 22, pregunta: 'Jesús está a la puerta y llama. ¿Qué significa para mí abrirle hoy?' },
].map((ig, k) => ({ ...ig, vela: 6 - k, ref: `${ig.cap}:${ig.desde}-${ig.hasta}` }));

// "El que tiene oído, oiga lo que el Espíritu dice á las iglesias" (la carta es para todas).
const OIGA = ['2:7', '2:11', '2:17', '2:29', '3:6', '3:13', '3:22'];

export async function cartas(mundo, cam, indices) {
  const { candeleros, figura, simbolos } = mundo;
  const tierra = mundo.tierra;
  const g = cam.guia;
  const e = figura.estado;
  const S = simbolos.estado;

  // --- Ayudas ---
  const velas = [1, 1, 1, 1, 1, 1, 1];
  const fijarVela = (i, v) => {
    velas[i] = v;
    candeleros.encender(i, v);
  };
  const llevarVela = (i, v, s) => {
    const desde = velas[i];
    return animar(s, (p) => fijarVela(i, mezclar(desde, v, p)));
  };
  const parpadear = (i, s) => {
    const base = velas[i];
    return animar(s, (p) => candeleros.encender(i, base * (0.55 + 0.45 * Math.abs(Math.sin(p * 18)))), lineal);
  };
  const brillarTodas = () =>
    animar(2, (p) => velas.forEach((v, i) => candeleros.encender(i, v * (1 + Math.sin(p * Math.PI) * 0.7))), lineal);
  const nivel = (nombre, v, s) => {
    const desde = S[nombre];
    return animar(s, (p) => (S[nombre] = mezclar(desde, v, p)));
  };
  const estadoFig = (clave, v, s) => {
    const desde = e[clave];
    return animar(s, (p) => (e[clave] = mezclar(desde, v, p)));
  };
  const mirarA = (punto, s) => {
    const desde = g.foco.clone();
    return animar(s, (p) => g.foco.lerpVectors(desde, punto, p));
  };
  const moverCamara = (pos, s) => {
    const desde = g.posicion.clone();
    return animar(s, (p) => g.posicion.lerpVectors(desde, pos, p));
  };

  // --- Preparar la visión: los siete candeleros encendidos y Jesús en medio ---
  ocultarSubtitulo();
  reiniciarCalidez();
  mundo.reiniciar();
  simbolos.reiniciar();
  for (let i = 0; i < 7; i++) fijarVela(i, 1);
  Object.assign(e, { presencia: 1, cinto: 1, cabello: 0.7, estrellas: 1, sol: 0.2 });
  mundo.luzBoca.intensity = 15;
  mundo.sol.intensity = 6;
  g.posicion.set(0, 1.6, -14.5);
  g.giro = Math.PI;
  g.inclinacion = 0;
  g.ladeo = 0;
  g.temblor = 0;
  g.foco.set(0, 1.3, -7.5);
  g.pesoFoco = 1;
  g.deriva = 0;
  fundido('negro', 1, 0);
  audio.silencio(false, 0.5);
  audio.nivel('ambiente', 0.2, 2);
  audio.nivel('musica', 0.5, 4);

  // Si son las siete seguidas, una introducción breve sobre el mapa.
  if (indices.length > 1) {
    mostrarPasoTexto('Apocalipsis 2-3');
    mundo.vista = 'tierra';
    tierra.mostrar(true);
    tierra.resaltar(null);
    tierra.volar(VISTA_ASIA, VISTA_ASIA, 1);
    await fundido('negro', 0, 2);
    mostrarSubtitulo('Apocalipsis 1:11', '"Escribe en un libro lo que ves, y envíalo á las siete iglesias que están en Asia…"');
    await esperar(7);
  }

  for (let n = 0; n < indices.length; n++) {
    const k = indices[n];
    const ig = IGLESIAS[k];
    const vela = ig.vela;
    const pVela = candeleros.posiciones[vela];
    mostrarPasoTexto(`Apocalipsis ${ig.ref} · ${ig.nombre}`);

    // 1. Vuelo sobre el mapa hasta la ciudad.
    const lugar = LUGARES.find((l) => l.nombre === ig.nombre);
    const destino = [lugar.lat, lugar.lon, 0.02];
    if (mundo.vista !== 'tierra') {
      await fundido('negro', 1, 1.2);
      mundo.vista = 'tierra';
      tierra.mostrar(true);
      tierra.volar(VISTA_ASIA, VISTA_ASIA, 1);
      fundido('negro', 0, 1.5);
    }
    tierra.resaltar(ig.nombre);
    mostrarSubtitulo(`Apocalipsis ${ig.ref}`, `La iglesia en ${ig.nombre}`);
    await animar(6, (p) => tierra.volar(VISTA_ASIA, destino, p));
    await esperar(1.5);
    await fundido('negro', 1, 1.5);
    tierra.mostrar(false);
    tierra.resaltar(null);
    mundo.vista = 'cueva';
    ocultarSubtitulo();

    // 2. De vuelta en la visión: Jesús "anda en medio de los siete candeleros" (2:1)
    //    y se detiene junto al de esta iglesia.
    const parada = pVela.clone().lerp(CENTRO, 0.3).add(new THREE.Vector3(0, 0, -0.7));
    const posCam = new THREE.Vector3(parada.x * 0.6, 1.6, parada.z - 4.6);
    const focoVela = new THREE.Vector3(mezclar(parada.x, pVela.x, 0.35), 1.3, mezclar(parada.z, pVela.z, 0.35));
    fundido('negro', 0, 2);
    const caminar = (() => {
      const desde = figura.grupo.position.clone();
      return animar(6, (p) => {
        figura.grupo.position.lerpVectors(desde, parada, p);
        figura.grupo.position.y = Math.sin(p * Math.PI) * 0.03;
      });
    })();
    moverCamara(posCam, 6);
    mirarA(focoVela, 6);
    llevarVela(vela, 1.35, 3);

    // Lugares de los símbolos para esta iglesia.
    const sobreVela = [pVela.x, 2.15, pVela.z];
    const frente = [parada.x, 1.3, parada.z - 0.9];
    const enfrentePuerta = [parada.x, 0, parada.z - 1.3];

    // 3. Lo que se ve en cada versículo (solo lo que el texto nombra; 💡 = ilustración sugerida).
    const acciones = {
      // Efeso
      '2:1': () => caminar,
      '2:4': () => llevarVela(vela, 0.65, 3), // 💡 "has dejado tu primer amor"
      '2:5': () => parpadear(vela, 5), // 💡 "quitaré tu candelero de su lugar, si no…"
      '2:7': async () => {
        simbolos.colocar('arbol', 0, 0, -2.6); // "el árbol de la vida… en medio del paraíso de Dios"
        await esperar(3);
        mirarA(new THREE.Vector3(0, 2.0, -2.6), 3);
        await nivel('arbol', 1, 4);
      },
      // Smirna
      '2:8': async () => {
        await caminar;
        await estadoFig('presencia', 0.35, 2); // 💡 "que fué muerto, y vivió"
        await estadoFig('presencia', 1, 2.5);
      },
      '2:10': async () => {
        simbolos.colocar('corona', ...sobreVela); // "la corona de la vida"
        await esperar(5);
        mirarA(new THREE.Vector3(pVela.x, 1.9, pVela.z), 2);
        await nivel('corona', 1, 3);
      },
      // Pérgamo
      '2:12': async () => {
        await caminar;
        await estadoFig('espada', 1, 2); // "la espada aguda de dos filos"
      },
      '2:16': () => estadoFig('sol', 0.5, 2).then(() => estadoFig('sol', 0.2, 2)), // 💡 "la espada de mi boca"
      '2:17': async () => {
        simbolos.colocar('piedra', ...frente); // "una piedrecita blanca… un nombre nuevo escrito"
        await esperar(5);
        mirarA(new THREE.Vector3(...frente), 2);
        await nivel('piedra', 1, 3);
      },
      // Tiatira
      '2:18': async () => {
        await caminar;
        await estadoFig('ojos', 1, 2); // "sus ojos como llama de fuego"
        await estadoFig('pies', 1, 2); // "sus pies semejantes al latón fino"
      },
      '2:19': () => llevarVela(vela, 1.6, 3), // 💡 "tus obras postreras son más que las primeras"
      '2:28': async () => {
        simbolos.colocar('estrella', parada.x * 0.5, 3.4, parada.z + 1.5); // "la estrella de la mañana"
        mirarA(new THREE.Vector3(parada.x * 0.5, 2.6, parada.z + 1.5), 2.5);
        await nivel('estrella', 1, 3);
      },
      // Sardis
      '3:1': async () => {
        await caminar;
        estadoFig('sol', 0.35, 2); // "las siete estrellas" (en su diestra)
        await llevarVela(vela, 0.3, 4); // 💡 "tienes nombre que vives, y estás muerto"
      },
      '3:2': () => parpadear(vela, 4), // 💡 "sé vigilante"
      '3:5': async () => {
        simbolos.colocar('libro', ...frente); // "el libro de la vida"
        await esperar(4);
        mirarA(new THREE.Vector3(...frente), 2);
        await nivel('libro', 1, 3);
      },
      '3:6': () => llevarVela(vela, 0.8, 3), // 💡
      // Filadelfia
      '3:7': async () => {
        await caminar;
        const mano = figura.punto('llaves');
        simbolos.colocar('llave', mano.x, mano.y + 0.15, mano.z - 0.1); // "la llave de David"
        await nivel('llave', 1, 2.5);
      },
      '3:8': async () => {
        // "Una puerta abierta delante de ti": delante, pero a un costado, para no tapar a Jesús.
        const lado = pVela.x < 0 ? 1.7 : -1.7;
        simbolos.colocar('puerta', parada.x + lado, 0, parada.z - 1.6);
        mirarA(new THREE.Vector3(parada.x + lado * 0.5, 1.3, parada.z - 0.8), 2);
        await nivel('puerta', 1, 2);
        await esperar(1);
        await animar(4, (p) => (simbolos.puerta.apertura = p));
      },
      '3:10': () => mirarA(focoVela, 3),
      '3:11': async () => {
        simbolos.colocar('corona', ...sobreVela); // "para que ninguno tome tu corona"
        await nivel('corona', 1, 3);
      },
      '3:12': async () => {
        simbolos.colocar('columna', pVela.x + (pVela.x < 0 ? 1.1 : -1.1), 0, pVela.z + 0.8); // "columna en el templo de mi Dios"
        await nivel('columna', 1, 4);
      },
      // Laodicea
      '3:15': () => llevarVela(vela, 0.5, 4), // 💡 "ni eres frío, ni caliente"
      '3:18': async () => {
        simbolos.colocar('oro', parada.x, 0.95, parada.z - 0.9); // "oro afinado en fuego"
        await esperar(2);
        mirarA(new THREE.Vector3(parada.x, 1.0, parada.z - 0.9), 2);
        await nivel('oro', 1, 3);
      },
      '3:19': async () => {
        await nivel('oro', 0, 2);
        mirarA(focoVela, 2);
        // La puerta, cerrada, entre Jesús y quien mira (para 3:20).
        simbolos.colocar('puerta', ...enfrentePuerta);
        await nivel('puerta', 1, 3);
      },
      '3:20': async () => {
        // "He aquí, yo estoy á la puerta y llamo"
        await esperar(1.5);
        audio.llamar();
        await esperar(2.2);
        audio.llamar();
        // "si alguno oyere mi voz y abriere la puerta, entraré á él"
        await esperar(2.5);
        await animar(3, (p) => (simbolos.puerta.apertura = p));
        const desde = figura.grupo.position.clone();
        const hacia = desde.clone().add(new THREE.Vector3(0, 0, -1.8));
        await animar(4, (p) => figura.grupo.position.lerpVectors(desde, hacia, p));
      },
    };

    // 4. Lectura completa de la carta, con la cámara en un movimiento lento.
    const deriva = animar(4, (p) => (g.deriva = p));
    for (let v = ig.desde; v <= ig.hasta; v++) {
      const ref = `${ig.cap}:${v}`;
      const tareas = [leerVersiculo(ref, 0.5)];
      if (acciones[ref]) tareas.push(acciones[ref]());
      if (OIGA.includes(ref)) tareas.push(brillarTodas());
      await juntos(...tareas);
    }
    await caminar;
    await deriva;
    await animar(2, (p) => (g.deriva = 1 - p));

    // 5. Para reflexionar.
    await esperar(1);
    ocultarSubtitulo();
    const eleccion = await pedirReflexion(ig, n < indices.length - 1);

    // Limpiar los símbolos de esta carta antes de la siguiente.
    for (const nombre of Object.keys(S)) S[nombre] = 0;
    simbolos.puerta.apertura = 0;
    Object.assign(e, { ojos: 0, pies: 0, espada: 0, sol: 0.2, presencia: 1 });
    llevarVela(vela, 1, 1);
    if (eleccion === 'repetir') {
      n--;
      continue;
    }
    if (eleccion === 'menu') return 'menu';
  }
  return 'menu';
}
