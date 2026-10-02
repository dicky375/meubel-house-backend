import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meubel House API',
      version: '1.0.0',
      description: `
Backend API for Meubel House — a furniture e-commerce and multi-channel sales platform.

**Sales Channels:**
- **Online** (customer storefront)
- **In-Store** (sales rep app)

Both channels produce the same \`Order\` records, distinguished by \`salesChannel\`.

**Authentication:**
- JWT Bearer tokens
- Roles: \`CUSTOMER\`, \`SALES_REP\`, \`ADMIN\`

**Base URL:** \`/api/v1\`
      `,
      contact: {
        name: 'Meubel House',
        email: 'admin@meubel.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'https://meubel-house-backend.onrender.com/api/v1',
        description: 'Production (Render + Neon)',
      },
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local development',
      },
      {
        url: 'http://localhost:5001/api/v1',
        description: 'Local Docker',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['CUSTOMER', 'SALES_REP', 'ADMIN'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
            image: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
            shortDescription: { type: 'string', nullable: true },
            categoryId: { type: 'string', format: 'uuid', nullable: true },
            price: { type: 'string', example: '1299.99' },
            compareAtPrice: { type: 'string', nullable: true },
            costPrice: { type: 'string', nullable: true, description: 'Admin only' },
            sku: { type: 'string' },
            brand: { type: 'string', nullable: true },
            material: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' } },
            images: { type: 'array', items: { type: 'string' } },
            featured: { type: 'boolean' },
            topPick: { type: 'boolean' },
            isNew: { type: 'boolean' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'ARCHIVED'],
            },
            isActive: { type: 'boolean' },
            isPublished: { type: 'boolean' },
          },
        },
        ProductVariant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid' },
            colour: { type: 'string', nullable: true },
            size: { type: 'string', nullable: true },
            material: { type: 'string', nullable: true },
            sku: { type: 'string' },
            price: { type: 'string' },
            stock: { type: 'integer' },
          },
        },
        Inventory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid' },
            variantId: { type: 'string', format: 'uuid', nullable: true },
            storeId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer' },
            reservedQuantity: { type: 'integer' },
            availableQuantity: { type: 'integer' },
            reorderLevel: { type: 'integer' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & registration' },
      { name: 'Users', description: 'User management' },
      { name: 'Categories', description: 'Product categories' },
      { name: 'Products', description: 'Product catalogue' },
      { name: 'Inventory', description: 'Stock tracking & adjustments' },
    ],
  },
  apis: [
    './src/modules/**/*.routes.{ts,js}',
    './dist/modules/**/*.routes.js',
    './src/modules/**/*.controller.{ts,js}',
    './dist/modules/**/*.controller.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);