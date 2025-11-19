import React, { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';

export interface Metric {
  id: string;
  name: string;
  description: string;
  category: 'engagement' | 'reach' | 'growth' | 'conversion' | 'sentiment';
  requiredTier: 'creator' | 'influencer' | 'enterprise';
}

interface MetricFilterToggleProps {
  /**
   * Available metrics to filter
   */
  metrics: Metric[];
  /**
   * Currently selected metrics
   */
  selectedMetrics: string[];
  /**
   * Callback when metrics selection changes
   */
  onChange: (selectedIds: string[]) => void;
  /**
   * Optional filter categories to include
   */
  categories?: ('engagement' | 'reach' | 'growth' | 'conversion' | 'sentiment')[];
  /**
   * Whether the component is disabled
   */
  isDisabled?: boolean;
  /**
   * Optional CSS class name
   */
  className?: string;
}

export const MetricFilterToggle: React.FC<MetricFilterToggleProps> = ({
  metrics,
  selectedMetrics,
  onChange,
  categories,
  isDisabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { subscription } = useSubscription();
  
  // Get user tier
  const userTier = subscription?.tier || 'creator';
  
  // Filter metrics by category if specified
  const filteredMetrics = categories
    ? metrics.filter(metric => categories.includes(metric.category))
    : metrics;
  
  // Map tier to level for comparison
  const tierLevels = {
    creator: 1,
    influencer: 2,
    enterprise: 3
  };
  
  // Check if a metric is available for the current subscription tier
  const isMetricAvailable = (metric: Metric) => {
    return tierLevels[userTier] >= tierLevels[metric.requiredTier];
  };
  
  // Toggle a metric's selection
  const toggleMetric = (metricId: string) => {
    if (isDisabled) return;
    
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return;
    
    // Check if user has access to this metric
    if (!isMetricAvailable(metric)) {
      // Show upgrade message or tooltip
      return;
    }
    
    if (selectedMetrics.includes(metricId)) {
      onChange(selectedMetrics.filter(id => id !== metricId));
    } else {
      onChange([...selectedMetrics, metricId]);
    }
  };
  
  // Group metrics by category
  const metricsByCategory = filteredMetrics.reduce<Record<string, Metric[]>>((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {});
  
  // Format category name for display
  const formatCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md border
          ${isOpen ? 'border-[#00CC44] bg-[#00FF6A]/5' : 'border-gray-300 hover:bg-gray-50'}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-expanded={isOpen}
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
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span>Metrics</span>
        {selectedMetrics.length > 0 && (
          <span className="bg-[#00FF6A]/10 text-[#00CC44] text-xs font-medium px-2 py-0.5 rounded-full">
            {selectedMetrics.length}
          </span>
        )}
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
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-10 w-72 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="text-sm font-medium">Filter Metrics</div>
            <div className="text-xs text-gray-500">Select metrics to display in your analytics</div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => (
              <div key={category} className="border-b border-gray-100 last:border-b-0">
                <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700">
                  {formatCategoryName(category)}
                </div>
                <div>
                  {categoryMetrics.map(metric => {
                    const isAvailable = isMetricAvailable(metric);
                    return (
                      <label
                        key={metric.id}
                        className={`
                          flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer
                          ${!isAvailable ? 'opacity-60' : ''}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMetrics.includes(metric.id)}
                          onChange={() => toggleMetric(metric.id)}
                          disabled={!isAvailable || isDisabled}
                          className="h-4 w-4 rounded border-gray-300 text-[#00CC44] focus:ring-[#00CC44]"
                        />
                        <div className="ml-2 flex-1">
                          <div className="text-sm font-medium flex items-center gap-1">
                            {metric.name}
                            {!isAvailable && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded">
                                {metric.requiredTier}+
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{metric.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={() => onChange([])}
              className="text-sm text-gray-700 hover:text-gray-900"
              disabled={selectedMetrics.length === 0 || isDisabled}
            >
              Clear all
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm bg-[#00CC44] text-white rounded-md hover:bg-[#00CC44]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricFilterToggle; 