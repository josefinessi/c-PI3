# Gestão de Férias (PI3) — API (.NET 8 + EF Core + PostgreSQL)

API para cadastro de usuários/setores e **gestão de solicitações de férias** com fluxo de aprovação, validação de períodos e controle de **limite de férias simultâneas por setor**.

## Stack
- .NET 8
- EF Core 8
- PostgreSQL (Npgsql)
- JWT Auth + Roles (`Gestor`, `Colaborador`, etc.)
- Swagger

---

## Regras de Negócio (importante pro front)

### 1) Usuário e Matrícula
- Usuários são identificados por **Matrícula** (string `"0001"` até `"9999"`).
- No `register`, a matrícula é **gerada automaticamente**.
- Se não informar setor no cadastro, cai no setor padrão **"Sem Setor"**:
  - `SetorId`: `11111111-1111-1111-1111-111111111111`

### 2) Setor e Limite de férias simultâneas
- Cada setor tem `limiteFeriasSimultaneas` (int).
- Esse limite define **quantas férias aprovadas** podem acontecer no mesmo dia dentro do setor.
- O gestor pode atualizar via:
  - `PATCH /api/setores/{id}/limite-ferias`
- Regras:
  - `limiteFeriasSimultaneas >= 1`

### 3) Solicitação de Férias (períodos)
Ao solicitar férias:
- Deve enviar **1 ou mais períodos**
- Cada período precisa ter `inicio` e `fim`
- `inicio <= fim`
- **Períodos não podem se sobrepor** dentro do mesmo pedido
- A soma total deve ser **EXATAMENTE 30 dias corridos**
  - dias corridos = `fim - inicio + 1`
- Capacidade do setor:
  - Se já atingiu o limite em algum dia por **férias aprovadas**, a solicitação é bloqueada (erro)
  - Se existir **pendência** de outros pedidos em algum dia, o pedido pode ser criado, mas volta com **avisos** (não bloqueia)

### 4) Status das férias (enum)
Fluxo típico:
- `Pendente` → `Aprovada` ou `Negada`
- `Pendente` → `Cancelada` (somente o próprio usuário)
- Regras:
  - **Somente `Pendente` pode ser aprovada, negada ou cancelada**
  - Aprovar/Negar exige `AprovadoPorId`/`NegadoPorId` válido (precisa existir na tabela Usuarios)

### 5) Calendário do Setor
Endpoint retorna ocupação por dia (não por período):
- `GET /api/Ferias/calendario/setor/{setorId}?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`
- Se `inicio` e `fim` não forem enviados:
  - `inicio = hoje (UTC)`
  - `fim = inicio + 9 dias` (por padrão do controller atual)

---

## Autenticação (JWT)

### Header obrigatório (endpoints protegidos)

Authorization: Bearer <TOKEN>


### Claims importantes no token
- Role (ex: `Gestor`)
- Matricula (claim `"Matricula"`)

**Obs:** No módulo de férias ainda estamos usando matrícula na rota (ex: `/solicitar/{matricula}`), mas a ideia é migrar depois para pegar do claim do JWT.

---

## Endpoints e payloads

## 1) Auth

### POST `/api/auth/register` (público)
Cria usuário e devolve matrícula + token.

**Body**
```json
{
  "nome": "Maria da Silva",
  "senha": "123456",
  "role": "Gestor",
  "setorNome": "enfermagem"
}

Response 200

{
  "matricula": "0006",
  "token": "..."
}

Regras:

role deve ser algo aceito pelo enum UserRole (ex: "Gestor", "Colaborador")

setorNome é opcional:

se vier e não existir no banco → erro

se não vier → "Sem Setor"

POST /api/auth/login (público)

Body

{
  "matricula": "0006",
  "senha": "123456"
}

Response 200

{
  "token": "..."
}
2) Setores (precisa token)
GET /api/setores

Lista setores

Response 200

[
  {
    "id": "ee08e18d-2205-4f5f-b07f-6f1cf77c90ff",
    "nome": "enfermagem",
    "limiteFeriasSimultaneas": 4
  }
]
POST /api/setores (Somente Gestor)

Body

{ "nome": "radiologia" }
PATCH /api/setores/{id}/limite-ferias (Somente Gestor)

Atualiza limite do setor.

Body

{ "limiteFeriasSimultaneas": 4 }
3) Usuários
GET /api/usuarios

Lista usuários (ATENÇÃO: atualmente está [AllowAnonymous] no controller)

GET /api/usuarios/{id}
GET /api/usuarios/matricula/{matricula}
GET /api/usuarios/buscar?nome=joao
PUT /api/usuarios/{id} (Somente Gestor)
PUT /api/usuarios/matricula/{matricula} (Somente Gestor)

Body (UpdateUserRequest)

{
  "nome": "Novo Nome",
  "senha": "novaSenha",
  "role": "Gestor",
  "setorNome": "enfermagem"
}

Observações:

Campos são opcionais

role:

aceita "Gestor"/"Colaborador" etc

ignora "string" (placeholder do Swagger)

setorNome:

se vier vazio → cai em "Sem Setor"

se vier com nome inexistente → erro

4) Férias (precisa token)
POST /api/Ferias/solicitar/{matricula}

Solicita férias (gera registro Pendente)

Body

{
  "periodos": [
    { "inicio": "2026-03-01", "fim": "2026-03-30" }
  ]
}

Response 200

{
  "id": "uuid",
  "matricula": "0006",
  "nome": "Maria da Silva",
  "setorNome": "enfermagem",
  "status": 0,
  "createdAt": "2026-02-26T17:19:35Z",
  "periodos": [
    { "inicio": "2026-03-01", "fim": "2026-03-30" }
  ],
  "avisos": []
}

Erros comuns:

Soma != 30 dias → erro

Períodos se sobrepõem → erro

Conflito de limite por férias aprovadas no setor → erro

GET /api/Ferias/minhas/{matricula}

Lista férias do usuário

GET /api/Ferias/pendentes/setor/{setorId}

Lista solicitações pendentes do setor

POST /api/Ferias/{feriasId}/aprovar

Aprova solicitação (somente se estiver Pendente)

Body

{ "aprovadoPorId": "uuid-do-usuario-gestor" }

Response

204 NoContent quando sucesso

Erro comum

FK_Ferias_Usuarios_AprovadoPorId → aprovadoPorId não existe na tabela Usuarios

POST /api/Ferias/{feriasId}/negar

Nega solicitação (somente se estiver Pendente)

Body

{
  "negadoPorId": "uuid-do-usuario-gestor",
  "motivo": "Operação não permite férias"
}

Response

204 NoContent

DELETE /api/Ferias/{feriasId}/cancelar/{matricula}

Cancela solicitação (somente se estiver Pendente e for do próprio usuário)

Response

204 NoContent

GET /api/Ferias/calendario/setor/{setorId}

Retorna ocupação por dia no intervalo.

Com query:

?inicio=2026-03-01&fim=2026-03-31

Sem query:

inicio = hoje UTC

fim = inicio + 9

Response 200

[
  { "dia": "2026-03-01", "aprovadas": 1, "pendentes": 0, "limite": 4 }
]
Convenções / Observações para o Front

Sempre enviar Authorization: Bearer <token> nos endpoints protegidos.

Datas sempre no formato ISO:

YYYY-MM-DD para DateOnly

Para aprovar/negar:

aprovadoPorId / negadoPorId deve ser o Id real do usuário gestor (não é matrícula).

Para solicitar férias:

payload obrigatório: periodos[]

total = 30 dias corridos

O calendário retorna por dia (ótimo pra montar UI tipo “heatmap” / tabela).