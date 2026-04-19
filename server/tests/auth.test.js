const request = require('supertest');
const app = require('../src/app');
const db = require('./setup');
const { User } = require('../src/models');

const registerPayload = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'Password123!',
  dateOfBirth: '1995-01-20',
  phone: '9876543210',
  aadhaarNumber: '123412341234',
  panCardNumber: 'ABCDE1234F',
};

const userFixture = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'Password123!',
  dateOfBirth: new Date('1995-01-20'),
};

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.closeDatabase();
});

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(registerPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john@example.com');
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...registerPayload,
          email: 'invalid-email',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...registerPayload,
          password: '123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with underage user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...registerPayload,
          email: 'underage@example.com',
          dateOfBirth: '2012-01-01',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      // Create first user
      await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        dateOfBirth: new Date('1993-01-01'),
      });

      // Try to register with same email
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(registerPayload);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create(userFixture);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      // First login
      await User.create(userFixture);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123!',
        });

      const token = loginRes.body.data.accessToken;

      // Then logout
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('should get current user profile', async () => {
      await User.create(userFixture);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123!',
        });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('john@example.com');
    });

    it('should fail without auth token', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
