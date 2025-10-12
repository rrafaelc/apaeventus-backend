# Guia de Migração para v3.0

Este guia ajudará você a migrar do ApaEventus Backend v2.x para v3.0 com integração Stripe.

---

## 🚨 Breaking Changes

### 1. Endpoint de Criação de Venda Mudou

**❌ ANTES (v2.x):**

```http
POST /sale
Authorization: Bearer <token>
Content-Type: application/json

{
  "ticketId": "uuid",
  "quantity": 2
}

# Resposta:
{
  "id": "sale-id",
  "tickets": [...],
  // Venda criada imediatamente
}
```

**✅ AGORA (v3.0):**

```http
POST /sale
Authorization: Bearer <token>
Content-Type: application/json

{
  "ticketId": "uuid",
  "quantity": 2,
  "successUrl": "https://meuapp.com/sucesso",  // OPCIONAL
  "cancelUrl": "https://meuapp.com/cancelado"  // OPCIONAL
}

# Ou sem URLs (usa padrão configurado no backend):
{
  "ticketId": "uuid",
  "quantity": 2
}

# Resposta:
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### 2. Fluxo de Pagamento Mudou

**ANTES:**

1. Frontend chama `POST /sale`
2. Backend cria venda imediatamente
3. Backend gera PDFs e envia email
4. Retorna sucesso

**AGORA:**

1. Frontend chama `POST /sale`
2. Backend retorna URL do Stripe
3. Frontend redireciona usuário para Stripe
4. Usuário paga no Stripe
5. Stripe envia webhook para backend
6. Backend cria venda, gera PDFs e envia email
7. Usuário é redirecionado para `successUrl` ou `cancelUrl`

---

## 📋 Checklist de Migração

### Backend

- [ ] **Atualizar código do repositório:**

  ```bash
  git pull origin main
  npm install
  ```

- [ ] **Configurar variáveis de ambiente** (`.env`):

  ```env
  # Adicionar estas novas variáveis
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

- [ ] **Ativar métodos de pagamento no Stripe Dashboard:**

  ⚠️ **OBRIGATÓRIO**: Configure antes de testar

  1. Acesse [Payment Methods Settings](https://dashboard.stripe.com/test/settings/payment_methods)
  2. Ative os métodos de pagamento:
     - ✅ **Cards** (Cartões de crédito/débito)
  3. Clique em **Save**

  **Sem isso você receberá erro:**

  ```
  Error: No payment method types are enabled for this checkout session.
  ```

- [ ] **Selecionar tipo de integração no Stripe:**

  Esta aplicação usa **Checkout hospedado pelo Stripe**

  1. Acesse [Payment Integration Settings](https://dashboard.stripe.com/test/settings/payment_methods)
  2. Quando perguntado "How do you want to accept payments?", escolha:
     - ✅ **Formulário de checkout pré-integrado** (Pre-built checkout form)
  3. Clique em **Save**

  **Benefícios:**

  - Formulário gerenciado pelo Stripe (sem código de checkout no frontend)
  - SSL e PCI compliance automáticos
  - Suporte para cartões de crédito/débito internacionais

- [ ] **Rodar migrations do Prisma:**

  ```bash
  npx prisma migrate deploy
  ```

- [ ] **Configurar URL base da API:**

  Adicione ao `.env`:

  ```env
  # Local
  API_BASE_URL="http://localhost:3333"

  # Produção
  API_BASE_URL="https://your-api-domain.com"
  ```

  **💡 Para que serve:**

  - Usado para configurar webhooks no Stripe Dashboard
  - Em **desenvolvimento**: use `http://localhost:3333` com Stripe CLI
  - Em **produção**: use sua URL real

- [ ] **Configurar URLs padrão de redirecionamento (Opcional):**

  Adicione ao `.env` (se quiser URLs diferentes do padrão):

  ```env
  STRIPE_DEFAULT_SUCCESS_URL="https://seuapp.com/payment-success"
  STRIPE_DEFAULT_CANCEL_URL="https://seuapp.com/payment-cancelled"
  ```

  **💡 Benefícios:**

  - ✅ Frontend não precisa enviar `successUrl`/`cancelUrl` sempre
  - ✅ Mantém compatibilidade com código v2 (sem breaking change)
  - ✅ URLs podem ser sobrescritas pelo frontend quando necessário

- [ ] **Escolher método de teste de webhooks:**

  **Opção 1 - Stripe CLI (Desenvolvimento local):**

  ```bash
  stripe login
  stripe listen --forward-to localhost:3333/stripe/webhook
  # Copiar o webhook secret exibido e atualizar .env
  ```

  **Opção 2 - Webhook Real (Produção/Staging):**

  ```bash
  # Se testar local: usar ngrok
  ngrok http 3333

  # Configurar no Stripe Dashboard:
  # https://dashboard.stripe.com/test/webhooks
  # URL: https://your-api-domain.com/stripe/webhook
  # ou URL do ngrok: https://abc123.ngrok-free.app/stripe/webhook
  #
  # Events to send (clique em "Select events"):
  # ✅ checkout.session.completed (OBRIGATÓRIO)
  # ✅ product.created (opcional)
  # ✅ price.created (opcional)
  ```

- [ ] **Recriar tickets existentes:**
  - Tickets criados antes da v3.0 não têm `stripePriceId`
  - Opções:
    1. Criar novos tickets (recomendado)
    2. Manualmente criar preços no Stripe e atualizar o banco

### Frontend

- [ ] **Atualizar para v3.0+ do frontend**

- [ ] **Remover chamadas para `POST /sale`**

- [ ] **Implementar novo fluxo:**

  ```javascript
  // Opção 1: Com URLs customizadas
  const response = await fetch('/sale', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticketId: 'uuid',
      quantity: 2,
      successUrl: 'myapp://payment-success',
      cancelUrl: 'myapp://payment-cancelled',
    }),
  });

  // Opção 2: Sem URLs (usa padrão do backend - compatível com v2)
  const response = await fetch('/sale', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticketId: 'uuid',
      quantity: 2,
      // successUrl e cancelUrl são opcionais!
    }),
  });
    }),
  });

  const { url } = await response.json();

  // Redirecionar para Stripe
  window.location.href = url; // Web
  // ou
  await WebBrowser.openBrowserAsync(url); // React Native
  ```

- [ ] **Implementar telas de sucesso/cancelamento:**

  - `successUrl`: Mostrar mensagem de sucesso
  - `cancelUrl`: Permitir tentar novamente

- [ ] **Atualizar listagem de ingressos:**
  - Verificar campo `paymentStatus` nas vendas
  - Exibir apenas ingressos com `paymentStatus: 'paid'`

---

## 💾 Mudanças no Banco de Dados

### Novos Campos

**Tabela `Ticket`:**

- `stripePriceId` (String?, nullable): ID do preço no Stripe

**Tabela `TicketSale`:**

- `stripeSessionId` (String?, nullable): ID da sessão de checkout
- `paymentStatus` (String?, default "pending"): Status do pagamento
  - `"pending"`: Aguardando pagamento
  - `"paid"`: Pagamento confirmado
  - `"failed"`: Pagamento falhou
  - `"refunded"`: Pagamento reembolsado

### Migration

A migration já está criada. Execute:

```bash
npx prisma migrate deploy
```

---

## 🧪 Testando a Migração

### 1. Teste de Criação de Ticket

```bash
POST /ticket
# Verificar que retorna com stripePriceId preenchido
```

### 2. Teste de Checkout

```bash
POST /sale
{
  "ticketId": "...",
  "quantity": 1,
  "successUrl": "http://localhost:3000/success",
  "cancelUrl": "http://localhost:3000/cancel"
}
# Deve retornar sessionId e url
```

### 3. Teste de Webhook (Local)

```bash
# Terminal 1: Backend rodando
npm run start:dev

# Terminal 2: Stripe CLI
stripe listen --forward-to localhost:3333/stripe/webhook

# Terminal 3: Simular evento (opção rápida)
stripe trigger checkout.session.completed
```

### 4. Teste de Pagamento Real (Modo Teste) - RECOMENDADO

Este é o teste mais completo, simulando o fluxo real:

```bash
# 1. Terminal 1: Backend rodando
npm run start:dev

# 2. Terminal 2: Stripe CLI escutando
stripe listen --forward-to localhost:3333/stripe/webhook

# 3. Criar checkout session (Postman, curl, ou seu frontend)
POST http://localhost:3333/sale
Authorization: Bearer {seu_token}
Content-Type: application/json

{
  "ticketId": "uuid-do-ticket",
  "quantity": 2,
  "successUrl": "http://localhost:3000/success",
  "cancelUrl": "http://localhost:3000/cancel"
}

# 4. Copiar a URL retornada (checkout.stripe.com)

# 5. Abrir no navegador e testar com cartões:
```

**Cartões para Testar Diferentes Cenários:**

| Cenário                 | Cartão                | Resultado Esperado                                   |
| ----------------------- | --------------------- | ---------------------------------------------------- |
| ✅ Pagamento aprovado   | `4242 4242 4242 4242` | Webhook chama backend → Venda criada → Email enviado |
| ❌ Cartão recusado      | `4000 0000 0000 0002` | Erro na página do Stripe → Nada criado no banco      |
| ❌ Fundos insuficientes | `4000 0000 0000 9995` | Erro de fundos insuficientes                         |
| 🔐 3D Secure            | `4000 0025 0000 3155` | Modal de autenticação → Clique "Complete" → Aprovado |

**Dados para completar:**

- CVV: `123`
- Data: `12/30`
- Nome: `Test User`
- Email: Seu email real (para receber o ingresso)

**O que verificar após pagamento bem-sucedido:**

- [ ] Terminal Stripe CLI mostra `checkout.session.completed`
- [ ] Logs do backend mostram criação de vendas pendentes
- [ ] Logs do backend mostram processamento aprovado
- [ ] PDFs e QR codes gerados
- [ ] Email recebido com ingressos anexados
- [ ] Banco de dados: `ticketSale` com `paymentStatus: 'paid'`
- [ ] Banco de dados: `stripeSessionId` preenchido

### 5. Teste de Falha no Pagamento

Para garantir que o sistema lida bem com falhas:

```bash
# 1. Criar checkout session normalmente

# 2. Abrir URL no navegador

# 3. Usar cartão que falha:
#    Número: 4000 0000 0000 0002
#    CVV: 123
#    Data: 12/30

# 4. Tentar pagar

# Resultado esperado:
# ✅ Erro mostrado na página do Stripe
# ✅ Webhook NÃO é chamado
# ✅ NADA é criado no banco de dados
# ✅ Usuário pode tentar novamente com outro cartão
```

### 6. Comandos Úteis para Debug

```bash
# Ver últimos eventos do Stripe
stripe events list --limit 10

# Ver detalhes de uma sessão específica
stripe checkout sessions retrieve cs_test_xxxxx

# Ver logs em tempo real
stripe logs tail

# Listar produtos criados
stripe products list

# Listar vendas (ticket sales) no banco
# Use seu client SQL ou Prisma Studio
npx prisma studio
```

---

## 🆘 Problemas Comuns

### "No payment method types are enabled"

**Erro Completo:**

```
Error: No payment method types are enabled for this checkout session.
```

**Causa:** Método de pagamento (Cards) não está ativado no Dashboard do Stripe

**Solução:**

1. Acesse [Payment Methods Settings](https://dashboard.stripe.com/test/settings/payment_methods)
2. Na seção **Payment methods**, marque:
   - ✅ **Cards** (Cartões de crédito/débito)
3. Clique em **Save changes**
4. Aguarde 1-2 minutos para as configurações serem aplicadas
5. Tente criar o checkout novamente

### "Ticket not found" ao criar checkout

**Causa:** Ticket não tem `stripePriceId`  
**Solução:** Criar novo ticket (preço será criado automaticamente)

### Webhook não está sendo chamado

**Causa:** Webhook não configurado  
**Solução Local:**

```bash
stripe listen --forward-to localhost:3333/stripe/webhook
```

**Solução Produção:** Configurar webhook no Dashboard do Stripe

### Email não enviado após pagamento

**Causa:** Webhook falhou ou variáveis AWS não configuradas  
**Solução:** Verificar logs do backend e configuração AWS

### "Missing stripe-signature header"

**Causa:** Requisição não veio do Stripe  
**Solução:** Verificar se URL do webhook está correta

---

## 📞 Suporte

- **Issues:** [GitHub Issues](https://github.com/rrafaelc/apaeventus-backend/issues)
- **Email:** rrafaelc@gmail.com
- **Documentação Stripe:** [https://stripe.com/docs](https://stripe.com/docs)

---

## ✅ Checklist Final

Antes de ir para produção:

- [ ] Todos os testes passando
- [ ] Frontend atualizado para v3.0+
- [ ] Webhook configurado no Dashboard do Stripe
- [ ] Chaves de produção configuradas no `.env`
- [ ] Migrations aplicadas no banco de produção
- [ ] Testes de pagamento realizados
- [ ] Monitoramento de webhooks configurado
- [ ] Logs de erro configurados
- [ ] Backup do banco de dados realizado

**Sucesso! 🎉**
