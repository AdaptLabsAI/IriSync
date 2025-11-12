import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

// Mock Firestore data
export const mockFirestoreData = {
  knowledgeContent: {
    'doc1': {
      id: 'doc1',
      title: 'Test Document 1',
      slug: 'test-document-1',
      content: '<p>This is test content</p>',
      contentType: 'faq',
      category: 'Testing',
      tags: ['test', 'mock'],
      status: 'published',
      accessLevel: 'public',
      createdAt: { toDate: () => new Date('2023-01-01') },
      updatedAt: { toDate: () => new Date('2023-01-02') },
      publishedAt: { toDate: () => new Date('2023-01-02') },
      createdBy: 'testUser',
      vectorIds: ['vector1', 'vector2']
    },
    'doc2': {
      id: 'doc2',
      title: 'Test Document 2',
      slug: 'test-document-2',
      content: '<p>This is another test content</p>',
      contentType: 'documentation',
      category: 'API',
      tags: ['api', 'docs'],
      status: 'draft',
      accessLevel: 'registered',
      createdAt: { toDate: () => new Date('2023-01-03') },
      updatedAt: { toDate: () => new Date('2023-01-04') },
      publishedAt: null,
      createdBy: 'testUser',
      vectorIds: []
    }
  },
  knowledgeCategories: {
    'Testing': {
      name: 'Testing',
      createdAt: { toDate: () => new Date('2023-01-01') }
    },
    'API': {
      name: 'API',
      createdAt: { toDate: () => new Date('2023-01-01') }
    }
  },
  blogPosts: {
    'blog1': {
      id: 'blog1',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      content: '<p>This is a test blog post</p>',
      excerpt: 'Test excerpt',
      author: 'Test Author',
      createdAt: { toDate: () => new Date('2023-01-01') },
      updatedAt: { toDate: () => new Date('2023-01-02') },
      publishedAt: { toDate: () => new Date('2023-01-02') }
    }
  }
};

// Helper to mock query snapshots
export function createMockQuerySnapshot(data: any[]) {
  return {
    empty: data.length === 0,
    size: data.length,
    docs: data.map(item => ({
      id: item.id,
      data: () => item,
      exists: () => true,
      ref: { id: item.id }
    })),
    forEach: (callback: Function) => data.forEach((item, idx) => {
      callback({
        id: item.id,
        data: () => item,
        exists: () => true,
        ref: { id: item.id }
      }, idx);
    })
  };
}

// Helper to mock document snapshot
export function createMockDocSnapshot(id: string, data: any) {
  return {
    id,
    data: () => data,
    exists: () => !!data,
    ref: { id }
  };
}

// Setup collection mocks
(collection as jest.Mock).mockImplementation((db, collectionName) => {
  return { path: collectionName, type: 'collection' };
});

// Setup document mocks
(doc as jest.Mock).mockImplementation((dbOrCollection, documentPath?, ...segments) => {
  let collectionName;
  
  if (typeof dbOrCollection === 'object' && dbOrCollection.type === 'collection') {
    collectionName = dbOrCollection.path;
    return { path: `${collectionName}/${documentPath}`, id: documentPath, type: 'doc' };
  }
  
  return { path: documentPath, id: documentPath, type: 'doc' };
});

// Setup getDoc mock
(getDoc as jest.Mock).mockImplementation(async (docRef: any) => {
  const parts = docRef.path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  
  const firestoreData = mockFirestoreData as Record<string, Record<string, any>>;
  if (firestoreData[collectionName] && firestoreData[collectionName][docId]) {
    return createMockDocSnapshot(docId, firestoreData[collectionName][docId]);
  }
  
  return createMockDocSnapshot(docId, null);
});

// Setup getDocs mock
(getDocs as jest.Mock).mockImplementation(async (queryRef: any) => {
  let collectionName: string, data: any[];
  const firestoreData = mockFirestoreData as Record<string, Record<string, any>>;
  
  if (queryRef.type === 'collection') {
    collectionName = queryRef.path;
    data = Object.values(firestoreData[collectionName] || {});
  } else {
    // Handle queries
    collectionName = queryRef._collectionRef?.path;
    data = Object.values(firestoreData[collectionName] || {});
    
    // If there are where clauses, filter data
    if (queryRef._filters) {
      queryRef._filters.forEach((filter: any) => {
        const field = filter.field;
        const value = filter.value;
        const operator = filter.operator;
        
        if (operator === '==') {
          data = data.filter((item: any) => item[field] === value);
        } else if (operator === 'array-contains') {
          data = data.filter((item: any) => Array.isArray(item[field]) && item[field].includes(value));
        }
      });
    }
  }
  
  return createMockQuerySnapshot(data);
});

// Setup query mock
(query as jest.Mock).mockImplementation((collectionRef: any, ...queryConstraints: any[]) => {
  const queryObj: any = {
    _collectionRef: collectionRef,
    _filters: [],
    type: 'query'
  };
  
  queryConstraints.forEach((constraint: any) => {
    if (constraint._field) {
      queryObj._filters.push(constraint);
    }
  });
  
  return queryObj;
});

// Setup where mock
(where as jest.Mock).mockImplementation((field: string, operator: string, value: any) => {
  return {
    _field: field,
    operator,
    value,
    type: 'where'
  };
});

// Setup add/set/update/delete mocks
(addDoc as jest.Mock).mockImplementation(async (collectionRef: any, data: any) => {
  const collectionName = collectionRef.path;
  const newId = `mock-${Math.random().toString(36).substring(2, 9)}`;
  
  const firestoreData = mockFirestoreData as Record<string, Record<string, any>>;
  if (!firestoreData[collectionName]) {
    firestoreData[collectionName] = {};
  }
  
  firestoreData[collectionName][newId] = {
    ...data,
    id: newId
  };
  
  return {
    id: newId,
    path: `${collectionName}/${newId}`
  };
});

(setDoc as jest.Mock).mockImplementation(async (docRef: any, data: any) => {
  const parts = docRef.path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  
  const firestoreData = mockFirestoreData as Record<string, Record<string, any>>;
  if (!firestoreData[collectionName]) {
    firestoreData[collectionName] = {};
  }
  
  firestoreData[collectionName][docId] = {
    ...data,
    id: docId
  };
  
  return {
    id: docId,
    path: docRef.path
  };
});

(updateDoc as jest.Mock).mockImplementation(async (docRef: any, data: any) => {
  const parts = docRef.path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  
  const firestoreData = mockFirestoreData as Record<string, Record<string, any>>;
  if (firestoreData[collectionName] && firestoreData[collectionName][docId]) {
    firestoreData[collectionName][docId] = {
      ...firestoreData[collectionName][docId],
      ...data
    };
  }
  
  return {
    id: docId,
    path: docRef.path
  };
});

(deleteDoc as jest.Mock).mockImplementation(async (docRef: any) => {
  const parts = docRef.path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  
  const firestoreData = mockFirestoreData as Record<string, Record<string, any>>;
  if (firestoreData[collectionName] && firestoreData[collectionName][docId]) {
    delete firestoreData[collectionName][docId];
  }
  
  return true;
}); 