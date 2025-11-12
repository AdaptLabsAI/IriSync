import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { MoreHorizontal, ZoomIn, ZoomOut, RefreshCw, Maximize2, X } from 'lucide-react';
import { VisualizationTypeButton, VisualizationType } from './VisualizationTypeButton';
import { ExportReportButton } from './ExportReportButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '../ui/dropdown';
import { Button } from '../ui/button';

export interface ChartContainerProps {
  /**
   * Chart title
   */
  title: string;
  /**
   * Optional chart description
   */
  description?: string;
  /**
   * Chart height in pixels
   */
  height?: number;
  /**
   * Available visualization types
   */
  availableTypes?: VisualizationType[];
  /**
   * Current visualization type
   */
  visualizationType?: VisualizationType;
  /**
   * Whether the chart is loading data
   */
  isLoading?: boolean;
  /**
   * Whether the chart has an error
   */
  hasError?: boolean;
  /**
   * Error message if there's an error
   */
  errorMessage?: string;
  /**
   * Callback when visualization type changes
   */
  onTypeChange?: (type: VisualizationType) => void;
  /**
   * Callback to refresh chart data
   */
  onRefresh?: () => void;
  /**
   * Callback to export chart data
   */
  onExport?: (format: 'pdf' | 'csv' | 'excel' | 'image') => Promise<void>;
  /**
   * User's subscription tier
   */
  userTier: 'creator' | 'influencer' | 'enterprise';
  /**
   * Whether the chart is maximizable
   */
  isMaximizable?: boolean;
  /**
   * Optional footer content
   */
  footerContent?: React.ReactNode;
  /**
   * Optional CSS class for additional styling
   */
  className?: string;
  /**
   * Children components (the chart itself)
   */
  children: React.ReactNode;
}

/**
 * ChartContainer - Wrapper component for charts with common functionality
 */
const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  height = 300,
  availableTypes = ['bar', 'line', 'pie'],
  visualizationType = 'bar',
  isLoading = false,
  hasError = false,
  errorMessage = 'An error occurred while loading the chart data.',
  onTypeChange,
  onRefresh,
  onExport,
  userTier,
  isMaximizable = true,
  footerContent,
  className = '',
  children,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  
  const handleZoomIn = () => {
    if (zoom < 150) setZoom(zoom + 10);
  };
  
  const handleZoomOut = () => {
    if (zoom > 50) setZoom(zoom - 10);
  };
  
  const handleResetZoom = () => {
    setZoom(100);
  };
  
  const containerStyle = {
    height: isFullscreen ? 'auto' : `${height}px`,
    transform: isFullscreen ? `scale(${zoom / 100})` : undefined,
    transformOrigin: 'center',
  };
  
  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      );
    }
    
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <X className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-sm text-gray-500">{errorMessage}</p>
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      );
    }
    
    return children;
  };
  
  const content = (
    <div className="relative" style={containerStyle}>
      {renderChart()}
    </div>
  );
  
  return (
    <>
      <Card className={`overflow-hidden ${className}`}>
        <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          
          <div className="flex items-center gap-2">
            {onTypeChange && (
              <VisualizationTypeButton
                currentType={visualizationType}
                availableTypes={availableTypes}
                onTypeChange={onTypeChange}
                userTier={userTier}
                size="sm"
                iconOnly
              />
            )}
            
            {onExport && (
              <ExportReportButton
                reportName={title}
                onExport={onExport}
                userTier={userTier}
                size="sm"
                iconOnly
              />
            )}
            
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownTrigger>
              
              <DropdownMenu>
                {onRefresh && (
                  <DropdownItem onClick={onRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </DropdownItem>
                )}
                
                {isMaximizable && (
                  <DropdownItem onClick={() => setIsFullscreen(true)}>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Expand
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-0">
          {content}
        </CardContent>
        
        {footerContent && (
          <CardFooter className="px-4 py-2 border-t">
            {footerContent}
          </CardFooter>
        )}
      </Card>
      
      {isMaximizable && (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>{title}</DialogTitle>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                
                <span className="text-sm px-2">{zoom}%</span>
                
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                
                <Button variant="outline" size="sm" onClick={handleResetZoom}>
                  Reset
                </Button>
                
                <DialogClose asChild>
                  <Button variant="ghost" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto p-4">
              {content}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ChartContainer; 