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
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../core/firebase';
import { 
  AnalyticsEvent, 
  EventCategory, 
  CustomEventDefinition,
  DailyEventAggregation,
  MonthlyEventAggregation,
  TimePeriod
} from './models/events';
import {
  MetricDefinition,
  MetricValue,
  MetricWithComparison,
  DashboardMetricConfig,
  MetricAlert,
  TrendDirection,
  TrendValuation
} from './models/metrics';
import {
  ReportDefinition,
  ReportInstance,
  ReportStatus,
  ReportSchedule
} from './models/reports';
import {
  Competitor,
  CompetitorMetric,
  CompetitorContent
} from './models/competitors';
import { calculateMetric, getMetricWithComparison } from './reporting/metrics';
import { validateEvent } from './events/validator';
import { getEventSchema } from './events/schemas';

// Collection references
const EVENTS_COLLECTION = 'analyticsEvents';
const CUSTOM_EVENTS_COLLECTION = 'customEvents';
const METRIC_DEFINITIONS_COLLECTION = 'metricDefinitions';
const METRIC_VALUES_COLLECTION = 'metricValues';
const DASHBOARD_CONFIGS_COLLECTION = 'dashboardConfigs';
const METRIC_ALERTS_COLLECTION = 'metricAlerts';
const DAILY_AGGREGATIONS_COLLECTION = 'dailyEventAggregations';
const MONTHLY_AGGREGATIONS_COLLECTION = 'monthlyEventAggregations';
const REPORT_DEFINITIONS_COLLECTION = 'reportDefinitions';
const REPORT_INSTANCES_COLLECTION = 'reportInstances';
const REPORT_SCHEDULES_COLLECTION = 'reportSchedules';
const COMPETITORS_COLLECTION = 'competitors';
const COMPETITOR_METRICS_COLLECTION = 'competitorMetrics';
const COMPETITOR_CONTENT_COLLECTION = 'competitorContent';

// Analytics Repository
export const AnalyticsRepository = {
  // === Event Management ===
  
  /**
   * Get events with optional filtering
   */
  async getEvents(
    options: {
      eventName?: string;
      category?: EventCategory;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      source?: string;
      limit?: number;
      lastDoc?: any;
    } = {}
  ): Promise<{ events: AnalyticsEvent[], lastDoc: any, hasMore: boolean }> {
    try {
      const constraints: QueryConstraint[] = [];
      
      if (options.eventName) {
        constraints.push(where('eventName', '==', options.eventName));
      }
      
      if (options.category) {
        constraints.push(where('category', '==', options.category));
      }
      
      if (options.userId) {
        constraints.push(where('userId', '==', options.userId));
      }
      
      if (options.source) {
        constraints.push(where('source', '==', options.source));
      }
      
      if (options.startDate) {
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(options.startDate)));
      }
      
      if (options.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(options.endDate)));
      }
      
      constraints.push(orderBy('timestamp', 'desc'));
      
      const pageLimit = options.limit || 50;
      constraints.push(limit(pageLimit));
      
      if (options.lastDoc) {
        constraints.push(startAfter(options.lastDoc));
      }
      
      const q = query(collection(db, EVENTS_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      
      const events = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as AnalyticsEvent));
      
      return {
        events,
        lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
        hasMore: snapshot.docs.length === pageLimit
      };
    } catch (error) {
      console.error('Error getting events:', error);
      return { events: [], lastDoc: null, hasMore: false };
    }
  },
  
  /**
   * Get event count by name or category
   */
  async getEventCount(
    options: {
      eventName?: string;
      category?: EventCategory;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<number> {
    try {
      const constraints: QueryConstraint[] = [];
      
      if (options.eventName) {
        constraints.push(where('eventName', '==', options.eventName));
      }
      
      if (options.category) {
        constraints.push(where('category', '==', options.category));
      }
      
      if (options.startDate) {
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(options.startDate)));
      }
      
      if (options.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(options.endDate)));
      }
      
      const q = query(collection(db, EVENTS_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      
      return snapshot.size;
    } catch (error) {
      console.error('Error getting event count:', error);
      return 0;
    }
  },
  
  /**
   * Get custom event definitions
   */
  async getCustomEventDefinitions(): Promise<CustomEventDefinition[]> {
    try {
      const q = query(
        collection(db, CUSTOM_EVENTS_COLLECTION),
        where('isEnabled', '==', true),
        orderBy('name', 'asc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as CustomEventDefinition));
    } catch (error) {
      console.error('Error getting custom event definitions:', error);
      return [];
    }
  },
  
  /**
   * Create a custom event definition
   */
  async createCustomEventDefinition(
    eventDef: Omit<CustomEventDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CustomEventDefinition> {
    try {
      const timestamp = Timestamp.now();
      const newEventDef = {
        ...eventDef,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      const docRef = await addDoc(collection(db, CUSTOM_EVENTS_COLLECTION), newEventDef);
      
      return {
        id: docRef.id,
        ...newEventDef
      } as CustomEventDefinition;
    } catch (error) {
      console.error('Error creating custom event definition:', error);
      throw error;
    }
  },
  
  // === Metric Management ===
  
  /**
   * Get a metric definition by ID
   */
  async getMetricDefinition(metricId: string): Promise<MetricDefinition | null> {
    try {
      const docRef = doc(db, METRIC_DEFINITIONS_COLLECTION, metricId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return { id: docSnap.id, ...docSnap.data() } as MetricDefinition;
    } catch (error) {
      console.error('Error getting metric definition:', error);
      return null;
    }
  },
  
  /**
   * Get all metric definitions, optionally filtered by category
   */
  async getMetricDefinitions(category?: string): Promise<MetricDefinition[]> {
    try {
      let q;
      
      if (category) {
        q = query(
          collection(db, METRIC_DEFINITIONS_COLLECTION),
          where('category', '==', category),
          orderBy('name', 'asc')
        );
      } else {
        q = query(
          collection(db, METRIC_DEFINITIONS_COLLECTION),
          orderBy('name', 'asc')
        );
      }
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as MetricDefinition));
    } catch (error) {
      console.error('Error getting metric definitions:', error);
      return [];
    }
  },
  
  /**
   * Create a metric definition
   */
  async createMetricDefinition(
    metricDef: Omit<MetricDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MetricDefinition> {
    try {
      const timestamp = Timestamp.now();
      const newMetricDef = {
        ...metricDef,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      const docRef = await addDoc(collection(db, METRIC_DEFINITIONS_COLLECTION), newMetricDef);
      
      return {
        id: docRef.id,
        ...newMetricDef
      } as MetricDefinition;
    } catch (error) {
      console.error('Error creating metric definition:', error);
      throw error;
    }
  },
  
  /**
   * Update a metric definition
   */
  async updateMetricDefinition(
    metricId: string,
    updates: Partial<MetricDefinition>
  ): Promise<MetricDefinition> {
    try {
      const docRef = doc(db, METRIC_DEFINITIONS_COLLECTION, metricId);
      const updatedData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updatedData);
      
      const updatedDoc = await getDoc(docRef);
      
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as MetricDefinition;
    } catch (error) {
      console.error('Error updating metric definition:', error);
      throw error;
    }
  },
  
  /**
   * Calculate a metric for a specific date range
   */
  async calculateMetric(
    metricId: string,
    startDate: string,
    endDate: string,
    platformId?: string
  ): Promise<number | null> {
    return calculateMetric(metricId, startDate, endDate, platformId);
  },
  
  /**
   * Get a metric with comparison to previous period
   */
  async getMetricWithComparison(
    metricId: string,
    currentStartDate: string,
    currentEndDate: string,
    comparisonPeriod: TimePeriod = TimePeriod.MONTH,
    platformId?: string
  ): Promise<MetricWithComparison | null> {
    return getMetricWithComparison(
      metricId,
      currentStartDate,
      currentEndDate,
      comparisonPeriod,
      platformId
    );
  },
  
  /**
   * Get dashboard metric configurations for a user
   */
  async getDashboardConfigs(userId: string): Promise<DashboardMetricConfig[]> {
    try {
      const q = query(
        collection(db, DASHBOARD_CONFIGS_COLLECTION),
        where('userId', '==', userId),
        orderBy('position.y', 'asc'),
        orderBy('position.x', 'asc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as DashboardMetricConfig));
    } catch (error) {
      console.error('Error getting dashboard configs:', error);
      return [];
    }
  },
  
  /**
   * Save a dashboard metric configuration
   */
  async saveDashboardConfig(
    config: Omit<DashboardMetricConfig, 'id'>
  ): Promise<DashboardMetricConfig> {
    try {
      const docRef = await addDoc(collection(db, DASHBOARD_CONFIGS_COLLECTION), config);
      
      return {
        id: docRef.id,
        ...config
      } as DashboardMetricConfig;
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      throw error;
    }
  },
  
  /**
   * Update a dashboard metric configuration
   */
  async updateDashboardConfig(
    configId: string,
    updates: Partial<DashboardMetricConfig>
  ): Promise<void> {
    try {
      const docRef = doc(db, DASHBOARD_CONFIGS_COLLECTION, configId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating dashboard config:', error);
      throw error;
    }
  },
  
  /**
   * Delete a dashboard metric configuration
   */
  async deleteDashboardConfig(configId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, DASHBOARD_CONFIGS_COLLECTION, configId));
    } catch (error) {
      console.error('Error deleting dashboard config:', error);
      throw error;
    }
  },
  
  // === Report Management ===
  
  /**
   * Get report definitions
   */
  async getReportDefinitions(
    userId: string,
    status?: ReportStatus
  ): Promise<ReportDefinition[]> {
    try {
      let constraints: QueryConstraint[] = [
        where('createdBy', '==', userId),
        orderBy('updatedAt', 'desc')
      ];
      
      if (status) {
        constraints = [
          where('createdBy', '==', userId),
          where('status', '==', status),
          orderBy('updatedAt', 'desc')
        ];
      }
      
      const q = query(collection(db, REPORT_DEFINITIONS_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as ReportDefinition));
    } catch (error) {
      console.error('Error getting report definitions:', error);
      return [];
    }
  },
  
  /**
   * Create a report definition
   */
  async createReportDefinition(
    report: Omit<ReportDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ReportDefinition> {
    try {
      const timestamp = Timestamp.now();
      const newReport = {
        ...report,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      const docRef = await addDoc(collection(db, REPORT_DEFINITIONS_COLLECTION), newReport);
      
      return {
        id: docRef.id,
        ...newReport
      } as ReportDefinition;
    } catch (error) {
      console.error('Error creating report definition:', error);
      throw error;
    }
  },
  
  /**
   * Update a report definition
   */
  async updateReportDefinition(
    reportId: string,
    updates: Partial<ReportDefinition>
  ): Promise<void> {
    try {
      const docRef = doc(db, REPORT_DEFINITIONS_COLLECTION, reportId);
      
      const updatedData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updatedData);
    } catch (error) {
      console.error('Error updating report definition:', error);
      throw error;
    }
  },
  
  /**
   * Get report instances
   */
  async getReportInstances(
    definitionId: string,
    limit = 10,
    lastDoc?: any
  ): Promise<{ instances: ReportInstance[], lastDoc: any, hasMore: boolean }> {
    try {
      let q = query(
        collection(db, REPORT_INSTANCES_COLLECTION),
        where('definitionId', '==', definitionId),
        orderBy('generatedAt', 'desc'),
        limit(limit)
      );
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      const snapshot = await getDocs(q);
      
      const instances = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as ReportInstance));
      
      return {
        instances,
        lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
        hasMore: snapshot.docs.length === limit
      };
    } catch (error) {
      console.error('Error getting report instances:', error);
      return { instances: [], lastDoc: null, hasMore: false };
    }
  },
  
  // === Competitor Analytics ===
  
  /**
   * Get competitors
   */
  async getCompetitors(isActive = true): Promise<Competitor[]> {
    try {
      const q = query(
        collection(db, COMPETITORS_COLLECTION),
        where('isActive', '==', isActive),
        orderBy('name', 'asc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Competitor));
    } catch (error) {
      console.error('Error getting competitors:', error);
      return [];
    }
  },
  
  /**
   * Get competitor by ID
   */
  async getCompetitorById(competitorId: string): Promise<Competitor | null> {
    try {
      const docRef = doc(db, COMPETITORS_COLLECTION, competitorId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return { id: docSnap.id, ...docSnap.data() } as Competitor;
    } catch (error) {
      console.error('Error getting competitor:', error);
      return null;
    }
  },
  
  /**
   * Create a competitor
   */
  async createCompetitor(
    competitor: Omit<Competitor, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Competitor> {
    try {
      const timestamp = Timestamp.now();
      const newCompetitor = {
        ...competitor,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      const docRef = await addDoc(collection(db, COMPETITORS_COLLECTION), newCompetitor);
      
      return {
        id: docRef.id,
        ...newCompetitor
      } as Competitor;
    } catch (error) {
      console.error('Error creating competitor:', error);
      throw error;
    }
  },
  
  /**
   * Get competitor metrics
   */
  async getCompetitorMetrics(
    competitorId: string,
    platformId: string,
    metricName: string,
    startDate: string,
    endDate: string
  ): Promise<CompetitorMetric[]> {
    try {
      const q = query(
        collection(db, COMPETITOR_METRICS_COLLECTION),
        where('competitorId', '==', competitorId),
        where('platformId', '==', platformId),
        where('metricName', '==', metricName),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as CompetitorMetric));
    } catch (error) {
      console.error('Error getting competitor metrics:', error);
      return [];
    }
  },
  
  /**
   * Get competitor content
   */
  async getCompetitorContent(
    competitorId: string,
    platformId?: string,
    contentType?: string,
    limit = 10,
    lastDoc?: any
  ): Promise<{ content: CompetitorContent[], lastDoc: any, hasMore: boolean }> {
    try {
      let constraints: QueryConstraint[] = [
        where('competitorId', '==', competitorId),
        orderBy('publishedAt', 'desc'),
        limit(limit)
      ];
      
      if (platformId) {
        constraints.push(where('platformId', '==', platformId));
      }
      
      if (contentType) {
        constraints.push(where('contentType', '==', contentType));
      }
      
      let q = query(collection(db, COMPETITOR_CONTENT_COLLECTION), ...constraints);
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      const snapshot = await getDocs(q);
      
      const content = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as CompetitorContent));
      
      return {
        content,
        lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
        hasMore: snapshot.docs.length === limit
      };
    } catch (error) {
      console.error('Error getting competitor content:', error);
      return { content: [], lastDoc: null, hasMore: false };
    }
  }
}; 