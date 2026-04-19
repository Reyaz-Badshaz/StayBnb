const request = require('supertest');
const app = require('../src/app');
const db = require('./setup');
const { User, Property } = require('../src/models');

let hostToken;
let guestToken;
let hostUser;
let guestUser;

beforeAll(async () => {
  await db.connect();
});

beforeEach(async () => {
  // Create host user
  hostUser = await User.create({
    firstName: 'Host',
    lastName: 'User',
    email: 'host@example.com',
    password: 'Password123!',
    role: 'host',
  });

  // Create guest user
  guestUser = await User.create({
    firstName: 'Guest',
    lastName: 'User',
    email: 'guest@example.com',
    password: 'Password123!',
    role: 'guest',
  });

  // Get tokens
  const hostLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'host@example.com', password: 'Password123!' });
  hostToken = hostLogin.body.data.accessToken;

  const guestLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'guest@example.com', password: 'Password123!' });
  guestToken = guestLogin.body.data.accessToken;
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.closeDatabase();
});

describe('Property Endpoints', () => {
  describe('GET /api/v1/properties', () => {
    it('should return empty array when no properties', async () => {
      const res = await request(app).get('/api/v1/properties');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return properties with pagination', async () => {
      // Create test properties
      await Property.create({
        host: hostUser._id,
        title: 'Test Property 1',
        description: 'A beautiful test property',
        propertyType: 'apartment',
        roomType: 'entire',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          country: 'Test Country',
          zipCode: '12345',
          coordinates: { type: 'Point', coordinates: [-73.935242, 40.730610] },
        },
        pricing: { basePrice: 100, cleaningFee: 25 },
        capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
        status: 'active',
      });

      const res = await request(app).get('/api/v1/properties');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/v1/properties', () => {
    const validProperty = {
      title: 'Beautiful Apartment',
      description: 'A wonderful place to stay',
      propertyType: 'apartment',
      roomType: 'entire',
      location: {
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001',
        coordinates: { type: 'Point', coordinates: [-73.935242, 40.730610] },
      },
      pricing: { basePrice: 150, cleaningFee: 50 },
      capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
      amenities: ['wifi', 'kitchen'],
    };

    it('should create property as host', async () => {
      const res = await request(app)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(validProperty);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Beautiful Apartment');
    });

    it('should fail without auth', async () => {
      const res = await request(app)
        .post('/api/v1/properties')
        .send(validProperty);

      expect(res.statusCode).toBe(401);
    });

    it('should fail as guest user', async () => {
      const res = await request(app)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(validProperty);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/properties/:id', () => {
    it('should return property details', async () => {
      const property = await Property.create({
        host: hostUser._id,
        title: 'Test Property',
        description: 'A test property',
        propertyType: 'house',
        roomType: 'entire',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          country: 'Test Country',
          zipCode: '12345',
          coordinates: { type: 'Point', coordinates: [-73.935242, 40.730610] },
        },
        pricing: { basePrice: 100, cleaningFee: 25 },
        capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
        status: 'active',
      });

      const res = await request(app).get(`/api/v1/properties/${property._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Property');
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app).get(`/api/v1/properties/${fakeId}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/v1/properties/:id', () => {
    it('should update property as owner', async () => {
      const property = await Property.create({
        host: hostUser._id,
        title: 'Test Property',
        description: 'A test property',
        propertyType: 'house',
        roomType: 'entire',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          country: 'Test Country',
          zipCode: '12345',
          coordinates: { type: 'Point', coordinates: [-73.935242, 40.730610] },
        },
        pricing: { basePrice: 100, cleaningFee: 25 },
        capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
      });

      const res = await request(app)
        .put(`/api/v1/properties/${property._id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Updated Title' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should fail to update as non-owner', async () => {
      // Create another host
      const otherHost = await User.create({
        firstName: 'Other',
        lastName: 'Host',
        email: 'other@example.com',
        password: 'Password123!',
        role: 'host',
      });

      const property = await Property.create({
        host: otherHost._id,
        title: 'Test Property',
        description: 'A test property',
        propertyType: 'house',
        roomType: 'entire',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          country: 'Test Country',
          zipCode: '12345',
          coordinates: { type: 'Point', coordinates: [-73.935242, 40.730610] },
        },
        pricing: { basePrice: 100, cleaningFee: 25 },
        capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
      });

      const res = await request(app)
        .put(`/api/v1/properties/${property._id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/v1/properties/:id', () => {
    it('should delete property as owner', async () => {
      const property = await Property.create({
        host: hostUser._id,
        title: 'Test Property',
        description: 'A test property',
        propertyType: 'house',
        roomType: 'entire',
        location: {
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          country: 'Test Country',
          zipCode: '12345',
          coordinates: { type: 'Point', coordinates: [-73.935242, 40.730610] },
        },
        pricing: { basePrice: 100, cleaningFee: 25 },
        capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
      });

      const res = await request(app)
        .delete(`/api/v1/properties/${property._id}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion
      const deleted = await Property.findById(property._id);
      expect(deleted).toBeNull();
    });
  });
});
