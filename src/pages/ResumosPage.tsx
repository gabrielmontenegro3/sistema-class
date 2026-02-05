import { CrudPanel } from '../components/crud/CrudPanel'
import type { FieldDef } from '../components/crud/types'
import { CreateButton, Page } from '../components/ui'
import { useAuth } from '../app/auth'
import { useState } from 'react'

const MATERIAS_7_ANO = [
  'Língua Portuguesa',
  'Matemática',
  'Ciências',
  'História',
  'Geografia',
  'Língua Inglesa',
  'Arte',
  'Educação Física',
  'Ensino Religioso',
]

const fields: FieldDef[] = [
  {
    key: 'materia',
    label: 'Matéria',
    type: 'select',
    options: MATERIAS_7_ANO.map((m) => ({ value: m, label: m })),
    placeholder: 'Selecione a matéria',
  },
  { key: 'topico', label: 'Tópico', type: 'text' },
  { key: 'conteudo', label: 'Conteúdo', type: 'textarea' },
]

export function ResumosPage() {
  const { user } = useAuth()
  const isDavi = (user?.nome ?? '').trim().toLowerCase() === 'davi'
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <Page
      title="Resumos"
      right={
        <CreateButton onClick={() => setCreateOpen(true)} disabled={isDavi} label="Criar resumo" />
      }
    >
      <CrudPanel
        title="Resumos"
        resourcePath="/resumos"
        fields={fields}
        columns={['materia', 'topico']}
        enableView
        renderView={(it) => (
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">{String(it.materia ?? '')}</div>
            <div className="text-lg font-semibold text-zinc-100">{String(it.topico ?? '')}</div>
            <div className="whitespace-pre-wrap text-sm text-zinc-200">{String(it.conteudo ?? '')}</div>
          </div>
        )}
        canEdit={!isDavi}
        canDelete={!isDavi}
        canCreate={!isDavi}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />
    </Page>
  )
}

