# Mesa de taller · portfolio

Prototipo de portfolio en forma de mesa de corte. Las piezas 3D (STL simplificados) caen y se pueden lanzar sobre una plancha negra. Al inspeccionar una pieza aparecen postits con su proyecto.

## Estado
- `index.html`: prototipo independiente (three.js r128, cannon.js 0.6.2, sin build).
- `assets/*.json`: STL en base64 (el visor no sirve .stl). Origen: `Bandeja_Recta`, `BladelessFogImpulse_V2`, `Motor_Mount`.
- `contenido_piezas.md`: textos de postits y dudas pendientes.

## Estructura de la página
- **Entrada**: título centrado "Luis Martínez" (manuscrita, se escribe de izquierda a derecha) y debajo "ARTEFACTOS" tecleado con cursor. Al terminar, las piezas caen sobre la plancha; cuando una cruza el título, este se desvanece (Esc lo salta).
- **Margen izquierdo**: aparece tras la entrada. Título, bio breve, listado de proyectos (abre el panel de cada uno), contacto y pedir información.

## Pendiente
- Sustituir la tipografía manuscrita provisional (Homemade Apple) por la del componente de Framer.
- Rellenar `CONTACT` (email, LinkedIn) en `index.html` y revisar la bio del margen.
- Confirmar textos y enlaces (Bambu Lab, MakerWorld, TFG, TFM).
- Fotos de piezas y proyectos.
- Verificar visualmente la escena (la primera versión se vio en negro en un visor).
- Portar a un componente de código de Framer.
- Generar mallas más ligeras si el rendimiento en móvil no basta.
