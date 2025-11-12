import React from 'react';

export interface SkeletonProps {
  /**
   * Variant of the skeleton
   */
  variant?: 'text' | 'rectangular' | 'circular';
  /**
   * Width of the skeleton
   */
  width?: string | number;
  /**
   * Height of the skeleton
   */
  height?: string | number;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Animation type
   */
  animation?: 'pulse' | 'wave' | false;
  /**
   * Additional styling
   */
  sx?: React.CSSProperties;
}

/**
 * Skeleton component for loading states
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  animation = 'pulse',
  sx = {}
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded';
      case 'text':
      default:
        return 'rounded-sm';
    }
  };

  const getAnimationClasses = () => {
    switch (animation) {
      case 'wave':
        return 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[wave_1.6s_ease-in-out_infinite]';
      case 'pulse':
        return 'animate-pulse';
      case false:
        return '';
      default:
        return 'animate-pulse';
    }
  };

  const getDefaultDimensions = () => {
    if (variant === 'text') {
      return {
        width: width || '100%',
        height: height || '1.2em'
      };
    }
    if (variant === 'circular') {
      const size = width || height || '40px';
      return {
        width: size,
        height: size
      };
    }
    return {
      width: width || '100%',
      height: height || '20px'
    };
  };

  const dimensions = getDefaultDimensions();
  
  const style: React.CSSProperties = {
    width: dimensions.width,
    height: dimensions.height,
    ...sx
  };

  return (
    <div
      className={`
        bg-gray-200 inline-block
        ${getVariantClasses()}
        ${getAnimationClasses()}
        ${className}
      `.trim()}
      style={style}
      aria-label="Loading..."
      role="status"
    />
  );
};

export default Skeleton; 