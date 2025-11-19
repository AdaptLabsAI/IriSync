'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { collection, doc, query, getDocs, addDoc, updateDoc, deleteDoc, where, orderBy, writeBatch, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { firestore, auth } from '@/lib/core/firebase/client';
import { logger } from '@/lib/core/logging/logger';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  category?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: number;
  userId: string;
}

export type SortOption = 'createdAt' | 'dueDate' | 'priority' | 'alphabetical';

interface TodoContextType {
  todos: TodoItem[];
  filteredTodos: TodoItem[];
  categories: string[];
  filter: {
    status: 'all' | 'active' | 'completed';
    category: string | null;
    search: string;
  };
  sort: SortOption;
  loading: boolean;
  addTodo: (text: string, category?: string, dueDate?: string, priority?: 'low' | 'medium' | 'high') => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  updateTodo: (id: string, updates: Partial<TodoItem>) => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  deleteCategory: (category: string) => Promise<void>;
  setFilter: (filter: Partial<TodoContextType['filter']>) => void;
  setSort: (sort: SortOption) => void;
  syncTodos: () => Promise<void>;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const TodoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilterState] = useState<TodoContextType['filter']>({
    status: 'all',
    category: null,
    search: '',
  });
  const [sort, setSortState] = useState<SortOption>('createdAt');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Load todos and categories from Firestore on mount
  const fetchTodosAndCategories = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to access tasks');
      }
      
      // Query todos for current user
      const todosRef = collection(firestore, 'todos');
      const todosQuery = query(
        todosRef,
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const todosSnapshot = await getDocs(todosQuery);
      const todosList: TodoItem[] = todosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<TodoItem, 'id'>
      }));
      
      // Query categories for current user
      const categoriesRef = collection(firestore, 'todoCategories');
      const categoriesQuery = query(
        categoriesRef,
        where('userId', '==', currentUser.uid)
      );
      
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesList: string[] = categoriesSnapshot.docs.map(doc => doc.data().name);
      
      setTodos(todosList);
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error fetching data:', error);
      logger.error('Error', { type: 'todo_fetch_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast.error({
        title: "Error loading data",
        description: `Failed to load tasks: ${error instanceof Error ? error.message : 'Unknown error'}. Collection: todos`
      });
      
      // Fallback to localStorage if available
      const storedTodos = localStorage.getItem('todos');
      const storedCategories = localStorage.getItem('todoCategories');
      
      if (storedTodos) {
        try {
          setTodos(JSON.parse(storedTodos));
        } catch (e) {
          console.error('Failed to parse stored todos:', e);
        }
      }
      
      if (storedCategories) {
        try {
          setCategories(JSON.parse(storedCategories));
        } catch (e) {
          console.error('Failed to parse stored categories:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodosAndCategories();
  }, [toast]);

  // Filter and sort todos
  const filteredTodos = React.useMemo(() => {
    // First apply filters
    let result = todos;
    
    // Filter by status
    if (filter.status === 'active') {
      result = result.filter(todo => !todo.completed);
    } else if (filter.status === 'completed') {
      result = result.filter(todo => todo.completed);
    }
    
    // Filter by category
    if (filter.category) {
      result = result.filter(todo => todo.category === filter.category);
    }
    
    // Filter by search term
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(todo => 
        todo.text.toLowerCase().includes(searchLower)
      );
    }
    
    // Then apply sorting
    return result.sort((a, b) => {
      switch (sort) {
        case 'dueDate':
          // Handle null or undefined due dates
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          
        case 'priority':
          const priorityValues = { high: 0, medium: 1, low: 2 };
          return (priorityValues[a.priority || 'medium'] || 1) - (priorityValues[b.priority || 'medium'] || 1);
          
        case 'alphabetical':
          return a.text.localeCompare(b.text);
          
        case 'createdAt':
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [todos, filter, sort]);

  const addTodo = async (text: string, category?: string, dueDate?: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to create tasks');
      }
      
      const todoData = {
        text,
        completed: false,
        category,
        dueDate,
        priority,
        createdAt: Date.now(),
        userId: currentUser.uid,
        updatedAt: serverTimestamp()
      };
      
      const todosRef = collection(firestore, 'todos');
      const docRef = await addDoc(todosRef, todoData);
      
      const newTodo: TodoItem = {
        ...todoData,
        id: docRef.id
      };
      
      setTodos(prevTodos => [...prevTodos, newTodo]);
      
      // Also save to localStorage as backup
      localStorage.setItem('todos', JSON.stringify([...todos, newTodo]));
    } catch (error) {
      console.error('Error adding todo:', error);
      logger.error('Error', { type: 'todo_add_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast.error({
        title: "Error adding task",
        description: `${error instanceof Error ? error.message : "Unknown error"}. Collection: todos`
      });
      
      // Fallback to client-side if Firestore fails
      const currentUser = auth.currentUser;
      const newTodo: TodoItem = {
        id: Math.random().toString(36).substring(2, 9),
        text,
        completed: false,
        category,
        dueDate,
        priority,
        createdAt: Date.now(),
        userId: currentUser?.uid || 'offline'
      };
      
      setTodos(prevTodos => [...prevTodos, newTodo]);
      // Also save to localStorage as backup
      localStorage.setItem('todos', JSON.stringify([...todos, newTodo]));
    }
  };

  const toggleTodo = async (id: string) => {
    try {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;
      
      const todoRef = doc(firestore, 'todos', id);
      await updateDoc(todoRef, {
        completed: !todo.completed,
        updatedAt: serverTimestamp()
      });
      
      setTodos(
        todos.map(t => 
          t.id === id ? { ...t, completed: !todo.completed } : t
        )
      );
      
      // Also save to localStorage as backup
      localStorage.setItem('todos', JSON.stringify(
        todos.map(t => 
          t.id === id ? { ...t, completed: !todo.completed } : t
        )
      ));
    } catch (error) {
      console.error('Error toggling todo:', error);
      logger.error('Error', { type: 'todo_toggle_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id
      });
      
      toast.error({
        title: "Error updating task",
        description: `${error instanceof Error ? error.message : "Unknown error"}. Collection: todos, Document: ${id}`
      });
      
      // Still update UI to maintain responsiveness but warn user
      setTodos(
        todos.map(todo => 
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      );
      
      // Also save to localStorage as backup
      localStorage.setItem('todos', JSON.stringify(
        todos.map(todo => 
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      ));
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const todoRef = doc(firestore, 'todos', id);
      await deleteDoc(todoRef);
      
      setTodos(todos.filter(todo => todo.id !== id));
      
      // Also update localStorage
      localStorage.setItem('todos', JSON.stringify(
        todos.filter(todo => todo.id !== id)
      ));
    } catch (error) {
      console.error('Error deleting todo:', error);
      logger.error('Error', { type: 'todo_delete_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id
      });
      
      toast.error({
        title: "Error deleting task",
        description: `${error instanceof Error ? error.message : "Unknown error"}. Collection: todos, Document: ${id}`
      });
    }
  };

  const clearCompleted = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to clear tasks');
      }
      
      const completedTodos = todos.filter(todo => todo.completed);
      if (completedTodos.length === 0) return;
      
      const batch = writeBatch(firestore);
      
      completedTodos.forEach(todo => {
        const todoRef = doc(firestore, 'todos', todo.id);
        batch.delete(todoRef);
      });
      
      await batch.commit();
      
      setTodos(todos.filter(todo => !todo.completed));
      
      // Also update localStorage
      localStorage.setItem('todos', JSON.stringify(
        todos.filter(todo => !todo.completed)
      ));
      
      toast.success({
        title: "Tasks cleared",
        description: `Successfully cleared ${completedTodos.length} completed tasks.`
      });
    } catch (error) {
      console.error('Error clearing completed todos:', error);
      logger.error('Error', { type: 'todo_clear_completed_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast.error({
        title: "Error clearing tasks",
        description: `${error instanceof Error ? error.message : "Unknown error"}. Collection: todos`
      });
    }
  };

  const updateTodo = async (id: string, updates: Partial<TodoItem>) => {
    try {
      const todoRef = doc(firestore, 'todos', id);
      
      const updatedFields = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(todoRef, updatedFields);
      
      setTodos(
        todos.map(todo => 
          todo.id === id ? { ...todo, ...updates } : todo
        )
      );
      
      // Also update localStorage
      localStorage.setItem('todos', JSON.stringify(
        todos.map(todo => 
          todo.id === id ? { ...todo, ...updates } : todo
        )
      ));
    } catch (error) {
      console.error('Error updating todo:', error);
      logger.error('Error', { type: 'todo_update_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        todoId: id
      });
      
      toast.error({
        title: "Error updating task",
        description: `${error instanceof Error ? error.message : "Unknown error"}. Collection: todos, Document: ${id}`
      });
      
      throw error;
    }
  };

  const addCategory = async (category: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to create categories');
      }
      
      if (categories.includes(category)) {
        // Category already exists, just return
        return;
      }
      
      const categoriesRef = collection(firestore, 'todoCategories');
      await addDoc(categoriesRef, {
        name: category,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      setCategories([...categories, category]);
      
      // Also update localStorage
      localStorage.setItem('todoCategories', JSON.stringify([...categories, category]));
    } catch (error) {
      console.error('Error adding category:', error);
      logger.error('Error', { type: 'todo_category_add_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        category
      });
      
      toast.error({
        title: "Error adding category",
        description: `${error instanceof Error ? error.message : "Unknown error"}. Collection: todoCategories`
      });
      
      throw error;
    }
  };

  const deleteCategory = async (category: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to delete categories');
      }
      
      // First, find the category document
      const categoriesRef = collection(firestore, 'todoCategories');
      const q = query(
        categoriesRef,
        where('userId', '==', currentUser.uid),
        where('name', '==', category)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`Category not found: ${category}`);
      }
      
      const batch = writeBatch(firestore);
      
      // Delete the category document
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Update all todos with this category to have no category
      const todosRef = collection(firestore, 'todos');
      const todosQuery = query(
        todosRef,
        where('userId', '==', currentUser.uid),
        where('category', '==', category)
      );
      
      const todosSnapshot = await getDocs(todosQuery);
      
      todosSnapshot.forEach(doc => {
        batch.update(doc.ref, { category: null });
      });
      
      await batch.commit();
      
      // Update local state
      setCategories(categories.filter(c => c !== category));
      setTodos(
        todos.map(todo => 
          todo.category === category ? { ...todo, category: undefined } : todo
        )
      );
      
      // Also update localStorage
      localStorage.setItem('todoCategories', JSON.stringify(
        categories.filter(c => c !== category)
      ));
      localStorage.setItem('todos', JSON.stringify(
        todos.map(todo => 
          todo.category === category ? { ...todo, category: undefined } : todo
        )
      ));
      
      toast.success({
        title: "Category deleted",
        description: `Successfully deleted category "${category}".`
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      logger.error('Error', { type: 'todo_category_delete_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        category
      });
      
      toast.error({
        title: "Error deleting category",
        description: `${error instanceof Error ? error.message : "Unknown error"}. Collection: todoCategories`
      });
      
      throw error;
    }
  };

  const setFilter = (newFilter: Partial<TodoContextType['filter']>) => {
    setFilterState({ ...filter, ...newFilter });
  };

  const setSort = (newSort: SortOption) => {
    setSortState(newSort);
  };
  
  // Function to force sync with Firestore
  const syncTodos = async () => {
    try {
      await fetchTodosAndCategories();
      toast.success({
        title: "Sync completed",
        description: "Successfully synced tasks with the server."
      });
    } catch (error) {
      console.error('Error syncing todos:', error);
      toast.error({
        title: "Sync failed",
        description: `${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
  };

  return (
    <TodoContext.Provider
      value={{
        todos,
        filteredTodos,
        categories,
        filter,
        sort,
        loading,
        addTodo,
        toggleTodo,
        deleteTodo,
        clearCompleted,
        updateTodo,
        addCategory,
        deleteCategory,
        setFilter,
        setSort,
        syncTodos
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};

export const useTodo = (): TodoContextType => {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
}; 