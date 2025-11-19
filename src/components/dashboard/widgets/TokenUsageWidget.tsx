import React from 'react';
import { useTokens } from '../../../hooks/useTokens';
import { TokenPackageSize, getTokenPackageDetails } from '../../../lib/tokens/token-purchase';
import { useState } from 'react';

/**
 * Widget that displays token usage information in the dashboard
 */
export default function TokenUsageWidget() {
  const {
    balance,
    loading,
    error,
    calculateUsagePercentage,
    getDaysUntilReset,
    purchaseTokens
  } = useTokens();
  
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackageSize>(TokenPackageSize.SMALL);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  
  const usagePercentage = calculateUsagePercentage();
  const daysUntilReset = getDaysUntilReset();
  
  // Handle token purchase
  const handlePurchase = async () => {
    setPurchaseLoading(true);
    setPurchaseError(null);
    setPurchaseSuccess(false);
    
    try {
      // Use the real token purchase service to create a Stripe checkout session
      const packageDetails = getTokenPackageDetails(selectedPackage);
      
      // Call the token purchase API that creates a real Stripe checkout session
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'token_purchase',
          tokenPackageId: `token-${packageDetails.tokens}`,
          successUrl: `${window.location.origin}/dashboard/settings/billing?purchase=success`,
          cancelUrl: `${window.location.origin}/dashboard/settings/billing?purchase=canceled`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate purchase');
      }

      const data = await response.json();
      
      if (data.success && data.redirectUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.message || 'Purchase initiation failed');
      }
      
    } catch (err) {
      setPurchaseError((err as Error).message);
    } finally {
      setPurchaseLoading(false);
    }
  };
  
  // Get UI state based on token usage
  const getStatusColor = () => {
    if (usagePercentage >= 90) return 'text-red-500';
    if (usagePercentage >= 75) return 'text-yellow-500';
    return 'text-[#00CC44]';
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/4"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Token Usage</h3>
        <p className="text-red-500">Error loading token data</p>
      </div>
    );
  }
  
  if (!balance) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Token Usage</h3>
        <p className="text-gray-500">No token data available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Token Usage</h3>
        <button
          onClick={() => setShowPurchaseModal(true)}
          className="px-3 py-1 bg-[#00CC44] text-white text-sm rounded hover:bg-[#00CC44] transition-colors"
        >
          Purchase Tokens
        </button>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className={`font-medium ${getStatusColor()}`}>
            {balance.currentBalance} tokens remaining
          </span>
          <span className="text-sm text-gray-500">
            {usagePercentage}% used
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              usagePercentage >= 90 ? 'bg-red-500' :
              usagePercentage >= 75 ? 'bg-yellow-500' :
              'bg-[#00CC44]'
            }`}
            style={{ width: `${usagePercentage}%` }}
          ></div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        <p>Total used this month: {balance.totalUsed} tokens</p>
        <p>Next reset: {daysUntilReset} days ({new Date(balance.nextResetDate).toLocaleDateString()})</p>
      </div>
      
      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Purchase Tokens</h3>
            
            {purchaseSuccess ? (
              <div className="text-green-500 mb-4">
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
                    className="px-4 py-2 bg-[#00CC44] text-white rounded hover:bg-[#00CC44] disabled:bg-[#00CC44]/50"
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