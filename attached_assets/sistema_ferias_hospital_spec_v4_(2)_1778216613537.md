# Sistema de Gestão de Férias Hospitalar v3 — Especificação para Apps Script

Documento técnico consolidado a partir da análise QA do sistema. Serve como briefing para implementação em Google Apps Script com backend de dados configurável (Firestore, Supabase ou Google Sheets — ver Seção 14). Não substitui o documento original — complementa, fixando as decisões tomadas durante a revisão.

---

## 1. Visão geral

Sistema web de gestão de férias para hospital, rodando em Google Apps Script (backend `.gs` + frontend `.html` servido pelo próprio Apps Script). Três papéis: Funcionário, Chefia, Admin. Fluxo de aprovação em cascata (chefia → admin), com regras de cobertura mínima e quinzena para proteger a operação.

**Backend de dados configurável** (escolhido uma vez no setup, ver Seção 14): Firestore, Supabase ou Google Sheets. As regras de negócio não conhecem o banco — falam apenas com `Repositories`, que delegam para um `DbAdapter` específico do backend escolhido (Seção 13). Quando o banco principal é Firestore ou Supabase, o sistema replica todas as gravações para uma planilha Google Sheets dedicada à **auditoria** (Seção 14).

**Cargos do sistema (fixos no código):**
- `funcionario` — usuário comum
- `chefia` — uma por setor (10 chefias no total, uma para cada setor clínico)
- `admin` — único no sistema inteiro

**Setores cadastrados no seed (11):** os 10 setores clínicos abaixo + 1 setor "Administrativo" para hospedar funcionários sem vínculo clínico. Admin pode cadastrar setores adicionais pelo painel.

---

## 2. Autenticação

| Papel | Método | Detalhes |
|---|---|---|
| Funcionário / Chefia | Email + Senha | Senha definida no cadastro inicial pelo admin/chefia. Recuperação por email. |
| Admin | Email + Senha | No 1º login, modal força troca da senha padrão. Recuperação por email. |

**Recuperação de senha (todos os papéis):**
- Botão "Esqueci minha senha" na tela de login
- Sistema envia link de redefinição para o email cadastrado do usuário
- Link válido por 30 min, uso único (S9)
- O email de recuperação pode ser de qualquer provedor (Gmail, Outlook, Yahoo, corporativo, etc.) — não há restrição de provedor para o destino do link
- Após redefinir, sessões anteriores são invalidadas

**Regras transversais:**
- Mensagem de erro sempre genérica: "Dados incorretos. Tente novamente." (protocolo S1 — não revela existência de email)
- Bloqueio: 5 falhas de login → 15 min de bloqueio (S3)
- Domínio de email do **cadastro do usuário** validado contra `DOMINIOS_PERMITIDOS` (S2). Lista vazia = aceita qualquer domínio. Esta lista controla apenas o domínio do email cadastrado, não o destino do link de recuperação.
- Sessão dura 8h (S5)
- Inatividade de 15 min → tela trava e pede reautenticação (V12)
- Senhas armazenadas com hash (nunca em texto puro)

---

## 3. Setores — Seed inicial

Os 11 setores abaixo são pré-cadastrados no sistema. Campo `minimoPresencial` fica fora do seed (admin preenche depois pelo painel se quiser ativar a regra L7).

| # | Nome do Setor | Crítico | 24h |
|---|---|:---:|:---:|
| 1 | Quinto Andar | ✅ | ✅ |
| 2 | Sexto Andar | ✅ | ✅ |
| 3 | Serviço de Pronto Atendimento | ✅ | ✅ |
| 4 | Ambulatório | ❌ | ❌ |
| 5 | Radiologia | ❌ | ❌ |
| 6 | Radioterapia | ❌ | ❌ |
| 7 | Central de Quimioterapia | ✅ | ❌ |
| 8 | Serviço de Educação Continuada / Navegação de Paciente | ❌ | ❌ |
| 9 | Centro Cirúrgico | ✅ | ❌ |
| 10 | Central de Material e Esterilização | ❌ | ❌ |
| 11 | Administrativo | ❌ | ❌ |

**Estrutura de cada setor (collection `setores`):**
- `nomeSetor` (texto único)
- `critico` (boolean) — liga regras L2/L3 mesmo com `REGRAS_QUINZENA_TODOS_SETORES` desligado
- `setor24h` (boolean) — define se aceita plantão Diurno/Noturno (true) ou Único (false)
- `minimoPresencial` (number, default `0`) — cobertura mínima absoluta (regra L7)
- `maxPorQuinzena` (number, default `1`) — define o teto das regras L2 e L3. Admin escolhe via **select de 1 a 50** no cadastro do setor. Vale independentemente para Enfermeiros e Técnicos (cada categoria conta no próprio bucket)
- `ativo` (boolean) — soft delete

**Sem hard delete.** Antes de desativar um setor, sistema verifica se ainda há funcionários ativos vinculados (E13). Renomear setor propaga via batch para todos os usuários e pedidos.

---

## 4. Categorias — Seed inicial (cadastráveis pelo admin)

Categorias **não são hardcoded**. Existe collection `categorias` no banco escolhido. Admin pode criar novas pelo painel.

**Vínculo categoria ↔ setor:** cada categoria é vinculada a um setor específico. No cadastro de funcionário, o select de categoria filtra automaticamente pelo setor escolhido.

**Seed (21 categorias):**

| Setor | Categorias |
|---|---|
| Quinto Andar | Enfermeiro de Quinto Andar, Técnico de Quinto Andar |
| Sexto Andar | Enfermeiro de Sexto Andar, Técnico de Sexto Andar |
| Serviço de Pronto Atendimento | Enfermeiro de Serviço de Pronto Atendimento, Técnico de Serviço de Pronto Atendimento |
| Ambulatório | Enfermeiro de Ambulatório, Técnico de Ambulatório |
| Radiologia | Enfermeiro de Radiologia, Técnico de Radiologia |
| Radioterapia | Enfermeiro de Radioterapia, Técnico de Radioterapia |
| Central de Quimioterapia | Enfermeiro de Central de Quimioterapia, Técnico de Central de Quimioterapia |
| Serviço de Educação Continuada / Navegação de Paciente | Enfermeiro de Serviço de Educação Continuada / Navegação de Paciente, Técnico de Serviço de Educação Continuada / Navegação de Paciente |
| Centro Cirúrgico | Enfermeiro de Centro Cirúrgico, Técnico de Centro Cirúrgico |
| Central de Material e Esterilização | Enfermeiro de Central de Material e Esterilização, Técnico de Central de Material e Esterilização |
| Administrativo | Administrativo |

**Estrutura de cada categoria:**
- `nomeCategoria` (texto)
- `setor` (referência ao setor — categoria pertence a um setor)
- `prefixo` (`Enfermeiro` / `Técnico` / `Administrativo`) — usado pela regra L2/L3 para identificar o tipo
- `aplicaQuinzena` (boolean) — true para Enfermeiro e Técnico, false para Administrativo
- `ativo` (boolean)

---

## 5. Cadastro de Funcionário

| Campo | Tipo | Obrigatório | Quem preenche | Observação |
|---|---|:---:|---|---|
| id (matrícula) | string 7-9 dígitos | ✅ | Admin/Chefia | Único (E1) |
| nome | texto | ✅ | Admin/Chefia | Sanitizado (S4) |
| email | email | ✅ | Admin/Chefia | Único + domínio permitido (S2) |
| setor | select | ✅ | Admin (qualquer) / Chefia (só o próprio) | Setor precisa existir (E13) |
| plantao | "Diurno" / "Noturno" / "Unico" | ✅ | Admin/Chefia | "Unico" se setor não-24h |
| permissao | funcionario / chefia / admin | ✅ | Só admin atribui chefia ou admin (V4) | Chefia só cria funcionário |
| categoria | select filtrado pelo setor | ✅ | Admin/Chefia | Filtrado pelo setor escolhido |
| dataAdmissao | DD/MM/AAAA | ✅ | Admin/Chefia | Usada na regra dos 12 meses (E8) |

**Auto-preenchidos pelo sistema:**
- `ativo: true`
- `criadoPor`, `criadoEm`
- `senhaHash` (senha padrão gerada/definida no cadastro) e `primeiroLogin: true` para todos os papéis — força troca de senha no primeiro acesso

---

## 6. Formulário de Férias (Funcionário)

Única tela do funcionário. Permite até 3 períodos de férias dentro do ano-base.

| Campo | Tipo | Obrigatório | Validação |
|---|---|:---:|---|
| Período 1 — Início | Data | ✅ | Antecedência mín. 30 dias |
| Período 1 — Fim | Data | ✅ | Posterior ao início |
| Período 2 — Início | Data | ❌ | Sem sobreposição com P1 |
| Período 2 — Fim | Data | ❌ | Posterior ao início do P2 |
| Período 3 — Início | Data | ❌ | Sem sobreposição |
| Período 3 — Fim | Data | ❌ | — |
| Adiantamento de férias? | SIM/NÃO | ✅ | — |
| Adiantamento de 13º? | SIM/NÃO | ✅ | — |

**Calculados automaticamente:** `totalDias` (máx 30), `anoBase` (ano corrente + 1), `idUsuario`, `nome`, `setor`, `plantao`, `categoria` (vêm da sessão).

---

## 7. Regras de Negócio (resumo)

### Bloqueios no envio (validações no formulário)
- **E2** — sem sobreposição com pedidos já aprovados
- **E3** — só 1 pedido pendente por ano
- **E4** — datas válidas (sem 31/02, fim depois do início)
- **E5** — total ≤ 30 dias
- **E6** — antecedência mínima de 30 dias
- **E7** — reenvio substitui pedido pendente (não acumula)
- **E8** — funcionário com ≥ 12 meses de admissão
- **E9** — pedido `aprovado_admin` é imutável

### Regras de cobertura (avaliadas em "Gerar Férias" e na aprovação)
- **L1** — máx 50% do setor ausente simultaneamente
- **L2** — máx `setor.maxPorQuinzena` Enfermeiros do mesmo setor de férias por quinzena, por plantão (default `1`, configurável de 1 a 50 pelo admin no cadastro do setor)
- **L3** — máx `setor.maxPorQuinzena` Técnicos do mesmo setor de férias por quinzena, por plantão (mesmo valor de L2, contagem independente)
- **L7** — cobertura mínima absoluta (`minimoPresencial` do setor)

**Como L2/L3 funcionam com categorias especializadas:**

A regra conta **por categoria específica**, dentro de cada setor, respeitando o teto definido em `maxPorQuinzena`. Cada setor é uma "ilha" de contagem.

Exemplo com `maxPorQuinzena = 1` (default): em Radiologia, podem estar de férias na mesma quinzena 1 Enfermeiro de Radiologia + 1 Técnico de Radiologia, mas não 2 Enfermeiros de Radiologia juntos.

Exemplo com `maxPorQuinzena = 2`: em Radiologia, podem estar de férias na mesma quinzena até 2 Enfermeiros de Radiologia + até 2 Técnicos de Radiologia. O bucket de Enfermeiro e o de Técnico continuam independentes.

Em paralelo, no Centro Cirúrgico (que pode ter outro `maxPorQuinzena`), a contagem segue o teto próprio sem afetar a Radiologia.

**Categoria Administrativo não entra em L2/L3** (campo `aplicaQuinzena: false`).

### Soft delete (E12)
Nada é apagado de verdade. Todo "delete" muda `ativo` para `false`.

---

## 8. Estados e Transições do Pedido

```
[não existe] ─envia──► [pendente]
                          │
              chefia aprova
                          ▼
                   [aprovado_chefia]
                          │
              admin aprova
                          ▼
                   [aprovado_admin]   ◄── ESTADO FINAL (imutável — E9)
                          
recusa em qualquer nível ──► [reprovado_chefia] ou [reprovado_admin]
                                      │
                          (volta a poder enviar novo)
```

**Transições proibidas:**
- `pendente` → `aprovado_admin` direto (admin não vê pedidos pendentes — V7)
- `aprovado_admin` → outro estado, sem cancelamento explícito (E9)
- Editar pedido em ano encerrado, mesmo sendo admin (V6)
- Aprovar pedido com problema de quinzena ativo (E10) — sistema mostra: "Problema de quinzena, por favor conversar com o funcionário..."
- Dois admins editarem o mesmo pedido ao mesmo tempo (C6) — segundo admin recebe: "Este pedido já foi processado por outro usuário."

**Visibilidade por estado (V7):**

| Estado | Funcionário | Chefia | Admin |
|---|:---:|:---:|:---:|
| pendente | próprio | do setor | ❌ |
| aprovado_chefia | próprio | do setor | ✅ (para aprovar) |
| aprovado_admin | próprio | do setor | ✅ |
| reprovado_* | próprio | do setor | ✅ |

---

## 9. Painéis por Papel

**Navegação global (todas as páginas, todos os papéis):**
- Botão **Voltar** — fixo no cabeçalho, retorna à tela anterior dentro do painel. Na tela inicial do papel (ex: única tela do funcionário), o botão fica oculto ou desabilitado.
- Botão **Sair** — fixo no cabeçalho, encerra a sessão e redireciona para a tela de login. Disponível em todas as páginas, inclusive na de troca de senha do primeiro acesso.

Ambos os botões aparecem em posição consistente em todo o sistema (cabeçalho fixo).

### Funcionário
**Única tela:** formulário de férias + calendário de conflitos anonimizado ("2 pessoas do seu setor neste período", sem nomes — V8) + logout.

**Não vê:** colegas, listas, logs, configurações, botões de aprovação.

### Chefia
**Restrição global (V2):** só vê dados do próprio setor. Emails de gente fora do setor aparecem mascarados (`m***a@hospital.com` — V9).

| Aba | Função |
|---|---|
| Cadastros | CRUD de funcionários do próprio setor (criar, editar, desativar). Não promove para chefia/admin (V4), não reativa, não muda cargo |
| Respostas | Aprova/recusa pedidos `pendente` do setor. Recusa exige motivo. Não consegue aprovar com problema de quinzena (E10) |
| Dashboard | Calendário do setor com nomes, lista de problemas de quinzena, resumo de aprovações |
| Logs | Histórico de ações do setor (V10) |

**Notificação:** ao desativar funcionário, admin recebe email automático.

**Tira férias?** Só se parâmetro `CHEFIA_ADMIN_TIRAM_FERIAS = true`.

### Admin
**Visão global (V3):** vê o hospital inteiro, sem filtro.

| Aba | Função |
|---|---|
| Cadastros | CRUD completo de usuários, setores e categorias. Único que reativa funcionário e promove para chefia |
| Respostas | Só vê pedidos `aprovado_chefia`. Aprova (estado final) ou recusa (volta para chefia) |
| Dashboard | Calendário global, listas de problemas de quinzena, listas de adiantamento (férias e 13º — separadas), botão "Gerar Férias" (valida L1, L2, L3, L7), encerrar/reabrir ano, enviar email em massa |
| Logs | Todos os logs com filtros (data, usuário, ação) |
| Parâmetros | Toggles do sistema (exclusivo do admin) |

**Limites do admin:**
- Não apaga registro real (soft delete sempre — E12)
- Não edita `aprovado_admin` sem cancelar antes (E9)
- Não aprova com problema de quinzena (E10)
- Reabrir ano encerrado exige justificativa registrada no log
- Concorrência: dois admins no mesmo pedido → segundo recebe erro (C6)

---

## 10. Parâmetros (PainelParametros — só admin)

Toggles em runtime. Alterar parâmetro **não invalida pedidos existentes** — só afeta pedidos novos.

| Parâmetro | Default | Quando `true` | Quando `false` |
|---|---|---|---|
| `BLOQUEAR_QUINZENA_CALENDARIO` | false | Calendário desabilita datas com conflito; funcionário nem seleciona | Funcionário escolhe livre, conflito vai para chefia/admin decidir |
| `CHEFIA_ADMIN_TIRAM_FERIAS` | true | Chefia e admin também preenchem formulário | Só funcionário comum |
| `REGRAS_QUINZENA_TODOS_SETORES` | false | L2/L3 valem para todo o hospital | L2/L3 só para setores com `critico: true` |
| `DOMINIOS_PERMITIDOS` | `[]` | Lista de domínios aceitos no cadastro de email | Vazio = aceita qualquer email válido |

**Tabela de precedência crítico × parâmetro global:**

| `setor.critico` | `REGRAS_QUINZENA_TODOS_SETORES` | Aplica L2/L3? |
|:---:|:---:|:---:|
| false | false | ❌ |
| true | false | ✅ |
| false | true | ✅ |
| true | true | ✅ (redundante) |

O parâmetro global tem precedência. A flag `critico` do setor é fallback quando o global está desligado.

---

## 11. Estratégia de Testes — Stubs Passivos

**Princípio:** o código de produção **não conhece o modo de teste**. Em vez de toggles globais que desligam validações (`MODO_DEV`, `PROTOCOLOS.E2 = false` etc.), os testes substituem dependências por **stubs passivos** — funções dummy que retornam sucesso/passam sem efeito colateral, isolando a função principal sob teste.

**Por que stubs em vez de flags globais:**
- Zero `if (MODO_DEV)` espalhado pelo código de produção
- A função sob teste executa seu caminho real, sem desvios
- Stubs ficam confinados ao setup do teste, nunca chegam em produção
- Testes ficam previsíveis: o stub sempre se comporta igual
- Sem risco de subir código em produção com proteção desligada por engano

**Padrão de implementação (Apps Script):**

Funções "decoráveis" (validadores, log, email, banco, auth) ficam num namespace `Deps` que pode ser sobrescrito no setup do teste:

```javascript
// Em produção (carregado por padrão)
const Deps = {
  registrarLog: registrarLogReal,
  enviarEmail: enviarEmailReal,
  validarQuinzena: validarQuinzenaReal,
  validarCobertura: validarCoberturaReal,
  getDbAdapter: getDbAdapterReal,        // Firestore, Supabase ou Sheets (Seção 14)
  getAuditExporter: getAuditExporterReal, // replicação para Sheets de auditoria
  getSessionUser: getSessionUserReal
};

// Em testes — stubs passivos
Deps.registrarLog     = () => {};                    // no-op
Deps.enviarEmail      = () => ({ ok: true });        // sempre sucesso
Deps.validarQuinzena  = () => ({ ok: true });        // não bloqueia
Deps.validarCobertura = () => ({ ok: true });        // não bloqueia
Deps.getDbAdapter     = () => dbAdapterFake;         // banco em memória
Deps.getAuditExporter = () => ({ replicar: () => {} }); // no-op
Deps.getSessionUser   = () => usuarioMock;           // usuário pré-definido
```

**Categorias de stub passivo:**

| Categoria | Comportamento real | Stub passivo |
|---|---|---|
| Log | Grava em `logs/` | No-op |
| Email | Envia notificação por SMTP | No-op (ou log silencioso) |
| Validações de envio (E2-E13) | Pode bloquear o envio | Retorna `{ ok: true }` |
| Regras de cobertura (L1, L2, L3, L7) | Pode bloquear aprovação | Retorna `{ ok: true }` |
| Auth/Sessão | Verifica usuário logado | Retorna usuário mock |
| DbAdapter | Persiste no backend escolhido (Firestore / Supabase / Sheets) | Fake em memória (objeto JS) |
| AuditExporter | Replica writes para Sheets de auditoria | No-op |

**Regras de arquitetura para que o padrão funcione:**

- Funções **nunca chamam** `Logger.log`, `MailApp.sendEmail`, `UrlFetchApp` ou banco direto (Firestore/Supabase/Sheets) — sempre via `Deps.*` ou via `Repositories` (que por sua vez usam `Deps.getDbAdapter()`). Isso garante que o stub possa substituir.
- Validadores devolvem `{ ok: boolean, motivo?: string }` em vez de lançar exceção, facilitando o stub neutro.
- Cada teste de função reseta `Deps` para os reais ao final (`afterEach`), evitando vazamento entre suites.
- A função principal sob teste **nunca é stubada** — é o ponto que se quer exercitar de verdade.

**Granularidade:**

- **Teste unitário** — substitui tudo exceto a função sob teste. Ex: testar `enviarPedido()` com `validarQuinzena` e `DbAdapter` stubados isola a lógica de transição de estado.
- **Teste de integração** — substitui só infra externa (email, `AuditExporter`). Mantém validações e adapter reais (apontando para um banco de teste).
- **Teste E2E** — mantém tudo real exceto email (para não disparar mensagens nos QA).

**Em produção:** `Deps` aponta sempre para as implementações reais. Não há toggle, não há flag, não há nível de desativação.

---

## 12. Decisões de Arquitetura

### Acoplamento: o que compartilhar, o que isolar

**Compartilhado (intencional):**
- `getSessionUser()` — usado por ~25 funções
- `registrarLog()` — ~20 funções
- `getParametro(chave)` — leitura dos toggles da Seção 10 (`BLOQUEAR_QUINZENA_CALENDARIO` etc.) — ~15 funções
- **Repositories** (`UsuarioRepository`, `SetorRepository`, `CategoriaRepository`, `PedidoRepository`, `LogRepository`, `ParametroRepository`, ...) — encapsulam todo o acesso ao banco. Funções de regra/serviço falam só com repositories, nunca com banco direto. Internamente, repositories usam `Deps.getDbAdapter()` (Firestore / Supabase / Sheets — Seção 14)

Esses são **infraestrutura** (sessão, banco, log, parâmetros runtime). Duplicar essa lógica em cada função geraria código repetido e difícil de manter. Todos eles são acessados via o namespace `Deps` (Seção 11) para permitir substituição por stub em testes.

### Camada de acesso a dados

Repository por entidade + Mapper por entidade + DbAdapter por backend (detalhes na Seção 13). Trocar Firestore por Supabase é trocar adapter, sem tocar em uma única linha de regra de negócio. As collections lógicas (Seção 15) são as mesmas independentemente do banco; o Mapper resolve as diferenças de formato.

**Independente (a buscar):**
- Regras de negócio. Funções como `verificarQuinzenaEnfermeiro` e `verificarQuinzenaTecnico` devem ser unificadas em `verificarQuinzena(prefixoCategoria)` — assim qualquer categoria nova (ex: futuras especializações) aproveita a mesma função sem duplicação.

### Categorias e cargos

- **Categorias:** dinâmicas. Collection `categorias` no banco escolhido, vinculadas a setor, com flag `aplicaQuinzena`. Admin cadastra/edita pelo painel.
- **Cargos:** fixos no código (`funcionario`, `chefia`, `admin`). São estrutura de permissão, não dado de negócio.

### Soft delete em tudo
Nem usuário, nem setor, nem categoria, nem pedido são apagados de verdade. Sempre `ativo: false`. Auditoria completa preservada.

---

## 13. Camada de Acesso a Dados — Repository, Mapper e Adapters

Toda regra de negócio e todo serviço falam apenas com **Repositories**. Repositories falam com **Mappers** (para traduzir entre domínio e formato do banco) e com o **DbAdapter** (para executar a operação física). Trocar de banco é trocar adapter; nenhuma regra de negócio precisa ser revisitada.

```
┌──────────────────────────────┐
│  Service / Regra de Negócio  │  ← Pedidos.gs, Regras.gs, Cadastros.gs
└──────────────┬───────────────┘
               │ chama métodos de domínio
               ▼
┌──────────────────────────────┐
│         Repository           │  ← UsuarioRepository, PedidoRepository, ...
│  (getById, query, create,    │
│   update, softDelete)        │
└──────┬─────────────────┬─────┘
       │ toEntity/toDb   │ read/write
       ▼                 ▼
┌──────────────┐   ┌──────────────────────────────┐
│    Mapper    │   │         DbAdapter            │  ← FirestoreAdapter,
│ (por entidade│   │ (read, query, write, update, │     SupabaseAdapter,
│  e backend)  │   │  delete)                     │     SheetsAdapter
└──────────────┘   └──────────────┬───────────────┘
                                  │ writes (se backend ≠ sheets)
                                  ▼
                   ┌──────────────────────────────┐
                   │     AuditSheetsExporter      │  ← Seção 14
                   └──────────────────────────────┘
```

### Repository — uma por entidade

Uma classe (ou objeto) por entidade do modelo lógico (Seção 15). Interface uniforme:

| Método | Retorno | Descrição |
|---|---|---|
| `getById(id)` | `Entity \| null` | Busca por id, já mapeada |
| `query(filtros)` | `Entity[]` | Lista com filtros (setor, ativo, status...) |
| `create(entity)` | `id` | Insere nova; valida unicidade quando aplicável |
| `update(id, patch)` | `void` | Patch parcial; nunca substitui o documento inteiro |
| `softDelete(id)` | `void` | Seta `ativo: false` (Seção 7 — E12) |

Repositories previstos: `UsuarioRepository`, `SetorRepository`, `CategoriaRepository`, `PedidoRepository`, `LogRepository`, `ParametroRepository`, `AnoEncerradoRepository`, `TokenRecuperacaoRepository`.

**Regras:**
- Repository **devolve sempre objetos do domínio**, nunca o formato bruto do banco.
- Repository **não conhece regra de negócio** — não valida quinzena, não checa permissão. Isso fica no service (`Pedidos.gs`, `Regras.gs`).
- Repository **não conhece o backend** — só conhece o `DbAdapter` injetado e o `Mapper` correspondente.

### Mapper — uma por entidade (com variantes por backend quando necessário)

Cada entidade tem um mapper com dois métodos:

```javascript
const UsuarioMapper = {
  toEntity(raw) { /* formato do banco → objeto Usuario */ },
  toDb(usuario) { /* objeto Usuario → formato do banco */ }
};
```

**Quando um único mapper basta:** Firestore e Supabase aceitam objetos/JSON quase 1:1 com o domínio. Um mapper genérico geralmente serve para os dois (especialmente se o Supabase usar colunas `JSONB` para campos compostos como `pedidos.periodos[]`).

**Quando precisa variante por backend:** Sheets é tabular e plano. Arrays e objetos aninhados precisam ser serializados para string JSON em uma célula. Para isso existe um `SheetsUsuarioMapper` (e equivalentes), que herda do mapper base e sobrescreve `toDb`/`toEntity` para fazer `JSON.stringify`/`JSON.parse` nos campos compostos.

A escolha do mapper é feita no setup, junto com a escolha do DbAdapter (Seção 14), e injetada no Repository.

**O mapper é o único ponto que conhece o formato do banco.** Se amanhã o Supabase mudar nome de coluna ou o Sheets reorganizar abas, só o mapper muda.

### DbAdapter — uma implementação por backend

Interface genérica e mínima, sem vazar conceitos específicos do backend:

```javascript
const DbAdapter = {
  read(collection, id),                 // → raw doc | null
  query(collection, filtros),           // → raw doc[]
  write(collection, id, doc),           // create ou overwrite
  update(collection, id, patch),        // patch parcial
  delete(collection, id)                // hard delete (raramente usado — soft delete fica no repository)
};
```

Implementações:

| Adapter | Tecnologia | Observações |
|---|---|---|
| `FirestoreAdapter` | Biblioteca Firestore para Apps Script + service account | Suporta nativamente map/array. Filtros via query API |
| `SupabaseAdapter` | REST `https://<projeto>.supabase.co/rest/v1` via `UrlFetchApp` + chave `service_role` | Filtros via PostgREST (`?campo=eq.valor`). Campos compostos podem ir em `JSONB` |
| `SheetsAdapter` | `SpreadsheetApp` nativo, uma aba por collection | Filtros feitos em memória após `getValues()`. Cuidado com volume — Apps Script tem limites de tempo de execução |

O adapter ativo é selecionado por `BACKEND_PRINCIPAL` (Seção 14). Toda função que precisar de banco recebe o adapter via `Deps.getDbAdapter()` (Seção 11), o que mantém o padrão de stub passivo nos testes.

### Fluxo de uma escrita (exemplo: aprovar pedido)

```
Pedidos.gs::aprovarChefia(idPedido, motivo?)
  │
  ├─ Deps.getSessionUser() → chefia logada
  ├─ pedidoRepo.getById(idPedido)              ← Repository
  │    └─ DbAdapter.read('pedidos', id)        ← Adapter do backend ativo
  │        └─ PedidoMapper.toEntity(raw)       ← Mapper
  │
  ├─ valida transição de estado (regra)
  ├─ valida quinzena (Deps.validarQuinzena)
  │
  ├─ pedidoRepo.update(idPedido, { status: 'aprovado_chefia', ... })
  │    ├─ PedidoMapper.toDb(patch)
  │    └─ DbAdapter.update('pedidos', id, dbPatch)
  │         └─ AuditSheetsExporter.replicar('pedidos', 'update', ...)  ← Seção 14
  │
  └─ Deps.registrarLog({ acao: 'aprovar_chefia', ... })
```

Se o backend for Sheets, o passo de auditoria é dispensado (a planilha já é a fonte primária).

---

## 14. Backends Suportados e Exportação para Auditoria

### Escolha do backend principal

Decidida **uma vez no setup** via constante `BACKEND_PRINCIPAL` em `Config.gs`. Não é toggle de runtime — mudar de backend depois exige migração de dados (não suportada automaticamente pelo sistema).

| Valor | Banco principal | Tecnologia | Replicação para Sheets (auditoria) |
|---|---|---|:---:|
| `firestore` | Cloud Firestore | Biblioteca Apps Script + service account | ✅ obrigatória |
| `supabase` | Supabase (Postgres gerenciado) | REST via `UrlFetchApp` + `service_role` | ✅ obrigatória |
| `sheets` | Google Sheets | `SpreadsheetApp` nativo | N/A — já é a fonte |

Cada opção tem trade-offs:
- **Firestore** — escala bem, latência baixa, limites generosos para Apps Script. Custo cresce com leituras. Setup mais elaborado (service account, regras de segurança).
- **Supabase** — Postgres real, queries SQL, JSONB para campos compostos. Setup razoável (projeto + chave service_role). Cuidado com a chave: ela ignora RLS e dá acesso total — precisa ficar em `PropertiesService` no Apps Script, nunca no código.
- **Sheets** — zero infra extra, auditoria nativa (a planilha é o banco). Limitado em volume e concorrência: indicado para MVP/POC ou hospitais pequenos (até ~200 funcionários, ~1000 pedidos/ano). Lentidão e bloqueios começam a aparecer acima disso.

### Exportação para Sheets (auditoria) — quando backend ≠ sheets

Quando `BACKEND_PRINCIPAL` é `firestore` ou `supabase`, todo `write` / `update` / `softDelete` é replicado para uma planilha Google Sheets dedicada. **Objetivo:** auditores leem o estado do sistema diretamente em uma planilha, sem precisar acessar Firestore ou Supabase.

**Componente:** `AuditSheetsExporter` (em `Audit.gs`)
- Acionado pelo `DbAdapter` em todo write bem-sucedido: `AuditSheetsExporter.replicar(collection, op, id, doc)`
- Cada collection do modelo lógico (Seção 15) vira uma **aba** da planilha de auditoria: `usuarios`, `setores`, `categorias`, `pedidos`, `logs`, `parametros`, `anosEncerrados`
- Cada linha = estado mais recente da entidade (chave = `id`). Update sobrescreve a linha existente; soft delete grava `ativo: false` (não remove a linha)
- Primeira linha de cada aba = cabeçalho com nomes dos campos
- Coluna extra `_atualizadoEm` (timestamp ISO da última replicação)

**Modos de exportação:**

| Modo | Quando usar | Como funciona |
|---|---|---|
| **Síncrono (default)** | Volume baixo a médio (até ~50 writes/min) | Replica imediatamente após cada write. Sheets reflete estado em quase tempo real |
| **Assíncrono (cron)** | Volume alto, ou quando latência da escrita principal incomoda | Buffer em memória + trigger temporal do Apps Script (a cada 5/10/60 min) drena o buffer para a planilha |

O modo é configurado em `Config.gs` (`AUDIT_MODE = 'sync' | 'async'`).

**Falha na replicação não bloqueia o write principal.** Se a planilha estiver indisponível (cota de API, planilha bloqueada por edição manual, etc.), o erro é registrado em `logs/` com `acao: 'audit_export_falha'` e o write principal é mantido. A planilha é **secundária**, não fonte de verdade.

**O que NÃO é replicado:**
- `tokensRecuperacao/` — dados sensíveis e efêmeros (30 min). Ficam só no banco principal.
- Campos de senha (`senhaHash`) — em nenhuma circunstância vão para Sheets, mesmo hashados.

### Quando `BACKEND_PRINCIPAL = sheets`

- Sem replicação adicional. A planilha já é o banco principal.
- A auditoria é feita pela própria planilha — basta dar acesso de leitura para o auditor.
- Recomendado apenas para volume baixo. Acima de ~5000 linhas por aba, leituras ficam lentas e a probabilidade de hit no limite de 6 minutos por execução do Apps Script aumenta.
- Soft delete continua valendo: linhas com `ativo: false` permanecem (não são removidas).

### Permissões da planilha de auditoria

- **Edição:** apenas a service account / conta de execução do Apps Script. Auditores nunca devem editar manualmente — qualquer edição manual será sobrescrita no próximo write.
- **Leitura:** auditores e admin do sistema.
- Recomendado proteger todas as abas (Sheets → Proteger intervalo) deixando apenas a conta de serviço com permissão de edição.

---

## 15. Modelo Lógico de Dados

Definição **agnóstica de banco**. As mesmas collections lógicas existem em qualquer um dos três backends (Seção 14); o `Mapper` (Seção 13) resolve as diferenças de formato.

```
usuarios/        { id, nome, email, setor, plantao, permissao, categoria,
                   dataAdmissao, ativo, criadoPor, criadoEm,
                   senhaHash, primeiroLogin }

setores/         { nomeSetor, critico, setor24h, minimoPresencial,
                   maxPorQuinzena, ativo }

categorias/      { nomeCategoria, setor, prefixo, aplicaQuinzena, ativo }

pedidos/         { idUsuario, anoBase, periodos[], totalDias,
                   adiantFerias, adiant13, status,
                   aprovadoChefiaPor?, aprovadoAdminPor?,
                   motivoRecusa?, criadoEm, atualizadoEm }

logs/            { timestamp, usuarioId, acao, alvo, detalhes, setor }

parametros/      { chave, valor, atualizadoPor, atualizadoEm }

anosEncerrados/  { ano, encerradoPor, encerradoEm, reabertoPor?, motivoReabertura? }

tokensRecuperacao/ { token, usuarioId, expiraEm, usado, criadoEm }
```

### Tradução por backend

| Conceito (domínio) | Firestore | Supabase | Sheets |
|---|---|---|---|
| Collection | Collection | Tabela (schema `public`) | Aba |
| Documento / registro | Document (id auto ou definido) | Linha (PK = `id`) | Linha (coluna `id`) |
| Campo composto (`periodos[]`) | Array de maps nativo | Coluna `JSONB` | Célula com `JSON.stringify` |
| Soft delete | Campo `ativo: false` | Campo `ativo: false` | Coluna `ativo: false` |
| Filtro por campo | Query API | PostgREST (`?campo=eq.valor`) | Filtro em memória após `getValues()` |
| Timestamp | `Timestamp` nativo | `timestamptz` | String ISO |

---

## 16. Próximos Passos para Implementação

1. **Decisão de backend** — escolher `BACKEND_PRINCIPAL` (`firestore` / `supabase` / `sheets`) e `AUDIT_MODE` (`sync` / `async`). Configurar credenciais conforme o backend (service account Firestore, chave `service_role` Supabase em `PropertiesService`, ou ID da planilha de Sheets).
2. **Setup Apps Script** — criar projeto, importar bibliotecas necessárias para o backend escolhido (Firestore lib oficial, ou só `UrlFetchApp` para Supabase, ou nada extra para Sheets).
3. **Config.gs** — definir constantes (`CARGOS`, `TZ = 'America/Sao_Paulo'`, `BACKEND_PRINCIPAL`, `AUDIT_MODE`, `AUDIT_SHEET_ID`, lista inicial de setores e categorias para seed) e o namespace `Deps` apontando para as implementações reais (`getDbAdapter`, `getAuditExporter`, etc.).
4. **DbAdapters** — implementar `FirestoreAdapter`, `SupabaseAdapter`, `SheetsAdapter` (apenas o escolhido precisa funcionar; os outros podem ficar como stubs vazios para futura troca).
5. **Mappers** — `UsuarioMapper`, `SetorMapper`, `CategoriaMapper`, `PedidoMapper`, `LogMapper`, `ParametroMapper`, `AnoEncerradoMapper`, `TokenRecuperacaoMapper`. Versão Sheets quando o backend escolhido for `sheets` (ou se houver fallback futuro para Sheets).
6. **Repositories** — um por entidade (Seção 13). Métodos uniformes (`getById`, `query`, `create`, `update`, `softDelete`).
7. **Audit.gs** — `AuditSheetsExporter` com modos sync e async. Registrar trigger temporal quando `AUDIT_MODE = 'async'`. Não dispara quando `BACKEND_PRINCIPAL = 'sheets'`.
8. **Seed inicial** — função `seedInicial()` que popula `setores` (11) e `categorias` (21) via Repositories se collections estiverem vazias. Roda uma vez. Funciona em qualquer backend porque usa só Repository.
9. **Auth.gs** — `login(email, senha)`, `enviarLinkRecuperacao(email)`, `redefinirSenha(token, novaSenha)`, `getSessionUser()`, controle de bloqueio, hash de senha (bcrypt ou similar). Usa `UsuarioRepository` e `TokenRecuperacaoRepository`.
10. **Cadastros.gs** — CRUD de usuários, setores, categorias com checagens de permissão por cargo. Usa Repositories.
11. **Pedidos.gs** — `enviarPedido()`, `aprovarChefia()`, `aprovarAdmin()`, `recusar()`, transições de estado, validações E1-E13. Usa `PedidoRepository`.
12. **Regras.gs** — `verificarQuinzena()`, `verificarCobertura()`, `gerarFerias()` com L1, L2, L3, L7. Usa Repositories para ler estado atual.
13. **Logs.gs** — `registrarLog()`, consultas filtradas por papel via `LogRepository`.
14. **Frontend (HTML/CSS/JS)** — `Login.html`, `RecuperarSenha.html`, `RedefinirSenha.html`, `FormFerias.html`, `PainelCadastros.html`, `PainelRespostas.html`, `PainelDashboard.html`, `PainelLogs.html`, `PainelParametros.html`.
15. **Testes** — escrever suíte com substituição de `Deps.*` por stubs passivos (Seção 11). Começar por testes unitários das transições de estado (`enviarPedido`, `aprovarChefia`, `aprovarAdmin`) com validações stubadas e `Deps.getDbAdapter` retornando fake em memória; depois integração com o adapter real do backend escolhido; por fim E2E com email e `AuditSheetsExporter` stubados.

---

## Apêndice A — Catálogo do Projeto

Inventário completo das entidades, ações, regras e componentes referenciados ao longo do documento. Serve como índice de consulta rápida e contrato canônico para implementação.

---

### A.1 Glossário de identificadores

| Prefixo | Família | Quantidade | Seção canônica |
|---|---|---|---|
| `E` | Validações de Envio de pedido | E1–E13 | Seção 7 |
| `L` | Lógica de cobertura de plantão | L1, L2, L3, L7 (L4–L6 não existem) | Seção 7 |
| `V` | Visibilidade / regras de UI por papel | V2, V3, V4, V6, V7, V8, V9, V10, V12 | Seção 9 |
| `S` | Segurança e autenticação | S1, S2, S3, S4, S5, S9 | Seção 2 |
| `C` | Concorrência | C6 | Seção 8 |

---

### A.2 Entidades (collections do modelo lógico)

Oito entidades, agnósticas de banco. Cada uma vira collection no Firestore, tabela no Supabase, ou aba no Sheets (Seção 15).

| Entidade | Chave | Campos principais | Soft delete |
|---|---|---|:---:|
| `usuarios` | `id` (matrícula 7–9 dígitos) | nome, email, setor, plantao, permissao, categoria, dataAdmissao, ativo, criadoPor, criadoEm, senhaHash, primeiroLogin | ✅ |
| `setores` | `nomeSetor` | critico, setor24h, minimoPresencial, maxPorQuinzena, ativo | ✅ |
| `categorias` | `nomeCategoria` | setor, prefixo, aplicaQuinzena, ativo | ✅ |
| `pedidos` | id auto | idUsuario, anoBase, periodos[], totalDias, adiantFerias, adiant13, status, aprovadoChefiaPor?, aprovadoAdminPor?, motivoRecusa?, criadoEm, atualizadoEm | N/A (tem status) |
| `logs` | id auto | timestamp, usuarioId, acao, alvo, detalhes, setor | ❌ (append-only) |
| `parametros` | `chave` | valor, atualizadoPor, atualizadoEm | ❌ |
| `anosEncerrados` | `ano` | encerradoPor, encerradoEm, reabertoPor?, motivoReabertura? | ❌ |
| `tokensRecuperacao` | `token` | usuarioId, expiraEm, usado, criadoEm | ❌ (efêmero, 30 min) |

---

### A.3 Papéis (cargos fixos no código)

| Papel | Quantidade | Pode ser criado por |
|---|---|---|
| `funcionario` | N | admin ou chefia (do próprio setor) |
| `chefia` | até 10 (uma por setor clínico) | apenas admin (V4) |
| `admin` | 1 | seed inicial |

---

### A.4 Estados do pedido

| Estado | Final? | Imutável? | Visível para |
|---|:---:|:---:|---|
| `pendente` | ❌ | ❌ | funcionário (próprio), chefia (do setor) |
| `aprovado_chefia` | ❌ | ❌ | funcionário, chefia, admin |
| `aprovado_admin` | ✅ | ✅ (E9) | funcionário, chefia, admin |
| `reprovado_chefia` | ✅ (mas pode reenviar) | ❌ | funcionário, chefia, admin |
| `reprovado_admin` | ✅ (mas pode reenviar) | ❌ | funcionário, chefia, admin |

**Transições proibidas:** `pendente` → `aprovado_admin` direto; `aprovado_admin` → qualquer outro; edição em ano encerrado (V6); aprovação com problema de quinzena (E10); edição concorrente por dois admins (C6).

---

### A.5 Catálogo completo de regras

#### A.5.1 Validações de Envio (E)

| ID | Descrição | Onde aplica |
|---|---|---|
| E1 | Matrícula única (id 7–9 dígitos) | Cadastro de usuário |
| E2 | Sem sobreposição com pedidos já aprovados | Envio de pedido |
| E3 | Apenas 1 pedido pendente por ano | Envio de pedido |
| E4 | Datas válidas (sem 31/02, fim posterior ao início) | Envio de pedido |
| E5 | Total ≤ 30 dias | Envio de pedido |
| E6 | Antecedência mínima de 30 dias | Envio de pedido |
| E7 | Reenvio substitui pedido pendente (não acumula) | Envio de pedido |
| E8 | Funcionário com ≥ 12 meses de admissão | Envio de pedido |
| E9 | Pedido `aprovado_admin` é imutável | Edição/aprovação |
| E10 | Não aprovar com problema de quinzena ativo | Aprovação chefia/admin |
| E11 | Reservado (alinhar com versão original do QA antes de implementar) | — |
| E12 | Soft delete em todas entidades | Toda exclusão |
| E13 | Setor referenciado precisa existir; antes de desativar setor, verificar funcionários ativos | Cadastro de usuário; desativação de setor |

#### A.5.2 Regras de cobertura (L)

| ID | Descrição | Configurável? |
|---|---|---|
| L1 | Máx 50% do setor ausente simultaneamente | Não |
| L2 | Máx `setor.maxPorQuinzena` Enfermeiros do mesmo setor de férias por quinzena, por plantão | Sim (1–50, default 1) |
| L3 | Máx `setor.maxPorQuinzena` Técnicos do mesmo setor de férias por quinzena, por plantão (contagem independente de L2) | Sim (mesmo valor de L2) |
| L7 | Cobertura mínima absoluta = `setor.minimoPresencial` | Sim |

L4, L5, L6 não existem. Categoria `Administrativo` (`aplicaQuinzena: false`) está fora de L2/L3.

#### A.5.3 Visibilidade / UI (V)

| ID | Descrição | Onde aplica |
|---|---|---|
| V2 | Chefia só vê dados do próprio setor | Painéis de chefia |
| V3 | Admin tem visão global (sem filtro) | Painéis de admin |
| V4 | Apenas admin promove para chefia ou admin | Cadastro de usuário |
| V6 | Editar pedido em ano encerrado é proibido (mesmo para admin) | Edição de pedido |
| V7 | Admin não vê pedidos `pendente` (só `aprovado_chefia` e seguintes) | Painel respostas |
| V8 | Calendário do funcionário é anonimizado ("2 pessoas do seu setor neste período") | Tela do funcionário |
| V9 | Emails fora do setor da chefia aparecem mascarados (`m***a@hospital.com`) | Painéis de chefia |
| V10 | Logs visíveis à chefia são restritos ao setor | Painel de logs (chefia) |
| V12 | Inatividade de 15 min trava a tela e exige reautenticação | Todas as telas |

#### A.5.4 Segurança (S)

| ID | Descrição |
|---|---|
| S1 | Mensagem de erro genérica no login ("Dados incorretos. Tente novamente.") |
| S2 | Domínio do email cadastrado validado contra `DOMINIOS_PERMITIDOS` (lista vazia = aceita tudo) |
| S3 | Bloqueio após 5 falhas de login → 15 min de bloqueio |
| S4 | Sanitização de campo nome (e demais entradas de texto livre) |
| S5 | Sessão dura 8h |
| S9 | Link de recuperação de senha válido por 30 min, uso único; sessões anteriores invalidadas após redefinir |

#### A.5.5 Concorrência (C)

| ID | Descrição |
|---|---|
| C6 | Dois admins editando o mesmo pedido simultaneamente → segundo recebe erro: "Este pedido já foi processado por outro usuário." |

---

### A.6 Operações de domínio (services)

Funções públicas dos arquivos `.gs` de regra de negócio. Todas usam `Deps.*` e `Repositories` — nunca tocam o banco diretamente.

| Arquivo | Função | Quem chama | Regras envolvidas |
|---|---|---|---|
| `Auth.gs` | `login(email, senha)` | Tela de login | S1, S3, S5 |
| `Auth.gs` | `enviarLinkRecuperacao(email)` | Botão "Esqueci minha senha" | S1, S9 |
| `Auth.gs` | `redefinirSenha(token, novaSenha)` | Tela de redefinição | S9 |
| `Auth.gs` | `getSessionUser()` | ~25 funções | S5, V12 |
| `Cadastros.gs` | `criarUsuario`, `editarUsuario`, `desativarUsuario`, `reativarUsuario` | Painel cadastros | E1, E13, V4, S2, S4 |
| `Cadastros.gs` | `criarSetor`, `editarSetor`, `desativarSetor` | Painel admin | E12, E13 |
| `Cadastros.gs` | `criarCategoria`, `editarCategoria`, `desativarCategoria` | Painel admin | E12 |
| `Pedidos.gs` | `enviarPedido(payload)` | Formulário do funcionário | E2–E8, E10 |
| `Pedidos.gs` | `aprovarChefia(idPedido)` | Painel respostas (chefia) | E9, E10, C6 |
| `Pedidos.gs` | `aprovarAdmin(idPedido)` | Painel respostas (admin) | E9, E10, C6, V7 |
| `Pedidos.gs` | `recusar(idPedido, motivo)` | Painel respostas | — |
| `Regras.gs` | `verificarQuinzena(prefixoCategoria)` | `aprovarChefia`, `aprovarAdmin`, `gerarFerias` | L2, L3 |
| `Regras.gs` | `verificarCobertura(setor, periodo)` | `aprovarChefia`, `aprovarAdmin`, `gerarFerias` | L1, L7 |
| `Regras.gs` | `gerarFerias()` | Botão no dashboard admin | L1, L2, L3, L7 |
| `Logs.gs` | `registrarLog(payload)` | ~20 funções | — |
| `Logs.gs` | `consultarLogs(filtros)` | Painel de logs | V10 |
| `Parametros.gs` | `getParametro(chave)` | ~15 funções | — |
| `Parametros.gs` | `setParametro(chave, valor)` | Painel de parâmetros | — |
| `Admin.gs` | `encerrarAno(ano)` / `reabrirAno(ano, motivo)` | Dashboard admin | V6 |
| `Admin.gs` | `enviarEmailMassa(filtro, mensagem)` | Dashboard admin | — |
| `Setup.gs` | `seedInicial()` | Execução manual única | — |

---

### A.7 Componentes da camada de dados

#### A.7.1 Repositories (8)

`UsuarioRepository`, `SetorRepository`, `CategoriaRepository`, `PedidoRepository`, `LogRepository`, `ParametroRepository`, `AnoEncerradoRepository`, `TokenRecuperacaoRepository`.

**Interface uniforme:** `getById(id)`, `query(filtros)`, `create(entity)`, `update(id, patch)`, `softDelete(id)`.

#### A.7.2 Mappers (8)

`UsuarioMapper`, `SetorMapper`, `CategoriaMapper`, `PedidoMapper`, `LogMapper`, `ParametroMapper`, `AnoEncerradoMapper`, `TokenRecuperacaoMapper`. Cada um expõe `toEntity(raw)` e `toDb(entity)`. Variantes `Sheets*Mapper` quando o backend é Sheets (serializa arrays/objetos via `JSON.stringify`).

#### A.7.3 DbAdapters (3 — implementar apenas o escolhido)

| Adapter | Backend | Stack |
|---|---|---|
| `FirestoreAdapter` | Cloud Firestore | Biblioteca Apps Script + service account |
| `SupabaseAdapter` | Supabase (Postgres) | REST via `UrlFetchApp` + chave `service_role` |
| `SheetsAdapter` | Google Sheets | `SpreadsheetApp` nativo |

**Interface:** `read(collection, id)`, `query(collection, filtros)`, `write(collection, id, doc)`, `update(collection, id, patch)`, `delete(collection, id)`.

#### A.7.4 Auditoria

`AuditSheetsExporter` (em `Audit.gs`). Método: `replicar(collection, op, id, doc)`. Modos: `sync` (default) ou `async` (trigger temporal). Não dispara quando `BACKEND_PRINCIPAL = 'sheets'`. Não replica `tokensRecuperacao` nem `senhaHash`.

---

### A.8 Namespace `Deps` (para stubs em testes — Seção 11)

| Chave | Implementação real | Stub passivo |
|---|---|---|
| `Deps.registrarLog` | `registrarLogReal` | `() => {}` |
| `Deps.enviarEmail` | `enviarEmailReal` | `() => ({ ok: true })` |
| `Deps.validarQuinzena` | `validarQuinzenaReal` | `() => ({ ok: true })` |
| `Deps.validarCobertura` | `validarCoberturaReal` | `() => ({ ok: true })` |
| `Deps.getDbAdapter` | `getDbAdapterReal` | `() => dbAdapterFake` |
| `Deps.getAuditExporter` | `getAuditExporterReal` | `() => ({ replicar: () => {} })` |
| `Deps.getSessionUser` | `getSessionUserReal` | `() => usuarioMock` |

---

### A.9 Parâmetros runtime (collection `parametros`)

| Chave | Tipo | Default | Efeito quando `true` / preenchido |
|---|---|---|---|
| `BLOQUEAR_QUINZENA_CALENDARIO` | boolean | `false` | Calendário desabilita datas com conflito antes do envio |
| `CHEFIA_ADMIN_TIRAM_FERIAS` | boolean | `true` | Chefia e admin também preenchem formulário de férias |
| `REGRAS_QUINZENA_TODOS_SETORES` | boolean | `false` | L2/L3 valem para todo o hospital (não só setores `critico`) |
| `DOMINIOS_PERMITIDOS` | string[] | `[]` | Lista branca de domínios para email cadastrado (S2) |

---

### A.10 Constantes de configuração (`Config.gs`)

| Constante | Tipo | Valores possíveis | Observação |
|---|---|---|---|
| `CARGOS` | objeto | `{ FUNCIONARIO, CHEFIA, ADMIN }` | Papéis fixos |
| `TZ` | string | `'America/Sao_Paulo'` | Fuso para datas/timestamps |
| `BACKEND_PRINCIPAL` | string | `'firestore'` \| `'supabase'` \| `'sheets'` | Decidido uma vez no setup |
| `AUDIT_MODE` | string | `'sync'` \| `'async'` | Modo de replicação para Sheets |
| `AUDIT_SHEET_ID` | string | ID da planilha de auditoria | Apenas se `BACKEND_PRINCIPAL ≠ 'sheets'` |
| `SEED_SETORES` | array | 11 setores iniciais | Seção 3 |
| `SEED_CATEGORIAS` | array | 21 categorias iniciais | Seção 4 |

Credenciais sensíveis (service account Firestore, `service_role` Supabase) ficam em `PropertiesService`, **nunca** em `Config.gs`.

---

### A.11 Frontend — telas (HTML servido pelo Apps Script)

| Arquivo | Para quem | Função |
|---|---|---|
| `Login.html` | Todos | Tela de entrada (email + senha) |
| `RecuperarSenha.html` | Todos | Solicitar link de recuperação |
| `RedefinirSenha.html` | Todos | Definir nova senha (via token) |
| `TrocaSenhaPrimeiroLogin.html` | Todos (1º acesso) | Modal forçado quando `primeiroLogin: true` |
| `FormFerias.html` | Funcionário (e chefia/admin se `CHEFIA_ADMIN_TIRAM_FERIAS`) | Formulário com até 3 períodos + calendário |
| `PainelCadastros.html` | Chefia / Admin | CRUD de usuários (e setores/categorias para admin) |
| `PainelRespostas.html` | Chefia / Admin | Aprovar / recusar pedidos |
| `PainelDashboard.html` | Chefia / Admin | Calendário, problemas de quinzena, "Gerar Férias" (admin), encerrar ano (admin) |
| `PainelLogs.html` | Chefia (do setor — V10) / Admin (global) | Histórico de ações |
| `PainelParametros.html` | Apenas admin | Toggles do sistema (Apêndice A.9) |

**Componentes globais:** botão **Voltar** e botão **Sair** no cabeçalho fixo de todas as páginas.

---

### A.12 Abas dos painéis por papel

| Papel | Abas | Restrições |
|---|---|---|
| Funcionário | (sem abas — única tela) | Vê só calendário anonimizado (V8) |
| Chefia | Cadastros, Respostas, Dashboard, Logs | Tudo restrito ao próprio setor (V2, V9, V10) |
| Admin | Cadastros, Respostas, Dashboard, Logs, Parâmetros | Visão global (V3); não vê `pendente` (V7) |

---

### A.13 Eventos que disparam log (collection `logs`)

Lista mínima esperada — todo log usa `Deps.registrarLog({ usuarioId, acao, alvo, detalhes, setor })`.

| Categoria | Ações |
|---|---|
| Auth | `login_sucesso`, `login_falha`, `logout`, `bloqueio_login`, `recuperacao_solicitada`, `senha_redefinida`, `primeiro_login_concluido` |
| Cadastros | `criar_usuario`, `editar_usuario`, `desativar_usuario`, `reativar_usuario`, `criar_setor`, `editar_setor`, `desativar_setor`, `criar_categoria`, `editar_categoria`, `desativar_categoria` |
| Pedidos | `enviar_pedido`, `reenviar_pedido`, `aprovar_chefia`, `aprovar_admin`, `recusar_chefia`, `recusar_admin` |
| Admin | `encerrar_ano`, `reabrir_ano`, `gerar_ferias`, `enviar_email_massa`, `alterar_parametro` |
| Auditoria | `audit_export_falha` (quando replicação para Sheets falha — Seção 14) |

---

### A.14 Domínio dos campos compostos

#### A.14.1 `pedidos.periodos[]`

Array de até 3 elementos. Cada elemento:

```javascript
{
  inicio: "2026-07-15",   // ISO YYYY-MM-DD
  fim:    "2026-07-29",   // ISO YYYY-MM-DD
  dias:   15              // calculado pelo backend
}
```

#### A.14.2 `usuarios.plantao`

Enum: `"Diurno"` | `"Noturno"` | `"Unico"`. Apenas `"Unico"` quando `setor.setor24h = false`.

#### A.14.3 `categorias.prefixo`

Enum: `"Enfermeiro"` | `"Técnico"` | `"Administrativo"`. Usado por L2/L3 para identificar o bucket de contagem.

---

### A.15 Resumo numérico do projeto

| Item | Quantidade |
|---|---|
| Setores no seed | 11 (10 clínicos + 1 administrativo) |
| Categorias no seed | 21 |
| Cargos | 3 (funcionario, chefia, admin) |
| Estados de pedido | 5 |
| Validações E | 13 (E1–E13; E11 reservado) |
| Regras L | 4 (L1, L2, L3, L7) |
| Regras V | 9 |
| Regras S | 6 |
| Regras C | 1 |
| Parâmetros runtime | 4 |
| Entidades (collections) | 8 |
| Repositories | 8 |
| Mappers | 8 |
| DbAdapters | 3 (1 ativo por instalação) |
| Backends suportados | 3 (Firestore, Supabase, Sheets) |
| Telas HTML | 10 |
| Arquivos `.gs` principais | 9+ (Config, Auth, Cadastros, Pedidos, Regras, Logs, Parametros, Admin, Audit, DbAdapter*, Mapper*, Repository*, Setup) |

---

*Documento gerado a partir da análise QA original v3 + decisões fechadas em revisão. Última atualização: 30/04/2026 — adicionada camada Repository + Mapper + DbAdapter e suporte a três backends (Firestore / Supabase / Sheets) com exportação para auditoria. Apêndice A (catálogo completo) anexado em 30/04/2026.*
