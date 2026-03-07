import { ApiProperty } from '@nestjs/swagger';
import {
  MaxLength,
  IsString,
  IsAlphanumeric,
  Matches,
  IsOptional,
} from 'class-validator';
import { SanitizeHtml, Trim } from '@repo/infra';

export class FindUsersRequestDto {
  @ApiProperty({ example: 'France', description: 'Country of residence' })
  @SanitizeHtml()
  @Trim()
  @IsOptional()
  @MaxLength(50)
  @IsString()
  @Matches(/^[a-zA-Z ]*$/)
  readonly country?: string;

  @ApiProperty({ example: '28566', description: 'Postal code' })
  @SanitizeHtml()
  @Trim()
  @IsOptional()
  @MaxLength(10)
  @IsAlphanumeric()
  readonly postalCode?: string;

  @ApiProperty({ example: 'Grande Rue', description: 'Street' })
  @SanitizeHtml()
  @Trim()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^[a-zA-Z ]*$/)
  readonly street?: string;
}
