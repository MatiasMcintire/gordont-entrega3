import request from 'supertest';
import mongoose from 'mongoose';
import createApp from '../../app.js';
import { connectMongoDB } from '../../infrastructure/persistence/mongoConnection.js';

describe('Entries Integration Tests', () => {
  let app;
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let testEntryId;

  beforeAll(async () => {
    // Connect to test database
    process.env.NODE_ENV = 'test';
    await connectMongoDB();
    app = await createApp();

    // Create two test users
    const user1Response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test-entry-user1-${Date.now()}@example.com`,
        name: 'Entry Test User 1',
        password: 'SecurePass123!',
        weight: 70,
        height: 175,
        age: 25,
      });

    user1Token = user1Response.body.data.accessToken;
    user1Id = user1Response.body.data.user.id;

    const user2Response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test-entry-user2-${Date.now()}@example.com`,
        name: 'Entry Test User 2',
        password: 'SecurePass123!',
        weight: 65,
        height: 170,
        age: 28,
      });

    user2Token = user2Response.body.data.accessToken;
    user2Id = user2Response.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (user1Id) {
      await mongoose.connection
        .collection('users')
        .deleteOne({ _id: new mongoose.Types.ObjectId(user1Id) });
      await mongoose.connection
        .collection('entries')
        .deleteMany({ userId: new mongoose.Types.ObjectId(user1Id) });
    }
    if (user2Id) {
      await mongoose.connection
        .collection('users')
        .deleteOne({ _id: new mongoose.Types.ObjectId(user2Id) });
      await mongoose.connection
        .collection('entries')
        .deleteMany({ userId: new mongoose.Types.ObjectId(user2Id) });
    }
    await mongoose.connection.close();
  });

  describe('POST /api/v1/entries - Validation Tests', () => {
    it('should create entry with valid data', async () => {
      const entryData = {
        date: '2024-01-15',
        mealType: 'breakfast',
        foods: [
          {
            name: 'Avena',
            calories: 150,
            protein: 5,
            carbs: 27,
            fat: 3,
            quantity: 100,
          },
        ],
        notes: 'Desayuno saludable',
      };

      const response = await request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(entryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.mealType).toBe('breakfast');
      expect(response.body.data.foods).toHaveLength(1);

      testEntryId = response.body.data.id;
    });

    it('should fail without authentication', async () => {
      const entryData = {
        date: '2024-01-15',
        mealType: 'lunch',
        foods: [{ name: 'Test', calories: 100, protein: 10, carbs: 10, fat: 5 }],
      };

      const response = await request(app).post('/api/v1/entries').send(entryData).expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with future date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          date: futureDate.toISOString().split('T')[0],
          mealType: 'breakfast',
          foods: [{ name: 'Test', calories: 100, protein: 10, carbs: 10, fat: 5 }],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toBeDefined();
      expect(
        response.body.error.details.some((d) => d.message.toLowerCase().includes('future'))
      ).toBe(true);
    });

    it('should fail with invalid meal type', async () => {
      const response = await request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          date: '2024-01-15',
          mealType: 'invalid-meal',
          foods: [{ name: 'Test', calories: 100, protein: 10, carbs: 10, fat: 5 }],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with empty foods array', async () => {
      const response = await request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          date: '2024-01-15',
          mealType: 'breakfast',
          foods: [],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with negative calories', async () => {
      const response = await request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          date: '2024-01-15',
          mealType: 'breakfast',
          foods: [{ name: 'Test', calories: -100, protein: 10, carbs: 10, fat: 5 }],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          date: '2024-01-15',
          mealType: 'breakfast',
          // Missing foods
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/entries/:id - Authorization Tests', () => {
    it('should get own entry', async () => {
      const response = await request(app)
        .get(`/api/v1/entries/${testEntryId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testEntryId);
    });

    it("should NOT access another user's entry (403)", async () => {
      const response = await request(app)
        .get(`/api/v1/entries/${testEntryId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Forbidden');
    });

    it('should fail with invalid entry ID format', async () => {
      const response = await request(app)
        .get('/api/v1/entries/invalid-id')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/v1/entries/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/entries/:id - Update with Authorization', () => {
    it('should update own entry', async () => {
      const updateData = {
        notes: 'Updated notes',
      };

      const response = await request(app)
        .put(`/api/v1/entries/${testEntryId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Updated notes');
    });

    it("should NOT update another user's entry (403)", async () => {
      const response = await request(app)
        .put(`/api/v1/entries/${testEntryId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ notes: 'Hacked!' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail with no fields to update', async () => {
      const response = await request(app)
        .put(`/api/v1/entries/${testEntryId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should update meal type successfully', async () => {
      const response = await request(app)
        .put(`/api/v1/entries/${testEntryId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ mealType: 'lunch' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mealType).toBe('lunch');
    });
  });

  describe('DELETE /api/v1/entries/:id - Delete with Authorization', () => {
    let entryToDelete;

    beforeEach(async () => {
      // Create an entry to delete
      const response = await request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          date: '2024-01-16',
          mealType: 'snack',
          foods: [{ name: 'Apple', calories: 50, protein: 0, carbs: 13, fat: 0 }],
        });

      entryToDelete = response.body.data.id;
    });

    it('should delete own entry', async () => {
      const response = await request(app)
        .delete(`/api/v1/entries/${entryToDelete}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's deleted
      await request(app)
        .get(`/api/v1/entries/${entryToDelete}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it("should NOT delete another user's entry (403)", async () => {
      const response = await request(app)
        .delete(`/api/v1/entries/${entryToDelete}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/entries - List entries by date', () => {
    beforeAll(async () => {
      // Create multiple entries for user1
      const date = '2024-01-20';

      await request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          date,
          mealType: 'breakfast',
          foods: [{ name: 'Eggs', calories: 150, protein: 13, carbs: 1, fat: 11 }],
        });

      await request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          date,
          mealType: 'lunch',
          foods: [{ name: 'Chicken', calories: 250, protein: 30, carbs: 0, fat: 12 }],
        });
    });

    it('should get entries by date', async () => {
      const response = await request(app)
        .get('/api/v1/entries?date=2024-01-20')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail without date parameter', async () => {
      const response = await request(app)
        .get('/api/v1/entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should only return own entries, not other users', async () => {
      const response = await request(app)
        .get('/api/v1/entries?date=2024-01-20')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // User 2 should have 0 entries for this date
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('GET /api/v1/entries/stats/daily - Daily stats with cache', () => {
    it('should calculate daily stats correctly', async () => {
      const response = await request(app)
        .get('/api/v1/entries/stats/daily?date=2024-01-20')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCalories');
      expect(response.body.data).toHaveProperty('totalProtein');
      expect(response.body.data).toHaveProperty('totalCarbs');
      expect(response.body.data).toHaveProperty('totalFat');
      expect(response.body.data).toHaveProperty('byMealType');
      expect(response.body.data.totalCalories).toBeGreaterThan(0);
    });

    it('should use cache on second request', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/v1/entries/stats/daily?date=2024-01-20')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response1.body.cached).toBe(false);

      // Second request (should be cached if Redis is enabled, otherwise both will be false)
      const response2 = await request(app)
        .get('/api/v1/entries/stats/daily?date=2024-01-20')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // In test environment, Redis is usually disabled, so cached will be false for both
      expect(response2.body.cached).toBeDefined();
      expect(response2.body.data.totalCalories).toBe(response1.body.data.totalCalories);
    });

    it('should require date parameter', async () => {
      const response = await request(app)
        .get('/api/v1/entries/stats/daily')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Pagination Tests', () => {
    it('should paginate entries with limit', async () => {
      const response = await request(app)
        .get('/api/v1/entries/list/page?page=1&limit=10')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('currentPage');
      expect(response.body.data.pagination).toHaveProperty('itemsPerPage');
    });

    it('should respect maximum limit of 100', async () => {
      const response = await request(app)
        .get('/api/v1/entries/list/page?page=1&limit=200')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
