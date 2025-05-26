import { CreateSaleDto } from '../dtos/create-sale.dto';

export interface ISaleService {
  create(createSaleDto: CreateSaleDto): Promise<void>;
  updateAsUsed(saleId: number): Promise<void>;
  updateAsUnused(saleId: number): Promise<void>;
}
