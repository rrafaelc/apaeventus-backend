import { CreateSaleDto } from '../dtos/create-sale.dto';
import { UpdateAsUnusedDto } from '../dtos/update-as-unused.dto';
import { UpdateAsUsedDto } from '../dtos/update-as-used.dto';

export interface ISaleService {
  create(createSaleDto: CreateSaleDto): Promise<void>;
  updateAsUsed(updateAsUsedDto: UpdateAsUsedDto): Promise<void>;
  updateAsUnused(updateAsUnusedDto: UpdateAsUnusedDto): Promise<void>;
}
