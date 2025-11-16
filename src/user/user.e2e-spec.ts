import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { TestDatabase } from '../tests/configuration/database.setup';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

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
    await prisma.user.deleteMany();
  });

  describe('/user (POST) - Create User', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        rg: '123456789',
        cellphone: '11987654321',
        cpf: '52998224725',
      };

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body.name).toBe(createUserDto.name);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body.role).toBe('USER');
    });

    it('should not create user with invalid CPF', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        rg: '123456789',
        cellphone: '11987654321',
        cpf: '12345678901',
      };

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(createUserDto)
        .expect(400);

      expect(response.body.message).toContain('Invalid CPF');
    });

    it('should not create user with duplicate email', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        rg: '123456789',
        cellphone: '11987654321',
        cpf: '52998224725',
      };

      await request(app.getHttpServer()).post('/user').send(createUserDto);

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(createUserDto)
        .expect(401);

      expect(response.body.message).toContain('User already exists');
    });

    it('should not create user with duplicate CPF', async () => {
      await prisma.user.create({
        data: {
          name: 'Existing User',
          email: 'existing@example.com',
          password: await bcrypt.hash('Password123!', 10),
          cpf: '52998224725',
        },
      });

      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        rg: '123456789',
        cellphone: '11987654321',
        cpf: '52998224725',
      };

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(createUserDto)
        .expect(401);

      expect(response.body.message).toContain(
        'User with same CPF already exists',
      );
    });
  });

  describe('/user (PATCH) - Update User', () => {
    beforeEach(async () => {
      // Cria e loga usuário
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          cpf: '52998224725',
        },
      });

      userId = user.id;

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should update user name', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.email).toBe('test@example.com');
    });

    it('should update user email', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'newemail@example.com' })
        .expect(200);

      expect(response.body.email).toBe('newemail@example.com');
    });

    it('should update user password', async () => {
      await request(app.getHttpServer())
        .patch('/user')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'NewPassword123!' })
        .expect(200);

      // Tenta fazer login com nova senha
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
    });

    it('should not update without authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user')
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should validate email format on update', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(
        response.body.message.some((msg: string) =>
          msg.includes('email must be an email'),
        ),
      ).toBe(true);
    });
  });

  describe('/user/profile (GET) - Get User Profile', () => {
    beforeEach(async () => {
      // Cria e loga usuário
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          rg: '123456789',
          cellphone: '11987654321',
          cpf: '52998224725',
        },
      });

      userId = user.id;

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.name).toBe('Test User');
      expect(response.body.cpf).toBe('52998224725');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should not get profile without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });
});
