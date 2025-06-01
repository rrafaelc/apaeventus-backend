#!/bin/sh
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run build
npm run start:prod