export class UpdateUserDto {
  id: string;
  email?: string;
  name?: string;
  password?: string;
  refreshToken?: string | null;
}
