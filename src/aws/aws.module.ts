import { Module } from '@nestjs/common';
import { AWSService } from './aws.service';

@Module({
  providers: [AWSService],
  exports: [AWSService],
})
export class AWSModule {}
