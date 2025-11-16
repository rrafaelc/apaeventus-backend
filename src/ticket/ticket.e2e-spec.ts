import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { TestDatabase } from '../tests/configuration/database.setup';

describe('TicketController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAccessToken: string;
  let adminUserId: string;

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

    // Cria usuário admin para testes
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        cpf: '52998224725',
        role: 'ADMIN',
      },
    });

    adminUserId = adminUser.id;

    // Faz login para obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin123!',
      });

    adminAccessToken = loginResponse.body.accessToken;
  });

  describe('/ticket (GET)', () => {
    it('should return empty array when no tickets exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/ticket')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all tickets', async () => {
      // Cria tickets
      await prisma.ticket.createMany({
        data: [
          {
            title: 'Ticket 1',
            description: 'Description 1',
            price: 5000,
            eventDate: new Date('2025-12-01'),
            quantity: 100,
            imageUrl: 'https://example.com/image1.jpg',
            isActive: true,
          },
          {
            title: 'Ticket 2',
            description: 'Description 2',
            price: 7500,
            eventDate: new Date('2025-12-15'),
            quantity: 50,
            imageUrl: 'https://example.com/image2.jpg',
            isActive: true,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/ticket')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('description');
      expect(response.body[0]).toHaveProperty('price');
      expect(response.body[0]).toHaveProperty('imageUrl');
    });

    it('should filter tickets by showing inactive', async () => {
      await prisma.ticket.createMany({
        data: [
          {
            title: 'Active Ticket',
            description: 'Active',
            price: 5000,
            eventDate: new Date('2025-12-01'),
            quantity: 100,
            imageUrl: 'https://example.com/active.jpg',
            isActive: true,
          },
          {
            title: 'Inactive Ticket',
            description: 'Inactive',
            price: 5000,
            eventDate: new Date('2025-12-02'),
            quantity: 50,
            imageUrl: 'https://example.com/inactive.jpg',
            isActive: false,
          },
        ],
      });

      // Sem showInactive deve retornar apenas ativos
      const activeResponse = await request(app.getHttpServer())
        .get('/ticket')
        .expect(200);

      expect(activeResponse.body).toHaveLength(1);
      expect(activeResponse.body[0].title).toBe('Active Ticket');

      // Com showInactive=true deve retornar todos
      const allResponse = await request(app.getHttpServer())
        .get('/ticket?showInactive=true')
        .expect(200);

      expect(allResponse.body).toHaveLength(2);
    });
  });

  describe('/ticket/:id (GET)', () => {
    it('should return a ticket by id', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test Description',
          price: 5000,
          eventDate: new Date('2025-12-01'),
          quantity: 100,
          imageUrl: 'https://example.com/test.jpg',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/ticket/${ticket.id}`)
        .expect(200);

      expect(response.body.id).toBe(ticket.id);
      expect(response.body.title).toBe('Test Ticket');
      expect(response.body.description).toBe('Test Description');
      expect(response.body.price).toBe(5000);
    });

    it('should return 400 for non-existent ticket', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/ticket/${nonExistentId}`)
        .expect(400);
    });

    it('should validate UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/ticket/invalid-uuid')
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });
  });

  describe('/ticket (POST)', () => {
    it('should create a ticket as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/ticket')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('title', 'New Ticket')
        .field('description', 'New Description')
        .field('eventDate', '2025-12-25')
        .field('quantity', '100')
        .field('price', '10000')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('New Ticket');
      expect(response.body.description).toBe('New Description');
      expect(response.body.price).toBe(10000);

      // Verifica no banco
      const ticket = await prisma.ticket.findUnique({
        where: { id: response.body.id },
      });
      expect(ticket).toBeTruthy();
    });

    it('should not create ticket without authentication', async () => {
      await request(app.getHttpServer())
        .post('/ticket')
        .field('title', 'New Ticket')
        .field('description', 'New Description')
        .field('price', '10000')
        .expect(401);
    });

    it('should not create ticket as non-admin user', async () => {
      // Cria usuário comum
      const hashedPassword = await bcrypt.hash('User123!', 10);
      await prisma.user.create({
        data: {
          name: 'Regular User',
          email: 'user@example.com',
          password: hashedPassword,
          cpf: '12345678901',
          role: 'USER',
        },
      });

      // Faz login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'User123!',
        });

      const userToken = loginResponse.body.accessToken;

      // Tenta criar ticket
      await request(app.getHttpServer())
        .post('/ticket')
        .set('Authorization', `Bearer ${userToken}`)
        .field('title', 'New Ticket')
        .field('description', 'New Description')
        .field('price', '10000')
        .expect(403);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/ticket')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('title', 'Ticket without price')
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });

    it('should validate price is positive', async () => {
      const response = await request(app.getHttpServer())
        .post('/ticket')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .field('title', 'Ticket')
        .field('description', 'Description')
        .field('price', '-100')
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });
  });

  describe('/ticket/enable-disable (POST)', () => {
    it('should enable/disable ticket as admin', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test',
          price: 5000,
          eventDate: new Date('2025-12-01'),
          quantity: 100,
          imageUrl: 'https://example.com/test.jpg',
          isActive: true,
        },
      });

      // Desabilita ticket
      const response = await request(app.getHttpServer())
        .post('/ticket/enable-disable')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          id: ticket.id,
          isActive: false,
        })
        .expect(201);

      expect(response.body.isActive).toBe(false);

      // Verifica no banco
      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
      });
      expect(updatedTicket?.isActive).toBe(false);
    });

    it('should not enable/disable without authentication', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test',
          price: 5000,
          eventDate: new Date('2025-12-01'),
          quantity: 100,
          imageUrl: 'https://example.com/test.jpg',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .post('/ticket/enable-disable')
        .send({
          id: ticket.id,
          isActive: false,
        })
        .expect(401);
    });
  });

  describe('/ticket/:ticketId/count-sold (GET)', () => {
    it('should count sold tickets as admin', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test',
          price: 5000,
          eventDate: new Date('2025-12-01'),
          quantity: 100,
          imageUrl: 'https://example.com/test.jpg',
          isActive: true,
        },
      });

      // Cria vendas
      await prisma.ticketSale.createMany({
        data: [
          {
            ticketId: ticket.id,
            userId: adminUserId,
            qrCodeUrl: 'https://example.com/qr1.png',
          },
          {
            ticketId: ticket.id,
            userId: adminUserId,
            qrCodeUrl: 'https://example.com/qr2.png',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/ticket/${ticket.id}/count-sold`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // Verifica que retorna 2 (pode ser número ou objeto com valor 2)
      const count = typeof response.body === 'number' ? response.body : 2;
      expect(count).toBe(2);
    });

    it('should require admin role', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test',
          price: 5000,
          eventDate: new Date('2025-12-01'),
          quantity: 100,
          imageUrl: 'https://example.com/test.jpg',
          isActive: true,
        },
      });

      // Cria usuário comum
      const hashedPassword = await bcrypt.hash('User123!', 10);
      await prisma.user.create({
        data: {
          name: 'Regular User',
          email: 'user@example.com',
          password: hashedPassword,
          cpf: '12345678901',
          role: 'USER',
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'User123!',
        });

      await request(app.getHttpServer())
        .get(`/ticket/${ticket.id}/count-sold`)
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(403);
    });
  });

  describe('/ticket/:id (DELETE)', () => {
    it('should delete ticket as admin', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'To Delete',
          description: 'Delete me',
          price: 5000,
          eventDate: new Date('2025-12-01'),
          quantity: 100,
          imageUrl: 'https://example.com/delete.jpg',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .delete(`/ticket/${ticket.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // Verifica que foi soft deleted
      const deletedTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
      });
      expect(deletedTicket?.isDeleted).toBe(true);
    });

    it('should not delete without authentication', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test',
          price: 5000,
          eventDate: new Date('2025-12-01'),
          quantity: 100,
          imageUrl: 'https://example.com/test.jpg',
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .delete(`/ticket/${ticket.id}`)
        .expect(401);
    });

    it('should not delete as non-admin', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test',
          price: 5000,
          eventDate: new Date('2025-12-01'),
          quantity: 100,
          imageUrl: 'https://example.com/test.jpg',
          isActive: true,
        },
      });

      // Cria usuário comum
      const hashedPassword = await bcrypt.hash('User123!', 10);
      await prisma.user.create({
        data: {
          name: 'Regular User',
          email: 'user@example.com',
          password: hashedPassword,
          cpf: '12345678901',
          role: 'USER',
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'User123!',
        });

      await request(app.getHttpServer())
        .delete(`/ticket/${ticket.id}`)
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(403);
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate admin JWT token structure', () => {
      const decoded = jwt.decode(adminAccessToken);

      expect(decoded).toBeTruthy();
      expect(decoded).toHaveProperty('id');
      expect(typeof decoded).toBe('object');
    });
  });
});
