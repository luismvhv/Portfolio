# Luis Martínez · Artefactos

Portfolio en forma de cutting mat vista desde arriba. Cada proyecto es una pieza 3D (STL) con físicas: se puede agarrar por cualquier punto, hacer pivotar y lanzar. Con doble clic la pieza sale disparada hacia el espacio de su proyecto, que tiene su propia mat con post-its y fotos.

## Verlo en local

```bash
python3 -m http.server 8000
```

Después abre http://localhost:8000. No hay build ni dependencias que instalar (three.js y Rapier se cargan por CDN).

## Añadir contenido

Todo el contenido está en [`data/projects.js`](data/projects.js). Para añadir un proyecto:

1. Copia el STL a `assets/` y las fotos a `assets/fotos/`.
2. Añade un objeto a `PROJECTS`:

```js
{
  id: 'lampara',
  title: 'Lámpara',
  subtitle: 'Flexo plegable impreso en 3D',
  piece: { file: 'assets/lampara_brazo.stl', name: 'Brazo articulado' },
  notes: [
    { title: 'Qué es', text: 'Un flexo que se pliega hasta caber en un cajón.' },
    { title: 'Datos', list: ['PLA reciclado', '12 piezas', 'Sin tornillos'] }
  ],
  photos: [{ src: 'assets/fotos/lampara_1.jpg', caption: 'primer prototipo' }],
  extras: []
}
```

La pieza, la entrada del menú, la ruta `#/lampara`, el espacio del proyecto y la transición se generan solos. La lista completa de opciones (escala, umbral de aristas, forma de colisión, posiciones fijas, piezas extra) está en [`CLAUDE.md`](CLAUDE.md).

## Estructura

- `index.html`, `styles.css`: página y estilos.
- `data/projects.js`: contenido.
- `src/`: lógica (render, físicas, mat, espacios, navegación). No hace falta tocarla para añadir contenido.
- `assets/`: STL (o `.json` con el STL en base64) y fotos.
- `contenido_piezas.md`: borrador de textos y dudas pendientes.

## Pendiente

- Sustituir la manuscrita provisional (Homemade Apple) por la del componente de Framer.
- Fotos reales, enlaces de los proyectos y datos de contacto (`SITE.contact`).
- Portar a un componente de código de Framer.
