// "Vida" para las esculturas: respiración, túnica que se mueve con el aire, un leve
// balanceo, la cabeza que gira e inclina, y (en Jesús) el brazo derecho que se extiende.
// Se hace moviendo partes del modelo en la tarjeta gráfica (no tiene huesos ni esqueleto).
//
// Medidas en metros sobre la escultura, con los pies en y = 0 y el frente hacia +z.

const v3 = (v) => `vec3(${v.map((n) => n.toFixed(3)).join(', ')})`;

export function crearUniformesVida() {
  return {
    uTiempo: { value: 0 },
    uCabezaGiro: { value: 0 },
    uCabezaInclina: { value: 0 },
    uBrazo: { value: 0 },
    uAndar: { value: 0 },
  };
}

// alto: estatura; cuello: altura del cuello; pivote: centro de giro de la cabeza;
// hombro: centro de giro del brazo derecho (o null si no se mueve el brazo).
export function inyectarVida(sh, uniformes, { alto, cuello, pivote, hombro = null }) {
  Object.assign(sh.uniforms, uniformes);
  const brazo = hombro
    ? `
      // Brazo derecho (a la izquierda de quien mira): se extiende hacia adelante.
      float enBrazo = smoothstep(0.2, 0.29, -q.x) * smoothstep(0.7, 0.82, q.y) * (1.0 - smoothstep(${(hombro[1] - 0.02).toFixed(3)}, ${(hombro[1] + 0.08).toFixed(3)}, q.y));
      q = mix(q, rotarX(q, ${v3(hombro)}, -uBrazo), enBrazo);`
    : '';
  sh.vertexShader = sh.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uTiempo;
      uniform float uCabezaGiro;
      uniform float uCabezaInclina;
      uniform float uBrazo;
      uniform float uAndar;
      vec3 rotarY(vec3 p, vec3 c, float a) {
        p -= c;
        float s = sin(a), k = cos(a);
        return vec3(k * p.x + s * p.z, p.y, -s * p.x + k * p.z) + c;
      }
      vec3 rotarX(vec3 p, vec3 c, float a) {
        p -= c;
        float s = sin(a), k = cos(a);
        return vec3(p.x, k * p.y - s * p.z, s * p.y + k * p.z) + c;
      }`
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        vec3 q = transformed;
        float alto = ${alto.toFixed(3)};
        // Respiración: el pecho se expande y se eleva apenas.
        float pecho = smoothstep(alto * 0.5, alto * 0.68, q.y) * (1.0 - smoothstep(alto * 0.8, alto * 0.88, q.y));
        float resp = sin(uTiempo * 1.35);
        q.xz *= 1.0 + 0.012 * resp * pecho;
        q.y += 0.004 * resp * smoothstep(alto * 0.45, alto * 0.9, q.y);
        // La túnica se mueve con el aire (más al caminar).
        float ruedo = 1.0 - smoothstep(0.0, alto * 0.35, q.y);
        float aire = 0.009 * ruedo * (1.0 + uAndar * 2.5);
        q.x += sin(uTiempo * 1.1 + q.z * 7.0 + q.y * 3.0) * aire;
        q.z += sin(uTiempo * 0.9 + q.x * 6.0 + 1.3) * aire;
        ${brazo}
        // Cabeza: gira e inclina desde el cuello.
        float enCabeza = smoothstep(${(cuello - 0.06).toFixed(3)}, ${(cuello + 0.04).toFixed(3)}, q.y);
        q = mix(q, rotarX(rotarY(q, ${v3(pivote)}, uCabezaGiro), ${v3(pivote)}, uCabezaInclina), enCabeza);
        // Balanceo leve del cuerpo (y el vaivén al caminar).
        float h = q.y / alto;
        q.x += (sin(uTiempo * 0.45) * 0.012 + sin(uTiempo * 6.0) * 0.025 * uAndar) * h;
        q.y += abs(sin(uTiempo * 6.0)) * 0.025 * uAndar;
        transformed = q;
      }`
    );
}
