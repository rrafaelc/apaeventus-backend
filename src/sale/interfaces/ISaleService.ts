import { CreateSaleDto } from '../dtos/create-sale.dto';
import { FindAllSaleDto } from '../dtos/find-all-sale.dto';
import { FindSaleByIdDto } from '../dtos/find-sale-by-id.dto';
import { TicketSaleResponse } from '../dtos/ticket-sale.response';
import { UpdateAsUnusedDto } from '../dtos/update-as-unused.dto';
import { UpdateAsUsedDto } from '../dtos/update-as-used.dto';

export interface ISaleService {
  create(createSaleDto: CreateSaleDto): Promise<void>;
  find(findAllSaleDto: FindAllSaleDto): Promise<TicketSaleResponse[]>;
  findOne(findSaleByIdDto: FindSaleByIdDto): Promise<TicketSaleResponse>;
  updateAsUsed(updateAsUsedDto: UpdateAsUsedDto): Promise<void>;
  updateAsUnused(updateAsUnusedDto: UpdateAsUnusedDto): Promise<void>;
}
