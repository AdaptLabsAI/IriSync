#!/usr/bin/env node

/**
 * Deploy Seeding Script for Vercel
 * This script calls the admin seeding API endpoint to initialize the database
 * Can be run during deployment or manually by admins
 */

const https = require('https');
const http = require('http');
const url = require('url');

// Configuration
const config = {
  // Override these with environment variables
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000',
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  force: process.env.FORCE_SEED === 'true'
};

/**
 * Make HTTP request
 */
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : {}
          };
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Login to get session (if authentication is required)
 */
async function login() {
  if (!config.adminEmail || !config.adminPassword) {
    console.log('No admin credentials provided. Assuming public seeding endpoint.');
    return null;
  }
  
  console.log('🔐 Logging in as admin...');
  
  const loginUrl = new URL('/api/auth/login', config.baseUrl);
  const options = {
    hostname: loginUrl.hostname,
    port: loginUrl.port,
    path: loginUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  try {
    const response = await makeRequest(options, {
      email: config.adminEmail,
      password: config.adminPassword
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Login successful');
      // Extract session cookie if needed
      const cookies = response.headers['set-cookie'];
      return cookies ? cookies.join('; ') : null;
    } else {
      throw new Error(`Login failed: ${response.body.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return null;
  }
}

/**
 * Check seeding status
 */
async function checkSeedingStatus(sessionCookie) {
  console.log('📊 Checking current seeding status...');
  
  const statusUrl = new URL('/api/admin/seed-database', config.baseUrl);
  const options = {
    hostname: statusUrl.hostname,
    port: statusUrl.port,
    path: statusUrl.pathname,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (sessionCookie) {
    options.headers['Cookie'] = sessionCookie;
  }
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      const status = response.body.status;
      console.log(`📈 Database Status:`);
      console.log(`   - Seeded: ${status.isSeeded ? 'Yes' : 'No'}`);
      console.log(`   - Configurations: ${status.existingCount}/${status.expectedCount}`);
      console.log(`   - Completion: ${status.completionPercentage}%`);
      
      return status;
    } else {
      throw new Error(`Status check failed: ${response.body.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    return null;
  }
}

/**
 * Run database seeding
 */
async function runSeeding(sessionCookie, force = false) {
  console.log(`🌱 ${force ? 'Force refreshing' : 'Seeding'} database...`);
  
  const seedUrl = new URL('/api/admin/seed-database', config.baseUrl);
  const options = {
    hostname: seedUrl.hostname,
    port: seedUrl.port,
    path: seedUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (sessionCookie) {
    options.headers['Cookie'] = sessionCookie;
  }
  
  try {
    const response = await makeRequest(options, { force });
    
    if (response.statusCode === 200) {
      const results = response.body.results;
      console.log('✅ Seeding completed successfully!');
      console.log(`   - Seeded: ${results.seededCount} configurations`);
      console.log(`   - Skipped: ${results.skippedCount} existing configurations`);
      
      if (results.errors && results.errors.length > 0) {
        console.log('⚠️  Some errors occurred:');
        results.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      return true;
    } else {
      throw new Error(`Seeding failed: ${response.body.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 AI Model Database Seeding Tool');
  console.log(`📍 Target: ${config.baseUrl}`);
  console.log('');
  
  try {
    // Step 1: Login if credentials provided
    const sessionCookie = await login();
    
    // Step 2: Check current status
    const status = await checkSeedingStatus(sessionCookie);
    if (!status) {
      process.exit(1);
    }
    
    // Step 3: Determine if seeding is needed
    const needsSeeding = !status.isSeeded || config.force;
    
    if (!needsSeeding) {
      console.log('✅ Database is already fully seeded. Use --force to refresh.');
      process.exit(0);
    }
    
    // Step 4: Run seeding
    const success = await runSeeding(sessionCookie, config.force);
    
    if (success) {
      console.log('');
      console.log('🎉 Database seeding completed successfully!');
      console.log('Your AI model configurations are ready to use.');
      process.exit(0);
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--force')) {
  config.force = true;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node scripts/deploy-seed.js [options]

Options:
  --force    Force refresh all configurations (overwrites existing)
  --help     Show this help message

Environment Variables:
  NEXT_PUBLIC_APP_URL   Base URL of your application
  ADMIN_EMAIL          Admin email for authentication
  ADMIN_PASSWORD       Admin password for authentication
  FORCE_SEED           Set to 'true' to force refresh

Examples:
  node scripts/deploy-seed.js                    # Seed missing configurations
  node scripts/deploy-seed.js --force            # Force refresh all
  FORCE_SEED=true node scripts/deploy-seed.js    # Force via environment variable
`);
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 