import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { BillingType, EnterpriseQuoteRequest } from '../../lib/subscription/EnterpriseQuoteService';
import { useRouter } from 'next/router';

interface EnterpriseFeatureAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  isOneTime: boolean;
}

interface EnterpriseQuoteFormProps {
  availableAddOns: EnterpriseFeatureAddOn[];
  initialData?: Partial<EnterpriseQuoteRequest>;
  onSubmit: (data: EnterpriseQuoteRequest) => Promise<void>;
  isEditing?: boolean;
}

const quoteFormSchema = yup.object().shape({
  contactName: yup.string().required('Contact name is required'),
  contactEmail: yup.string().email('Invalid email').required('Contact email is required'),
  companyName: yup.string().required('Company name is required'),
  seats: yup.number().integer().min(1).required('Number of seats is required'),
  basePrice: yup.number().min(0).nullable(),
  seatPrice: yup.number().min(0).nullable(),
  discountPercentage: yup.number().min(0).max(100).nullable(),
  billingType: yup.string().oneOf(Object.values(BillingType)).required('Billing type is required'),
  customBillingCycle: yup.number().integer().min(30).when('billingType', {
    is: BillingType.CUSTOM,
    then: (schema) => schema.required('Custom billing cycle is required')
  }),
  notes: yup.string().nullable(),
  customTerms: yup.string().nullable(),
  validForDays: yup.number().integer().min(1).max(90).nullable()
});

export default function EnterpriseQuoteForm({
  availableAddOns,
  initialData = {},
  onSubmit,
  isEditing = false
}: EnterpriseQuoteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<{
    id: string;
    quantity: number;
  }[]>(initialData.addOns || []);
  
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(quoteFormSchema),
    defaultValues: {
      contactName: initialData.contactName || '',
      contactEmail: initialData.contactEmail || '',
      companyName: initialData.companyName || '',
      seats: initialData.seats || 5,
      basePrice: initialData.basePrice || 1250,
      seatPrice: initialData.seatPrice || 150,
      discountPercentage: initialData.discountPercentage || 0,
      billingType: initialData.billingType || BillingType.ANNUAL,
      customBillingCycle: initialData.customBillingCycle || 90,
      notes: initialData.notes || '',
      customTerms: initialData.customTerms || '',
      validForDays: initialData.validForDays || 30
    }
  });
  
  const billingType = watch('billingType');
  const seats = watch('seats');
  const basePrice = watch('basePrice');
  const seatPrice = watch('seatPrice');
  const discountPercentage = watch('discountPercentage');
  
  // Calculate estimated price
  const calculateEstimatedPrice = () => {
    const base = basePrice || 1250; // Base price includes first 5 seats
    const perSeat = seatPrice || 150; // Price per additional seat beyond 5
    const discount = discountPercentage || 0;
    
    // Only charge for seats beyond the included 5
    const includedSeats = 5;
    let totalSeatsPrice = 0;
    if (seats > includedSeats) {
      totalSeatsPrice = (seats - includedSeats) * perSeat;
    }
    
    let addOnTotal = 0;
    selectedAddOns.forEach(addon => {
      const addOnData = availableAddOns.find(a => a.id === addon.id);
      if (addOnData) {
        addOnTotal += addOnData.price * addon.quantity;
      }
    });
    
    const subtotal = base + totalSeatsPrice + addOnTotal;
    const discountAmount = (subtotal * discount) / 100;
    
    return subtotal - discountAmount;
  };
  
  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    
    try {
      // Add selected add-ons to the data
      const data: EnterpriseQuoteRequest = {
        ...formData,
        addOns: selectedAddOns
      };
      
      await onSubmit(data);
      
      // Redirect to quotes list or show success message
      if (!isEditing) {
        router.push('/dashboard/settings/billing/quotes');
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      // Would normally show error toast/notification here
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddOnToggle = (addonId: string) => {
    // Check if add-on is already selected
    const existingIndex = selectedAddOns.findIndex(addon => addon.id === addonId);
    
    if (existingIndex >= 0) {
      // Remove add-on
      setSelectedAddOns(selectedAddOns.filter(addon => addon.id !== addonId));
    } else {
      // Add add-on with quantity 1
      setSelectedAddOns([...selectedAddOns, { id: addonId, quantity: 1 }]);
    }
  };
  
  const handleQuantityChange = (addonId: string, quantity: number) => {
    setSelectedAddOns(selectedAddOns.map(addon => 
      addon.id === addonId ? { ...addon, quantity } : addon
    ));
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? 'Edit Enterprise Quote' : 'Request Enterprise Quote'}
      </h2>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Name
              </label>
              <input
                type="text"
                {...register('contactName')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.contactName && (
                <p className="mt-1 text-sm text-red-600">{errors.contactName.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Email
              </label>
              <input
                type="email"
                {...register('contactEmail')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.contactEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.contactEmail.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                {...register('companyName')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
              )}
            </div>
          </div>
          
          {/* Subscription Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Subscription Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Number of Seats
              </label>
              <input
                type="number"
                min="1"
                {...register('seats')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.seats && (
                <p className="mt-1 text-sm text-red-600">{errors.seats.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Billing Type
              </label>
              <select
                {...register('billingType')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value={BillingType.MONTHLY}>Monthly</option>
                <option value={BillingType.ANNUAL}>Annual</option>
                <option value={BillingType.QUARTERLY}>Quarterly</option>
                <option value={BillingType.CUSTOM}>Custom</option>
              </select>
              {errors.billingType && (
                <p className="mt-1 text-sm text-red-600">{errors.billingType.message}</p>
              )}
            </div>
            
            {billingType === BillingType.CUSTOM && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Custom Billing Cycle (days)
                </label>
                <input
                  type="number"
                  min="30"
                  {...register('customBillingCycle')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.customBillingCycle && (
                  <p className="mt-1 text-sm text-red-600">{errors.customBillingCycle.message}</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Add-ons */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-medium">Add-ons and Features</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableAddOns.map(addon => {
              const isSelected = selectedAddOns.some(a => a.id === addon.id);
              const selectedAddon = selectedAddOns.find(a => a.id === addon.id);
              
              return (
                <div 
                  key={addon.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id={`addon-${addon.id}`}
                      checked={isSelected}
                      onChange={() => handleAddOnToggle(addon.id)}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <label htmlFor={`addon-${addon.id}`} className="block text-sm font-medium text-gray-900">
                        {addon.name}
                      </label>
                      <p className="text-sm text-gray-500">{addon.description}</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        ${addon.price} {addon.isOneTime ? '(one-time)' : '/ billing period'}
                      </p>
                      
                      {isSelected && (
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-700">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={selectedAddon?.quantity || 1}
                            onChange={(e) => handleQuantityChange(addon.id, parseInt(e.target.value) || 1)}
                            className="mt-1 block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Custom Quote Details (only visible for sales/admin users) */}
        {initialData.salesRepId && (
          <div className="space-y-4 mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium">Custom Quote Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Base Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('basePrice')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.basePrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.basePrice.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Per-Seat Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('seatPrice')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.seatPrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.seatPrice.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('discountPercentage')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.discountPercentage && (
                  <p className="mt-1 text-sm text-red-600">{errors.discountPercentage.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quote Valid For (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  {...register('validForDays')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.validForDays && (
                  <p className="mt-1 text-sm text-red-600">{errors.validForDays.message}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Additional Notes */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-medium">Additional Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes (visible to customer)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Any specific requirements or information about your needs..."
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>
          
          {initialData.salesRepId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Custom Terms (visible to customer)
              </label>
              <textarea
                {...register('customTerms')}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Special terms or conditions for this enterprise deal..."
              />
              {errors.customTerms && (
                <p className="mt-1 text-sm text-red-600">{errors.customTerms.message}</p>
              )}
            </div>
          )}
        </div>
        
        {/* Price Estimate */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Estimated Price</h3>
              <p className="text-sm text-gray-500">
                {billingType === BillingType.MONTHLY ? 'Monthly' : 
                 billingType === BillingType.ANNUAL ? 'Annual' : 
                 billingType === BillingType.QUARTERLY ? 'Quarterly' : 'Custom'} 
                billing
              </p>
            </div>
            <div className="text-2xl font-bold">${calculateEstimatedPrice().toFixed(2)}</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This is an estimate only. Final pricing will be confirmed by our sales team.
          </p>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-5 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : isEditing ? 'Update Quote' : 'Request Quote'}
          </button>
        </div>
      </form>
    </div>
  );
} 