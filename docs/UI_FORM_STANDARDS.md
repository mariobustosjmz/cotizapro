# UI Form Standards — CotizaPro

> These 5 rules apply to ALL form components. Use `work-event-form.tsx` as the gold standard reference.

---

## Rule 1 — No Native `<select>`: Always Use Combobox

All dropdown/select fields must use the inline `Combobox` component (autocomplete with search).

**Never use:**
```tsx
<select name="field">
  <option value="a">Option A</option>
</select>
```

**Always use:**
```tsx
<Combobox
  id="field"
  name="field"
  options={[{ value: 'a', label: 'Option A' }]}
  defaultValue="a"
  placeholder="Buscar..."
  required
  disabled={loading}
  fieldError={fieldErrors.field}
/>
```

The Combobox renders a hidden `<input name>` for form submission + a visible text input for filtering + dropdown list on focus.

**Shared component:** `components/ui/combobox.tsx` — use when you need `onChange` for controlled state (e.g., when the selected value drives conditional rendering).

**Inline component:** copy the `Combobox` function from `work-event-form.tsx` when the form is self-contained and doesn't need an `onChange` callback.

---

## Rule 2 — Date/Datetime Fields Default to Today

- `type="date"` → default to today: `new Date().toISOString().split('T')[0]`
- `type="datetime-local"` → default to +1h start / +2h end (use `getDefaultTimes()` from `work-event-form.tsx`)

```tsx
// Date field
<Input
  type="date"
  name="reminder_date"
  defaultValue={new Date().toISOString().split('T')[0]}
/>

// Datetime range (from getDefaultTimes helper)
const { start: defaultStartTime, end: defaultEndTime } = getDefaultTimes(defaultDate, defaultHour)
```

`getDefaultTimes()` pads hours, handles both calendar-click defaults and fallback to now+1h/now+2h.

---

## Rule 3 — No "(opcional)" in Labels

Optional fields must NOT have any suffix in their label. The absence of `*` already signals optional.

```tsx
// WRONG
<Label htmlFor="notes">Notas (opcional)</Label>

// CORRECT
<Label htmlFor="notes">Notas</Label>
```

---

## Rule 4 — Required Fields Get `*` in Label

All required fields must have ` *` appended to the label text (space + asterisk, no HTML).

```tsx
// WRONG
<Label htmlFor="title">Título del evento</Label>

// CORRECT
<Label htmlFor="title">Título del evento *</Label>
```

No special styling needed — the `*` is plain text within the label.

---

## Rule 5 — Button Order: Cancel Left, Submit Right

Forms must always end with a flex row: Cancel (outline, left) → Submit (primary, right). Both `flex-1`.

```tsx
<div className="flex gap-3 pt-4">
  <Button
    type="button"
    variant="outline"
    disabled={loading}
    onClick={() => router.back()}
    className="flex-1"
  >
    Cancelar
  </Button>
  <Button type="submit" disabled={loading} className="flex-1">
    {loading ? 'Guardando...' : 'Crear X'}
  </Button>
</div>
```

Submit button label follows pattern: loading state uses gerund (`Creando...`, `Guardando...`), idle state uses imperative (`Crear X`, `Guardar cambios`).

---

## Field Error Display Pattern

All field errors use the `FieldError` component or inline pattern:

```tsx
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}
```

Fields with errors get `border-red-500 bg-red-50` classes. State is driven by `fieldErrors` from API response `data.fieldErrors`.

---

## Gold Standard Reference

**`apps/web/components/dashboard/work-event-form.tsx`** — contains all 5 rules implemented correctly. Copy patterns from here.

---

## Checklist for Any New Form

- [ ] No native `<select>` — all dropdowns use Combobox
- [ ] Date/datetime fields have today as default value
- [ ] No `(opcional)` in any label
- [ ] Required fields have ` *` in label text
- [ ] Button row: Cancel (outline, left) → Submit (primary, right), both `flex-1`
- [ ] Field errors displayed with `FieldError` component
- [ ] Error input styling: `border-red-500 bg-red-50`
