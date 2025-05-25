export class UpdateUserDto {
  id: number;
  email?: string;
  password?: string;
  name?: string;
  refreshToken?: string | null;
}
