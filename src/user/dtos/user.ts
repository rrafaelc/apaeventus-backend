export class UserDTO {
  id: number;
  email: string;
  name: string;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}
