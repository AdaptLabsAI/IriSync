import React from 'react';
import { ImageAnalysisResult } from '../../../lib/ai/analysis/media-analyzer';

interface MediaAnalysisViewerProps {
  /**
   * Media analysis result to display
   */
  result: ImageAnalysisResult;
  /**
   * URL of the image being analyzed
   */
  imageUrl: string;
  /**
   * Whether to show content warnings (can be sensitive)
   */
  showContentWarnings?: boolean;
  /**
   * Whether to show aesthetic analysis
   */
  showAesthetics?: boolean;
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * MediaAnalysisViewer - A component to visualize image and media analysis results
 * This component displays image description, tags, objects, colors, and more
 */
const MediaAnalysisViewer: React.FC<MediaAnalysisViewerProps> = ({
  result,
  imageUrl,
  showContentWarnings = false,
  showAesthetics = true,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image preview and description */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-1/3 flex-shrink-0">
          <img 
            src={imageUrl} 
            alt={result.suggestedAltText}
            className="w-full h-auto rounded-md object-contain bg-gray-100 max-h-64"
          />
        </div>
        
        <div className="md:w-2/3">
          <h4 className="font-medium mb-2">Description</h4>
          <p className="text-sm text-gray-700 mb-3">{result.description}</p>
          
          <h4 className="font-medium mb-2">Suggested Alt Text</h4>
          <div className="relative">
            <div className="p-2 bg-gray-100 rounded border text-sm font-mono break-all">
              {result.suggestedAltText}
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(result.suggestedAltText)}
              className="absolute top-2 right-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Tags section */}
      {result.tags && result.tags.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {result.tags.map((tag: any, idx: any) => (
              <span
                key={idx}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Objects section */}
      {result.objects && result.objects.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Detected Objects</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {result.objects.map((obj: any, idx: any) => (
              <div
                key={idx}
                className="p-2 border rounded-md flex justify-between items-center"
              >
                <span className="text-sm font-medium">{obj.name}</span>
                <span className="text-xs text-gray-500">
                  {(obj.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Colors section */}
      {result.colors && result.colors.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Dominant Colors</h4>
          <div className="flex flex-wrap gap-2">
            {result.colors.map((color: any, idx: any) => (
              <div
                key={idx}
                className="flex items-center space-x-2 p-2 border rounded-md"
              >
                <div
                  className="w-6 h-6 rounded-full border"
                  style={{ backgroundColor: color.color }}
                ></div>
                <span className="text-sm">{color.color}</span>
                <span className="text-xs text-gray-500">
                  {(color.dominance * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aesthetic analysis */}
      {showAesthetics && result.aesthetic && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Aesthetic Analysis</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 border rounded-md text-center">
              <div className="text-lg font-medium">{result.aesthetic.quality.toFixed(1)}</div>
              <div className="text-xs text-gray-500">Quality Score (0-10)</div>
            </div>
            <div className="p-3 border rounded-md text-center">
              <div className="text-sm font-medium">{result.aesthetic.style}</div>
              <div className="text-xs text-gray-500">Visual Style</div>
            </div>
            <div className="p-3 border rounded-md text-center">
              <div className="text-sm font-medium">{result.aesthetic.mood}</div>
              <div className="text-xs text-gray-500">Mood</div>
            </div>
          </div>
        </div>
      )}

      {/* Content warnings (if requested and available) */}
      {showContentWarnings && result.contentWarnings && result.contentWarnings.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2 text-amber-600">Content Warnings</h4>
          <div className="border border-amber-200 rounded-md bg-amber-50 p-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="text-left pb-2">Type</th>
                  <th className="text-left pb-2">Severity</th>
                  <th className="text-left pb-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {result.contentWarnings.map((warning: any, idx: any) => (
                  <tr key={idx} className="border-b border-amber-100 last:border-0">
                    <td className="py-2">{warning.type}</td>
                    <td className={`py-2 ${
                      warning.severity === 'high' ? 'text-red-600' :
                      warning.severity === 'medium' ? 'text-amber-600' :
                      warning.severity === 'low' ? 'text-yellow-600' : 'text-[#00CC44]'
                    }`}>
                      {warning.severity}
                    </td>
                    <td className="py-2">{(warning.confidence * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaAnalysisViewer; 