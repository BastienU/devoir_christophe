import request from 'supertest';
import app from '../../app';
import { seed } from '../../seeders/seed.js';
import { pool, createTables } from '../../config/database.js';

describe('Order routes', () => {
  let adminToken;
  let userToken;
  let createdProduct;

  beforeAll(async () => {
    try {
      await pool.query('DROP TABLE IF EXISTS order_items CASCADE');
      await pool.query('DROP TABLE IF EXISTS orders CASCADE');
      await pool.query('DROP TABLE IF EXISTS products CASCADE');
      await pool.query('DROP TABLE IF EXISTS users CASCADE');

      await createTables();
      await seed(true);

      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'admin123' });
      adminToken = adminRes.body.token;

      const userRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'user123' });
      userToken = userRes.body.token;

      const productRes = await request(app).get('/api/products');
      createdProduct = productRes.body[0];
    } catch (err) {
      console.error('Error in beforeAll:', err);
      throw err;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should allow authenticated user to create an order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productIds: [
          { productId: createdProduct.id, quantity: 2 }
        ]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('user_id');
  });

  it('should allow admin to list all orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should not allow non-admin user to list all orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('should allow authenticated user to get their order by ID', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productIds: [{ productId: createdProduct.id, quantity: 1 }]
      });

    const orderId = createRes.body.id;

    const getRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.statusCode).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body[0]).toHaveProperty('id', orderId);
  });
});