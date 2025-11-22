import React, { useState } from 'react';
import { Button } from '../ui/button';
import { FileText, Plus, SaveAll, Loader, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { MetricGroup } from './MetricFilterToggle';

export interface CustomReport {
  /**
   * Report ID (if already saved)
   */
  id?: string;
  /**
   * Report name
   */
  name: string;
  /**
   * Report description
   */
  description?: string;
  /**
   * Selected metrics
   */
  metrics: string[];
  /**
   * Display columns
   */
  columns: string[];
  /**
   * Whether the report is shared with team
   */
  isShared: boolean;
}

export interface CustomReportButtonProps {
  /**
   * Available metric groups for selection
   */
  availableMetrics: MetricGroup[];
  /**
   * Available columns for display
   */
  availableColumns: { id: string; name: string }[];
  /**
   * User's current subscription tier
   */
  userTier: 'creator' | 'influencer' | 'enterprise';
  /**
   * Existing reports for editing
   */
  existingReports?: CustomReport[];
  /**
   * Callback when a report is saved
   */
  onSaveReport: (report: CustomReport) => Promise<CustomReport>;
  /**
   * Callback when creating a new report from current view
   */
  onCreateFromCurrent?: () => Promise<Partial<CustomReport>>;
  /**
   * Optional variant
   */
  variant?: 'primary' | 'outline' | 'ghost';
  /**
   * Optional size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show as icon-only button
   */
  iconOnly?: boolean;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Optional CSS class
   */
  className?: string;
}

/**
 * CustomReportButton - Component for building and saving custom analytics reports
 */
const CustomReportButton: React.FC<CustomReportButtonProps> = ({
  availableMetrics,
  availableColumns,
  userTier,
  existingReports = [],
  onSaveReport,
  onCreateFromCurrent,
  variant = 'outline',
  size = 'sm',
  iconOnly = false,
  disabled = false,
  className = '',
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CustomReport | null>(null);
  
  const [newReport, setNewReport] = useState<CustomReport>({
    name: '',
    description: '',
    metrics: [],
    columns: [],
    isShared: false
  });
  
  // Check if custom reports are available for this tier
  const isFeatureAvailable = userTier === 'influencer' || userTier === 'enterprise';
  
  // Check if specific advanced metrics are available for this tier
  const isAdvancedMetricAvailable = userTier === 'enterprise';
  
  const handleCreateFromCurrent = async () => {
    if (!onCreateFromCurrent) return;
    
    setIsSubmitting(true);
    
    try {
      const currentData = await onCreateFromCurrent();
      setNewReport({
        ...newReport,
        ...currentData
      });
    } catch (error) {
      console.error("Error creating report from current view:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveReport = async (report: CustomReport) => {
    if (disabled || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await onSaveReport(report);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving custom report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSelectExistingReport = (report: CustomReport) => {
    setSelectedReport(report);
    setActiveTab('edit');
  };
  
  const handleToggleMetric = (metricId: string, checked: boolean) => {
    if (checked) {
      setNewReport({
        ...newReport,
        metrics: [...newReport.metrics, metricId]
      });
    } else {
      setNewReport({
        ...newReport,
        metrics: newReport.metrics.filter(id => id !== metricId)
      });
    }
  };
  
  const handleToggleColumn = (columnId: string, checked: boolean) => {
    if (checked) {
      setNewReport({
        ...newReport,
        columns: [...newReport.columns, columnId]
      });
    } else {
      setNewReport({
        ...newReport,
        columns: newReport.columns.filter(id => id !== columnId)
      });
    }
  };
  
  // Get the name of a metric from its ID
  const getMetricName = (metricId: string): string => {
    for (const group of availableMetrics) {
      const metric = group.metrics.find((m: any) => m.id === metricId);
      if (metric) return metric.name;
    }
    return metricId;
  };
  
  // Get the name of a column from its ID
  const getColumnName = (columnId: string): string => {
    const column = availableColumns.find(c => c.id === columnId);
    return column ? column.name : columnId;
  };
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled || !isFeatureAvailable}
      >
        <FileText className="h-4 w-4" />
        {!iconOnly && <span>Custom Report</span>}
        {!isFeatureAvailable && <Lock className="h-3 w-3 ml-1" />}
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogTitle>Custom Reports</DialogTitle>
          
          {!isFeatureAvailable ? (
            <div className="p-4 text-center">
              <Lock className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="font-medium">Feature Not Available</p>
              <p className="text-sm text-gray-500 mt-1">
                Custom reports require Influencer or Enterprise tier.
              </p>
              <Button 
                variant="primary" 
                className="mt-4"
                onClick={() => setIsDialogOpen(false)}
              >
                Upgrade Plan
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="create">Create Report</TabsTrigger>
                <TabsTrigger value="saved" disabled={existingReports.length === 0}>
                  My Reports ({existingReports.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-4">
                {onCreateFromCurrent && (
                  <Button
                    variant="outline"
                    size="small"
                    className="w-full mb-4"
                    onClick={handleCreateFromCurrent}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create from Current View
                  </Button>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    value={newReport.name}
                    onChange={(e: any) => setNewReport({ ...newReport, name: e.target.value })}
                    placeholder="Monthly Performance Report"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="report-description">Description (Optional)</Label>
                  <Input
                    id="report-description"
                    value={newReport.description || ''}
                    onChange={(e: any) => setNewReport({ ...newReport, description: e.target.value })}
                    placeholder="Track monthly performance across all platforms"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="block mb-2">Select Metrics</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                    {availableMetrics.map((group) => (
                      <div key={group.id} className="mb-3">
                        <h4 className="font-medium text-sm mb-1">{group.name}</h4>
                        <div className="ml-2 space-y-1">
                          {group.metrics.map((metric: any) => {
                            const isAdvanced = metric.tier === 'enterprise';
                            const isDisabled = isAdvanced && !isAdvancedMetricAvailable;
                            
                            return (
                              <div key={metric.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`metric-${metric.id}`}
                                  checked={newReport.metrics.includes(metric.id)}
                                  onCheckedChange={(checked: any) => 
                                    !isDisabled && handleToggleMetric(metric.id, checked as boolean)
                                  }
                                  disabled={isDisabled}
                                />
                                <Label 
                                  htmlFor={`metric-${metric.id}`} 
                                  className={`text-sm cursor-pointer ${isDisabled ? 'opacity-50' : ''}`}
                                >
                                  {metric.name}
                                  {isDisabled && <Lock className="h-3 w-3 ml-1 inline" />}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="block mb-2">Display Columns</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-1">
                      {availableColumns.map((column) => (
                        <div key={column.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`column-${column.id}`}
                            checked={newReport.columns.includes(column.id)}
                            onCheckedChange={(checked: any) => 
                              handleToggleColumn(column.id, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`column-${column.id}`} 
                            className="text-sm cursor-pointer"
                          >
                            {column.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="share-report"
                    checked={newReport.isShared}
                    onCheckedChange={(checked: any) => 
                      setNewReport({ ...newReport, isShared: checked as boolean })
                    }
                  />
                  <Label htmlFor="share-report" className="text-sm cursor-pointer">
                    Share with team members
                  </Label>
                </div>
                
                <div className="flex justify-end mt-4">
                  <DialogClose asChild>
                    <Button variant="outline" className="mr-2">Cancel</Button>
                  </DialogClose>
                  <Button
                    variant="primary"
                    onClick={() => handleSaveReport(newReport)}
                    disabled={isSubmitting || !newReport.name || newReport.metrics.length === 0}
                  >
                    {isSubmitting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Report
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="saved" className="space-y-4">
                {existingReports.length === 0 ? (
                  <div className="text-center p-6">
                    <p className="text-gray-500">No saved reports yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {existingReports.map((report) => (
                      <div 
                        key={report.id} 
                        className="border rounded-md p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectExistingReport(report)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{report.name}</h4>
                            {report.description && (
                              <p className="text-sm text-gray-500">{report.description}</p>
                            )}
                          </div>
                          {report.isShared && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              Shared
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            <strong>Metrics:</strong> {report.metrics.slice(0, 3).map(m => getMetricName(m)).join(', ')}
                            {report.metrics.length > 3 && ` + ${report.metrics.length - 3} more`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedReport && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">{selectedReport.name}</h4>
                    {selectedReport.description && (
                      <p className="text-sm text-gray-500 mb-3">{selectedReport.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <h5 className="text-sm font-medium mb-1">Metrics</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {selectedReport.metrics.map((metricId) => (
                            <li key={metricId}>{getMetricName(metricId)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium mb-1">Columns</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {selectedReport.columns.map((columnId) => (
                            <li key={columnId}>{getColumnName(columnId)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <Button
                        variant="outline"
                        className="mr-2"
                        onClick={() => setSelectedReport(null)}
                      >
                        Back
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => handleSaveReport(selectedReport)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                        Run Report
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomReportButton; 