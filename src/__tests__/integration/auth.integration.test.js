import request from 'supertest';
import mongoose from 'mongoose';
import createApp from '../../app.js';
import { connectMongoDB } from '../../infrastructure/persistence/mongoConnection.js';

describe('Auth Integration Tests', () => {
  let app;
  let testUserId;
  let testToken;

  beforeAll(async () => {
    // Connect to test database
    process.env.NODE_ENV = 'test';
    await connectMongoDB();
    app = await createApp();
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await mongoose.connection
        .collection('users')
        .deleteOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    }
    await mongoose.connection.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const newUser = {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        password: 'SecurePass123!',
        weight: 70,
        height: 175,
        age: 25,
      };

      const response = await request(app).post('/api/v1/auth/register').send(newUser).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(newUser.email);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Save for cleanup
      testUserId = response.body.data.user.id;
      testToken = response.body.data.accessToken;
    });

    it('should fail with missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          name: 'Test User',
          password: 'SecurePass123!',
          weight: 70,
          height: 175,
          age: 25,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-weak-${Date.now()}@example.com`,
          name: 'Test User',
          password: '123',
          weight: 70,
          height: 175,
          age: 25,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      const user = {
        email: `test-duplicate-${Date.now()}@example.com`,
        name: 'Test User',
        password: 'SecurePass123!',
        weight: 70,
        height: 175,
        age: 25,
      };

      // First registration
      await request(app).post('/api/v1/auth/register').send(user).expect(201);

      // Duplicate registration
      const response = await request(app).post('/api/v1/auth/register').send(user).expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser;

    beforeAll(async () => {
      // Create unique user for login tests
      testUser = {
        email: `test-login-${Date.now()}-${Math.random()}@example.com`,
        name: 'Login Test User',
        password: 'SecurePass123!',
        weight: 70,
        height: 175,
        age: 25,
      };

      await request(app).post('/api/v1/auth/register').send(testUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should fail with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testUserId);
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail without token', async () => {
      const response = await request(app).get('/api/v1/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeAll(async () => {
      // Create unique user for refresh token tests
      const testUser = {
        email: `test-refresh-${Date.now()}-${Math.random()}@example.com`,
        name: 'Refresh Test User',
        password: 'SecurePass123!',
        weight: 70,
        height: 175,
        age: 25,
      };

      // Register user
      await request(app).post('/api/v1/auth/register').send(testUser);

      // Login to get refresh token
      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      // Note: Some implementations only return new accessToken, not refreshToken
      // This is acceptable as the client can reuse the same refreshToken
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail without refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
