# ApaEventus Backend

Este projeto é uma API desenvolvida em [NestJS](https://nestjs.com/) para gerenciamento de eventos e vendas de ingressos para a APAE Itapira.

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
