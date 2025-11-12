#!/usr/bin/env ts-node
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { firestore as db } from '../src/lib/firebase';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
import { logger } from '../src/lib/logging/logger';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Script to backup database collections to JSON files
 */
async function backupData() {
  try {
    // Get parameters from command line arguments
    const args = process.argv.slice(2);
    const outputDir = args[0] || './backups';
    const collectionsToBackup = args[1]?.split(',') || [
      'knowledgeContent',
      'knowledgeCategories',
      'blogPosts',
      'careerPosts',
      'users'
    ];
    
    logger.info(`Starting database backup to ${outputDir}`);
    logger.info(`Collections to backup: ${collectionsToBackup.join(', ')}`);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create timestamp for backup folder
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupDir = path.join(outputDir, `backup-${timestamp}`);
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Backup each collection
    for (const collectionName of collectionsToBackup) {
      await backupCollection(collectionName, backupDir);
    }
    
    logger.info(`Backup completed successfully to ${backupDir}`);
  } catch (error) {
    logger.error(`Error during backup: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Backup a single collection
 */
async function backupCollection(collectionName: string, backupDir: string) {
  try {
    logger.info(`Backing up collection: ${collectionName}`);
    
    // Get all documents from collection
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    // Check if collection is empty
    if (querySnapshot.empty) {
      logger.warn(`Collection ${collectionName} is empty`);
      return;
    }
    
    // Extract data from documents
    const documents: Record<string, DocumentData> = {};
    querySnapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore timestamps to ISO strings for JSON serialization
      const processedData = processTimestamps(data);
      
      documents[doc.id] = {
        id: doc.id,
        ...processedData
      };
    });
    
    // Write to JSON file
    const filePath = path.join(backupDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
    
    logger.info(`Backed up ${Object.keys(documents).length} documents in ${collectionName}`);
  } catch (error) {
    logger.error(`Error backing up ${collectionName}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Process Firestore Timestamps to ISO strings for JSON serialization
 */
function processTimestamps(data: any): any {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => processTimestamps(item));
  }
  
  if (typeof data === 'object') {
    // Check if it's a Firestore Timestamp
    if (data.toDate && typeof data.toDate === 'function') {
      return data.toDate().toISOString();
    }
    
    // Process all object properties
    const result: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = processTimestamps(data[key]);
      }
    }
    return result;
  }
  
  return data;
}

// Run the script
if (require.main === module) {
  backupData()
    .then(() => {
      logger.info('Backup completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}

export default backupData; 