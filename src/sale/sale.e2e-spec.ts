import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { TestDatabase } from '../tests/configuration/database.setup';

describe('SaleController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userAccessToken: string;
  let userId: string;
  let ticketId: string;

  beforeAll(async () => {
    await TestDatabase.setup();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    await TestDatabase.teardown();
  });

  beforeEach(async () => {
    await prisma.ticketSale.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.user.deleteMany();

    // Cria usuário para testes
    const hashedPassword = await bcrypt.hash('User123!', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'user@example.com',
        password: hashedPassword,
        cpf: '52998224725',
        role: 'USER',
      },
    });

    userId = user.id;

    // Cria ticket para vendas
    const ticket = await prisma.ticket.create({
      data: {
        title: 'Test Event',
        description: 'Test event for sale',
        price: 5000,
        eventDate: new Date('2025-12-25'),
        quantity: 100,
        imageUrl: 'https://example.com/event.jpg',
        isActive: true,
      },
    });

    ticketId = ticket.id;

    // Faz login para obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'User123!',
      });

    userAccessToken = loginResponse.body.accessToken;
  });

  describe('/sale (POST) - Create Checkout Session', () => {
    it('should create checkout session for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/sale')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          ticketId,
          quantity: 2,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('url');
      expect(response.body.sessionId).toBeTruthy();
    });

    it('should not create checkout without authentication', async () => {
      await request(app.getHttpServer())
        .post('/sale')
        .send({
          ticketId,
          quantity: 1,
        })
        .expect(401);
    });

    it('should validate ticket exists', async () => {
      const nonExistentTicketId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .post('/sale')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          ticketId: nonExistentTicketId,
          quantity: 1,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate quantity is positive', async () => {
      const response = await request(app.getHttpServer())
        .post('/sale')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          ticketId,
          quantity: 0,
        })
        .expect(400);

      // Erro do Stripe é string
      expect(response.body.message).toBeDefined();
    });
  });

  describe('/sale (GET) - Find User Sales', () => {
    beforeEach(async () => {
      // Cria vendas para o usuário
      await prisma.ticketSale.createMany({
        data: [
          {
            userId,
            ticketId,
            paymentStatus: 'paid',
            qrCodeUrl: 'https://example.com/qr1.png',
          },
          {
            userId,
            ticketId,
            paymentStatus: 'pending',
            qrCodeUrl: 'https://example.com/qr2.png',
          },
        ],
      });
    });

    it('should return user sales', async () => {
      const response = await request(app.getHttpServer())
        .get('/sale')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('ticket');
      expect(response.body[0]).toHaveProperty('used');
      expect(response.body[0]).toHaveProperty('qrCodeUrl');
    });

    it('should not return sales without authentication', async () => {
      await request(app.getHttpServer()).get('/sale').expect(401);
    });

    it('should only return sales for authenticated user', async () => {
      // Cria outro usuário
      const hashedPassword = await bcrypt.hash('User2123!', 10);
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other@example.com',
          password: hashedPassword,
          cpf: '12345678901',
          role: 'USER',
        },
      });

      // Cria venda para outro usuário
      await prisma.ticketSale.create({
        data: {
          userId: otherUser.id,
          ticketId,
          paymentStatus: 'paid',
          qrCodeUrl: 'https://example.com/other-qr.png',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/sale')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      // Deve retornar apenas 2 vendas do usuário logado
      expect(response.body).toHaveLength(2);
      // Não podemos verificar userId pois não está no DTO
    });
  });

  describe('/sale/:id (GET) - Find Sale By Id', () => {
    let saleId: string;

    beforeEach(async () => {
      const sale = await prisma.ticketSale.create({
        data: {
          userId,
          ticketId,
          paymentStatus: 'paid',
          qrCodeUrl: 'https://example.com/qr.png',
        },
      });

      saleId = sale.id;
    });

    it('should return sale by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sale/${saleId}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      expect(response.body.id).toBe(saleId);
      expect(response.body).toHaveProperty('ticket');
      expect(response.body).toHaveProperty('used');
    });

    it('should not return sale without authentication', async () => {
      await request(app.getHttpServer()).get(`/sale/${saleId}`).expect(401);
    });

    it('should validate UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/sale/invalid-uuid')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });
  });

  describe('/sale/set-used (POST) - Admin Only', () => {
    let adminToken: string;
    let saleId: string;

    beforeEach(async () => {
      // Cria admin
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@example.com',
          password: hashedPassword,
          cpf: '98765432100',
          role: 'ADMIN',
        },
      });

      // Faz login como admin
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Admin123!',
        });

      adminToken = loginResponse.body.accessToken;

      // Cria venda
      const sale = await prisma.ticketSale.create({
        data: {
          userId,
          ticketId,
          paymentStatus: 'paid',
          used: false,
          qrCodeUrl: 'https://example.com/qr.png',
        },
      });

      saleId = sale.id;
    });

    it('should mark ticket as used by admin', async () => {
      await request(app.getHttpServer())
        .post('/sale/set-used')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ saleId })
        .expect(200);

      // Verifica no banco
      const sale = await prisma.ticketSale.findUnique({
        where: { id: saleId },
      });
      expect(sale?.used).toBe(true);
    });

    it('should not allow non-admin to mark as used', async () => {
      await request(app.getHttpServer())
        .post('/sale/set-used')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ saleId })
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/sale/set-used')
        .send({ saleId })
        .expect(401);
    });
  });

  describe('/sale/set-unused (POST) - Admin Only', () => {
    let adminToken: string;
    let saleId: string;

    beforeEach(async () => {
      // Cria admin
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@example.com',
          password: hashedPassword,
          cpf: '98765432100',
          role: 'ADMIN',
        },
      });

      // Faz login como admin
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Admin123!',
        });

      adminToken = loginResponse.body.accessToken;

      // Cria venda já usada
      const sale = await prisma.ticketSale.create({
        data: {
          userId,
          ticketId,
          paymentStatus: 'paid',
          used: true,
          qrCodeUrl: 'https://example.com/qr.png',
        },
      });

      saleId = sale.id;
    });

    it('should mark ticket as unused by admin', async () => {
      await request(app.getHttpServer())
        .post('/sale/set-unused')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ saleId })
        .expect(200);

      // Verifica no banco
      const sale = await prisma.ticketSale.findUnique({
        where: { id: saleId },
      });
      expect(sale?.used).toBe(false);
    });

    it('should not allow non-admin to mark as unused', async () => {
      await request(app.getHttpServer())
        .post('/sale/set-unused')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ saleId })
        .expect(403);
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate user JWT token structure', () => {
      const decoded = jwt.decode(userAccessToken);

      expect(decoded).toBeTruthy();
      expect(decoded).toHaveProperty('id');
      expect(typeof decoded).toBe('object');
    });
  });
});
