import { getFirebaseFirestore } from '../../../core/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  serverTimestamp,
  getDoc,
  limit
} from 'firebase/firestore';
import { logger } from '../../logging/logger';
import { 
  ReportDefinition, 
  ReportInstance, 
  ReportSchedule, 
  ReportStatus, 
  ReportDeliveryLog 
} from '../models/reports';
import { AnalyticsRepository } from '../repository';
import { calculateMetric } from './metrics';
import { generateDateRanges } from './time-series';
import { TimePeriod } from '../models/events';
import unifiedEmailService from '../../notifications/unified-email-service';

// Collection references
const REPORT_SCHEDULES_COLLECTION = 'report_schedules';
const REPORT_INSTANCES_COLLECTION = 'report_instances';
const REPORT_DELIVERY_LOGS_COLLECTION = 'report_delivery_logs';
const REPORT_DEFINITIONS_COLLECTION = 'report_definitions';

/**
 * Check for reports that need to be generated based on schedules
 * @returns Array of generated report instances
 */
export async function processScheduledReports(): Promise<ReportInstance[]> {
  try {
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return [];
    }
    const now = new Date();
    const generatedReports: ReportInstance[] = [];

    // Get all enabled schedules
    const schedulesQuery = query(
      collection(firestore, REPORT_SCHEDULES_COLLECTION),
      where('isEnabled', '==', true)
    );

    const schedulesSnapshot = await getDocs(schedulesQuery);
    
    // Process each active schedule
    for (const scheduleDoc of schedulesSnapshot.docs) {
      const schedule = { id: scheduleDoc.id, ...scheduleDoc.data() } as ReportSchedule;
      
      // Check if it's time to run this schedule
      if (shouldRunSchedule(schedule, now)) {
        try {
          // Get the report definition
          const reportDefinition = await AnalyticsRepository.getReportDefinitions(
            schedule.createdBy, 
            ReportStatus.SCHEDULED
          ).then(reports => reports.find(report => report.id === schedule.reportId));
          
          if (reportDefinition) {
            // Generate the report
            const reportInstance = await generateReportInstance(reportDefinition, schedule, firestore);

            if (reportInstance) {
              generatedReports.push(reportInstance);

              // Update the schedule with the next run time
              await updateScheduleNextRun(schedule, firestore);

              // Handle delivery if needed
              if (schedule.recipients && schedule.recipients.length > 0) {
                await deliverReport(reportInstance, schedule, firestore);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing schedule ${schedule.id}:`, error);
        }
      }
    }
    
    return generatedReports;
  } catch (error) {
    console.error('Error processing scheduled reports:', error);
    return [];
  }
}

/**
 * Check if a schedule should run at the current time
 * @param schedule The report schedule
 * @param currentTime The current time
 * @returns Whether the schedule should run
 */
function shouldRunSchedule(schedule: ReportSchedule, currentTime: Date): boolean {
  // If no nextRun is set, it's never run before
  if (!schedule.nextRun) {
    return true;
  }
  
  const nextRunTime = schedule.nextRun.toDate();
  
  // Run if the next run time is in the past
  return nextRunTime <= currentTime;
}

/**
 * Generate a report instance from a definition
 * @param reportDefinition The report definition
 * @param schedule The report schedule
 * @param firestore The Firestore instance
 * @returns The generated report instance
 */
async function generateReportInstance(
  reportDefinition: ReportDefinition,
  schedule: ReportSchedule,
  firestore: any
): Promise<ReportInstance | null> {
  try {
    // Calculate date range based on the report timeframe
    const { dateRange, comparisonRange } = calculateReportDateRanges(reportDefinition);
    
    // Create the report instance
    const reportInstance: Omit<ReportInstance, 'id'> = {
      definitionId: reportDefinition.id,
      name: reportDefinition.name,
      description: reportDefinition.description,
      status: ReportStatus.GENERATING,
      generatedAt: Timestamp.now(),
      dateRange,
      comparisonRange,
      metrics: [],
      charts: [],
      downloadCount: 0,
      createdBy: schedule.createdBy,
      viewedBy: []
    };
    
    // Save the initial instance
    const docRef = await addDoc(collection(firestore, REPORT_INSTANCES_COLLECTION), reportInstance);
    const instanceId = docRef.id;
    
    // Calculate metrics
    const metricsPromises = reportDefinition.metrics.map(async metricId => {
      try {
        // Get metric definition
        const metricDef = await AnalyticsRepository.getMetricDefinition(metricId);
        
        if (!metricDef) {
          return null;
        }
        
        // Calculate current value
        const currentValue = await calculateMetric(
          metricId,
          dateRange.start,
          dateRange.end
        );
        
        // Calculate previous value if comparison is enabled
        let previousValue = null;
        
        if (comparisonRange && schedule.includeComparison) {
          previousValue = await calculateMetric(
            metricId,
            comparisonRange.start,
            comparisonRange.end
          );
        }
        
        // Return the metric data
        return {
          metric: metricDef,
          values: [{
            date: dateRange.end,
            value: currentValue || 0
          }],
          summary: {
            current: currentValue || 0,
            previous: previousValue,
            change: previousValue !== null ? (currentValue || 0) - previousValue : undefined,
            changePercentage: previousValue !== null && previousValue !== 0 
              ? (((currentValue || 0) - previousValue) / previousValue) * 100 
              : undefined
          }
        };
      } catch (error) {
        console.error(`Error calculating metric ${metricId}:`, error);
        return null;
      }
    });
    
    // Wait for all metrics to be calculated
    const metricResults = await Promise.all(metricsPromises);
    
    // Filter out null results
    const metrics = metricResults.filter(m => m !== null) as ReportInstance['metrics'];
    
    // Process charts based on report definition
    const charts = await Promise.all(reportDefinition.charts.map(async chart => {
      // Filter metrics relevant to this chart
      const relevantMetrics = metrics.filter(m => chart.metrics.includes(m.metric.id));
      
      if (relevantMetrics.length === 0) {
        return {
          ...chart,
          data: [],
          error: 'No data available for the selected metrics'
        };
      }
      
      // Generate chart data based on the chart type
      switch (chart.type) {
        case 'line':
          return {
            ...chart,
            data: await generateLineChartData(relevantMetrics, reportInstance.dateRange)
          };
          
        case 'bar':
          return {
            ...chart,
            data: await generateBarChartData(relevantMetrics, reportInstance.dateRange)
          };
          
        case 'pie':
          return {
            ...chart,
            data: await generatePieChartData(relevantMetrics)
          };
          
        case 'comparison':
          return {
            ...chart,
            data: generateComparisonData(relevantMetrics)
          };
          
        default:
          // Default to simple data for other chart types
          return {
            ...chart,
            data: relevantMetrics.map(m => ({
              metricId: m.metric.id,
              metricName: m.metric.name,
              value: m.summary.current,
              previousValue: m.summary.previous,
              change: m.summary.change,
              changePercentage: m.summary.changePercentage
            }))
          };
      }
    }));
    
    // Update the report instance with the results
    const completedReport: Partial<ReportInstance> = {
      status: ReportStatus.COMPLETED,
      completedAt: Timestamp.now(),
      metrics,
      charts
    };
    
    await updateDoc(doc(firestore, REPORT_INSTANCES_COLLECTION, instanceId), completedReport);
    
    // Return the full report instance
    return {
      id: instanceId,
      ...reportInstance,
      ...completedReport
    } as ReportInstance;
  } catch (error) {
    console.error('Error generating report instance:', error);
    return null;
  }
}

/**
 * Calculate date ranges for a report
 * @param reportDefinition The report definition
 * @returns The date ranges for the report
 */
function calculateReportDateRanges(reportDefinition: ReportDefinition): {
  dateRange: { start: string, end: string },
  comparisonRange?: { start: string, end: string }
} {
  const now = new Date();
  const end = now.toISOString().split('T')[0]; // Today in YYYY-MM-DD format
  let start: string;
  
  // Calculate start date based on timeframe
  switch (reportDefinition.timeframe) {
    case 'day':
      start = end; // Same day
      break;
    case 'week':
      // 7 days ago
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      start = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      // Start of current month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      start = monthStart.toISOString().split('T')[0];
      break;
    case 'quarter':
      // Start of current quarter
      const quarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
      start = quarterStart.toISOString().split('T')[0];
      break;
    case 'year':
      // Start of current year
      const yearStart = new Date(now.getFullYear(), 0, 1);
      start = yearStart.toISOString().split('T')[0];
      break;
    case 'custom':
      // Use custom date range if provided
      if (reportDefinition.dateRange) {
        return {
          dateRange: reportDefinition.dateRange
        };
      }
      // Default to month if no custom range
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      break;
    default:
      // Default to month
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  
  const dateRange = { start, end };
  
  // Calculate comparison range if needed
  let comparisonRange: { start: string, end: string } | undefined;
  
  if (reportDefinition.comparisonPeriod) {
    if (reportDefinition.comparisonPeriod.type === 'custom' && 
        reportDefinition.comparisonPeriod.customRange) {
      // Use custom comparison range
      comparisonRange = reportDefinition.comparisonPeriod.customRange;
    } else if (reportDefinition.comparisonPeriod.type === 'previous_year') {
      // Same period, previous year
      const prevYearStart = new Date(start);
      prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
      
      const prevYearEnd = new Date(end);
      prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);
      
      comparisonRange = {
        start: prevYearStart.toISOString().split('T')[0],
        end: prevYearEnd.toISOString().split('T')[0]
      };
    } else {
      // Previous period of same duration
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      // Calculate duration
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
      
      // Move both dates back by the duration
      const prevStart = new Date(startDate);
      prevStart.setDate(prevStart.getDate() - durationDays - 1);
      
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);
      
      comparisonRange = {
        start: prevStart.toISOString().split('T')[0],
        end: prevEnd.toISOString().split('T')[0]
      };
    }
  }
  
  return {
    dateRange,
    comparisonRange
  };
}

/**
 * Update a schedule's next run time
 * @param schedule The report schedule to update
 * @param firestore The Firestore instance
 */
async function updateScheduleNextRun(schedule: ReportSchedule, firestore: any): Promise<void> {
  try {
    const now = new Date();
    let nextRun = new Date(now);
    
    // Calculate next run time based on frequency
    switch (schedule.frequency) {
      case 'daily':
        // Next day at the same time
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        // If day of week is specified, find the next occurrence
        if (typeof schedule.dayOfWeek === 'number') {
          const currentDay = now.getDay();
          let daysToAdd = schedule.dayOfWeek - currentDay;
          
          if (daysToAdd <= 0) {
            // If today or already passed this week, move to next week
            daysToAdd += 7;
          }
          
          nextRun.setDate(now.getDate() + daysToAdd);
        } else {
          // Default to 7 days from now
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
      case 'monthly':
        // If day of month is specified, find the next occurrence
        if (typeof schedule.dayOfMonth === 'number') {
          // Move to next month
          nextRun.setMonth(nextRun.getMonth() + 1);
          
          // Set to the specified day
          nextRun.setDate(Math.min(
            schedule.dayOfMonth,
            new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0).getDate() // Last day of the month
          ));
        } else {
          // Default to same day next month
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }
    
    // Set the time if specified
    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    }
    
    // Apply timezone if needed
    if (schedule.timezone) {
      // This is a simplified approach; in a real implementation,
      // you'd use a proper timezone library
      const timezoneOffset = getTimezoneOffset(schedule.timezone);
      if (timezoneOffset !== null) {
        const utcTime = nextRun.getTime() + (nextRun.getTimezoneOffset() * 60000);
        nextRun = new Date(utcTime + (timezoneOffset * 60000));
      }
    }
    
    // Update the schedule
    await updateDoc(doc(firestore, REPORT_SCHEDULES_COLLECTION, schedule.id), {
      lastRun: serverTimestamp(),
      nextRun: Timestamp.fromDate(nextRun)
    });
  } catch (error) {
    console.error(`Error updating schedule next run for ${schedule.id}:`, error);
  }
}

/**
 * Get timezone offset in minutes
 * @param timezone The timezone string
 * @returns Offset in minutes or null if invalid
 */
function getTimezoneOffset(timezone: string): number | null {
  try {
    // This is a simplified approach
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (utcDate.getTime() - tzDate.getTime()) / 60000;
  } catch (error) {
    console.error('Invalid timezone:', error);
    return null;
  }
}

/**
 * Deliver a report to recipients
 * @param report The report instance
 * @param schedule The report schedule
 * @param firestore The Firestore instance
 */
async function deliverReport(
  report: ReportInstance,
  schedule: ReportSchedule,
  firestore: any
): Promise<void> {
  try {
    // Get the report definition for title and details
    const reportDefDoc = await getDoc(doc(firestore, REPORT_DEFINITIONS_COLLECTION, schedule.reportId));
    
    if (!reportDefDoc.exists()) {
      throw new Error('Report definition not found');
    }
    
    const reportDefinition = reportDefDoc.data() as ReportDefinition;
    
    // Send analytics report using unified email service
    await unifiedEmailService.sendEmail({
      to: schedule.recipients,
      subject: `${reportDefinition.name} - Analytics Report`,
      htmlContent: `
        <h2>${reportDefinition.name}</h2>
        <p>${reportDefinition.description}</p>
        <p><strong>Report Period:</strong> ${report.dateRange.start} to ${report.dateRange.end}</p>
        <h3>Key Metrics:</h3>
        <ul>
          ${report.metrics.slice(0, 5).map(m => `<li>${m.metric.name}: ${m.summary.current}</li>`).join('')}
        </ul>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/analytics/reports/${report.id}">View Full Report</a></p>
      `,
      category: 'analytics_report',
      priority: 'normal'
    });
    
    logger.info(`Report ${report.id} delivered to ${schedule.recipients.length} recipients`);
    
    // Log the successful delivery
    const deliveryLog: Omit<ReportDeliveryLog, 'id'> = {
      reportId: schedule.reportId,
      reportInstanceId: report.id,
      deliveredAt: Timestamp.now(),
      recipients: schedule.recipients,
      formats: schedule.formats,
      status: 'success'
    };
    
    await addDoc(collection(firestore, REPORT_DELIVERY_LOGS_COLLECTION), deliveryLog);
  } catch (error) {
    console.error(`Error delivering report ${report.id}:`, error);
    
    // Log the failure
    const errorLog: Omit<ReportDeliveryLog, 'id'> = {
      reportId: schedule.reportId,
      reportInstanceId: report.id,
      deliveredAt: Timestamp.now(),
      recipients: schedule.recipients,
      formats: schedule.formats,
      status: 'failed',
      errorDetails: { error: String(error) }
    };
    
    await addDoc(collection(firestore, REPORT_DELIVERY_LOGS_COLLECTION), errorLog);
  }
}

/**
 * Generate data for a line chart showing trends over time
 */
async function generateLineChartData(
  metrics: ReportInstance['metrics'],
  dateRange: { start: string, end: string }
): Promise<any[]> {
  try {
    // Get Firestore instance
    const admin = require('firebase-admin');
    const firestore = admin.firestore();
    
    // Convert date strings to Date objects
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // Determine appropriate grouping based on date range
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const timeGrouping = daysDiff > 90 ? 'month' : daysDiff > 14 ? 'week' : 'day';
    
    // Prepare result array with one series per metric
    const result = metrics.map(metric => {
      return {
        metricId: metric.metric.id,
        metricName: metric.metric.name,
        series: [] as Array<{ date: string, value: number }>
      };
    });
    
    // For each metric, get time series data
    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i];
      
      // Query the time series collection for this metric
      const timeSeriesRef = firestore.collection('analytics_metrics')
        .where('metricId', '==', metric.metric.id)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate))
        .orderBy('timestamp', 'asc');
      
      const timeSeriesSnapshot = await timeSeriesRef.get();
      
      // Process all data points
      const dataPoints: Record<string, number> = {};
      
      timeSeriesSnapshot.forEach((doc: any) => {
        const data = doc.data();
        const date = data.timestamp.toDate();
        
        // Format the date based on grouping
        let dateKey: string;
        if (timeGrouping === 'month') {
          dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        } else if (timeGrouping === 'week') {
          // Get ISO week number
          const januaryFirst = new Date(date.getFullYear(), 0, 1);
          const weekNumber = Math.ceil(((date.getTime() - januaryFirst.getTime()) / 86400000 + januaryFirst.getDay() + 1) / 7);
          dateKey = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
        } else {
          dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        
        // Sum values for the same date key (for grouping)
        if (!dataPoints[dateKey]) {
          dataPoints[dateKey] = 0;
        }
        dataPoints[dateKey] += data.value || 0;
      });
      
      // Convert to array format for the chart
      const series = Object.entries(dataPoints).map(([date, value]) => ({
        date,
        value
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      result[i].series = series;
    }
    
    return result;
  } catch (error) {
    console.error('Error generating line chart data:', error);
    return metrics.map(m => ({
      metricId: m.metric.id,
      metricName: m.metric.name,
      series: []
    }));
  }
}

/**
 * Generate data for a bar chart
 */
async function generateBarChartData(
  metrics: ReportInstance['metrics'],
  dateRange: { start: string, end: string }
): Promise<any[]> {
  try {
    // Get Firestore instance
    const admin = require('firebase-admin');
    const firestore = admin.firestore();
    
    // Convert date strings to Date objects
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    // For each metric, get the breakdown data (e.g. by platform, by content type)
    const result = await Promise.all(metrics.map(async (metric) => {
      // Check if the metric has dimension data
      const dimensionsRef = firestore.collection('analytics_dimensions')
        .where('metricId', '==', metric.metric.id)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate));
      
      const dimensionsSnapshot = await dimensionsRef.get();
      
      if (dimensionsSnapshot.empty) {
        // No dimension data, use summary
        return {
          metricId: metric.metric.id,
          metricName: metric.metric.name,
          categories: ['Total'],
          values: [metric.summary.current]
        };
      }
      
      // Aggregate data by dimension
      const dimensions: Record<string, number> = {};
      
      dimensionsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        const dimension = data.dimension || 'Other';
        
        if (!dimensions[dimension]) {
          dimensions[dimension] = 0;
        }
        dimensions[dimension] += data.value || 0;
      });
      
      // Convert to array format
      const entries = Object.entries(dimensions);
      
      // Sort by value descending
      entries.sort((a, b) => b[1] - a[1]);
      
      // Limit to top 10 categories for readability
      const categories = entries.slice(0, 10).map(e => e[0]);
      const values = entries.slice(0, 10).map(e => e[1]);
      
      return {
        metricId: metric.metric.id,
        metricName: metric.metric.name,
        categories,
        values
      };
    }));
    
    return result;
  } catch (error) {
    console.error('Error generating bar chart data:', error);
    return metrics.map(m => ({
      metricId: m.metric.id,
      metricName: m.metric.name,
      categories: [],
      values: []
    }));
  }
}

/**
 * Generate data for a pie chart
 */
async function generatePieChartData(metrics: ReportInstance['metrics']): Promise<any[]> {
  // Similar implementation to bar chart but formatted for pie charts
  try {
    // Get Firestore instance
    const admin = require('firebase-admin');
    const firestore = admin.firestore();
    
    // Use the most recent data only for pie charts
    const result = await Promise.all(metrics.map(async (metric) => {
      // Get the most recent dimension breakdown
      const dimensionsRef = firestore.collection('analytics_dimensions')
        .where('metricId', '==', metric.metric.id)
        .orderBy('timestamp', 'desc')
        .limit(20); // Get more data points to aggregate similar categories
      
      const dimensionsSnapshot = await dimensionsRef.get();
      
      if (dimensionsSnapshot.empty) {
        // No dimension data, use summary as a single slice
        return {
          metricId: metric.metric.id,
          metricName: metric.metric.name,
          slices: [{
            label: 'Total',
            value: metric.summary.current,
            percentage: 100
          }]
        };
      }
      
      // Aggregate data by dimension
      const dimensions: Record<string, number> = {};
      
      dimensionsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        const dimension = data.dimension || 'Other';
        
        if (!dimensions[dimension]) {
          dimensions[dimension] = 0;
        }
        dimensions[dimension] += data.value || 0;
      });
      
      // Calculate total for percentages
      const total = Object.values(dimensions).reduce((sum, val) => sum + val, 0);
      
      // Convert to array and sort
      let slices = Object.entries(dimensions).map(([label, value]) => ({
        label,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }));
      
      // Sort by value descending
      slices.sort((a, b) => b.value - a.value);
      
      // If there are many small slices, combine them into "Other"
      if (slices.length > 8) {
        const mainSlices = slices.slice(0, 7);
        const otherSlices = slices.slice(7);
        
        const otherValue = otherSlices.reduce((sum, slice) => sum + slice.value, 0);
        const otherPercentage = otherSlices.reduce((sum, slice) => sum + slice.percentage, 0);
        
        mainSlices.push({
          label: 'Other',
          value: otherValue,
          percentage: otherPercentage
        });
        
        slices = mainSlices;
      }
      
      return {
        metricId: metric.metric.id,
        metricName: metric.metric.name,
        slices
      };
    }));
    
    return result;
  } catch (error) {
    console.error('Error generating pie chart data:', error);
    return metrics.map(m => ({
      metricId: m.metric.id,
      metricName: m.metric.name,
      slices: []
    }));
  }
}

/**
 * Generate comparison data for metrics
 */
function generateComparisonData(metrics: ReportInstance['metrics']): any[] {
  return metrics.map(m => {
    const change = m.summary.change ?? 0;
    return {
      metricId: m.metric.id,
      metricName: m.metric.name,
      current: m.summary.current,
      previous: m.summary.previous,
      change,
      changePercentage: m.summary.changePercentage,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  });
}
