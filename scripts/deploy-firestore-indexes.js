// Deploy Firestore Indexes Script
// This script deploys the Firestore indexes defined in firestore.indexes.json

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure we're in the right directory
const projectRoot = path.resolve(__dirname, '..');
const indexesPath = path.join(projectRoot, 'firestore.indexes.json');

// Function to deploy indexes
async function deployFirestoreIndexes() {
  try {
    // Check if the indexes file exists
    if (!fs.existsSync(indexesPath)) {
      console.error('Error: firestore.indexes.json not found at:', indexesPath);
      return {
        success: false,
        message: 'Firestore indexes file not found'
      };
    }
    
    console.log('Deploying Firestore indexes...');
    
    // Execute the Firebase CLI command to deploy indexes
    const output = execSync('firebase deploy --only firestore:indexes', { 
      cwd: projectRoot,
      stdio: 'inherit' 
    });
    
    return {
      success: true,
      message: 'Firestore indexes deployed successfully'
    };
  } catch (error) {
    console.error('Error deploying Firestore indexes:', error.message);
    return {
      success: false,
      message: 'Failed to deploy Firestore indexes',
      error: error.message
    };
  }
}

// Run the function
deployFirestoreIndexes()
  .then(result => {
    console.log('Deployment result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error during index deployment:', error);
    process.exit(1);
  }); 