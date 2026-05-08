# Gestão de Férias — Sistema Completo

Frontend React + Backend .NET 8 para gestão de férias de equipes de saúde.

## Arquitetura

- **Backend**: .NET 8 API REST + PostgreSQL (Supabase) + JWT — porta 8080
- **Frontend**: React + Vite (proxy `/api` → backend) — porta 5000

## Workflows

- `Backend API` — roda o .NET 8 API na porta 8080
- `Start application` — roda o frontend Vite na porta 5000

## Usuários fictícios

Crie os usuários clicando em "Criar usuários demo" na tela de login:

| Nome | Cargo | Setor | Senha |
|------|-------|-------|-------|
| João Silva | Gestor | Enfermagem | Ferias@2026 |
| Maria Santos | Colaborador | Enfermagem | Ferias@2026 |
| Carlos Oliveira | Colaborador | Radiologia | Ferias@2026 |
| Ana Costa | Gestor | Radiologia | Ferias@2026 |
| Pedro Souza | Colaborador | Sem Setor | Ferias@2026 |

Após criar, veja a matrícula gerada em **Usuários** (após login como Gestor).

## Funcionalidades

### Colaborador
- Dashboard com resumo de férias
- Solicitar férias (1 ou mais períodos = 30 dias)
- Ver histórico / cancelar pendentes
- Calendário do setor

### Gestor (tudo acima +)
- Aprovar/negar solicitações pendentes do setor
- Gerenciar usuários (editar cargo, setor, senha)
- Gerenciar setores (criar, ajustar limite simultâneo)
- Calendário com visualização completa

## User preferences

- Cores: branca (#ffffff) e vermelha (#c8102e)
- Idioma: Português (PT-BR)
