import React from 'react';

export interface AvatarProps {
  /**
   * Image source URL
   */
  src?: string;
  /**
   * Alt text for the image
   */
  alt?: string;
  /**
   * Size of the avatar
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Custom className
   */
  className?: string;
  /**
   * Fallback content when no image is provided
   */
  fallback?: string;
  /**
   * Children to render inside avatar (overrides image and fallback)
   */
  children?: React.ReactNode;
  /**
   * Click handler
   */
  onClick?: () => void;
}

export interface AvatarImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

export interface AvatarFallbackProps {
  children: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl'
};

/**
 * AvatarImage component for displaying avatar images
 */
export const AvatarImage: React.FC<AvatarImageProps> = ({ src, alt = '', className = '' }) => {
  const [imageError, setImageError] = React.useState(false);
  
  if (!src || imageError) {
    return null;
  }
  
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImageError(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
};

/**
 * AvatarFallback component for displaying fallback content
 */
export const AvatarFallback: React.FC<AvatarFallbackProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex items-center justify-center h-full w-full text-center ${className}`}>
      {children}
    </div>
  );
};

/**
 * Avatar component for displaying user profile pictures or initials
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  size = 'md',
  className = '',
  fallback,
  children,
  onClick
}) => {
  const [imageError, setImageError] = React.useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  const baseClasses = `
    inline-flex items-center justify-center rounded-full overflow-hidden
    bg-gray-100 text-gray-600 font-medium select-none
    ${sizeClasses[size]}
    ${onClick ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}
    ${className}
  `.trim();
  
  // If children are provided, use them
  if (children) {
    return (
      <div className={baseClasses} onClick={onClick}>
        {children}
      </div>
    );
  }
  
  // If image is provided and hasn't errored, show image
  if (src && !imageError) {
    return (
      <div className={baseClasses} onClick={onClick}>
        <img
          src={src}
          alt={alt}
          onError={handleImageError}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  
  // Show fallback (initials or text)
  const fallbackContent = fallback || alt.charAt(0).toUpperCase() || '?';
  
  return (
    <div className={baseClasses} onClick={onClick}>
      {fallbackContent}
    </div>
  );
};

export default Avatar; 