import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Calendar, ArrowRightLeft, Loader, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RadioGroup, RadioGroupItem } from '../ui/radio';
import { Label } from '../ui/form';
import { DateRange } from './DateRangeSelector';
import { DatePicker } from '../ui/date-picker';

export type ComparisonType = 'previous_period' | 'same_period_last_year' | 'custom_period';

export interface ComparisonPeriod {
  /**
   * Current date range being analyzed
   */
  currentPeriod: DateRange;
  /**
   * Comparison date range
   */
  comparisonPeriod: DateRange;
  /**
   * Type of comparison
   */
  comparisonType: ComparisonType;
}

export interface ComparePeriodsButtonProps {
  /**
   * Current date range
   */
  currentPeriod: DateRange;
  /**
   * Whether a comparison is currently active
   */
  isComparisonActive?: boolean;
  /**
   * Current comparison period (if active)
   */
  currentComparison?: ComparisonPeriod;
  /**
   * User's subscription tier
   */
  userTier: 'creator' | 'influencer' | 'enterprise';
  /**
   * Callback when comparison is set or changed
   */
  onComparisonChange: (comparison: ComparisonPeriod | null) => void;
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
 * ComparePeriodsButton - Component for comparing data between different time periods
 */
const ComparePeriodsButton: React.FC<ComparePeriodsButtonProps> = ({
  currentPeriod,
  isComparisonActive = false,
  currentComparison,
  userTier,
  onComparisonChange,
  variant = 'outline',
  size = 'sm',
  iconOnly = false,
  disabled = false,
  className = '',
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('preset');
  const [comparisonType, setComparisonType] = useState<ComparisonType>(
    currentComparison?.comparisonType || 'previous_period'
  );
  const [customPeriod, setCustomPeriod] = useState<DateRange>(
    currentComparison?.comparisonPeriod || {
      from: new Date(new Date().setDate(new Date().getDate() - 60)),
      to: new Date(new Date().setDate(new Date().getDate() - 30))
    }
  );
  
  // Check if period comparison is available for this tier
  const isFeatureAvailable = userTier !== 'creator';
  
  // Get comparison period based on type
  const getComparisonPeriod = (type: ComparisonType, current: DateRange): DateRange => {
    const currentFrom = new Date(current.from);
    const currentTo = new Date(current.to);
    const rangeDays = Math.round((currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (type) {
      case 'previous_period': {
        const from = new Date(currentFrom);
        const to = new Date(currentTo);
        from.setDate(from.getDate() - rangeDays - 1);
        to.setDate(to.getDate() - rangeDays - 1);
        return { from, to };
      }
      
      case 'same_period_last_year': {
        const from = new Date(currentFrom);
        const to = new Date(currentTo);
        from.setFullYear(from.getFullYear() - 1);
        to.setFullYear(to.getFullYear() - 1);
        return { from, to };
      }
      
      case 'custom_period':
        return customPeriod;
      
      default:
        return { from: new Date(), to: new Date() };
    }
  };
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleApplyComparison = () => {
    if (!isFeatureAvailable) return;
    
    const comparisonPeriod = getComparisonPeriod(comparisonType, currentPeriod);
    
    onComparisonChange({
      currentPeriod,
      comparisonPeriod,
      comparisonType
    });
    
    setIsDialogOpen(false);
  };
  
  const handleRemoveComparison = () => {
    onComparisonChange(null);
    setIsDialogOpen(false);
  };
  
  // Custom date handling functions would go here
  // These would integrate with a date picker component
  const handleCustomDateChange = (range: DateRange) => {
    setCustomPeriod(range);
  };
  
  return (
    <>
      <Button
        variant={isComparisonActive ? 'primary' : variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled || !isFeatureAvailable}
      >
        <ArrowRightLeft className="h-4 w-4" />
        {!iconOnly && <span>{isComparisonActive ? 'Comparison Active' : 'Compare'}</span>}
        {!isFeatureAvailable && <Lock className="h-3 w-3 ml-1" />}
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Compare Time Periods</DialogTitle>
          
          {!isFeatureAvailable ? (
            <div className="p-4 text-center">
              <Lock className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="font-medium">Feature Not Available</p>
              <p className="text-sm text-gray-500 mt-1">
                Period comparison requires Influencer or Enterprise tier.
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
            <>
              <div className="text-sm text-gray-600 mb-4">
                Compare current period{' '}
                <span className="font-medium">
                  {formatDate(currentPeriod.from)} - {formatDate(currentPeriod.to)}
                </span>
                {' '}with:
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="preset">Preset Periods</TabsTrigger>
                  <TabsTrigger value="custom">Custom Period</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preset" className="space-y-4">
                  <RadioGroup
                    value={comparisonType}
                    onValueChange={(value: any) => setComparisonType(value as ComparisonType)}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem id="previous_period" value="previous_period" />
                      <div>
                        <Label htmlFor="previous_period" className="font-medium">
                          Previous Period
                        </Label>
                        <p className="text-sm text-gray-500">
                          {formatDate(getComparisonPeriod('previous_period', currentPeriod).from)} - {' '}
                          {formatDate(getComparisonPeriod('previous_period', currentPeriod).to)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem id="same_period_last_year" value="same_period_last_year" />
                      <div>
                        <Label htmlFor="same_period_last_year" className="font-medium">
                          Same Period Last Year
                        </Label>
                        <p className="text-sm text-gray-500">
                          {formatDate(getComparisonPeriod('same_period_last_year', currentPeriod).from)} - {' '}
                          {formatDate(getComparisonPeriod('same_period_last_year', currentPeriod).to)}
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-4">
                  <div className="text-sm text-gray-600 mb-2">
                    Select a custom date range to compare with:
                  </div>
                  
                  <div className="flex justify-between p-4 border rounded-md">
                    <div>
                      <Label className="text-xs text-gray-500">Start Date</Label>
                      <div className="font-medium">
                        {formatDate(customPeriod.from)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">End Date</Label>
                      <div className="font-medium">
                        {formatDate(customPeriod.to)}
                      </div>
                    </div>
                    <DatePicker
                      selectedRange={customPeriod}
                      onChange={(range) => {
                        handleCustomDateChange(range);
                        setComparisonType('custom_period');
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-between mt-6">
                {isComparisonActive ? (
                  <Button
                    variant="destructive"
                    onClick={handleRemoveComparison}
                  >
                    Remove Comparison
                  </Button>
                ) : (
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                )}
                
                <Button
                  variant="primary"
                  onClick={handleApplyComparison}
                >
                  Apply Comparison
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ComparePeriodsButton; 