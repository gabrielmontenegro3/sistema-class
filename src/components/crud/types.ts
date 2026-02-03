export type FieldType = 'text' | 'textarea' | 'boolean' | 'date' | 'number' | 'select'

export type SelectOption = {
  value: string
  label: string
}

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: SelectOption[]
}

