const caja = document.getElementById('subtitulo');

export function mostrarSubtitulo(cita, texto) {
  caja.innerHTML = '';
  const c = document.createElement('span');
  c.className = 'cita';
  c.textContent = cita;
  caja.append(c, texto);
}
