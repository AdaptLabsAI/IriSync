import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import InvoiceButton from './InvoiceButton';

export type PaymentStatus = 
  | 'paid' 
  | 'failed' 
  | 'pending' 
  | 'refunded' 
  | 'partially_refunded';

export interface BillingHistoryItemProps {
  /**
   * Invoice or payment ID
   */
  id: string;
  /**
   * Display invoice number
   */
  invoiceNumber: string;
  /**
   * Date of the invoice/payment
   */
  date: Date | string;
  /**
   * Amount in cents
   */
  amount: number;
  /**
   * Currency code (USD, EUR, etc.)
   */
  currency: string;
  /**
   * Payment status
   */
  status: PaymentStatus;
  /**
   * Description (plan name, etc.)
   */
  description: string;
  /**
   * Payment method (last 4 digits, type)
   */
  paymentMethod?: string;
  /**
   * Callbacks for invoice actions
   */
  onDownload?: (invoiceId: string, format: 'pdf' | 'csv') => Promise<void>;
  onView?: (invoiceId: string) => Promise<void>;
  /**
   * Optional CSS class
   */
  className?: string;
}

/**
 * BillingHistoryItem - Component to display a single invoice or payment in a billing history list
 */
const BillingHistoryItem: React.FC<BillingHistoryItemProps> = ({
  id,
  invoiceNumber,
  date,
  amount,
  currency,
  status,
  description,
  paymentMethod,
  onDownload,
  onView,
  className = '',
}) => {
  // Format date
  const formattedDate = typeof date === 'string' 
    ? date 
    : format(date, 'MMM dd, yyyy');
  
  // Format amount
  const formattedAmount = (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency,
  });

  // Get status color and icon
  const getStatusDetails = () => {
    switch (status) {
      case 'paid':
        return { color: 'text-green-600', bg: 'bg-green-50', icon: <CheckCircle className="h-4 w-4" /> };
      case 'failed':
        return { color: 'text-red-600', bg: 'bg-red-50', icon: <XCircle className="h-4 w-4" /> };
      case 'pending':
        return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: <AlertCircle className="h-4 w-4" /> };
      case 'refunded':
        return { color: 'text-blue-600', bg: 'bg-blue-50', icon: <CheckCircle className="h-4 w-4" /> };
      case 'partially_refunded':
        return { color: 'text-blue-600', bg: 'bg-blue-50', icon: <CheckCircle className="h-4 w-4" /> };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', icon: <AlertCircle className="h-4 w-4" /> };
    }
  };

  const { color, bg, icon } = getStatusDetails();
  
  const statusText = {
    paid: 'Paid',
    failed: 'Failed',
    pending: 'Pending',
    refunded: 'Refunded',
    partially_refunded: 'Partially Refunded'
  }[status];

  return (
    <div className={`border-t border-gray-200 py-4 flex flex-col sm:flex-row justify-between ${className}`}>
      <div className="flex-1 mb-2 sm:mb-0">
        <div className="flex items-start">
          <div className="flex-1">
            <p className="font-medium">{description}</p>
            <p className="text-sm text-gray-500">Invoice #{invoiceNumber}</p>
            <p className="text-xs text-gray-400">{formattedDate}</p>
            {paymentMethod && (
              <p className="text-xs text-gray-400 mt-1">Paid with {paymentMethod}</p>
            )}
          </div>
          <div className="ml-4 text-right">
            <p className="font-medium">{formattedAmount}</p>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bg} ${color} mt-1`}>
              {icon}
              <span className="ml-1">{statusText}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 mt-2 sm:mt-0">
        <InvoiceButton
          invoiceId={id}
          invoiceNumber={invoiceNumber}
          onDownload={onDownload}
          onView={onView}
          size="sm"
          variant="ghost"
        />
      </div>
    </div>
  );
};

export default BillingHistoryItem; 