import type { TradeTemplate } from './types'

export const PLUMBING_TEMPLATE: TradeTemplate = {
  key: 'plumbing',
  name: 'Plomería',
  description: 'Destapes, instalaciones de muebles de baño, calentadores y tubería por metro.',
  version: 1,
  priceLists: [
    {
      id: 'tuberia',
      name: 'Tubería por metro',
      unit: 'lm',
      dimensions: ['material'],
      rows: [
        { keys: { material: 'ppr-1/2' }, price: 95 },
        { keys: { material: 'ppr-3/4' }, price: 130 },
        { keys: { material: 'cobre-1/2' }, price: 210 },
        { keys: { material: 'pvc-sanitario-4' }, price: 160 },
      ],
    },
  ],
  products: [
    { name: 'Destape de drenaje', category: 'plomeria', description: 'Destape con guía o máquina. Incluye prueba de flujo.', unitType: 'fixed', unitPrice: 650, definition: null },
    { name: 'Instalación de WC', category: 'plomeria', description: 'Instalación de taza con cuello de cera y conexiones. Mueble aparte.', unitType: 'fixed', unitPrice: 850, definition: null },
    { name: 'Reparación de fuga', category: 'plomeria', description: 'Diagnóstico y reparación por hora.', unitType: 'per_hour', unitPrice: 350, definition: null },
    {
      name: 'Instalación de calentador',
      category: 'plomeria',
      description: 'Instalación de calentador de paso o depósito con kit de conexiones opcional.',
      unitType: 'fixed',
      unitPrice: 1200,
      definition: {
        version: 1,
        unit: 'fixed',
        quantityKey: 'piezas',
        inputs: [
          { kind: 'number', key: 'piezas', label: 'Equipos', unit: 'pz', min: 1, max: 10, default: 1 },
          { kind: 'boolean', key: 'kit', label: 'Incluye kit de conexiones', default: true },
        ],
        blocks: [
          { id: 'kit', type: 'accessory', label: 'Kit de conexiones y válvulas', rate: { kind: 'fixed', amount: 450 }, quantity: { kind: 'per_piece', count: 1 }, when: { inputKey: 'kit', equals: true } },
          { id: 'mo', type: 'labor', label: 'Instalación', mode: 'per_piece', amount: 1200 },
        ],
      },
    },
    {
      name: 'Tubería instalada',
      category: 'plomeria',
      description: 'Tubería por metro lineal con conexiones y mano de obra.',
      unitType: 'per_lm',
      unitPrice: 95,
      definition: {
        version: 1,
        unit: 'lm',
        inputs: [
          { kind: 'number', key: 'metros', label: 'Metros lineales', unit: 'm', min: 0.5, max: 500 },
          { kind: 'select', key: 'material', label: 'Material', fromPriceList: { listId: 'tuberia', dimension: 'material' } },
        ],
        blocks: [
          { id: 'm', type: 'measure', label: 'Tubería', inputKey: 'metros', as: 'tuberia_lm' },
          { id: 'tubo', type: 'base_price', label: 'Tubería', measure: 'tuberia_lm', rate: { kind: 'price_list', listId: 'tuberia', keys: { material: 'material' } } },
          { id: 'conexiones', type: 'accessory', label: 'Conexiones (codo/tee)', rate: { kind: 'fixed', amount: 28 }, quantity: { kind: 'per_measure', measure: 'tuberia_lm', every: 1.5, count: 1 } },
          { id: 'desp', type: 'waste', label: 'Desperdicio', percent: 5, appliesTo: ['material'] },
          { id: 'mo', type: 'labor', label: 'Mano de obra', mode: 'per_measure', measure: 'tuberia_lm', amount: 120 },
          { id: 'min', type: 'minimum_charge', label: 'Cargo mínimo', amount: 500 },
        ],
      },
    },
  ],
}

export const ELECTRICAL_TEMPLATE: TradeTemplate = {
  key: 'electrical',
  name: 'Electricidad',
  description: 'Salidas, cableado por metro, centros de carga y luminarias.',
  version: 1,
  priceLists: [
    {
      id: 'cable',
      name: 'Cable por metro',
      unit: 'lm',
      dimensions: ['calibre'],
      rows: [
        { keys: { calibre: '14' }, price: 14 },
        { keys: { calibre: '12' }, price: 19 },
        { keys: { calibre: '10' }, price: 28 },
        { keys: { calibre: '8' }, price: 45 },
      ],
    },
  ],
  products: [
    { name: 'Salida eléctrica (contacto o apagador)', category: 'electricidad', description: 'Salida nueva con caja, chalupa y placa estándar.', unitType: 'per_unit', unitPrice: 380, definition: null },
    { name: 'Instalación de luminaria', category: 'electricidad', description: 'Colocación y conexión de lámpara o ventilador de techo.', unitType: 'per_unit', unitPrice: 320, definition: null },
    {
      name: 'Cableado por metro',
      category: 'electricidad',
      description: 'Cableado en tubería existente o nueva, dos conductores por metro.',
      unitType: 'per_lm',
      unitPrice: 65,
      definition: {
        version: 1,
        unit: 'lm',
        inputs: [
          { kind: 'number', key: 'metros', label: 'Metros de recorrido', unit: 'm', min: 1, max: 1000 },
          { kind: 'select', key: 'calibre', label: 'Calibre AWG', fromPriceList: { listId: 'cable', dimension: 'calibre' } },
          { kind: 'boolean', key: 'tuberia', label: 'Incluye tubería conduit', default: false },
        ],
        blocks: [
          { id: 'm', type: 'measure', label: 'Recorrido', inputKey: 'metros', as: 'recorrido_lm' },
          { id: 'cable', type: 'base_price', label: 'Cable (2 conductores)', measure: 'recorrido_lm', rate: { kind: 'price_list', listId: 'cable', keys: { calibre: 'calibre' } } },
          { id: 'cable2', type: 'base_price', label: 'Cable tierra/neutro', measure: 'recorrido_lm', rate: { kind: 'price_list', listId: 'cable', keys: { calibre: 'calibre' } } },
          { id: 'tubo', type: 'surcharge', label: 'Tubería conduit', mode: 'per_measure', measure: 'recorrido_lm', rate: { kind: 'fixed', amount: 32 }, when: { inputKey: 'tuberia', equals: true } },
          { id: 'mo', type: 'labor', label: 'Mano de obra', mode: 'per_measure', measure: 'recorrido_lm', amount: 35 },
          { id: 'min', type: 'minimum_charge', label: 'Cargo mínimo', amount: 450 },
        ],
      },
    },
    {
      name: 'Centro de carga',
      category: 'electricidad',
      description: 'Instalación de centro de carga con pastillas termomagnéticas.',
      unitType: 'fixed',
      unitPrice: 2500,
      definition: {
        version: 1,
        unit: 'fixed',
        inputs: [{ kind: 'number', key: 'circuitos', label: 'Circuitos', unit: 'pz', min: 2, max: 40, default: 4 }],
        blocks: [
          { id: 'm', type: 'measure', label: 'Circuitos', inputKey: 'circuitos', as: 'circuitos' },
          { id: 'tablero', type: 'accessory', label: 'Centro de carga', rate: { kind: 'fixed', amount: 1100 }, quantity: { kind: 'fixed', count: 1 } },
          { id: 'pastillas', type: 'accessory', label: 'Pastilla termomagnética', rate: { kind: 'fixed', amount: 165 }, quantity: { kind: 'per_measure', measure: 'circuitos', every: 1, count: 1 } },
          { id: 'mo', type: 'labor', label: 'Instalación', mode: 'fixed', amount: 1400 },
        ],
      },
    },
  ],
}

export const HVAC_TEMPLATE: TradeTemplate = {
  key: 'hvac',
  name: 'Aire acondicionado y refrigeración',
  description: 'Instalación de minisplits por capacidad, tubería extra y mantenimientos.',
  version: 1,
  priceLists: [
    {
      id: 'instalacion',
      name: 'Instalación de minisplit',
      unit: 'unit',
      dimensions: ['capacidad'],
      rows: [
        { keys: { capacidad: '1' }, price: 3200 },
        { keys: { capacidad: '1.5' }, price: 3500 },
        { keys: { capacidad: '2' }, price: 3900 },
      ],
    },
  ],
  products: [
    { name: 'Mantenimiento preventivo', category: 'hvac', description: 'Limpieza de serpentines, filtros, revisión de gas y eléctrica.', unitType: 'per_unit', unitPrice: 750, definition: null },
    { name: 'Carga de gas refrigerante', category: 'hvac', description: 'Recarga de gas R410A con prueba de fugas.', unitType: 'fixed', unitPrice: 1400, definition: null },
    {
      name: 'Instalación de minisplit',
      category: 'hvac',
      description: 'Instalación estándar hasta 3 m de tubería; metros extra con cargo.',
      unitType: 'per_unit',
      unitPrice: 3200,
      definition: {
        version: 1,
        unit: 'unit',
        quantityKey: 'equipos',
        inputs: [
          { kind: 'number', key: 'equipos', label: 'Equipos', unit: 'pz', min: 1, max: 20, default: 1 },
          { kind: 'select', key: 'capacidad', label: 'Capacidad (toneladas)', fromPriceList: { listId: 'instalacion', dimension: 'capacidad' } },
          { kind: 'number', key: 'extra', label: 'Metros extra de tubería', unit: 'm', min: 0, max: 30, default: 0 },
        ],
        blocks: [
          { id: 'm', type: 'measure', label: 'Tubería extra', inputKey: 'extra', as: 'extra_lm', perPiece: true },
          { id: 'inst', type: 'base_price', label: 'Instalación', measure: 'pieces', rate: { kind: 'price_list', listId: 'instalacion', keys: { capacidad: 'capacidad' } } },
          { id: 'tubo', type: 'surcharge', label: 'Tubería extra', mode: 'per_measure', measure: 'extra_lm', rate: { kind: 'fixed', amount: 280 } },
          { id: 'base', type: 'accessory', label: 'Base para condensadora', rate: { kind: 'fixed', amount: 450 }, quantity: { kind: 'per_piece', count: 1 } },
        ],
      },
    },
  ],
}

export const SEWING_TEMPLATE: TradeTemplate = {
  key: 'sewing',
  name: 'Costura y confección',
  description: 'Arreglos por pieza, confección de cortinas por m² y uniformes.',
  version: 1,
  priceLists: [
    {
      id: 'tela',
      name: 'Tela para cortina',
      unit: 'sqm',
      dimensions: ['tela'],
      rows: [
        { keys: { tela: 'blackout' }, price: 210 },
        { keys: { tela: 'lino' }, price: 260 },
        { keys: { tela: 'gasa' }, price: 140 },
      ],
    },
  ],
  products: [
    { name: 'Dobladillo de pantalón', category: 'arreglos', description: 'Dobladillo a mano o máquina.', unitType: 'per_unit', unitPrice: 90, definition: null },
    { name: 'Ajuste de cintura', category: 'arreglos', description: 'Entallar o soltar cintura.', unitType: 'per_unit', unitPrice: 150, definition: null },
    { name: 'Uniforme bordado', category: 'confeccion', description: 'Confección de uniforme con logo bordado.', unitType: 'per_unit', unitPrice: 420, definition: null },
    {
      name: 'Cortina a la medida',
      category: 'confeccion',
      description: 'Cortina confeccionada con tela a elegir, ancho con 1.5× de vuelo.',
      unitType: 'per_sqm',
      unitPrice: 320,
      definition: {
        version: 1,
        unit: 'sqm',
        quantityKey: 'piezas',
        inputs: [
          { kind: 'number', key: 'ancho', label: 'Ancho de ventana', unit: 'cm', min: 30, max: 800 },
          { kind: 'number', key: 'alto', label: 'Caída', unit: 'cm', min: 30, max: 400 },
          { kind: 'number', key: 'piezas', label: 'Cortinas', unit: 'pz', min: 1, max: 50, default: 1 },
          { kind: 'select', key: 'tela', label: 'Tela', fromPriceList: { listId: 'tela', dimension: 'tela' } },
        ],
        blocks: [
          { id: 'area', type: 'area', label: 'Área', widthKey: 'ancho', heightKey: 'alto', inputUnit: 'cm', roundTo: 0.1 },
          { id: 'tela', type: 'base_price', label: 'Tela', measure: 'area_m2', rate: { kind: 'price_list', listId: 'tela', keys: { tela: 'tela' } } },
          { id: 'vuelo', type: 'surcharge', label: 'Vuelo (tela adicional)', mode: 'percent', percent: 50 },
          { id: 'riel', type: 'accessory', label: 'Ganchos y riel', rate: { kind: 'fixed', amount: 180 }, quantity: { kind: 'per_piece', count: 1 } },
          { id: 'mo', type: 'labor', label: 'Confección', mode: 'per_measure', measure: 'area_m2', amount: 180 },
          { id: 'min', type: 'minimum_charge', label: 'Cargo mínimo', amount: 400 },
        ],
      },
    },
  ],
}

export const GENERAL_TEMPLATE: TradeTemplate = {
  key: 'general',
  name: 'Servicios generales',
  description: 'Servicio por hora, visita técnica y trabajos a precio fijo.',
  version: 1,
  priceLists: [],
  products: [
    { name: 'Visita técnica', category: 'servicio', description: 'Diagnóstico en sitio.', unitType: 'fixed', unitPrice: 300, definition: null },
    { name: 'Servicio por hora', category: 'servicio', description: 'Mano de obra por hora.', unitType: 'per_hour', unitPrice: 300, definition: null },
  ],
}
