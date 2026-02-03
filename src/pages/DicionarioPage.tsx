import { CrudPanel } from '../components/crud/CrudPanel'
import type { FieldDef } from '../components/crud/types'
import { Button, Page } from '../components/ui'
import { useState } from 'react'

const palavraFields: FieldDef[] = [
  { key: 'palavra', label: 'Palavra', type: 'text' },
  { key: 'definicao', label: 'Definição (opcional)', type: 'textarea' },
]

const tentativaFields: FieldDef[] = [
  { key: 'usuario_id', label: 'ID do usuário', type: 'text' },
  { key: 'resposta', label: 'Resposta (significado)', type: 'textarea' },
]

const avaliacaoFields: FieldDef[] = [
  { key: 'usuario_id', label: 'ID do usuário (avaliador)', type: 'text' },
  { key: 'comentario', label: 'Comentário', type: 'textarea' },
]

export function DicionarioPage() {
  const [createOpen, setCreateOpen] = useState(false)
  return (
    <Page
      title="Dicionário"
      right={
        <Button onClick={() => setCreateOpen(true)}>
          Criar
        </Button>
      }
    >
      <CrudPanel
        title="Palavras"
        description="Abra uma palavra para registrar tentativas (respostas) e, depois, avaliações dessas tentativas."
        resourcePath="/dicionario"
        fields={palavraFields}
        columns={['id', 'palavra']}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        nested={(palavra) => {
          const palavraId =
            typeof palavra.id === 'string' ? palavra.id : typeof palavra.id === 'number' ? String(palavra.id) : null
          if (!palavraId) return null

          return (
            <div className="space-y-6">
              <div className="space-y-3">
                <CrudPanel
                  title="Tentativas"
                  resourcePath={`/dicionario/${palavraId}/tentativas`}
                  fields={tentativaFields}
                  columns={['id', 'usuario_id']}
                  showCreateButtonInList
                  nested={(tentativa) => {
                    const tentativaId =
                      typeof tentativa.id === 'string'
                        ? tentativa.id
                        : typeof tentativa.id === 'number'
                          ? String(tentativa.id)
                          : null
                    if (!tentativaId) return null

                    return (
                      <div className="space-y-3">
                        <CrudPanel
                          title="Avaliações"
                          resourcePath={`/dicionario-tentativas/${tentativaId}/avaliacoes`}
                          fields={avaliacaoFields}
                          columns={['id', 'usuario_id']}
                          showCreateButtonInList
                        />
                      </div>
                    )
                  }}
                />
              </div>
            </div>
          )
        }}
      />
    </Page>
  )
}

