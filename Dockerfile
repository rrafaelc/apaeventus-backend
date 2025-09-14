FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

EXPOSE 3333

ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["npm", "run", "start:prod"]
