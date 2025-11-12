/**
 * Deploy Firestore and Storage Rules Script
 * 
 * This script deploys the updated rules files to Firebase.
 * Run with: node scripts/deploy-rules.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log with timestamps
function log(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${timestamp}] ${message}`);
}

// Execute shell command and return a promise
function execCommand(command) {
  return new Promise((resolve, reject) => {
    log(`Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        log(`Error: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        log(`Command stderr: ${stderr}`);
      }
      
      log(`Command stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    log(`Error checking if file exists: ${error.message}`);
    return false;
  }
}

// Main function to deploy rules
async function deployRules() {
  const rootDir = path.resolve(__dirname, '..');
  const firestoreRulesPath = path.join(rootDir, 'firestore.rules');
  const storageRulesPath = path.join(rootDir, 'storage.rules');
  
  log('Starting rules deployment...');
  
  // Check if Firebase CLI is installed
  try {
    await execCommand('firebase --version');
  } catch (error) {
    log('Firebase CLI not found. Installing...');
    try {
      await execCommand('npm install -g firebase-tools');
    } catch (installError) {
      log('Failed to install Firebase CLI. Please install it manually.');
      process.exit(1);
    }
  }
  
  // Check if rules files exist
  if (!fileExists(firestoreRulesPath)) {
    log('Firestore rules file not found.');
    process.exit(1);
  }
  
  if (!fileExists(storageRulesPath)) {
    log('Storage rules file not found.');
    process.exit(1);
  }
  
  // Deploy rules
  try {
    // Deploy Firestore rules
    log('Deploying Firestore rules...');
    await execCommand('firebase deploy --only firestore:rules');
    
    // Deploy Storage rules
    log('Deploying Storage rules...');
    await execCommand('firebase deploy --only storage:rules');
    
    log('Rules deployment completed successfully!');
  } catch (error) {
    log(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the deployment script
deployRules().catch(error => {
  log(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 