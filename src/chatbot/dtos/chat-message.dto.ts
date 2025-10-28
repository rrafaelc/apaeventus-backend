import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, {
    message: 'A mensagem não pode ter mais de 500 caracteres',
  })
  message: string;
}
