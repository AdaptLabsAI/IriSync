import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentReference,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseFirestore, firestore } from '../core/firebase';
import { BlogPost, BlogComment, BlogPostStatus, CommentStatus, BlogCategory } from './models';
import { User } from '../core/models/User';
import { generateSlug } from '../utils/slug';

// Collection references
const POST_COLLECTION = 'blogPosts';
const COMMENT_COLLECTION = 'blogComments';
const CATEGORY_COLLECTION = 'blogCategories';

// Blog Post Repository
export const BlogPostRepository = {
  async getAll(
    status: BlogPostStatus = BlogPostStatus.PUBLISHED, 
    page = 1, 
    pageSize = 10, 
    lastDoc: any = null
  ): Promise<{ posts: BlogPost[], lastDoc: any, hasMore: boolean }> {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    let postQuery = query(
      collection(firestore, POST_COLLECTION),
      where('status', '==', status),
      orderBy('publishedAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      postQuery = query(postQuery, startAfter(lastDoc));
    }

    const snapshot = await getDocs(postQuery);
    const posts: BlogPost[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
    
    return {
      posts,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === pageSize
    };
  },

  async getBySlug(slug: string): Promise<BlogPost | null> {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Database not configured');

    const postQuery = query(
      collection(firestore, POST_COLLECTION),
      where('slug', '==', slug),
      where('status', '==', BlogPostStatus.PUBLISHED),
      limit(1)
    );

    const snapshot = await getDocs(postQuery);
    if (snapshot.docs.length === 0) return null;
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as BlogPost;
  },

  async getById(id: string): Promise<BlogPost | null> {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Database not configured');

    const docRef = doc(firestore, POST_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as BlogPost;
  },

  async create(postData: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'slug'>): Promise<BlogPost> {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Database not configured');

    // Generate a unique slug from the title
    const baseSlug = generateSlug(postData.title);
    let slug = baseSlug;
    let iteration = 1;

    // Check if slug already exists, if so, append a number
    while (await this.slugExists(slug)) {
      slug = `${baseSlug}-${iteration}`;
      iteration++;
    }

    const timestamp = Timestamp.now();
    const newPost: Omit<BlogPost, 'id'> = {
      ...postData,
      slug,
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: postData.status === BlogPostStatus.PUBLISHED ? timestamp : null
    };

    const docRef = await addDoc(collection(firestore, POST_COLLECTION), newPost);
    return { id: docRef.id, ...newPost } as BlogPost;
  },

  async update(id: string, postData: Partial<BlogPost>): Promise<BlogPost> {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Database not configured');

    const docRef = doc(firestore, POST_COLLECTION, id);
    const currentPost = await this.getById(id);
    
    if (!currentPost) {
      throw new Error(`Post with ID ${id} not found`);
    }

    // If title is changing, check if we need to update the slug
    if (postData.title && postData.title !== currentPost.title) {
      const baseSlug = generateSlug(postData.title);
      let slug = baseSlug;
      let iteration = 1;
      
      // Check if slug already exists, if so, append a number
      while (await this.slugExists(slug, id)) {
        slug = `${baseSlug}-${iteration}`;
        iteration++;
      }
      
      postData.slug = slug;
    }

    // If status is changing from draft to published, set publishedAt
    if (
      postData.status === BlogPostStatus.PUBLISHED && 
      currentPost.status !== BlogPostStatus.PUBLISHED
    ) {
      postData.publishedAt = Timestamp.now();
    }

    const updates = {
      ...postData,
      updatedAt: Timestamp.now()
    };

    await updateDoc(docRef, updates);
    
    // Get the updated document
    return { ...currentPost, ...updates } as BlogPost;
  },

  async delete(id: string): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    const docRef = doc(db, POST_COLLECTION, id);
    await deleteDoc(docRef);

    // Also delete all comments associated with this post
    const commentsQuery = query(
      collection(db, COMMENT_COLLECTION),
      where('postId', '==', id)
    );

    const commentsSnapshot = await getDocs(commentsQuery);
    const deletePromises = commentsSnapshot.docs.map(commentDoc =>
      deleteDoc(doc(db, COMMENT_COLLECTION, commentDoc.id))
    );

    await Promise.all(deletePromises);
  },

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    let slugQuery = query(
      collection(db, POST_COLLECTION),
      where('slug', '==', slug)
    );
    
    const snapshot = await getDocs(slugQuery);
    
    if (excludeId) {
      // If we're checking for an update, exclude the current post
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !snapshot.empty;
  },

  async getByTag(tag: string, page = 1, pageSize = 10, lastDoc: any = null): Promise<{ posts: BlogPost[], lastDoc: any, hasMore: boolean }> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    let tagQuery = query(
      collection(db, POST_COLLECTION),
      where('tags', 'array-contains', tag),
      where('status', '==', BlogPostStatus.PUBLISHED),
      orderBy('publishedAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      tagQuery = query(tagQuery, startAfter(lastDoc));
    }

    const snapshot = await getDocs(tagQuery);
    const posts: BlogPost[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
    
    return {
      posts,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === pageSize
    };
  },

  async getByAuthor(authorId: string, page = 1, pageSize = 10, lastDoc: any = null): Promise<{ posts: BlogPost[], lastDoc: any, hasMore: boolean }> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    let authorQuery = query(
      collection(db, POST_COLLECTION),
      where('author.id', '==', authorId),
      where('status', '==', BlogPostStatus.PUBLISHED),
      orderBy('publishedAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      authorQuery = query(authorQuery, startAfter(lastDoc));
    }

    const snapshot = await getDocs(authorQuery);
    const posts: BlogPost[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
    
    return {
      posts,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === pageSize
    };
  }
};

// Blog Comment Repository
export const BlogCommentRepository = {
  async getByPostId(
    postId: string, 
    status: CommentStatus = CommentStatus.APPROVED, 
    page = 1, 
    pageSize = 20, 
    lastDoc: any = null
  ): Promise<{ comments: BlogComment[], lastDoc: any, hasMore: boolean }> {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    let commentQuery = query(
      collection(firestore, COMMENT_COLLECTION),
      where('postId', '==', postId),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      commentQuery = query(commentQuery, startAfter(lastDoc));
    }

    const snapshot = await getDocs(commentQuery);
    const comments: BlogComment[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogComment));
    
    return {
      comments,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === pageSize
    };
  },

  async getById(id: string): Promise<BlogComment | null> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    const docRef = doc(db, COMMENT_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as BlogComment;
  },

  async create(commentData: Omit<BlogComment, 'id' | 'createdAt' | 'updatedAt' | 'isEdited' | 'likes' | 'reportCount'>): Promise<BlogComment> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    const timestamp = Timestamp.now();
    const newComment: Omit<BlogComment, 'id'> = {
      ...commentData,
      createdAt: timestamp,
      updatedAt: timestamp,
      isEdited: false,
      likes: 0,
      reportCount: 0
    };

    const docRef = await addDoc(collection(db, COMMENT_COLLECTION), newComment);
    return { id: docRef.id, ...newComment } as BlogComment;
  },

  async update(id: string, commentData: Partial<BlogComment>): Promise<BlogComment> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    const docRef = doc(db, COMMENT_COLLECTION, id);
    const currentComment = await this.getById(id);

    if (!currentComment) {
      throw new Error(`Comment with ID ${id} not found`);
    }

    const updates = {
      ...commentData,
      updatedAt: Timestamp.now(),
      isEdited: true
    };

    await updateDoc(docRef, updates);

    // Get the updated document
    return { ...currentComment, ...updates } as BlogComment;
  },

  async delete(id: string): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    const docRef = doc(db, COMMENT_COLLECTION, id);
    await deleteDoc(docRef);
  },

  async updateStatus(id: string, status: CommentStatus): Promise<BlogComment> {
    return this.update(id, { status });
  },

  async incrementLikes(id: string): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    const docRef = doc(db, COMMENT_COLLECTION, id);
    await updateDoc(docRef, {
      likes: increment(1)
    });
  },

  async reportComment(id: string): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    const docRef = doc(db, COMMENT_COLLECTION, id);
    await updateDoc(docRef, {
      reportCount: increment(1)
    });
  },

  async getPendingComments(page = 1, pageSize = 20, lastDoc: any = null): Promise<{ comments: BlogComment[], lastDoc: any, hasMore: boolean }> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    let pendingQuery = query(
      collection(db, COMMENT_COLLECTION),
      where('status', '==', CommentStatus.PENDING),
      orderBy('createdAt', 'asc'),
      limit(pageSize)
    );

    if (lastDoc) {
      pendingQuery = query(pendingQuery, startAfter(lastDoc));
    }

    const snapshot = await getDocs(pendingQuery);
    const comments: BlogComment[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogComment));
    
    return {
      comments,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === pageSize
    };
  }
};

// Blog Category Repository
export const BlogCategoryRepository = {
  async getAll(): Promise<BlogCategory[]> {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const categoryQuery = query(
      collection(firestore, CATEGORY_COLLECTION),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(categoryQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogCategory));
  },

  async getBySlug(slug: string): Promise<BlogCategory | null> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    const categoryQuery = query(
      collection(db, CATEGORY_COLLECTION),
      where('slug', '==', slug),
      limit(1)
    );

    const snapshot = await getDocs(categoryQuery);
    if (snapshot.docs.length === 0) return null;
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as BlogCategory;
  },

  async create(categoryData: Omit<BlogCategory, 'id' | 'postCount'>): Promise<BlogCategory> {
    const db = getFirebaseFirestore();
    if (!db) throw new Error('Database not configured');

    // Generate slug from name if not provided
    if (!categoryData.slug) {
      categoryData.slug = generateSlug(categoryData.name);
    }

    // Check if slug already exists
    const existingCategory = await this.getBySlug(categoryData.slug);
    if (existingCategory) {
      throw new Error(`Category with slug '${categoryData.slug}' already exists`);
    }

    const newCategory: Omit<BlogCategory, 'id'> = {
      ...categoryData,
      postCount: 0
    };

    const docRef = await addDoc(collection(db, CATEGORY_COLLECTION), newCategory);
    return { id: docRef.id, ...newCategory } as BlogCategory;
  },

  async update(id: string, categoryData: Partial<BlogCategory>): Promise<BlogCategory> {
    const docRef = doc(firestore, CATEGORY_COLLECTION, id);
    const currentCategory = await this.getById(id);
    
    if (!currentCategory) {
      throw new Error(`Category with ID ${id} not found`);
    }

    // If name is changing, update the slug
    if (categoryData.name && categoryData.name !== currentCategory.name && !categoryData.slug) {
      categoryData.slug = generateSlug(categoryData.name);
    }
    
    // Check if slug already exists and is not this category's slug
    if (categoryData.slug && categoryData.slug !== currentCategory.slug) {
      const existingCategory = await this.getBySlug(categoryData.slug);
      if (existingCategory && existingCategory.id !== id) {
        throw new Error(`Category with slug '${categoryData.slug}' already exists`);
      }
    }

    await updateDoc(docRef, categoryData);
    
    // Get the updated document
    return { ...currentCategory, ...categoryData } as BlogCategory;
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(firestore, CATEGORY_COLLECTION, id);
    await deleteDoc(docRef);
  },

  async getById(id: string): Promise<BlogCategory | null> {
    const docRef = doc(firestore, CATEGORY_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as BlogCategory;
  },

  async incrementPostCount(id: string): Promise<void> {
    const docRef = doc(firestore, CATEGORY_COLLECTION, id);
    await updateDoc(docRef, {
      postCount: increment(1)
    });
  },

  async decrementPostCount(id: string): Promise<void> {
    const docRef = doc(firestore, CATEGORY_COLLECTION, id);
    
    // Get current count to avoid negative values
    const category = await this.getById(id);
    if (category && category.postCount > 0) {
      await updateDoc(docRef, {
        postCount: increment(-1)
      });
    }
  }
};

// Helper functions
function increment(amount: number) {
  return {
    __op: 'increment',
    __amount: amount
  };
} 