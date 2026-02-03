import { CrudPanel } from '../components/crud/CrudPanel'
import type { FieldDef } from '../components/crud/types'
import { Button, Page } from '../components/ui'
import { useState } from 'react'

const fields: FieldDef[] = [{ key: 'nome', label: 'Nome', type: 'text', placeholder: 'Ex.: Ana' }]

export function UsuariosPage() {
  const [createOpen, setCreateOpen] = useState(false)
  return (
    <Page
      title="Usuários"
      right={
        <Button onClick={() => setCreateOpen(true)}>
          Criar
        </Button>
      }
    >
      <CrudPanel
        title="Usuários"
        resourcePath="/usuarios"
        fields={fields}
        columns={['id', 'nome']}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />
    </Page>
  )
}

