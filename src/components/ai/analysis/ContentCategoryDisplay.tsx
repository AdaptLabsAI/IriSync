import React from 'react';
import { CategoryResult } from '../../../lib/ai/analysis/content-categorizer';

interface ContentCategoryDisplayProps {
  /**
   * Category analysis result to display
   */
  result: CategoryResult;
  /**
   * Optional maximum number of categories to display (after primary)
   */
  maxCategories?: number;
  /**
   * Whether to show taxonomy information
   */
  showTaxonomy?: boolean;
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * ContentCategoryDisplay - A component to visualize content categorization results
 * This component displays primary category and additional categories with confidence scores
 */
const ContentCategoryDisplay: React.FC<ContentCategoryDisplayProps> = ({
  result,
  maxCategories = 5,
  showTaxonomy = true,
  className = '',
}) => {
  // Filter and sort categories by confidence
  const sortedCategories = [...result.categories]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxCategories);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Taxonomy info if available and requested */}
      {showTaxonomy && result.taxonomy && (
        <div className="flex items-center mb-2">
          <span className="text-sm text-gray-500">Taxonomy:</span>
          <span className="ml-2 text-sm font-medium capitalize">{result.taxonomy}</span>
        </div>
      )}

      {/* Primary category section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-medium">Primary Category</div>
          <div className="font-medium text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            {(result.confidence * 100).toFixed(0)}% confidence
          </div>
        </div>

        <div className="p-3 border rounded-md bg-gray-50">
          <div className="text-lg font-medium">{result.primaryCategory}</div>
        </div>
      </div>

      {/* Additional categories section */}
      {sortedCategories.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Additional Categories</h4>
          <div className="space-y-2">
            {sortedCategories.map((category, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded-md">
                <div className="font-medium">{category.category}</div>
                <div className="ml-auto">
                  {/* Confidence bar */}
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500" 
                        style={{ width: `${category.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {(category.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show when no additional categories */}
      {sortedCategories.length === 0 && (
        <div className="text-sm text-gray-500">
          No additional categories identified.
        </div>
      )}
    </div>
  );
};

export default ContentCategoryDisplay; 