# Overlap · video de 3 minutos (estudio de grabación de la app)

Cada clip se filma de la app real, cuadro a cuadro, con un reloj virtual: 1920×1080, 30 fps, movimiento perfecto y repetible.
Encima de la app va una capa de "escenario" (títulos grandes, etiquetas, cursor, zooms) con la estética de Overlap.
Cada video final es **un solo archivo con subtítulos en inglés quemados** (`video/out/<nombre>.mp4`), sin audio: la música, los efectos y la voz se ponen en el montaje.

- Guion de voz en off completo: [`VOZ_EN_OFF.md`](VOZ_EN_OFF.md)
- Subtítulos en inglés de cada clip: `video/subs/<ID>.srt` (ya escritos y revisados; no cambiar cifras)
- Escenas hechas (referencia de estilo): `studio/v3.js`, `studio/v4.js`, `studio/v5.js`

## Cómo correrlo

```bash
pip install playwright && python3 -m playwright install chromium   # una vez
# ffmpeg con libass (macOS: brew install ffmpeg)
cd app && python3 -m http.server 8765        # dejarlo corriendo en otra terminal
video/render.sh video/studio/v7.js 10 V7_hoy r8   # escena, segundos, nombre, área
```

Antes de filmar entero, revisar cuadros sueltos:
`URL="http://localhost:8765/?lang=es&area=r8" python3 video/studio/film.py video/studio/v7.js 10 video/out/v7.mp4 --preview 1,4,8`

## Cómo se escribe una escena

Un archivo `studio/vN.js` que define `window.__frame(t)` (t en segundos). En cada cuadro:
- pone el estado de la app llamando sus funciones (`setMode`, `showMonth`, `zoomTo`, `paintMap`, `renderClock`…) **una sola vez** cuando t cruza el momento (bandera en `S.done`);
- dibuja la capa `#stage` (kicker lima en mayúsculas, título grande, subtítulo, marca, tarjetas, cursor con onda de clic, fundido inicial);
- mueve la "cámara" con `transform` CSS sobre la tarjeta de la app (todo es vectorial: nítido a cualquier zoom);
- devuelve `{ mouse:[x,y], click:true }` cuando hace falta un hover o clic real (tooltips reales de la app).
Las animaciones CSS y SVG de la app quedan controladas por el reloj virtual (ver `TICK` en `film.py`).

## Estética (no cambiar)

- Fondo azul noche `#050d24` con brillos; lima `#eaff28` para acentos; azul `#0197f8`; naranja `#ff8a3d` para "más focos"; texto `#eaf1ff`, secundario `#c9d6ea`.
- Tipografía Inter / Inter Display. Kicker 17 px mayúsculas espaciadas con punto lima; título 110 px con el año o la palabra clave en lima; subtítulo 26 px.
- Marca "Overlap" con logo arriba a la derecha (se oculta cuando entra una tarjeta en esa esquina).
- Tarjetas: vidrio oscuro, borde de color, sombra larga, entran deslizando con `out()` (curva cúbica).
- Cursor: círculo blanco con borde lima; clic = onda lima que se expande.
- Zooms lentos con `io()` (ease in-out). Nada aparece de golpe: todo entra con fundido y desplazamiento.
- Cifras en pantalla: solo las que muestra la app o las del guion. Nada inventado.
- Clips de animación sin app (V1, V2, V10): llevan en una esquina la etiqueta pequeña "Animación generada con IA".

## Reparto (para no pisarnos)

| ID | Clip | Duración | Voz | Quién |
| --- | --- | --- | --- | --- |
| V1 | El problema (animación: dos satélites, salto 2012) | 11 s | Matías | Claude con Matías |
| V2 | Título Overlap (animación del logo) | 7 s | — | Claude con Matías |
| V3 | Línea de tiempo | 28 s | Matías | listo |
| V4 | Píxeles y coordenada | 15 s | Matías | listo |
| VG | ¿Cuántos focos más ve VIIRS? | 14 s | Karla | Claude con Matías |
| V5 | Armonización | 18 s | Karla | listo |
| V6 | Validación con CONAF | 17 s | Karla | Claude con Matías |
| V7 | Hoy | 10 s | Matías | **Benjamín** |
| V8 | Reloj de la temporada | 11 s | Karla | **Benjamín** |
| V9 | Descargas | 8 s | Matías | **Benjamín** |
| V10 | Tarjeta final | 6 s | — | **Benjamín** (primero) |

Benjamín parte por V10 y va hacia atrás (V10 → V9 → V8 → V7).

## Fichas de los clips de Benjamín

**V10 · Tarjeta final (6 s, sin app; fondo y estética del escenario).**
Entra el logo con brillo, luego: "Overlap" · "Dos satélites. Un solo calendario honesto." · `contactomtingcl.github.io/overlap` · "Equipo Overlap · NASA Space Apps Challenge 2026 · Concepción, Chile" · "Datos: NASA FIRMS · CONAF". Sin nombres de personas, sin logos de la NASA. Etiqueta "Animación generada con IA". Subtítulos: `subs/V10.srt`.

**V9 · Descargas (8 s, área r8).** Cortes rápidos (≈2 s cada uno) con zoom a cada control real: botón **CSV** (barra de controles), **Descargar para SIG** abierto (mapa, GeoPackage y GeoJSON), cambio **EN / ES** (la app cambia de idioma entera) y **Daltonismo** (paleta cividis en el mapa o calendario). Títulos: "Descargas" / "CSV · GeoPackage · GeoJSON" / "Español e inglés" / "Paleta para daltonismo". Subtítulos: `subs/V9.srt`.

**V8 · Reloj de la temporada (11 s, área r6 = O'Higgins).** 0–3,4 s: el dial del reloj (tarjeta "Reloj de la temporada") entra con zoom; título "Reloj de la temporada". 3,5–11 s: se abre "Ver cada temporada y las pruebas de tendencia", la cámara va a las barras; el cursor recorre 2–3 temporadas (hover real: aparece la tarjeta con inicio, centro y fin) y destaca la tarjeta "Momento de más focos": en O'Higgins se adelantó unos 59 días por década (−59,3; confirmado en años solo VIIRS). Etiqueta en pantalla: "−59 días por década · confirmado con un solo satélite". Subtítulos: `subs/V8.srt`.

**V7 · Hoy (10 s, área r8 = Biobío).** 0–4,4 s: tarjeta "Ahora" con el titular "Octubre de 2026 en Biobío: muchos menos focos de lo normal", zoom a los recuadros (46 este mes; lo normal 119; "ningún octubre anterior tuvo menos focos"). 4,5–10 s: la cámara baja a "Esta temporada…": 185 focos frente a lo normal 337, rango habitual 232–570, "Por ahora, una temporada tranquila"; etiqueta "Escenario, no pronóstico". Subtítulos: `subs/V7.srt`.

## Prompt para Claude Code en el computador de Benjamín

Copiar y pegar tal cual, desde la carpeta del repositorio clonado:

> Estás en el repositorio de Overlap (NASA Space Apps Challenge 2026). Necesito filmar clips de la app para el video del equipo, con la misma estética y el mismo método de los clips ya hechos. Lee primero `video/README.md` completo, `video/VOZ_EN_OFF.md`, y estudia `video/studio/film.py`, `video/studio/stage.css` y las escenas `video/studio/v3.js`, `v4.js` y `v5.js`: son la referencia exacta de estilo (títulos, tarjetas, cursor, zooms, tiempos) y de técnica (reloj virtual, `window.__frame(t)`, acciones una sola vez, cámara con transform CSS).
> Tu tarea: crear las escenas de **V10, V9, V8 y V7, en ese orden**, según las fichas de `video/README.md`. Para cada una: escribe `video/studio/vN.js`; revisa 3 o 4 cuadros con `--preview` y míralos antes de filmar entero (corrige textos cortados, superposiciones y cifras); luego filma con `video/render.sh`, que deja un único archivo con los subtítulos en inglés de `video/subs/<ID>.srt` quemados en `video/out/`. No cambies el texto ni los tiempos de los subtítulos ni las cifras: deben coincidir con la voz en off. Usa solo cifras que muestre la app. No modifiques `app/` ni `pipeline/`. Antes de empezar, levanta el servidor (`cd app && python3 -m http.server 8765`) e instala lo necesario (Playwright con Chromium y ffmpeg con libass). Al terminar cada clip, dime la ruta del archivo y en una línea qué muestra.
