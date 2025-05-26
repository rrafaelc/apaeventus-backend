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
      title: '1ª TARDE ROCK',
      description:
        'Nossa primeira edição da Tarde Rock em prol a Apae de Itapira',
      eventDate: new Date(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).setHours(19, 0, 0, 0), // Event in 30 days at 19:00
      ),
      imageUrl: null,
      quantity: 100,
      price: 30.0,
      isActive: true,
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
      eventDate: new Date(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).setHours(19, 0, 0, 0), // Event in 30 days at 19:00
      ),
      quantity: 500,
      price: 100.0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.ticket.upsert({
    where: { id: 3 },
    update: {},
    create: {
      title: '1ª QUEIMA DO ALHO',
      description:
        'Primeira edição da Queima do Alho juntamente com a tradicional Cavalgada e Passeio de Jeep',
      eventDate: new Date(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).setHours(19, 0, 0, 0), // Event in 30 days at 19:00
      ),
      imageUrl: null,
      quantity: 200,
      price: 100.0,
      isActive: true,
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
