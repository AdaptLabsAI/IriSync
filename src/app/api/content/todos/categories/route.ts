import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';
import { handleApiError } from '@/lib/features/auth/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    const categoriesRef = collection(firestore, 'todoCategories');
    const userCategoriesQuery = query(categoriesRef, where('userId', '==', userId));
    const snapshot = await getDocs(userCategoriesQuery);
    
    if (snapshot.empty) {
      // Create default categories for new users
      const defaultCategories = ['Work', 'Personal', 'Shopping', 'Other'];
      const categoriesData = {
        categories: defaultCategories,
        userId,
        createdAt: Date.now(),
        updatedAt: serverTimestamp()
      };
      
      // Use user ID as the document ID for easy retrieval
      await setDoc(doc(categoriesRef, userId), categoriesData);
      
      return NextResponse.json({ categories: defaultCategories });
    }
    
    const categoriesData = snapshot.docs[0].data();
    return NextResponse.json({ categories: categoriesData.categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      handleApiError(error, '/api/content/todos/categories', 'fetching categories'),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    const { category } = await request.json();
    
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    const categoriesRef = collection(firestore, 'todoCategories');
    const userCategoriesQuery = query(categoriesRef, where('userId', '==', userId));
    const snapshot = await getDocs(userCategoriesQuery);
    
    if (snapshot.empty) {
      // Create new categories document with the first category
      const categoriesData = {
        categories: [category],
        userId,
        createdAt: Date.now(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(categoriesRef, userId), categoriesData);
      
      return NextResponse.json(
        { message: 'Category added successfully', categories: [category] },
        { status: 201 }
      );
    }
    
    // Update existing categories document
    const docId = snapshot.docs[0].id;
    const categoriesData = snapshot.docs[0].data();
    let categories = categoriesData.categories || [];
    
    if (categories.includes(category)) {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 400 }
      );
    }
    
    categories.push(category);
    
    await setDoc(
      doc(categoriesRef, docId),
      {
        categories,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    
    return NextResponse.json(
      { message: 'Category added successfully', categories },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding category:', error);
    return NextResponse.json(
      handleApiError(error, '/api/content/todos/categories', 'adding category'),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id || session.user.email;
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    const categoriesRef = collection(firestore, 'todoCategories');
    const userCategoriesQuery = query(categoriesRef, where('userId', '==', userId));
    const snapshot = await getDocs(userCategoriesQuery);
    
    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Categories not found' },
        { status: 404 }
      );
    }
    
    const docId = snapshot.docs[0].id;
    const categoriesData = snapshot.docs[0].data();
    let categories = categoriesData.categories || [];
    
    if (!categories.includes(category)) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    categories = categories.filter((c: string) => c !== category);
    
    await setDoc(
      doc(categoriesRef, docId),
      {
        categories,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    
    // Update todos that had this category - set their category to undefined
    const todosRef = collection(firestore, 'todos');
    const todosWithCategoryQuery = query(
      todosRef,
      where('userId', '==', userId),
      where('category', '==', category)
    );
    
    const todosSnapshot = await getDocs(todosWithCategoryQuery);
    
    const updatePromises = todosSnapshot.docs.map(doc => {
      return setDoc(
        doc.ref,
        {
          category: null,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    return NextResponse.json({ 
      message: 'Category deleted successfully', 
      categories,
      todosUpdated: todosSnapshot.size
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      handleApiError(error, '/api/content/todos/categories', 'deleting category'),
      { status: 500 }
    );
  }
} 