import { Category } from './category.model';
import { Product } from '../products/product.model';
import { slugify } from '../../utils/slugify';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors';
import { getPagination, buildPaginatedResult } from '../../utils/pagination';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryQueryInput,
} from './category.validation';

export class CategoryService {
  static async create(data: CreateCategoryInput): Promise<Category> {
    // Generate unique slug
    const slug = await this.generateUniqueSlug(data.name);

    const category = await Category.query().insert({
      ...data,
      slug,
    });

    return category;
  }

  static async findAll(query: CategoryQueryInput) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    let qb = Category.query();

    if (query.search) {
      qb = qb.where((builder) => {
        builder
          .where('name', 'ilike', `%${query.search}%`)
          .orWhere('description', 'ilike', `%${query.search}%`);
      });
    }

    if (query.isActive !== undefined) {
      qb = qb.where('isActive', query.isActive);
    }

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('products')
      .modifyGraph('products', (builder) => {
        builder.select('id', 'name', 'slug', 'price', 'images').where('isActive', true);
      });

    return buildPaginatedResult(data, total, page, limit);
  }

  static async findById(id: string): Promise<Category> {
    const category = await Category.query()
      .findById(id)
      .withGraphFetched('products');

    if (!category) throw new NotFoundError('Category');
    return category;
  }

  static async findBySlug(slug: string): Promise<Category> {
    const category = await Category.query()
      .where('slug', slug)
      .withGraphFetched('products')
      .first();

    if (!category) throw new NotFoundError('Category');
    return category;
  }

  static async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const category = await Category.query().findById(id);
    if (!category) throw new NotFoundError('Category');

    // If name changed, regenerate slug
    if (data.name && data.name !== category.name) {
      (data as any).slug = await this.generateUniqueSlug(data.name, id);
    }

    const updated = await Category.query().patchAndFetchById(id, data);
    return updated;
  }

  static async delete(id: string): Promise<void> {
    const category = await Category.query().findById(id);
    if (!category) throw new NotFoundError('Category');

    // Check for products in this category
    const productCount = await Product.query().where('categoryId', id).resultSize();
    if (productCount > 0) {
      throw new BadRequestError(
        `Cannot delete category with ${productCount} product(s). Reassign or delete products first.`
      );
    }

    await Category.query().deleteById(id);
  }

  private static async generateUniqueSlug(
    name: string,
    excludeId?: string
  ): Promise<string> {
    let baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await Category.query().where('slug', slug).first();
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}