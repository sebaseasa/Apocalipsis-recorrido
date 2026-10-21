import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { actualizarTiempo, cancelarTodo } from './core/tiempo.js';
import { crearCamaraGuiada } from './core/camaraGuiada.js';
import { crearControles, toqueRecibido, cancelarToque } from './core/controles.js';
import { crearDetector } from './core/rendimiento.js';
import { cargarTexto, ocultarSubtitulo } from './core/subtitulos.js';
import { ocultarCierre } from './core/pantalla.js';
import { iniciarAudio } from './core/audio.js';
import { crearEscena } from './scenes/01-patmos/escena.js';
import { recorrido } from './scenes/01-patmos/guion.js';

const contenedor = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
contenedor.appendChild(renderer.domElement);

const mundo = crearEscena();
const cam = crearCamaraGuiada();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(mundo.escena, cam.camara));
const brillo = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.6, 0.8);
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
}

const detector = crearDetector(({ pixeles: p, brillo: b }) => {
  pixeles = p;
  usarBrillo = b;
  alCambiarTamano();
});
window.addEventListener('resize', alCambiarTamano);
alCambiarTamano();

crearControles(document.body, {
  alTocar: toqueRecibido,
  alArrastrar: cam.arrastrar,
});

// Pantalla de inicio: el audio del celular solo arranca después de un toque.
const inicio = document.getElementById('inicio');
const botonEntrar = document.getElementById('entrar');
cargarTexto(`${import.meta.env.BASE_URL}text/apocalipsis-1.json`).then(() => {
  botonEntrar.disabled = false;
  botonEntrar.textContent = 'Entrar';
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
  actualizarTiempo(t);
  mundo.actualizar(t);
  cam.actualizar(t, dt);
  if (usarBrillo) composer.render();
  else renderer.render(mundo.escena, cam.camara);
});
