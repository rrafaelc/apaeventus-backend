# Stripe Integration - ApaEventus Backend

## Configuração

1. **Variáveis de Ambiente (.env)**

   ```
   STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
   STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
   STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret_here"
   ```

2. **Migração do Banco de Dados**
   ```bash
   npx prisma migrate dev
   ```

## Endpoints Disponíveis

### 1. Criar Sessão de Checkout

```
POST /sale
```

- **Autenticação**: Required
- **Body**:
  ```json
  {
    "ticketId": "uuid",
    "quantity": 2,
    "successUrl": "https://your-frontend.com/success",
    "cancelUrl": "https://your-frontend.com/cancel"
  }
  ```
- **Resposta**:
  ```json
  {
    "sessionId": "cs_test_1234...",
    "url": "https://checkout.stripe.com/c/pay/cs_test_1234..."
  }
  ```

### 2. Webhook do Stripe

```
POST /stripe/webhook
```

- **Header**: `stripe-signature` (fornecido automaticamente pelo Stripe)
- **Descrição**: Processa eventos do Stripe (pagamento confirmado, etc.)

### 3. Criar Preço Customizado (Raro - Uso Interno)

```
POST /stripe/create-price
```

- **Body**:
  ```json
  {
    "ticketId": "uuid",
    "amount": 25.99,
    "currency": "brl"
  }
  ```
- **Nota**: Este endpoint raramente é necessário, pois os preços são criados automaticamente ao criar tickets.

## Criação Automática de Preços no Stripe

**⚠️ IMPORTANTE**: Ao criar um ticket via `POST /ticket`, o sistema **automaticamente**:

1. ✅ Cria o ticket no banco de dados
2. ✅ Cria o produto no Stripe
3. ✅ Cria o preço no Stripe
4. ✅ Salva o `stripePriceId` no ticket
5. ✅ Retorna o ticket completo com `stripePriceId`

**Se houver erro ao criar no Stripe:**

- ❌ O ticket é **automaticamente apagado** do banco
- ❌ Retorna erro específico do Stripe ao frontend
- ✅ Garante **atomicidade** - ou cria tudo, ou nada

**Exemplo de criação de ticket:**

```http
POST /ticket
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "title": "Show Beneficente",
  "description": "Evento APAE",
  "eventDate": "2025-12-31T20:00:00",
  "quantity": 100,
  "price": 50.00
}
```

**Resposta de sucesso:**

```json
{
  "id": "uuid-do-ticket",
  "title": "Show Beneficente",
  "price": 50.00,
  "stripePriceId": "price_1ABC...",  // ← Criado automaticamente!
  "quantity": 100,
  "eventDate": "2025-12-31T20:00:00Z",
  ...
}
```

**Resposta de erro (se Stripe falhar):**

```json
{
  "statusCode": 400,
  "message": [
    "Failed to create ticket in Stripe payment system: API key is invalid"
  ]
}
```

## Fluxo de Pagamento

### Frontend (Expo/React Native)

1. Usuário seleciona quantidade de ingressos
2. Chama `POST /sale` com URLs de sucesso/cancelamento
3. Redireciona usuário para `response.url` (Stripe Checkout)
4. Stripe processa pagamento e redireciona para `successUrl` ou `cancelUrl`

### Backend (Processamento)

1. Webhook `/stripe/webhook` é chamado quando pagamento é confirmado
2. Sistema cria vendas no banco usando `SaleService.create()`
3. Gera PDFs e QR codes automaticamente
4. Atualiza vendas com `stripeSessionId` e `paymentStatus: 'paid'`

## Campos Adicionados ao Banco

### Tabela `Ticket`

- `stripePriceId`: String opcional para armazenar ID do preço no Stripe

### Tabela `TicketSale`

- `stripeSessionId`: String opcional para vincular à sessão do Stripe
- `paymentStatus`: String opcional ('pending', 'paid', 'failed', 'refunded')

## Segurança

- Webhooks são verificados usando `STRIPE_WEBHOOK_SECRET`
- Apenas eventos `checkout.session.completed` são processados
- Verificação de pagamentos duplicados por `stripeSessionId`
- Integração com sistema de autenticação existente

## Teste

### Cartões de Teste Stripe

- **Sucesso**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requer 3D Secure**: 4000 0025 0000 3155

### Webhook Testing (Stripe CLI)

```bash
stripe listen --forward-to localhost:3333/stripe/webhook
```

## Notas Importantes

- O sistema mantém compatibilidade com vendas antigas (sem Stripe)
- PDFs e QR codes são gerados automaticamente após pagamento confirmado
- Preços são convertidos para centavos automaticamente (R$ 25,99 = 2599 centavos)
- Moeda padrão é BRL (Real brasileiro)
