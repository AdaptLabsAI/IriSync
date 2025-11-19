import React, { useState, useEffect } from 'react';
import { useTokens } from '../../../hooks/useTokens';
import { useAIToolkit } from '../../../hooks/useAIToolkit';
import { AITaskType } from '../../../lib/ai/models';
import { TokenPackageSize, getTokenPackageDetails } from '../../../lib/tokens/token-purchase';

interface AITokenAlertProps {
  taskType: AITaskType;
  onTokenValidation: (isValid: boolean) => void;
}

/**
 * Component that handles token validation for AI operations
 * and provides alerts/purchase options when tokens are low
 */
export default function AITokenAlert({ taskType, onTokenValidation }: AITokenAlertProps) {
  const { balance, calculateUsagePercentage, purchaseTokens } = useTokens();
  const { canPerformOperation } = useAIToolkit();
  const [validationState, setValidationState] = useState<{
    allowed: boolean;
    reason?: string;
    tokenCost?: number;
  } | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackageSize>(TokenPackageSize.SMALL);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Map task type to operation name
  const getOperationName = (task: AITaskType): string => {
    const operationMap: Record<string, string> = {
      'analyze_sentiment': 'analyzeContent',
      'generate_post': 'generateContent',
      'generate_hashtags': 'suggestHashtags',
      'analyze_image': 'analyzeMedia',
      'generate_alt_text': 'generateAltText',
      'predict_engagement': 'predictEngagement',
      'improve_content': 'improveContent',
      'suggest_posting_time': 'suggestPostingTime'
    };
    
    return operationMap[task] || '';
  };

  // Check if user can perform the operation
  useEffect(() => {
    const checkTokens = async () => {
      const operation = getOperationName(taskType);
      if (!operation) return;
      
      const result = await canPerformOperation(operation);
      setValidationState(result);
      onTokenValidation(result.allowed);
    };
    
    checkTokens();
  }, [taskType, canPerformOperation, onTokenValidation]);

  // Handle token purchase
  const handlePurchase = async () => {
    setPurchaseLoading(true);
    setPurchaseError(null);
    setPurchaseSuccess(false);
    
    try {
      const result = await purchaseTokens(
        selectedPackage, 
        'card',
        'simulated_payment_token'
      );
      
      if (result.success) {
        setPurchaseSuccess(true);
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowPurchaseModal(false);
          setPurchaseSuccess(false);
          
          // Re-check token validation
          const checkTokens = async () => {
            const operation = getOperationName(taskType);
            if (!operation) return;
            
            const result = await canPerformOperation(operation);
            setValidationState(result);
            onTokenValidation(result.allowed);
          };
          
          checkTokens();
        }, 2000);
      } else {
        setPurchaseError(result.message || 'Purchase failed');
      }
    } catch (err) {
      setPurchaseError((err as Error).message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  // If tokens are sufficient, don't show anything
  if (!balance || validationState?.allowed) {
    return null;
  }

  const usagePercentage = calculateUsagePercentage();
  
  return (
    <div className="mb-4">
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-orange-700">
              {validationState?.reason || "You don't have enough tokens for this operation."}
            </p>
            {balance.currentBalance > 0 && (
              <div className="mt-2">
                <p className="text-xs text-orange-700">
                  Current balance: {balance.currentBalance} tokens ({usagePercentage}% used)
                </p>
                {validationState?.tokenCost && (
                  <p className="text-xs text-orange-700">
                    Required: {validationState.tokenCost} tokens
                  </p>
                )}
              </div>
            )}
            <div className="mt-4">
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Purchase Tokens
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Purchase Tokens</h3>
            
            {purchaseSuccess ? (
              <div className="text-[#00CC44] mb-4">
                Purchase successful! Your tokens have been added to your account.
              </div>
            ) : (
              <>
                {purchaseError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
                    {purchaseError}
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Select Package</label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(Number(e.target.value) as TokenPackageSize)}
                    className="w-full p-2 border rounded"
                    disabled={purchaseLoading}
                  >
                    <option value={TokenPackageSize.SMALL}>
                      {getTokenPackageDetails(TokenPackageSize.SMALL).name} - {getTokenPackageDetails(TokenPackageSize.SMALL).tokens} tokens (${getTokenPackageDetails(TokenPackageSize.SMALL).price.toFixed(2)})
                    </option>
                    <option value={TokenPackageSize.MEDIUM}>
                      {getTokenPackageDetails(TokenPackageSize.MEDIUM).name} - {getTokenPackageDetails(TokenPackageSize.MEDIUM).tokens} tokens (${getTokenPackageDetails(TokenPackageSize.MEDIUM).price.toFixed(2)})
                    </option>
                    <option value={TokenPackageSize.LARGE}>
                      {getTokenPackageDetails(TokenPackageSize.LARGE).name} - {getTokenPackageDetails(TokenPackageSize.LARGE).tokens} tokens (${getTokenPackageDetails(TokenPackageSize.LARGE).price.toFixed(2)})
                    </option>
                    <option value={TokenPackageSize.XL}>
                      {getTokenPackageDetails(TokenPackageSize.XL).name} - {getTokenPackageDetails(TokenPackageSize.XL).tokens} tokens (${getTokenPackageDetails(TokenPackageSize.XL).price.toFixed(2)})
                    </option>
                    <option value={TokenPackageSize.PREMIUM}>
                      {getTokenPackageDetails(TokenPackageSize.PREMIUM).name} - {getTokenPackageDetails(TokenPackageSize.PREMIUM).tokens} tokens (${getTokenPackageDetails(TokenPackageSize.PREMIUM).price.toFixed(2)})
                    </option>
                    <option value={TokenPackageSize.HEAVY}>
                      {getTokenPackageDetails(TokenPackageSize.HEAVY).name} - {getTokenPackageDetails(TokenPackageSize.HEAVY).tokens} tokens (${getTokenPackageDetails(TokenPackageSize.HEAVY).price.toFixed(2)})
                    </option>
                    <option value={TokenPackageSize.ENTERPRISE_PREMIUM}>
                      {getTokenPackageDetails(TokenPackageSize.ENTERPRISE_PREMIUM).name} - {getTokenPackageDetails(TokenPackageSize.ENTERPRISE_PREMIUM).tokens} tokens (${getTokenPackageDetails(TokenPackageSize.ENTERPRISE_PREMIUM).price.toFixed(2)})
                    </option>
                    <option value={TokenPackageSize.ENTERPRISE_HEAVY}>
                      {getTokenPackageDetails(TokenPackageSize.ENTERPRISE_HEAVY).name} - {getTokenPackageDetails(TokenPackageSize.ENTERPRISE_HEAVY).tokens} tokens (${getTokenPackageDetails(TokenPackageSize.ENTERPRISE_HEAVY).price.toFixed(2)})
                    </option>
                  </select>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="px-4 py-2 text-gray-600 mr-2"
                    disabled={purchaseLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                    disabled={purchaseLoading}
                  >
                    {purchaseLoading ? 'Processing...' : 'Purchase'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 