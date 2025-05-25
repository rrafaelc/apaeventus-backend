/* eslint-disable */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@email.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@email.com',
      role: 'ADMIN',
      password: null,
      rg: null,
      cpf: null,
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.ticket.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Feijoada do Bem',
      description: 'A feijoada mais gostosa do Brasil',
      imageUrl: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
      quantity: 100,
      price: 30.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.ticket.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'Festa Junina',
      description: 'A melhor festa junina do Brasil',
      imageUrl: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
      quantity: 500,
      price: 100.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.ticket.upsert({
    where: { id: 3 },
    update: {},
    create: {
      title: 'Festival de Inverno',
      description: 'O melhor festival de inverno do Brasil',
      imageUrl: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
      quantity: 200,
      price: 100.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
