# Zapify - Bot WhatsApp com Dashboard e IA

Sistema completo de automacao WhatsApp com dashboard administrativo e integracao com IA (Gemini, GPT, Claude).

## Funcionalidades

### Bot WhatsApp
- Recebe e responde mensagens automaticamente
- Integracao com IA (Google Gemini, OpenAI GPT, Anthropic Claude)
- Mantem contexto de conversas
- Auto-respostas por palavras-chave
- Fluxos de mensagens personalizados
- Horario de atendimento configuravel

### Dashboard Web
- Visualizacao de conversas em tempo real
- Gerenciamento de auto-respostas
- Templates de mensagens reutilizaveis
- Fluxos de conversacao
- Estatisticas e metricas
- Configuracao completa do bot e IA
- Gerenciamento de contatos

## Stack Tecnica

- **Backend**: Node.js + Express + TypeScript
- **Bot WhatsApp**: whatsapp-web.js
- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **IA**: Google Gemini / OpenAI GPT / Anthropic Claude
- **Tempo Real**: Socket.io
- **Autenticacao**: JWT

## Pre-requisitos

- Node.js 18+
- Docker e Docker Compose
- Git
- Conta no provedor de IA desejado (Gemini/OpenAI/Anthropic)

## Instalacao

### 1. Clone o repositorio

```bash
cd Zapify
```

### 2. Configure as variaveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configuracoes:

```env
# Banco de Dados
DATABASE_URL="postgresql://zapify:zapify123@localhost:5432/zapify?schema=public"

# JWT (troque por uma chave segura em producao)
JWT_SECRET=sua-chave-secreta-muito-segura-aqui

# IA - Configure pelo menos um provedor
GEMINI_API_KEY=sua-api-key-do-gemini
# OPENAI_API_KEY=sua-api-key-da-openai
# ANTHROPIC_API_KEY=sua-api-key-da-anthropic
```

### 3. Inicie o banco de dados

```bash
docker-compose up -d
```

### 4. Configure o Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Configure o Frontend

```bash
cd ../frontend
npm install
```

## Executando o Projeto

### Desenvolvimento

Abra dois terminais:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Acesse:
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001

### Credenciais Padrao

- **Email**: admin@zapify.com
- **Senha**: admin123

## Conectando o WhatsApp

1. Acesse o dashboard em http://localhost:3000
2. Faca login com as credenciais acima
3. Va em **Configuracoes**
4. Escaneie o QR Code com seu WhatsApp
5. Aguarde a conexao ser estabelecida

## Estrutura do Projeto

```
zapify/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuracoes (db, socket, env)
│   │   ├── controllers/    # Controllers da API
│   │   ├── middlewares/    # Auth, error handling
│   │   ├── routes/         # Rotas Express
│   │   ├── services/       # Logica de negocio
│   │   │   ├── ai/         # Provedores de IA
│   │   │   ├── whatsapp/   # Bot WhatsApp
│   │   │   └── socket/     # Socket.io
│   │   └── utils/          # Helpers
│   └── prisma/             # Schema e migrations
│
├── frontend/
│   ├── src/
│   │   ├── app/            # App Router Next.js
│   │   ├── components/     # Componentes React
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities e API client
│   │   └── types/          # TypeScript types
│
├── shared/
│   └── types/              # Tipos compartilhados
│
├── docker-compose.yml      # PostgreSQL + pgAdmin
└── .env.example            # Variaveis de ambiente
```

## API Endpoints

### Autenticacao
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/me` - Usuario atual

### Contatos
- `GET /api/contacts` - Lista contatos
- `GET /api/contacts/:id` - Detalhes do contato
- `PUT /api/contacts/:id` - Atualiza contato
- `DELETE /api/contacts/:id` - Remove contato
- `POST /api/contacts/:id/block` - Bloqueia contato
- `POST /api/contacts/:id/unblock` - Desbloqueia contato

### Conversas
- `GET /api/conversations` - Lista conversas
- `GET /api/conversations/:id` - Detalhes da conversa
- `GET /api/conversations/:id/messages` - Mensagens da conversa
- `PUT /api/conversations/:id/archive` - Arquiva conversa
- `PUT /api/conversations/:id/read` - Marca como lida

### Mensagens
- `POST /api/messages/send` - Envia mensagem
- `GET /api/messages/:conversationId` - Lista mensagens

### Auto-Respostas
- `GET /api/auto-replies` - Lista auto-respostas
- `POST /api/auto-replies` - Cria auto-resposta
- `PUT /api/auto-replies/:id` - Atualiza auto-resposta
- `DELETE /api/auto-replies/:id` - Remove auto-resposta
- `PUT /api/auto-replies/:id/toggle` - Ativa/desativa

### Templates
- `GET /api/templates` - Lista templates
- `POST /api/templates` - Cria template
- `PUT /api/templates/:id` - Atualiza template
- `DELETE /api/templates/:id` - Remove template

### Fluxos
- `GET /api/flows` - Lista fluxos
- `POST /api/flows` - Cria fluxo
- `PUT /api/flows/:id` - Atualiza fluxo
- `DELETE /api/flows/:id` - Remove fluxo
- `PUT /api/flows/:id/toggle` - Ativa/desativa
- `POST /api/flows/:id/duplicate` - Duplica fluxo

### Configuracoes
- `GET /api/config` - Obtem configuracoes
- `PUT /api/config` - Atualiza configuracoes
- `GET /api/config/status` - Status do bot
- `POST /api/config/restart` - Reinicia bot
- `POST /api/config/disconnect` - Desconecta bot

### Estatisticas
- `GET /api/stats/overview` - Visao geral
- `GET /api/stats/messages` - Mensagens por dia
- `GET /api/stats/contacts` - Estatisticas de contatos
- `GET /api/stats/hourly` - Atividade por hora

## Eventos Socket.io

### Server -> Client
- `bot:status` - Status do bot atualizado
- `bot:qr` - Novo QR Code gerado
- `message:new` - Nova mensagem recebida/enviada
- `conversation:update` - Conversa atualizada

### Client -> Server
- `message:send` - Envia mensagem
- `conversation:read` - Marca conversa como lida

## Configurando Provedores de IA

### Google Gemini (Recomendado)
1. Acesse https://makersuite.google.com/app/apikey
2. Crie uma API Key
3. Adicione no `.env`: `GEMINI_API_KEY=sua-key`

### OpenAI GPT
1. Acesse https://platform.openai.com/api-keys
2. Crie uma API Key
3. Adicione no `.env`: `OPENAI_API_KEY=sua-key`

### Anthropic Claude
1. Acesse https://console.anthropic.com/
2. Crie uma API Key
3. Adicione no `.env`: `ANTHROPIC_API_KEY=sua-key`

## Producao

### Build do Backend
```bash
cd backend
npm run build
npm start
```

### Build do Frontend
```bash
cd frontend
npm run build
npm start
```

### Variaveis de Ambiente para Producao
- Use uma `JWT_SECRET` forte e unica
- Configure URLs corretas (`FRONTEND_URL`, `NEXT_PUBLIC_API_URL`)
- Use um banco de dados gerenciado
- Configure HTTPS

## Solucao de Problemas

### QR Code nao aparece
- Verifique se o backend esta rodando
- Verifique os logs do backend
- Tente reiniciar o bot em Configuracoes

### Bot nao responde
- Verifique se o bot esta ativo em Configuracoes
- Verifique se a API Key da IA esta configurada
- Verifique os logs do backend

### Erro de conexao com banco
- Verifique se o Docker esta rodando
- Verifique as variaveis de ambiente
- Execute `docker-compose up -d` novamente

## Licenca

MIT

## Suporte

Para duvidas ou problemas, abra uma issue no repositorio.
