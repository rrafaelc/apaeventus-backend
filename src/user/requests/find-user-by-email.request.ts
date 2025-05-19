import { IsEmail } from 'class-validator';

export class FindUserByEmailRequest {
  @IsEmail()
  email: string;
}
