# Mesa de taller · portfolio

Prototipo de portfolio en forma de mesa de corte. Las piezas 3D (STL simplificados) caen y se pueden lanzar sobre una plancha negra. Al inspeccionar una pieza aparecen postits con su proyecto.

## Estado
- `index.html`: prototipo independiente (three.js r128, cannon.js 0.6.2, sin build).
- `assets/*.json`: STL en base64 (el visor no sirve .stl). Origen: `Bandeja_Recta`, `BladelessFogImpulse_V2`, `Motor_Mount`.
- `contenido_piezas.md`: textos de postits y dudas pendientes.

## Pendiente
- Confirmar textos y enlaces (Bambu Lab, MakerWorld, TFG, TFM).
- Fotos de piezas y proyectos.
- Verificar visualmente la escena (la primera versión se vio en negro en un visor).
- Portar a un componente de código de Framer.
- Generar mallas más ligeras si el rendimiento en móvil no basta.
