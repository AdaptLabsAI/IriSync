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
  limit as firestoreLimit,
  startAfter,
  Timestamp,
  DocumentReference,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseFirestore, firestore } from '../core/firebase';
import {
  JobListing,
  JobApplication,
  JobStatus,
  JobType
} from './models';
import { generateSlug } from '../utils/slug';

// Collection references
const JOB_COLLECTION = 'jobListings';
const APPLICATION_COLLECTION = 'jobApplications';
const DEPARTMENT_COLLECTION = 'jobDepartments';

// Job Listing Repository
export const JobRepository = {
  async getAll(
    status: JobStatus | JobStatus[] = JobStatus.PUBLISHED, 
    page = 1, 
    pageSize = 10, 
    lastDoc: any = null
  ): Promise<{ jobs: JobListing[], lastDoc: any, hasMore: boolean }> {
    let jobQuery;
    
    if (Array.isArray(status)) {
      // If multiple statuses are provided, we can't use where clause with orderBy
      // We'll filter after fetching
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

      jobQuery = query(
        collection(firestore, JOB_COLLECTION),
        orderBy('publishedAt', 'desc'),
        firestoreLimit(pageSize * 3) // Fetch more to account for filtering
      );
    } else {
      jobQuery = query(
        collection(firestore, JOB_COLLECTION),
        where('status', '==', status),
        orderBy('publishedAt', 'desc'),
        firestoreLimit(pageSize)
      );
    }

    if (lastDoc) {
      jobQuery = query(jobQuery, startAfter(lastDoc));
    }

    const snapshot = await getDocs(jobQuery);
    let jobs: JobListing[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobListing));
    
    // Filter by status array if provided
    if (Array.isArray(status)) {
      jobs = jobs.filter(job => status.includes(job.status as any));
      jobs = jobs.slice(0, pageSize); // Limit to requested page size
    }
    
    return {
      jobs,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === (Array.isArray(status) ? pageSize * 3 : pageSize)
    };
  },

  async getFeatured(limit = 3): Promise<JobListing[]> {
    const featuredQuery = query(
      collection(firestore, JOB_COLLECTION),
      where('status', '==', JobStatus.PUBLISHED),
      where('featured', '==', true),
      orderBy('publishedAt', 'desc'),
      firestoreLimit(limit)
    );

    const snapshot = await getDocs(featuredQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobListing));
  },

  async getByDepartment(
    department: string, 
    page = 1, 
    pageSize = 10, 
    lastDoc: any = null
  ): Promise<{ jobs: JobListing[], lastDoc: any, hasMore: boolean }> {
    let deptQuery = query(
      collection(firestore, JOB_COLLECTION),
      where('department', '==', department),
      where('status', '==', JobStatus.PUBLISHED),
      orderBy('publishedAt', 'desc'),
      firestoreLimit(pageSize)
    );

    if (lastDoc) {
      deptQuery = query(deptQuery, startAfter(lastDoc));
    }

    const snapshot = await getDocs(deptQuery);
    const jobs: JobListing[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobListing));
    
    return {
      jobs,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === pageSize
    };
  },

  async getByType(
    jobType: JobType,
    page = 1, 
    pageSize = 10, 
    lastDoc: any = null
  ): Promise<{ jobs: JobListing[], lastDoc: any, hasMore: boolean }> {
    let typeQuery = query(
      collection(firestore, JOB_COLLECTION),
      where('jobType', '==', jobType),
      where('status', '==', JobStatus.PUBLISHED),
      orderBy('publishedAt', 'desc'),
      firestoreLimit(pageSize)
    );

    if (lastDoc) {
      typeQuery = query(typeQuery, startAfter(lastDoc));
    }

    const snapshot = await getDocs(typeQuery);
    const jobs: JobListing[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobListing));
    
    return {
      jobs,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === pageSize
    };
  },

  async getBySlug(slug: string): Promise<JobListing | null> {
    const jobQuery = query(
      collection(firestore, JOB_COLLECTION),
      where('slug', '==', slug),
      where('status', '==', JobStatus.PUBLISHED),
      firestoreLimit(1)
    );

    const snapshot = await getDocs(jobQuery);
    if (snapshot.docs.length === 0) return null;
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as JobListing;
  },

  async getById(id: string): Promise<JobListing | null> {
    const docRef = doc(firestore, JOB_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as JobListing;
  },

  async create(jobData: Omit<JobListing, 'id' | 'createdAt' | 'updatedAt' | 'slug'>): Promise<JobListing> {
    // Generate a unique slug from the title
    const baseSlug = generateSlug(jobData.title);
    let slug = baseSlug;
    let iteration = 1;
    
    // Check if slug already exists, if so, append a number
    while (await this.slugExists(slug)) {
      slug = `${baseSlug}-${iteration}`;
      iteration++;
    }

    const timestamp = Timestamp.now();
    const newJob: Omit<JobListing, 'id'> = {
      ...jobData,
      slug,
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: jobData.status === JobStatus.PUBLISHED ? timestamp : null
    };

    const docRef = await addDoc(collection(firestore, JOB_COLLECTION), newJob);
    return { id: docRef.id, ...newJob } as JobListing;
  },

  async update(id: string, jobData: Partial<JobListing>): Promise<JobListing> {
    const docRef = doc(firestore, JOB_COLLECTION, id);
    const currentJob = await this.getById(id);
    
    if (!currentJob) {
      throw new Error(`Job with ID ${id} not found`);
    }

    // If title is changing, check if we need to update the slug
    if (jobData.title && jobData.title !== currentJob.title) {
      const baseSlug = generateSlug(jobData.title);
      let slug = baseSlug;
      let iteration = 1;
      
      // Check if slug already exists, if so, append a number
      while (await this.slugExists(slug, id)) {
        slug = `${baseSlug}-${iteration}`;
        iteration++;
      }
      
      jobData.slug = slug;
    }

    // If status is changing from draft to published, set publishedAt
    if (
      jobData.status === JobStatus.PUBLISHED && 
      currentJob.status !== JobStatus.PUBLISHED
    ) {
      jobData.publishedAt = Timestamp.now();
    }

    const updates = {
      ...jobData,
      updatedAt: Timestamp.now()
    };

    await updateDoc(docRef, updates);
    
    // Get the updated document
    return { ...currentJob, ...updates } as JobListing;
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(firestore, JOB_COLLECTION, id);
    await deleteDoc(docRef);
    
    // Do not delete job applications, just orphan them
    // This is intentional to preserve application data
  },

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    let slugQuery = query(
      collection(firestore, JOB_COLLECTION),
      where('slug', '==', slug)
    );
    
    const snapshot = await getDocs(slugQuery);
    
    if (excludeId) {
      // If we're checking for an update, exclude the current job
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !snapshot.empty;
  },

  async getDepartments(): Promise<string[]> {
    const deptQuery = query(
      collection(firestore, JOB_COLLECTION),
      where('status', '==', JobStatus.PUBLISHED)
    );
    
    const snapshot = await getDocs(deptQuery);
    const departments = new Set<string>();
    
    snapshot.docs.forEach(doc => {
      const job = doc.data();
      if (job.department) {
        departments.add(job.department);
      }
    });
    
    return Array.from(departments).sort();
  },

  async getJobTypes(): Promise<JobType[]> {
    const typeQuery = query(
      collection(firestore, JOB_COLLECTION),
      where('status', '==', JobStatus.PUBLISHED)
    );
    
    const snapshot = await getDocs(typeQuery);
    const types = new Set<JobType>();
    
    snapshot.docs.forEach(doc => {
      const job = doc.data();
      if (job.jobType) {
        types.add(job.jobType as JobType);
      }
    });
    
    return Array.from(types).sort();
  },

  async markAsFilled(id: string): Promise<JobListing> {
    return this.update(id, { 
      status: JobStatus.FILLED,
      updatedAt: Timestamp.now()
    });
  }
};

// Job Application Repository
export const JobApplicationRepository = {
  async getByJobId(
    jobId: string,
    page = 1, 
    pageSize = 20, 
    lastDoc: any = null
  ): Promise<{ applications: JobApplication[], lastDoc: any, hasMore: boolean }> {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    let appQuery = query(
      collection(firestore, APPLICATION_COLLECTION),
      where('jobId', '==', jobId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageSize)
    );

    if (lastDoc) {
      appQuery = query(appQuery, startAfter(lastDoc));
    }

    const snapshot = await getDocs(appQuery);
    const applications: JobApplication[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication));
    
    return {
      applications,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === pageSize
    };
  },

  async getById(id: string): Promise<JobApplication | null> {
    const docRef = doc(firestore, APPLICATION_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as JobApplication;
  },

  async create(applicationData: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'notes'>): Promise<JobApplication> {
    const timestamp = Timestamp.now();
    const newApplication: Omit<JobApplication, 'id'> = {
      ...applicationData,
      status: 'new',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const docRef = await addDoc(collection(firestore, APPLICATION_COLLECTION), newApplication);
    return { id: docRef.id, ...newApplication } as JobApplication;
  },

  async update(id: string, applicationData: Partial<JobApplication>): Promise<JobApplication> {
    const docRef = doc(firestore, APPLICATION_COLLECTION, id);
    const currentApplication = await this.getById(id);
    
    if (!currentApplication) {
      throw new Error(`Application with ID ${id} not found`);
    }

    const updates = {
      ...applicationData,
      updatedAt: Timestamp.now()
    };

    await updateDoc(docRef, updates);
    
    // Get the updated document
    return { ...currentApplication, ...updates } as JobApplication;
  },

  async updateStatus(id: string, status: JobApplication['status']): Promise<JobApplication> {
    return this.update(id, { status });
  },

  async addNote(id: string, note: string): Promise<JobApplication> {
    const application = await this.getById(id);
    if (!application) {
      throw new Error(`Application with ID ${id} not found`);
    }
    
    const existingNotes = application.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n${note}` : note;
    return this.update(id, { notes: updatedNotes });
  },

  async getByEmail(email: string): Promise<JobApplication[]> {
    const emailQuery = query(
      collection(firestore, APPLICATION_COLLECTION),
      where('email', '==', email),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(emailQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication));
  },

  async getCountForJob(jobId: string): Promise<number> {
    const countQuery = query(
      collection(firestore, APPLICATION_COLLECTION),
      where('jobId', '==', jobId)
    );
    
    const snapshot = await getDocs(countQuery);
    return snapshot.docs.length;
  }
}; 