'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button/Button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Database, Sprout, RefreshCw, Check, AlertTriangle } from 'lucide-react';

interface SeedingStatus {
  isSeeded: boolean;
  needsSeeding: boolean;
  existingCount: number;
  expectedCount: number;
  completionPercentage: number;
}

export default function DatabaseAdminPage() {
  const [status, setStatus] = useState<SeedingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  // Load seeding status
  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/seed-database');
      const data = await response.json();

      if (data.success) {
        setStatus(data.status);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load seeding status',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to the server',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Run database seeding
  const runSeeding = async (force = false) => {
    setSeeding(true);
    try {
      const response = await fetch('/api/admin/seed-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Seeded ${data.results.seededCount} configurations, skipped ${data.results.skippedCount}`,
          variant: 'default'
        });
        
        // Refresh status
        await loadStatus();
      } else {
        toast({
          title: 'Error',
          description: data.error || data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to seed database',
        variant: 'destructive'
      });
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const getStatusColor = () => {
    if (!status) return 'text-gray-500';
    if (status.isSeeded) return 'text-[#00CC44]';
    if (status.needsSeeding) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = () => {
    if (!status) return <Database className="h-6 w-6" />;
    if (status.isSeeded) return <Check className="h-6 w-6 text-[#00CC44]" />;
    if (status.needsSeeding) return <AlertTriangle className="h-6 w-6 text-red-600" />;
    return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading database status...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Management</h1>
        <p className="text-muted-foreground">
          Manage database initialization and seeding operations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Seeding Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon()}
              <span className="ml-2">AI Model Configurations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${getStatusColor()}`}>
                  {status?.isSeeded ? 'Fully Seeded' : 
                   status?.needsSeeding ? 'Needs Seeding' : 'Partially Seeded'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Configurations:</span>
                <span className="font-medium">
                  {status?.existingCount || 0} / {status?.expectedCount || 0}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Completion:</span>
                <span className="font-medium">
                  {status?.completionPercentage || 0}%
                </span>
              </div>

              {status && status.completionPercentage < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${status.completionPercentage}%` }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">              
                <Sprout className="h-5 w-5 mr-2" />              
                Seeding Actions            
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Initial Seed</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Add missing AI model configurations to the database. 
                  This will not overwrite existing configurations.
                </p>
                <Button 
                  onClick={() => runSeeding(false)}
                  disabled={seeding}
                  className="w-full"
                >
                  {seeding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>                      
                    <Sprout className="h-4 w-4 mr-2" />                      
                    Seed Database                    
                    </>
                  )}
                </Button>
              </div>

              <div>
                <h4 className="font-medium mb-2">Force Refresh</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Overwrite all configurations with default values. 
                  Use with caution as this will reset custom configurations.
                </p>
                <Button 
                  onClick={() => runSeeding(true)}
                  disabled={seeding}
                  variant="danger"
                  className="w-full"
                >
                  {seeding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Forcing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Force Refresh All
                    </>
                  )}
                </Button>
              </div>

              <div>
                <h4 className="font-medium mb-2">Refresh Status</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Check the current database status and refresh the display.
                </p>
                <Button 
                  onClick={loadStatus}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What is seeding?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Database seeding is the process of populating your database with initial data. 
              For AI model configurations, this includes setting up the default model assignments 
              for each subscription tier and task type, ensuring the AI system can function properly.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>When to seed?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Fresh deployment to Vercel or new environment</li>
              <li>• After adding new AI models or task types</li>
              <li>• When AI model configurations are missing</li>
              <li>• To restore default configurations after changes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 