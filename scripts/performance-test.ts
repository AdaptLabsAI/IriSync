#!/usr/bin/env ts-node
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { logger } from '../src/lib/logging/logger';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface PerformanceTestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  name: string;
  iterations: number;
  concurrency: number;
  timeout: number;
}

interface TestResult {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  statusCodes: Record<string, number>;
}

/**
 * Script to run performance tests against API endpoints
 */
async function runPerformanceTests() {
  try {
    // Get parameters from command line arguments
    const args = process.argv.slice(2);
    const configPath = args[0] || './performance-tests.json';
    const outputPath = args[1] || './performance-results.json';
    
    logger.info(`Loading test configuration from ${configPath}`);
    
    // Load test configuration
    let testConfigs: PerformanceTestConfig[];
    
    try {
      const configData = require(path.resolve(process.cwd(), configPath));
      testConfigs = configData.tests;
    } catch (error) {
      logger.error(`Failed to load test configuration: ${error instanceof Error ? error.message : String(error)}`);
      // Create a default test configuration
      testConfigs = [
        {
          url: 'http://localhost:3000/api/health',
          method: 'GET',
          name: 'Health Check API',
          iterations: 100,
          concurrency: 5,
          timeout: 5000
        }
      ];
      
      logger.info('Using default test configuration');
    }
    
    // Run tests
    const results: TestResult[] = [];
    
    for (const config of testConfigs) {
      logger.info(`Running test: ${config.name}`);
      const result = await runTest(config);
      results.push(result);
      
      // Log test results
      logger.info(`Test "${config.name}" completed`);
      logger.info(`  Requests: ${result.successfulRequests}/${result.totalRequests} successful`);
      logger.info(`  Avg response time: ${result.avgResponseTime.toFixed(2)}ms`);
      logger.info(`  Min/Max response time: ${result.minResponseTime}ms / ${result.maxResponseTime}ms`);
      logger.info(`  95th percentile: ${result.p95ResponseTime}ms`);
    }
    
    // Save results
    const testsOutput = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      results
    };
    
    require('fs').writeFileSync(
      path.resolve(process.cwd(), outputPath),
      JSON.stringify(testsOutput, null, 2)
    );
    
    logger.info(`Performance test results saved to ${outputPath}`);
  } catch (error) {
    logger.error(`Error during performance testing: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Run a single performance test
 */
async function runTest(config: PerformanceTestConfig): Promise<TestResult> {
  // Initialize result
  const result: TestResult = {
    name: config.name,
    totalRequests: config.iterations,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    minResponseTime: Number.MAX_SAFE_INTEGER,
    maxResponseTime: 0,
    p95ResponseTime: 0,
    statusCodes: {}
  };
  
  // Store all response times
  const responseTimes: number[] = [];
  
  // Queue for managing concurrency
  let activeRequests = 0;
  let completedRequests = 0;
  
  // Create a promise that resolves when all requests are complete
  return new Promise<TestResult>((resolve) => {
    // Function to run a single request
    const runRequest = async () => {
      activeRequests++;
      
      try {
        const startTime = Date.now();
        
        // Make the request
        const response = await fetch(config.url, {
          method: config.method,
          headers: {
            'Content-Type': 'application/json',
            ...config.headers
          },
          body: config.body ? JSON.stringify(config.body) : undefined,
          timeout: config.timeout
        });
        
        // Measure response time
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        // Update min/max response times
        result.minResponseTime = Math.min(result.minResponseTime, responseTime);
        result.maxResponseTime = Math.max(result.maxResponseTime, responseTime);
        
        // Track status codes
        const statusCode = response.status.toString();
        result.statusCodes[statusCode] = (result.statusCodes[statusCode] || 0) + 1;
        
        // Count successful requests (2xx or 3xx)
        if (response.status >= 200 && response.status < 400) {
          result.successfulRequests++;
        } else {
          result.failedRequests++;
        }
      } catch (error) {
        result.failedRequests++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Request error in test "${config.name}": ${errorMessage}`);
      }
      
      activeRequests--;
      completedRequests++;
      
      // Check if all requests have completed
      if (completedRequests === config.iterations) {
        // Calculate final statistics
        if (responseTimes.length > 0) {
          // Calculate average response time
          result.avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
          
          // Calculate 95th percentile
          responseTimes.sort((a, b) => a - b);
          const p95Index = Math.ceil(responseTimes.length * 0.95) - 1;
          result.p95ResponseTime = responseTimes[p95Index];
        }
        
        resolve(result);
      } else if (activeRequests < config.concurrency && completedRequests < config.iterations) {
        // Start another request if we haven't reached concurrency limit
        runRequest();
      }
    };
    
    // Start initial batch of requests up to concurrency limit
    const initialBatchSize = Math.min(config.concurrency, config.iterations);
    for (let i = 0; i < initialBatchSize; i++) {
      runRequest();
    }
  });
}

// Run the script
if (require.main === module) {
  runPerformanceTests()
    .then(() => {
      logger.info('Performance tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}

export default runPerformanceTests; 