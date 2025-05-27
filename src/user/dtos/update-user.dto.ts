export class UpdateUserDto {
  id: string;
  email?: string;
  password?: string;
  name?: string;
  refreshToken?: string | null;
}
