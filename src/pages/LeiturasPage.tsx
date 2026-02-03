import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../app/auth'
import { ApiError, apiOkData } from '../lib/api'
import { formatDayMonth } from '../lib/date'
import { Button, InlineError, Input, Modal, Page, Textarea } from '../components/ui'

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

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function isOwner(item: AnyItem, user: { id: string; nome: string } | null): boolean {
  if (!user) return false
  const uid = user.id
  const uname = norm(user.nome)
  const ownerId = asString(
    item.usuario_id ?? item.autor_id ?? item.criador_id ?? item.owner_id ?? item.user_id ?? item.created_by,
  ).trim()
  if (ownerId && ownerId === uid) return true
  const ownerName = norm(asString(item.autor ?? item.autor_nome ?? item.usuario_nome ?? item.criador_nome ?? item.owner_nome))
  if (ownerName && ownerName === uname) return true
  return false
}

type LoadedAvaliacoesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: AnyItem[] }

export function LeiturasPage() {
  const { user } = useAuth()
  const isDavi = (user?.nome ?? '').trim().toLowerCase() === 'davi'

  const [leituras, setLeituras] = useState<AnyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [usersById, setUsersById] = useState<Record<string, string>>({})

  const [createOpen, setCreateOpen] = useState(false)
  const [createTexto, setCreateTexto] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [avaliacoesByLeituraId, setAvaliacoesByLeituraId] = useState<Record<string, LoadedAvaliacoesState>>({})

  const [editResumoOpen, setEditResumoOpen] = useState(false)
  const [editResumoLeituraId, setEditResumoLeituraId] = useState<string | null>(null)
  const [editResumo, setEditResumo] = useState('')
  const [savingResumo, setSavingResumo] = useState(false)
  const [resumoErr, setResumoErr] = useState<string | null>(null)

  const [nota, setNota] = useState('')
  const [comentario, setComentario] = useState('')
  const [savingAvaliacao, setSavingAvaliacao] = useState(false)
  const [avaliacaoErr, setAvaliacaoErr] = useState<string | null>(null)
  const [avaliacaoOk, setAvaliacaoOk] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editLeituraId, setEditLeituraId] = useState<string | null>(null)
  const [editTexto, setEditTexto] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editErr, setEditErr] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadLeituras() {
    setErr(null)
    setLoading(true)
    try {
      const data = await apiOkData<AnyItem[]>('/leituras')
      const list = Array.isArray(data) ? data : []
      // mais recentes primeiro (se tiver created_at). fallback: id desc
      list.sort((a, b) => {
        const ca = Date.parse(asString(a.created_at))
        const cb = Date.parse(asString(b.created_at))
        if (!Number.isNaN(cb) && !Number.isNaN(ca) && cb !== ca) return cb - ca
        const ia = Number(asString(a.id))
        const ib = Number(asString(b.id))
        if (!Number.isNaN(ib) && !Number.isNaN(ia) && ib !== ia) return ib - ia
        return asString(b.id).localeCompare(asString(a.id))
      })
      setLeituras(list)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Falha ao carregar leituras')
      setLeituras([])
    } finally {
      setLoading(false)
    }
  }

  async function loadUsersIndex() {
    try {
      const rows = await apiOkData<AnyItem[]>('/usuarios')
      const map: Record<string, string> = {}
      for (const u of Array.isArray(rows) ? rows : []) {
        const id = asString(u.id).trim()
        const nome = asString(u.nome).trim()
        if (id && nome) map[id] = nome
      }
      setUsersById(map)
    } catch {
      setUsersById({})
    }
  }

  useEffect(() => {
    void loadLeituras()
    void loadUsersIndex()
  }, [])

  async function ensureAvaliacoesLoaded(leituraId: string) {
    const cur = avaliacoesByLeituraId[leituraId]
    if (cur?.status === 'loading' || cur?.status === 'ready') return
    setAvaliacoesByLeituraId((m) => ({ ...m, [leituraId]: { status: 'loading' } }))
    try {
      const rows = await apiOkData<AnyItem[]>(`/leituras/${leituraId}/avaliacoes`)
      setAvaliacoesByLeituraId((m) => ({ ...m, [leituraId]: { status: 'ready', items: Array.isArray(rows) ? rows : [] } }))
    } catch (e) {
      setAvaliacoesByLeituraId((m) => ({
        ...m,
        [leituraId]: { status: 'error', message: e instanceof ApiError ? e.message : 'Falha ao carregar avaliações' },
      }))
    }
  }

  function closeCreate() {
    setCreateOpen(false)
    setCreateTexto('')
    setCreateErr(null)
  }

  async function onCreateLeitura() {
    setCreateErr(null)
    const texto = createTexto.trim()
    if (!texto) return setCreateErr('Informe o texto da leitura')
    setCreating(true)
    try {
      await apiOkData('/leituras', { method: 'POST', body: JSON.stringify({ texto }) })
      closeCreate()
      await loadLeituras()
    } catch (e) {
      setCreateErr(e instanceof ApiError ? e.message : 'Falha ao criar leitura')
    } finally {
      setCreating(false)
    }
  }

  function openResumoEditor(leituraId: string) {
    const leitura = leituras.find((l) => getId(l) === leituraId) ?? null
    setResumoErr(null)
    setEditResumoLeituraId(leituraId)
    setEditResumo(asString(leitura?.resumo_resposta))
    setEditResumoOpen(true)
  }

  function closeResumoEditor() {
    setEditResumoOpen(false)
    setEditResumoLeituraId(null)
    setEditResumo('')
    setResumoErr(null)
  }

  async function onSaveResumo() {
    if (!isDavi) return
    const leituraId = editResumoLeituraId
    if (!leituraId) return
    setResumoErr(null)
    const resumo_resposta = editResumo.trim()
    if (!resumo_resposta) return setResumoErr('Informe o resumo/resposta')
    setSavingResumo(true)
    try {
      await apiOkData(`/leituras/${leituraId}`, { method: 'PATCH', body: JSON.stringify({ resumo_resposta }) })
      closeResumoEditor()
      await loadLeituras()
    } catch (e) {
      setResumoErr(e instanceof ApiError ? e.message : 'Falha ao salvar resumo/resposta')
    } finally {
      setSavingResumo(false)
    }
  }

  const expandedLeitura = useMemo(() => {
    if (!expandedId) return null
    return leituras.find((l) => getId(l) === expandedId) ?? null
  }, [expandedId, leituras])

  const expandedHasResumo = Boolean(asString(expandedLeitura?.resumo_resposta).trim())
  const expandedAvaliacoesState = expandedId ? avaliacoesByLeituraId[expandedId] ?? { status: 'idle' as const } : { status: 'idle' as const }

  const minhaAvaliacao = useMemo(() => {
    if (!user || !expandedId) return null
    if (!expandedAvaliacoesState || expandedAvaliacoesState.status !== 'ready') return null
    return expandedAvaliacoesState.items.find((a) => asString(a.usuario_id) === user.id) ?? null
  }, [expandedAvaliacoesState, expandedId, user])

  const media = useMemo(() => {
    if (!expandedAvaliacoesState || expandedAvaliacoesState.status !== 'ready') return null
    const notas = expandedAvaliacoesState.items
      .map((a) => Number(asString(a.nota)))
      .filter((n) => Number.isFinite(n))
    if (notas.length === 0) return null
    const sum = notas.reduce((acc, n) => acc + n, 0)
    return sum / notas.length
  }, [expandedAvaliacoesState])

  async function onSubmitAvaliacao(leituraId: string) {
    if (!user) return
    setAvaliacaoErr(null)
    setAvaliacaoOk(false)

    const n = Number(nota)
    if (!Number.isFinite(n)) return setAvaliacaoErr('Informe uma nota (0 a 10)')
    if (n < 0 || n > 10) return setAvaliacaoErr('A nota deve estar entre 0 e 10')

    setSavingAvaliacao(true)
    try {
      await apiOkData(`/leituras/${leituraId}/avaliacoes`, {
        method: 'POST',
        body: JSON.stringify({ usuario_id: user.id, nota: n, comentario: comentario.trim() || undefined }),
      })
      setNota('')
      setComentario('')
      setAvaliacaoOk(true)
      // recarrega avaliações e também índice de usuários (pra garantir nomes)
      setAvaliacoesByLeituraId((m) => ({ ...m, [leituraId]: { status: 'idle' } }))
      await ensureAvaliacoesLoaded(leituraId)
      void loadUsersIndex()
    } catch (e) {
      setAvaliacaoErr(e instanceof ApiError ? e.message : 'Falha ao enviar avaliação')
    } finally {
      setSavingAvaliacao(false)
    }
  }

  function openEditLeitura(leituraId: string) {
    const leitura = leituras.find((l) => getId(l) === leituraId) ?? null
    setEditErr(null)
    setEditLeituraId(leituraId)
    setEditTexto(asString(leitura?.texto))
    setEditOpen(true)
  }

  function closeEditLeitura() {
    setEditOpen(false)
    setEditLeituraId(null)
    setEditTexto('')
    setEditErr(null)
  }

  async function onSaveEditLeitura() {
    const leituraId = editLeituraId
    if (!leituraId) return
    setEditErr(null)
    const texto = editTexto.trim()
    if (!texto) return setEditErr('Informe o texto')
    setSavingEdit(true)
    try {
      await apiOkData(`/leituras/${leituraId}`, { method: 'PATCH', body: JSON.stringify({ texto }) })
      closeEditLeitura()
      await loadLeituras()
    } catch (e) {
      setEditErr(e instanceof ApiError ? e.message : 'Falha ao salvar leitura')
    } finally {
      setSavingEdit(false)
    }
  }

  async function onDeleteLeitura(leituraId: string) {
    const ok = window.confirm('Excluir esta leitura?')
    if (!ok) return
    setErr(null)
    setDeletingId(leituraId)
    try {
      await apiOkData(`/leituras/${leituraId}`, { method: 'DELETE' })
      if (expandedId === leituraId) setExpandedId(null)
      await loadLeituras()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Falha ao excluir leitura')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Page
      title="Leituras"
      description="Crie uma leitura (texto). O Davi adiciona o resumo/resposta. Outros usuários avaliam com nota e comentário."
      right={
        <Button
          onClick={() => {
            setCreateErr(null)
            setCreateOpen(true)
          }}
        >
          Criar
        </Button>
      }
    >
      <Modal
        open={createOpen}
        title="Criar leitura"
        onClose={() => {
          if (creating) return
          closeCreate()
        }}
      >
        <div className="space-y-4">
          <Textarea label="Texto" value={createTexto} onChange={setCreateTexto} rows={10} placeholder="Cole aqui o texto da leitura..." />
          {createErr ? <InlineError message={createErr} /> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void onCreateLeitura()} disabled={creating}>
              {creating ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={closeCreate} disabled={creating}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editResumoOpen}
        title="Resumo/Resposta (Davi)"
        onClose={() => {
          if (savingResumo) return
          closeResumoEditor()
        }}
      >
        {!isDavi ? (
          <InlineError message="Somente o usuário Davi pode enviar o resumo/resposta." />
        ) : (
          <div className="space-y-4">
            <Textarea label="Resumo/Resposta" value={editResumo} onChange={setEditResumo} rows={8} placeholder="Digite o resumo/resposta..." />
            {resumoErr ? <InlineError message={resumoErr} /> : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void onSaveResumo()} disabled={savingResumo}>
                {savingResumo ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="secondary" onClick={closeResumoEditor} disabled={savingResumo}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={editOpen}
        title="Editar leitura"
        onClose={() => {
          if (savingEdit) return
          closeEditLeitura()
        }}
      >
        <div className="space-y-4">
          <Textarea label="Texto" value={editTexto} onChange={setEditTexto} rows={10} />
          {editErr ? <InlineError message={editErr} /> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void onSaveEditLeitura()} disabled={savingEdit}>
              {savingEdit ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={closeEditLeitura} disabled={savingEdit}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {err ? <InlineError message={err} /> : null}
      {loading ? <div className="text-sm text-zinc-300">Carregando...</div> : null}
      {!loading && leituras.length === 0 ? <div className="text-sm text-zinc-400">Sem leituras.</div> : null}

      <div className="mt-4 space-y-3">
        {leituras.map((l) => {
          const id = getId(l)
          if (!id) return null
          const expanded = expandedId === id
          const createdAt = asString(l.created_at)
          const resumo = asString(l.resumo_resposta).trim()
          const texto = asString(l.texto).trim()
          const textoShort = texto.length > 220 ? `${texto.slice(0, 220)}…` : texto
          const canMutate = isOwner(l, user)
          return (
            <div key={id} className="rounded-2xl border border-white/10 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-base font-semibold tracking-tight text-zinc-100 sm:text-lg">
                    Leitura
                    <span className="ml-2 text-sm font-medium text-zinc-400">#{id}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                    {createdAt ? <span>Criado: {formatDayMonth(createdAt)}</span> : null}
                    <span className={resumo ? 'text-emerald-200/90' : 'text-amber-200/90'}>
                      {resumo ? 'Com resumo' : 'Aguardando resumo'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const next = expanded ? null : id
                      setExpandedId(next)
                      setAvaliacaoErr(null)
                      setAvaliacaoOk(false)
                      setNota('')
                      setComentario('')
                      if (!expanded) void ensureAvaliacoesLoaded(id)
                    }}
                  >
                    {expanded ? 'Fechar' : 'Abrir'}
                  </Button>
                  {canMutate ? (
                    <>
                      <button
                        type="button"
                        aria-label="Editar"
                        title="Editar"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                        onClick={() => openEditLeitura(id)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Excluir"
                        title="Excluir"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-red-500/15 text-red-100 transition hover:bg-red-500/25 disabled:opacity-60"
                        onClick={() => void onDeleteLeitura(id)}
                        disabled={deletingId === id}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </>
                  ) : null}
                  {isDavi ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        openResumoEditor(id)
                      }}
                    >
                      {resumo ? 'Editar resumo' : 'Adicionar resumo'}
                    </Button>
                  ) : null}
                </div>
              </div>

              {!expanded ? <div className="mt-4 whitespace-pre-wrap text-sm text-zinc-200">{textoShort || '—'}</div> : null}

              {expanded ? (
                <div className="mt-5 space-y-6 open-frames">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">Texto</div>
                    <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-200">
                      {texto || '—'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-zinc-100">Resumo/Resposta</div>
                      {isDavi ? (
                        <button
                          type="button"
                          className="text-xs text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white"
                          onClick={() => openResumoEditor(id)}
                        >
                          {resumo ? 'Editar' : 'Adicionar'}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-200">
                      {resumo || 'Ainda não há resumo/resposta.'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-zinc-100">Avaliações</div>
                      {media !== null ? (
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                          Média: <span className="font-semibold text-white">{media.toFixed(1)}</span>
                        </div>
                      ) : null}
                    </div>

                    {expandedAvaliacoesState.status === 'loading' ? (
                      <div className="text-sm text-zinc-300">Carregando avaliações...</div>
                    ) : null}
                    {expandedAvaliacoesState.status === 'error' ? <InlineError message={expandedAvaliacoesState.message} /> : null}

                    {expandedAvaliacoesState.status === 'ready' ? (
                      <div className="space-y-3">
                        {expandedAvaliacoesState.items.length === 0 ? (
                          <div className="text-sm text-zinc-400">Sem avaliações.</div>
                        ) : (
                          <div className="space-y-3">
                            {expandedAvaliacoesState.items.map((a) => {
                              const aid = getId(a) ?? `${asString(a.usuario_id)}-${asString(a.created_at)}-${Math.random().toString(16).slice(2)}`
                              const uid = asString(a.usuario_id).trim()
                              const nome = uid ? usersById[uid] ?? '' : ''
                              const who = nome ? nome : uid ? `Usuário ${uid.slice(0, 8)}…` : 'Usuário'
                              const n = asString(a.nota)
                              const c = asString(a.comentario).trim()
                              return (
                                <div key={aid} className="rounded-2xl border border-white/10 bg-zinc-950/20 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-sm font-semibold text-zinc-100">{who}</div>
                                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                                      Nota: <span className="font-semibold text-white">{n}</span>
                                    </div>
                                  </div>
                                  {c ? <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{c}</div> : null}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {expandedHasResumo && user && !minhaAvaliacao ? (
                      <div className="rounded-2xl border border-white/10 p-4">
                        <div className="text-sm font-semibold text-zinc-100">Avaliar</div>
                        <div className="mt-4 space-y-4">
                          <Input label="Nota (0 a 10)" type="number" value={nota} onChange={setNota} placeholder="Ex.: 9" />
                          <Textarea
                            label="Comentário (opcional)"
                            value={comentario}
                            onChange={setComentario}
                            rows={4}
                            placeholder="Ex.: Boa síntese, mas..."
                          />
                          {avaliacaoErr ? <InlineError message={avaliacaoErr} /> : null}
                          {avaliacaoOk ? (
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                              Avaliação enviada.
                            </div>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={() => void onSubmitAvaliacao(id)} disabled={savingAvaliacao}>
                              {savingAvaliacao ? 'Enviando...' : 'Enviar avaliação'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </Page>
  )
}

