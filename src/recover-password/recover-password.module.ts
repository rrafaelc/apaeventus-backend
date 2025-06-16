import { Module } from '@nestjs/common';
import { AWSModule } from 'src/aws/aws.module';
import { DatabaseModule } from 'src/database/database.module';
import { RecoverPasswordController } from './recover-password.controller';
import { RecoverPasswordService } from './recover-password.service';

@Module({
  imports: [DatabaseModule, AWSModule],
  providers: [RecoverPasswordService],
  controllers: [RecoverPasswordController],
})
export class RecoverPasswordModule {}
