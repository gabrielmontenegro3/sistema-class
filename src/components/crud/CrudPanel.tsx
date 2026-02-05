import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiOkData, ApiError } from '../../lib/api'
import { useAuth } from '../../app/auth'
import { Button, Checkbox, ConfirmDelete, CreateButton, InlineError, Input, Modal, Select, Textarea } from '../ui'
import { parseJsonObject } from './parseJsonObject'
import type { FieldDef } from './types'

type AnyItem = Record<string, unknown>

function getId(item: AnyItem): string | null {
  const id = item.id
  if (typeof id === 'string') return id
  if (typeof id === 'number') return String(id)
  return null
}

function asString(x: unknown): string {
  if (x === null || x === undefined) return ''
  if (typeof x === 'string') return x
  if (typeof x === 'number' || typeof x === 'boolean') return String(x)
  return JSON.stringify(x)
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function ownerIdentity(item: AnyItem): { ownerId: string; ownerName: string } {
  const ownerId = asString(
    item.usuario_id ?? item.autor_id ?? item.criador_id ?? item.owner_id ?? item.user_id ?? item.created_by,
  ).trim()
  const ownerName = norm(asString(item.autor ?? item.autor_nome ?? item.usuario_nome ?? item.criador_nome ?? item.owner_nome))
  return { ownerId, ownerName }
}

function coerceFieldValue(field: FieldDef, raw: unknown): string | boolean {
  if (field.type === 'boolean') return Boolean(raw)
  return asString(raw)
}

function renderFieldInput(field: FieldDef, value: string | boolean, onChange: (v: string | boolean) => void) {
  if (field.type === 'boolean') {
    return <Checkbox label={field.label} checked={Boolean(value)} onChange={(v) => onChange(v)} />
  }

  if (field.type === 'select') {
    return (
      <Select
        label={field.label}
        value={String(value)}
        onChange={(v) => onChange(v)}
        options={field.options ?? []}
        placeholder={field.placeholder ?? 'Selecione...'}
      />
    )
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        label={field.label}
        value={String(value)}
        onChange={(v) => onChange(v)}
        placeholder={field.placeholder}
        rows={5}
      />
    )
  }

  const type = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
  return <Input label={field.label} value={String(value)} onChange={(v) => onChange(v)} placeholder={field.placeholder} type={type} />
}

function buildBody(fields: FieldDef[], values: Record<string, string | boolean>, extrasJson: string) {
  const extras = parseJsonObject(extrasJson)
  if (!extras.ok) return { ok: false as const, error: extras.error }

  const body: Record<string, unknown> = { ...extras.value }
  for (const f of fields) {
    const v = values[f.key]
    if (v === undefined) continue
    if (f.type === 'number') {
      const s = String(v).trim()
      if (!s) continue
      const n = Number(s)
      if (Number.isNaN(n)) return { ok: false as const, error: `Campo "${f.label}" deve ser número` }
      body[f.key] = n
      continue
    }
    if (f.type === 'boolean') {
      body[f.key] = Boolean(v)
      continue
    }

    const s = String(v).trim()
    if (!s) continue
    body[f.key] = s
  }

  return { ok: true as const, value: body }
}

export function CrudPanel(props: {
  title: string
  resourcePath: string
  description?: string
  fields: FieldDef[]
  columns: string[]
  hiddenFields?: string[]
  createBodyDefaults?: Record<string, unknown>
  editBodyDefaults?: Record<string, unknown>
  sortItems?: (a: AnyItem, b: AnyItem) => number
  nested?: (item: AnyItem) => ReactNode
  canCreate?: boolean
  createDisabledReason?: string
  createOpen?: boolean
  onCreateOpenChange?: (open: boolean) => void
  showCreateButtonInList?: boolean
  canEdit?: boolean
  canDelete?: boolean
  enableView?: boolean
  renderView?: (item: AnyItem) => ReactNode
}) {
  const { user } = useAuth()
  const [items, setItems] = useState<AnyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const canCreate = props.canCreate !== false
  const [showCreate, setShowCreate] = useState(false)
  const createOpen = props.createOpen ?? showCreate
  const setCreateOpen = props.onCreateOpenChange ?? setShowCreate

  const [createValues, setCreateValues] = useState<Record<string, string | boolean>>({})
  const [createExtras, setCreateExtras] = useState('')
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [editItem, setEditItem] = useState<AnyItem | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string | boolean>>({})
  const [editExtras, setEditExtras] = useState('')
  const [editErr, setEditErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    setLoading(true)
    try {
      const data = await apiOkData<AnyItem[]>(props.resourcePath)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Falha ao carregar'
      setErr(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [props.resourcePath])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    const arr = [...items]
    if (props.sortItems) arr.sort(props.sortItems)
    return arr.map((it) => ({ it, id: getId(it) ?? `noid-${Math.random().toString(16).slice(2)}` }))
  }, [items, props.sortItems])

  function closeCreate() {
    setCreateOpen(false)
    setCreateValues({})
    setCreateExtras('')
    setCreateErr(null)
  }

  async function onCreate() {
    setCreateErr(null)
    const body = buildBody(props.fields, createValues, createExtras)
    if (!body.ok) {
      setCreateErr(body.error)
      return
    }
    if (!canCreate) return
    setCreating(true)
    try {
      const merged = { ...body.value, ...(props.createBodyDefaults ?? {}) }
      await apiOkData(props.resourcePath, { method: 'POST', body: JSON.stringify(merged) })
      closeCreate()
      await load()
    } catch (e) {
      setCreateErr(e instanceof ApiError ? e.message : 'Falha ao criar')
    } finally {
      setCreating(false)
    }
  }

  const canEdit = props.canEdit !== false
  const canDelete = props.canDelete !== false
  const enableView = props.enableView === true

  function openEdit(item: AnyItem) {
    const id = getId(item)
    if (!id) return
    setEditItem(item)
    setViewId(null)
    const initial: Record<string, string | boolean> = {}
    for (const f of props.fields) initial[f.key] = coerceFieldValue(f, item[f.key])
    setEditValues(initial)
    setEditExtras('')
    setEditErr(null)
  }

  function closeEdit() {
    setEditItem(null)
    setEditValues({})
    setEditExtras('')
    setEditErr(null)
  }

  // Visualização agora abre clicando no card inteiro (sem botão "Ver")

  async function onSave(item: AnyItem) {
    const id = getId(item)
    if (!id) return

    setEditErr(null)
    const body = buildBody(props.fields, editValues, editExtras)
    if (!body.ok) {
      setEditErr(body.error)
      return
    }

    setSaving(true)
    try {
      const merged = { ...body.value, ...(props.editBodyDefaults ?? {}) }
      await apiOkData(`${props.resourcePath}/${id}`, { method: 'PATCH', body: JSON.stringify(merged) })
      closeEdit()
      await load()
    } catch (e) {
      setEditErr(e instanceof ApiError ? e.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(item: AnyItem) {
    const id = getId(item)
    if (!id) return
    setDeletingId(id)
    try {
      await apiOkData(`${props.resourcePath}/${id}`, { method: 'DELETE' })
      if (viewId === id) setViewId(null)
      await load()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Falha ao deletar')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Modal
        open={Boolean(createOpen && canCreate)}
        title={`Criar ${props.title.toLowerCase()}`}
        onClose={() => {
          if (creating) return
          closeCreate()
        }}
      >
        {props.description ? <p className="mb-4 text-sm text-zinc-300">{props.description}</p> : null}

        <div className="space-y-4">
          <div className="space-y-3">
            {props.fields
              .filter((f) => !(props.hiddenFields ?? []).includes(f.key))
              .map((f) => (
              <div key={f.key}>
                {renderFieldInput(f, createValues[f.key] ?? (f.type === 'boolean' ? false : ''), (v) =>
                  setCreateValues((cur) => ({ ...cur, [f.key]: v })),
                )}
              </div>
            ))}
          </div>
        </div>

        {createErr ? (
          <div className="mt-4">
            <InlineError message={createErr} />
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-2">
          <Button onClick={onCreate} disabled={creating || !canCreate}>
            {creating ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="secondary" onClick={closeCreate} disabled={creating}>
            Cancelar
          </Button>
        </div>
      </Modal>

      {err ? <InlineError message={err} /> : null}

      <Modal
        open={Boolean(enableView && viewId)}
        title="Visualizar"
        variant="view"
        onClose={() => {
          setViewId(null)
        }}
      >
        {(() => {
          if (!viewId) return null
          const it = items.find((x) => getId(x) === viewId) ?? null
          if (!it) return <div className="text-sm text-zinc-300">Registro não encontrado.</div>
          return (
            <div className="space-y-4">
              {props.renderView ? (
                props.renderView(it)
              ) : (
                <pre className="overflow-auto text-xs text-zinc-200">{JSON.stringify(it, null, 2)}</pre>
              )}
              {props.nested ? <div className="pt-2">{props.nested(it)}</div> : null}
            </div>
          )
        })()}
      </Modal>

      <Modal
        open={Boolean(canEdit && editItem)}
        title="Editar"
        onClose={() => {
          if (saving) return
          closeEdit()
        }}
      >
        {editItem ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {props.fields
                .filter((f) => !(props.hiddenFields ?? []).includes(f.key))
                .map((f) => (
                <div key={f.key}>
                  {renderFieldInput(f, editValues[f.key] ?? (f.type === 'boolean' ? false : ''), (v) =>
                    setEditValues((cur) => ({ ...cur, [f.key]: v })),
                  )}
                </div>
              ))}
            </div>

            {editErr ? <InlineError message={editErr} /> : null}

            <div className="flex items-center gap-2">
              <Button onClick={() => void onSave(editItem)} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="secondary" onClick={closeEdit} disabled={saving}>
                Cancelar
              </Button>
            </div>

            {props.nested ? <div className="pt-2">{props.nested(editItem)}</div> : null}
          </div>
        ) : null}
      </Modal>

      <div className="space-y-3">
        {loading ? <div className="text-sm text-zinc-300">Carregando...</div> : null}
        {!loading && rows.length === 0 ? <div className="text-sm text-zinc-400">Sem registros.</div> : null}

        {props.showCreateButtonInList ? (
          <div className="flex flex-wrap items-center gap-2">
            <CreateButton
              onClick={() => {
                if (!canCreate) return
                setCreateOpen(true)
              }}
              disabled={!canCreate}
              label={`Criar ${props.title.toLowerCase()}`}
            />
          </div>
        ) : null}

        {!canCreate && props.createDisabledReason ? (
          <div className="text-sm text-zinc-400">{props.createDisabledReason}</div>
        ) : null}

        <div className="space-y-3">
          {rows.map(({ it, id }) => {
            const realId = getId(it)
            const editing = realId !== null && getId(editItem ?? {}) === realId
            const { ownerId, ownerName } = ownerIdentity(it)
            const enforceOwner = Boolean(ownerId || ownerName)
            const isOwner =
              Boolean(user) &&
              ((ownerId && user?.id === ownerId) || (ownerName && norm(user?.nome ?? '') === ownerName))
            const canEditRow = Boolean(canEdit && (!enforceOwner || isOwner))
            const canDeleteRow = Boolean(canDelete && (!enforceOwner || isOwner))

            return (
              <div
                key={id}
                className={[
                  'relative overflow-visible rounded-2xl border border-white/10 bg-zinc-950/30 p-4 transition',
                  enableView ? 'cursor-pointer hover:bg-white/5' : '',
                ].join(' ')}
                role={enableView ? 'button' : undefined}
                tabIndex={enableView ? 0 : undefined}
                onClick={() => {
                  if (!enableView) return
                  if (!realId) return
                  setViewId(realId)
                }}
                onKeyDown={(e) => {
                  if (!enableView) return
                  if (!realId) return
                  if (e.key === 'Enter' || e.key === ' ') setViewId(realId)
                }}
              >
                <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-cyan-400/80" aria-hidden />
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {props.columns.map((col) => (
                      <div key={col} className="min-w-0">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{col}</div>
                        <div className="truncate text-sm text-zinc-200">{asString(it[col])}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canEditRow ? (
                      <button
                        type="button"
                        aria-label={editing ? 'Fechar edição' : 'Editar'}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={(e) => {
                          // evita abrir o modal de visualização ao clicar no botão
                          e.stopPropagation()
                          if (editing) closeEdit()
                          else openEdit(it)
                        }}
                        disabled={!realId}
                        title={editing ? 'Fechar' : 'Editar'}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                    ) : null}

                    {canDeleteRow ? (
                      <ConfirmDelete
                        stopPropagation
                        disabled={!realId}
                        busy={deletingId === realId}
                        onConfirm={() => onDelete(it)}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

