import React from 'react';
import { BrandVoiceProfile } from '../../../lib/ai/analysis/brand-voice-analyzer';

interface BrandVoiceConsistencyCheckerProps {
  /**
   * Brand voice profile to check against
   */
  brandProfile: BrandVoiceProfile;
  /**
   * The alignment score (0-100) of the content with the brand voice
   */
  alignmentScore: number;
  /**
   * List of brand voice attributes present in the content
   */
  matchingAttributes: string[];
  /**
   * List of brand voice attributes missing from the content
   */
  misalignedAttributes: string[];
  /**
   * List of suggestions to improve brand voice alignment
   */
  suggestions: string[];
  /**
   * Optional detailed analysis data
   */
  detailed?: {
    toneMatch: number; // 0-10 scale
    formalityMatch: number; // 0-10 scale
    phraseUsage: {
      correctUsage: string[];
      missingKeyPhrases: string[];
      usedAvoidedPhrases: string[];
    };
  };
  /**
   * Whether to show detailed analysis (if available)
   */
  showDetailed?: boolean;
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * BrandVoiceConsistencyChecker - An Enterprise tier component to check content alignment with brand voice
 * This component visualizes how well content matches a defined brand voice and offers suggestions
 */
const BrandVoiceConsistencyChecker: React.FC<BrandVoiceConsistencyCheckerProps> = ({
  brandProfile,
  alignmentScore,
  matchingAttributes,
  misalignedAttributes,
  suggestions,
  detailed,
  showDetailed = true,
  className = '',
}) => {
  // Helper to determine color class based on score
  const getScoreColorClass = (score: number, isBg = false) => {
    const prefix = isBg ? 'bg-' : 'text-';
    if (score >= 85) return isBg ? 'bg-[#00CC44]' : 'text-[#00CC44]';
    if (score >= 70) return `${prefix}blue-500`;
    if (score >= 50) return `${prefix}amber-500`;
    return `${prefix}red-500`;
  };

  // Helper to determine status label based on score
  const getAlignmentStatus = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall alignment score section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-base font-medium">Brand Voice Alignment</div>
          <div className={`px-2 py-1 rounded font-medium ${getScoreColorClass(alignmentScore, true)} text-white`}>
            {getAlignmentStatus(alignmentScore)}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
          <div 
            className={`h-2.5 rounded-full ${getScoreColorClass(alignmentScore, true)}`} 
            style={{ width: `${alignmentScore}%` }}
          ></div>
        </div>
        
        <div className="text-right text-sm">
          <span className={getScoreColorClass(alignmentScore)}>
            {alignmentScore.toFixed(0)}% aligned
          </span>
        </div>
      </div>

      {/* Brand profile summary */}
      <div className="mb-4 p-3 border rounded-md bg-gray-50">
        <h4 className="font-medium mb-2">Brand Voice Profile</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium">Tone:</span>{' '}
            {brandProfile.tone.join(', ')}
          </div>
          <div>
            <span className="font-medium">Formality:</span>{' '}
            <span className="capitalize">{brandProfile.formality}</span>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium">Key Phrases:</span>{' '}
            {brandProfile.keyPhrases.slice(0, 5).join(', ')}
            {brandProfile.keyPhrases.length > 5 && '...'}
          </div>
        </div>
      </div>

      {/* Attribute alignment section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Matching attributes */}
        <div className="p-3 border rounded-md">
          <h4 className="font-medium mb-2 text-[#00CC44]">Present Attributes</h4>
          {matchingAttributes.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {matchingAttributes.map((attr, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-[#00CC44] mr-2">✓</span>
                  <span>{attr}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No matching attributes found</p>
          )}
        </div>

        {/* Misaligned attributes */}
        <div className="p-3 border rounded-md">
          <h4 className="font-medium mb-2 text-red-600">Missing Attributes</h4>
          {misalignedAttributes.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {misalignedAttributes.map((attr, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>{attr}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No missing attributes</p>
          )}
        </div>
      </div>

      {/* Detailed analysis section (if available and requested) */}
      {showDetailed && detailed && (
        <div className="mb-4">
          <h4 className="font-medium mb-3">Detailed Analysis</h4>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Tone match */}
            <div className="p-3 border rounded-md">
              <div className="text-sm text-gray-600 mb-1">Tone Match</div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className={`h-2 rounded-full ${getScoreColorClass(detailed.toneMatch * 10, true)}`} 
                    style={{ width: `${detailed.toneMatch * 10}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{detailed.toneMatch.toFixed(1)}/10</span>
              </div>
            </div>
            
            {/* Formality match */}
            <div className="p-3 border rounded-md">
              <div className="text-sm text-gray-600 mb-1">Formality Match</div>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className={`h-2 rounded-full ${getScoreColorClass(detailed.formalityMatch * 10, true)}`} 
                    style={{ width: `${detailed.formalityMatch * 10}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{detailed.formalityMatch.toFixed(1)}/10</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Correct phrase usage */}
            {detailed.phraseUsage.correctUsage.length > 0 && (
              <div className="p-3 border rounded-md">
                <h5 className="text-sm font-medium text-[#00CC44] mb-2">Correct Phrase Usage</h5>
                <div className="flex flex-wrap gap-2">
                  {detailed.phraseUsage.correctUsage.map((phrase, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-[#00FF6A]/10 text-[#00CC44] rounded text-xs"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Missing key phrases */}
            {detailed.phraseUsage.missingKeyPhrases.length > 0 && (
              <div className="p-3 border rounded-md">
                <h5 className="text-sm font-medium text-amber-600 mb-2">Missing Key Phrases</h5>
                <div className="flex flex-wrap gap-2">
                  {detailed.phraseUsage.missingKeyPhrases.map((phrase, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Used avoided phrases */}
            {detailed.phraseUsage.usedAvoidedPhrases.length > 0 && (
              <div className="p-3 border rounded-md">
                <h5 className="text-sm font-medium text-red-600 mb-2">Used Avoided Phrases</h5>
                <div className="flex flex-wrap gap-2">
                  {detailed.phraseUsage.usedAvoidedPhrases.map((phrase, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Improvement suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Suggestions to Improve Brand Alignment</h4>
          <div className="p-3 border rounded-md bg-blue-50">
            <ul className="space-y-2 text-sm">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-blue-500 mr-2">→</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Enterprise badge */}
      <div className="text-xs text-blue-600 flex items-center justify-end border-t pt-2">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-3 h-3 mr-1"
        >
          <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
        </svg>
        Enterprise Feature
      </div>
    </div>
  );
};

export default BrandVoiceConsistencyChecker; 