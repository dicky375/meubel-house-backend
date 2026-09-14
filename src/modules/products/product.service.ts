import { Product } from './product.model';
import { ProductVariant } from './productVariant.model';
import { Category } from '../categories/category.model';
import { InventoryService } from '../inventory/inventory.service';
import { slugify } from '../../utils/slugify';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { getPagination, buildPaginatedResult } from '../../utils/pagination';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from './product.validation';

export class ProductService {
  // ─── CREATE ─────────────────────────────────────
  static async create(data: CreateProductInput): Promise<Product> {
    // Validate category if provided
    if (data.categoryId) {
      const cat = await Category.query().findById(data.categoryId);
      if (!cat) throw new BadRequestError('Category not found');
    }

    // Check SKU uniqueness
    const existingSku = await Product.query().where('sku', data.sku).first();
    if (existingSku) throw new BadRequestError(`SKU "${data.sku}" already exists`);

    const slug = await this.generateUniqueSlug(data.name);

    const product = await Product.transaction(async (trx) => {
      const { variants, initialStock, ...productData } = data;

      const created: Product = await Product.query(trx).insert({
        ...productData,
        slug,
      } as any);

      // Create variants if provided
      if (variants && variants.length > 0) {
        for (const v of variants) {
          const variant: ProductVariant = await ProductVariant.query(trx).insert({
            ...v,
            productId: created.id,
          } as any);

          await InventoryService.upsertForVariant(
            {
              productId: created.id,
              variantId: variant.id,
              quantity: v.stock ?? 0,
            },
            trx
          );
        }
      } else {
        // No variants: create a default inventory row
        await InventoryService.upsertForVariant(
          {
            productId: created.id,
            quantity: initialStock ?? 0,
          },
          trx
        );
      }

      return created;
    });

    return this.findById(product.id);
  }

  // ─── READ: LIST ─────────────────────────────────
  static async findAll(query: ProductQueryInput, isAdmin: boolean) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    let qb = Product.query();

    // Storefront visibility rule (non-admin)
    if (!isAdmin) {
      qb = qb.where('isActive', true).where('isPublished', true);
    } else if (query.status) {
      qb = qb.where('status', query.status);
    }

    // Search (name + description + brand)
    if (query.search) {
      qb = qb.where((builder) => {
        builder
          .where('name', 'ilike', `%${query.search}%`)
          .orWhere('description', 'ilike', `%${query.search}%`)
          .orWhere('brand', 'ilike', `%${query.search}%`);
      });
    }

    // Category
    if (query.categoryId) {
      qb = qb.where('categoryId', query.categoryId);
    } else if (query.categorySlug) {
      const cat = await Category.query().where('slug', query.categorySlug).first();
      if (!cat) return buildPaginatedResult([], 0, page, limit);
      qb = qb.where('categoryId', cat.id);
    }

    // Direct field filters
    if (query.brand) qb = qb.where('brand', 'ilike', `%${query.brand}%`);
    if (query.material) qb = qb.where('material', 'ilike', `%${query.material}%`);

    // Tags filter (array contains)
    if (query.tags) {
      const tags = Array.isArray(query.tags) ? query.tags : [query.tags];
      qb = qb.whereRaw('tags && ?', [tags]);
    }

    // Price range
    if (query.priceMin !== undefined) qb = qb.where('price', '>=', query.priceMin);
    if (query.priceMax !== undefined) qb = qb.where('price', '<=', query.priceMax);

    // Booleans
    if (query.featured !== undefined) qb = qb.where('featured', query.featured);
    if (query.topPick !== undefined) qb = qb.where('topPick', query.topPick);
    if (query.isNew !== undefined) qb = qb.where('isNew', query.isNew);

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('[category, variants, inventory]');

    // Hide costPrice for non-admin
    const sanitized = data.map((p) => this.sanitize(p, isAdmin));

    return buildPaginatedResult(sanitized, total, page, limit);
  }

  // ─── READ: BY ID ────────────────────────────────
  static async findById(id: string, isAdmin = true): Promise<Product> {
    const product = await Product.query()
      .findById(id)
      .withGraphFetched('[category, variants, inventory, reviews]');

    if (!product) throw new NotFoundError('Product');
    return this.sanitize(product, isAdmin);
  }

  // ─── READ: BY SLUG ──────────────────────────────
  static async findBySlug(slug: string, isAdmin = false): Promise<Product> {
    let qb = Product.query().where('slug', slug);

    if (!isAdmin) {
      qb = qb.where('isActive', true).where('isPublished', true);
    }

    const product = await qb
      .withGraphFetched('[category, variants, inventory, reviews]')
      .first();

    if (!product) throw new NotFoundError('Product');
    return this.sanitize(product, isAdmin);
  }

  // ─── UPDATE ─────────────────────────────────────
  static async update(id: string, data: UpdateProductInput): Promise<Product> {
    const product = await Product.query().findById(id);
    if (!product) throw new NotFoundError('Product');

    // Validate category
    if (data.categoryId && data.categoryId !== product.categoryId) {
      const cat = await Category.query().findById(data.categoryId);
      if (!cat) throw new BadRequestError('Category not found');
    }

    // SKU uniqueness (if changed)
    if (data.sku && data.sku !== product.sku) {
      const existing = await Product.query()
        .where('sku', data.sku)
        .whereNot('id', id)
        .first();
      if (existing) throw new BadRequestError(`SKU "${data.sku}" already exists`);
    }

    const { variants, initialStock, ...productData } = data;

    // Regenerate slug if name changed
    if (productData.name && productData.name !== product.name) {
      (productData as any).slug = await this.generateUniqueSlug(productData.name, id);
    }

    await Product.transaction(async (trx) => {
      await Product.query(trx).patchAndFetchById(id, productData as any);

      // Replace variants if provided
      if (variants) {
        // Delete existing variants + their inventory
        const existingVariants = await ProductVariant.query(trx).where(
          'productId',
          id
        );
        for (const v of existingVariants) {
          await InventoryService.deleteByVariant(v.id);
        }
        await ProductVariant.query(trx).where('productId', id).delete();

        // Create new variants
        for (const v of variants) {
          const variant: ProductVariant = await ProductVariant.query(trx).insert({
            ...v,
            productId: id,
          } as any);
          await InventoryService.upsertForVariant(
            {
              productId: id,
              variantId: variant.id,
              quantity: v.stock ?? 0,
            },
            trx
          );
        }
      } else if (initialStock !== undefined) {
        // Update stock on the default inventory row (no variants)
        const hasVariants = await ProductVariant.query(trx)
          .where('productId', id)
          .resultSize();
        if (hasVariants === 0) {
          await InventoryService.upsertForVariant(
            {
              productId: id,
              quantity: initialStock,
            },
            trx
          );
        }
      }
    });

    return this.findById(id);
  }

  // ─── DELETE ─────────────────────────────────────
  static async delete(id: string): Promise<void> {
    const product = await Product.query().findById(id);
    if (!product) throw new NotFoundError('Product');

    await Product.transaction(async (trx) => {
      await InventoryService.deleteByProduct(id);
      await ProductVariant.query(trx).where('productId', id).delete();
      await Product.query(trx).deleteById(id);
    });
  }

  // ─── HELPERS ────────────────────────────────────
  private static async generateUniqueSlug(
    name: string,
    excludeId?: string
  ): Promise<string> {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await Product.query().where('slug', slug).first();
      if (!existing || (excludeId && existing.id === excludeId)) return slug;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private static sanitize(product: Product, isAdmin: boolean): Product {
    if (!isAdmin) {
      const obj: any = product;
      delete obj.costPrice;
    }
    return product;
  }
}
