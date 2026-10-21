import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { actualizarTiempo, cancelarTodo } from './core/tiempo.js';
import { crearCamaraGuiada } from './core/camaraGuiada.js';
import { crearControles, toqueRecibido, cancelarToque, avanzarRapido } from './core/controles.js';
import { crearDetector } from './core/rendimiento.js';
import { cargarTexto, ocultarSubtitulo } from './core/subtitulos.js';
import { ocultarCierre } from './core/pantalla.js';
import { iniciarAudio } from './core/audio.js';
import { todoCargado, alProgreso } from './core/cargador.js';
import { crearEscena } from './scenes/01-patmos/escena.js';
import { crearTierra } from './scenes/01-patmos/tierra.js';
import { recorrido } from './scenes/01-patmos/guion.js';

const contenedor = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
contenedor.appendChild(renderer.domElement);

const mundo = crearEscena();
const cam = crearCamaraGuiada();
// Introducción desde el espacio; el guion decide cuál de las dos vistas se dibuja.
mundo.tierra = crearTierra();
mundo.vista = 'cueva';

const composer = new EffectComposer(renderer);
const pasoEscena = new RenderPass(mundo.escena, cam.camara);
composer.addPass(pasoEscena);
const brillo = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.6, 0.82);
composer.addPass(brillo);
composer.addPass(new OutputPass());

let usarBrillo = true;
let pixeles = 1;

function alCambiarTamano() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio, pixeles);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h);
  composer.setPixelRatio(pr);
  composer.setSize(w, h);
  // El brillo se calcula a menor resolución para ahorrar trabajo.
  brillo.resolution.set(w * pr * 0.5, h * pr * 0.5);
  cam.ajustarAspecto(w / h);
  mundo.tierra.ajustarAspecto(w / h);
  mundo.atmosfera.ajustarPantalla(h * pr);
}

const detector = crearDetector(({ pixeles: p, brillo: b }) => {
  pixeles = p;
  usarBrillo = b;
  alCambiarTamano();
});
window.addEventListener('resize', alCambiarTamano);
alCambiarTamano();

crearControles(document.body, {
  // Un toque continúa si hay aviso; si no, adelanta hasta el siguiente texto.
  alTocar: () => {
    if (!toqueRecibido() && enMarcha && inicio.hidden && document.getElementById('cierre').hidden) avanzarRapido();
  },
  alArrastrar: cam.arrastrar,
});

// Pantalla de inicio: el audio del celular solo arranca después de un toque.
const inicio = document.getElementById('inicio');
const botonEntrar = document.getElementById('entrar');
alProgreso((p) => (botonEntrar.textContent = `Cargando… ${Math.round(p * 100)}%`));
Promise.all([cargarTexto(`${import.meta.env.BASE_URL}text/apocalipsis-1.json`), todoCargado()])
  .then(() => {
    mundo.prepararReflejos(renderer);
    // Preparar los sombreadores antes de entrar, para que no haya tirones al empezar.
    renderer.compile(mundo.escena, cam.camara);
    renderer.compile(mundo.tierra.escena, mundo.tierra.camara);
    botonEntrar.disabled = false;
    botonEntrar.textContent = 'Entrar';
  })
  .catch(() => {
    botonEntrar.textContent = 'Error al cargar. Recarga la página.';
  });

let enMarcha = false;

async function empezar() {
  cancelarTodo();
  cancelarToque();
  ocultarCierre();
  ocultarSubtitulo();
  enMarcha = true;
  await recorrido(mundo, cam);
}

botonEntrar.addEventListener('click', async () => {
  iniciarAudio();
  // Pantalla completa y pantalla siempre encendida, si el navegador lo permite.
  document.documentElement.requestFullscreen?.().catch(() => {});
  navigator.wakeLock?.request('screen').catch(() => {});
  inicio.classList.add('salida');
  setTimeout(() => (inicio.hidden = true), 1300);
  empezar();
});

document.getElementById('otra-vez').addEventListener('click', empezar);

// La pantalla puede apagarse si se sale de la app; al volver, pedimos de nuevo.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && enMarcha) {
    navigator.wakeLock?.request('screen').catch(() => {});
  }
});

// ?velocidad=4 acelera el recorrido (solo para pruebas).
let velocidad = Number(new URLSearchParams(location.search).get('velocidad')) || 1;
if (velocidad !== 1) window.ajustarVelocidad = (v) => (velocidad = v);
const reloj = new THREE.Clock();
let t = 0;
renderer.setAnimationLoop(() => {
  // Si la pestaña se pausa, no saltamos de golpe en el guion.
  const dt = Math.min(reloj.getDelta(), 0.1);
  t += dt * velocidad;
  detector.medir(dt);
  actualizarTiempo(dt * velocidad);
  mundo.actualizar(t);
  cam.actualizar(t, dt);
  const enTierra = mundo.vista === 'tierra';
  const escena = enTierra ? mundo.tierra.escena : mundo.escena;
  const camara = enTierra ? mundo.tierra.camara : cam.camara;
  if (enTierra) mundo.tierra.actualizarRotulos();
  else mundo.actualizarEtiquetas(cam.camara);
  pasoEscena.scene = escena;
  pasoEscena.camera = camara;
  if (usarBrillo) composer.render();
  else renderer.render(escena, camara);
});
