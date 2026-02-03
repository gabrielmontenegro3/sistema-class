# Troubleshooting — Sistema Class (Frontend ↔ Backend)

Este documento explica por que aparecem os erros abaixo e como corrigir.

## 1) Erro: **JSON inválido**

### O que significa
Esse erro **não é do backend**. Ele acontece no **frontend**, quando você preenche o campo **“Extras (JSON opcional)”** com um JSON que o `JSON.parse(...)` não consegue interpretar.

O frontend só aceita:
- Um **objeto JSON** válido: `{ ... }`
- Com **aspas duplas** em chaves/strings (padrão JSON)
- **Sem** vírgula sobrando no final
- **Sem** comentários (JSON não permite `//` ou `/* */`)

### Exemplos

**Correto**
```json
{ "usuario_id": "uuid-aqui", "nota": 10, "anotou": true }
```

**Errado (aspas simples)**
```json
{ 'usuario_id': 'uuid-aqui' }
```

**Errado (vírgula no final)**
```json
{ "usuario_id": "uuid-aqui", }
```

**Errado (comentários)**
```json
{ "usuario_id": "uuid-aqui" } // comentario
```

### Como resolver
- Apague o conteúdo do “Extras (JSON)” e tente criar sem ele.
- Se precisar dele, cole um JSON válido (use os exemplos acima).
- Se quiser enviar só 1 campo extra, envie assim: `{ "agenda_id": "..." }`.

---

## 2) Erro: **Missing SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY in environment**

### O que significa
Esse erro **é do backend**. Ele indica que a API foi iniciada **sem** as variáveis de ambiente necessárias para conectar no Supabase.

Seu backend exige no `.env`:
- `SUPABASE_URL`
- **e uma das duas**:
  - `SUPABASE_KEY` (anon/publishable) **OU**
  - `SUPABASE_SERVICE_ROLE_KEY` (recomendado no backend, mas é sensível)

### Como resolver (passo a passo)
1) Vá para a pasta do backend (exemplo):
```powershell
cd C:\caminho\do\seu\backend
```

2) Instale dependências:
```powershell
npm install
```

3) Crie o `.env` a partir do exemplo:
```powershell
Copy-Item .env.example .env
```

4) Edite o `.env` e preencha:
```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
# escolha UMA:
SUPABASE_KEY=chave_anon_publishable_aqui
# OU (recomendado no backend):
SUPABASE_SERVICE_ROLE_KEY=chave_service_role_aqui
```

5) Rode o backend:
```powershell
npm run dev
```

6) Teste a saúde:
- `GET http://localhost:3333/health`

Se isso não responder `200`, o frontend vai continuar falhando ao tentar carregar listas/CRUD.

### Causas comuns
- Você criou o `.env`, mas colocou na pasta errada.
- Você editou o `.env`, mas não reiniciou o `npm run dev`.
- Você está rodando em outra porta (`3334`, etc.) e o frontend ainda está apontando para `3333`.

### Importante (segurança)
- **Nunca** coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- No frontend use apenas `VITE_API_URL` apontando para a **API Node/Express** (ex.: `http://localhost:3333/api`).

---

## 3) Conferindo o frontend

No frontend, confirme que você tem um `.env` (ou está usando o default) com:
```env
VITE_API_URL=http://localhost:3333/api
```

Depois reinicie o frontend:
```powershell
npm run dev
```

