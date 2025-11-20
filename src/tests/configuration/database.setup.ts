import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TestDatabase {
  private static container: StartedPostgreSqlContainer;
  private static originalDatabaseUrl: string | undefined;

  static async setup(): Promise<void> {
    // Salva a URL original do banco
    this.originalDatabaseUrl = process.env.DATABASE_URL;

    console.log('Starting PostgreSQL container...');

    // Inicia o container PostgreSQL
    this.container = await new PostgreSqlContainer('postgres:16.3-bookworm')
      .withExposedPorts(5432)
      .start();

    const connectionString = this.container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;

    console.log('PostgreSQL container started');
    console.log('Running Prisma migrations...');

    // Executa as migrations do Prisma
    try {
      await execAsync('npx prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: connectionString,
        },
      });
      console.log('Prisma migrations completed');
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    }
  }

  static async teardown(): Promise<void> {
    console.log('Stopping PostgreSQL container...');

    if (this.container) {
      await this.container.stop();
      console.log('PostgreSQL container stopped');
    }

    // Restaura a URL original do banco
    if (this.originalDatabaseUrl) {
      process.env.DATABASE_URL = this.originalDatabaseUrl;
    }
  }

  static getConnectionString(): string {
    return this.container.getConnectionUri();
  }
}
