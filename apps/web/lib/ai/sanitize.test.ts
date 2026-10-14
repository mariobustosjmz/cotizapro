import { describe, expect, it } from 'vitest'
import { createStreamSanitizer, sanitizeText, stripPreamble, truncateAt } from './sanitize'

describe('sanitizeText', () => {
  it('quita el relleno medido con gemma3:4b y el markdown', () => {
    const raw = '¡Claro! Aquí tienes una descripción mejorada:\n\n**Cancel de baño** en vidrio templado.'
    expect(sanitizeText(raw, 300)).toBe('Cancel de baño en vidrio templado.')
  })

  it('quita comillas envolventes y títulos', () => {
    expect(sanitizeText('"Hola Laura, ¿pudiste revisar la cotización?"', 600)).toBe('Hola Laura, ¿pudiste revisar la cotización?')
    expect(sanitizeText('## Términos\nAnticipo del 50 %', 600)).toBe('Términos\nAnticipo del 50 %')
  })

  it('regresa vacío si todo era preámbulo', () => {
    expect(sanitizeText('Claro, con gusto. Aquí tienes:', 300)).toBe('')
  })

  it('no confunde palabras que empiezan igual con un preámbulo', () => {
    expect(stripPreamble('Clara instalación del cancel')).toBe('Clara instalación del cancel')
    expect(stripPreamble('Claro que sí lo instalamos el sábado')).toBe('Claro que sí lo instalamos el sábado')
  })

  it('recorta en una palabra completa', () => {
    const headline = truncateAt('Cancelería y vidrio templado a la medida en Monterrey y su área metropolitana con instalación incluida', 90)
    expect(headline.length).toBeLessThanOrEqual(90)
    expect(headline.endsWith(' ')).toBe(false)
    expect(headline).toBe('Cancelería y vidrio templado a la medida en Monterrey y su área metropolitana con')
  })

  it('prefiere cortar al final de una oración', () => {
    expect(truncateAt('Primera oración completa. Segunda oración que no cabe', 40)).toBe('Primera oración completa.')
  })
})

describe('createStreamSanitizer', () => {
  it('no deja pasar el preámbulo aunque llegue en pedazos', () => {
    const stream = createStreamSanitizer(300)
    const out = ['¡Cla', 'ro! Aquí tienes:', '\n', 'Cancel de ', 'baño'].map((d) => stream.push(d)).join('') + stream.end()
    expect(out).toBe('Cancel de baño')
  })

  it('suelta el texto aunque no haya salto de línea al terminar', () => {
    const stream = createStreamSanitizer(300)
    expect(stream.push('Cancel de baño templado')).toBe('')
    expect(stream.end()).toBe('Cancel de baño templado')
  })

  it('no pasa del largo máximo', () => {
    const stream = createStreamSanitizer(10)
    const out = ['Texto largo\n', 'que sigue y sigue'].map((d) => stream.push(d)).join('') + stream.end()
    expect(out.length).toBeLessThanOrEqual(10)
  })
})

describe('revisión ronda 1', () => {
  it('no termina en una mitad de emoji', () => {
    const out = truncateAt('😀'.repeat(50), 11)
    expect(out).toBe('😀'.repeat(5))
    expect(truncateAt('a😀', 2)).toBe('a')
    const stream = createStreamSanitizer(2)
    const text = stream.push('a😀😀\n') + stream.end()
    expect(text).toBe('a')
  })

  it('no borra contenido real como si fuera preámbulo', () => {
    expect(sanitizeText('Listo, instalamos el sábado. Anticipo 50 %.', 300)).toBe('Listo, instalamos el sábado. Anticipo 50 %.')
    expect(sanitizeText('A continuación se detalla el servicio incluido. Garantía 1 año.', 300)).toBe(
      'A continuación se detalla el servicio incluido. Garantía 1 año.',
    )
    expect(sanitizeText('Claro, aquí tienes la descripción:\nInstalación incluida.', 300)).toBe('Instalación incluida.')
    expect(sanitizeText('Claro. Instalación incluida.', 300)).toBe('Instalación incluida.')
    expect(sanitizeText('¡Por supuesto! Instalación incluida.', 300)).toBe('Instalación incluida.')
  })

  it('quita caracteres de control e invisibles y normaliza saltos', () => {
    expect(sanitizeText('a\u0000b\u202Ec\u200Bd\u001Be\uFEFFf\u007Fg', 300)).toBe('abcdefg')
    expect(sanitizeText('uno\tdos\r\n\r\n\r\n\r\ntres\rcuatro', 300)).toBe('uno\tdos\n\ntres\ncuatro')
  })

  it('respeta ** y __ que no envuelven texto', () => {
    expect(sanitizeText('Calcula 2**3 y x__init__y', 300)).toBe('Calcula 2**3 y x__init__y')
    expect(sanitizeText('Es **negrita** y __negrita__ ok', 300)).toBe('Es negrita y negrita ok')
  })

  it('solo quita comillas dobles envolventes', () => {
    const text = "'Hola' dijo Laura y 'adiós'"
    expect(sanitizeText(text, 300)).toBe(text)
  })

  it('entrada que no es texto regresa vacío', () => {
    expect(sanitizeText(null as unknown as string, 10)).toBe('')
    expect(sanitizeText(undefined as unknown as string, 10)).toBe('')
    expect(sanitizeText({} as unknown as string, 10)).toBe('')
  })
})

describe('revisión ronda 2', () => {
  it('varios spans de énfasis', () => {
    expect(sanitizeText('**a** y **b** y **c**', 300)).toBe('a y b y c')
    expect(sanitizeText('**a** **b**', 300)).toBe('a b')
    expect(sanitizeText('__a__ __b__', 300)).toBe('a b')
    expect(sanitizeText('**Total:** 5 y **IVA:** 16', 300)).toBe('Total: 5 y IVA: 16')
  })

  it('el preámbulo no borra frases con contenido', () => {
    expect(sanitizeText('Listo, instalamos el sábado. Anticipo 50 %.\n', 300)).toBe('Listo, instalamos el sábado. Anticipo 50 %.')
    expect(sanitizeText('Listo, instalamos el sábado.\nAnticipo 50 %.', 300)).toBe('Listo, instalamos el sábado.\nAnticipo 50 %.')
    expect(sanitizeText('Claro, el anticipo es del 50 %: lo demás al terminar', 300)).toBe(
      'Claro, el anticipo es del 50 %: lo demás al terminar',
    )
  })

  it('el stream conserva una primera oración con contenido', () => {
    const stream = createStreamSanitizer(300)
    const out = stream.push('Listo, instalamos el sábado.') + stream.push(' Anticipo 50 %.\n') + stream.end()
    expect(out).toBe('Listo, instalamos el sábado. Anticipo 50 %.\n')
  })
})
