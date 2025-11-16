import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { TestDatabase } from '../tests/configuration/database.setup';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Inicia o container do PostgreSQL e executa migrations
    await TestDatabase.setup();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Aplica as mesmas configurações do main.ts
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
    // Limpa o banco antes de cada teste
    await prisma.user.deleteMany();
  });

  describe('/user (POST) - User Registration', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        rg: '123456789',
        cellphone: '11987654321',
        cpf: '52998224725', // Valid CPF
      };

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toMatchObject({
        name: registerDto.name,
        email: registerDto.email,
        cpf: registerDto.cpf,
        cellphone: registerDto.cellphone,
      });
      expect(response.body).not.toHaveProperty('password');
    });

    it('should not register user with duplicate email', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        rg: '123456789',
        cellphone: '11987654321',
        cpf: '52998224725', // Valid CPF
      };

      // Primeiro registro
      await request(app.getHttpServer())
        .post('/user')
        .send(registerDto)
        .expect(201);

      // Segundo registro com mesmo email
      const response = await request(app.getHttpServer())
        .post('/user')
        .send(registerDto)
        .expect(401);

      expect(response.body.message).toContain('User already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/user')
        .send({})
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });

    it('should validate email format', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'Password123!',
        rg: '123456789',
        cellphone: '11987654321',
        cpf: '52998224725', // Valid CPF
      };

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(
        response.body.message.some((msg: string) =>
          msg.includes('email must be an email'),
        ),
      ).toBe(true);
    });

    it('should validate password strength', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: '123',
        rg: '123456789',
        cellphone: '11987654321',
        cpf: '52998224725', // Valid CPF
      };

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(
        response.body.message.some((msg: string) =>
          msg.includes('password must be longer than or equal to 8 characters'),
        ),
      ).toBe(true);
    });

    it('should validate cpf format', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        rg: '123456789',
        cellphone: '11987654321',
        cpf: '52998224720', // Invalid CPF
      };

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(
        response.body.message.some((msg: string) =>
          msg.includes('Invalid CPF'),
        ),
      ).toBe(true);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Cria um usuário para os testes de login
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          cpf: '52998224725', // Valid CPF
        },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        email: loginDto.email,
      });

      // Valida se são tokens JWT válidos
      const decodedAccessToken = jwt.decode(response.body.accessToken);
      const decodedRefreshToken = jwt.decode(response.body.refreshToken);
      expect(decodedAccessToken).toBeTruthy();
      expect(decodedRefreshToken).toBeTruthy();
      expect(decodedAccessToken).toHaveProperty('id');
      expect(decodedRefreshToken).toHaveProperty('id');
    });

    it('should not login with invalid email', async () => {
      const loginDto = {
        email: 'wrong@example.com',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not login with invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(response.body.message.length).toBeGreaterThan(0);
    });
  });

  describe('/auth/refresh-token (POST)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Cria um usuário e faz login para pegar o refresh token
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          rg: '123456789',
          cellphone: '11987654321',
          cpf: '52998224725', // Valid CPF
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      refreshToken = response.body.refreshToken;

      // Valida que o refreshToken é um JWT válido
      const decodedToken = jwt.decode(refreshToken);
      expect(decodedToken).toBeTruthy();
      expect(decodedToken).toHaveProperty('id');
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).toBeTruthy();

      // Valida se é um token JWT válido
      const decodedToken = jwt.decode(response.body.accessToken);
      expect(decodedToken).toBeTruthy();
      expect(decodedToken).toHaveProperty('id');
    });

    it('should not refresh with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should not refresh without token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(
        response.body.message.some((msg: string) =>
          msg.includes('refreshToken'),
        ),
      ).toBe(true);
    });
  });

  describe('/auth/logout (POST)', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Cria um usuário e faz login
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          rg: '123456789',
          cellphone: '11987654321',
          cpf: '52998224725', // Valid CPF
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;

      // Valida que os tokens são JWT válidos
      const decodedAccessToken = jwt.decode(accessToken);
      const decodedRefreshToken = jwt.decode(refreshToken);
      expect(decodedAccessToken).toBeTruthy();
      expect(decodedRefreshToken).toBeTruthy();
      expect(decodedAccessToken).toHaveProperty('id');
      expect(decodedRefreshToken).toHaveProperty('id');
    });

    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);

      // Verifica que o refresh token foi removido do usuário
      const user = await prisma.user.findFirst({
        where: { email: 'test@example.com' },
      });
      expect(user?.refreshToken).toBeNull();
    });

    it('should not logout without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should not logout without refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(204); // Logout endpoint ignora se não tem refreshToken
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication cycle', async () => {
      // 1. Cria usuário
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await prisma.user.create({
        data: {
          name: 'Flow Test User',
          email: 'flow@example.com',
          password: hashedPassword,
          rg: '123456789',
          cellphone: '11987654321',
          cpf: '52998224725', // Valid CPF
        },
      });

      // 2. Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'flow@example.com',
          password: 'Password123!',
        })
        .expect(200);

      const { refreshToken: loginRefreshToken } = loginResponse.body;

      // Valida se são tokens JWT válidos
      const decodedAccessToken = jwt.decode(loginResponse.body.accessToken);
      const decodedRefreshToken = jwt.decode(loginRefreshToken);
      expect(decodedAccessToken).toBeTruthy();
      expect(decodedRefreshToken).toBeTruthy();
      expect(decodedAccessToken).toHaveProperty('id');
      expect(decodedRefreshToken).toHaveProperty('id');

      // 3. Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: loginRefreshToken })
        .expect(200);

      expect(refreshResponse.body.accessToken).toBeTruthy();
      const decodedNewAccessToken = jwt.decode(
        refreshResponse.body.accessToken,
      );
      expect(decodedNewAccessToken).toBeTruthy();
      expect(decodedNewAccessToken).toHaveProperty('id');

      // 4. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .send({ refreshToken: loginRefreshToken })
        .expect(204);
    });
  });
});
