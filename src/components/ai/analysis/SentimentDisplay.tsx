import React from 'react';
import { SentimentResult } from '../../../lib/ai/analysis/sentiment-analyzer';

interface SentimentDisplayProps {
  /**
   * Sentiment analysis result to display
   */
  result: SentimentResult;
  /**
   * Whether to show detailed analysis (emotions, aspects)
   */
  detailed?: boolean;
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * SentimentDisplay - A component to visualize sentiment analysis results
 * This component displays sentiment scores, emotions, and aspect-based sentiment
 */
const SentimentDisplay: React.FC<SentimentDisplayProps> = ({
  result,
  detailed = false,
  className = '',
}) => {
  // Helper to generate color class based on sentiment
  const getSentimentColorClass = (sentiment: string, isBg = false) => {
    const prefix = isBg ? 'bg-' : 'text-';
    switch (sentiment) {
      case 'positive':
        return isBg ? 'bg-[#00CC44]' : 'text-[#00CC44]';
      case 'negative':
        return `${prefix}red-500`;
      case 'neutral':
        return `${prefix}gray-500`;
      default:
        return `${prefix}gray-500`;
    }
  };

  // Convert normalized score to percentage (0-100)
  const scorePercentage = ((result.score + 1) / 2) * 100;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall sentiment section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-medium">Overall Sentiment</div>
          <div className={`font-medium capitalize ${getSentimentColorClass(result.sentiment)}`}>
            {result.sentiment}
          </div>
        </div>
        
        {/* Sentiment meter */}
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${getSentimentColorClass(result.sentiment, true)}`} 
            style={{ width: `${scorePercentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <div>Negative</div>
          <div>Neutral</div>
          <div>Positive</div>
        </div>
        
        <div className="text-sm mt-2">
          <span>
            Score: <span className="font-medium">{result.score.toFixed(2)}</span>
          </span>
          <span className="ml-4">
            Confidence: <span className="font-medium">{(result.confidence * 100).toFixed(0)}%</span>
          </span>
        </div>
      </div>

      {/* Emotions section (if detailed) */}
      {detailed && result.details?.emotions && Object.keys(result.details.emotions).length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Emotional Analysis</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(result.details.emotions).map(([emotion, value]) => (
              <div key={emotion} className="flex items-center">
                <div className="w-20 text-sm capitalize">{emotion}:</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500" 
                      style={{ width: `${value * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-12 text-right text-sm">
                  {(value * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Aspect-based sentiment (if detailed) */}
      {detailed && result.details?.aspects && result.details.aspects.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Aspect Sentiment</h4>
          <div className="grid grid-cols-1 gap-1">
            {result.details.aspects.map((aspect: any, idx: any) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
                <div>{aspect.aspect}</div>
                <div className={`font-medium capitalize ${getSentimentColorClass(aspect.sentiment)}`}>
                  {aspect.sentiment} ({aspect.score.toFixed(2)})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SentimentDisplay; 