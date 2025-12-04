import request from 'supertest';
import mongoose from 'mongoose';
import createApp from '../../app.js';
import { connectMongoDB } from '../../infrastructure/persistence/mongoConnection.js';

describe('Workouts Integration Tests', () => {
  let app;
  let userToken;
  let userId;
  let otherUserToken;
  let testWorkoutId;

  beforeAll(async () => {
    // Connect to test database
    process.env.NODE_ENV = 'test';
    await connectMongoDB();
    app = await createApp();

    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test-workout-${Date.now()}@example.com`,
        name: 'Workout Test User',
        password: 'SecurePass123!',
        weight: 75,
        height: 180,
        age: 30,
      });

    userToken = userResponse.body.data.accessToken;
    userId = userResponse.body.data.user.id;

    // Create another user for authorization tests
    const otherResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test-workout-other-${Date.now()}@example.com`,
        name: 'Other User',
        password: 'SecurePass123!',
        weight: 68,
        height: 172,
        age: 26,
      });

    otherUserToken = otherResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up
    if (userId) {
      await mongoose.connection
        .collection('users')
        .deleteOne({ _id: new mongoose.Types.ObjectId(userId) });
      await mongoose.connection
        .collection('workouts')
        .deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
    }
    await mongoose.connection.close();
  });

  describe('POST /api/v1/workouts - Create Workout', () => {
    it('should create strength workout with valid data', async () => {
      const workoutData = {
        date: '2024-01-15',
        type: 'strength',
        exercises: [
          {
            name: 'Sentadillas',
            sets: 4,
            reps: 12,
            weight: 80,
            duration: 0,
            notes: 'Profundidad completa',
          },
          {
            name: 'Press de banca',
            sets: 3,
            reps: 10,
            weight: 60,
            duration: 0,
          },
        ],
        duration: 3600,
        caloriesBurned: 400,
        notes: 'Buen entrenamiento',
      };

      const response = await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(workoutData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('strength');
      expect(response.body.data.exercises).toHaveLength(2);
      expect(response.body.data.exercises[0].name).toBe('Sentadillas');

      testWorkoutId = response.body.data.id;
    });

    it('should create cardio workout', async () => {
      const workoutData = {
        date: '2024-01-16',
        type: 'cardio',
        exercises: [
          {
            name: 'Correr',
            sets: 1,
            reps: 1,
            weight: 0,
            duration: 1800,
            notes: '5km en 30 minutos',
          },
        ],
        duration: 1800,
        caloriesBurned: 300,
      };

      const response = await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(workoutData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('cardio');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/workouts')
        .send({
          date: '2024-01-15',
          type: 'strength',
          exercises: [{ name: 'Test', sets: 1, reps: 1 }],
          duration: 100,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with future date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          date: futureDate.toISOString().split('T')[0],
          type: 'strength',
          exercises: [{ name: 'Test', sets: 1, reps: 1 }],
          duration: 100,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid workout type', async () => {
      const response = await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          date: '2024-01-15',
          type: 'invalid-type',
          exercises: [{ name: 'Test', sets: 1, reps: 1 }],
          duration: 100,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with empty exercises array', async () => {
      const response = await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          date: '2024-01-15',
          type: 'strength',
          exercises: [],
          duration: 100,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with negative duration', async () => {
      const response = await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          date: '2024-01-15',
          type: 'strength',
          exercises: [{ name: 'Test', sets: 1, reps: 1 }],
          duration: -100,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          date: '2024-01-15',
          type: 'strength',
          // Missing exercises and duration
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/workouts/:id - Authorization Tests', () => {
    it('should get own workout', async () => {
      const response = await request(app)
        .get(`/api/v1/workouts/${testWorkoutId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testWorkoutId);
    });

    it("should NOT access another user's workout (403)", async () => {
      const response = await request(app)
        .get(`/api/v1/workouts/${testWorkoutId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Forbidden');
    });

    it('should fail with invalid ID format', async () => {
      const response = await request(app)
        .get('/api/v1/workouts/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent workout', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/v1/workouts/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/workouts/:id - Update with Authorization', () => {
    it('should update own workout', async () => {
      const updateData = {
        notes: 'Updated workout notes',
        caloriesBurned: 450,
      };

      const response = await request(app)
        .put(`/api/v1/workouts/${testWorkoutId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Updated workout notes');
      expect(response.body.data.caloriesBurned).toBe(450);
    });

    it("should NOT update another user's workout (403)", async () => {
      const response = await request(app)
        .put(`/api/v1/workouts/${testWorkoutId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ notes: 'Hacked!' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should update workout type', async () => {
      const response = await request(app)
        .put(`/api/v1/workouts/${testWorkoutId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'cardio' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('cardio');
    });

    it('should update exercises array', async () => {
      const response = await request(app)
        .put(`/api/v1/workouts/${testWorkoutId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          exercises: [
            {
              name: 'New Exercise',
              sets: 5,
              reps: 15,
              weight: 100,
              duration: 0,
            },
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exercises).toHaveLength(1);
      expect(response.body.data.exercises[0].name).toBe('New Exercise');
    });

    it('should fail with no fields to update', async () => {
      const response = await request(app)
        .put(`/api/v1/workouts/${testWorkoutId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/workouts/:id - Delete with Authorization', () => {
    let workoutToDelete;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          date: '2024-01-17',
          type: 'flexibility',
          exercises: [{ name: 'Yoga', sets: 1, reps: 1, weight: 0, duration: 1800 }],
          duration: 1800,
        });

      workoutToDelete = response.body.data.id;
    });

    it('should delete own workout', async () => {
      const response = await request(app)
        .delete(`/api/v1/workouts/${workoutToDelete}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deleted
      await request(app)
        .get(`/api/v1/workouts/${workoutToDelete}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it("should NOT delete another user's workout (403)", async () => {
      const response = await request(app)
        .delete(`/api/v1/workouts/${workoutToDelete}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/workouts - List workouts by date', () => {
    beforeAll(async () => {
      const date = '2024-01-20';

      await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          date,
          type: 'strength',
          exercises: [{ name: 'Squats', sets: 3, reps: 10, weight: 100 }],
          duration: 2400,
        });

      await request(app)
        .post('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          date,
          type: 'cardio',
          exercises: [{ name: 'Running', sets: 1, reps: 1, duration: 1800 }],
          duration: 1800,
        });
    });

    it('should get workouts by date', async () => {
      const response = await request(app)
        .get('/api/v1/workouts?date=2024-01-20')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail without date parameter', async () => {
      const response = await request(app)
        .get('/api/v1/workouts')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should only return own workouts', async () => {
      const response = await request(app)
        .get('/api/v1/workouts?date=2024-01-20')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('Pagination Tests', () => {
    it('should paginate workouts with cursor', async () => {
      const response = await request(app)
        .get('/api/v1/workouts/list/paginated?limit=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('hasMore');
    });

    it('should paginate workouts with page/offset', async () => {
      const response = await request(app)
        .get('/api/v1/workouts/list/page?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should respect maximum limit', async () => {
      const response = await request(app)
        .get('/api/v1/workouts/list/page?page=1&limit=200')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
