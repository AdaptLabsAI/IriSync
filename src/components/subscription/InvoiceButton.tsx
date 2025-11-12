import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button';
import { Download, FileText, Printer, LoaderCircle, Mail } from 'lucide-react';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '../ui/dropdown';

export interface InvoiceButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Invoice ID
   */
  invoiceId: string;
  /**
   * Invoice number for display
   */
  invoiceNumber: string;
  /**
   * Callbacks for different actions
   */
  onDownload?: (invoiceId: string, format: 'pdf' | 'csv') => Promise<void>;
  onView?: (invoiceId: string) => Promise<void>;
  onPrint?: (invoiceId: string) => Promise<void>;
  onEmail?: (invoiceId: string) => Promise<void>;
  /**
   * Whether to show extended options (print, email)
   */
  showExtendedOptions?: boolean;
  /**
   * Whether to show as icon-only button
   */
  iconOnly?: boolean;
}

/**
 * InvoiceButton - Component for invoice download/view actions
 */
const InvoiceButton: React.FC<InvoiceButtonProps> = ({
  invoiceId,
  invoiceNumber,
  onDownload,
  onView,
  onPrint,
  onEmail,
  showExtendedOptions = false,
  iconOnly = false,
  variant = "outline",
  size = "sm",
  className = '',
  disabled,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = async (action: string, callback?: (id: string, format?: 'pdf' | 'csv') => Promise<void>, format?: 'pdf' | 'csv') => {
    if (disabled || isLoading || !callback) return;
    
    setIsLoading(true);
    setActiveAction(action);
    
    try {
      if (action === 'download') {
        await callback(invoiceId, format);
      } else {
        await callback(invoiceId);
      }
    } catch (error) {
      console.error(`Error with invoice action ${action}:`, error);
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // If we only have download functionality, render a simple button
  if (!showExtendedOptions && !onView && onDownload) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        onClick={() => handleAction('download', onDownload, 'pdf')}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {!iconOnly && <span>Download</span>}
      </Button>
    );
  }

  // Otherwise, render a dropdown with options
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled || isLoading}
          {...props}
        >
          {isLoading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {!iconOnly && (
            <span>
              {activeAction 
                ? `${activeAction.charAt(0).toUpperCase() + activeAction.slice(1)}ing...` 
                : `Invoice ${invoiceNumber}`}
            </span>
          )}
        </Button>
      </DropdownTrigger>
      <DropdownMenu>
        {onView && (
          <DropdownItem onClick={() => handleAction('view', onView)}>
            <FileText className="h-4 w-4 mr-2" />
            View Invoice
          </DropdownItem>
        )}
        {onDownload && (
          <>
            <DropdownItem onClick={() => handleAction('download', onDownload, 'pdf')}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownItem>
            <DropdownItem onClick={() => handleAction('download', onDownload, 'csv')}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </DropdownItem>
          </>
        )}
        {showExtendedOptions && onPrint && (
          <DropdownItem onClick={() => handleAction('print', onPrint)}>
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </DropdownItem>
        )}
        {showExtendedOptions && onEmail && (
          <DropdownItem onClick={() => handleAction('email', onEmail)}>
            <Mail className="h-4 w-4 mr-2" />
            Email Invoice
          </DropdownItem>
        )}
      </DropdownMenu>
    </Dropdown>
  );
};

export default InvoiceButton; 