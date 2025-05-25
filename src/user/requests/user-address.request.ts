import { IsNotEmpty, IsNumber, MaxLength, MinLength } from 'class-validator';

export class UserAddressRequest {
  @IsNotEmpty()
  @MinLength(3)
  street: string;

  @IsNotEmpty()
  @IsNumber()
  number: number;

  @IsNotEmpty()
  @MinLength(3)
  neighborhood: string;

  @IsNotEmpty()
  @MinLength(3)
  city: string;

  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  state: string;

  @IsNotEmpty()
  @MinLength(8)
  zipCode: string;
}
