export class UpdateUserDto {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  rg?: string;
  cellphone?: string;
  refreshToken?: string | null;
}
