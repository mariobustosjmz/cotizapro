export const WORK_EVENT_TYPE_LABELS: Record<string, string> = {
  instalacion: 'Instalación',
  medicion: 'Medición',
  visita_tecnica: 'Visita Técnica',
  mantenimiento: 'Mantenimiento',
  otro: 'Otro',
}

export const WORK_EVENT_STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_camino: 'En Camino',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

export const WORK_EVENT_TYPE_OPTIONS = [
  { value: 'instalacion', label: 'Instalación' },
  { value: 'medicion', label: 'Medición' },
  { value: 'visita_tecnica', label: 'Visita Técnica' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otro', label: 'Otro' },
]
