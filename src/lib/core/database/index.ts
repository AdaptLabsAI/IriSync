import { PrismaClient } from '@prisma/client';

/**
 * Check if we're in a build environment
 */
const isBuildTime = 
  process.env.NEXT_PHASE === 'phase-production-build' || 
  process.env.IS_BUILD_PHASE === 'true';

// Create a singleton instance of PrismaClient
const prismaClientSingleton = () => {
  // During build, return a mock Prisma client
  if (isBuildTime) {
    return {
      $connect: async () => {},
      $disconnect: async () => {},
      $transaction: async (fn: any) => fn({}),
      $queryRaw: async () => [],
      $executeRaw: async () => 0,
    } as any;
  }
  return new PrismaClient();
};

// Use global variable to prevent multiple instances in development
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Lazy initialization - only create Prisma client when first accessed
let _database: ReturnType<typeof prismaClientSingleton> | null = null;

function getDatabase() {
  if (!_database) {
    _database = global.prisma ?? prismaClientSingleton();
    if (process.env.NODE_ENV !== 'production' && !isBuildTime) {
      global.prisma = _database;
    }
  }
  return _database;
}

// Export a proxy that lazily initializes the database
export const database = new Proxy({} as ReturnType<typeof prismaClientSingleton>, {
  get(target, prop) {
    const db = getDatabase();
    return (db as any)[prop];
  }
}); 