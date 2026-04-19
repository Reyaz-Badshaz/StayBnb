/**
 * Seed script to populate the database with sample data
 * Run with: node src/scripts/seedData.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Fix DNS for MongoDB Atlas
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Models
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://staybnb_admin:qQFqEqjchaGs2MwY@staybnb.r39h4pp.mongodb.net/staybnb?retryWrites=true&w=majority';

// Sample Users
const users = [
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@staybnb.com',
    password: 'Password123!',
    phone: '+1-555-0101',
    dateOfBirth: new Date('1985-03-15'),
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    role: 'host',
    isEmailVerified: true,
    hostInfo: {
      isSuperhost: true,
      responseRate: 98,
      responseTime: 'within an hour',
      acceptanceRate: 95,
    },
    bio: 'Superhost with 5 years of experience. Love to share beautiful spaces with travelers from around the world!',
  },
  {
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael@staybnb.com',
    password: 'Password123!',
    phone: '+1-555-0102',
    dateOfBirth: new Date('1988-07-22'),
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    role: 'host',
    isEmailVerified: true,
    hostInfo: {
      isSuperhost: true,
      responseRate: 100,
      responseTime: 'within an hour',
      acceptanceRate: 98,
    },
    bio: 'Architect turned host. I design and rent unique spaces that inspire creativity and relaxation.',
  },
  {
    firstName: 'Emma',
    lastName: 'Wilson',
    email: 'emma@staybnb.com',
    password: 'Password123!',
    phone: '+1-555-0103',
    dateOfBirth: new Date('1990-11-08'),
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    role: 'host',
    isEmailVerified: true,
    hostInfo: {
      isSuperhost: false,
      responseRate: 92,
      responseTime: 'within a few hours',
      acceptanceRate: 88,
    },
    bio: 'Travel enthusiast and proud owner of cozy getaways. Your comfort is my priority!',
  },
  {
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@staybnb.com',
    password: 'Demo123!',
    phone: '+1-555-0100',
    dateOfBirth: new Date('1995-05-20'),
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    role: 'guest',
    isEmailVerified: true,
  },
];

// Sample Properties
const properties = [
  // Beach Properties
  {
    title: 'Luxury Oceanfront Villa with Infinity Pool',
    description: `Experience paradise in this stunning oceanfront villa with breathtaking views of the Pacific Ocean. This architectural masterpiece features floor-to-ceiling windows, a private infinity pool that seems to merge with the ocean, and direct beach access.

The villa boasts a gourmet kitchen with top-of-the-line appliances, spacious living areas perfect for entertaining, and a private outdoor terrace ideal for sunset cocktails. Each bedroom is a sanctuary with premium bedding, blackout curtains, and en-suite bathrooms.

Wake up to the sound of waves, enjoy your morning coffee watching dolphins play in the surf, and end your days with spectacular sunsets. This is more than a stay – it's a lifetime memory.`,
    propertyType: 'villa',
    roomType: 'entire',
    category: 'beach',
    location: {
      address: '123 Pacific Coast Highway',
      city: 'Malibu',
      state: 'California',
      country: 'United States',
      zipCode: '90265',
      coordinates: { type: 'Point', coordinates: [-118.7798, 34.0259] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200', isPrimary: true, caption: 'Main View' },
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', caption: 'Living Room' },
      { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', caption: 'Master Bedroom' },
      { url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', caption: 'Kitchen' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', caption: 'Pool' },
    ],
    amenities: ['wifi', 'pool', 'kitchen', 'air_conditioning', 'tv', 'washer', 'dryer', 'free_parking', 'hot_tub', 'beach_access', 'workspace'],
    capacity: { guests: 8, bedrooms: 4, beds: 5, bathrooms: 3.5 },
    pricing: { currency: 'INR', basePrice: 750, cleaningFee: 200, serviceFee: 14, weekendPrice: 850, weeklyDiscount: 10, monthlyDiscount: 20 },
    availability: { minNights: 2, maxNights: 30 },
    instantBook: true,
    cancellationPolicy: 'moderate',
    status: 'active',
    rating: { average: 4.95, count: 128, breakdown: { cleanliness: 5.0, accuracy: 4.9, communication: 5.0, location: 5.0, checkIn: 4.9, value: 4.8 } },
    isFeatured: true,
    hostIndex: 0,
  },
  {
    title: 'Beachfront Bungalow with Sunset Views',
    description: `Escape to this charming beachfront bungalow where the turquoise waters of the Caribbean are just steps away. This cozy retreat offers the perfect blend of rustic charm and modern comfort.

The open-concept living space flows seamlessly onto a spacious deck where you can dine al fresco while watching pelicans dive for their dinner. The fully equipped kitchen makes preparing fresh seafood a breeze, and the outdoor shower lets you rinse off after a day of snorkeling.

Fall asleep to the gentle sound of waves and wake up to magnificent sunrises over the ocean. This is the beach vacation you've been dreaming of.`,
    propertyType: 'bungalow',
    roomType: 'entire',
    category: 'beach',
    location: {
      address: '45 Playa Blanca',
      city: 'Tulum',
      state: 'Quintana Roo',
      country: 'Mexico',
      zipCode: '77780',
      coordinates: { type: 'Point', coordinates: [-87.4654, 20.2114] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200', isPrimary: true, caption: 'Beachfront' },
      { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', caption: 'Deck' },
      { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', caption: 'Interior' },
      { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', caption: 'Bedroom' },
    ],
    amenities: ['wifi', 'kitchen', 'air_conditioning', 'beach_access', 'patio', 'bbq_grill'],
    capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
    pricing: { currency: 'INR', basePrice: 285, cleaningFee: 75, serviceFee: 12, weeklyDiscount: 15 },
    availability: { minNights: 3, maxNights: 60 },
    instantBook: true,
    cancellationPolicy: 'flexible',
    status: 'active',
    rating: { average: 4.89, count: 94, breakdown: { cleanliness: 4.9, accuracy: 4.8, communication: 4.9, location: 5.0, checkIn: 4.9, value: 4.8 } },
    hostIndex: 1,
  },
  // Mountain Properties
  {
    title: 'Cozy Mountain Cabin with Hot Tub',
    description: `Nestled in the heart of the Rockies, this authentic log cabin offers the ultimate mountain retreat. With panoramic views of snow-capped peaks and surrounded by pristine wilderness, this is your escape from the everyday.

The cabin features a magnificent stone fireplace, vaulted ceilings with exposed beams, and a gourmet kitchen for preparing hearty mountain meals. After a day of hiking or skiing, soak in the private hot tub under a canopy of stars.

In summer, explore miles of hiking trails right from your doorstep. In winter, world-class skiing is just 15 minutes away. Year-round, this cabin delivers an unforgettable mountain experience.`,
    propertyType: 'cabin',
    roomType: 'entire',
    category: 'mountain',
    location: {
      address: '789 Mountain View Road',
      city: 'Aspen',
      state: 'Colorado',
      country: 'United States',
      zipCode: '81611',
      coordinates: { type: 'Point', coordinates: [-106.8175, 39.1911] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200', isPrimary: true, caption: 'Cabin Exterior' },
      { url: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800', caption: 'Living Room' },
      { url: 'https://images.unsplash.com/photo-1595521624992-48a59aef95e3?w=800', caption: 'Hot Tub' },
      { url: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800', caption: 'Kitchen' },
      { url: 'https://images.unsplash.com/photo-1505916349660-8d91a99c3e23?w=800', caption: 'Mountain View' },
    ],
    amenities: ['wifi', 'kitchen', 'heating', 'hot_tub', 'free_parking', 'tv', 'washer', 'dryer', 'workspace', 'bbq_grill'],
    capacity: { guests: 6, bedrooms: 3, beds: 4, bathrooms: 2 },
    pricing: { currency: 'INR', basePrice: 395, cleaningFee: 125, serviceFee: 12, weekendPrice: 450, weeklyDiscount: 12 },
    availability: { minNights: 2, maxNights: 14 },
    instantBook: false,
    cancellationPolicy: 'moderate',
    status: 'active',
    rating: { average: 4.92, count: 156, breakdown: { cleanliness: 4.9, accuracy: 4.9, communication: 5.0, location: 5.0, checkIn: 4.8, value: 4.9 } },
    isFeatured: true,
    hostIndex: 0,
  },
  {
    title: 'Alpine Chalet with Breathtaking Views',
    description: `Wake up above the clouds in this stunning alpine chalet perched on the mountainside. With floor-to-ceiling windows framing the majestic Alps, every moment here feels like a postcard.

The chalet combines traditional alpine architecture with contemporary luxury. A modern open-plan kitchen flows into a spacious living area centered around a cozy fireplace. The wrap-around balcony offers 270-degree mountain views perfect for morning yoga or evening wine.

Whether you're here for world-class skiing, summer hiking, or simply to disconnect and recharge, this chalet delivers an extraordinary alpine experience.`,
    propertyType: 'cabin',
    roomType: 'entire',
    category: 'mountain',
    location: {
      address: '15 Chemin des Alpes',
      city: 'Chamonix',
      state: 'Haute-Savoie',
      country: 'France',
      zipCode: '74400',
      coordinates: { type: 'Point', coordinates: [6.8694, 45.9237] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200', isPrimary: true, caption: 'Chalet Exterior' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', caption: 'Living Area' },
      { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', caption: 'View from Balcony' },
      { url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800', caption: 'Nearby Hiking' },
    ],
    amenities: ['wifi', 'kitchen', 'heating', 'hot_tub', 'free_parking', 'tv', 'washer', 'dryer', 'balcony'],
    capacity: { guests: 8, bedrooms: 4, beds: 5, bathrooms: 3 },
    pricing: { currency: 'INR', basePrice: 550, cleaningFee: 150, serviceFee: 12, weekendPrice: 650, weeklyDiscount: 15 },
    availability: { minNights: 3, maxNights: 21 },
    instantBook: true,
    cancellationPolicy: 'strict',
    status: 'active',
    rating: { average: 4.88, count: 89, breakdown: { cleanliness: 4.9, accuracy: 4.8, communication: 4.9, location: 5.0, checkIn: 4.8, value: 4.7 } },
    hostIndex: 1,
  },
  // City Properties
  {
    title: 'Modern Downtown Loft with City Skyline Views',
    description: `Live like a local in this stunning modern loft in the heart of downtown Manhattan. Floor-to-ceiling windows offer spectacular views of the city skyline, while the industrial-chic interior provides a stylish retreat.

The open-concept space features exposed brick, polished concrete floors, and designer furnishings. The chef's kitchen is equipped with premium appliances for those who love to cook, or simply order in from the countless restaurants within walking distance.

Steps from world-class dining, shopping, galleries, and nightlife, this loft puts you at the center of everything. Experience the energy of New York City while having a sophisticated space to call home.`,
    propertyType: 'loft',
    roomType: 'entire',
    category: 'city',
    location: {
      address: '456 Hudson Street',
      city: 'New York',
      state: 'New York',
      country: 'United States',
      zipCode: '10014',
      coordinates: { type: 'Point', coordinates: [-74.0060, 40.7128] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200', isPrimary: true, caption: 'Living Area' },
      { url: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800', caption: 'City View' },
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', caption: 'Kitchen' },
      { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', caption: 'Bedroom' },
    ],
    amenities: ['wifi', 'kitchen', 'air_conditioning', 'heating', 'tv', 'washer', 'dryer', 'elevator', 'workspace'],
    capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 2 },
    pricing: { currency: 'INR', basePrice: 325, cleaningFee: 100, serviceFee: 12, weekendPrice: 375 },
    availability: { minNights: 2, maxNights: 30 },
    instantBook: true,
    cancellationPolicy: 'moderate',
    status: 'active',
    rating: { average: 4.85, count: 203, breakdown: { cleanliness: 4.9, accuracy: 4.8, communication: 4.9, location: 5.0, checkIn: 4.8, value: 4.6 } },
    isFeatured: true,
    hostIndex: 2,
  },
  {
    title: 'Charming Parisian Apartment near Eiffel Tower',
    description: `Bonjour! Welcome to this beautifully appointed Parisian apartment with stunning views of the Eiffel Tower. This elegant space combines classic Haussmannian architecture with modern comfort.

The apartment features high ceilings with ornate moldings, herringbone parquet floors, and marble fireplaces. French doors open onto a wrought-iron balcony where you can enjoy your morning croissant while watching the Eiffel Tower sparkle.

Located in the 7th arrondissement, you're steps from the best museums, cafés, and boutiques Paris has to offer. This is your chance to live like a true Parisian.`,
    propertyType: 'apartment',
    roomType: 'entire',
    category: 'city',
    location: {
      address: '28 Rue Cler',
      city: 'Paris',
      state: 'Île-de-France',
      country: 'France',
      zipCode: '75007',
      coordinates: { type: 'Point', coordinates: [2.3522, 48.8566] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200', isPrimary: true, caption: 'Living Room' },
      { url: 'https://images.unsplash.com/photo-1549638441-b787d2e11f14?w=800', caption: 'Eiffel View' },
      { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800', caption: 'Bedroom' },
      { url: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800', caption: 'Kitchen' },
    ],
    amenities: ['wifi', 'kitchen', 'heating', 'tv', 'washer', 'elevator', 'hair_dryer', 'iron', 'workspace'],
    capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
    pricing: { currency: 'INR', basePrice: 295, cleaningFee: 80, serviceFee: 12, weeklyDiscount: 10 },
    availability: { minNights: 3, maxNights: 28 },
    instantBook: true,
    cancellationPolicy: 'moderate',
    status: 'active',
    rating: { average: 4.91, count: 178, breakdown: { cleanliness: 4.9, accuracy: 4.9, communication: 5.0, location: 5.0, checkIn: 4.9, value: 4.8 } },
    hostIndex: 1,
  },
  // Lake Properties
  {
    title: 'Lakeside Log Cabin with Private Dock',
    description: `Discover tranquility at this stunning lakeside cabin with your own private dock. Wake up to mist rising off the crystal-clear lake, spend your days fishing or kayaking, and end each evening around the fire pit under a blanket of stars.

This authentic log cabin has been thoughtfully updated with modern amenities while preserving its rustic charm. The open living area features a stone fireplace, vaulted ceilings, and large windows framing the spectacular lake views.

Whether you're seeking adventure or relaxation, this lakeside retreat offers the perfect escape. Bring your fishing gear, hiking boots, and sense of wonder.`,
    propertyType: 'cabin',
    roomType: 'entire',
    category: 'lake',
    location: {
      address: '567 Lakeshore Drive',
      city: 'Lake Tahoe',
      state: 'California',
      country: 'United States',
      zipCode: '96150',
      coordinates: { type: 'Point', coordinates: [-120.0324, 38.9399] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200', isPrimary: true, caption: 'Lakeside View' },
      { url: 'https://images.unsplash.com/photo-1595521624992-48a59aef95e3?w=800', caption: 'Dock' },
      { url: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800', caption: 'Interior' },
      { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800', caption: 'Lake Activities' },
    ],
    amenities: ['wifi', 'kitchen', 'heating', 'free_parking', 'tv', 'washer', 'dryer', 'lake_access', 'bbq_grill'],
    capacity: { guests: 6, bedrooms: 3, beds: 4, bathrooms: 2 },
    pricing: { currency: 'INR', basePrice: 345, cleaningFee: 100, serviceFee: 12, weekendPrice: 395, weeklyDiscount: 10 },
    availability: { minNights: 2, maxNights: 14 },
    instantBook: true,
    cancellationPolicy: 'moderate',
    status: 'active',
    rating: { average: 4.94, count: 112, breakdown: { cleanliness: 5.0, accuracy: 4.9, communication: 5.0, location: 5.0, checkIn: 4.9, value: 4.8 } },
    hostIndex: 0,
  },
  // Unique Properties
  {
    title: 'Santorini Cave House with Caldera Views',
    description: `Live your Greek island dream in this authentic cave house carved into the volcanic cliffs of Santorini. With unobstructed views of the famous caldera and legendary sunsets, this is one of the most photographed locations in the world.

The traditional Cycladic architecture has been lovingly restored with whitewashed walls, curved ceilings, and minimalist elegance. Your private terrace includes a plunge pool that seems to float above the azure Aegean Sea.

Watch cruise ships glide across the caldera, explore the charming village streets, and dine at cliff-side restaurants. This isn't just accommodation – it's the experience of a lifetime.`,
    propertyType: 'cave',
    roomType: 'entire',
    category: 'unique',
    location: {
      address: '12 Caldera Path',
      city: 'Oia',
      state: 'Santorini',
      country: 'Greece',
      zipCode: '84702',
      coordinates: { type: 'Point', coordinates: [25.3755, 36.4618] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200', isPrimary: true, caption: 'Cave House' },
      { url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800', caption: 'Plunge Pool' },
      { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', caption: 'Interior' },
      { url: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800', caption: 'Sunset View' },
    ],
    amenities: ['wifi', 'kitchen', 'air_conditioning', 'pool', 'tv', 'patio'],
    capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1 },
    pricing: { currency: 'INR', basePrice: 425, cleaningFee: 100, serviceFee: 12, weekendPrice: 475, weeklyDiscount: 10 },
    availability: { minNights: 2, maxNights: 14 },
    instantBook: true,
    cancellationPolicy: 'strict',
    status: 'active',
    rating: { average: 4.97, count: 245, breakdown: { cleanliness: 5.0, accuracy: 5.0, communication: 5.0, location: 5.0, checkIn: 4.9, value: 4.9 } },
    isFeatured: true,
    hostIndex: 2,
  },
  {
    title: 'Treehouse Retreat in the Rainforest',
    description: `Reconnect with nature in this magical treehouse nestled high in the Costa Rican rainforest canopy. Fall asleep to the symphony of exotic birds and howler monkeys, and wake up eye-level with toucans and sloths.

This architectural marvel is suspended 60 feet above the forest floor, connected by suspension bridges and spiral staircases. The open-air design invites the jungle in while maintaining all the comforts of a luxury hotel.

Experience zip-lining, waterfall hikes, and wildlife tours by day, then return to your private sanctuary in the trees. This is where adventure meets serenity.`,
    propertyType: 'treehouse',
    roomType: 'entire',
    category: 'unique',
    location: {
      address: '100 Rainforest Road',
      city: 'La Fortuna',
      state: 'Alajuela',
      country: 'Costa Rica',
      zipCode: '21007',
      coordinates: { type: 'Point', coordinates: [-84.6427, 10.4699] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200', isPrimary: true, caption: 'Treehouse' },
      { url: 'https://images.unsplash.com/photo-1604537466158-719b1972feb8?w=800', caption: 'Interior' },
      { url: 'https://images.unsplash.com/photo-1574739782594-db4ead022697?w=800', caption: 'Canopy View' },
      { url: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=800', caption: 'Wildlife' },
    ],
    amenities: ['wifi', 'kitchen'],
    capacity: { guests: 2, bedrooms: 1, beds: 1, bathrooms: 1 },
    pricing: { currency: 'INR', basePrice: 275, cleaningFee: 50, serviceFee: 12, weeklyDiscount: 15 },
    availability: { minNights: 2, maxNights: 7 },
    instantBook: false,
    cancellationPolicy: 'moderate',
    status: 'active',
    rating: { average: 4.93, count: 87, breakdown: { cleanliness: 4.9, accuracy: 4.9, communication: 5.0, location: 5.0, checkIn: 4.8, value: 4.9 } },
    hostIndex: 2,
  },
  // Tropical Properties
  {
    title: 'Bali Villa with Rice Terrace Views',
    description: `Immerse yourself in the spiritual heart of Bali at this stunning villa overlooking the iconic rice terraces of Ubud. Traditional Balinese architecture meets contemporary luxury in this peaceful sanctuary.

The villa features an open-air living pavilion, a private infinity pool that mirrors the emerald terraces, and a garden filled with tropical flowers and ancient statues. Daily breakfast, yoga sessions, and traditional Balinese offerings are included.

Explore nearby temples, take cooking classes, or simply meditate to the sounds of nature. This is Bali at its most authentic and magical.`,
    propertyType: 'villa',
    roomType: 'entire',
    category: 'tropical',
    location: {
      address: '88 Jalan Tirta Tawar',
      city: 'Ubud',
      state: 'Bali',
      country: 'Indonesia',
      zipCode: '80571',
      coordinates: { type: 'Point', coordinates: [115.2618, -8.5069] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200', isPrimary: true, caption: 'Villa & Pool' },
      { url: 'https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800', caption: 'Rice Terraces' },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', caption: 'Bedroom' },
      { url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800', caption: 'Outdoor Bath' },
    ],
    amenities: ['wifi', 'pool', 'kitchen', 'air_conditioning', 'free_parking', 'garden'],
    capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 2 },
    pricing: { currency: 'INR', basePrice: 195, cleaningFee: 40, serviceFee: 12, weeklyDiscount: 20, monthlyDiscount: 35 },
    availability: { minNights: 2, maxNights: 60 },
    instantBook: true,
    cancellationPolicy: 'flexible',
    status: 'active',
    rating: { average: 4.96, count: 312, breakdown: { cleanliness: 5.0, accuracy: 5.0, communication: 5.0, location: 5.0, checkIn: 5.0, value: 4.9 } },
    isFeatured: true,
    hostIndex: 1,
  },
  // Desert Properties
  {
    title: 'Modern Desert Retreat with Mountain Views',
    description: `Experience the magic of the high desert in this stunning modern home designed by a renowned architect. Clean lines, walls of glass, and indoor-outdoor living spaces blur the boundary between shelter and nature.

The home features a chef's kitchen, a spectacular great room with fireplace, and multiple terraces for enjoying the dramatic desert landscape. The private pool and hot tub offer relief from the desert heat while framing views of the San Jacinto Mountains.

Just minutes from Palm Springs' world-famous dining, shopping, and golf courses, this retreat offers the perfect balance of seclusion and accessibility.`,
    propertyType: 'house',
    roomType: 'entire',
    category: 'desert',
    location: {
      address: '2345 Vista Dunes',
      city: 'Palm Springs',
      state: 'California',
      country: 'United States',
      zipCode: '92264',
      coordinates: { type: 'Point', coordinates: [-116.5453, 33.8303] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200', isPrimary: true, caption: 'Exterior' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', caption: 'Pool' },
      { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', caption: 'Living Room' },
      { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', caption: 'Bedroom' },
    ],
    amenities: ['wifi', 'pool', 'hot_tub', 'kitchen', 'air_conditioning', 'tv', 'free_parking', 'patio', 'bbq_grill', 'workspace'],
    capacity: { guests: 6, bedrooms: 3, beds: 3, bathrooms: 2.5 },
    pricing: { currency: 'INR', basePrice: 425, cleaningFee: 150, serviceFee: 12, weekendPrice: 495, weeklyDiscount: 10 },
    availability: { minNights: 2, maxNights: 30 },
    instantBook: true,
    cancellationPolicy: 'moderate',
    status: 'active',
    rating: { average: 4.87, count: 134, breakdown: { cleanliness: 4.9, accuracy: 4.8, communication: 4.9, location: 4.9, checkIn: 4.9, value: 4.7 } },
    hostIndex: 0,
  },
  // Countryside Properties
  {
    title: 'Restored Tuscan Farmhouse with Vineyards',
    description: `Live la dolce vita in this meticulously restored 16th-century Tuscan farmhouse surrounded by rolling hills, olive groves, and vineyards. Stone walls, terracotta floors, and wood-beamed ceilings preserve the authentic character of rural Italy.

The farmhouse includes a large country kitchen perfect for preparing fresh pasta, multiple living areas with fireplaces, and a covered terrace for al fresco dining with views of the Chianti countryside. A pool, gardens, and private chapel complete this extraordinary estate.

Explore nearby hill towns, take cooking classes, visit local wineries, or simply relax with a glass of Chianti as the Tuscan sun sets over your private paradise.`,
    propertyType: 'farm',
    roomType: 'entire',
    category: 'countryside',
    location: {
      address: 'Podere San Lorenzo 45',
      city: 'Greve in Chianti',
      state: 'Tuscany',
      country: 'Italy',
      zipCode: '50022',
      coordinates: { type: 'Point', coordinates: [11.3190, 43.5833] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1200', isPrimary: true, caption: 'Farmhouse' },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', caption: 'Pool' },
      { url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800', caption: 'Vineyard' },
      { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', caption: 'Interior' },
    ],
    amenities: ['wifi', 'pool', 'kitchen', 'heating', 'free_parking', 'garden', 'bbq_grill'],
    capacity: { guests: 10, bedrooms: 5, beds: 6, bathrooms: 4 },
    pricing: { currency: 'INR', basePrice: 595, cleaningFee: 200, serviceFee: 12, weekendPrice: 695, weeklyDiscount: 15, monthlyDiscount: 25 },
    availability: { minNights: 3, maxNights: 30 },
    instantBook: false,
    cancellationPolicy: 'strict',
    status: 'active',
    rating: { average: 4.94, count: 78, breakdown: { cleanliness: 5.0, accuracy: 4.9, communication: 5.0, location: 5.0, checkIn: 4.9, value: 4.8 } },
    hostIndex: 2,
  },
  // Luxury Properties
  {
    title: 'Private Island Villa in the Maldives',
    description: `Experience the ultimate in luxury and privacy at this exclusive overwater villa on a private island in the Maldives. Crystal-clear turquoise waters, pristine white sand beaches, and unparalleled service await.

Your villa features a glass-floor living room for watching marine life below, an infinity pool merging with the Indian Ocean, and a personal butler available 24/7. Spa treatments, private dining, and water sports are all arranged at your whim.

This is where celebrities and discerning travelers come to truly escape. With only a handful of villas on the island, privacy and tranquility are guaranteed.`,
    propertyType: 'villa',
    roomType: 'entire',
    category: 'luxury',
    location: {
      address: 'Island 7, Private Atoll',
      city: 'Male Atoll',
      state: 'Kaafu',
      country: 'Maldives',
      zipCode: '20026',
      coordinates: { type: 'Point', coordinates: [73.5093, 4.1755] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200', isPrimary: true, caption: 'Overwater Villa' },
      { url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800', caption: 'Private Pool' },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', caption: 'Interior' },
      { url: 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=800', caption: 'Beach' },
    ],
    amenities: ['wifi', 'pool', 'kitchen', 'air_conditioning'],
    capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 2 },
    pricing: { currency: 'INR', basePrice: 2500, cleaningFee: 0, serviceFee: 14, weeklyDiscount: 5 },
    availability: { minNights: 3, maxNights: 14 },
    instantBook: false,
    cancellationPolicy: 'super_strict',
    status: 'active',
    rating: { average: 5.0, count: 42, breakdown: { cleanliness: 5.0, accuracy: 5.0, communication: 5.0, location: 5.0, checkIn: 5.0, value: 5.0 } },
    isFeatured: true,
    hostIndex: 0,
  },
  // Tokyo Apartment
  {
    title: 'Minimalist Tokyo Apartment in Shibuya',
    description: `Experience authentic Tokyo living in this beautifully designed minimalist apartment in the heart of Shibuya. Japanese aesthetics meet modern comfort in this thoughtfully curated space.

The apartment features clean lines, natural materials, and clever storage solutions typical of Japanese design. Floor-to-ceiling windows offer views of the Tokyo skyline, while the neighborhood offers easy access to the famous Shibuya Crossing, trendy shops, and excellent restaurants.

Whether you're here for business or pleasure, this apartment provides the perfect base for exploring one of the world's most exciting cities.`,
    propertyType: 'apartment',
    roomType: 'entire',
    category: 'city',
    location: {
      address: '3-15-2 Shibuya',
      city: 'Tokyo',
      state: 'Tokyo',
      country: 'Japan',
      zipCode: '150-0002',
      coordinates: { type: 'Point', coordinates: [139.7005, 35.6595] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=1200', isPrimary: true, caption: 'Living Area' },
      { url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', caption: 'Bedroom' },
      { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800', caption: 'View' },
      { url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800', caption: 'Shibuya' },
    ],
    amenities: ['wifi', 'kitchen', 'air_conditioning', 'heating', 'tv', 'washer', 'workspace'],
    capacity: { guests: 2, bedrooms: 1, beds: 1, bathrooms: 1 },
    pricing: { currency: 'INR', basePrice: 165, cleaningFee: 50, serviceFee: 12, weeklyDiscount: 10 },
    availability: { minNights: 2, maxNights: 30 },
    instantBook: true,
    cancellationPolicy: 'flexible',
    status: 'active',
    rating: { average: 4.82, count: 189, breakdown: { cleanliness: 4.9, accuracy: 4.8, communication: 4.9, location: 5.0, checkIn: 4.7, value: 4.6 } },
    hostIndex: 1,
  },
  // Camping/Glamping
  {
    title: 'Luxury Safari Tent in Wine Country',
    description: `Glamping at its finest! This luxury safari tent offers a unique outdoor experience without sacrificing comfort. Set among rolling vineyards in Sonoma Wine Country, this is camping reimagined.

The spacious tent features a king-size bed with premium linens, an en-suite bathroom, and a private deck with vineyard views. Fall asleep to the sounds of nature and wake up to complimentary coffee delivered to your tent.

Spend your days wine tasting at nearby vineyards, hiking through redwood forests, or relaxing by the shared pool. This is the perfect blend of adventure and luxury.`,
    propertyType: 'tent',
    roomType: 'entire',
    category: 'camping',
    location: {
      address: '500 Vineyard Lane',
      city: 'Healdsburg',
      state: 'California',
      country: 'United States',
      zipCode: '95448',
      coordinates: { type: 'Point', coordinates: [-122.8697, 38.6106] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200', isPrimary: true, caption: 'Safari Tent' },
      { url: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800', caption: 'Interior' },
      { url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800', caption: 'Vineyard' },
      { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', caption: 'Pool' },
    ],
    amenities: ['wifi', 'pool', 'free_parking'],
    capacity: { guests: 2, bedrooms: 1, beds: 1, bathrooms: 1 },
    pricing: { currency: 'INR', basePrice: 275, cleaningFee: 50, serviceFee: 12, weekendPrice: 325 },
    availability: { minNights: 1, maxNights: 7 },
    instantBook: true,
    cancellationPolicy: 'flexible',
    status: 'active',
    rating: { average: 4.88, count: 156, breakdown: { cleanliness: 4.9, accuracy: 4.8, communication: 5.0, location: 5.0, checkIn: 4.9, value: 4.7 } },
    hostIndex: 2,
  },
  // Historical Property
  {
    title: 'Medieval Castle Tower in Scottish Highlands',
    description: `Live like royalty in this authentic medieval castle tower in the Scottish Highlands. Dating back to the 15th century, this historic tower has been lovingly restored to offer a unique blend of ancient character and modern comfort.

Climb the spiral stone staircase to discover rooms filled with antiques, tapestries, and roaring fireplaces. The master bedroom in the tower's crown offers 360-degree views of the dramatic Highland landscape.

Explore nearby lochs, hike ancient trails, or simply curl up with a whisky by the fire. This is Scotland at its most romantic and mysterious.`,
    propertyType: 'castle',
    roomType: 'entire',
    category: 'historical',
    location: {
      address: 'Castle Road',
      city: 'Inverness',
      state: 'Scottish Highlands',
      country: 'United Kingdom',
      zipCode: 'IV63 6TU',
      coordinates: { type: 'Point', coordinates: [-4.2246, 57.4778] },
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=1200', isPrimary: true, caption: 'Castle Tower' },
      { url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800', caption: 'Interior' },
      { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', caption: 'Highland View' },
      { url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800', caption: 'Grounds' },
    ],
    amenities: ['wifi', 'kitchen', 'heating', 'free_parking', 'garden'],
    capacity: { guests: 4, bedrooms: 2, beds: 2, bathrooms: 1.5 },
    pricing: { currency: 'INR', basePrice: 385, cleaningFee: 100, serviceFee: 12, weekendPrice: 450, weeklyDiscount: 10 },
    availability: { minNights: 2, maxNights: 14 },
    instantBook: false,
    cancellationPolicy: 'strict',
    status: 'active',
    rating: { average: 4.91, count: 67, breakdown: { cleanliness: 4.9, accuracy: 4.9, communication: 5.0, location: 5.0, checkIn: 4.8, value: 4.8 } },
    hostIndex: 0,
  },
];

// Sample Reviews for each property
const reviewTemplates = [
  { rating: 5, comment: "Absolutely incredible stay. The host communication was prompt and everything was exactly as described." },
  { rating: 5, comment: "Beautiful home, spotless rooms, and smooth check-in. We felt comfortable from the first minute." },
  { rating: 4, comment: "Very good overall experience. Great location and amenities, with just a small delay during check-in." },
  { rating: 5, comment: "Perfect for our family trip. The property was spacious, safe, and thoughtfully prepared for guests." },
  { rating: 5, comment: "The stay exceeded expectations. Lovely interiors, peaceful atmosphere, and excellent host support." },
  { rating: 4, comment: "Nice property with a great view. We enjoyed our stay and would gladly book this place again." },
  { rating: 5, comment: "One of the best stays we have had. Every detail was planned and the listing matched reality perfectly." },
  { rating: 5, comment: "Wonderful host and amazing property. Clean bathrooms, comfy beds, and all essentials were available." },
  { rating: 4, comment: "Convenient location and fair value. The home was clean and the host handled our requests quickly." },
  { rating: 5, comment: "Fantastic experience from start to finish. We would happily recommend this place to other travelers." },
  { rating: 5, comment: "Excellent ambience and privacy. The property felt premium and made our trip memorable." },
  { rating: 4, comment: "Good stay with reliable amenities and clear instructions. Overall, a positive hosting experience." },
];

const REVIEWS_PER_PROPERTY = 10;

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Property.deleteMany({}),
      Booking.deleteMany({}),
      Review.deleteMany({}),
    ]);
    console.log('✅ Existing data cleared\n');

    // Create Users
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const userData of users) {
      // Don't hash here - let the model's pre-save hook handle it
      const user = await User.create({
        ...userData,
      });
      createdUsers.push(user);
      console.log(`   ✓ Created user: ${user.email}`);
    }
    console.log(`✅ Created ${createdUsers.length} users\n`);

    // Create Properties
    console.log('🏠 Creating properties...');
    const createdProperties = [];
    for (const propertyData of properties) {
      const hostIndex = propertyData.hostIndex;
      delete propertyData.hostIndex;
      
      const property = await Property.create({
        ...propertyData,
        host: createdUsers[hostIndex]._id,
      });
      createdProperties.push(property);
      console.log(`   ✓ Created: ${property.title.substring(0, 50)}...`);
    }
    console.log(`✅ Created ${createdProperties.length} properties\n`);

    // Create Bookings + Reviews (minimum 10 per property)
    console.log('⭐ Creating bookings and reviews...');
    const guestUsers = createdUsers.filter((u) => u.role !== 'admin');
    let createdBookingsCount = 0;
    let createdReviewsCount = 0;

    for (let propertyIndex = 0; propertyIndex < createdProperties.length; propertyIndex++) {
      const property = createdProperties[propertyIndex];
      const possibleGuests = guestUsers.filter(
        (u) => u._id.toString() !== property.host.toString()
      );

      for (let i = 0; i < REVIEWS_PER_PROPERTY; i++) {
        const guest = possibleGuests[i % possibleGuests.length];
        const startOffsetDays = propertyIndex * 40 + i * 3 + 2;
        const checkIn = new Date();
        checkIn.setDate(checkIn.getDate() + startOffsetDays);
        checkIn.setHours(14, 0, 0, 0);

        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + 2);
        checkOut.setHours(11, 0, 0, 0);

        const guestCount = Math.max(1, Math.min(2, property.capacity?.guests || 2));
        const pricing = property.calculatePrice(checkIn, checkOut, guestCount);

        const booking = await Booking.create({
          property: property._id,
          guest: guest._id,
          host: property.host,
          checkIn,
          checkOut,
          guests: {
            adults: guestCount,
            children: 0,
            infants: 0,
            pets: 0,
          },
          pricing: {
            nightlyRate: pricing.nightlyRate,
            nights: pricing.nights,
            subtotal: pricing.subtotal,
            discount: pricing.discount,
            cleaningFee: pricing.cleaningFee,
            serviceFee: pricing.serviceFee,
            taxes: 0,
            total: pricing.total,
            currency: pricing.currency || 'INR',
            hostPayout: pricing.total - pricing.serviceFee,
          },
          payment: {
            status: 'succeeded',
            method: 'demo',
            paidAt: new Date(),
          },
          status: 'completed',
          isInstantBook: true,
          cancellation: {
            policy: property.cancellationPolicy || 'moderate',
          },
        });
        createdBookingsCount += 1;

        const template = reviewTemplates[(propertyIndex * REVIEWS_PER_PROPERTY + i) % reviewTemplates.length];
        await Review.create({
          booking: booking._id,
          property: property._id,
          reviewer: guest._id,
          reviewee: property.host,
          type: 'guest-to-host',
          ratings: {
            overall: template.rating,
            cleanliness: template.rating,
            accuracy: template.rating,
            communication: 5,
            location: template.rating,
            checkIn: template.rating,
            value: template.rating === 5 ? 5 : 4,
          },
          comment: template.comment,
          isPublic: true,
        });
        createdReviewsCount += 1;
      }
    }
    console.log(`✅ Created ${createdBookingsCount} bookings and ${createdReviewsCount} reviews\n`);

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('           🎉 SEED COMPLETE! 🎉           ');
    console.log('═══════════════════════════════════════════');
    console.log(`\n📊 Summary:`);
    console.log(`   • Users: ${createdUsers.length}`);
    console.log(`   • Properties: ${createdProperties.length}`);
    console.log(`   • Property Reviews: ${createdReviewsCount}`);
    console.log(`\n🔐 Test Accounts:`);
    console.log(`   • Host: sarah@staybnb.com / Password123!`);
    console.log(`   • Host: michael@staybnb.com / Password123!`);
    console.log(`   • Host: emma@staybnb.com / Password123!`);
    console.log(`   • User: demo@staybnb.com / Demo123!`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seed
seedDatabase();
