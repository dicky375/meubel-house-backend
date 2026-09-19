import { Model } from 'objection';

export class Promotion extends Model {
  static get tableName() {
    return 'promotions';
  }

  id!: string;
  code!: string;
  description?: string;
  type!: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  value!: number;
  minimumOrder?: number;
  startDate!: string;
  endDate!: string;
  usageLimit?: number;
  usedCount!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}