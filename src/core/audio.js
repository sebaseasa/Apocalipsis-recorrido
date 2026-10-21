// Sonidos de prueba generados con Web Audio (sin archivos).
// Se reemplazarán por grabaciones reales en el paso 3.

let ctx;
let maestro;
let reverb;
const buses = {};
let ruidoBlanco;
let ruidoMarron;

export function iniciarAudio() {
  if (ctx) return ctx.resume();
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  const compresor = ctx.createDynamicsCompressor();
  compresor.threshold.value = -12;
  compresor.ratio.value = 4;
  maestro = ctx.createGain();
  maestro.gain.value = 1;
  maestro.connect(compresor).connect(ctx.destination);

  reverb = ctx.createConvolver();
  reverb.buffer = respuestaCueva(3.5);
  const retorno = ctx.createGain();
  retorno.gain.value = 0.6;
  reverb.connect(retorno).connect(maestro);

  for (const nombre of ['ambiente', 'musica', 'efectos']) {
    buses[nombre] = ctx.createGain();
    buses[nombre].gain.value = 0;
    buses[nombre].connect(maestro);
  }
  buses.efectos.gain.value = 1;

  ruidoBlanco = crearRuido(false);
  ruidoMarron = crearRuido(true);
  crearMar();
  crearViento();
  crearMusica();
  return ctx.resume();
}

function crearRuido(marron) {
  const largo = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < largo; i++) {
    const b = Math.random() * 2 - 1;
    if (marron) {
      ultimo = (ultimo + 0.02 * b) / 1.02;
      d[i] = ultimo * 3.5;
    } else {
      d[i] = b;
    }
  }
  return buffer;
}

// Eco de cueva: ruido que se apaga poco a poco.
function respuestaCueva(segundos) {
  const largo = ctx.sampleRate * segundos;
  const buffer = ctx.createBuffer(2, largo, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < largo; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3);
    }
  }
  return buffer;
}

function fuente(buffer) {
  const s = ctx.createBufferSource();
  s.buffer = buffer;
  s.loop = true;
  s.loopStart = Math.random();
  s.start(0, Math.random() * 3);
  return s;
}

// Oscilador lento que mueve un parámetro (olas, ráfagas).
function vaiven(param, frecuencia, profundidad) {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = frecuencia;
  const g = ctx.createGain();
  g.gain.value = profundidad;
  lfo.connect(g).connect(param);
  lfo.start();
}

function crearMar() {
  // Olas graves que suben y bajan.
  for (const [frec, fase] of [[0.09, 0], [0.13, 1]]) {
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 450;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    vaiven(g.gain, frec + fase * 0.01, 0.3);
    vaiven(filtro.frequency, frec, 250);
    fuente(ruidoMarron).connect(filtro).connect(g).connect(buses.ambiente);
  }
  // Espuma: ruido agudo y suave.
  const espuma = ctx.createBiquadFilter();
  espuma.type = 'bandpass';
  espuma.frequency.value = 1800;
  espuma.Q.value = 0.6;
  const ge = ctx.createGain();
  ge.gain.value = 0.04;
  vaiven(ge.gain, 0.09, 0.035);
  fuente(ruidoBlanco).connect(espuma).connect(ge).connect(buses.ambiente);
}

function crearViento() {
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = 500;
  filtro.Q.value = 1.2;
  vaiven(filtro.frequency, 0.05, 250);
  const g = ctx.createGain();
  g.gain.value = 0.08;
  vaiven(g.gain, 0.07, 0.05);
  fuente(ruidoBlanco).connect(filtro).connect(g).connect(buses.ambiente);
}

// Acorde suave y sostenido (re mayor abierto) como música de fondo.
function crearMusica() {
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 900;
  filtro.connect(buses.musica);
  const envio = ctx.createGain();
  envio.gain.value = 0.5;
  filtro.connect(envio).connect(reverb);
  for (const f of [73.42, 110, 146.83, 220, 293.66, 369.99]) {
    for (const desafine of [-4, 4]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = desafine;
      const g = ctx.createGain();
      g.gain.value = 0.025;
      vaiven(g.gain, 0.05 + Math.random() * 0.1, 0.012);
      o.connect(g).connect(filtro);
      o.start();
    }
  }
}

// Cambia el volumen de un grupo de sonidos poco a poco.
export function nivel(bus, valor, segundos = 2) {
  if (!ctx) return;
  const g = buses[bus].gain;
  const t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(valor, t + segundos);
}

// Silencio total (o vuelta del sonido) con fundido.
export function silencio(activo, segundos = 1.5) {
  if (!ctx) return;
  const t = ctx.currentTime;
  maestro.gain.cancelScheduledValues(t);
  maestro.gain.setValueAtTime(maestro.gain.value, t);
  maestro.gain.linearRampToValueAtTime(activo ? 0 : 1, t + segundos);
}

// Gran voz como de trompeta: grave, potente, con eco largo.
export function trompeta(duracion = 5) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const salida = ctx.createGain();
  salida.gain.setValueAtTime(0, t);
  salida.gain.linearRampToValueAtTime(0.5, t + 0.5);
  salida.gain.setValueAtTime(0.5, t + duracion - 1.5);
  salida.gain.linearRampToValueAtTime(0, t + duracion);
  salida.connect(buses.efectos);
  const envio = ctx.createGain();
  envio.gain.value = 0.9;
  salida.connect(envio).connect(reverb);

  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.Q.value = 2;
  filtro.frequency.setValueAtTime(200, t);
  filtro.frequency.exponentialRampToValueAtTime(2200, t + 0.8);
  filtro.frequency.exponentialRampToValueAtTime(1400, t + duracion);
  filtro.connect(salida);

  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5;
  const prof = ctx.createGain();
  prof.gain.setValueAtTime(0, t);
  prof.gain.linearRampToValueAtTime(8, t + 2);
  vibrato.connect(prof);
  vibrato.start(t);
  vibrato.stop(t + duracion);

  for (const [f, vol] of [[73.42, 0.5], [110, 0.35], [146.83, 0.3], [220, 0.12]]) {
    for (const desafine of [-6, 0, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = desafine;
      prof.connect(o.detune);
      const g = ctx.createGain();
      g.gain.value = vol / 3;
      o.connect(g).connect(filtro);
      o.start(t);
      o.stop(t + duracion);
    }
  }
}

// Llama que se enciende: soplo suave más una nota tenue.
export function encender(indice) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const soplo = ctx.createBufferSource();
  soplo.buffer = ruidoBlanco;
  const fs = ctx.createBiquadFilter();
  fs.type = 'bandpass';
  fs.frequency.setValueAtTime(300, t);
  fs.frequency.exponentialRampToValueAtTime(1200, t + 0.4);
  const gs = ctx.createGain();
  gs.gain.setValueAtTime(0, t);
  gs.gain.linearRampToValueAtTime(0.15, t + 0.1);
  gs.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  soplo.connect(fs).connect(gs).connect(buses.efectos);
  soplo.start(t, Math.random() * 3);
  soplo.stop(t + 1);

  // Escala pentatónica de re, subiendo con cada candelero.
  const notas = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25];
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = notas[indice % notas.length];
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
  o.connect(g);
  g.connect(buses.efectos);
  g.connect(reverb);
  o.start(t);
  o.stop(t + 3.2);
}

// Golpe sordo al caer al suelo (1:17).
export function golpe() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  o.connect(g).connect(buses.efectos);
  g.connect(reverb);
  o.start(t);
  o.stop(t + 0.8);

  const polvo = ctx.createBufferSource();
  polvo.buffer = ruidoMarron;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 400;
  const gp = ctx.createGain();
  gp.gain.setValueAtTime(0.6, t);
  gp.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  polvo.connect(f).connect(gp).connect(buses.efectos);
  polvo.start(t, Math.random() * 3);
  polvo.stop(t + 0.6);
}

// Fuego como de horno, para los pies ardientes (1:15).
export function horno(duracion = 6) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const s = ctx.createBufferSource();
  s.buffer = ruidoMarron;
  s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 220;
  f.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.5, t + 1.5);
  g.gain.setValueAtTime(0.5, t + duracion - 2);
  g.gain.linearRampToValueAtTime(0, t + duracion);
  vaiven(g.gain, 3.5, 0.12);
  s.connect(f).connect(g).connect(buses.efectos);
  s.start(t, Math.random() * 3);
  s.stop(t + duracion);
}

// Destello brillante y agudo (estrellas, espada, llaves).
export function destello(grave = false) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const notas = grave ? [587.33, 880] : [1174.66, 1760, 2349.32];
  notas.forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    const t0 = t + i * 0.12;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.5);
    o.connect(g);
    g.connect(buses.efectos);
    g.connect(reverb);
    o.start(t0);
    o.stop(t0 + 2.6);
  });
}

// Tres golpes suaves en una puerta de madera (3:20 "estoy á la puerta y llamo").
export function llamar() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [0, 0.45, 0.9].forEach((d) => {
    const t = t0 + d;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(buses.efectos);
    g.connect(reverb);
    o.start(t);
    o.stop(t + 0.3);
    const golpe = ctx.createBufferSource();
    golpe.buffer = ruidoBlanco;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 1.5;
    const gg = ctx.createGain();
    gg.gain.setValueAtTime(0.35, t);
    gg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    golpe.connect(f).connect(gg).connect(buses.efectos);
    golpe.start(t, Math.random() * 3);
    golpe.stop(t + 0.1);
  });
}
