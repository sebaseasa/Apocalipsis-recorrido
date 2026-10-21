// Animaciones y esperas basadas en el reloj de la escena.
// Todas devuelven promesas, así el guion se escribe en orden con "await".

const activas = [];
let ahora = 0;
let ritmo = 1; // 1 = normal; más alto = avanzar rápido

export const suave = (t) => t * t * (3 - 2 * t);
export const lineal = (t) => t;

export function actualizarTiempo(dt) {
  ahora += dt * ritmo;
  for (let i = activas.length - 1; i >= 0; i--) {
    const a = activas[i];
    const p = Math.min((ahora - a.inicio) / a.duracion, 1);
    a.fn(a.curva(p));
    if (p >= 1) {
      activas.splice(i, 1);
      a.resolver();
    }
  }
}

// Llama a fn(p) cada cuadro con p de 0 a 1 durante "segundos".
export function animar(segundos, fn, curva = suave) {
  return new Promise((resolver) => {
    activas.push({ inicio: ahora, duracion: Math.max(segundos, 0.001), fn, curva, resolver });
  });
}

export function esperar(segundos) {
  return animar(segundos, () => {}, lineal);
}

// Avanzar rápido: el guion corre varias veces más deprisa hasta el siguiente texto o pausa.
export function acelerar() {
  ritmo = 8;
}

export function ritmoNormal() {
  ritmo = 1;
}

export const acelerado = () => ritmo > 1;

// Corta todo lo pendiente (para volver a empezar). Las promesas viejas no continúan.
export function cancelarTodo() {
  activas.length = 0;
  ritmo = 1;
}
