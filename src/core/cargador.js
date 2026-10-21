import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Carga de texturas desde /public/assets, con aviso de progreso.

const base = import.meta.env.BASE_URL;
const gestor = new THREE.LoadingManager();
const cargador = new THREE.TextureLoader(gestor);

// Modelos .glb comprimidos con Draco (el descompresor está en /public/draco).
const draco = new DRACOLoader(gestor);
draco.setDecoderPath(`${base}draco/`);
const cargadorGLTF = new GLTFLoader(gestor);
cargadorGLTF.setDRACOLoader(draco);

export function modelo(ruta, alCargar) {
  cargadorGLTF.load(base + ruta, (gltf) => alCargar(gltf.scene));
}

export function alProgreso(fn) {
  gestor.onProgress = (_url, cargados, total) => fn(cargados / total);
}

export function textura(ruta, { color = false, repetir = null } = {}) {
  const t = cargador.load(base + ruta);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repetir[0], repetir[1]);
  }
  t.anisotropy = 4;
  return t;
}

// Promesa que se cumple cuando todo lo pedido hasta ahora terminó de cargar.
export function todoCargado() {
  return new Promise((resolver, rechazar) => {
    gestor.onLoad = resolver;
    gestor.onError = (url) => rechazar(new Error(`No se pudo cargar ${url}`));
  });
}

// Material de roca o suelo (color + relieve + oclusión/rugosidad en un solo archivo).
export function materialPBR(nombre, repetir, extra = {}) {
  const orm = textura(`assets/textures/${nombre}-orm.webp`, { repetir });
  return new THREE.MeshStandardMaterial({
    map: textura(`assets/textures/${nombre}-color.webp`, { color: true, repetir }),
    normalMap: textura(`assets/textures/${nombre}-normal.webp`, { repetir }),
    aoMap: orm,
    roughnessMap: orm,
    roughness: 1,
    metalness: 0,
    ...extra,
  });
}
