import type { ProductDefinition } from '../types'
import type { TradeTemplate } from './types'

const DIMENSION_INPUTS = [
  { kind: 'number', key: 'ancho', label: 'Ancho', unit: 'mm', min: 50, max: 4000 },
  { kind: 'number', key: 'alto', label: 'Alto', unit: 'mm', min: 50, max: 3200 },
  { kind: 'number', key: 'piezas', label: 'Piezas', unit: 'pz', min: 1, max: 500, default: 1 },
] as const satisfies ProductDefinition['inputs']

const AREA = { id: 'area', type: 'area', label: 'Área', widthKey: 'ancho', heightKey: 'alto', inputUnit: 'mm', roundTo: 0.05, minPerPiece: 0.25 } as const
const PERIMETER = { id: 'perimetro', type: 'perimeter', label: 'Perímetro', widthKey: 'ancho', heightKey: 'alto', inputUnit: 'mm', roundTo: 0.05 } as const
const WASTE = { id: 'desperdicio', type: 'waste', label: 'Desperdicio', percent: 10, appliesTo: ['material'] } as const

const flatGlass: ProductDefinition = {
  version: 1,
  unit: 'sqm',
  quantityKey: 'piezas',
  inputs: [
    ...DIMENSION_INPUTS,
    { kind: 'select', key: 'tipo', label: 'Tipo', fromPriceList: { listId: 'vidrio', dimension: 'tipo' } },
    { kind: 'select', key: 'espesor', label: 'Espesor (mm)', fromPriceList: { listId: 'vidrio', dimension: 'espesor' } },
    { kind: 'boolean', key: 'pulido', label: 'Pulido de canto', default: false },
    { kind: 'boolean', key: 'instalacion', label: 'Incluye instalación', default: false },
  ],
  blocks: [
    AREA,
    PERIMETER,
    { id: 'vidrio', type: 'base_price', label: 'Vidrio', measure: 'area_m2', rate: { kind: 'price_list', listId: 'vidrio', keys: { tipo: 'tipo', espesor: 'espesor' } } },
    { id: 'pulido', type: 'surcharge', label: 'Pulido de canto', mode: 'per_measure', measure: 'perimeter_lm', rate: { kind: 'fixed', amount: 55 }, when: { inputKey: 'pulido', equals: true } },
    WASTE,
    { id: 'instalacion', type: 'labor', label: 'Instalación', mode: 'per_measure', measure: 'area_m2', amount: 180, when: { inputKey: 'instalacion', equals: true } },
    { id: 'minimo', type: 'minimum_charge', label: 'Cargo mínimo', amount: 350 },
  ],
}

const showerEnclosure: ProductDefinition = {
  version: 1,
  unit: 'sqm',
  quantityKey: 'piezas',
  inputs: [
    ...DIMENSION_INPUTS,
    { kind: 'select', key: 'espesor', label: 'Espesor templado (mm)', fromPriceList: { listId: 'templado', dimension: 'espesor' } },
    { kind: 'select', key: 'herraje', label: 'Kit de herrajes', fromPriceList: { listId: 'herrajes', dimension: 'kit' } },
    { kind: 'boolean', key: 'instalacion', label: 'Incluye instalación', default: true },
  ],
  blocks: [
    { ...AREA, minPerPiece: 0.5 },
    PERIMETER,
    { id: 'vidrio', type: 'base_price', label: 'Vidrio templado', measure: 'area_m2', rate: { kind: 'price_list', listId: 'templado', keys: { espesor: 'espesor' } } },
    { id: 'pulido', type: 'surcharge', label: 'Pulido de canto', mode: 'per_measure', measure: 'perimeter_lm', rate: { kind: 'fixed', amount: 55 } },
    { id: 'herrajes', type: 'accessory', label: 'Kit de herrajes', rate: { kind: 'price_list', listId: 'herrajes', keys: { kit: 'herraje' } }, quantity: { kind: 'per_piece', count: 1 } },
    WASTE,
    { id: 'instalacion', type: 'labor', label: 'Instalación', mode: 'per_piece', amount: 900, when: { inputKey: 'instalacion', equals: true } },
    { id: 'minimo', type: 'minimum_charge', label: 'Cargo mínimo', amount: 1500 },
  ],
}

const aluminumWindow: ProductDefinition = {
  version: 1,
  unit: 'sqm',
  quantityKey: 'piezas',
  inputs: [
    ...DIMENSION_INPUTS,
    { kind: 'select', key: 'linea', label: 'Línea', fromPriceList: { listId: 'ventana', dimension: 'linea' } },
    { kind: 'select', key: 'acabado', label: 'Acabado', fromPriceList: { listId: 'ventana', dimension: 'acabado' } },
    { kind: 'boolean', key: 'mosquitero', label: 'Mosquitero', default: false },
    { kind: 'boolean', key: 'instalacion', label: 'Incluye instalación', default: true },
  ],
  blocks: [
    { ...AREA, minPerPiece: 0.6 },
    { id: 'ventana', type: 'base_price', label: 'Ventana aluminio con vidrio 6 mm', measure: 'area_m2', rate: { kind: 'price_list', listId: 'ventana', keys: { linea: 'linea', acabado: 'acabado' } } },
    { id: 'mosquitero', type: 'accessory', label: 'Mosquitero', rate: { kind: 'fixed', amount: 420 }, quantity: { kind: 'per_piece', count: 1 }, when: { inputKey: 'mosquitero', equals: true } },
    { id: 'sellado', type: 'accessory', label: 'Sellador silicón', rate: { kind: 'fixed', amount: 95 }, quantity: { kind: 'per_piece', count: 1 } },
    { id: 'instalacion', type: 'labor', label: 'Instalación', mode: 'per_piece', amount: 650, when: { inputKey: 'instalacion', equals: true } },
    { id: 'minimo', type: 'minimum_charge', label: 'Cargo mínimo', amount: 1800 },
  ],
}

const mirror: ProductDefinition = {
  version: 1,
  unit: 'sqm',
  quantityKey: 'piezas',
  inputs: [
    ...DIMENSION_INPUTS,
    { kind: 'select', key: 'espesor', label: 'Espesor (mm)', fromPriceList: { listId: 'espejo', dimension: 'espesor' } },
    { kind: 'select', key: 'canto', label: 'Acabado de canto', options: [{ value: 'pulido', label: 'Pulido' }, { value: 'biselado', label: 'Biselado' }] },
    { kind: 'boolean', key: 'instalacion', label: 'Incluye instalación', default: true },
  ],
  blocks: [
    AREA,
    PERIMETER,
    { id: 'espejo', type: 'base_price', label: 'Espejo', measure: 'area_m2', rate: { kind: 'price_list', listId: 'espejo', keys: { espesor: 'espesor' } } },
    { id: 'canto', type: 'surcharge', label: 'Acabado de canto', mode: 'per_measure', measure: 'perimeter_lm', rate: { kind: 'price_list', listId: 'procesos', keys: { proceso: 'canto' } } },
    { id: 'fijacion', type: 'accessory', label: 'Juego de fijación (broches)', rate: { kind: 'fixed', amount: 120 }, quantity: { kind: 'per_piece', count: 1 }, when: { inputKey: 'instalacion', equals: true } },
    WASTE,
    { id: 'instalacion', type: 'labor', label: 'Instalación', mode: 'per_piece', amount: 450, when: { inputKey: 'instalacion', equals: true } },
    { id: 'minimo', type: 'minimum_charge', label: 'Cargo mínimo', amount: 600 },
  ],
}

export const GLASS_TEMPLATE: TradeTemplate = {
  key: 'glass',
  name: 'Vidrio, aluminio y cancelería',
  description: 'Vidrio por m², templado, espejos, canceles de baño y ventanas de aluminio con herrajes, pulidos y desperdicio.',
  version: 1,
  priceLists: [
    {
      id: 'vidrio',
      name: 'Vidrio flotado',
      unit: 'sqm',
      dimensions: ['tipo', 'espesor'],
      rows: [
        { keys: { tipo: 'claro', espesor: '3' }, price: 380 },
        { keys: { tipo: 'claro', espesor: '4' }, price: 450 },
        { keys: { tipo: 'claro', espesor: '6' }, price: 620 },
        { keys: { tipo: 'claro', espesor: '9' }, price: 1050 },
        { keys: { tipo: 'claro', espesor: '12' }, price: 1450 },
        { keys: { tipo: 'filtrasol', espesor: '4' }, price: 540 },
        { keys: { tipo: 'filtrasol', espesor: '6' }, price: 750 },
        { keys: { tipo: 'esmerilado', espesor: '4' }, price: 610 },
        { keys: { tipo: 'esmerilado', espesor: '6' }, price: 820 },
        { keys: { tipo: 'laminado', espesor: '6' }, price: 1250 },
      ],
    },
    {
      id: 'templado',
      name: 'Vidrio templado',
      unit: 'sqm',
      dimensions: ['espesor'],
      rows: [
        { keys: { espesor: '6' }, price: 1150 },
        { keys: { espesor: '9' }, price: 1650 },
        { keys: { espesor: '10' }, price: 1800 },
        { keys: { espesor: '12' }, price: 2200 },
      ],
    },
    {
      id: 'espejo',
      name: 'Espejo',
      unit: 'sqm',
      dimensions: ['espesor'],
      rows: [
        { keys: { espesor: '3' }, price: 520 },
        { keys: { espesor: '4' }, price: 620 },
        { keys: { espesor: '6' }, price: 880 },
      ],
    },
    {
      id: 'ventana',
      name: 'Ventana de aluminio',
      unit: 'sqm',
      dimensions: ['linea', 'acabado'],
      rows: [
        { keys: { linea: 'serie-2', acabado: 'natural' }, price: 1900 },
        { keys: { linea: 'serie-2', acabado: 'blanco' }, price: 2150 },
        { keys: { linea: 'serie-3', acabado: 'natural' }, price: 2600 },
        { keys: { linea: 'serie-3', acabado: 'blanco' }, price: 2900 },
        { keys: { linea: 'serie-3', acabado: 'negro' }, price: 2950 },
      ],
    },
    {
      id: 'herrajes',
      name: 'Kits de herrajes para cancel',
      unit: 'unit',
      dimensions: ['kit'],
      rows: [
        { keys: { kit: 'corredizo-aluminio' }, price: 1450 },
        { keys: { kit: 'corredizo-acero' }, price: 2800 },
        { keys: { kit: 'abatible-acero' }, price: 1900 },
      ],
    },
    {
      id: 'procesos',
      name: 'Procesos de canto (por ml)',
      unit: 'lm',
      dimensions: ['proceso'],
      rows: [
        { keys: { proceso: 'pulido' }, price: 55 },
        { keys: { proceso: 'biselado' }, price: 95 },
      ],
    },
  ],
  products: [
    { name: 'Vidrio a la medida', category: 'vidrio', description: 'Vidrio flotado cortado a medida, con pulido e instalación opcionales.', unitType: 'per_sqm', unitPrice: 380, definition: flatGlass },
    { name: 'Cancel de baño templado', category: 'canceleria', description: 'Cancel de vidrio templado con kit de herrajes, pulido e instalación.', unitType: 'per_sqm', unitPrice: 1150, definition: showerEnclosure },
    { name: 'Ventana de aluminio', category: 'aluminio', description: 'Ventana corrediza de aluminio con vidrio de 6 mm, sellado e instalación.', unitType: 'per_sqm', unitPrice: 1900, definition: aluminumWindow },
    { name: 'Espejo a la medida', category: 'vidrio', description: 'Espejo con canto pulido o biselado, fijación e instalación.', unitType: 'per_sqm', unitPrice: 520, definition: mirror },
    { name: 'Visita de medición', category: 'servicio', description: 'Visita a domicilio para tomar medidas. Se descuenta al aprobar la cotización.', unitType: 'fixed', unitPrice: 250, definition: null },
    { name: 'Reposición de vidrio roto', category: 'servicio', description: 'Retiro de vidrio dañado y colocación del nuevo. Vidrio aparte.', unitType: 'fixed', unitPrice: 450, definition: null },
  ],
}
