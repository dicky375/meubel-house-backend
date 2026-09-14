import { Model } from 'objection';
import { Category } from '../categories/category.model';
import { ProductVariant } from './productVariant.model';
import { Inventory } from '../inventory/inventory.model';
import { Review } from '../reviews/review.model';

export class Product extends Model {
  static get tableName() {
    return 'products';
  }

  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  price!: number;
  compareAtPrice?: number;
  costPrice?: number;
  sku!: string;
  brand?: string;
  material?: string;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  weight?: number;
  tags?: string[];
  images?: string[];
  featured!: boolean;
  topPick!: boolean;
  isNew!: boolean;
  status!: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';
  isActive!: boolean;
  isPublished!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      category: {
        relation: Model.BelongsToOneRelation,
        modelClass: Category,
        join: { from: 'products.categoryId', to: 'categories.id' },
      },
      variants: {
        relation: Model.HasManyRelation,
        modelClass: ProductVariant,
        join: { from: 'products.id', to: 'product_variants.productId' },
      },
      inventory: {
        relation: Model.HasManyRelation,
        modelClass: Inventory,
        join: { from: 'products.id', to: 'inventory.productId' },
      },
      reviews: {
        relation: Model.HasManyRelation,
        modelClass: Review,
        join: { from: 'products.id', to: 'reviews.productId' },
      },
    };
  }
}