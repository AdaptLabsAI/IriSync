// This file is run before each test file
import '@testing-library/jest-dom';

// Mock the next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock the next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => {
  return {
    getFirestore: jest.fn(),
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    setDoc: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    startAfter: jest.fn(),
    Timestamp: {
      now: () => ({ toDate: () => new Date() }),
      fromDate: (date) => ({ toDate: () => date }),
    },
  };
});

// Mock Firebase Auth
jest.mock('firebase/auth', () => {
  return {
    getAuth: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };
});

// Global beforeEach that clears all mocks
beforeEach(() => {
  jest.clearAllMocks();
});

// Global console error override to fail tests when React errors occur
const originalError = console.error;
console.error = (...args) => {
  // Throw error for React prop type warnings
  if (args[0]?.includes && args[0].includes('Failed prop type')) {
    throw new Error(args[0]);
  }
  originalError(...args);
};

// Set up global timing constants for tests
global.setImmediate = jest.useRealTimers; 