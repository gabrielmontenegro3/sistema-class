import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../app/auth'
import { apiOkData, ApiError } from '../lib/api'
import { Button, InlineError, Page } from '../components/ui'

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

type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: T[] }

async function patchResposta(respostaId: string, body: Record<string, unknown>) {
  try {
    await apiOkData(`/teste-respostas/${respostaId}`, { method: 'PATCH', body: JSON.stringify(body) })
    return { ok: true as const }
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'Falha ao salvar correção'
    // Se o backend não tiver colunas de autor, tenta salvar somente "correta"
    if (Object.keys(body).length > 1) {
      try {
        await apiOkData(`/teste-respostas/${respostaId}`, { method: 'PATCH', body: JSON.stringify({ correta: body.correta }) })
        return { ok: true as const }
      } catch (e2) {
        return { ok: false as const, message: e2 instanceof ApiError ? e2.message : msg }
      }
    }
    return { ok: false as const, message: msg }
  }
}

export function CorrecoesPage() {
  const { user } = useAuth()
  const isDavi = (user?.nome ?? '').trim().toLowerCase() === 'davi'

  const [testsState, setTestsState] = useState<LoadState<AnyItem>>({ status: 'idle' })
  const [selectedTestId, setSelectedTestId] = useState<string>('')

  const [usersState, setUsersState] = useState<LoadState<AnyItem>>({ status: 'idle' })
  const daviUserId = useMemo(() => {
    if (usersState.status !== 'ready') return null
    const found = usersState.items.find((u) => (asString(u.nome) || '').trim().toLowerCase() === 'davi')
    return found ? getId(found) : null
  }, [usersState])

  const [questionsState, setQuestionsState] = useState<LoadState<AnyItem>>({ status: 'idle' })
  const [respostasState, setRespostasState] = useState<LoadState<AnyItem>>({ status: 'idle' })

  const [pendingCorretaByRespostaId, setPendingCorretaByRespostaId] = useState<Record<string, boolean | null>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setTestsState({ status: 'loading' })
      setUsersState({ status: 'loading' })
      try {
        const [tests, users] = await Promise.all([apiOkData<AnyItem[]>('/testes'), apiOkData<AnyItem[]>('/usuarios')])
        if (!mounted) return
        setTestsState({ status: 'ready', items: Array.isArray(tests) ? tests : [] })
        setUsersState({ status: 'ready', items: Array.isArray(users) ? users : [] })
      } catch (e) {
        if (!mounted) return
        const msg = e instanceof ApiError ? e.message : 'Falha ao carregar'
        setTestsState({ status: 'error', message: msg })
        setUsersState({ status: 'error', message: msg })
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const sortedTests = useMemo(() => {
    if (testsState.status !== 'ready') return []
    const arr = [...testsState.items]
    arr.sort((a, b) => asString(b.data).localeCompare(asString(a.data)))
    return arr
  }, [testsState])

  useEffect(() => {
    if (!selectedTestId) return
    let mounted = true
    async function loadTestData() {
      setSaveErr(null)
      setQuestionsState({ status: 'loading' })
      setRespostasState({ status: 'loading' })
      setPendingCorretaByRespostaId({})
      try {
        const qs = await apiOkData<AnyItem[]>(`/testes/${selectedTestId}/questoes`)

        // Tenta primeiro a rota nested; se necessário, você pode ajustar para /teste-respostas com query
        const rsAll = await apiOkData<AnyItem[]>(`/testes/${selectedTestId}/respostas`)

        if (!mounted) return
        setQuestionsState({ status: 'ready', items: Array.isArray(qs) ? qs : [] })

        const rsArr = Array.isArray(rsAll) ? rsAll : []
        const filtered = daviUserId ? rsArr.filter((r) => asString(r.usuario_id) === daviUserId) : rsArr
        setRespostasState({ status: 'ready', items: filtered })
      } catch (e) {
        if (!mounted) return
        const msg = e instanceof ApiError ? e.message : 'Falha ao carregar dados do teste'
        setQuestionsState({ status: 'error', message: msg })
        setRespostasState({ status: 'error', message: msg })
      }
    }
    void loadTestData()
    return () => {
      mounted = false
    }
  }, [daviUserId, selectedTestId])

  const questionById = useMemo(() => {
    const m: Record<string, AnyItem> = {}
    if (questionsState.status !== 'ready') return m
    for (const q of questionsState.items) {
      const id = getId(q)
      if (id) m[id] = q
    }
    return m
  }, [questionsState])

  return (
    <Page title="Correções" description="Marque certo/errado nas respostas do Davi.">
      {isDavi ? <InlineError message="O usuário Davi não pode acessar a tela de correções." /> : null}

      <div className="rounded-2xl bg-white/5 p-5">
        <div className="mb-3 text-sm font-semibold">Selecionar teste</div>
        {testsState.status === 'loading' ? <div className="text-sm text-zinc-300">Carregando testes...</div> : null}
        {testsState.status === 'error' ? <InlineError message={testsState.message} /> : null}

        {usersState.status === 'error' ? <InlineError message={usersState.message} /> : null}
        {usersState.status === 'ready' && !daviUserId ? (
          <InlineError message='Não encontrei o usuário "Davi" em /api/usuarios.' />
        ) : null}

        {testsState.status === 'ready' ? (
          <div className="mt-3">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-zinc-300">Teste</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                disabled={isDavi || sortedTests.length === 0}
              >
                <option value="" disabled>
                  {sortedTests.length ? 'Selecione...' : 'Nenhum teste encontrado'}
                </option>
                {sortedTests.map((t) => {
                  const id = getId(t)
                  if (!id) return null
                  return (
                    <option key={id} value={id}>
                      {asString(t.titulo) || 'Sem título'} — {asString(t.data)}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      {selectedTestId ? (
        <div className="rounded-2xl bg-white/5 p-5">
          <div className="mb-3 text-sm font-semibold">Respostas do Davi</div>
          {saveErr ? <InlineError message={saveErr} /> : null}

          {questionsState.status === 'loading' || respostasState.status === 'loading' ? (
            <div className="text-sm text-zinc-300">Carregando...</div>
          ) : null}

          {questionsState.status === 'error' ? <InlineError message={questionsState.message} /> : null}
          {respostasState.status === 'error' ? <InlineError message={respostasState.message} /> : null}

          {respostasState.status === 'ready' ? (
            <div className="mt-3 space-y-3">
              {respostasState.items.length === 0 ? <div className="text-sm text-zinc-400">Sem respostas.</div> : null}

              {respostasState.items.map((r) => {
                const rid = getId(r)
                if (!rid) return null
                const questaoId = asString(r.questao_id)
                const q = questionById[questaoId]
                const atualCorreta = typeof r.correta === 'boolean' ? (r.correta as boolean) : null
                const pend = pendingCorretaByRespostaId[rid] ?? null

                const chosen = pend !== null ? pend : atualCorreta

                return (
                  <div key={rid} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-zinc-400">Questão</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">{q ? asString(q.enunciado) : '(não encontrada)'}</div>

                    <div className="mt-3 text-xs text-zinc-400">Resposta do Davi</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">{asString(r.resposta_usuario)}</div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={[
                          'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                          chosen === true
                            ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100'
                            : 'border-white/10 bg-zinc-950/30 text-white hover:bg-white/10',
                        ].join(' ')}
                        onClick={() => setPendingCorretaByRespostaId((m) => ({ ...m, [rid]: true }))}
                        disabled={isDavi}
                      >
                        Certo
                      </button>
                      <button
                        type="button"
                        className={[
                          'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                          chosen === false
                            ? 'border-red-500/40 bg-red-500/20 text-red-100'
                            : 'border-white/10 bg-zinc-950/30 text-white hover:bg-white/10',
                        ].join(' ')}
                        onClick={() => setPendingCorretaByRespostaId((m) => ({ ...m, [rid]: false }))}
                        disabled={isDavi}
                      >
                        Errado
                      </button>

                      <Button
                        onClick={() => {
                          const val = pendingCorretaByRespostaId[rid]
                          if (val === null || val === undefined) return
                          if (!user) return
                          void (async () => {
                            setSaveErr(null)
                            setSavingId(rid)
                            const res = await patchResposta(rid, {
                              correta: val,
                              autor_correcao_id: user.id,
                              autor_correcao_nome: user.nome,
                            })
                            setSavingId(null)
                            if (!res.ok) setSaveErr(res.message)
                            else {
                              // atualiza estado local para refletir imediatamente
                              setRespostasState((cur) => {
                                if (cur.status !== 'ready') return cur
                                return {
                                  status: 'ready',
                                  items: cur.items.map((x) => (getId(x) === rid ? { ...x, correta: val } : x)),
                                }
                              })
                            }
                          })()
                        }}
                        disabled={isDavi || savingId === rid || (pendingCorretaByRespostaId[rid] ?? null) === null}
                      >
                        {savingId === rid ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>

                    <div className="mt-2 text-xs text-zinc-500">
                      Autor da correção: <span className="text-zinc-300">{user?.nome ?? ''}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </Page>
  )
}

