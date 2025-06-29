import { Type } from "class-transformer";
import { IsOptional, IsPositive, Min } from "class-validator";


export class PaginationDto {

    @IsOptional()
    @IsPositive()
    @Type(() => Number) // enableImplicitConversions: true en el main
    limit?: number;

    @IsOptional()
    // @IsPositive() no funciona si se manda 0
    @Min(0)
    @Type(() => Number) // enableImplicitConversions: true en el main
    offset?: number;

}