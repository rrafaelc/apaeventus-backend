import { UserResponseDto } from 'src/user/dtos/user.response.dto';

export class LoginResponseDto {
  accessToken: string;
  refreshToken: string | null;
  user: UserResponseDto;
}
