import React, { useState } from 'react';
import { Button } from '../ui/button';
import { PlusCircle, CreditCard, Bank, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '../ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { PaymentMethod } from './PaymentMethodCard';

export interface AddPaymentButtonProps {
  /**
   * Callback function when a new payment method is added
   */
  onPaymentMethodAdded: (paymentMethod: PaymentMethod) => void;
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Option to override default button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to disable the button
   */
  disabled?: boolean;
  /**
   * Whether to show the button in a loading state
   */
  isLoading?: boolean;
  /**
   * Optional custom label for the button
   */
  label?: string;
  /**
   * Optional tooltip text
   */
  tooltip?: string;
}

// Credit card form validation schema
const creditCardSchema = z.object({
  cardNumber: z.string()
    .min(13, 'Card number must be at least 13 digits')
    .max(19, 'Card number cannot exceed 19 digits')
    .regex(/^\d+$/, 'Card number must contain only digits'),
  cardholderName: z.string().min(2, 'Cardholder name is required'),
  expiryMonth: z.string()
    .min(1, 'Month is required')
    .max(2, 'Invalid month')
    .refine(val => {
      const month = parseInt(val, 10);
      return month >= 1 && month <= 12;
    }, 'Month must be between 1 and 12'),
  expiryYear: z.string()
    .min(2, 'Year is required')
    .max(4, 'Invalid year')
    .refine(val => {
      const currentYear = new Date().getFullYear();
      const year = parseInt(val.length === 2 ? `20${val}` : val, 10);
      return year >= currentYear;
    }, 'Cannot use an expired card'),
  cvv: z.string()
    .min(3, 'CVV must be 3 or 4 digits')
    .max(4, 'CVV must be 3 or 4 digits')
    .regex(/^\d+$/, 'CVV must contain only digits'),
});

// Bank account form validation schema
const bankAccountSchema = z.object({
  accountName: z.string().min(2, 'Account holder name is required'),
  routingNumber: z.string()
    .min(9, 'Routing number must be 9 digits')
    .max(9, 'Routing number must be 9 digits')
    .regex(/^\d+$/, 'Routing number must contain only digits'),
  accountNumber: z.string()
    .min(4, 'Account number is required')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  accountType: z.enum(['checking', 'savings'], {
    invalid_type_error: 'Please select an account type',
  }),
});

/**
 * AddPaymentButton - Button to open a dialog for adding new payment methods
 */
export const AddPaymentButton: React.FC<AddPaymentButtonProps> = ({
  onPaymentMethodAdded,
  className = '',
  size = 'sm',
  disabled = false,
  isLoading = false,
  label = 'Add Payment Method',
  tooltip = 'Add a new payment method'
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Create form for credit card
  const creditCardForm = useForm<z.infer<typeof creditCardSchema>>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      cardNumber: '',
      cardholderName: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
    },
  });
  
  // Create form for bank account
  const bankAccountForm = useForm<z.infer<typeof bankAccountSchema>>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountName: '',
      routingNumber: '',
      accountNumber: '',
      accountType: 'checking',
    },
  });
  
  // Handle credit card form submission
  const onCreditCardSubmit = (data: z.infer<typeof creditCardSchema>) => {
    setIsSubmitting(true);
    
    // In a real app, this would call an API to process the payment method
    setTimeout(() => {
      // Create a new payment method object
      const newPaymentMethod: PaymentMethod = {
        id: `card-${Date.now()}`,
        type: 'card',
        last4: data.cardNumber.slice(-4),
        brand: detectCardType(data.cardNumber),
        expMonth: parseInt(data.expiryMonth, 10),
        expYear: parseInt(data.expiryYear.length === 2 ? `20${data.expiryYear}` : data.expiryYear, 10),
        isDefault: false,
        addedAt: new Date(),
      };
      
      onPaymentMethodAdded(newPaymentMethod);
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Close dialog and reset form after a delay
      setTimeout(() => {
        setOpen(false);
        setIsSuccess(false);
        creditCardForm.reset();
      }, 1500);
    }, 1000);
  };
  
  // Handle bank account form submission
  const onBankAccountSubmit = (data: z.infer<typeof bankAccountSchema>) => {
    setIsSubmitting(true);
    
    // In a real app, this would call an API to process the payment method
    setTimeout(() => {
      // Create a new payment method object
      const newPaymentMethod: PaymentMethod = {
        id: `bank-${Date.now()}`,
        type: 'bank',
        last4: data.accountNumber.slice(-4),
        isDefault: false,
        addedAt: new Date(),
      };
      
      onPaymentMethodAdded(newPaymentMethod);
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Close dialog and reset form after a delay
      setTimeout(() => {
        setOpen(false);
        setIsSuccess(false);
        bankAccountForm.reset();
      }, 1500);
    }, 1000);
  };
  
  // Detect credit card type based on the number
  const detectCardType = (cardNumber: string): string => {
    // Very simple detection - would be more comprehensive in a real app
    if (cardNumber.startsWith('4')) {
      return 'Visa';
    } else if (/^5[1-5]/.test(cardNumber)) {
      return 'Mastercard';
    } else if (/^3[47]/.test(cardNumber)) {
      return 'American Express';
    } else if (/^6(?:011|5)/.test(cardNumber)) {
      return 'Discover';
    }
    return 'Card';
  };
  
  // Format credit card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  // Handle dialog close - reset forms and state
  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setActiveTab('card');
      setIsSuccess(false);
      creditCardForm.reset();
      bankAccountForm.reset();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled || isLoading}
          title={tooltip}
          aria-label={label}
        >
          {isLoading ? (
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-medium">Payment Method Added</h3>
            <p className="text-sm text-gray-500 mt-2">
              Your payment method has been added successfully.
            </p>
          </div>
        ) : (
          <div className="py-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4 w-full">
                <TabsTrigger value="card" className="flex gap-2 items-center">
                  <CreditCard className="h-4 w-4" />
                  Credit Card
                </TabsTrigger>
                <TabsTrigger value="bank" className="flex gap-2 items-center">
                  <Bank className="h-4 w-4" />
                  Bank Account
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="card">
                <Form {...creditCardForm}>
                  <form onSubmit={creditCardForm.handleSubmit(onCreditCardSubmit)} className="space-y-4">
                    <FormField
                      control={creditCardForm.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="4242 4242 4242 4242" 
                              {...field}
                              onChange={(e) => {
                                const formattedValue = formatCardNumber(e.target.value);
                                field.onChange(formattedValue);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={creditCardForm.control}
                      name="cardholderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cardholder Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={creditCardForm.control}
                        name="expiryMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Month</FormLabel>
                            <FormControl>
                              <Input placeholder="MM" maxLength={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={creditCardForm.control}
                        name="expiryYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Year</FormLabel>
                            <FormControl>
                              <Input placeholder="YY" maxLength={4} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={creditCardForm.control}
                        name="cvv"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CVV</FormLabel>
                            <FormControl>
                              <Input placeholder="123" maxLength={4} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <DialogFooter className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                            Processing...
                          </>
                        ) : (
                          'Add Card'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="bank">
                <Form {...bankAccountForm}>
                  <form onSubmit={bankAccountForm.handleSubmit(onBankAccountSubmit)} className="space-y-4">
                    <FormField
                      control={bankAccountForm.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={bankAccountForm.control}
                      name="routingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Routing Number</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" maxLength={9} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={bankAccountForm.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={bankAccountForm.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <div className="flex gap-4">
                            <Label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={field.value === 'checking'}
                                onChange={() => field.onChange('checking')}
                                className="h-4 w-4"
                              />
                              Checking
                            </Label>
                            <Label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={field.value === 'savings'}
                                onChange={() => field.onChange('savings')}
                                className="h-4 w-4"
                              />
                              Savings
                            </Label>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                            Processing...
                          </>
                        ) : (
                          'Add Bank Account'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500">
                Your payment information is stored securely.
                <br />
                We do not store your full card details on our servers.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentButton; 