import * as THREE from 'three';
import { crearEscenaPrueba } from './scenes/01-patmos/prueba.js';
import { mostrarSubtitulo } from './core/subtitulos.js';

const contenedor = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
contenedor.appendChild(renderer.domElement);

const { escena, camara, actualizar, ajustarEncuadre } = crearEscenaPrueba();

function alCambiarTamano() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  ajustarEncuadre(w / h);
}
window.addEventListener('resize', alCambiarTamano);
alCambiarTamano();

mostrarSubtitulo('Apocalipsis 1:9', 'Yo Juan... estaba en la isla que es llamada Patmos');

const reloj = new THREE.Clock();
renderer.setAnimationLoop(() => {
  actualizar(reloj.getElapsedTime());
  renderer.render(escena, camara);
});
