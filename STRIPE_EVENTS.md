# 📋 Lista de Eventos do Stripe - ApaEventus

## ✅ Eventos Necessários para Configurar no Webhook

Ao adicionar um endpoint de webhook no Stripe Dashboard, você verá uma tela com dezenas de eventos. **Você só precisa selecionar estes:**

---

## 🎯 Evento Obrigatório

### `checkout.session.completed`

**O que faz:**

- Disparado quando o usuário completa o pagamento com sucesso
- É o evento MAIS IMPORTANTE - sem ele, nenhum ingresso será criado!

**O que acontece quando recebido:**

1. Backend recebe o webhook
2. Busca os dados da sessão no Stripe
3. Cria a venda no banco de dados
4. Gera PDFs dos ingressos
5. Gera QR codes
6. Envia email com os ingressos

**Status na resposta:**

```json
{
  "payment_status": "paid"
}
```

**⚠️ CRÍTICO:** Sem este evento, o sistema não funciona!

---

## 📝 Eventos Opcionais (Recomendados)

Estes eventos já são tratados automaticamente pelo código, mas é bom adicioná-los para logs:

### `product.created`

**O que faz:**

- Disparado quando um produto é criado no Stripe
- Acontece automaticamente quando você cria um ticket pela primeira vez

**O que acontece quando recebido:**

- Apenas loga no console: `"Event product.created received - no action needed"`
- Não faz nenhuma ação adicional

**Útil para:**

- Monitorar quando produtos são criados
- Debug e auditoria

---

### `price.created`

**O que faz:**

- Disparado quando um preço é criado no Stripe
- Acontece automaticamente quando você cria um ticket

**O que acontece quando recebido:**

- Apenas loga no console: `"Event price.created received - no action needed"`
- Não faz nenhuma ação adicional

**Útil para:**

- Monitorar quando preços são criados
- Debug e auditoria

---

## 🔧 Como Selecionar no Stripe Dashboard

### Passo a Passo:

1. **Acesse o Dashboard:**

   - Teste: https://dashboard.stripe.com/test/webhooks
   - Produção: https://dashboard.stripe.com/webhooks

2. **Clique em "Add endpoint" ou "+ Add an endpoint"**

3. **Preencha a URL:**

   ```
   https://your-api-domain.com/stripe/webhook
   ```

4. **Clique em "Select events" ou "Escolher eventos"**

5. **Na tela de busca, procure por cada evento:**

   **Busque:** `checkout.session.completed`

   - ✅ Marque o checkbox

   **Busque:** `product.created`

   - ✅ Marque o checkbox (opcional)

   **Busque:** `price.created`

   - ✅ Marque o checkbox (opcional)

6. **Clique em "Add events" ou "Adicionar eventos"**

7. **Clique em "Add endpoint" para finalizar**

---

## 🖼️ Referência Visual

Quando você clicar em "Select events", verá uma tela assim:

```
┌─────────────────────────────────────────────────────┐
│  Select events to listen to                         │
├─────────────────────────────────────────────────────┤
│  🔍 Search events...                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Quando buscar "checkout", você verá:               │
│                                                      │
│  ☐ checkout.session.async_payment_failed            │
│  ☐ checkout.session.async_payment_succeeded         │
│  ✅ checkout.session.completed    ← MARQUE ESTE!   │
│  ☐ checkout.session.expired                         │
│                                                      │
│  Quando buscar "product", você verá:                │
│                                                      │
│  ✅ product.created               ← Opcional        │
│  ☐ product.updated                                  │
│  ☐ product.deleted                                  │
│                                                      │
│  Quando buscar "price", você verá:                  │
│                                                      │
│  ✅ price.created                 ← Opcional        │
│  ☐ price.updated                                    │
│  ☐ price.deleted                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## ❌ Eventos que NÃO são necessários

Você pode ver centenas de outros eventos, mas **NÃO** precisa deles:

- ❌ `payment_intent.*` - Não usado (usamos checkout sessions)
- ❌ `charge.*` - Não usado
- ❌ `customer.*` - Não criamos customers
- ❌ `invoice.*` - Não usamos invoices
- ❌ `subscription.*` - Não usamos assinaturas
- ❌ `checkout.session.expired` - Não tratamos expiração
- ❌ `payment_method.*` - Não salvamos métodos de pagamento

**💡 Dica:** Se você adicionar eventos extras por engano, não tem problema! O sistema vai ignorá-los e logar no console:

```
Unhandled event type: payment_intent.succeeded
```

---

## 🧪 Testando os Eventos

### Com Stripe CLI (Local):

```bash
# Simular checkout completo
stripe trigger checkout.session.completed

# Simular criação de produto
stripe trigger product.created

# Simular criação de preço
stripe trigger price.created
```

### Com Pagamento Real (Recomendado):

1. Criar checkout session via API
2. Abrir URL no navegador
3. Pagar com cartão de teste: `4242 4242 4242 4242`
4. Aguardar webhook `checkout.session.completed`

---

## 📊 Resumo Visual

| Evento                       | Necessário? | O que faz                           | Ação no Backend                    |
| ---------------------------- | ----------- | ----------------------------------- | ---------------------------------- |
| `checkout.session.completed` | ✅ SIM      | Pagamento confirmado                | Cria venda, gera PDFs, envia email |
| `product.created`            | 🟡 Opcional | Produto criado no Stripe            | Apenas loga no console             |
| `price.created`              | 🟡 Opcional | Preço criado no Stripe              | Apenas loga no console             |
| Qualquer outro evento        | ❌ NÃO      | Diversos (não usados neste projeto) | Loga "Unhandled event type"        |

---

## ✅ Checklist

Antes de considerar o webhook configurado corretamente:

- [ ] Endpoint adicionado no Stripe Dashboard
- [ ] URL termina com `/stripe/webhook`
- [ ] Evento `checkout.session.completed` selecionado
- [ ] Webhook secret copiado para `.env` como `STRIPE_WEBHOOK_SECRET`
- [ ] Aplicação reiniciada após atualizar `.env`
- [ ] Teste realizado com cartão `4242 4242 4242 4242`
- [ ] Webhook aparece como "Succeeded" (verde) no Dashboard
- [ ] Email com ingresso foi recebido

---

## 🆘 Problemas Comuns

### Webhook não está funcionando

**Verifique:**

1. ✅ URL está correta (com `/stripe/webhook` no final)
2. ✅ Evento `checkout.session.completed` foi selecionado
3. ✅ `STRIPE_WEBHOOK_SECRET` no `.env` está correto
4. ✅ Aplicação foi reiniciada após atualizar `.env`

### Email não chegou

**Possíveis causas:**

1. ❌ Webhook não foi recebido (ver logs)
2. ❌ Configuração AWS incorreta (SES não configurado)
3. ❌ Email foi para spam

### No Dashboard mostra "Failed"

**Verifique os logs da aplicação para ver o erro exato:**

```bash
# Logs do backend
npm run start:dev

# Ou no Stripe Dashboard:
# Clique no evento com erro → Veja a resposta do webhook
```

---

## 📞 Links Úteis

- **Lista completa de eventos:** https://stripe.com/docs/api/events/types
- **Testar webhooks:** https://dashboard.stripe.com/test/webhooks
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Cartões de teste:** https://stripe.com/docs/testing

---

## 🎯 TL;DR (Resumo Rápido)

**Você precisa adicionar apenas 1 evento obrigatório:**

```
✅ checkout.session.completed
```

**Opcionalmente, adicione mais 2 para logs:**

```
🟡 product.created
🟡 price.created
```

**Todos os outros eventos podem ser ignorados!** ❌
