import { Model } from 'objection';
import { User } from '../users/user.model';

export class Notification extends Model {
  static get tableName() {
    return 'notifications';
  }

  id!: string;
  userId!: string;
  type!: string;
  title!: string;
  message!: string;
  channel!: 'IN_APP' | 'EMAIL' | 'SMS';
  status!: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  metadata?: any;
  readAt?: Date;
  sentAt?: Date;
  error?: string;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'notifications.userId',
          to: 'users.id',
        },
      },
    };
  }
}
