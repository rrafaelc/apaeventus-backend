import { CreateSaleDto } from '../dtos/create-sale.dto';

export interface ISaleService {
  create(createSaleDto: CreateSaleDto): Promise<void>;
}
