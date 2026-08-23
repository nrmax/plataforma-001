# NRMAX Contracts API

Modulo de geracao e assinatura eletronica de contratos para a NRMAX.

## Visao Geral

Sistema automatizado que gera contratos a partir de dados de pedidos, converte para PDF, envia para assinatura eletronica e armazena copias.

## Fluxo

```
Compra no InfinityPay
       ↓
Webhook → /api/webhook/infinitypay
       ↓
Gera HTML do contrato (preenchimento automatico)
       ↓
Converte HTML → PDF (PDFKit)
       ↓
Envia email ao cliente (notificacao)
       ↓
Envia para SuperSign (assinatura eletronica)
       ↓
Cliente assina via email
       ↓
Webhook → /api/webhook/signature
       ↓
Baixa PDF assinado
       ↓
Salva no Google Drive
       ↓
Envia copia ao cliente
```

## Stack Tecnologica

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js |
| Servidor | Express.js (local) / Vercel (producao) |
| PDF | PDFKit |
| Assinatura | SuperSign API |
| Armazenamento | Google Drive API |
| Email | Nodemailer (SMTP) |

## Instalacao

### 1. Instalar dependencias

```bash
cd contracts
npm install
```

### 2. Configurar variaveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais.

### 3. Configurar Google Drive (opcional)

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto
3. Habilite a Google Drive API
4. Crie credenciais OAuth 2.0
5. Baixe o JSON e salve como `credentials.json`

### 4. Configurar SuperSign

1. Acesse [SuperSign](https://supersign.com.br)
2. Crie uma conta gratuita
3. Obtenha a API Key no painel
4. Configure o webhook URL

### 5. Iniciar servidor (desenvolvimento)

```bash
npm run dev
```

## Deploy no Vercel

### 1. Instalar Vercel CLI

```bash
npm i -g vercel
```

### 2. Fazer login

```bash
vercel login
```

### 3. Deploy

```bash
cd contracts
vercel deploy --prod
```

### 4. Configurar variaveis no Vercel

Acesse o painel do Vercel e adicione todas as variaveis do `.env`.

## Endpoints

### Webhooks

#### POST /api/webhook/infinitypay

Recebe notificacoes de pagamento da InfinityPay.

**Headers:**
- `x-infinitepay-signature`: Assinatura HMAC

**Body:**
```json
{
  "event": "payment.paid",
  "data": {
    "order_nsu": "123456",
    "amount": 15000,
    "customer": {
      "name": "Joao da Silva",
      "email": "joao@email.com",
      "document": "12345678901"
    },
    "items": [
      {
        "description": "Plataforma Elevatoria 600kg",
        "quantity": 1,
        "price": 15000
      }
    ]
  }
}
```

#### POST /api/webhook/signature

Recebe notificacoes de assinatura do SuperSign.

### Consulta

#### GET /api/contracts/status?id={documentId}

Consulta o status de um documento de assinatura.

**Response:**
```json
{
  "documentId": "abc-123",
  "status": "signed",
  "signedAt": "2026-08-23T10:00:00Z",
  "downloadUrl": "https://..."
}
```

#### GET /api/health

Health check da API.

#### GET /api/contracts/test

Gera um contrato de teste com dados ficticios.

## Estrutura de Diretorios

```
contracts/
├── api/
│   ├── webhook/
│   │   ├── infinitypay.js    # Webhook InfinityPay
│   │   └── signature.js      # Webhook SuperSign
│   └── contracts/
│       └── status.js         # Consulta status
├── lib/
│   ├── config.js             # Configuracoes
│   ├── contractService.js    # Geracao contrato
│   ├── pdfService.js         # Conversao PDF
│   ├── signatureService.js   # SuperSign API
│   ├── driveService.js       # Google Drive
│   └── emailService.js       # Envio email
├── templates/
│   └── contract.html         # Template HTML
├── utils/
│   └── helpers.js            # Funcoes auxiliares
├── server.js                 # Servidor Express
├── vercel.json               # Config Vercel
├── package.json
├── .env.example
└── .gitignore
```

## Template do Contrato

O template HTML esta em `templates/contract.html`. Campos disponiveis:

| Campo | Descricao |
|---|---|
| `{{contractNumber}}` | Numero unico do contrato |
| `{{orderNumber}}` | Numero do pedido |
| `{{customerName}}` | Nome do cliente |
| `{{customerDocument}}` | CPF/CNPJ |
| `{{customerEmail}}` | Email |
| `{{customerPhone}}` | Telefone |
| `{{productName}}` | Nome do produto |
| `{{capacity}}` | Capacidade |
| `{{height}}` | Altura |
| `{{dimensions}}` | Dimensoes |
| `{{totalValue}}` | Valor total |
| `{{paymentMethod}}` | Forma de pagamento |
| `{{deliveryDeadline}}` | Prazo de entrega |

## Variaveis de Ambiente

| Variavel | Obrigatoria | Descricao |
|---|---|---|
| `INFINITPAY_WEBHOOK_SECRET` | Sim | Chave para validar webhooks |
| `SUPERSIGN_API_KEY` | Sim | API Key do SuperSign |
| `SUPERSIGN_WEBHOOK_SECRET` | Nao | Secret para webhooks |
| `GOOGLE_DRIVE_CREDENTIALS_PATH` | Nao | Caminho credentials.json |
| `GOOGLE_DRIVE_FOLDER_ID` | Nao | ID da pasta no Drive |
| `SMTP_HOST` | Sim | Host SMTP |
| `SMTP_PORT` | Sim | Porta SMTP |
| `SMTP_USER` | Sim | Usuario SMTP |
| `SMTP_PASS` | Sim | Senha SMTP |
| `EMAIL_FROM` | Sim | Email remetente |

## Limites Atuais

| Servico | Limite Gratuito |
|---|---|
| SuperSign | 5 documentos/mes |
| Google Drive API | 1GB storage |
| Vercel | 100GB bandwidth/mes |

## Migração para Supabase

Quando necessario, siga estes passos:

1. Criar conta no [Supabase](https://supabase.com)
2. Criar projeto gratuito
3. Criar tabela `contracts`:
   ```sql
   CREATE TABLE contracts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     contract_number TEXT UNIQUE NOT NULL,
     order_number TEXT NOT NULL,
     customer_name TEXT NOT NULL,
     customer_email TEXT NOT NULL,
     status TEXT DEFAULT 'pending',
     created_at TIMESTAMP DEFAULT NOW(),
     signed_at TIMESTAMP,
     pdf_path TEXT,
     drive_file_id TEXT
   );
   ```
4. Substituir `driveService.js` por Supabase Storage
5. Atualizar `emailService.js` para consultar status no banco

## Licenca

Proprietario - NRMAX Solucoes
