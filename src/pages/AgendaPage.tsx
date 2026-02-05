import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../app/auth'
import { ApiError, apiOkData } from '../lib/api'
import { formatDayMonth } from '../lib/date'
import { Button, ConfirmDelete, CreateButton, GlassSegmentedControl, InlineError, Input, Modal, Page, Select, Textarea } from '../components/ui'

type AnyItem = Record<string, unknown>

function asString(x: unknown): string {
  if (x === null || x === undefined) return ''
  if (typeof x === 'string') return x
  if (typeof x === 'number' || typeof x === 'boolean') return String(x)
  return JSON.stringify(x)
}

function getId(item: AnyItem): string | null {
  const id = item.id
  if (typeof id === 'string') return id
  if (typeof id === 'number') return String(id)
  return null
}

function todayLocalISODate(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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

function sortDaysMostRecentFirst(a: AnyItem, b: AnyItem): number {
  const ca = Date.parse(asString(a.created_at))
  const cb = Date.parse(asString(b.created_at))
  if (!Number.isNaN(cb) && !Number.isNaN(ca) && cb !== ca) return cb - ca
  // fallback: dia desc (YYYY-MM-DD compara lexicograficamente)
  const da = asString(a.dia)
  const db = asString(b.dia)
  if (db !== da) return db.localeCompare(da)
  // fallback: id desc
  const ia = Number(asString(a.id))
  const ib = Number(asString(b.id))
  if (!Number.isNaN(ib) && !Number.isNaN(ia) && ib !== ia) return ib - ia
  return asString(b.id).localeCompare(asString(a.id))
}

type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: T[] }

type ActivityDraft = { key: string; materia: string; conteudo: string; data_entrega: string }

function newDraft(): ActivityDraft {
  return { key: `a-${Math.random().toString(16).slice(2)}`, materia: '', conteudo: '', data_entrega: '' }
}

export function AgendaPage() {
  const { user } = useAuth()
  const isDavi = (user?.nome ?? '').trim().toLowerCase() === 'davi'

  const [daysState, setDaysState] = useState<LoadState<AnyItem>>({ status: 'idle' })
  const [atividadesByDayId, setAtividadesByDayId] = useState<Record<string, LoadState<AnyItem>>>({})

  const [createOpen, setCreateOpen] = useState(false)
  const [createDia, setCreateDia] = useState<string>(todayLocalISODate())
  const [drafts, setDrafts] = useState<ActivityDraft[]>([newDraft()])
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  const [deletingAtividadeId, setDeletingAtividadeId] = useState<string | null>(null)

  const sortedDays = useMemo(() => {
    if (daysState.status !== 'ready') return []
    const arr = [...daysState.items]
    arr.sort(sortDaysMostRecentFirst)
    return arr
  }, [daysState])

  async function loadDays() {
    setDaysState({ status: 'loading' })
    try {
      const rows = await apiOkData<AnyItem[]>('/agenda')
      setDaysState({ status: 'ready', items: Array.isArray(rows) ? rows : [] })
    } catch (e) {
      setDaysState({ status: 'error', message: e instanceof ApiError ? e.message : 'Falha ao carregar agenda' })
    }
  }

  async function ensureAtividadesLoaded(dayId: string) {
    const cur = atividadesByDayId[dayId]
    if (cur?.status === 'loading' || cur?.status === 'ready') return
    setAtividadesByDayId((m) => ({ ...m, [dayId]: { status: 'loading' } }))
    try {
      const rows = await apiOkData<AnyItem[]>(`/agenda/${dayId}/atividades`)
      const list = Array.isArray(rows) ? rows : []
      // menor e “arrumado”: entrega asc dentro do dia, com pendentes primeiro
      list.sort((a, b) => {
        const da = asString(a.data_entrega)
        const db = asString(b.data_entrega)
        if (da !== db) return da.localeCompare(db)
        const fa = Boolean(a.feita)
        const fb = Boolean(b.feita)
        if (fa !== fb) return fa ? 1 : -1
        return asString(a.materia).localeCompare(asString(b.materia))
      })
      setAtividadesByDayId((m) => ({ ...m, [dayId]: { status: 'ready', items: list } }))
    } catch (e) {
      setAtividadesByDayId((m) => ({
        ...m,
        [dayId]: { status: 'error', message: e instanceof ApiError ? e.message : 'Falha ao carregar atividades' },
      }))
    }
  }

  useEffect(() => {
    void loadDays()
  }, [])

  useEffect(() => {
    if (daysState.status !== 'ready') return
    // carrega atividades em background para todos os dias (sem travar a UI)
    void (async () => {
      for (const d of daysState.items) {
        const id = getId(d)
        if (id) await ensureAtividadesLoaded(id)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysState.status])

  function closeCreate() {
    setCreateOpen(false)
    setCreateDia(todayLocalISODate())
    setDrafts([newDraft()])
    setCreateErr(null)
  }

  async function onSaveCreate() {
    setCreateErr(null)
    const dia = createDia.trim() || todayLocalISODate()

    const valid = drafts
      .map((d) => ({
        ...d,
        materia: d.materia.trim(),
        conteudo: d.conteudo.trim(),
        data_entrega: d.data_entrega.trim() || dia,
      }))
      .filter((d) => d.materia || d.conteudo)

    if (valid.length === 0) return setCreateErr('Adicione pelo menos 1 atividade')
    const missing = valid.find((d) => !d.materia || !d.conteudo)
    if (missing) return setCreateErr('Cada atividade precisa de Matéria e Conteúdo')

    setCreating(true)
    try {
      const createdDay = await apiOkData<AnyItem>('/agenda', { method: 'POST', body: JSON.stringify({ dia }) })
      const dayId = getId(createdDay)
      if (!dayId) throw new ApiError('API retornou um dia sem id')

      for (const d of valid) {
        await apiOkData(`/agenda/${dayId}/atividades`, {
          method: 'POST',
          body: JSON.stringify({ materia: d.materia, conteudo: d.conteudo, data_entrega: d.data_entrega }),
        })
      }

      closeCreate()
      await loadDays()
      // recarrega atividades do dia recém-criado
      setAtividadesByDayId((m) => ({ ...m, [dayId]: { status: 'idle' } }))
      void ensureAtividadesLoaded(dayId)
    } catch (e) {
      setCreateErr(e instanceof ApiError ? e.message : 'Falha ao salvar')
    } finally {
      setCreating(false)
    }
  }

  async function toggleFeita(dayId: string, atividade: AnyItem, next: boolean) {
    const atividadeId = getId(atividade)
    if (!atividadeId) return
    setAtividadesByDayId((m) => {
      const cur = m[dayId]
      if (!cur || cur.status !== 'ready') return m
      return {
        ...m,
        [dayId]: { status: 'ready', items: cur.items.map((a) => (getId(a) === atividadeId ? { ...a, feita: next } : a)) },
      }
    })
    try {
      await apiOkData(`/atividades/${atividadeId}`, { method: 'PATCH', body: JSON.stringify({ feita: next }) })
    } catch (e) {
      setAtividadesByDayId((m) => ({ ...m, [dayId]: { status: 'idle' } }))
      void ensureAtividadesLoaded(dayId)
    }
  }

  async function onDeleteAtividade(dayId: string, atividade: AnyItem) {
    const atividadeId = getId(atividade)
    if (!atividadeId) return
    setDeletingAtividadeId(atividadeId)
    try {
      await apiOkData(`/atividades/${atividadeId}`, { method: 'DELETE' })
      setAtividadesByDayId((m) => ({ ...m, [dayId]: { status: 'idle' } }))
      await ensureAtividadesLoaded(dayId)
    } catch {
      // ignora; o erro aparecerá quando recarregar a lista
    } finally {
      setDeletingAtividadeId(null)
    }
  }

  return (
    <Page
      title="Agenda"
      right={
        <CreateButton
          onClick={() => {
            setCreateErr(null)
            setCreateOpen(true)
          }}
          label="Criar dia + atividades"
        />
      }
    >
      <Modal
        open={createOpen}
        title="Criar dia + atividades"
        onClose={() => {
          if (creating) return
          closeCreate()
        }}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-xs font-medium text-zinc-300">Dia</div>
            <div className="flex flex-wrap items-center gap-3">
              <Input label="Dia" type="date" value={createDia} onChange={setCreateDia} />
              <div className="text-xs text-zinc-300">
                Selecionado: <span className="font-semibold text-zinc-100">{formatDayMonth(createDia || todayLocalISODate())}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {drafts.map((d, idx) => (
              <div key={d.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-zinc-300">Atividade {idx + 1}</div>
                  <button
                    type="button"
                    className="text-xs text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white disabled:opacity-50"
                    disabled={drafts.length <= 1 || creating}
                    onClick={() => setDrafts((cur) => cur.filter((x) => x.key !== d.key))}
                  >
                    Remover
                  </button>
                </div>

                <div className="space-y-4">
                  <Select
                    label="Matéria"
                    value={d.materia}
                    onChange={(v) => setDrafts((cur) => cur.map((x) => (x.key === d.key ? { ...x, materia: v } : x)))}
                    placeholder="Selecione..."
                    options={[
                      { value: 'Português', label: 'Português' },
                      { value: 'Matemática', label: 'Matemática' },
                      { value: 'Ciências', label: 'Ciências' },
                      { value: 'História', label: 'História' },
                      { value: 'Geografia', label: 'Geografia' },
                      { value: 'Inglês', label: 'Inglês' },
                      { value: 'Artes', label: 'Artes' },
                      { value: 'Educação Física', label: 'Educação Física' },
                    ]}
                  />
                  <Textarea
                    label="Conteúdo"
                    value={d.conteudo}
                    onChange={(v) => setDrafts((cur) => cur.map((x) => (x.key === d.key ? { ...x, conteudo: v } : x)))}
                    placeholder="Ex.: Lista 3, exercícios 1-10"
                    rows={4}
                  />
                  <Input
                    label="Data de entrega (opcional)"
                    type="date"
                    value={d.data_entrega}
                    onChange={(v) => setDrafts((cur) => cur.map((x) => (x.key === d.key ? { ...x, data_entrega: v } : x)))}
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setDrafts((cur) => [...cur, newDraft()])} disabled={creating}>
                Adicionar atividade
              </Button>
            </div>
          </div>

          {createErr ? <InlineError message={createErr} /> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void onSaveCreate()} disabled={creating}>
              {creating ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={closeCreate} disabled={creating}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {daysState.status === 'loading' ? <div className="text-sm text-zinc-300">Carregando...</div> : null}
      {daysState.status === 'error' ? <InlineError message={daysState.message} /> : null}
      {daysState.status === 'ready' && sortedDays.length === 0 ? <div className="text-sm text-zinc-400">Sem registros.</div> : null}

      {daysState.status === 'ready' ? (
        <div className="mt-4 space-y-12">
          {sortedDays.map((day) => {
            const dayId = getId(day)
            if (!dayId) return null
            const dia = asString(day.dia)

            const atividadesState = atividadesByDayId[dayId] ?? { status: 'idle' as const }
            const atividades = atividadesState.status === 'ready' ? atividadesState.items : []
            const counts = atividades.reduce<{ done: number; pending: number }>(
              (acc, a) => {
                if (Boolean(a.feita)) acc.done += 1
                else acc.pending += 1
                return acc
              },
              { done: 0, pending: 0 },
            )

            return (
              <div
                key={dayId}
                className="relative overflow-visible rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
              >
                <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-cyan-400/80" aria-hidden />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-zinc-100">Dia {formatDayMonth(dia)}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>
                        {counts.pending} pendente{counts.pending === 1 ? '' : 's'}
                      </span>
                      <span className="text-zinc-500">•</span>
                      <span>
                        {counts.done} feita{counts.done === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  {atividadesState.status === 'loading' ? <div className="text-sm text-zinc-300">Carregando atividades...</div> : null}
                  {atividadesState.status === 'error' ? <InlineError message={atividadesState.message} /> : null}
                  {atividadesState.status === 'ready' && atividades.length === 0 ? (
                    <div className="text-sm text-zinc-400">Sem atividades.</div>
                  ) : null}

                  {atividadesState.status === 'ready' && atividades.length > 0 ? (
                    <div className="space-y-1">
                      {atividades.map((a) => {
                        const atividadeId = getId(a)
                        if (!atividadeId) return null
                        const feita = Boolean(a.feita)
                        const { ownerId, ownerName } = ownerIdentity(a)
                        const enforceOwner = Boolean(ownerId || ownerName)
                        const isOwner =
                          Boolean(user) &&
                          ((ownerId && user?.id === ownerId) || (ownerName && norm(user?.nome ?? '') === ownerName))
                        const canMutate = !enforceOwner || isOwner

                        return (
                          <div
                            key={atividadeId}
                            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-950/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold text-zinc-100">{asString(a.materia) || 'Sem matéria'}</div>
                                <div className="text-[11px] text-zinc-400">Entrega: {formatDayMonth(a.data_entrega)}</div>
                              </div>
                              <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-zinc-200">{asString(a.conteudo) || ''}</div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {isDavi ? null : canMutate ? (
                                <div className="flex items-center gap-2">
                                  <GlassSegmentedControl
                                    value={feita ? 'feita' : 'pendente'}
                                    onChange={(v) => void toggleFeita(dayId, a, v === 'feita')}
                                  />

                                  <ConfirmDelete busy={deletingAtividadeId === atividadeId} onConfirm={() => onDeleteAtividade(dayId, a)} />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </Page>
  )
}

