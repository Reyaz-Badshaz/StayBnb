// MongoDB initialization script
// This runs when the container starts for the first time

db = db.getSiblingDB('staybnb');

// Create application user
db.createUser({
  user: 'staybnb_app',
  pwd: 'staybnb_password',
  roles: [
    { role: 'readWrite', db: 'staybnb' }
  ]
});

// Create indexes for optimal performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: -1 });

db.properties.createIndex({ host: 1 });
db.properties.createIndex({ status: 1 });
db.properties.createIndex({ 'location.coordinates': '2dsphere' });
db.properties.createIndex({ 'location.city': 1, 'location.country': 1 });
db.properties.createIndex({ propertyType: 1 });
db.properties.createIndex({ 'pricing.basePrice': 1 });
db.properties.createIndex({ 'rating.average': -1 });
db.properties.createIndex({ createdAt: -1 });

db.bookings.createIndex({ guest: 1 });
db.bookings.createIndex({ host: 1 });
db.bookings.createIndex({ property: 1 });
db.bookings.createIndex({ status: 1 });
db.bookings.createIndex({ checkIn: 1, checkOut: 1 });
db.bookings.createIndex({ createdAt: -1 });

db.reviews.createIndex({ property: 1 });
db.reviews.createIndex({ reviewer: 1 });
db.reviews.createIndex({ reviewee: 1 });
db.reviews.createIndex({ booking: 1 });
db.reviews.createIndex({ createdAt: -1 });

db.conversations.createIndex({ participants: 1 });
db.conversations.createIndex({ updatedAt: -1 });

db.messages.createIndex({ conversation: 1, createdAt: -1 });
db.messages.createIndex({ sender: 1 });

db.notifications.createIndex({ user: 1, read: 1 });
db.notifications.createIndex({ createdAt: -1 });

db.experiences.createIndex({ host: 1 });
db.experiences.createIndex({ status: 1 });
db.experiences.createIndex({ category: 1 });
db.experiences.createIndex({ 'location.coordinates': '2dsphere' });
db.experiences.createIndex({ 'rating.average': -1 });

db.experiencebookings.createIndex({ guest: 1 });
db.experiencebookings.createIndex({ host: 1 });
db.experiencebookings.createIndex({ experience: 1 });
db.experiencebookings.createIndex({ status: 1 });
db.experiencebookings.createIndex({ scheduledDate: 1 });

print('Database initialized successfully!');
