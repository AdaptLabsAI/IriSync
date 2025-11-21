import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  Timestamp,
  startAt,
  endAt,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { 
  MetricDefinition, 
  MetricValue, 
  MetricWithComparison,
  TrendDirection,
  TrendValuation
} from '../models/metrics';
import { User } from '../../models/User';
import { TimePeriod } from '../models/events';

// Collection references
const METRICS_COLLECTION = 'metrics';
const EVENTS_COLLECTION = 'analyticsEvents';
const METRIC_DEFINITIONS_COLLECTION = 'metricDefinitions';
const METRIC_VALUES_COLLECTION = 'metricValues';

/**
 * Get a metric definition by ID
 * @param metricId The metric ID
 * @returns The metric definition or null if not found
 */
export async function getMetricDefinition(metricId: string): Promise<MetricDefinition | null> {
  try {
    const docRef = collection(db, METRIC_DEFINITIONS_COLLECTION);
    const q = query(docRef, where('id', '==', metricId));
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MetricDefinition;
  } catch (error) {
    console.error('Error getting metric definition:', error);
    return null;
  }
}

/**
 * Get all metric definitions, optionally filtered by category
 * @param category Optional category to filter by
 * @returns Array of metric definitions
 */
export async function getAllMetricDefinitions(category?: string): Promise<MetricDefinition[]> {
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
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MetricDefinition));
  } catch (error) {
    console.error('Error getting metric definitions:', error);
    return [];
  }
}

/**
 * Get metric values for a specific time period
 * @param metricId The metric ID
 * @param periodType The time period type
 * @param startDate Start date (inclusive)
 * @param endDate End date (inclusive)
 * @param platformId Optional platform ID to filter by
 * @returns Array of metric values
 */
export async function getMetricValues(
  metricId: string,
  periodType: TimePeriod,
  startDate: string,
  endDate: string,
  platformId?: string
): Promise<MetricValue[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('metricId', '==', metricId),
      where('periodType', '==', periodType),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    ];
    
    if (platformId) {
      constraints.push(where('platformId', '==', platformId));
    }
    
    const q = query(
      collection(db, METRIC_VALUES_COLLECTION),
      ...constraints
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MetricValue));
  } catch (error) {
    console.error('Error getting metric values:', error);
    return [];
  }
}

/**
 * Calculate a metric for a given time period
 * This acts as the primary entry point for real-time metric calculation
 * @param metricId The metric ID
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @param platformId Optional platform ID to filter by
 * @returns The calculated metric value
 */
export async function calculateMetric(
  metricId: string,
  startDate: string,
  endDate: string,
  platformId?: string
): Promise<number | null> {
  try {
    // Get the metric definition
    const metricDef = await getMetricDefinition(metricId);
    
    if (!metricDef) {
      console.error(`Metric definition not found: ${metricId}`);
      return null;
    }
    
    // Parse the formula to determine the calculation method
    const formula = metricDef.formula;
    
    // Check if it's a simple event count
    if (formula.startsWith('count:')) {
      const eventName = formula.substring(6);
      return countEvents(eventName, startDate, endDate, platformId);
    }
    
    // Check if it's a property sum
    if (formula.startsWith('sum:')) {
      const [eventName, propertyName] = formula.substring(4).split('.');
      return sumEventProperty(eventName, propertyName, startDate, endDate, platformId);
    }
    
    // Check if it's an average
    if (formula.startsWith('avg:')) {
      const [eventName, propertyName] = formula.substring(4).split('.');
      return averageEventProperty(eventName, propertyName, startDate, endDate, platformId);
    }
    
    // Check if it's a ratio or percentage
    if (formula.includes('/')) {
      const [numerator, denominator] = formula.split('/');
      return calculateRatio(numerator.trim(), denominator.trim(), startDate, endDate, platformId);
    }
    
    // If we reach here, it's an unsupported formula
    console.error(`Unsupported metric formula: ${formula}`);
    return null;
  } catch (error) {
    console.error('Error calculating metric:', error);
    return null;
  }
}

/**
 * Count events of a given type within a date range
 * @param eventName The event name
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @param platformId Optional platform ID to filter by
 * @returns The event count
 */
async function countEvents(
  eventName: string,
  startDate: string,
  endDate: string,
  platformId?: string
): Promise<number> {
  try {
    const startTimestamp = getStartOfDay(startDate);
    const endTimestamp = getEndOfDay(endDate);
    
    const constraints: QueryConstraint[] = [
      where('eventName', '==', eventName),
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<=', endTimestamp)
    ];
    
    if (platformId) {
      constraints.push(where('properties.platformId', '==', platformId));
    }
    
    const q = query(
      collection(db, EVENTS_COLLECTION),
      ...constraints
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error counting events:', error);
    return 0;
  }
}

/**
 * Sum a property across events of a given type
 * @param eventName The event name
 * @param propertyName The property to sum
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @param platformId Optional platform ID to filter by
 * @returns The sum of the property values
 */
async function sumEventProperty(
  eventName: string,
  propertyName: string,
  startDate: string,
  endDate: string,
  platformId?: string
): Promise<number> {
  try {
    const startTimestamp = getStartOfDay(startDate);
    const endTimestamp = getEndOfDay(endDate);
    
    const constraints: QueryConstraint[] = [
      where('eventName', '==', eventName),
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<=', endTimestamp)
    ];
    
    if (platformId) {
      constraints.push(where('properties.platformId', '==', platformId));
    }
    
    const q = query(
      collection(db, EVENTS_COLLECTION),
      ...constraints
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      const propertyPath = propertyName.split('.');
      
      let value = data.properties;
      for (const key of propertyPath) {
        if (value && typeof value === 'object') {
          value = value[key];
        } else {
          value = undefined;
          break;
        }
      }
      
      if (typeof value === 'number') {
        return sum + value;
      }
      
      return sum;
    }, 0);
  } catch (error) {
    console.error('Error summing event property:', error);
    return 0;
  }
}

/**
 * Calculate the average of a property across events
 * @param eventName The event name
 * @param propertyName The property to average
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @param platformId Optional platform ID to filter by
 * @returns The average of the property values
 */
async function averageEventProperty(
  eventName: string,
  propertyName: string,
  startDate: string,
  endDate: string,
  platformId?: string
): Promise<number> {
  try {
    const startTimestamp = getStartOfDay(startDate);
    const endTimestamp = getEndOfDay(endDate);
    
    const constraints: QueryConstraint[] = [
      where('eventName', '==', eventName),
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<=', endTimestamp)
    ];
    
    if (platformId) {
      constraints.push(where('properties.platformId', '==', platformId));
    }
    
    const q = query(
      collection(db, EVENTS_COLLECTION),
      ...constraints
    );
    
    const snapshot = await getDocs(q);
    
    let sum = 0;
    let count = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const propertyPath = propertyName.split('.');
      
      let value = data.properties;
      for (const key of propertyPath) {
        if (value && typeof value === 'object') {
          value = value[key];
        } else {
          value = undefined;
          break;
        }
      }
      
      if (typeof value === 'number') {
        sum += value;
        count++;
      }
    });
    
    return count > 0 ? sum / count : 0;
  } catch (error) {
    console.error('Error averaging event property:', error);
    return 0;
  }
}

/**
 * Calculate the ratio of two metrics
 * @param numeratorFormula The numerator formula
 * @param denominatorFormula The denominator formula
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @param platformId Optional platform ID to filter by
 * @returns The ratio of the two metrics
 */
async function calculateRatio(
  numeratorFormula: string,
  denominatorFormula: string,
  startDate: string,
  endDate: string,
  platformId?: string
): Promise<number> {
  try {
    // Calculate each side of the ratio
    const numeratorValue = await parseSingleFormula(numeratorFormula, startDate, endDate, platformId);
    const denominatorValue = await parseSingleFormula(denominatorFormula, startDate, endDate, platformId);
    
    if (denominatorValue === 0) {
      return 0; // Avoid division by zero
    }
    
    return numeratorValue / denominatorValue;
  } catch (error) {
    console.error('Error calculating ratio:', error);
    return 0;
  }
}

/**
 * Parse a single formula component
 * @param formula The formula to parse
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @param platformId Optional platform ID to filter by
 * @returns The calculated value
 */
async function parseSingleFormula(
  formula: string,
  startDate: string,
  endDate: string,
  platformId?: string
): Promise<number> {
  if (formula.startsWith('count:')) {
    const eventName = formula.substring(6);
    return countEvents(eventName, startDate, endDate, platformId);
  }
  
  if (formula.startsWith('sum:')) {
    const [eventName, propertyName] = formula.substring(4).split('.');
    return sumEventProperty(eventName, propertyName, startDate, endDate, platformId);
  }
  
  if (formula.startsWith('avg:')) {
    const [eventName, propertyName] = formula.substring(4).split('.');
    return averageEventProperty(eventName, propertyName, startDate, endDate, platformId);
  }
  
  // Try to parse as a number
  const numericValue = parseFloat(formula);
  if (!isNaN(numericValue)) {
    return numericValue;
  }
  
  console.error(`Unsupported formula component: ${formula}`);
  return 0;
}

/**
 * Get a metric with comparison to previous period
 * @param metricId The metric ID
 * @param currentStartDate Current period start date (YYYY-MM-DD)
 * @param currentEndDate Current period end date (YYYY-MM-DD)
 * @param comparisonPeriod The period to compare with
 * @returns The metric with comparison
 */
export async function getMetricWithComparison(
  metricId: string,
  currentStartDate: string,
  currentEndDate: string,
  comparisonPeriod: TimePeriod = TimePeriod.MONTH,
  platformId?: string
): Promise<MetricWithComparison | null> {
  try {
    const metricDef = await getMetricDefinition(metricId);
    
    if (!metricDef) {
      console.error(`Metric definition not found: ${metricId}`);
      return null;
    }
    
    // Calculate current value
    const currentValue = await calculateMetric(metricId, currentStartDate, currentEndDate, platformId);
    
    if (currentValue === null) {
      return null;
    }
    
    // Calculate previous period's dates
    const { startDate: previousStartDate, endDate: previousEndDate } = getPreviousPeriod(
      currentStartDate,
      currentEndDate,
      comparisonPeriod
    );
    
    // Calculate previous value
    const previousValue = await calculateMetric(metricId, previousStartDate, previousEndDate, platformId);
    
    if (previousValue === null) {
      return null;
    }
    
    // Calculate change
    const change = currentValue - previousValue;
    let changePercentage = 0;
    
    if (previousValue !== 0) {
      changePercentage = (change / previousValue) * 100;
    }
    
    // Determine trend direction
    let trendDirection: TrendDirection = TrendDirection.NEUTRAL;
    if (change > 0) {
      trendDirection = TrendDirection.UP;
    } else if (change < 0) {
      trendDirection = TrendDirection.DOWN;
    }
    
    // Determine trend valuation
    let trendValuation: TrendValuation = TrendValuation.NEUTRAL;
    if (trendDirection !== TrendDirection.NEUTRAL) {
      const isPositiveTrend = metricDef.isHigherBetter ? trendDirection === TrendDirection.UP : trendDirection === TrendDirection.DOWN;
      trendValuation = isPositiveTrend ? TrendValuation.POSITIVE : TrendValuation.NEGATIVE;
    }
    
    // Generate comparison label
    let comparisonLabel = '';
    switch (comparisonPeriod) {
      case TimePeriod.DAY:
        comparisonLabel = 'vs. Previous Day';
        break;
      case TimePeriod.WEEK:
        comparisonLabel = 'vs. Previous Week';
        break;
      case TimePeriod.MONTH:
        comparisonLabel = 'vs. Previous Month';
        break;
      case TimePeriod.QUARTER:
        comparisonLabel = 'vs. Previous Quarter';
        break;
      case TimePeriod.YEAR:
        comparisonLabel = 'vs. Previous Year';
        break;
      default:
        comparisonLabel = 'vs. Previous Period';
    }
    
    return {
      metric: metricDef,
      currentValue,
      previousValue,
      change,
      changePercentage,
      trendDirection,
      trendValuation,
      comparisonPeriod,
      comparisonLabel
    };
  } catch (error) {
    console.error('Error getting metric with comparison:', error);
    return null;
  }
}

/**
 * Calculate previous period dates based on current period
 * @param currentStartDate Current period start date
 * @param currentEndDate Current period end date
 * @param periodType The type of period
 * @returns Previous period start and end dates
 */
function getPreviousPeriod(
  currentStartDate: string,
  currentEndDate: string,
  periodType: TimePeriod
): { startDate: string, endDate: string } {
  const startDate = new Date(currentStartDate);
  const endDate = new Date(currentEndDate);
  const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  switch (periodType) {
    case TimePeriod.DAY:
      startDate.setDate(startDate.getDate() - 1);
      endDate.setDate(endDate.getDate() - 1);
      break;
    case TimePeriod.WEEK:
      startDate.setDate(startDate.getDate() - 7);
      endDate.setDate(endDate.getDate() - 7);
      break;
    case TimePeriod.MONTH:
      startDate.setMonth(startDate.getMonth() - 1);
      endDate.setMonth(endDate.getMonth() - 1);
      break;
    case TimePeriod.QUARTER:
      startDate.setMonth(startDate.getMonth() - 3);
      endDate.setMonth(endDate.getMonth() - 3);
      break;
    case TimePeriod.YEAR:
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      // Default to using the same duration
      startDate.setDate(startDate.getDate() - durationDays);
      endDate.setDate(endDate.getDate() - durationDays);
  }
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

/**
 * Format a date as YYYY-MM-DD
 * @param date The date to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get the start of a day as a Timestamp (00:00:00)
 * @param dateString The date string (YYYY-MM-DD)
 * @returns Timestamp at the start of the day
 */
function getStartOfDay(dateString: string): Timestamp {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(date);
}

/**
 * Get the end of a day as a Timestamp (23:59:59.999)
 * @param dateString The date string (YYYY-MM-DD)
 * @returns Timestamp at the end of the day
 */
function getEndOfDay(dateString: string): Timestamp {
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999);
  return Timestamp.fromDate(date);
}
