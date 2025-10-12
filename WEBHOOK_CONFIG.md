# Guia de Configuração de Webhooks Stripe

Este guia explica como configurar webhooks do Stripe para diferentes ambientes.

---

## 📋 Resumo Rápido

| Ambiente        | API_BASE_URL                                | Método de Webhook                |
| --------------- | ------------------------------------------- | -------------------------------- |
| **Local**       | `http://localhost:3333`                     | Stripe CLI (`stripe listen`)     |
| **Produção**    | `https://your-api-domain.com`               | Dashboard do Stripe              |
| **Teste Local** | Usar ngrok: `https://abc123.ngrok-free.app` | Dashboard do Stripe (temporário) |

---

## 🔧 Configuração por Ambiente

### 1️⃣ Desenvolvimento Local (com Stripe CLI)

**Melhor para:** Debug rápido, desenvolvimento diário

**Configuração do `.env`:**

```env
API_BASE_URL="http://localhost:3333"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # Obtido do Stripe CLI
```

**Passos:**

1. Instalar Stripe CLI:

   ```bash
   scoop install stripe
   ```

2. Fazer login:

   ```bash
   stripe login
   ```

3. Iniciar forwarding:

   ```bash
   stripe listen --forward-to localhost:3333/stripe/webhook
   ```

4. Copiar o `whsec_...` exibido no terminal para o `.env`

5. Reiniciar a aplicação

**✅ Prós:**

- Instantâneo
- Não precisa expor na internet
- Fácil de debugar

**❌ Contras:**

- Precisa manter terminal rodando
- Webhook secret muda sempre que reinicia

---

### 2️⃣ Desenvolvimento Local (com ngrok + Dashboard)

**Melhor para:** Testar com frontend mobile, compartilhar com equipe

**Configuração do `.env`:**

```env
API_BASE_URL="https://abc123.ngrok-free.app"  # URL gerada pelo ngrok
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # Obtido do Dashboard
```

**Passos:**

1. Instalar ngrok:

   ```bash
   scoop install ngrok
   ```

2. Criar túnel:

   ```bash
   ngrok http 3333
   ```

3. Copiar URL gerada (ex: `https://abc123.ngrok-free.app`)

4. Configurar no Stripe Dashboard:

   - Acesse: https://dashboard.stripe.com/test/webhooks
   - Clique em "Add endpoint"
   - **Endpoint URL**: `https://abc123.ngrok-free.app/stripe/webhook`
   - **Description**: `ApaEventus Local Test`
   - **Events to send**: Clique em "Select events" e marque:
     - ✅ `checkout.session.completed` **(OBRIGATÓRIO)**
     - ✅ `product.created` (opcional - apenas para logs)
     - ✅ `price.created` (opcional - apenas para logs)
   - Clique em "Add endpoint"

5. Copiar o "Signing secret" (`whsec_...`) para o `.env`

6. Reiniciar a aplicação

**✅ Prós:**

- Webhook permanente (não muda)
- Funciona com frontend mobile
- Testa fluxo real

**❌ Contras:**

- URL temporária (muda quando reinicia ngrok)
- Precisa reconfigurar webhook no Dashboard
- Mais lento que Stripe CLI

---

### 3️⃣ Produção (AWS)

**Melhor para:** Ambiente de produção

**Configuração do `.env` (na AWS):**

```env
API_BASE_URL="https://your-api-domain.com"
STRIPE_SECRET_KEY="sk_live_..."  # ⚠️ CHAVE DE PRODUÇÃO
STRIPE_WEBHOOK_SECRET="whsec_..."  # Obtido do Dashboard (Modo Live)
```

**Passos:**

1. Configurar no Stripe Dashboard (MODO LIVE):

   - Acesse: https://dashboard.stripe.com/webhooks (SEM /test/)
   - Clique em "Add endpoint"
   - **Endpoint URL**: `https://your-api-domain.com/stripe/webhook`
   - **Description**: `ApaEventus Production`
   - **Events to send**: Clique em "Select events" e marque:
     - ✅ `checkout.session.completed` **(OBRIGATÓRIO)**
     - ✅ `product.created` (opcional - apenas para logs)
     - ✅ `price.created` (opcional - apenas para logs)
   - Clique em "Add endpoint"

2. Copiar o "Signing secret" (`whsec_...`)

3. Adicionar no `.env` da AWS (usar AWS Systems Manager Parameter Store ou Secrets Manager)

4. Reiniciar aplicação na AWS

**✅ Prós:**

- Configuração permanente
- URL estável
- Pronto para produção

**❌ Contras:**

- Usa chaves reais (cuidado!)
- Mais difícil de debugar

---

## 🧪 Como Testar

### Teste Rápido (Simular Evento)

```bash
# Apenas com Stripe CLI
stripe trigger checkout.session.completed
```

### Teste Completo (Fluxo Real)

1. Criar checkout session:

   ```bash
   POST http://localhost:3333/sale
   {
     "ticketId": "uuid",
     "quantity": 1
   }
   ```

2. Abrir URL retornada no navegador

3. Preencher com cartão de teste:

   - Número: `4242 4242 4242 4242`
   - CVV: `123`
   - Data: `12/30`
   - Email: Seu email real

4. Confirmar pagamento

5. Verificar:
   - ✅ Webhook recebido (logs)
   - ✅ Venda criada no banco
   - ✅ Email recebido com ingresso

---

## 🔍 Debug de Webhooks

### Ver últimos eventos recebidos:

```bash
stripe events list --limit 10
```

### Ver logs em tempo real:

```bash
stripe logs tail
```

### Reenviar webhook manualmente:

No Dashboard do Stripe:

1. Vá para "Webhooks"
2. Clique no endpoint
3. Clique na aba "Send test webhook"
4. Selecione `checkout.session.completed`
5. Clique em "Send"

---

## ⚠️ Problemas Comuns

### Webhook não está sendo recebido

**Causa 1:** Stripe CLI não está rodando

- **Solução:** `stripe listen --forward-to localhost:3333/stripe/webhook`

**Causa 2:** URL do webhook incorreta no Dashboard

- **Solução:** Verificar se a URL termina com `/stripe/webhook`

**Causa 3:** Webhook secret incorreto

- **Solução:** Copiar novamente do Dashboard/CLI e atualizar `.env`

### "No signatures found matching the expected signature"

**Causa:** Webhook secret está errado ou desatualizado

- **Solução:** Gerar novo secret e atualizar `.env`

### Webhook retorna 401/403

**Causa:** Rota de webhook requer autenticação

- **Solução:** Rota `/stripe/webhook` deve ser pública (sem guard)

---

## 📊 Comparação das Opções

| Característica       | Stripe CLI      | ngrok + Dashboard  | Produção (AWS)  |
| -------------------- | --------------- | ------------------ | --------------- |
| **Velocidade**       | ⚡ Instantâneo  | 🐢 1-2 segundos    | 🐢 1-2 segundos |
| **Configuração**     | 🟢 Simples      | 🟡 Média           | 🟡 Média        |
| **Permanência**      | ❌ Temporário   | ⚠️ Semi-permanente | ✅ Permanente   |
| **Debugging**        | ✅ Excelente    | 🟡 Bom             | ❌ Difícil      |
| **Internet**         | ❌ Não precisa  | ✅ Precisa         | ✅ Precisa      |
| **Mobile Testing**   | ⚠️ Limitado     | ✅ Funciona        | ✅ Funciona     |
| **Recomendado para** | Desenvolvimento | Testes finais      | Produção        |

---

## 🎯 Recomendações

**Para desenvolvimento diário:**

- ✅ Use Stripe CLI

**Para testes com mobile/frontend:**

- ✅ Use ngrok + Dashboard

**Para staging/produção:**

- ✅ Configure webhook no Dashboard com URL permanente

**Para debug de problemas:**

- ✅ Use Stripe CLI para ver eventos em tempo real

---

## 📞 Links Úteis

- **Stripe Dashboard (Test):** https://dashboard.stripe.com/test/webhooks
- **Stripe Dashboard (Live):** https://dashboard.stripe.com/webhooks
- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **ngrok Download:** https://ngrok.com/download
- **Test Cards:** https://stripe.com/docs/testing
