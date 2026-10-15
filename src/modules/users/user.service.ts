import { User } from './user.model';
import { getPagination, buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError } from '../../utils/errors';

export class UserService {
  static async findAll(params: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(params);

    let qb = User.query();

    if (params.role) {
      qb = qb.where('role', params.role);
    }

    if (params.search) {
      qb = qb.where((builder) => {
        builder
          .where('email', 'ilike', `%${params.search}%`)
          .orWhere('firstName', 'ilike', `%${params.search}%`)
          .orWhere('lastName', 'ilike', `%${params.search}%`);
      });
    }

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy || 'createdAt', sortOrder || 'desc')
      .limit(limit)
      .offset(offset);

    return buildPaginatedResult(data, total, page, limit);
  }

  static async findById(id: string) {
    const user = await User.query().findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  static async updateRole(id: string, role: 'CUSTOMER' | 'SALES_REP' | 'ADMIN') {
    const user = await User.query().findById(id);
    if (!user) throw new NotFoundError('User');
    return await User.query().patchAndFetchById(id, { role });
  }

  static async deactivate(id: string) {
    const user = await User.query().findById(id);
    if (!user) throw new NotFoundError('User');
    return await User.query().patchAndFetchById(id, { isActive: false });
  }
}
