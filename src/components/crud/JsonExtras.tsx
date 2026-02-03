import { useMemo, useState } from 'react'
import { Textarea } from '../ui'

export function JsonExtras(props: {
  label?: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  const [touched, setTouched] = useState(false)

  const parseError = useMemo(() => {
    if (!touched) return null
    const raw = props.value.trim()
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return 'JSON deve ser um objeto { ... }'
      return null
    } catch {
      return 'JSON inválido'
    }
  }, [props.value, touched])

  return (
    <div className="space-y-2">
      <Textarea
        label={props.label ?? 'Extras (JSON opcional)'}
        value={props.value}
        onChange={props.onChange}
        placeholder='Ex.: { "usuario_id": "uuid", "materia": "Matemática" }'
        rows={4}
      />
      <div className="text-xs text-zinc-400">
        {props.hint ?? 'Use para enviar campos que não estão no formulário (FKs, campos extras, etc.).'}
      </div>
      {parseError ? (
        <div className="text-xs text-red-200">Erro: {parseError}</div>
      ) : null}
      <button
        type="button"
        className="text-xs text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white"
        onClick={() => setTouched(true)}
      >
        Validar JSON
      </button>
    </div>
  )
}

