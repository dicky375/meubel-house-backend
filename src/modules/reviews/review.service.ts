import { Review } from './review.model';
import { Product } from '../products/product.model';
import { Order } from '../orders/order.model';
import {NotificationService} from '../notifications/notification.service';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} from '../../utils/errors';
import { getPagination, buildPaginatedResult } from '../../utils/pagination';
import type {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewQueryInput,
} from './review.validation';

export class ReviewService {
  // ─── CREATE ─────────────────────────────────────
  static async create(
    userId: string,
    productId: string,
    input: CreateReviewInput
  ): Promise<Review> {
    // Verify product exists & is published
    const product = await Product.query().findById(productId);
    if (!product) throw new NotFoundError('Product');
    if (!product.isActive || !product.isPublished) {
      throw new BadRequestError('Product is not available for reviews');
    }

    // Check for duplicate review
    const existing = await Review.query()
      .where({ productId, userId })
      .first();
    if (existing) {
      throw new ConflictError('You have already reviewed this product');
    }

    // Verify the customer has a DELIVERED or COMPLETED order with this product
    const eligibleOrder = await this.findDeliveredOrderForProduct(
      userId,
      productId
    );

    const review = await Review.query().insert({
      productId,
      userId,
      orderId: eligibleOrder?.id,
      rating: input.rating,
      comment: input.comment,
      isVerified: !!eligibleOrder,
    } as any)
        NotificationService.notifyReviewPosted(
      userId,
      product.name
    ).catch((err) =>
      console.error('[Reviews] Review-posted notification failed:', err.message)
    );
    

    return review;
  }

  // ─── LIST FOR PRODUCT (public) ──────────────────
  static async findByProduct(productId: string, query: ReviewQueryInput) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    const product = await Product.query().findById(productId);
    if (!product) throw new NotFoundError('Product');

    let qb = Review.query().where('productId', productId);

    if (query.rating) qb = qb.where('rating', query.rating);
    if (query.verifiedOnly) qb = qb.where('isVerified', true);

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('user');

    // Compute aggregate stats
    const stats = await Review.query()
      .where('productId', productId)
      .select(
        Review.knex().raw('COUNT(*)::int as "totalReviews"'),
        Review.knex().raw('COALESCE(AVG(rating), 0)::numeric(3,2) as "avgRating"'),
        Review.knex().raw(
          'COUNT(*) FILTER (WHERE rating = 5)::int as "fiveStars"'
        ),
        Review.knex().raw(
          'COUNT(*) FILTER (WHERE rating = 4)::int as "fourStars"'
        ),
        Review.knex().raw(
          'COUNT(*) FILTER (WHERE rating = 3)::int as "threeStars"'
        ),
        Review.knex().raw(
          'COUNT(*) FILTER (WHERE rating = 2)::int as "twoStars"'
        ),
        Review.knex().raw(
          'COUNT(*) FILTER (WHERE rating = 1)::int as "oneStar"'
        )
      )
      .first();

    return {
      ...buildPaginatedResult(data, total, page, limit),
      stats,
    };
  }

  // ─── MY REVIEWS ─────────────────────────────────
  static async findByUser(userId: string, query: ReviewQueryInput) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    const qb = Review.query().where('userId', userId);

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('[product, user]');

    return buildPaginatedResult(data, total, page, limit);
  }

  // ─── GET ONE ────────────────────────────────────
  static async findById(reviewId: string) {
    const review = await Review.query()
      .findById(reviewId)
      .withGraphFetched('[product, user]');

    if (!review) throw new NotFoundError('Review');
    return review;
  }

  // ─── UPDATE ─────────────────────────────────────
  static async update(
    reviewId: string,
    userId: string,
    input: UpdateReviewInput
  ): Promise<Review> {
    const review = await Review.query().findById(reviewId);
    if (!review) throw new NotFoundError('Review');
    if (review.userId !== userId) {
      throw new ForbiddenError('You can only update your own reviews');
    }

    return Review.query().patchAndFetchById(reviewId, input as any);
  }

  // ─── DELETE (owner or admin) ────────────────────
  static async delete(reviewId: string, userId: string, isAdmin: boolean) {
    const review = await Review.query().findById(reviewId);
    if (!review) throw new NotFoundError('Review');

    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenError('You can only delete your own reviews');
    }

    await Review.query().deleteById(reviewId);
  }

  // ─── ADMIN: LIST ALL ────────────────────────────
  static async findAll(query: ReviewQueryInput) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    let qb = Review.query();

    if (query.rating) qb = qb.where('rating', query.rating);
    if (query.verifiedOnly) qb = qb.where('isVerified', true);

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('[product, user]');

    return buildPaginatedResult(data, total, page, limit);
  }

  // ─── HELPERS ────────────────────────────────────
  /**
   * Find a DELIVERED or COMPLETED order from this user that contains this product.
   */
  private static async findDeliveredOrderForProduct(
    userId: string,
    productId: string
  ): Promise<Order | undefined> {
    const orders = await Order.query()
      .where('customerId', userId)
      .whereIn('orderStatus', ['DELIVERED', 'COMPLETED']);

    // Check each order's items array for the productId
    const matched = orders.find((order) => {
      const items = this.parseItems(order.items);
      return items.some((i) => i.productId === productId);
    });

    return matched;
  }

  private static parseItems(raw: any): any[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}