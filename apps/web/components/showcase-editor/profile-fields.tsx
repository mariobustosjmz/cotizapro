'use client'

type FieldErrors = Readonly<Record<string, string>>

const inputClass = (error?: string) =>
  `w-full px-3 py-2 rounded-lg border text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    error ? 'border-red-500 bg-red-50 dark:bg-red-950/40' : 'border-gray-300 dark:border-gray-700'
  }`

interface TextFieldProps {
  readonly name: string
  readonly label: string
  readonly defaultValue: string | null
  readonly errors: FieldErrors
  readonly required?: boolean
  readonly multiline?: boolean
  readonly placeholder?: string
  readonly type?: 'text' | 'tel' | 'email'
  readonly maxLength: number
}

export function TextField({ name, label, defaultValue, errors, required, multiline, placeholder, type = 'text', maxLength }: TextFieldProps) {
  const id = `vitrina-${name}`
  const common = { id, name, defaultValue: defaultValue ?? '', placeholder, maxLength, className: inputClass(errors[name]) }
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required ? ' *' : ''}
      </label>
      {multiline ? <textarea rows={4} {...common} /> : <input type={type} required={required} {...common} />}
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
    </div>
  )
}

interface ToggleProps {
  readonly name: string
  readonly label: string
  readonly hint: string
  readonly defaultChecked: boolean
}

export function Toggle({ name, label, hint, defaultChecked }: ToggleProps) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 accent-orange-500" data-testid={`vitrina-${name}`} />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>
      </span>
    </label>
  )
}
