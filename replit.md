# Gestão de Férias — Sistema Completo

Frontend React + Backend .NET 8 para gestão de férias de equipes de saúde.

## Arquitetura

- **Backend**: .NET 8 API REST + PostgreSQL (Replit built-in) + JWT — porta 8080
- **Frontend**: React + Vite (proxy `/api` → backend) — porta 5000

## Workflows

- `Backend API` — roda o .NET 8 API na porta 8080
- `Start application` — roda o frontend Vite na porta 5000

## Banco de Dados

PostgreSQL do Replit (helium). Auto-migrate ativado no startup do backend.

## Usuários fictícios

Clique em **"Criar usuários demo"** na tela de login. As matrículas abaixo são do banco atual:

| Matrícula | Nome | Cargo | Setor | Senha |
|-----------|------|-------|-------|-------|
| 0001 | Admin Hospital | Admin | — | Ferias@2026 |
| 0002 | Pedro Souza | Funcionário | Sem Setor | Ferias@2026 |
| 0003 | João Silva | Chefia | Enfermagem | Ferias@2026 |
| 0004 | Ana Costa | Chefia | Radiologia | Ferias@2026 |
| 0005 | Maria Santos | Funcionário | Enfermagem | Ferias@2026 |
| 0006 | Carlos Oliveira | Funcionário | Radiologia | Ferias@2026 |
| 0007 | Pedro Souza | Funcionário | Sem Setor | Ferias@2026 |

## Funcionalidades (spec v4)

### Funcionário
- Dashboard com resumo de férias e status do fluxo
- Solicitar férias (até 3 períodos, total ≤ 30 dias, mínimo 30 dias de antecedência)
- Adiantamento de férias e adiantamento de 13°
- Ver histórico de solicitações com status detalhado
- Cancelar solicitações pendentes
- Calendário de ocupação do setor

### Chefia (tudo acima +)
- Respostas (1ª etapa): aprovar/reprovar solicitações Pendentes do setor
- Gerenciar usuários do setor

### Admin (tudo acima +)
- Respostas Admin (2ª etapa): aprovar/reprovar solicitações já aprovadas pela chefia
- Gerenciar todos os setores (criar, ajustar limite simultâneo)
- Dashboard de adiantamentos solicitados

## Fluxo de aprovação

`Pendente` → (Chefia aprova) → `AprovadaChefia` → (Admin aprova) → `AprovadaAdmin`
                            ↓ (Chefia reprova) → `ReprovadaChefia`
                                               ↓ (Admin reprova) → `ReprovadaAdmin`

## User preferences

- Cores: branca (#ffffff) e vermelha (#c8102e)
- Idioma: Português (PT-BR)
