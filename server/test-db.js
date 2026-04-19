/**
 * MongoDB Connection Test Script
 * Run with: node test-db.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB Connection...\n');

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.log('❌ MONGODB_URI is not set in .env file');
  process.exit(1);
}

// Mask password for display
const displayUri = mongoUri.replace(/:([^@:]+)@/, ':****@');
console.log(`📍 Connection String: ${displayUri}\n`);

async function testConnection() {
  try {
    console.log('⏳ Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📦 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    
    // Test write
    const testCollection = mongoose.connection.collection('_connection_test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    await testCollection.deleteMany({ test: true });
    console.log('✅ Write test passed!');
    
    await mongoose.disconnect();
    console.log('\n🎉 All tests passed! Your MongoDB is ready.');
    process.exit(0);
    
  } catch (error) {
    console.log('\n❌ Connection Failed!');
    console.log(`Error: ${error.message}\n`);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.log('💡 Possible causes:');
      console.log('   1. MongoDB Atlas cluster does not exist or is paused');
      console.log('   2. Your IP address is not whitelisted in Network Access');
      console.log('   3. DNS resolution failed - check your internet connection');
      console.log('\n📝 Steps to fix:');
      console.log('   1. Go to https://cloud.mongodb.com');
      console.log('   2. Check if your cluster exists and is running');
      console.log('   3. Go to Network Access → Add IP Address → Allow Access from Anywhere');
      console.log('   4. Wait 1-2 minutes for changes to propagate');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 Authentication failed - wrong username or password');
      console.log('   1. Check your username and password in .env');
      console.log('   2. Go to Database Access in MongoDB Atlas to verify credentials');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.log('💡 Connection timed out');
      console.log('   1. Check your internet connection');
      console.log('   2. Try connecting to a different network (e.g., mobile hotspot)');
      console.log('   3. Check if a firewall is blocking the connection');
    }
    
    process.exit(1);
  }
}

testConnection();
