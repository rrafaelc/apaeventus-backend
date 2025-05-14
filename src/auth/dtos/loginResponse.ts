import { UserDTO } from 'src/user/dtos/user';

export class LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
}
