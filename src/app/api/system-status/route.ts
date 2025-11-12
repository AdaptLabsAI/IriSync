import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';

export interface ServiceStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  description: string;
  lastUpdated: Date;
  responseTime?: number;
  uptime?: number;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  affectedServices: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  updates: {
    timestamp: Date;
    status: string;
    message: string;
  }[];
}

export async function GET() {
  try {
    // Try to fetch services from Firestore
    const servicesRef = collection(firestore, 'system_services');
    const servicesQuery = query(servicesRef, orderBy('lastUpdated', 'desc'));
    const servicesSnapshot = await getDocs(servicesQuery);
    
    let services = servicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      };
    });
    
    // Try to fetch incidents from Firestore
    const incidentsRef = collection(firestore, 'system_incidents');
    const incidentsQuery = query(incidentsRef, orderBy('createdAt', 'desc'), limit(20));
    const incidentsSnapshot = await getDocs(incidentsQuery);
    
    let incidents = incidentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate() || null,
        updates: (data.updates || []).map((update: any) => ({
          ...update,
          timestamp: update.timestamp?.toDate() || new Date()
        }))
      };
    });
    
    // Return live data if available
    if (services.length > 0 || incidents.length > 0) {
      return NextResponse.json({
        services: services.length > 0 ? services : getSampleServices(),
        incidents: incidents.length > 0 ? incidents : getSampleIncidents(),
        lastUpdated: new Date()
      });
    }
    
    // Otherwise, return sample data
    return NextResponse.json({
      services: getSampleServices(),
      incidents: getSampleIncidents(),
      lastUpdated: new Date(),
      isSampleData: true
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    
    // Return sample data on error
    return NextResponse.json({
      services: getSampleServices(),
      incidents: getSampleIncidents(),
      lastUpdated: new Date(),
      isSampleData: true,
      error: 'Could not fetch live data'
    });
  }
}

function getSampleServices(): ServiceStatus[] {
  return [
    {
      id: 'api',
      name: 'API Services',
      status: 'operational',
      description: 'REST and GraphQL API endpoints',
      lastUpdated: new Date(),
      responseTime: 85,
      uptime: 99.98
    },
    {
      id: 'webapp',
      name: 'Web Application',
      status: 'operational',
      description: 'Main web interface',
      lastUpdated: new Date(),
      responseTime: 120,
      uptime: 99.99
    },
    {
      id: 'database',
      name: 'Database',
      status: 'operational',
      description: 'Primary and replica databases',
      lastUpdated: new Date(),
      uptime: 99.95
    },
    {
      id: 'auth',
      name: 'Authentication',
      status: 'operational',
      description: 'Login, SSO, and identity services',
      lastUpdated: new Date(),
      responseTime: 90,
      uptime: 99.97
    },
    {
      id: 'storage',
      name: 'Storage Services',
      status: 'degraded',
      description: 'Object storage and file management',
      lastUpdated: new Date(Date.now() - 3600000), // 1 hour ago
      responseTime: 250,
      uptime: 98.5
    },
    {
      id: 'ml-services',
      name: 'ML Processing',
      status: 'operational',
      description: 'Machine learning inference services',
      lastUpdated: new Date(),
      responseTime: 180,
      uptime: 99.5
    }
  ];
}

function getSampleIncidents(): Incident[] {
  return [
    {
      id: '1',
      title: 'Storage Service Degraded Performance',
      description: 'Our object storage service is experiencing increased latency affecting file uploads and downloads.',
      status: 'monitoring',
      affectedServices: ['storage'],
      createdAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
      updatedAt: new Date(Date.now() - 1800000), // 30 minutes ago
      updates: [
        {
          timestamp: new Date(Date.now() - 3600000 * 5), // 5 hours ago
          status: 'investigating',
          message: 'We are investigating reports of slow file uploads and downloads.'
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 3), // 3 hours ago
          status: 'identified',
          message: 'We have identified a network issue affecting our storage cluster.'
        },
        {
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          status: 'monitoring',
          message: 'Our engineering team has implemented a fix and we are monitoring the system. Performance should gradually improve over the next hour.'
        }
      ]
    },
    {
      id: '2',
      title: 'API Rate Limiting Issue',
      description: 'Some users experienced incorrect rate limiting on the Content API.',
      status: 'resolved',
      affectedServices: ['api'],
      createdAt: new Date(Date.now() - 3600000 * 24 * 2), // 2 days ago
      updatedAt: new Date(Date.now() - 3600000 * 24 * 1.5), // 1.5 days ago
      resolvedAt: new Date(Date.now() - 3600000 * 24 * 1.5), // 1.5 days ago
      updates: [
        {
          timestamp: new Date(Date.now() - 3600000 * 24 * 2), // 2 days ago
          status: 'investigating',
          message: 'We are investigating reports of incorrect rate limiting on the Content API.'
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 24 * 1.8), // 1.8 days ago
          status: 'identified',
          message: 'We have identified a configuration issue in our rate limiting service.'
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 24 * 1.5), // 1.5 days ago
          status: 'resolved',
          message: 'The issue has been resolved and all API rate limits are now functioning correctly.'
        }
      ]
    }
  ];
} 