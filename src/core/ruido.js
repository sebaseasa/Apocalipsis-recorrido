// Ruido suave (tipo "value noise" 3D) para dar forma natural a la roca.

function hash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const suavizar = (t) => t * t * (3 - 2 * t);

export function ruido3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = suavizar(x - xi), yf = suavizar(y - yi), zf = suavizar(z - zi);
  const m = (a, b, t) => a + (b - a) * t;
  const v = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return m(
    m(m(v(0, 0, 0), v(1, 0, 0), xf), m(v(0, 1, 0), v(1, 1, 0), xf), yf),
    m(m(v(0, 0, 1), v(1, 0, 1), xf), m(v(0, 1, 1), v(1, 1, 1), xf), yf),
    zf
  ) * 2 - 1;
}

// Varias capas de ruido: formas grandes y detalles pequeños.
export function fbm(x, y, z, capas = 4) {
  let suma = 0, amp = 0.5, frec = 1;
  for (let i = 0; i < capas; i++) {
    suma += amp * ruido3(x * frec, y * frec, z * frec);
    frec *= 2.03;
    amp *= 0.5;
  }
  return suma;
}
