import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { modelo } from '../../core/cargador.js';

// Carga una escultura (.glb) como una sola forma, lista para usar:
// de frente hacia +z, centrada, con la base en y = 0 y del tamaño pedido.
//   girar: vuelta (radianes) para que mire hacia +z
//   alto / largo: tamaño final en metros (alto, o lo más largo en horizontal)
//   quitarBase: parte de abajo (0 a 1 de la altura) que se quita (pedestal de la estatua)
export function cargarGeometria(ruta, { girar = 0, alto = null, largo = null, quitarBase = 0 }, alListo) {
  modelo(ruta, (escena) => {
    escena.updateMatrixWorld(true);
    const partes = [];
    escena.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const nombre of Object.keys(g.attributes)) if (nombre !== 'position') g.deleteAttribute(nombre);
      g.applyMatrix4(o.matrixWorld);
      partes.push(g);
    });
    let geo = partes.length > 1 ? mergeGeometries(partes) : partes[0];
    geo.rotateY(girar);
    geo.computeBoundingBox();
    let b = geo.boundingBox;
    if (quitarBase > 0) {
      const corte = b.min.y + (b.max.y - b.min.y) * quitarBase;
      const p = geo.attributes.position.array;
      const quedan = [];
      for (let i = 0; i < p.length; i += 9) {
        if (p[i + 1] < corte && p[i + 4] < corte && p[i + 7] < corte) continue;
        for (let k = 0; k < 9; k++) quedan.push(p[i + k]);
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(quedan, 3));
      geo.computeBoundingBox();
      b = geo.boundingBox;
    }
    const tamano = new THREE.Vector3();
    b.getSize(tamano);
    const escala = alto ? alto / tamano.y : largo / Math.max(tamano.x, tamano.z);
    geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    geo.scale(escala, escala, escala);
    // Unir los vértices repetidos para que la superficie se vea lisa, no facetada.
    geo = mergeVertices(geo, 1e-4);
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    alListo(geo, escala);
  });
}

// Puntos al azar sobre una forma (para los ojos de los seres vivientes), un poco hacia afuera.
export function puntosSobre(geo, cantidad, matriz = null, afuera = 0.02) {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const v = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const matNormal = matriz ? new THREE.Matrix3().getNormalMatrix(matriz) : null;
  const lista = [];
  for (let i = 0; i < cantidad; i++) {
    const k = Math.floor(Math.random() * p.count);
    v.fromBufferAttribute(p, k);
    normal.fromBufferAttribute(n, k);
    if (matriz) {
      v.applyMatrix4(matriz);
      normal.applyMatrix3(matNormal).normalize();
    }
    v.addScaledVector(normal, afuera);
    lista.push(v.x, v.y, v.z);
  }
  return lista;
}
