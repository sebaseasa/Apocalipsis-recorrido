# Apocalipsis: recorrido inmersivo

## Visión
Experiencia 3D en primera persona donde el visitante "entra" al libro de Apocalipsis y vive los versículos en carne propia. Se usará en una célula (grupo pequeño de iglesia, varios hermanos mayores de 60 años), proyectada en una pantalla, y también desde el celular.

El tono es reverente, cinematográfico y esperanzador. Nada de terror ni gore: lo impactante viene de la escala, la luz, el sonido y el silencio, no de lo grotesco.

## Plataforma y restricciones (no negociables)
- Dispositivo principal de desarrollo y prueba: **Samsung Galaxy Z Fold 5** en Chrome para Android. Debe verse bien doblado (pantalla angosta, vertical) y desdoblado (casi cuadrado).
- También debe funcionar en una laptop conectada a una TV.
- Controles táctiles: el recorrido es **guiado** (la cámara avanza sola por un camino), el usuario solo toca para continuar a la siguiente escena y puede arrastrar para mirar alrededor. Nada de joysticks complicados.
- Rendimiento: 30 fps estables en el Fold 5. Peso total por escena menor a 25 MB. Texturas en 1K o 2K comprimidas (KTX2/Basis o WebP), modelos en glTF/GLB con Draco.
- Debe publicarse como sitio estático en **GitHub Pages**, abriéndose con un enlace.

## Stack
- three.js (versión fija, no "latest") con Vite.
- Postprocesado ligero: bloom, niebla volumétrica simulada, viñeta. Desactivar efectos pesados si el dispositivo es lento.
- Audio con Web Audio API: ambiente (mar, viento), música suave y la voz leyendo los versículos.
- Sin backend, sin base de datos, sin librerías de pago.

## Estructura de carpetas
```
/src
  main.js            arranque, selector de escena
  /core              cámara guiada, controles táctiles, audio, subtítulos, detector de rendimiento
  /scenes
    /01-patmos       primera escena (ver guion abajo)
/public
  /assets
    /models          .glb
    /textures
    /hdri
    /audio
  /text              versículos en JSON
CREDITS.md           licencia y origen de cada asset
```

## Contenido y licencias
- Texto bíblico: Reina-Valera 1909 (dominio público).
- Arte de referencia: grabados de Alberto Durero, 1498 (dominio público).
- Assets 3D y texturas: solo CC0 o licencias libres (Poly Haven, ambientCG, Sketchfab con licencia CC). Registrar cada uno en CREDITS.md.
- Voz: inicialmente síntesis de voz en español como marcador; se reemplazará por una grabación real.

## Escena 1: Patmos (Apocalipsis 1:9-20)
**Objetivo:** que el visitante sienta que es Juan, desterrado, y de pronto se encuentra con Cristo glorificado.

0. **Desde lo alto.** (Agregado por Sebastián.) Empieza en el espacio, sobre la Tierra, y desciende al mar Egeo, muestra las siete iglesias de Asia y termina sobre la isla de Patmos, para ubicar dónde ocurre todo.
1. **Oscuridad y mar.** Pantalla negra. Se escucha el mar y viento. Texto en pantalla: "Yo Juan... estaba en la isla que es llamada Patmos" (1:9).
2. **La cueva.** Fade in. Estamos dentro de una cueva de roca, en penumbra. Al fondo, la boca de la cueva deja ver el mar al atardecer. La cámara avanza lentamente hacia la luz.
3. **La voz.** Al llegar a la entrada, un sonido grave y potente como de trompeta (1:10). La cámara se gira despacio hacia atrás.
4. **Los candeleros.** Detrás, donde antes había oscuridad, se encienden uno por uno siete candeleros de oro, formando un semicírculo. Cada llama ilumina la roca.
5. **El Hijo del hombre.** En medio, una figura realista, como en el grabado de Durero: se ven su rostro, cabello y barba, con vestidura larga y cinto de oro, rodeada de resplandor (decisión de Sebastián, cambió la regla anterior de "solo silueta de luz"). Su rostro solo se vuelve luz intensa en 1:16 ("como el sol") y luego baja para verlo cara a cara. Siete estrellas brillan sobre su mano derecha.
6. **"No temas".** La cámara baja como si el visitante cayera de rodillas (1:17). Pausa en silencio. Luego se lee: "No temas: yo soy el primero y el último; y el que vivo, y he sido muerto; y he aquí que vivo por siglos de siglos" (1:17-18).
7. **Cierre.** La luz llena la pantalla. Aparece el grabado de Durero de los siete candeleros y la pregunta para la célula: "¿Qué te dice que Jesús camine en medio de su iglesia?"

Subtítulos siempre visibles, letra grande y legible para personas mayores.

## Escena 2: Las cartas a las siete iglesias (Apocalipsis 2-3)
Guion detallado en `docs/guion-escena-2.md`. Decisiones de Sebastián:
- Menú con ambas opciones: las siete cartas seguidas o una sola iglesia. No es solo para la célula: también se usará para enseñar.
- Texto completo de cada carta (RV 1909 de eBible.org, en `public/text/apocalipsis-2-3.json`), sin recortes.
- Solo se muestra lo que el texto nombra; lo que no describe (Satanás, Jezabel, personas) no se dibuja.
- Nombres de las ciudades como en la RV 1909: Efeso, Smirna, Pérgamo, Tiatira, Sardis, Filadelfia, Laodicea.
- Al final de cada carta, "Para reflexionar" con la pregunta aprobada.

## Forma de trabajo
1. Primero, montar el proyecto vacío y publicarlo en GitHub Pages para confirmar que el enlace abre en el Fold 5.
2. Luego construir la escena 1 con formas simples (cajas y luces) para validar el recorrido y los tiempos.
3. Después reemplazar por assets realistas y ajustar la iluminación.
4. En cada paso, decirme qué probar en el celular y esperar mi confirmación antes de seguir.
5. Explícame en español sencillo lo que hiciste, sin tecnicismos innecesarios.
6. No avanzar a otras escenas hasta que la escena 1 esté aprobada.
