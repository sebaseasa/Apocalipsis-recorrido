import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { actualizarTiempo, cancelarTodo, pausar, estaPausado } from './core/tiempo.js';
import { crearCamaraGuiada } from './core/camaraGuiada.js';
import { crearControles, toqueRecibido, cancelarToque, avanzarRapido, crearPalanca, avisoPausa } from './core/controles.js';
import { crearDetector } from './core/rendimiento.js';
import { cargarTexto, ocultarSubtitulo } from './core/subtitulos.js';
import { ocultarCierre, ocultarReflexion, fundido } from './core/pantalla.js';
import { iniciarAudio, silencio, pausarAudio } from './core/audio.js';
import { todoCargado, alProgreso } from './core/cargador.js';
import { crearEscena } from './scenes/01-patmos/escena.js';
import { crearTierra } from './scenes/01-patmos/tierra.js';
import { recorrido } from './scenes/01-patmos/guion.js';
import { cartas, IGLESIAS } from './scenes/02-iglesias/guion.js';
import { crearSimbolos } from './scenes/02-iglesias/simbolos.js';
import { crearJuan } from './scenes/01-patmos/juan.js';
import { crearCielo } from './scenes/04-trono/cielo.js';
import { trono } from './scenes/04-trono/guion.js';

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
// Símbolos de las cartas (escena 2), en el mismo mundo de la cueva.
mundo.simbolos = crearSimbolos(mundo.escena);
// El cielo de Apocalipsis 4 (otro mundo; se dibuja cuando mundo.vista es 'cielo').
mundo.cielo = crearCielo();
// Juan, visible solo al ver desde fuera.
const juan = crearJuan();
mundo.escena.add(juan.grupo);

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
  mundo.cielo.ajustarPantalla(h * pr, cam.camara.fov);
}

const detector = crearDetector(({ pixeles: p, brillo: b }) => {
  pixeles = p;
  usarBrillo = b;
  alCambiarTamano();
});
window.addEventListener('resize', alCambiarTamano);
alCambiarTamano();

const inicio = document.getElementById('inicio');
const menu = document.getElementById('menu');
const carga = document.getElementById('carga');
const botonMenu = document.getElementById('boton-menu');
const barra = document.getElementById('barra');
const botonPausa = document.getElementById('boton-pausa');
const botonCaminar = document.getElementById('boton-caminar');
const palanca = document.getElementById('palanca');
const hayPantallaEncima = () =>
  !inicio.hidden || !document.getElementById('cierre').hidden || !document.getElementById('reflexion').hidden;

crearControles(document.body, {
  // Un toque continúa si hay aviso; si no, adelanta hasta el siguiente texto.
  alTocar: () => {
    if (estaPausado()) return;
    if (!toqueRecibido() && enMarcha && !hayPantallaEncima()) avanzarRapido();
  },
  alArrastrar: cam.arrastrar,
});

// Menú de inicio. El audio del celular solo arranca después de un toque, por eso
// todo empieza al tocar una opción.
// Una carta por botón, agrupadas por capítulo, con sus versículos.
IGLESIAS.forEach((ig, k) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.escena = '2';
  b.dataset.iglesia = String(k);
  b.innerHTML = `${ig.nombre}<small>Versículos ${ig.desde} al ${ig.hasta}</small>`;
  document.getElementById(`lista-cap${ig.cap}`).appendChild(b);
});

alProgreso((p) => (carga.textContent = `Cargando… ${Math.round(p * 100)}%`));
const base = import.meta.env.BASE_URL;
Promise.all([cargarTexto(`${base}text/apocalipsis-1.json`), cargarTexto(`${base}text/apocalipsis-2-3.json`), cargarTexto(`${base}text/apocalipsis-4.json`), todoCargado()])
  .then(() => {
    mundo.prepararReflejos(renderer);
    mundo.cielo.prepararReflejos(renderer);
    // Preparar los sombreadores antes de entrar, para que no haya tirones al empezar.
    renderer.compile(mundo.escena, cam.camara);
    renderer.compile(mundo.tierra.escena, mundo.tierra.camara);
    renderer.compile(mundo.cielo.escena, cam.camara);
    carga.hidden = true;
    menu.hidden = false;
  })
  .catch(() => {
    carga.textContent = 'Error al cargar. Recarga la página.';
  });

let enMarcha = false;

// Los botones se esconden solos a los 4 segundos sin tocar la pantalla y vuelven
// al tocar o mover el dedo. En pausa se quedan visibles.
let esconderBarra;
function mostrarBarra() {
  barra.classList.remove('oculta');
  palanca.classList.remove('oculta');
  clearTimeout(esconderBarra);
  esconderBarra = setTimeout(() => {
    if (estaPausado()) return;
    barra.classList.add('oculta');
    palanca.classList.add('oculta');
  }, 4000);
}
for (const ev of ['pointerdown', 'pointermove']) document.addEventListener(ev, mostrarBarra, { passive: true });

// Pausa / seguir.
function fijarPausa(valor) {
  pausar(valor);
  pausarAudio(valor);
  avisoPausa(valor);
  botonPausa.textContent = valor ? '▶ Seguir' : '⏸ Pausa';
  botonPausa.classList.toggle('activo', valor);
  mostrarBarra();
}
botonPausa.addEventListener('click', () => fijarPausa(!estaPausado()));

// Caminar (opcional): aparece la palanca; el recorrido sigue guiado igual.
let caminando = false;
function fijarCaminar(valor) {
  caminando = valor;
  cam.caminar(valor);
  palanca.hidden = !valor;
  botonCaminar.classList.toggle('activo', valor);
}
botonCaminar.addEventListener('click', () => fijarCaminar(!caminando));

// Tres formas de ver, con un botón que las va cambiando:
// con los ojos de Juan, detrás de Juan, o como testigo desde otro lugar de la cueva.
const botonVista = document.getElementById('boton-vista');
const VISTAS = [
  { modo: 'juan', texto: '👁 Vista: Juan' },
  { modo: 'detras', texto: '👁 Vista: Detrás' },
  { modo: 'testigo', texto: '👁 Vista: Testigo' },
];
let vistaActual = 0;
function fijarVista(indice) {
  vistaActual = indice;
  cam.fijarModo(VISTAS[indice].modo);
  botonVista.textContent = VISTAS[indice].texto;
  botonVista.classList.toggle('activo', indice > 0);
}
botonVista.addEventListener('click', () => fijarVista((vistaActual + 1) % VISTAS.length));
crearPalanca(palanca, (x, y) => cam.palanca(x, y));

function limpiar() {
  if (estaPausado()) fijarPausa(false);
  cancelarTodo();
  cancelarToque();
  ocultarCierre();
  ocultarReflexion();
  ocultarSubtitulo();
  mundo.tierra.mostrar(false);
  for (let i = 0; i < 7; i++) mundo.mostrarIglesia(i, false);
  mundo.simbolos.reiniciar();
  mundo.cielo.reiniciar();
  cam.fijarLimites(null);
  mundo.vista = 'cueva';
}

function volverAlMenu() {
  limpiar();
  enMarcha = false;
  silencio(true, 1);
  fundido('negro', 1, 0);
  barra.hidden = true;
  fijarCaminar(false);
  inicio.classList.remove('salida');
  inicio.hidden = false;
}

async function empezar(escena, iglesia) {
  limpiar();
  enMarcha = true;
  barra.hidden = false;
  mostrarBarra();
  if (escena === '1') {
    await recorrido(mundo, cam);
  } else if (escena === '4') {
    await trono(mundo, cam);
  } else {
    const indices = iglesia === 'todas' ? [0, 1, 2, 3, 4, 5, 6] : [Number(iglesia)];
    const fin = await cartas(mundo, cam, indices);
    if (fin === 'menu') volverAlMenu();
  }
}

let ultima = ['1', null];
menu.addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-escena]');
  if (!b) return;
  iniciarAudio();
  // Pantalla completa y pantalla siempre encendida, si el navegador lo permite.
  document.documentElement.requestFullscreen?.().catch(() => {});
  navigator.wakeLock?.request('screen').catch(() => {});
  inicio.classList.add('salida');
  setTimeout(() => (inicio.hidden = true), 1300);
  ultima = [b.dataset.escena, b.dataset.iglesia ?? null];
  empezar(...ultima);
});

document.getElementById('otra-vez').addEventListener('click', () => empezar(...ultima));
document.getElementById('cierre-menu').addEventListener('click', volverAlMenu);
botonMenu.addEventListener('click', (ev) => {
  ev.stopPropagation();
  volverAlMenu();
});

// La pantalla puede apagarse si se sale de la app; al volver, pedimos de nuevo.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && enMarcha) {
    navigator.wakeLock?.request('screen').catch(() => {});
  }
});

// ?velocidad=4 acelera el recorrido (solo para pruebas).
let velocidad = Number(new URLSearchParams(location.search).get('velocidad')) || 1;
if (velocidad !== 1) window.ajustarVelocidad = (v) => (velocidad = v);
const ojoAnterior = new THREE.Vector3();
const reloj = new THREE.Clock();
let t = 0;
renderer.setAnimationLoop(() => {
  // Si la pestaña se pausa, no saltamos de golpe en el guion.
  const dt = Math.min(reloj.getDelta(), 0.1);
  t += dt * velocidad;
  detector.medir(dt);
  actualizarTiempo(dt * velocidad);
  mundo.actualizar(t);
  mundo.simbolos.actualizar(t);
  // Jesús vuelve el rostro hacia Juan (sobre todo al caminar).
  if (mundo.vista === 'cueva') mundo.figura.mirarHacia(cam.ojo, dt);
  const enCielo = mundo.vista === 'cielo';
  // El testigo encuadra a Juan junto con Jesús cuando Él está presente (o con el trono, en el cielo).
  if (enCielo) cam.fijarObjetivo(mundo.cielo.estado.trono > 0.5 ? mundo.cielo.punto('trono') : null);
  else cam.fijarObjetivo(mundo.figura.estado.presencia > 0.3 ? mundo.figura.punto('pecho') : null);
  cam.actualizar(t, dt);
  // Desde fuera: Juan ocupa el lugar de los ojos; si los ojos bajan al suelo, cae (1:17).
  // Juan va con el mundo que se está viendo (la cueva o el cielo).
  const mundoJuan = enCielo ? mundo.cielo.escena : mundo.escena;
  if (juan.grupo.parent !== mundoJuan) mundoJuan.add(juan.grupo);
  juan.grupo.visible = mundo.vista !== 'tierra' && cam.juanVisible();
  if (juan.grupo.visible) {
    const caida = THREE.MathUtils.clamp((1.6 - cam.ojo.y) / 1.3, 0, 1);
    // Se mece al caminar: según cuánto se movió desde el cuadro anterior.
    const rapidez = ojoAnterior.distanceTo(cam.ojo) / Math.max(dt, 0.001);
    juan.animar(t, THREE.MathUtils.clamp(rapidez / 1.2, 0, 1) * (1 - caida));
    juan.colocar(cam.ojo, cam.vista.giro, caida);
  }
  ojoAnterior.copy(cam.ojo);
  const enTierra = mundo.vista === 'tierra';
  const escena = enTierra ? mundo.tierra.escena : enCielo ? mundo.cielo.escena : mundo.escena;
  const camara = enTierra ? mundo.tierra.camara : cam.camara;
  if (enCielo) mundo.cielo.actualizar(t, dt * velocidad);
  // En el cielo hay mucha claridad: el brillo solo toca las luces, no las esculturas.
  brillo.strength = enCielo ? 0.45 : 0.75;
  brillo.threshold = enCielo ? 0.97 : 0.82;
  if (enTierra) {
    mundo.tierra.actualizar(t);
    mundo.tierra.actualizarRotulos();
  }
  if (mundo.vista === 'cueva') mundo.actualizarEtiquetas(cam.camara);
  pasoEscena.scene = escena;
  pasoEscena.camera = camara;
  if (usarBrillo) composer.render();
  else renderer.render(escena, camara);
});
