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
   git clone git@github.com:rrafaelc/apaeventus-backend.git
   cd apaeventus-backend
   ```

2. **Instale as dependências do projeto:**

   ```bash
   npm install
   ```

3. **Configure o banco de dados PostgreSQL:**

   - Crie um banco chamado `apaeventus` no seu PostgreSQL.
   - Configure a variável de ambiente `DATABASE_URL` no arquivo `.env`.
   - Você pode usar o arquivo `.env.example` como base para criar o seu `.env`.

4. **Rode as migrations do Prisma para criar as tabelas:**

   ```bash
   npx prisma migrate dev
   ```

5. **Popule o banco de dados com dados iniciais (seed):**

   - Você pode rodar:

     ```bash
     npx prisma migrate reset
     ```

     ou

     ```bash
     npx prisma db seed
     ```

6. **Se o VS Code pedir para instalar extensões recomendadas, aceite e instale.**

7. **Inicie a aplicação em modo desenvolvimento:**

   ```bash
   npm run start:dev
   ```

   A API estará disponível em [http://localhost:3333](http://localhost:3333).

8. **Testando a API:**

   - Os endpoints estão documentados na pasta `postman` deste projeto.
   - Importe a collection do Postman para testar todos os endpoints facilmente.

## Observações

- Use o arquivo `.env.example` como referência para criar o seu `.env` com as configurações necessárias.
