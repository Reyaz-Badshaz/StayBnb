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

const requestSignupOtp = async (payload = registerPayload) => {
  const response = await request(app)
    .post('/api/v1/auth/request-signup-otp')
    .send({
      email: payload.email,
      phone: payload.phone,
      firstName: payload.firstName,
    });

  return response.body.data?.otp;
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
  describe('POST /api/v1/auth/request-signup-otp', () => {
    it('should send OTP for a valid sign-up request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/request-signup-otp')
        .send({
          email: registerPayload.email,
          phone: registerPayload.phone,
          firstName: registerPayload.firstName,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.otp).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const otp = await requestSignupOtp(registerPayload);
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...registerPayload, signupOtp: otp });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john@example.com');
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const otp = await requestSignupOtp(registerPayload);
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...registerPayload,
          email: 'invalid-email',
          signupOtp: otp,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with weak password', async () => {
      const otp = await requestSignupOtp(registerPayload);
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...registerPayload,
          password: '123',
          signupOtp: otp,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with underage user', async () => {
      const underagePayload = {
        ...registerPayload,
        email: 'underage@example.com',
        dateOfBirth: '2012-01-01',
      };
      const otp = await requestSignupOtp(underagePayload);
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...underagePayload,
          signupOtp: otp,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail requesting OTP with duplicate email', async () => {
      // Create first user
      await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        dateOfBirth: new Date('1993-01-01'),
      });

      const duplicatePayload = {
        ...registerPayload,
        phone: '9988776655',
      };

      const res = await request(app)
        .post('/api/v1/auth/request-signup-otp')
        .send({
          email: duplicatePayload.email,
          phone: duplicatePayload.phone,
          firstName: duplicatePayload.firstName,
        });

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
