# Exemplo de Requisições para o Chatbot - Postman

## Setup Inicial

1. Primeiro, faça login como ADMIN para obter o token:

```
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "senha_admin"
}
```

Copie o `accessToken` da resposta.

---

## 1. Iniciar Conversa

```
POST http://localhost:3000/chatbot/generate-event
Authorization: Bearer {seu_access_token}
Content-Type: application/json

{
  "message": "Preciso criar um evento mas não sei por onde começar"
}
```

**Resposta esperada:**

```json
{
  "suggestions": [],
  "conversationComplete": false,
  "message": "Que tipo de evento você gostaria de criar? É algo corporativo, cultural, esportivo ou educacional?"
}
```

---

## 2. Segunda Mensagem

```
POST http://localhost:3000/chatbot/generate-event
Authorization: Bearer {seu_access_token}
Content-Type: application/json

{
  "message": "É um evento de tecnologia, uma conferência sobre IA"
}
```

**Resposta esperada:**

```json
{
  "suggestions": [],
  "conversationComplete": false,
  "message": "Interessante! Onde e quando será realizada esta conferência? Você já tem local e data definidos?"
}
```

---

## 3. Terceira Mensagem

```
POST http://localhost:3000/chatbot/generate-event
Authorization: Bearer {seu_access_token}
Content-Type: application/json

{
  "message": "Será no Centro de Convenções dia 20 de novembro"
}
```

**Resposta esperada:**

```json
{
  "suggestions": [],
  "conversationComplete": false,
  "message": "Ótimo! Qual é o público-alvo desta conferência e existe algum diferencial especial que gostaria de destacar?"
}
```

---

## 4. Quarta Mensagem (Final)

```
POST http://localhost:3000/chatbot/generate-event
Authorization: Bearer {seu_access_token}
Content-Type: application/json

{
  "message": "Desenvolvedores e profissionais de TI, com palestrantes internacionais e workshops práticos"
}
```

**Resposta esperada:**

```json
{
  "suggestions": [
    {
      "title": "AI Conference 2025 - Transformando o Futuro",
      "description": "Participe da maior conferência de Inteligência Artificial do ano! No dia 20 de novembro, o Centro de Convenções será palco de discussões revolucionárias sobre IA, com palestrantes internacionais renomados e workshops práticos. Desenvolvedores e profissionais de TI terão a oportunidade única de aprender com os melhores, fazer networking e explorar as últimas tendências em IA. Não perca esta chance de estar na vanguarda da tecnologia!"
    },
    {
      "title": "Tech Summit IA - Inovação em Ação",
      "description": "Prepare-se para um dia intenso de aprendizado e inovação! Em 20 de novembro, reunimos no Centro de Convenções os maiores especialistas internacionais em Inteligência Artificial para compartilhar conhecimentos práticos através de palestras inspiradoras e workshops hands-on. Desenvolvedores e profissionais de TI terão acesso direto a conteúdos exclusivos e networking de alto nível. Garanta sua vaga neste evento transformador!"
    },
    {
      "title": "Conferência Internacional de IA - Edição 2025",
      "description": "O futuro da tecnologia está aqui! Junte-se a nós em 20 de novembro no Centro de Convenções para uma conferência extraordinária sobre Inteligência Artificial. Com palestrantes internacionais de prestígio e workshops práticos exclusivos, este evento foi desenhado especialmente para desenvolvedores e profissionais de TI que querem se manter à frente no mercado. Uma experiência única de aprendizado, networking e inovação aguarda por você!"
    }
  ],
  "conversationComplete": true
}
```

---

## 5. Resetar Conversa (Opcional)

Se quiser recomeçar a conversa:

```
POST http://localhost:3000/chatbot/reset-conversation
Authorization: Bearer {seu_access_token}
```

**Resposta esperada:**

```json
{
  "message": "Conversa resetada com sucesso"
}
```

---

## Testando Rate Limiting

Para testar o rate limit, faça 4 requisições seguidas. Na 4ª, você deve receber:

```json
{
  "statusCode": 429,
  "message": "Limite de requisições excedido. Você pode fazer 12 requisições a cada 30 minutos. Tente novamente em X minutos.",
  "remainingTime": 30
}
```

---

## Timeout de Inatividade

Se você demorar mais de **5 minutos** para responder, a conversa será resetada automaticamente:

```json
{
  "suggestions": [],
  "conversationComplete": false,
  "message": "Sua conversa anterior expirou por inatividade (5 minutos). Vamos começar do zero! Que tipo de evento você gostaria de criar?"
}
```

---

## Erros Comuns

### 401 - Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid access token"
}
```

**Solução:** Token expirado ou inválido. Faça login novamente.

### 403 - Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

**Solução:** Usuário não é ADMIN.

### 400 - Bad Request

```json
{
  "statusCode": 400,
  "message": ["A mensagem não pode ter mais de 500 caracteres"]
}
```

**Solução:** Mensagem muito longa, reduza o tamanho.

---

## Collection Postman (JSON)

Você pode importar esta collection no Postman:

```json
{
  "info": {
    "name": "ApaEventus - Chatbot",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Generate Event Suggestions",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"message\": \"Preciso criar um evento mas não sei por onde começar\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/chatbot/generate-event",
          "host": ["{{base_url}}"],
          "path": ["chatbot", "generate-event"]
        }
      }
    },
    {
      "name": "Reset Conversation",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/chatbot/reset-conversation",
          "host": ["{{base_url}}"],
          "path": ["chatbot", "reset-conversation"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "access_token",
      "value": "seu_token_aqui"
    }
  ]
}
```
