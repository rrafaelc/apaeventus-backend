import { Request } from 'express';
import { User } from 'src/user/entities/user';

export interface CustomRequest extends Request {
  user: User;
}
