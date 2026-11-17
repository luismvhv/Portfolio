# Portfolio · guía de trabajo

Portfolio de Luis Martínez: una cutting mat vista desde arriba con piezas 3D (STL) que tienen físicas. Cada pieza es un proyecto; al abrirla se viaja a un espacio propio con post-its y fotos.

## Regla principal

**El contenido vive solo en `data/projects.js`.** Para añadir o cambiar proyectos, post-its, fotos o piezas no se toca nada de `src/`. Si una tarea de contenido parece exigir cambios en `src/`, falta una opción en los datos: añádela allí con un valor por defecto.

## Cómo está montado

| Archivo | Qué hace |
|---|---|
| `data/projects.js` | Todo el contenido: `SITE`, `PROJECTS`, `CONTACT_SPACE`. |
| `src/config.js` | Tamaño de la mat, valores por defecto de las piezas, físicas, zoom. |
| `src/geometry.js` | Carga STL, suelda vértices, calcula aristas vivas y contorno. |
| `src/physics.js` | Rapier: colisiones, agarre por punto, límites de velocidad. |
| `src/mat.js` | Dibuja una cutting mat (cuadrícula, numeración, cortes, desgaste). |
| `src/spaces.js` | Genera el espacio de cada proyecto y coloca post-its y fotos. |
| `src/main.js` | Cámara, interacción, navegación entre espacios, menú, preloader. |
| `styles.css` | Estilos. Solo tres tipografías, en variables: `--hand`, `--big`, `--small`. |

- Sin build. Se sirve tal cual con cualquier servidor estático: `python3 -m http.server 8000`.
- Unidades: milímetros. A zoom 1, 1 mm = 1 px.
- La mat, los post-its y las fotos son HTML/SVG (texto real, nítido con zoom). Las piezas se dibujan en un lienzo WebGL transparente encima.
- Cada espacio de proyecto está lejos de la mat principal. La cámara está acotada al espacio actual; solo se cambia de espacio con `go(id)` (doble clic en la pieza, menú o ruta `#/id`).

## Añadir un proyecto

1. Copia el STL a `assets/` (binario o ASCII, en milímetros). También vale un `.json` con el STL en base64 (`{"b64": "..."}`).
2. Si hay fotos, cópialas a `assets/fotos/`.
3. Añade un objeto al array `PROJECTS` de `data/projects.js`.

Con eso aparece la pieza en la mat principal (en un sitio libre), la entrada en el menú, la ruta `#/id` y su espacio con la transición.

### Ejemplo completo

```js
{
  id: 'lampara',                                  // único, sin espacios: es la ruta (#/lampara)
  title: 'Lámpara',
  subtitle: 'Flexo plegable impreso en 3D',
  piece: { file: 'assets/lampara_brazo.stl', name: 'Brazo articulado' },
  notes: [
    { title: 'Qué es', text: 'Un flexo que se pliega hasta caber en un cajón.' },
    { title: 'Datos', list: ['PLA reciclado', '12 piezas', 'Sin tornillos'] },
    { title: 'Enlaces', links: [{ label: 'MakerWorld', url: 'https://…' }] }
  ],
  photos: [
    { src: 'assets/fotos/lampara_1.jpg', caption: 'primer prototipo' }
  ],
  extras: [
    { file: 'assets/lampara_base.stl', name: 'Base' }      // otras piezas de su espacio de trabajo
  ]
}
```

## Opciones

### Pieza (`piece` y cada elemento de `extras`)

| Campo | Por defecto | Para qué |
|---|---|---|
| `file` | obligatorio | Ruta del STL. |
| `name` | — | Nombre que sale al pasar el ratón y en la base del espacio. |
| `scale` | `1` | Multiplica el tamaño real. Las piezas van a escala con la mat. |
| `edgeAngle` | `38` | Grados. Solo se dibuja una arista si sus caras forman más de este ángulo. Súbelo si se ven facetas en curvas; bájalo si faltan aristas. |
| `edgeMinLength` | `0.06` | Descarta trazos sueltos más cortos que esta fracción del tamaño (ruido de malla). |
| `collider` | `'hull'` | `'hull'` (envolvente convexa) o `'box'` (caja). |
| `rotate` | `[0,0,0]` | Giro inicial en grados (x, y, z) si el STL viene de pie. |
| `at` | automático | `[x, z]` en mm desde el centro de la mat principal. |

### Post-it (`notes`)

`title`, y uno o varios de: `text`, `list` (array), `links` (`{label, url}`; `url: null` muestra "enlace pendiente"), `email` (`true` o un asunto), `linkedin: true`.
Opcionales: `color` (`'yellow'`, `'pink'`, `'blue'`, `'white'`), `rot` (grados), `at: [x, y]` en mm desde la esquina superior izquierda de la mat del proyecto.

### Foto (`photos`)

`src` (ruta; `null` muestra "foto pendiente"), `caption`. Opcionales: `rot`, `at: [x, y]`.

### Colocación

Sin `at`, todo se coloca solo: las piezas buscan un hueco libre en espiral desde el centro; fotos y post-its se reparten en columnas y la mat del proyecto crece para que quepan. Con `at` el elemento queda fijo donde digas (el resto no lo esquiva: compruébalo en el navegador).

## Comprobar un cambio

Abre la web, espera a que caigan las piezas y revisa: la pieza nueva en la mat, su entrada en el menú, doble clic → espacio → "volver a la mesa". Mira la pieza con el zoom al máximo: si se ven triángulos en curvas, sube `edgeAngle`.

## Estilo

- Craft: mat, post-its y manuscrita (`--hand`). Tech: menú blanco puro con negro, líneas de borde a borde y máquina de escribir.
- Tipografías: `--hand` (manuscrita), `--big` (Special Elite, textos grandes) y `--small` (Courier Prime, textos pequeños). No añadir más.
- Todo lo escrito sobre la mat debe ser texto HTML/SVG, nunca imágenes.

## Pendiente

- `--hand` es provisional (Homemade Apple) hasta tener la tipografía del componente de Framer.
- `SITE.contact` (email, LinkedIn), fotos reales y enlaces de los proyectos.
