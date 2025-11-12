import React, { useState } from 'react';
import { Card, CardBody } from '../ui/card';
import { Button } from '../ui/button/Button';
import Dialog from '../ui/dialog';

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'paypal' | 'bank_account';
  isDefault: boolean;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cardBrand?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  name?: string;
  email?: string;
  bankName?: string;
  accountLastFour?: string;
}

interface PaymentMethodCardProps {
  /**
   * Payment method data
   */
  paymentMethod: PaymentMethod;
  /**
   * Handler for making payment method default
   */
  onSetDefault?: (id: string) => Promise<void>;
  /**
   * Handler for deleting payment method
   */
  onDelete?: (id: string) => Promise<void>;
  /**
   * Handler for editing payment method
   */
  onEdit?: (id: string) => void;
  /**
   * Whether actions are disabled
   */
  isDisabled?: boolean;
  /**
   * Optional CSS class name
   */
  className?: string;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  onSetDefault,
  onDelete,
  onEdit,
  isDisabled = false,
  className = '',
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSetDefault = async () => {
    if (!onSetDefault || isDisabled || paymentMethod.isDefault) return;
    
    setIsLoading(true);
    try {
      await onSetDefault(paymentMethod.id);
    } catch (error) {
      console.error("Error setting default payment method:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isDisabled) return;
    
    setIsLoading(true);
    try {
      await onDelete(paymentMethod.id);
      setIsConfirmingDelete(false);
    } catch (error) {
      console.error("Error deleting payment method:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCardIcon = () => {
    switch (paymentMethod.cardBrand) {
      case 'visa':
        return '💳 Visa';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 American Express';
      case 'discover':
        return '💳 Discover';
      default:
        return '💳 Card';
    }
  };

  const renderPaymentMethodIcon = () => {
    switch (paymentMethod.type) {
      case 'credit_card':
        return renderCardIcon();
      case 'paypal':
        return '🅿️ PayPal';
      case 'bank_account':
        return '🏦 Bank Account';
      default:
        return '💰 Payment Method';
    }
  };

  const renderPaymentMethodDetails = () => {
    switch (paymentMethod.type) {
      case 'credit_card':
        const expiryDate = paymentMethod.expiryMonth && paymentMethod.expiryYear
          ? `${paymentMethod.expiryMonth.toString().padStart(2, '0')}/${paymentMethod.expiryYear.toString().slice(-2)}`
          : 'Unknown expiry';
        
        return (
          <div>
            <p className="font-medium">{renderCardIcon()}</p>
            <p className="text-sm">•••• {paymentMethod.lastFour}</p>
            <p className="text-xs text-gray-500">Expires {expiryDate}</p>
          </div>
        );
      
      case 'paypal':
        return (
          <div>
            <p className="font-medium">🅿️ PayPal</p>
            <p className="text-sm">{paymentMethod.email || 'No email available'}</p>
          </div>
        );
      
      case 'bank_account':
        return (
          <div>
            <p className="font-medium">🏦 {paymentMethod.bankName || 'Bank Account'}</p>
            <p className="text-sm">•••• {paymentMethod.accountLastFour || '****'}</p>
            <p className="text-xs text-gray-500">{paymentMethod.name || 'Account Holder'}</p>
          </div>
        );
      
      default:
        return <p>Unknown payment method</p>;
    }
  };

  return (
    <>
      <Card className={`${className} ${paymentMethod.isDefault ? 'border-blue-500' : ''}`}>
        <CardBody className="flex justify-between items-center p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full w-10 h-10 bg-gray-100 flex items-center justify-center text-lg">
              {paymentMethod.type === 'credit_card' && '💳'}
              {paymentMethod.type === 'paypal' && '🅿️'}
              {paymentMethod.type === 'bank_account' && '🏦'}
            </div>
            
            {renderPaymentMethodDetails()}
            
            {paymentMethod.isDefault && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                Default
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {!paymentMethod.isDefault && onSetDefault && (
              <Button
                onClick={handleSetDefault}
                disabled={isDisabled || isLoading}
                variant="outline"
                size="sm"
              >
                Set Default
              </Button>
            )}
            
            {onEdit && (
              <Button
                onClick={() => onEdit(paymentMethod.id)}
                disabled={isDisabled || isLoading}
                variant="outline"
                size="sm"
              >
                Edit
              </Button>
            )}
            
            {onDelete && (
              <Button
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isDisabled || isLoading || paymentMethod.isDefault}
                variant="outline"
                size="sm"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-red-500"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="p-4">
          <p className="mb-4">
            Are you sure you want to remove this payment method?
          </p>
          
          <div className="p-3 bg-gray-100 rounded-md mb-4">
            {renderPaymentMethodIcon()}
            {paymentMethod.type === 'credit_card' && ` ending in ${paymentMethod.lastFour}`}
            {paymentMethod.type === 'paypal' && ` (${paymentMethod.email})`}
            {paymentMethod.type === 'bank_account' && ` ending in ${paymentMethod.accountLastFour}`}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setIsConfirmingDelete(false)}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="primary"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : 'Remove'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default PaymentMethodCard; 