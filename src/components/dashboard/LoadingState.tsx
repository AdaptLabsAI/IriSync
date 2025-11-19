"use client";

import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#00CC44] rounded-full animate-spin mx-auto mb-4"></div>

        {/* Message */}
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}
