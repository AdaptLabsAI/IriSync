import { PrismaClient } from '@prisma/client';

// Create a singleton instance of PrismaClient
const prismaClientSingleton = () => {
  return new PrismaClient();
};

// Use global variable to prevent multiple instances in development
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const database = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = database;
} 