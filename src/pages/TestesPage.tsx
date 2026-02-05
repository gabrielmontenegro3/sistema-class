import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../app/auth'
import { apiOkData, ApiError } from '../lib/api'
import { formatDayMonth } from '../lib/date'
import { Button, ConfirmDelete, CreateButton, InlineError, Input, Modal, OpenButton, Page, Textarea } from '../components/ui'

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

function isOwner(item: AnyItem, user: { id: string; nome: string } | null): boolean {
  if (!user) return false
  const ownerId = asString(
    item.usuario_id ?? item.autor_id ?? item.criador_id ?? item.owner_id ?? item.user_id ?? item.created_by,
  ).trim()
  if (ownerId && ownerId === user.id) return true
  const ownerName = norm(asString(item.autor ?? item.autor_nome ?? item.usuario_nome ?? item.criador_nome ?? item.owner_nome))
  if (ownerName && ownerName === norm(user.nome)) return true
  return false
}

type QuestionDraft = { key: string; enunciado: string }

function newDraft(): QuestionDraft {
  return { key: `q-${Math.random().toString(16).slice(2)}`, enunciado: '' }
}

function todayLocalISODate(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function sortKeyForMostRecentFirst(item: AnyItem): { ts: number; tie: string } {
  const raw = asString(item.data).trim()
  const ts = raw ? Date.parse(raw) : Number.NaN
  return { ts: Number.isFinite(ts) ? ts : -Infinity, tie: `${asString(item.titulo)}|${getId(item) ?? ''}` }
}

type LoadedQuestionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: AnyItem[] }

type LoadedRespostasState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: AnyItem[] }

type ScoreSummary = { total: number; correct: number; wrong: number; pending: number }

export function TestesPage() {
  const { user } = useAuth()
  const isDavi = (user?.nome ?? '').trim().toLowerCase() === 'davi'

  const [tests, setTests] = useState<AnyItem[]>([])
  const [loadingTests, setLoadingTests] = useState(false)
  const [testsErr, setTestsErr] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createTitulo, setCreateTitulo] = useState('')
  const [createQuestions, setCreateQuestions] = useState<QuestionDraft[]>([newDraft(), newDraft()])
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  const [viewTestId, setViewTestId] = useState<string | null>(null)
  const [questionsByTestId, setQuestionsByTestId] = useState<Record<string, LoadedQuestionsState>>({})
  const [respostasByTestId, setRespostasByTestId] = useState<Record<string, LoadedRespostasState>>({})
  const [answeredTestIds, setAnsweredTestIds] = useState<Record<string, true>>({})
  const [scoreByTestId, setScoreByTestId] = useState<Record<string, ScoreSummary>>({})

  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, string>>({})
  const [submittingAnswers, setSubmittingAnswers] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editData, setEditData] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editErr, setEditErr] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canCreateTest = !isDavi
  const canAnswer = isDavi

  async function loadAnsweredIndexForDavi(usuarioId: string) {
    try {
      // Preferência: filtro por usuario_id (se existir no backend)
      const rows = await apiOkData<AnyItem[]>(`/teste-respostas?usuario_id=${encodeURIComponent(usuarioId)}`)
      const next: Record<string, true> = {}
      const scores: Record<string, ScoreSummary> = {}
      for (const r of Array.isArray(rows) ? rows : []) {
        const tid = asString(r.teste_id).trim()
        if (!tid) continue
        next[tid] = true

        const cur = scores[tid] ?? { total: 0, correct: 0, wrong: 0, pending: 0 }
        cur.total += 1
        const correta = typeof r.correta === 'boolean' ? (r.correta as boolean) : null
        if (correta === true) cur.correct += 1
        else if (correta === false) cur.wrong += 1
        else cur.pending += 1
        scores[tid] = cur
      }
      setAnsweredTestIds(next)
      setScoreByTestId(scores)
    } catch {
      // Fallback silencioso: se não existir filtro/rota, a classificação acontece ao abrir cada teste
      setAnsweredTestIds({})
      setScoreByTestId({})
    }
  }

  async function loadTests() {
    setTestsErr(null)
    setLoadingTests(true)
    try {
      const data = await apiOkData<AnyItem[]>('/testes')
      setTests(Array.isArray(data) ? data : [])
    } catch (e) {
      setTestsErr(e instanceof ApiError ? e.message : 'Falha ao carregar testes')
      setTests([])
    } finally {
      setLoadingTests(false)
    }
  }

  useEffect(() => {
    void loadTests()
  }, [])

  useEffect(() => {
    if (!canAnswer || !user) return
    void loadAnsweredIndexForDavi(user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAnswer, user?.id])

  const sortedTests = useMemo(() => {
    const arr = [...tests]
    arr.sort((a, b) => {
      const ka = sortKeyForMostRecentFirst(a)
      const kb = sortKeyForMostRecentFirst(b)
      if (kb.ts !== ka.ts) return kb.ts - ka.ts
      return kb.tie.localeCompare(ka.tie)
    })
    return arr
  }, [tests])

  const pendingTests = useMemo(() => {
    if (!canAnswer) return []
    return sortedTests.filter((t) => {
      const id = getId(t)
      if (!id) return false
      return !answeredTestIds[id]
    })
  }, [answeredTestIds, canAnswer, sortedTests])

  const completedTests = useMemo(() => {
    if (!canAnswer) return []
    return sortedTests.filter((t) => {
      const id = getId(t)
      if (!id) return false
      return Boolean(answeredTestIds[id])
    })
  }, [answeredTestIds, canAnswer, sortedTests])

  async function ensureQuestionsLoaded(testId: string) {
    const cur = questionsByTestId[testId]
    if (cur?.status === 'loading' || cur?.status === 'ready') return
    setQuestionsByTestId((m) => ({ ...m, [testId]: { status: 'loading' } }))
    try {
      const data = await apiOkData<AnyItem[]>(`/testes/${testId}/questoes`)
      setQuestionsByTestId((m) => ({ ...m, [testId]: { status: 'ready', items: Array.isArray(data) ? data : [] } }))
    } catch (e) {
      setQuestionsByTestId((m) => ({
        ...m,
        [testId]: { status: 'error', message: e instanceof ApiError ? e.message : 'Falha ao carregar questões' },
      }))
    }
  }

  async function ensureRespostasLoaded(testId: string) {
    const cur = respostasByTestId[testId]
    if (cur?.status === 'loading' || cur?.status === 'ready') return
    setRespostasByTestId((m) => ({ ...m, [testId]: { status: 'loading' } }))
    try {
      const data = await apiOkData<AnyItem[]>(`/testes/${testId}/respostas`)
      setRespostasByTestId((m) => ({ ...m, [testId]: { status: 'ready', items: Array.isArray(data) ? data : [] } }))
    } catch (e) {
      try {
        const data2 = await apiOkData<AnyItem[]>(`/teste-respostas?teste_id=${encodeURIComponent(testId)}`)
        setRespostasByTestId((m) => ({ ...m, [testId]: { status: 'ready', items: Array.isArray(data2) ? data2 : [] } }))
      } catch (e2) {
        const msg = e2 instanceof ApiError ? e2.message : e instanceof ApiError ? e.message : 'Falha ao carregar respostas'
        setRespostasByTestId((m) => ({ ...m, [testId]: { status: 'error', message: msg } }))
      }
    }
  }

  function closeCreate() {
    setCreateOpen(false)
    setCreateTitulo('')
    setCreateQuestions([newDraft(), newDraft()])
    setCreateErr(null)
  }

  async function onCreateTestWithQuestions() {
    setCreateErr(null)
    setSubmitOk(false)

    const titulo = createTitulo.trim()
    const data = todayLocalISODate()
    if (!titulo) return setCreateErr('Informe o título do teste')

    const qs = createQuestions.map((q) => ({ enunciado: q.enunciado.trim() })).filter((q) => q.enunciado.length > 0)

    if (qs.length === 0) return setCreateErr('Adicione pelo menos 1 questão')
    const invalid = qs.find((q) => !q.enunciado)
    if (invalid) return setCreateErr('Cada questão precisa de enunciado')
    if (!canCreateTest) return setCreateErr('Você não tem permissão para criar testes.')

    setCreating(true)
    try {
      const created = await apiOkData<AnyItem>('/testes', { method: 'POST', body: JSON.stringify({ titulo, data }) })
      const testeId = getId(created)
      if (!testeId) throw new ApiError('API retornou um teste sem id')

      for (const q of qs) {
        await apiOkData(`/testes/${testeId}/questoes`, { method: 'POST', body: JSON.stringify(q) })
      }

      await loadTests()
      closeCreate()
      setViewTestId(testeId)
      setAnswersByQuestionId({})
      setSubmitErr(null)
      setSubmitOk(false)
      await ensureQuestionsLoaded(testeId)
    } catch (e) {
      setCreateErr(e instanceof ApiError ? e.message : 'Falha ao criar teste')
    } finally {
      setCreating(false)
    }
  }

  async function onSubmitAnswers(testId: string) {
    if (!user) return
    setSubmitErr(null)
    setSubmitOk(false)
    if (!canAnswer) return setSubmitErr('Somente o usuário Davi pode responder este teste.')

    const qsState = questionsByTestId[testId]
    if (!qsState || qsState.status !== 'ready') return setSubmitErr('As questões ainda não foram carregadas.')

    const rsState = respostasByTestId[testId]
    const rsForUser =
      rsState && rsState.status === 'ready'
        ? rsState.items.filter((r) => asString(r.usuario_id) === user.id)
        : []
    if (rsForUser.length > 0) return setSubmitErr('Você já respondeu este teste. Use "Ver" para visualizar.')

    const qs = qsState.items
    const missing = qs.find((q) => {
      const qid = getId(q)
      if (!qid) return false
      return !(answersByQuestionId[qid] ?? '').trim()
    })
    if (missing) return setSubmitErr('Responda todas as questões antes de enviar.')

    setSubmittingAnswers(true)
    try {
      for (const q of qs) {
        const questaoId = getId(q)
        if (!questaoId) continue
        const resposta_usuario = (answersByQuestionId[questaoId] ?? '').trim()

        await apiOkData(`/testes/${testId}/respostas`, {
          method: 'POST',
          body: JSON.stringify({
            questao_id: questaoId,
            usuario_id: user.id,
            resposta_usuario,
          }),
        })
      }

      setSubmitOk(true)
      setRespostasByTestId((m) => ({ ...m, [testId]: { status: 'idle' } }))
      await ensureRespostasLoaded(testId)
      setAnsweredTestIds((m) => ({ ...m, [testId]: true }))
      if (user) await loadAnsweredIndexForDavi(user.id)
    } catch (e) {
      setSubmitErr(e instanceof ApiError ? e.message : 'Falha ao registrar respostas')
    } finally {
      setSubmittingAnswers(false)
    }
  }

  function openEditTest(testId: string, t: AnyItem) {
    setEditErr(null)
    setEditId(testId)
    setEditTitulo(asString(t.titulo))
    setEditData(asString(t.data))
    setEditOpen(true)
  }

  function closeEditTest() {
    setEditOpen(false)
    setEditId(null)
    setEditTitulo('')
    setEditData('')
    setEditErr(null)
  }

  async function onSaveEditTest() {
    const id = editId
    if (!id) return
    setEditErr(null)
    const titulo = editTitulo.trim()
    const data = editData.trim()
    if (!titulo) return setEditErr('Informe o título')
    if (!data) return setEditErr('Informe a data')
    setSavingEdit(true)
    try {
      await apiOkData(`/testes/${id}`, { method: 'PATCH', body: JSON.stringify({ titulo, data }) })
      closeEditTest()
      await loadTests()
    } catch (e) {
      setEditErr(e instanceof ApiError ? e.message : 'Falha ao salvar teste')
    } finally {
      setSavingEdit(false)
    }
  }

  async function onDeleteTest(testId: string) {
    setDeletingId(testId)
    try {
      await apiOkData(`/testes/${testId}`, { method: 'DELETE' })
      if (viewTestId === testId) setViewTestId(null)
      await loadTests()
    } catch (e) {
      setTestsErr(e instanceof ApiError ? e.message : 'Falha ao excluir teste')
    } finally {
      setDeletingId(null)
    }
  }

  function renderTestsList(list: AnyItem[]) {
    return (
      <div className="mt-4 space-y-3">
        {list.map((t) => {
          const id = getId(t)
          if (!id) return null
          const alreadyAnswered = canAnswer ? Boolean(answeredTestIds[id]) : false
          const score = canAnswer ? scoreByTestId[id] ?? null : null
          const canMutate = !isDavi && isOwner(t, user)

          return (
            <div
              key={id}
              className="relative min-h-24 overflow-visible rounded-2xl border border-white/10 p-5 transition hover:bg-white/5"
            >
              <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-cyan-400/80" aria-hidden />
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-base font-semibold tracking-tight text-zinc-100 sm:text-lg md:text-xl">
                    {asString(t.titulo) || 'Sem título'}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                    <span>{formatDayMonth(t.data)}</span>
                    {canAnswer && alreadyAnswered && score ? (
                      <span className="text-zinc-300">
                        Nota: <span className="font-semibold text-zinc-100">{score.correct}/{score.total}</span>{' '}
                        <span className="text-zinc-400">(C {score.correct} · E {score.wrong})</span>
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <OpenButton
                    onClick={() => {
                      setViewTestId(id)
                      setSubmitErr(null)
                      setSubmitOk(false)
                      void ensureQuestionsLoaded(id)
                      void ensureRespostasLoaded(id)
                    }}
                    label="Abrir teste"
                  />
                  {canMutate ? (
                    <>
                      <button
                        type="button"
                        aria-label="Editar"
                        title="Editar"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                        onClick={() => openEditTest(id, t)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                      <ConfirmDelete busy={deletingId === id} onConfirm={() => onDeleteTest(id)} />
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Page
      title="Testes"
      right={
        !isDavi ? (
          <div className="flex items-center gap-2">
            {!createOpen ? (
              <CreateButton onClick={() => setCreateOpen(true)} disabled={!canCreateTest} label="Criar teste" />
            ) : (
              <Button variant="secondary" onClick={closeCreate} disabled={creating}>
                Fechar
              </Button>
            )}
          </div>
        ) : null
      }
    >
      <Modal
        open={Boolean(viewTestId)}
        title="Visualizar teste"
        variant="view"
        onClose={() => {
          setViewTestId(null)
          setSubmitErr(null)
          setSubmitOk(false)
        }}
      >
        {(() => {
          if (!viewTestId) return null
          const t = sortedTests.find((x) => getId(x) === viewTestId) ?? null
          if (!t) return <div className="text-sm text-zinc-300">Registro não encontrado.</div>
          const qsState = questionsByTestId[viewTestId] ?? { status: 'idle' as const }
          const rsState = respostasByTestId[viewTestId] ?? { status: 'idle' as const }
          const alreadyAnswered = canAnswer ? Boolean(answeredTestIds[viewTestId]) : false

          return (
            <div className="space-y-4 open-frames">
              <div className="flex flex-col gap-1">
                <div className="text-lg font-semibold text-zinc-100">{asString(t.titulo) || 'Sem título'}</div>
                <div className="text-xs text-zinc-400">{formatDayMonth(t.data)}</div>
              </div>

              {qsState.status === 'loading' ? <div className="text-sm text-zinc-300">Carregando questões...</div> : null}
              {qsState.status === 'error' ? <InlineError message={qsState.message} /> : null}

              {qsState.status === 'ready' ? (
                <div className="space-y-3">
                  {qsState.items.length === 0 ? <div className="text-sm text-zinc-400">Sem questões.</div> : null}

                  {canAnswer ? (
                    <div className="space-y-3">
                      {rsState.status === 'loading' ? (
                        <div className="text-sm text-zinc-300">Carregando suas respostas...</div>
                      ) : null}
                      {rsState.status === 'error' ? <InlineError message={rsState.message} /> : null}

                      {qsState.items.map((q, idx) => {
                        const qid = getId(q)
                        if (!qid) return null

                        const existing =
                          alreadyAnswered && rsState.status === 'ready'
                            ? rsState.items.find((r) => asString(r.usuario_id) === user?.id && asString(r.questao_id) === qid)
                            : null

                        const correta = existing ? (typeof existing.correta === 'boolean' ? (existing.correta as boolean) : null) : null

                        return (
                          <div key={qid} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs font-medium text-zinc-400">Questão {idx + 1}</div>
                              {alreadyAnswered ? (
                                <div
                                  className={[
                                    'rounded-full border px-3 py-1 text-xs font-semibold',
                                    correta === true
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                                      : correta === false
                                        ? 'border-red-500/30 bg-red-500/10 text-red-100'
                                        : 'border-white/10 bg-white/5 text-zinc-200',
                                  ].join(' ')}
                                >
                                  {correta === true ? 'Certo' : correta === false ? 'Errado' : 'Aguardando correção'}
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">{asString(q.enunciado)}</div>
                            <div className="mt-3">
                              {alreadyAnswered ? (
                                <div>
                                  <div className="mb-1 text-xs font-medium text-zinc-300">Sua resposta</div>
                                  <div className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100">
                                    {asString(existing?.resposta_usuario)}
                                  </div>
                                </div>
                              ) : (
                                <Input
                                  label="Sua resposta"
                                  value={answersByQuestionId[qid] ?? ''}
                                  onChange={(v) => setAnswersByQuestionId((m) => ({ ...m, [qid]: v }))}
                                  placeholder="Digite sua resposta"
                                />
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {submitErr ? <InlineError message={submitErr} /> : null}
                      {submitOk ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                          Respostas enviadas.
                        </div>
                      ) : null}

                      {!alreadyAnswered ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button onClick={() => void onSubmitAnswers(viewTestId)} disabled={submittingAnswers}>
                            {submittingAnswers ? 'Enviando...' : 'Enviar respostas'}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rsState.status === 'loading' ? <div className="text-sm text-zinc-300">Carregando respostas...</div> : null}
                      {rsState.status === 'error' ? <InlineError message={rsState.message} /> : null}

                      {qsState.items.map((q, idx) => {
                        const qid = getId(q)
                        if (!qid) return null

                        const r =
                          rsState.status === 'ready' ? rsState.items.find((x) => asString(x.questao_id) === qid) ?? null : null
                        const correta = r ? (typeof r.correta === 'boolean' ? (r.correta as boolean) : null) : null
                        return (
                          <div key={qid} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs font-medium text-zinc-400">Questão {idx + 1}</div>
                              <div
                                className={[
                                  'rounded-full border px-3 py-1 text-xs font-semibold',
                                  !r
                                    ? 'border-white/10 bg-white/5 text-zinc-200'
                                    : correta === true
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                                      : correta === false
                                        ? 'border-red-500/30 bg-red-500/10 text-red-100'
                                        : 'border-white/10 bg-white/5 text-zinc-200',
                                ].join(' ')}
                              >
                                {!r ? 'Sem resposta' : correta === true ? 'Certo' : correta === false ? 'Errado' : 'Aguardando correção'}
                              </div>
                            </div>
                            <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">{asString(q.enunciado)}</div>

                            <div className="mt-3">
                              <div className="mb-1 text-xs font-medium text-zinc-300">Resposta</div>
                              <div className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100">
                                {r ? asString(r.resposta_usuario) : '—'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )
        })()}
      </Modal>

      <Modal
        open={editOpen}
        title="Editar teste"
        onClose={() => {
          if (savingEdit) return
          closeEditTest()
        }}
      >
        <div className="space-y-4">
          <Input label="Título" value={editTitulo} onChange={setEditTitulo} />
          <Input label="Data" type="date" value={editData} onChange={setEditData} />
          {editErr ? <InlineError message={editErr} /> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void onSaveEditTest()} disabled={savingEdit}>
              {savingEdit ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={closeEditTest} disabled={savingEdit}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(!isDavi && createOpen)}
        title="Criar teste"
        onClose={() => {
          if (creating) return
          closeCreate()
        }}
      >
        <div className="space-y-4">
          <Input label="Título" value={createTitulo} onChange={setCreateTitulo} placeholder="Ex.: Prova de Matemática" />

          <div className="space-y-3">
            <div className="text-sm font-semibold">Questões</div>
            {createQuestions.map((q, idx) => (
              <div key={q.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 text-xs font-medium text-zinc-400">Questão {idx + 1}</div>
                <div className="space-y-3">
                  <Textarea
                    label="Enunciado"
                    value={q.enunciado}
                    onChange={(v) =>
                      setCreateQuestions((cur) => cur.map((x) => (x.key === q.key ? { ...x, enunciado: v } : x)))
                    }
                    rows={3}
                    placeholder="Ex.: Quanto é 2+2?"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-xs text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white disabled:opacity-50"
                      disabled={createQuestions.length <= 1 || creating}
                      onClick={() => setCreateQuestions((cur) => cur.filter((x) => x.key !== q.key))}
                    >
                      Remover questão
                    </button>
                    <div className="text-xs text-zinc-500">Obrigatório</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setCreateQuestions((cur) => [...cur, newDraft()])} disabled={creating}>
                Adicionar questão
              </Button>
            </div>
          </div>

          {createErr ? <InlineError message={createErr} /> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void onCreateTestWithQuestions()} disabled={creating}>
              {creating ? 'Criando...' : 'Salvar teste'}
            </Button>
            <Button variant="secondary" onClick={closeCreate} disabled={creating}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {testsErr ? <InlineError message={testsErr} /> : null}

      {loadingTests ? <div className="text-sm text-zinc-300">Carregando...</div> : null}

      {!loadingTests && sortedTests.length === 0 ? <div className="text-sm text-zinc-400">Sem testes.</div> : null}

      {canAnswer ? (
        <div className="space-y-6">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Pendentes</div>
            <div className="mt-3">{renderTestsList(pendingTests)}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">Concluídas</div>
            <div className="mt-3">{renderTestsList(completedTests)}</div>
          </div>
        </div>
      ) : (
        <div>{renderTestsList(sortedTests)}</div>
      )}
    </Page>
  )
}

