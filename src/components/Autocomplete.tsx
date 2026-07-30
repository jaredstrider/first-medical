import { useId } from 'react'

interface Props {
  label?: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  required?: boolean
}

/**
 * Free text with suggestions from what has already been captured elsewhere in
 * the system. Typing a new value is always allowed; it gets remembered on save.
 */
export default function Autocomplete({ label, value, onChange, options, placeholder, required }: Props) {
  const id = useId()
  return (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        list={`${id}-options`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      <datalist id={`${id}-options`}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  )
}
