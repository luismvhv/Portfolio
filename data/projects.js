/* =====================================================================
   CONTENIDO DEL PORTFOLIO
   Este es el único archivo que hay que tocar para añadir o cambiar
   proyectos, post-its, fotos o piezas. Guía completa en CLAUDE.md.
   ===================================================================== */

export const SITE = {
  name: 'Luis Martínez',
  tagline: 'ARTEFACTOS',
  bio: 'Ingeniero eléctrico y diseñador de producto. Diseño, prototipo e imprimo en 3D sistemas físicos: desde patines eléctricos hasta huertos domésticos automatizados.',
  footer: '© 2026 Luis Martínez',
  contact: { email: null, linkedin: null }        // Pendiente: datos reales
};

export const PROJECTS = [
  {
    id: 'broto',
    title: 'Broto',
    subtitle: 'Autocultivo doméstico con hidroponía',
    piece: { file: 'assets/broto_bandeja.json', name: 'Bandeja recta' },
    notes: [
      { title: 'La pieza', text: 'Bandeja del sistema de autocultivo Broto.' },
      { title: 'Qué es', text: 'Sistema de autocultivo doméstico con iluminación LED inteligente ajustable en altura y ciclos de luz configurables desde la app.' },
      { title: 'Datos clave', list: ['PVP estimado: 70 € (coste industrial 35 €, sin IVA)', 'Materiales de escritorio biobasados', 'MVP: segundo trimestre de 2026'] },
      { title: 'Enlaces', links: [{ label: 'Documentación', url: null }] }
    ],
    photos: [
      { src: null, caption: 'el prototipo' },
      { src: null, caption: 'en casa' }
    ],
    extras: []
  },
  {
    id: 'deco',
    title: 'DECO',
    subtitle: 'Cultivo modular de setas y plantas',
    piece: { file: 'assets/deco_fog.json', name: 'Generador de niebla', edgeAngle: 65, edgeMinLength: 0.12 },
    notes: [
      { title: 'La pieza', text: 'Generador de niebla de DECO por ultrasonidos.' },
      { title: 'Qué es', text: 'Sistema modular de cultivo doméstico: cubos de 250 mm que se apilan y conectan con imanes y pogo-pins.' },
      { title: 'Módulos', list: ['Eco-Core: agua, bomba y CPU', 'Fungi-Pod: cámara oscura con humedad para setas', 'Green-Pod: LED cenital para vegetales'] },
      { title: 'Datos del pitch', list: ['PVP estimado: 250 € (coste 95 €, sin IVA)', 'App web y reutilización de CO₂', 'Validación: 2.º trimestre de 2027'] },
      { title: 'Enlaces', links: [{ label: 'Pitch deck', url: null }] }
    ],
    photos: [
      { src: null, caption: 'los módulos' },
      { src: null, caption: 'la niebla' }
    ],
    extras: []
  },
  {
    id: 'viento',
    title: 'VIENTO',
    subtitle: 'Patines eléctricos en línea · TFG',
    piece: { file: 'assets/viento_motor_mount.json', name: 'Chasis del motor' },
    notes: [
      { title: 'La pieza', text: 'Sujeta el motor BLDC de los patines. Impreso en 3D; el TFG lo plantea también en aluminio.' },
      { title: 'Qué es', text: 'Diseño y prototipado de unos patines eléctricos en línea. TFG de Ingeniería Eléctrica, Universidad de Valladolid, julio de 2023.' },
      { title: 'Tecnología', list: ['Motor BLDC y controlador VESC', 'Baterías LiPo y Li-ion', 'Impresión 3D y Fusion 360'] },
      { title: 'Enlaces', links: [{ label: 'TFG', url: null }] }
    ],
    photos: [
      { src: null, caption: 'primer rodaje' },
      { src: null, caption: 'el chasis' }
    ],
    extras: []
  }

];

/* Espacio de contacto: igual que un proyecto, pero sin pieza. */
export const CONTACT_SPACE = {
  id: 'contacto',
  title: 'Contacto',
  subtitle: 'Proyectos, colaboraciones y prototipos',
  notes: [
    { title: 'Escríbeme', email: true },
    { title: 'Pedir información', text: 'Cuéntame qué proyecto te interesa y te envío documentación, planos o fotos.', email: 'Información sobre tus proyectos' },
    { title: 'En la red', linkedin: true }
  ],
  photos: [{ src: null, caption: 'Luis en el taller' }]
};
