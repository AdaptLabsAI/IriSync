import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Download, FileText, Image, Loader, Lock } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown';

export type ExportFormat = 'pdf' | 'csv' | 'excel' | 'image';

export interface ExportReportButtonProps {
  /**
   * Report ID to export (if applicable)
   */
  reportId?: string;
  /**
   * Report name for display
   */
  reportName?: string;
  /**
   * Available export formats
   */
  availableFormats?: ExportFormat[];
  /**
   * Premium formats requiring higher tier
   */
  premiumFormats?: ExportFormat[];
  /**
   * User's subscription tier
   */
  userTier?: 'creator' | 'influencer' | 'enterprise';
  /**
   * Callback for export action
   */
  onExport: (format: ExportFormat) => Promise<void>;
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
   * Whether the button is loading
   */
  isLoading?: boolean;
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
 * ExportReportButton - Component to export analytics reports in different formats
 */
export const ExportReportButton: React.FC<ExportReportButtonProps> = ({
  reportId,
  reportName = 'Report',
  availableFormats = ['pdf', 'csv', 'excel', 'image'],
  premiumFormats = ['excel', 'image'],
  userTier = 'creator',
  onExport,
  variant = 'outline',
  size = 'sm',
  iconOnly = false,
  isLoading = false,
  disabled = false,
  className = '',
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [exporting, setExporting] = useState(false);

  // Check if user has access to a format based on their tier
  const hasAccessToFormat = (format: ExportFormat): boolean => {
    if (!premiumFormats.includes(format)) return true;
    
    // Premium formats require higher tiers
    return userTier === 'enterprise' || 
           (userTier === 'influencer' && format !== 'image');
  };

  const handleExport = async (format: ExportFormat) => {
    if (disabled || exporting || !hasAccessToFormat(format)) return;
    
    setExportFormat(format);
    setExporting(true);
    
    try {
      await onExport(format);
    } catch (error) {
      console.error(`Error exporting report as ${format}:`, error);
    } finally {
      setExporting(false);
      setExportFormat(null);
    }
  };

  // Format labels for UI
  const formatLabels: Record<ExportFormat, string> = {
    pdf: 'PDF Document',
    csv: 'CSV File',
    excel: 'Excel Spreadsheet',
    image: 'Image (PNG)'
  };

  // Format icons
  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'csv':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'excel':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'image':
        return <Image className="h-4 w-4 mr-2" />;
      default:
        return <Download className="h-4 w-4 mr-2" />;
    }
  };

  const isButtonLoading = isLoading || exporting;

  // If there's only one format, show a simple button
  if (availableFormats.length === 1 && hasAccessToFormat(availableFormats[0])) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        onClick={() => handleExport(availableFormats[0])}
        disabled={disabled || isButtonLoading}
      >
        {isButtonLoading ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {!iconOnly && <span>Export</span>}
      </Button>
    );
  }

  // Otherwise show dropdown with format options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled || isButtonLoading}
        >
          {isButtonLoading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {!iconOnly && (
            <span>
              {exporting && exportFormat
                ? `Exporting ${formatLabels[exportFormat].split(' ')[0]}...`
                : 'Export'}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="p-2 text-xs text-gray-500">Export {reportName}</div>
        {availableFormats.map((format) => {
          const hasAccess = hasAccessToFormat(format);
          return (
            <DropdownMenuItem
              key={format}
              disabled={!hasAccess}
              onClick={() => hasAccess && handleExport(format)}
              className={!hasAccess ? 'opacity-60' : ''}
            >
              {getFormatIcon(format)}
              <span>{formatLabels[format]}</span>
              {!hasAccess && <Lock className="h-3 w-3 ml-2 opacity-70" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportReportButton; 