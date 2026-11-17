/* Parámetros generales. Las medidas están en milímetros (1 mm = 1 px a zoom 1). */

export const MAT = { w: 3300, h: 2200, margin: 50, grid: 50 };   // cutting mat principal: 330 × 220 cm

/* Valores por defecto de cada pieza; se pueden sobrescribir en data/projects.js */
export const PIECE_DEFAULTS = {
  scale: 1,            // multiplicador sobre el tamaño real del STL (mm)
  edgeAngle: 38,       // grados: solo se dibuja una arista si sus dos caras forman más de este ángulo
  edgeMinLength: 0.06, // se descartan trazos sueltos más cortos que esta fracción del tamaño de la pieza (ruido de malla)
  collider: 'hull',    // 'hull' (envolvente convexa del STL) o 'box' (caja)
  rotate: [0, 0, 0],   // giro inicial del STL en grados (x, y, z) para tumbarlo como convenga
  at: null             // [x, z] en mm desde el centro de la mat; null = colocación automática
};

export const PHYSICS = {
  gravity: 9810,
  solverIterations: 10,
  friction: 0.55,
  restitution: 0.12,
  linearDamping: 0.6,
  angularDamping: 0.9,
  maxSpeed: 4500,              // mm/s
  maxSpin: 28,                 // rad/s
  grabFrequency: 4.5,          // Hz del "muelle" que une el punto agarrado al cursor
  grabDamping: 0.75,
  grabMaxAccel: 90000,         // mm/s²: límite de fuerza para no atravesar otras piezas
  restSpeed: 40,               // mm/s  ┐ por debajo de esto el movimiento se considera vibración de reposo
  restSpin: 0.6,               // rad/s ┘
  restDamping: 0.88,           // fracción de velocidad que se conserva en cada paso en reposo
  restFrames: 30,              // pasos (1/120 s) en calma antes de dormir la pieza
  restWindow: 30,              // pasos de la ventana para detectar vibración sin desplazamiento (0,25 s)
  restDrift: 0.6               // mm y grados: si en esa ventana se mueve menos, la pieza se duerme
};

export const ZOOM_MAX = 2.6;
export const SPACE_RADIUS = 9000;   // distancia de los espacios de proyecto a la mat principal
