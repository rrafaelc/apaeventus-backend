# ApaEventus Backend

> **Versão 3.0** - Integração completa com Stripe Payment Platform

Este projeto é uma API desenvolvida em [NestJS](https://nestjs.com/) para gerenciamento de eventos e vendas de ingressos para a APAE Itapira, com processamento de pagamentos via Stripe.

## Tecnologias Utilizadas

- **Node.js** (v18+)
- **NestJS** (Framework principal)
- **TypeScript**
- **Prisma ORM** (mapeamento objeto-relacional)
- **PostgreSQL** (banco de dados)
- **JWT** (autenticação)
- **AWS SDK** (envio de e-mails e arquivos)
- **PDF-lib** (geração de PDFs)
- **QRCode** (geração de QR Codes)
- **Stripe** (processamento de pagamentos)
- **Bcrypt** (hash de senhas)
- **Class-validator** e **class-transformer** (validação e transformação de dados)
- **Dayjs** (manipulação de datas)
- **Libphonenumber-js** (formatação de números de telefone)
- **ESLint** e **Prettier** (padronização e formatação de código)

## Pré-requisitos

- [Node.js](https://nodejs.org/) (recomendado v18+)
- [PostgreSQL](https://www.postgresql.org/) rodando localmente
- [VS Code](https://code.visualstudio.com/) (recomendado)
- [Postman](https://www.postman.com/) para testar a API

## Passos para rodar a aplicação

1. **Clone o repositório e acesse a pasta do projeto:**

   ```bash
   git clone https://github.com/rrafaelc/apaeventus-backend.git
   cd apaeventus-backend
   ```

2. **Instale as dependências do projeto:**

   ```bash
   npm install
   ```

3. **Configure o banco de dados PostgreSQL:**

   - Configure a variável de ambiente `DATABASE_URL` no arquivo `.env`.
   - Você pode usar o arquivo `.env.example` como base para criar o seu `.env`.

4. **Rode as migrations do Prisma para criar as tabelas e os dados inicias (seed):**

   ```bash
   npx prisma migrate dev
   ```

5. **Caso precise resetar o banco de dados, você pode rodar:**

   ```bash
   npx prisma migrate reset
   ```

6. **Se o VS Code pedir para instalar extensões recomendadas, aceite e instale.**

7. **Inicie a aplicação:**

   ```bash
   npm start
   ```

   A API estará disponível em [http://localhost:3333](http://localhost:3333).

8. **Testando a API:**

   - Os endpoints estão documentados na pasta `postman` deste projeto.
   - Importe a collection do Postman para testar todos os endpoints facilmente.

## Observações

- Use o arquivo `.env.example` como referência para criar o seu `.env` com as configurações necessárias.

---

## 💳 Integração com Stripe

Este projeto utiliza o Stripe para processar pagamentos de ingressos. A integração permite criar sessões de checkout seguras e processar pagamentos automaticamente via webhooks.

> **⚠️ ATENÇÃO OBRIGATÓRIA:**  
> Antes de testar pagamentos, você **DEVE** ativar o método de pagamento (Cards) no Dashboard do Stripe.  
> Sem essa configuração, você receberá erros ao criar checkout sessions.

### Configuração Inicial

1. **Criar conta no Stripe:**

   - Acesse [https://stripe.com](https://stripe.com) e crie uma conta
   - Mantenha em **modo de teste** durante o desenvolvimento

2. **Obter suas chaves da API:**

   - Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/test/apikeys)
   - Copie sua **Secret Key** (começa com `sk_test_...`)
   - Copie sua **Publishable Key** (começa com `pk_test_...`)

3. **🔥 Ativar métodos de pagamento (OBRIGATÓRIO):**

   ⚠️ **Este passo é ESSENCIAL** - Configure os métodos de pagamento antes de testar

   - Acesse [Payment Methods Settings](https://dashboard.stripe.com/test/settings/payment_methods)
   - Na seção **Payment methods**, ative:
     - ✅ **Cards** (Cartões de crédito/débito)
   - Clique em **Save** para salvar as configurações

   **⚠️ Sem essa configuração, você receberá erros ao criar checkout sessions**

4. **Selecionar o tipo de integração de pagamento:**

   Esta aplicação usa **Checkout hospedado pelo Stripe** (Formulário pré-integrado)

   - Acesse [Payment Integration Settings](https://dashboard.stripe.com/test/settings/payment_methods)
   - Quando perguntado "How do you want to accept payments?", selecione:
     - ✅ **Formulário de checkout pré-integrado** (Pre-built checkout form)
     - Descrição: "Use o Checkout para integrar um formulário de pagamento ao seu site ou realizar o direcionamento para uma página hospedada pela Stripe"

   **Por que usar Checkout hospedado?**

   - ✅ Formulário de pagamento totalmente gerenciado pelo Stripe
   - ✅ Certificado SSL automático
   - ✅ Suporte para cartões de crédito/débito internacionais
   - ✅ Design responsivo e acessível
   - ✅ Conformidade PCI já incluída
   - ✅ Menos código no frontend

   **Alternativas não utilizadas neste projeto:**

   - ❌ Links de pagamento compartilháveis - Para envio por email/SMS
   - ❌ Componentes integrados - Para formulário customizado no seu site

5. **Configurar variáveis de ambiente no `.env`:**

   ```env
   # API Configuration
   # URL base da API (usado para configurar webhooks no Stripe Dashboard)
   # Local: http://localhost:3333
   # Produção: https://your-api-domain.com
   API_BASE_URL="http://localhost:3333"

   # Stripe Configuration
   STRIPE_SECRET_KEY="sk_test_sua_chave_secreta_aqui"
   STRIPE_PUBLISHABLE_KEY="pk_test_sua_chave_publica_aqui"
   STRIPE_WEBHOOK_SECRET="whsec_seu_webhook_secret_aqui"

   # Stripe - URLs de Redirecionamento Padrão (Opcionais)
   # Se o frontend não enviar successUrl/cancelUrl, estas URLs serão usadas
   STRIPE_DEFAULT_SUCCESS_URL="http://localhost:3000/payment-success"
   STRIPE_DEFAULT_CANCEL_URL="http://localhost:3000/payment-cancelled"
   ```

   **💡 Sobre as configurações:**

   - **`API_BASE_URL`**: URL base da sua API para webhooks
     - Local: `http://localhost:3333`
     - Produção: `https://your-api-domain.com`
   - **URLs de redirecionamento**: Opcionais, podem ser sobrescritas pelo frontend
   - Em **produção**, configure todas com suas URLs reais

### Testando com Webhooks do Stripe

Existem **duas formas** de testar webhooks:

---

#### **Opção 1: Teste Local com Stripe CLI (Recomendado para desenvolvimento)**

Use o Stripe CLI para encaminhar webhooks para sua máquina local sem expor na internet:

1. **Instalar Stripe CLI** (Windows com Scoop):

   ```bash
   # Instalar Scoop (se não tiver)
   iwr -useb get.scoop.sh | iex

   # Instalar Stripe CLI
   scoop bucket add stripe https://github.com/stripe/stripe-cli.git
   scoop install stripe
   ```

   Ou baixe diretamente em: [https://github.com/stripe/stripe-cli/releases](https://github.com/stripe/stripe-cli/releases)

2. **Fazer login no Stripe:**

   ```bash
   stripe login
   ```

3. **Iniciar o encaminhamento de webhooks:**

   ```bash
   stripe listen --forward-to localhost:3333/stripe/webhook
   ```

4. **Copiar o Webhook Secret:**

   - O comando acima irá exibir um `whsec_...` no terminal
   - Copie e cole no seu `.env` como `STRIPE_WEBHOOK_SECRET`
   - Reinicie a aplicação

5. **Testar webhooks:**

   **Opção A - Simular eventos específicos:**

   ```bash
   # Terminal 1: Stripe CLI escutando webhooks
   stripe listen --forward-to localhost:3333/stripe/webhook

   # Terminal 2: Simular checkout bem-sucedido
   stripe trigger checkout.session.completed

   # Simular outros eventos
   stripe trigger payment_intent.succeeded
   stripe trigger payment_intent.payment_failed
   ```

   **Opção B - Testar fluxo completo (recomendado):**

   Esta é a melhor forma de testar, pois simula o fluxo real:

   ```bash
   # 1. Mantenha o Stripe CLI rodando
   stripe listen --forward-to localhost:3333/stripe/webhook

   # 2. Crie um checkout session via API ou Postman
   POST http://localhost:3333/sale

   # 3. Abra a URL retornada no navegador
   # URL será algo como: https://checkout.stripe.com/c/pay/cs_test_...

   # 4. Use cartão de teste para simular pagamento:
   ```

   **Cartões para Testar Diferentes Cenários:**

   | Cenário                     | Número do Cartão      | Resultado                                        |
   | --------------------------- | --------------------- | ------------------------------------------------ |
   | ✅ **Pagamento aprovado**   | `4242 4242 4242 4242` | Pagamento processado com sucesso                 |
   | ❌ **Cartão recusado**      | `4000 0000 0000 0002` | Erro: Generic decline                            |
   | ❌ **Fundos insuficientes** | `4000 0000 0000 9995` | Erro: Insufficient funds                         |
   | ❌ **Cartão expirado**      | `4000 0000 0000 0069` | Erro: Expired card                               |
   | ❌ **CVC incorreto**        | `4000 0000 0000 0127` | Erro: Incorrect CVC                              |
   | 🔐 **Requer autenticação**  | `4000 0025 0000 3155` | Requer 3D Secure (clique em "Complete" na modal) |
   | ⏱️ **Processamento**        | `4000 0000 0000 9235` | Pagamento fica "processing"                      |

   **Dados para completar o formulário:**

   - **CVV**: Qualquer 3 dígitos (ex: `123`)
   - **Data de validade**: Qualquer data futura (ex: `12/30`)
   - **Nome**: Qualquer nome (ex: `Test User`)
   - **Email**: Seu email (para receber o ingresso)

   **Exemplo de teste completo:**

   ```bash
   # 1. Terminal 1: Stripe CLI
   stripe listen --forward-to localhost:3333/stripe/webhook

   # 2. Terminal 2: Criar checkout
   curl -X POST http://localhost:3333/sale \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "ticketId": "uuid-do-ticket",
       "quantity": 2,
       "successUrl": "http://localhost:3000/success",
       "cancelUrl": "http://localhost:3000/cancel"
     }'

   # 3. Copiar a URL retornada e abrir no navegador

   # 4. Preencher com cartão de teste:
   #    - Número: 4242 4242 4242 4242 (sucesso)
   #    - CVV: 123
   #    - Data: 12/30
   #    - Nome: Test User

   # 5. Confirmar pagamento

   # 6. Verificar logs do Stripe CLI (Terminal 1)
   #    Você verá: checkout.session.completed

   # 7. Verificar logs do backend
   #    Você verá: Venda criada, PDFs gerados, email enviado

   # 8. Verificar email
   #    Ingresso deve chegar no email fornecido
   ```

   **O que observar durante o teste:**

   - ✅ Terminal do Stripe CLI mostra evento `checkout.session.completed`
   - ✅ Logs do backend mostram criação de vendas pendentes
   - ✅ Logs do backend mostram processamento aprovado
   - ✅ PDFs e QR codes gerados
   - ✅ Email enviado com ingressos
   - ✅ Banco de dados atualizado com `paymentStatus: 'paid'`

---

#### **Opção 2: Teste com Webhooks Reais do Stripe (Produção ou Staging)**

Para testar com webhooks reais enviados diretamente pelo Stripe (sem Stripe CLI):

1. **Configure sua API em produção/staging ou use ngrok:**

   **Opção A - Usar API em produção:**

   Sua API já está rodando em: `https://your-api-domain.com`

   Configure no `.env` de produção:

   ```env
   API_BASE_URL="https://your-api-domain.com"
   ```

   **Opção B - Testar localmente com ngrok (para desenvolvimento):**

   ```bash
   # Instalar ngrok (Windows com Scoop)
   scoop install ngrok

   # Ou baixar em: https://ngrok.com/download

   # Criar túnel para sua aplicação local
   ngrok http 3333
   ```

   Você verá algo como:

   ```
   Forwarding  https://abc123.ngrok-free.app -> http://localhost:3333
   ```

   Use essa URL temporária: `https://abc123.ngrok-free.app`

2. **Configurar webhook no Stripe Dashboard:**

   - Acesse: [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
   - Clique em **"Add endpoint"** ou **"+ Adicionar endpoint"**
   - Preencha os campos:

     **Se estiver usando produção:**

     - **Endpoint URL**: `https://your-api-domain.com/stripe/webhook`

     **Se estiver usando ngrok:**

     - **Endpoint URL**: `https://abc123.ngrok-free.app/stripe/webhook`

     **Configurações comuns:**

     - **Description**: `ApaEventus Webhook`
     - **Events to send**: Clique em **"Select events"** e marque:

       - ✅ `checkout.session.completed` **(OBRIGATÓRIO)**
       - `product.created` (opcional)
       - `price.created` (opcional)

       💡 **Veja a lista completa em:** [`STRIPE_EVENTS.md`](./STRIPE_EVENTS.md)

   - Clique em **"Add endpoint"**

3. **Obter o Webhook Secret:**

   - Na lista de endpoints, clique no endpoint que você acabou de criar
   - Na seção **"Signing secret"**, clique em **"Reveal"** ou **"Revelar"**
   - Copie o valor `whsec_...` e adicione no seu `.env`:
     ```env
     STRIPE_WEBHOOK_SECRET="whsec_1234567890abcdef"
     ```
   - Reinicie a aplicação

4. **Testar o webhook:**

   **Opção A - Testar diretamente pelo Dashboard:**

   ```
   1. No Stripe Dashboard, vá para o endpoint criado
   2. Clique na aba "Send test webhook"
   3. Selecione "checkout.session.completed"
   4. Clique em "Send test webhook"
   5. Verifique os logs da sua API
   ```

   **Opção B - Fazer um pagamento real de teste:**

   ```
   1. Crie uma sessão de checkout via API/Postman
   2. Abra a URL retornada no navegador
   3. Use cartão de teste: 4242 4242 4242 4242
   4. Complete o pagamento
   5. O Stripe enviará webhook automaticamente para sua URL
   6. Verifique os logs da API e o email recebido
   ```

5. **Verificar se funcionou:**

   - ✅ No Stripe Dashboard: Webhook aparece como "Succeeded" (verde)
   - ✅ Nos logs da API: "Venda criada com sucesso"
   - ✅ No banco de dados: `paymentStatus: 'paid'`
   - ✅ Email recebido com os ingressos

---

**� Comparação das Opções:**

| Característica       | Stripe CLI (Opção 1)          | Webhook Real (Opção 2)                |
| -------------------- | ----------------------------- | ------------------------------------- |
| **Instalação**       | Requer Stripe CLI             | Apenas configuração no Dashboard      |
| **Velocidade**       | ⚡ Instantâneo                | 🐢 1-2 segundos                       |
| **Internet**         | ❌ Não precisa                | ✅ Precisa (ou ngrok)                 |
| **Melhor para**      | Desenvolvimento local         | Testes realistas, staging, produção   |
| **URL temporária**   | ❌ Não precisa                | ✅ Precisa (ngrok) ou API em produção |
| **Webhook Secret**   | Temporário (muda sempre)      | Permanente (mesma chave)              |
| **Recomendado para** | Debug rápido, desenvolvimento | Testes finais, homologação, produção  |

**💡 Dica:** Use **Opção 1** para desenvolvimento diário e **Opção 2** para testes finais antes de ir para produção.

---

### Fluxo de Pagamento (Checkout Hospedado)

```
┌─────────────┐
│   Frontend  │
│   (Mobile)  │
└──────┬──────┘
       │ 1. POST /sale
       │    { ticketId, quantity, successUrl, cancelUrl }
       ↓
┌──────────────────┐
│     Backend      │
│  (ApaEventus)    │
└──────┬───────────┘
       │ 2. Cria sessão no Stripe
       │    stripe.checkout.sessions.create()
       ↓
┌──────────────────┐
│   Stripe API     │
└──────┬───────────┘
       │ 3. Retorna: { sessionId, url }
       ↓
┌──────────────────┐
│     Backend      │
└──────┬───────────┘
       │ 4. Retorna URL para Frontend
       ↓
┌──────────────────┐
│    Frontend      │
└──────┬───────────┘
       │ 5. Redireciona usuário para url
       │    (Checkout hospedado pelo Stripe)
       ↓
┌──────────────────────────┐
│  Stripe Checkout Page    │
│  (checkout.stripe.com)   │
│                          │
│  [Formulário de Pag.]    │
│  💳 Cartão de Crédito    │
└────┬─────────────────┬───┘
     │                 │
     │ 6a. Paga        │ 6b. Cancela
     ↓                 ↓
  [Stripe            [Stripe
   processa]          cancela]
     │                 │
     ↓                 ↓
┌─────────────────────────┐
│   Webhook Stripe        │
│   checkout.session.     │
│   completed             │
└──────┬──────────────────┘
       │ 7. POST /stripe/webhook
       │    { event: "checkout.session.completed" }
       ↓
┌──────────────────────────┐
│      Backend             │
│  - Cria vendas (pending) │
│  - Gera PDFs e QR codes  │
│  - Upload para S3        │
│  - Marca como 'paid'     │
│  - Envia email           │
└──────┬───────────────────┘
       │ 8. Email enviado
       ↓
┌──────────────────┐
│   📧 Usuário     │
│   recebe ingresso│
└──────────────────┘
       │
       │ 9. Stripe redireciona navegador
       ↓
┌──────────────────┐
│   Frontend       │
│   (successUrl ou │
│    cancelUrl)    │
└──────────────────┘
```

### Endpoints Disponíveis

#### 1. Criar Ticket (Admin)

```http
POST /ticket
Authorization: Bearer {jwt_token_admin}
Content-Type: application/json

{
  "title": "Show Beneficente",
  "description": "Evento APAE",
  "eventDate": "2025-12-31T20:00:00",
  "quantity": 100,
  "price": 50.00
}
```

**⚠️ IMPORTANTE**: Este endpoint **automaticamente cria o produto e preço no Stripe**. Se a criação no Stripe falhar, o ticket é automaticamente apagado do banco de dados e um erro é retornado.

#### 2. Criar Sessão de Checkout

```http
POST /sale
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "ticketId": "uuid-do-ticket",
  "quantity": 2,
  "successUrl": "https://seu-frontend.com/success",  // ⚠️ OPCIONAL
  "cancelUrl": "https://seu-frontend.com/cancel"     // ⚠️ OPCIONAL
}
```

**📌 Sobre `successUrl` e `cancelUrl`:**

- **São opcionais!** Se não enviados, usa URLs padrão configuradas no `.env`
- **Podem ser customizados** pelo frontend para cada requisição
- **URLs padrão** (se não configuradas): `http://localhost:3000/payment-success` e `http://localhost:3000/payment-cancelled`
- **Compatibilidade v2**: Código antigo que não envia essas URLs continuará funcionando

**Exemplo sem URLs (usa padrão):**

```json
{
  "ticketId": "uuid-do-ticket",
  "quantity": 2
}
```

**Resposta:**

```json
{
  "sessionId": "cs_test_1234...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_1234..."
}
```

**O que fazer com a URL:**

1. Frontend recebe a `url` na resposta
2. Redireciona o usuário para essa URL (Checkout hospedado pelo Stripe)
3. Usuário preenche dados de pagamento no site do Stripe
4. Após pagamento:
   - ✅ Sucesso → Stripe redireciona para `successUrl`
   - ❌ Cancelado → Stripe redireciona para `cancelUrl`
5. Webhook processa pagamento e envia ingresso por email automaticamente

**Exemplo de redirecionamento:**

```javascript
// Web
window.location.href = response.url;

// React Native/Expo
import * as WebBrowser from 'expo-web-browser';
await WebBrowser.openBrowserAsync(response.url);
```

#### 3. Webhook (Chamado automaticamente pelo Stripe)

```http
POST /stripe/webhook
Header: stripe-signature
```

### Criação Automática no Stripe

Quando um **admin cria um ticket** via `POST /ticket`:

1. ✅ Ticket é criado no banco de dados
2. ✅ **Automaticamente** cria produto no Stripe
3. ✅ **Automaticamente** cria preço no Stripe
4. ✅ Salva `stripePriceId` no ticket
5. ✅ Retorna ticket completo

**Se houver erro no Stripe:**

- ❌ Ticket é **apagado** do banco
- ❌ Retorna erro detalhado
- ✅ Garante **atomicidade** da operação

Não é necessário chamar endpoints adicionais para criar preços no Stripe!

### Fluxo de Pagamento

1. **Frontend** → Chama `/sale` com URLs de retorno
2. **API** → Retorna URL do Stripe Checkout
3. **Usuário** → É redirecionado para o formulário de pagamento do Stripe
4. **Stripe** → Processa o pagamento
5. **Webhook** → Stripe notifica a API quando pagamento for confirmado
6. **API** → Gera PDFs, QR codes e registra a venda automaticamente
7. **Usuário** → É redirecionado para `successUrl` ou `cancelUrl`

### Cartões de Teste

Use estes cartões no modo de teste (mais detalhes na seção "Testando Localmente com Stripe CLI"):

- **✅ Pagamento bem-sucedido**: `4242 4242 4242 4242`
- **❌ Pagamento recusado (generic)**: `4000 0000 0000 0002`
- **❌ Fundos insuficientes**: `4000 0000 0000 9995`
- **❌ Cartão expirado**: `4000 0000 0000 0069`
- **🔐 Requer autenticação 3D Secure**: `4000 0025 0000 3155`
- **CVV**: Qualquer 3 dígitos
- **Data de validade**: Qualquer data futura
- **Nome**: Qualquer nome

📚 **Lista completa**: [Stripe Testing Cards](https://stripe.com/docs/testing#cards)

### Comandos Úteis do Stripe CLI

Depois de instalar e fazer login no Stripe CLI, você pode usar estes comandos:

```bash
# Escutar webhooks localmente (obrigatório durante desenvolvimento)
stripe listen --forward-to localhost:3333/stripe/webhook

# Simular eventos específicos
stripe trigger checkout.session.completed  # Pagamento completo
stripe trigger payment_intent.succeeded    # Intenção de pagamento bem-sucedida
stripe trigger payment_intent.payment_failed  # Falha no pagamento

# Ver logs de eventos em tempo real
stripe logs tail

# Listar produtos criados
stripe products list

# Listar preços criados
stripe prices list

# Ver detalhes de uma sessão de checkout
stripe checkout sessions retrieve cs_test_xxxxx

# Ver detalhes de um pagamento
stripe payment_intents retrieve pi_xxxxx

# Reenviar um webhook para teste
stripe events resend evt_xxxxx

# Testar webhook com evento customizado
stripe trigger checkout.session.completed \
  --add checkout_session:metadata[ticketId]=test-ticket-id \
  --add checkout_session:metadata[userId]=test-user-id \
  --add checkout_session:metadata[quantity]=2
```

**Dica de Workflow:**

```bash
# Terminal 1: Backend rodando
npm run start:dev

# Terminal 2: Stripe CLI escutando webhooks
stripe listen --forward-to localhost:3333/stripe/webhook

# Terminal 3: Comandos de teste (opcional)
stripe trigger checkout.session.completed

# Ou abra a URL do checkout no navegador e use cartões de teste
```

### Exemplo de Integração Frontend

Para exemplos práticos de como integrar o Stripe no frontend (React Native/Expo), consulte o arquivo [frontend-example.js](./frontend-example.js).

### Modo Produção

Para usar em produção:

1. Mude para as chaves de produção no Dashboard do Stripe
2. Configure o webhook diretamente no Dashboard:

   - Acesse [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   - Adicione seu endpoint: `https://sua-api.com/stripe/webhook`
   - Selecione o evento: `checkout.session.completed`
   - Copie o novo Webhook Secret e atualize no `.env` de produção

3. Atualize as variáveis de ambiente:

   ```env
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_PUBLISHABLE_KEY="pk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

4. **Ativar métodos de pagamento em produção:**
   - Acesse [Payment Methods (Produção)](https://dashboard.stripe.com/settings/payment_methods)
   - Ative **Cards**
   - Salve as configurações

---

## 🆘 Troubleshooting (Problemas Comuns)

### Erro: "No payment method types are enabled"

**Problema:**

```
Error: No payment method types are enabled for this checkout session.
```

**Solução:**

1. Acesse [Payment Methods Settings](https://dashboard.stripe.com/test/settings/payment_methods)
2. Na seção **Payment methods**, marque:
   - ✅ **Cards** (Cartões de crédito/débito)
3. Clique em **Save changes**
4. Aguarde alguns minutos para as mudanças serem aplicadas
5. Tente criar o checkout novamente

### Erro: "Webhook signature verification failed"

**Problema:**

```
BadRequestException: Webhook signature verification failed
```

**Solução:**

- **Local**: Certifique-se de estar usando o Stripe CLI e que o `STRIPE_WEBHOOK_SECRET` no `.env` está correto
- **Produção**: Verifique se configurou o webhook no Dashboard do Stripe e copiou o secret correto

### Erro: "Ticket not found" ao criar checkout

**Problema:**
Ticket existe no banco mas retorna erro ao criar checkout.

**Solução:**
Ticket provavelmente não tem `stripePriceId`. Crie um novo ticket (preços são criados automaticamente agora).

### Email não enviado após pagamento

**Possíveis Causas:**

1. Webhook não foi chamado (verifique logs do Stripe)
2. Variáveis AWS não configuradas no `.env`
3. Erro na geração de PDFs (verificar logs do backend)

**Solução:**
Verifique os logs do backend e do Dashboard do Stripe em **Developers → Webhooks → [seu webhook] → Logs**.

### Pagamento aprovado mas venda não criada

**Problema:**
Usuário pagou mas não recebeu ingresso.

**Solução:**

1. Verifique logs do webhook no Dashboard do Stripe
2. Verifique logs do backend para erros durante processamento
3. Verifique se o webhook está apontando para a URL correta
4. Se necessário, reprocesse manualmente o evento no Dashboard do Stripe

---

## 📋 Changelog

### v3.0.0 - Integração Stripe (Outubro 2025)

**Novas Features:**

- ✅ **Stripe Checkout Sessions**: Integração completa com Stripe para pagamentos via cartão de crédito/débito
- ✅ **Webhooks**: Sistema de webhooks para processar pagamentos de forma assíncrota
- ✅ **Criação Automática de Preços**: Preços no Stripe são criados automaticamente ao criar tickets
- ✅ **Vendas Pendentes**: Sistema de vendas pendentes que só são finalizadas após confirmação de pagamento
- ✅ **Rollback Completo**: Se falhar ao criar no Stripe, ticket e imagem S3 são apagados automaticamente
- ✅ **Status de Pagamento**: Campo `paymentStatus` em vendas (pending, paid, failed, refunded)
- ✅ **Session ID**: Rastreamento completo via `stripeSessionId`

**Endpoints Atualizados:**

- `POST /sale` - Cria sessão de checkout do Stripe (requer autenticação)
- `POST /stripe/webhook` - Processa eventos do Stripe (público, sem autenticação)

**Fluxo de Pagamento:**

1. Frontend chama `POST /sale`
2. Usuário é redirecionado para página de pagamento do Stripe
3. Após pagamento, Stripe envia webhook `checkout.session.completed`
4. Backend cria vendas, gera PDFs/QR codes e envia email automaticamente
5. Vendas marcadas como `paymentStatus: 'paid'`

**Compatibilidade:**

- Frontend precisa ser atualizado para v3.0+ para funcionar corretamente
- Banco de dados: Execute migrations para adicionar campos Stripe
- Variáveis de ambiente: Adicione `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

---
