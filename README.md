# Luis Martínez · Artefactos

Portfolio en forma de tapete de corte visto desde arriba. Las piezas 3D (STL simplificados) caen sobre el tapete, chocan entre ellas y se pueden arrastrar y lanzar. Cada proyecto tiene su zona en el tapete con postits y polaroids.

## Estructura
- **Preloader**: "Luis Martínez" (manuscrita) y "ARTEFACTOS" (efecto máquina de escribir) sobre el tapete mientras cargan los STL (porcentaje abajo a la derecha). Cuando termina, las piezas caen desde la cámara, atraviesan el título y este se desvanece. Esc lo salta.
- **Tapete** (HTML/CSS, 2D): cuadrícula de 10/50 mm con desgaste, numeración en cm en los bordes, reglas, transportador y arañazos. Se recorre arrastrándolo (con inercia) y con la rueda o pellizco para el zoom; la cámara no pasa de los bordes.
- **Piezas** (three.js + cannon.js, encima del tapete con fondo transparente): al arrastrarlas se empujan con velocidad, así que chocan y ruedan sin montarse unas sobre otras.
- **Zonas de proyecto** (Broto, DECO, VIENTO y Contacto) en las esquinas del tapete. Doble clic en una pieza (o un clic con Lupa, o soltarla en su base) la lleva a su zona y la cámara la acompaña.
- **Margen izquierdo**: título, bio, listado de proyectos, contacto y pedir información.

## Archivos
- `index.html`: todo el prototipo (sin build).
- `assets/*.json`: STL en base64 (el visor no sirve .stl).
- `contenido_piezas.md`: textos de postits y dudas pendientes.

## Pendiente
- Sustituir la manuscrita provisional (Homemade Apple) por la del componente de Framer.
- Fotos de cada proyecto: rellenar `photos[].src` en `PROJECTS` (por ejemplo `assets/fotos/broto_1.jpg`).
- Rellenar `CONTACT` (email, LinkedIn) y revisar la bio.
- Confirmar textos y enlaces (Bambu Lab, MakerWorld, TFG, TFM).
- Portar a un componente de código de Framer.
