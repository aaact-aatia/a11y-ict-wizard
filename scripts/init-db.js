/**
 * Database Initialization Script
 * 
 * Automatically populates the MongoDB database from JSON files if collections are empty.
 * This runs once on container startup when using Docker Compose.
 * 
 * Data source: /JSON directory (questions.json, clauses.json, infos.json)
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Question = require('../models/questionSchema');
const Clause = require('../models/clauseSchema');
const Info = require('../models/infoSchema');

/**
 * Convert JSON format ($oid notation) to Mongoose ObjectId
 */
function convertToMongoFormat(items) {
  return items.map(item => {
    // Convert _id if present
    if (item._id && item._id.$oid) {
      item._id = mongoose.Types.ObjectId(item._id.$oid);
    }
    
    // Convert clauses array if present (for questions)
    if (item.clauses && Array.isArray(item.clauses)) {
      item.clauses = item.clauses.map(clause => 
        mongoose.Types.ObjectId(clause.$oid)
      );
    }
    
    return item;
  });
}

/**
 * Initialize a single collection from JSON file
 */
async function initializeCollection(Model, jsonFilePath, collectionName) {
  try {
    // Check if collection already has data
    const count = await Model.countDocuments();
    if (count > 0) {
      console.log(`ℹ️  ${collectionName} collection already has ${count} documents - skipping initialization`);
      return false;
    }

    // Read JSON file
    const jsonPath = path.join(__dirname, '..', jsonFilePath);
    if (!fs.existsSync(jsonPath)) {
      console.warn(`⚠️  File not found: ${jsonPath} - skipping ${collectionName} initialization`);
      return false;
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Convert format and insert
    const convertedData = convertToMongoFormat(jsonData);
    await Model.insertMany(convertedData);
    
    console.log(`✅ Initialized ${collectionName} collection with ${convertedData.length} documents`);
    return true;
  } catch (error) {
    console.error(`❌ Error initializing ${collectionName}:`, error.message);
    throw error;
  }
}

/**
 * Main initialization function
 */
async function initializeDatabase() {
  console.log('🔄 Checking database initialization status...');
  
  try {
    // Wait for MongoDB connection to be ready
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for MongoDB connection...');
      await new Promise(resolve => {
        mongoose.connection.once('open', resolve);
      });
    }

    let initialized = false;

    // Initialize each collection
    const clausesInit = await initializeCollection(
      Clause, 
      'JSON/clauses_list.json', 
      'clauses'
    );
    
    const infosInit = await initializeCollection(
      Info, 
      'JSON/infos_list.json', 
      'infos'
    );
    
    const questionsInit = await initializeCollection(
      Question, 
      'JSON/questions_list.json', 
      'questions'
    );

    initialized = clausesInit || infosInit || questionsInit;

    if (initialized) {
      console.log('✅ Database initialization complete');
    } else {
      console.log('ℹ️  Database already initialized - no changes needed');
    }

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Export for use in app startup
module.exports = initializeDatabase;

// Allow running standalone for testing
if (require.main === module) {
  require('dotenv').config();
  const mongoDB = process.env.DBURI || "mongodb://127.0.0.1:27017/a11y-req";
  
  mongoose.connect(mongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    return initializeDatabase();
  })
  .then(() => {
    console.log('Initialization script complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Initialization script failed:', error);
    process.exit(1);
  });
}
