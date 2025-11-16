import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { TestDatabase } from '../tests/configuration/database.setup';
import { encrypt } from '../utils/crypto';

describe('RecoverPasswordController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await prisma.recoveryCode.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('/recover-password/generate (POST)', () => {
    beforeEach(async () => {
      // Cria um usuário para testes
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          cpf: '52998224725',
        },
      });
    });

    it('should generate recovery code for existing user', async () => {
      await request(app.getHttpServer())
        .post('/recover-password/generate')
        .send({ email: 'test@example.com' })
        .expect(200);

      // Verifica se código foi criado no banco
      const recoveryCode = await prisma.recoveryCode.findFirst({
        where: {
          user: { email: 'test@example.com' },
        },
      });

      expect(recoveryCode).toBeTruthy();
      expect(recoveryCode?.code).toHaveLength(6);
      expect(recoveryCode?.expiresAt).toBeInstanceOf(Date);
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/recover-password/generate')
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

  describe('/recover-password/validate (POST)', () => {
    let encryptedEmail: string;
    let recoveryCode: string;

    beforeEach(async () => {
      // Cria usuário e código de recuperação
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          cpf: '52998224725',
        },
      });

      // Gera código de recuperação
      await request(app.getHttpServer())
        .post('/recover-password/generate')
        .send({ email: 'test@example.com' });

      // Busca código no banco
      const recovery = await prisma.recoveryCode.findFirst({
        where: { userId: user.id },
      });

      recoveryCode = recovery!.code;
      encryptedEmail = encrypt(user.email);
    });

    it('should validate correct recovery code', async () => {
      await request(app.getHttpServer())
        .post('/recover-password/validate')
        .send({
          encryptedEmail,
          code: recoveryCode,
        })
        .expect(200);
    });

    it('should not validate incorrect code', async () => {
      const response = await request(app.getHttpServer())
        .post('/recover-password/validate')
        .send({
          encryptedEmail,
          code: '999999',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid recovery code');
    });

    it('should not validate with invalid encrypted email', async () => {
      const response = await request(app.getHttpServer())
        .post('/recover-password/validate')
        .send({
          encryptedEmail: 'invalid-encrypted-email',
          code: recoveryCode,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('/recover-password/reset (POST)', () => {
    let encryptedEmail: string;
    let recoveryCode: string;

    beforeEach(async () => {
      // Cria usuário
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          cpf: '52998224725',
        },
      });

      // Gera e valida código
      await request(app.getHttpServer())
        .post('/recover-password/generate')
        .send({ email: 'test@example.com' });

      const recovery = await prisma.recoveryCode.findFirst({
        where: { userId: user.id },
      });

      recoveryCode = recovery!.code;
      encryptedEmail = encrypt(user.email);

      // Valida código primeiro
      await request(app.getHttpServer())
        .post('/recover-password/validate')
        .send({ encryptedEmail, code: recoveryCode });
    });

    it('should reset password successfully', async () => {
      await request(app.getHttpServer())
        .post('/recover-password/reset')
        .send({
          encryptedEmail,
          code: recoveryCode,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      // Verifica se pode fazer login com nova senha
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');

      // Verifica que código foi removido
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      const codeExists = await prisma.recoveryCode.findFirst({
        where: { userId: user!.id },
      });
      expect(codeExists).toBeNull();
    });

    it('should not reset with incorrect code', async () => {
      const response = await request(app.getHttpServer())
        .post('/recover-password/reset')
        .send({
          encryptedEmail,
          code: '999999',
          newPassword: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.message).toContain('Could not reset password');
    });

    it('should validate new password strength', async () => {
      const response = await request(app.getHttpServer())
        .post('/recover-password/reset')
        .send({
          encryptedEmail,
          code: recoveryCode,
          newPassword: '123',
        })
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(
        response.body.message.some((msg: string) =>
          msg.includes('newPassword'),
        ),
      ).toBe(true);
    });
  });

  describe('Complete Password Recovery Flow', () => {
    it('should complete full password recovery cycle', async () => {
      // 1. Cria usuário
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'flow@example.com',
          password: hashedPassword,
          cpf: '52998224725',
        },
      });

      // 2. Gera código de recuperação
      await request(app.getHttpServer())
        .post('/recover-password/generate')
        .send({ email: 'flow@example.com' })
        .expect(200);

      // 3. Busca código gerado
      const recovery = await prisma.recoveryCode.findFirst({
        where: { user: { email: 'flow@example.com' } },
      });

      expect(recovery).toBeTruthy();

      const { code } = recovery!;
      const encryptedEmail = encrypt('flow@example.com');

      // 4. Valida código
      await request(app.getHttpServer())
        .post('/recover-password/validate')
        .send({ encryptedEmail, code })
        .expect(200);

      // 5. Reseta senha
      await request(app.getHttpServer())
        .post('/recover-password/reset')
        .send({
          encryptedEmail,
          code,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      // 6. Faz login com nova senha
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'flow@example.com',
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
    });
  });
});
