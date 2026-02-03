import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../app/auth'
import { ApiError, apiOkData } from '../lib/api'
import { Button, Checkbox, InlineError, Input, Modal, Page, Select, Textarea } from '../components/ui'
import { formatDayMonth } from '../lib/date'

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

function toDateOnlyValue(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) return s
  const ts = Date.parse(s)
  if (Number.isNaN(ts)) return null
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function idAsNumber(x: unknown): number | null {
  if (typeof x === 'number') return x
  if (typeof x === 'string' && x.trim() && !Number.isNaN(Number(x))) return Number(x)
  return null
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

export function AgendaPage() {
  const { user } = useAuth()
  const isDavi = (user?.nome ?? '').trim().toLowerCase() === 'davi'
  const [dia, setDia] = useState<string>(todayLocalISODate())

  const [agendaDay, setAgendaDay] = useState<AnyItem | null>(null)
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [agendaErr, setAgendaErr] = useState<string | null>(null)

  const [atividades, setAtividades] = useState<AnyItem[]>([])
  const [loadingAtividades, setLoadingAtividades] = useState(false)
  const [atividadesErr, setAtividadesErr] = useState<string | null>(null)

  const [creatingDay, setCreatingDay] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [materia, setMateria] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [dataEntrega, setDataEntrega] = useState('')
  const [creatingAtividade, setCreatingAtividade] = useState(false)
  const [createAtividadeErr, setCreateAtividadeErr] = useState<string | null>(null)
  const [deletingAtividadeId, setDeletingAtividadeId] = useState<string | null>(null)

  const agendaId = useMemo(() => (agendaDay ? getId(agendaDay) : null), [agendaDay])

  async function loadAgendaForDay(nextDia: string) {
    setAgendaErr(null)
    setAtividadesErr(null)
    setLoadingAgenda(true)
    try {
      const d = nextDia.trim() || todayLocalISODate()
      const rows = await apiOkData<AnyItem[]>(`/agenda?dia=${encodeURIComponent(d)}`)
      const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
      setAgendaDay(first)
      if (first) {
        const id = getId(first)
        if (id) void loadAtividades(id)
        else setAtividades([])
      } else {
        setAtividades([])
      }
    } catch (e) {
      setAgendaErr(e instanceof ApiError ? e.message : 'Falha ao carregar agenda')
      setAgendaDay(null)
      setAtividades([])
    } finally {
      setLoadingAgenda(false)
    }
  }

  async function loadAtividades(id: string) {
    setAtividadesErr(null)
    setLoadingAtividades(true)
    try {
      const rows = await apiOkData<AnyItem[]>(`/agenda/${id}/atividades`)
      const list = Array.isArray(rows) ? rows : []
      // Mais recentes no topo: data_entrega (desc), depois id (desc)
      list.sort((a, b) => {
        const da = toDateOnlyValue(a.data_entrega) ?? ''
        const db = toDateOnlyValue(b.data_entrega) ?? ''
        if (da !== db) return db.localeCompare(da)
        const ia = idAsNumber(a.id) ?? -Infinity
        const ib = idAsNumber(b.id) ?? -Infinity
        if (ia !== ib) return ib - ia
        return asString(b.materia).localeCompare(asString(a.materia))
      })
      setAtividades(list)
    } catch (e) {
      setAtividadesErr(e instanceof ApiError ? e.message : 'Falha ao carregar atividades')
      setAtividades([])
    } finally {
      setLoadingAtividades(false)
    }
  }

  useEffect(() => {
    void loadAgendaForDay(dia)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia])

  async function onCreateDay() {
    setAgendaErr(null)
    setCreatingDay(true)
    try {
      const d = dia.trim() || todayLocalISODate()
      await apiOkData('/agenda', { method: 'POST', body: JSON.stringify({ dia: d }) })
      await loadAgendaForDay(d)
    } catch (e) {
      setAgendaErr(e instanceof ApiError ? e.message : 'Falha ao criar dia')
    } finally {
      setCreatingDay(false)
    }
  }

  async function onCreateAtividade() {
    setCreateAtividadeErr(null)
    if (!agendaId) return setCreateAtividadeErr('Crie o dia na agenda antes de adicionar atividades.')

    const m = materia.trim()
    const c = conteudo.trim()
    if (!m) return setCreateAtividadeErr('Informe a matéria')
    if (!c) return setCreateAtividadeErr('Informe o conteúdo')

    const d = dia.trim() || todayLocalISODate()
    const entrega = dataEntrega.trim() || d

    setCreatingAtividade(true)
    try {
      await apiOkData(`/agenda/${agendaId}/atividades`, {
        method: 'POST',
        body: JSON.stringify({ materia: m, conteudo: c, data_entrega: entrega }),
      })
      setMateria('')
      setConteudo('')
      setDataEntrega('')
      setCreateOpen(false)
      await loadAtividades(agendaId)
    } catch (e) {
      setCreateAtividadeErr(e instanceof ApiError ? e.message : 'Falha ao criar atividade')
    } finally {
      setCreatingAtividade(false)
    }
  }

  async function toggleFeita(atividadeId: string, next: boolean) {
    setAtividadesErr(null)
    // otimista
    setAtividades((cur) => cur.map((a) => (getId(a) === atividadeId ? { ...a, feita: next } : a)))
    try {
      await apiOkData(`/atividades/${atividadeId}`, { method: 'PATCH', body: JSON.stringify({ feita: next }) })
    } catch (e) {
      // rollback simples recarregando
      if (agendaId) void loadAtividades(agendaId)
      setAtividadesErr(e instanceof ApiError ? e.message : 'Falha ao atualizar atividade')
    }
  }

  async function onDeleteAtividade(atividadeId: string) {
    if (!agendaId) return
    const ok = window.confirm('Excluir esta atividade?')
    if (!ok) return

    setAtividadesErr(null)
    setDeletingAtividadeId(atividadeId)
    try {
      await apiOkData(`/atividades/${atividadeId}`, { method: 'DELETE' })
      await loadAtividades(agendaId)
    } catch (e) {
      setAtividadesErr(e instanceof ApiError ? e.message : 'Falha ao excluir atividade')
    } finally {
      setDeletingAtividadeId(null)
    }
  }

  return (
    <Page
      title="Agenda"
      description="Selecione um dia, crie o registro (se necessário) e adicione atividades."
      right={
        <Button
          onClick={() => {
            setCreateAtividadeErr(null)
            setCreateOpen(true)
          }}
          disabled={!agendaId}
        >
          Criar
        </Button>
      }
    >
      <Modal
        open={createOpen}
        title="Criar atividade"
        onClose={() => {
          if (creatingAtividade) return
          setCreateOpen(false)
          setCreateAtividadeErr(null)
        }}
      >
        {!agendaId ? (
          <InlineError message="Crie o dia na agenda antes de adicionar atividades." />
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-zinc-300">
              Dia: <span className="font-semibold text-zinc-100">{formatDayMonth(dia || todayLocalISODate())}</span>
            </div>
            <Select
              label="Matéria"
              value={materia}
              onChange={setMateria}
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
              value={conteudo}
              onChange={setConteudo}
              placeholder="Ex.: Lista 3, exercícios 1-10"
              rows={4}
            />
            <Input label="Data de entrega (opcional)" type="date" value={dataEntrega} onChange={setDataEntrega} />
            <div className="text-xs text-zinc-400">
              Se não informar a data de entrega, será enviada a data do dia selecionado ({dia || todayLocalISODate()}).
            </div>

            {createAtividadeErr ? <InlineError message={createAtividadeErr} /> : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void onCreateAtividade()} disabled={creatingAtividade}>
                {creatingAtividade ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (creatingAtividade) return
                  setCreateOpen(false)
                  setCreateAtividadeErr(null)
                }}
                disabled={creatingAtividade}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <div className="space-y-6">
        <div className="max-w-xs">
          <Input label="Dia" type="date" value={dia} onChange={setDia} />
        </div>

        {agendaErr ? <InlineError message={agendaErr} /> : null}

        {loadingAgenda ? <div className="text-sm text-zinc-300">Carregando...</div> : null}

        {!loadingAgenda && !agendaDay ? (
          <div className="space-y-3">
            <div className="text-sm text-zinc-300">Nenhum registro encontrado para este dia.</div>
            <div>
              <Button onClick={() => void onCreateDay()} disabled={creatingDay}>
                {creatingDay ? 'Criando...' : 'Criar dia'}
              </Button>
            </div>
          </div>
        ) : null}

        {!loadingAgenda && agendaDay ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-zinc-100">Atividades</div>
              {atividadesErr ? <InlineError message={atividadesErr} /> : null}
              {loadingAtividades ? <div className="text-sm text-zinc-300">Carregando atividades...</div> : null}
              {!loadingAtividades && atividades.length === 0 ? <div className="text-sm text-zinc-400">Sem atividades.</div> : null}

              <div className="space-y-3">
                {atividades.map((a) => {
                  const id = getId(a)
                  if (!id) return null
                  const feita = Boolean(a.feita)
                  const { ownerId, ownerName } = ownerIdentity(a)
                  const enforceOwner = Boolean(ownerId || ownerName)
                  const isOwner =
                    Boolean(user) &&
                    ((ownerId && user?.id === ownerId) || (ownerName && norm(user?.nome ?? '') === ownerName))
                  const canMutate = !enforceOwner || isOwner
                  return (
                    <div key={id} className="rounded-2xl border border-white/10 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zinc-100">{asString(a.materia) || 'Sem matéria'}</div>
                          <div className="mt-1 text-xs text-zinc-400">Entrega: {formatDayMonth(a.data_entrega)}</div>
                          <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-200">{asString(a.conteudo) || '—'}</div>
                        </div>
                        <div className="flex shrink-0 items-start gap-2">
                          {/* Davi só visualiza status (não marca) */}
                          {isDavi ? (
                            <div
                              className={[
                                'rounded-full border px-3 py-1 text-xs font-semibold',
                                feita
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-100',
                              ].join(' ')}
                              title={feita ? 'Feita' : 'Pendente'}
                            >
                              {feita ? 'Feita' : 'Pendente'}
                            </div>
                          ) : canMutate ? (
                            <>
                              <button
                                type="button"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Excluir"
                                aria-label="Excluir"
                                onClick={() => void onDeleteAtividade(id)}
                                disabled={deletingAtividadeId === id}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="18"
                                  height="18"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                              <Checkbox label="Feita" checked={feita} onChange={(v) => void toggleFeita(id, v)} />
                            </>
                          ) : (
                            <div
                              className={[
                                'rounded-full border px-3 py-1 text-xs font-semibold',
                                feita
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-100',
                              ].join(' ')}
                              title={feita ? 'Feita' : 'Pendente'}
                            >
                              {feita ? 'Feita' : 'Pendente'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Page>
  )
}

