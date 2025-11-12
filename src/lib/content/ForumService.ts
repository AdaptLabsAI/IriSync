import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  increment,
  addDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { 
  ForumCategory, 
  ForumPost, 
  ForumComment,
  ForumPostStatus,
  CommentStatus,
  CreateForumPostInput,
  CreateForumCommentInput,
  UpdateForumPostInput,
  UpdateForumCommentInput,
  ForumPostFilter
} from './models/post';
import { v4 as uuidv4 } from 'uuid';
import { generateSlug } from '../utils/slug';
import { logger } from '../logging/logger';
import { UserRole } from '../models/User';

// Collection names
const CATEGORIES_COLLECTION = 'forumCategories';
const POSTS_COLLECTION = 'forumPosts';
const COMMENTS_COLLECTION = 'forumComments';

/**
 * Helper to check if user is admin
 */
async function checkUserIsAdmin(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    const role = userData?.role;
    
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  } catch (error) {
    logger.error(`Error checking if user is admin: ${userId}`, error);
    return false;
  }
}

/**
 * Forum service for managing forum posts, comments, and categories
 */
class ForumService {
  /**
   * Get all forum categories
   * @returns List of categories
   */
  async getAllCategories(): Promise<ForumCategory[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(firestore, CATEGORIES_COLLECTION),
          where('isActive', '==', true),
          orderBy('sortOrder', 'asc')
        )
      );
      
      return querySnapshot.docs.map(doc => doc.data() as ForumCategory);
    } catch (error) {
      logger.error('Failed to get forum categories', error);
      throw error;
    }
  }
  
  /**
   * Get category by ID
   * @param categoryId Category ID
   * @returns Category or null if not found
   */
  async getCategoryById(categoryId: string): Promise<ForumCategory | null> {
    try {
      const docRef = doc(firestore, CATEGORIES_COLLECTION, categoryId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return docSnap.data() as ForumCategory;
    } catch (error) {
      logger.error(`Failed to get forum category: ${categoryId}`, error);
      throw error;
    }
  }
  
  /**
   * Create a new category (admin operation)
   * @param name Category name
   * @param description Category description
   * @param options Additional options
   * @returns Created category
   */
  async createCategory(
    name: string,
    description: string,
    userId: string,
    options: {
      iconName?: string;
      color?: string;
      sortOrder?: number;
    } = {}
  ): Promise<ForumCategory> {
    try {
      const categoryId = uuidv4();
      const slug = generateSlug(name);
      
      // Check if a category with this slug already exists
      const existingCategory = await this.getCategoryBySlug(slug);
      if (existingCategory) {
        throw new Error(`A category with the slug "${slug}" already exists`);
      }
      
      const timestamp = Timestamp.now();
      
      const category: ForumCategory = {
        id: categoryId,
        name,
        description,
        iconName: options.iconName,
        color: options.color,
        slug,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
        postCount: 0,
        isActive: true,
        sortOrder: options.sortOrder || 0
      };
      
      await setDoc(doc(firestore, CATEGORIES_COLLECTION, categoryId), category);
      
      return category;
    } catch (error) {
      logger.error('Failed to create forum category', error);
      throw error;
    }
  }
  
  /**
   * Get category by slug
   * @param slug Category slug
   * @returns Category or null if not found
   */
  async getCategoryBySlug(slug: string): Promise<ForumCategory | null> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(firestore, CATEGORIES_COLLECTION),
          where('slug', '==', slug),
          where('isActive', '==', true),
          limit(1)
        )
      );
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return querySnapshot.docs[0].data() as ForumCategory;
    } catch (error) {
      logger.error(`Failed to get forum category by slug: ${slug}`, error);
      throw error;
    }
  }
  
  /**
   * Update a category (admin operation)
   * @param categoryId Category ID
   * @param updates Updates to apply
   * @returns Updated category
   */
  async updateCategory(
    categoryId: string,
    updates: Partial<Omit<ForumCategory, 'id' | 'createdAt' | 'createdBy' | 'postCount'>>
  ): Promise<ForumCategory | null> {
    try {
      const category = await this.getCategoryById(categoryId);
      if (!category) {
        return null;
      }
      
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      // If name is updated, update the slug
      if (updates.name) {
        const newSlug = generateSlug(updates.name);
        
        // Check if a different category with this slug already exists
        const existingCategory = await this.getCategoryBySlug(newSlug);
        if (existingCategory && existingCategory.id !== categoryId) {
          throw new Error(`A category with the slug "${newSlug}" already exists`);
        }
        
        updateData.slug = newSlug;
      }
      
      await updateDoc(doc(firestore, CATEGORIES_COLLECTION, categoryId), updateData);
      
      return {
        ...category,
        ...updateData
      };
    } catch (error) {
      logger.error(`Failed to update forum category: ${categoryId}`, error);
      throw error;
    }
  }
  
  /**
   * Delete a category (admin operation)
   * @param categoryId Category ID
   * @returns Success status
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    try {
      // Instead of actually deleting, mark as inactive
      await updateDoc(doc(firestore, CATEGORIES_COLLECTION, categoryId), {
        isActive: false,
        updatedAt: Timestamp.now()
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete forum category: ${categoryId}`, error);
      throw error;
    }
  }
  
  /**
   * Create a new forum post
   * @param input Post creation input
   * @param userId User ID of the author
   * @param userName User name of the author
   * @param userAvatar User avatar URL (optional)
   * @returns Created post
   */
  async createPost(
    input: CreateForumPostInput,
    userId: string,
    userName: string,
    userAvatar?: string
  ): Promise<ForumPost> {
    try {
      // Validate the category exists
      const category = await this.getCategoryById(input.categoryId);
      if (!category) {
        throw new Error(`Category not found: ${input.categoryId}`);
      }
      
      const postId = uuidv4();
      const timestamp = Timestamp.now();
      const slug = generateSlug(input.title);
      
      const post: ForumPost = {
        id: postId,
        title: input.title,
        content: input.content,
        authorId: userId,
        authorName: userName,
        authorAvatar: userAvatar,
        categoryId: input.categoryId,
        tags: input.tags || [],
        status: ForumPostStatus.ACTIVE,
        isPinned: input.isPinned || false,
        isAnnouncement: input.isAnnouncement || false,
        isSolved: false,
        commentCount: 0,
        viewCount: 0,
        lastCommentAt: null,
        lastCommentBy: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        slug
      };
      
      // Save the post
      await setDoc(doc(firestore, POSTS_COLLECTION, postId), post);
      
      // Increment post count for the category
      await updateDoc(doc(firestore, CATEGORIES_COLLECTION, input.categoryId), {
        postCount: increment(1),
        updatedAt: timestamp
      });
      
      return post;
    } catch (error) {
      logger.error('Failed to create forum post', error);
      throw error;
    }
  }
  
  /**
   * Get post by ID
   * @param postId Post ID
   * @returns Post or null if not found
   */
  async getPostById(postId: string): Promise<ForumPost | null> {
    try {
      const docRef = doc(firestore, POSTS_COLLECTION, postId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return docSnap.data() as ForumPost;
    } catch (error) {
      logger.error(`Failed to get forum post: ${postId}`, error);
      throw error;
    }
  }
  
  /**
   * Get post by slug
   * @param slug Post slug
   * @returns Post or null if not found
   */
  async getPostBySlug(slug: string): Promise<ForumPost | null> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(firestore, POSTS_COLLECTION),
          where('slug', '==', slug),
          where('status', '==', ForumPostStatus.ACTIVE),
          limit(1)
        )
      );
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return querySnapshot.docs[0].data() as ForumPost;
    } catch (error) {
      logger.error(`Failed to get forum post by slug: ${slug}`, error);
      throw error;
    }
  }
  
  /**
   * Update a post
   * @param postId Post ID
   * @param updates Updates to apply
   * @param userId User ID making the update (for permission check)
   * @returns Updated post
   */
  async updatePost(
    postId: string,
    updates: UpdateForumPostInput,
    userId: string
  ): Promise<ForumPost | null> {
    try {
      const post = await this.getPostById(postId);
      if (!post) {
        return null;
      }
      
      // Check if the user is the author or an admin
      const isUserAdmin = await checkUserIsAdmin(userId);
      if (post.authorId !== userId && !isUserAdmin) {
        throw new Error('Unauthorized to update this post');
      }
      
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      // If title is updated, update the slug
      if (updates.title) {
        const newSlug = generateSlug(updates.title);
        updateData.slug = newSlug;
      }
      
      // If category is changed, update category post counts
      if (updates.categoryId && updates.categoryId !== post.categoryId) {
        // Validate the new category exists
        const newCategory = await this.getCategoryById(updates.categoryId);
        if (!newCategory) {
          throw new Error(`Category not found: ${updates.categoryId}`);
        }
        
        // Decrement post count in old category
        await updateDoc(doc(firestore, CATEGORIES_COLLECTION, post.categoryId), {
          postCount: increment(-1),
          updatedAt: Timestamp.now()
        });
        
        // Increment post count in new category
        await updateDoc(doc(firestore, CATEGORIES_COLLECTION, updates.categoryId), {
          postCount: increment(1),
          updatedAt: Timestamp.now()
        });
      }
      
      await updateDoc(doc(firestore, POSTS_COLLECTION, postId), updateData);
      
      return {
        ...post,
        ...updateData
      };
    } catch (error) {
      logger.error(`Failed to update forum post: ${postId}`, error);
      throw error;
    }
  }
  
  /**
   * Delete a post
   * @param postId Post ID
   * @param userId User ID making the delete request (for permission check)
   * @returns Success status
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const post = await this.getPostById(postId);
      if (!post) {
        return false;
      }
      
      // Check if the user is the author or an admin
      const isUserAdmin = await checkUserIsAdmin(userId);
      if (post.authorId !== userId && !isUserAdmin) {
        throw new Error('Unauthorized to delete this post');
      }
      
      // Instead of actually deleting, mark as deleted
      await updateDoc(doc(firestore, POSTS_COLLECTION, postId), {
        status: ForumPostStatus.DELETED,
        updatedAt: Timestamp.now()
      });
      
      // Decrement post count in the category
      await updateDoc(doc(firestore, CATEGORIES_COLLECTION, post.categoryId), {
        postCount: increment(-1),
        updatedAt: Timestamp.now()
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete forum post: ${postId}`, error);
      throw error;
    }
  }
  
  /**
   * Add a view to a post
   * @param postId Post ID
   * @returns Updated view count
   */
  async incrementViewCount(postId: string): Promise<number> {
    try {
      const postRef = doc(firestore, POSTS_COLLECTION, postId);
      await updateDoc(postRef, {
        viewCount: increment(1)
      });
      
      // Get the updated post
      const updatedPost = await this.getPostById(postId);
      return updatedPost?.viewCount || 0;
    } catch (error) {
      logger.error(`Failed to increment view count for post: ${postId}`, error);
      throw error;
    }
  }
  
  /**
   * Get posts with filters
   * @param filter Post filter criteria
   * @returns Filtered posts and total count
   */
  async getPosts(filter: ForumPostFilter = {}): Promise<{ posts: ForumPost[]; total: number }> {
    try {
      let q = query(collection(firestore, POSTS_COLLECTION));
      
      // Add status filter (default to active posts)
      q = query(q, where('status', '==', filter.status || ForumPostStatus.ACTIVE));
      
      // Add other filters
      if (filter.categoryId) {
        q = query(q, where('categoryId', '==', filter.categoryId));
      }
      
      if (filter.authorId) {
        q = query(q, where('authorId', '==', filter.authorId));
      }
      
      if (filter.isPinned !== undefined) {
        q = query(q, where('isPinned', '==', filter.isPinned));
      }
      
      if (filter.isAnnouncement !== undefined) {
        q = query(q, where('isAnnouncement', '==', filter.isAnnouncement));
      }
      
      if (filter.isSolved !== undefined) {
        q = query(q, where('isSolved', '==', filter.isSolved));
      }
      
      // Add sorting
      const sortField = filter.sortBy || 'createdAt';
      const sortDirection = filter.sortOrder === 'asc' ? 'asc' : 'desc';
      q = query(q, orderBy(sortField, sortDirection));
      
      // Add pagination
      if (filter.limit) {
        q = query(q, limit(filter.limit));
      }
      
      // Execute query
      const querySnapshot = await getDocs(q);
      
      // Process results
      let posts = querySnapshot.docs.map(doc => doc.data() as ForumPost);
      
      // Apply text search filter (client-side)
      if (filter.searchQuery) {
        const searchLower = filter.searchQuery.toLowerCase();
        posts = posts.filter(post => 
          post.title.toLowerCase().includes(searchLower) || 
          post.content.toLowerCase().includes(searchLower) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply tag filter (client-side)
      if (filter.tags && filter.tags.length > 0) {
        posts = posts.filter(post => 
          filter.tags!.some(tag => post.tags.includes(tag))
        );
      }
      
      return {
        posts,
        total: posts.length
      };
    } catch (error) {
      logger.error('Failed to get forum posts', error);
      throw error;
    }
  }
  
  /**
   * Get trending posts (most commented in last 7 days)
   * @param categoryId Optional category filter
   * @param limitCount Number of posts to return
   * @returns Trending posts
   */
  async getTrendingPosts(categoryId?: string, limitCount = 10): Promise<ForumPost[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      let q = query(
        collection(firestore, POSTS_COLLECTION),
        where('status', '==', ForumPostStatus.ACTIVE),
        where('lastCommentAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('lastCommentAt', 'desc'),
        orderBy('commentCount', 'desc'),
        limit(20)
      );
      
      if (categoryId) {
        q = query(
          collection(firestore, POSTS_COLLECTION),
          where('status', '==', ForumPostStatus.ACTIVE),
          where('categoryId', '==', categoryId),
          where('lastCommentAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
          orderBy('lastCommentAt', 'desc'),
          orderBy('commentCount', 'desc'),
          limit(20)
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      // Sort by comment count
      const posts = querySnapshot.docs
        .map(doc => doc.data() as ForumPost)
        .sort((a, b) => b.commentCount - a.commentCount)
        .slice(0, limitCount);
      
      return posts;
    } catch (error) {
      logger.error('Failed to get trending forum posts', error);
      throw error;
    }
  }
  
  /**
   * Add a comment to a post
   * @param input Comment input
   * @param userId User ID of the commenter
   * @param userName User name of the commenter
   * @param userAvatar User avatar URL (optional)
   * @returns Created comment
   */
  async createComment(
    input: CreateForumCommentInput,
    userId: string,
    userName: string,
    userAvatar?: string
  ): Promise<ForumComment> {
    try {
      // Verify the post exists
      const post = await this.getPostById(input.postId);
      if (!post) {
        throw new Error(`Post not found: ${input.postId}`);
      }
      
      // Verify parent comment exists if provided
      if (input.parentId) {
        const parentComment = await this.getCommentById(input.parentId);
        if (!parentComment) {
          throw new Error(`Parent comment not found: ${input.parentId}`);
        }
      }
      
      const commentId = uuidv4();
      const timestamp = Timestamp.now();
      
      const comment: ForumComment = {
        id: commentId,
        postId: input.postId,
        content: input.content,
        authorId: userId,
        authorName: userName,
        authorAvatar: userAvatar,
        parentId: input.parentId,
        isAnswer: false,
        status: CommentStatus.ACTIVE,
        likeCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Save the comment
      await setDoc(doc(firestore, COMMENTS_COLLECTION, commentId), comment);
      
      // Update post with new comment count and last comment info
      await updateDoc(doc(firestore, POSTS_COLLECTION, input.postId), {
        commentCount: increment(1),
        lastCommentAt: timestamp,
        lastCommentBy: userName,
        updatedAt: timestamp
      });
      
      return comment;
    } catch (error) {
      logger.error('Failed to create forum comment', error);
      throw error;
    }
  }
  
  /**
   * Get comment by ID
   * @param commentId Comment ID
   * @returns Comment or null if not found
   */
  async getCommentById(commentId: string): Promise<ForumComment | null> {
    try {
      const docRef = doc(firestore, COMMENTS_COLLECTION, commentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return docSnap.data() as ForumComment;
    } catch (error) {
      logger.error(`Failed to get forum comment: ${commentId}`, error);
      throw error;
    }
  }
  
  /**
   * Get comments for a post
   * @param postId Post ID
   * @returns Comments for the post
   */
  async getCommentsByPostId(postId: string): Promise<ForumComment[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(firestore, COMMENTS_COLLECTION),
          where('postId', '==', postId),
          where('status', '==', CommentStatus.ACTIVE),
          orderBy('createdAt', 'asc')
        )
      );
      
      return querySnapshot.docs.map(doc => doc.data() as ForumComment);
    } catch (error) {
      logger.error(`Failed to get comments for post: ${postId}`, error);
      throw error;
    }
  }
  
  /**
   * Update a comment
   * @param commentId Comment ID
   * @param updates Updates to apply
   * @param userId User ID making the update (for permission check)
   * @returns Updated comment
   */
  async updateComment(
    commentId: string,
    updates: UpdateForumCommentInput,
    userId: string
  ): Promise<ForumComment | null> {
    try {
      const comment = await this.getCommentById(commentId);
      if (!comment) {
        return null;
      }
      
      // Check if the user is the author or an admin
      const isUserAdmin = await checkUserIsAdmin(userId);
      if (comment.authorId !== userId && !isUserAdmin) {
        throw new Error('Unauthorized to update this comment');
      }
      
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(doc(firestore, COMMENTS_COLLECTION, commentId), updateData);
      
      // If this comment is marked as the answer, update the post
      if (updates.isAnswer === true) {
        await updateDoc(doc(firestore, POSTS_COLLECTION, comment.postId), {
          isSolved: true,
          updatedAt: Timestamp.now()
        });
      }
      
      return {
        ...comment,
        ...updateData
      };
    } catch (error) {
      logger.error(`Failed to update forum comment: ${commentId}`, error);
      throw error;
    }
  }
  
  /**
   * Delete a comment
   * @param commentId Comment ID
   * @param userId User ID making the delete request (for permission check)
   * @returns Success status
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    try {
      const comment = await this.getCommentById(commentId);
      if (!comment) {
        return false;
      }
      
      // Check if the user is the author or an admin
      const isUserAdmin = await checkUserIsAdmin(userId);
      if (comment.authorId !== userId && !isUserAdmin) {
        throw new Error('Unauthorized to delete this comment');
      }
      
      // Instead of actually deleting, mark as deleted
      await updateDoc(doc(firestore, COMMENTS_COLLECTION, commentId), {
        status: CommentStatus.DELETED,
        updatedAt: Timestamp.now()
      });
      
      // Update post comment count
      await updateDoc(doc(firestore, POSTS_COLLECTION, comment.postId), {
        commentCount: increment(-1),
        updatedAt: Timestamp.now()
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete forum comment: ${commentId}`, error);
      throw error;
    }
  }
}

export default new ForumService(); 