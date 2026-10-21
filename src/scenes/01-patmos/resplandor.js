import * as THREE from 'three';

// Textura circular difusa, para llamas, estrellas y el resplandor de la figura.
let textura;

export function texturaResplandor() {
  if (textura) return textura;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

export function crearResplandor(color, tamano) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texturaResplandor(),
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    })
  );
  s.scale.setScalar(tamano);
  return s;
}

// Rayos de luz detrás de la figura (dibujados una vez en un lienzo).
export function texturaRayos() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.translate(256, 256);
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2 + Math.random() * 0.05;
    const largo = 140 + Math.random() * 116;
    const ancho = 0.008 + Math.random() * 0.02;
    const grad = g.createLinearGradient(0, 0, Math.cos(a) * largo, Math.sin(a) * largo);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, largo, a - ancho, a + ancho);
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
