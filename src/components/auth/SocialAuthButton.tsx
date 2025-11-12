import React, { useState } from 'react';
import { Button } from '../ui/button/Button';

// List of supported providers
export type SocialProvider = 
  | 'google' 
  | 'apple' 
  | 'facebook' 
  | 'twitter' 
  | 'github' 
  | 'linkedin';

export interface SocialAuthButtonProps {
  /**
   * The social provider to use
   */
  provider: SocialProvider;
  /**
   * Additional classes to apply to the button
   */
  className?: string;
  /**
   * Button size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Custom button text. If not provided, will use default text based on provider
   */
  children?: React.ReactNode;
  /**
   * Whether the button should take full width of its container
   */
  fullWidth?: boolean;
  /**
   * Function to handle authentication with the provider
   */
  onAuth?: (provider: SocialProvider) => Promise<void>;
  /**
   * Whether the button is in loading state
   */
  isLoading?: boolean;
  /**
   * Whether to show only the icon without text
   */
  iconOnly?: boolean;
  /**
   * Whether to use the provider's branded colors
   */
  branded?: boolean;
}

/**
 * SocialAuthButton component for social sign-in
 */
export const SocialAuthButton: React.FC<SocialAuthButtonProps> = ({
  provider,
  className,
  size = 'md',
  children,
  fullWidth = false,
  onAuth,
  isLoading = false,
  iconOnly = false,
  branded = true,
}) => {
  const [loading, setLoading] = useState(isLoading);
  const [error, setError] = useState<string | null>(null);

  // Provider configuration
  const providerConfig = {
    google: {
      icon: <GoogleIcon />,
      text: 'Continue with Google',
      bgColor: branded ? 'bg-white hover:bg-gray-100' : '',
      textColor: branded ? 'text-gray-900' : '',
      borderColor: branded ? 'border border-gray-300' : '',
    },
    apple: {
      icon: <AppleIcon />,
      text: 'Continue with Apple',
      bgColor: branded ? 'bg-black hover:bg-gray-900' : '',
      textColor: branded ? 'text-white' : '',
      borderColor: branded ? '' : '',
    },
    facebook: {
      icon: <FacebookIcon />,
      text: 'Continue with Facebook',
      bgColor: branded ? 'bg-[#1877F2] hover:bg-[#166FE5]' : '',
      textColor: branded ? 'text-white' : '',
      borderColor: branded ? '' : '',
    },
    twitter: {
      icon: <TwitterIcon />,
      text: 'Continue with Twitter',
      bgColor: branded ? 'bg-[#1DA1F2] hover:bg-[#1A94DA]' : '',
      textColor: branded ? 'text-white' : '',
      borderColor: branded ? '' : '',
    },
    github: {
      icon: <GithubIcon />,
      text: 'Continue with GitHub',
      bgColor: branded ? 'bg-gray-900 hover:bg-gray-800' : '',
      textColor: branded ? 'text-white' : '',
      borderColor: branded ? '' : '',
    },
    linkedin: {
      icon: <LinkedInIcon />,
      text: 'Continue with LinkedIn',
      bgColor: branded ? 'bg-[#0A66C2] hover:bg-[#004182]' : '',
      textColor: branded ? 'text-white' : '',
      borderColor: branded ? '' : '',
    },
  };

  const config = providerConfig[provider];
  const buttonText = children || config.text;

  const handleClick = async () => {
    if (onAuth) {
      setLoading(true);
      setError(null);
      try {
        await onAuth(provider);
      } catch (error) {
        console.error(`${provider} auth failed:`, error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <Button
        variant={branded ? 'ghost' : 'outline'}
        size={size}
        fullWidth={fullWidth}
        className={`${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
        onClick={handleClick}
        leftIcon={!iconOnly && config.icon}
        loading={loading}
        disabled={loading}
        aria-label={`Sign in with ${provider}`}
      >
        {iconOnly ? config.icon : buttonText}
      </Button>
      
      {error && <div className="text-destructive text-sm mt-1">{error}</div>}
    </>
  );
};

// Provider Icons
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.1901 9.00002C17.1901 8.34863 17.1378 7.71365 17.0401 7.09824H9.06006V10.2536H13.5825C13.3825 11.3561 12.7975 12.3037 11.9163 12.9253V15.0126H14.6125C16.2051 13.5664 17.1901 11.4838 17.1901 9.00002Z" fill="#4285F4" />
    <path d="M9.05996 17.625C11.325 17.625 13.2075 16.845 14.6137 15.0125L11.9175 12.9252C11.175 13.425 10.2225 13.7148 9.06121 13.7148C6.9187 13.7148 5.10621 12.2362 4.45497 10.2375H1.67871V12.3911C3.07871 15.4425 5.89997 17.625 9.05996 17.625Z" fill="#34A853" />
    <path d="M4.45375 10.2375C4.28625 9.73745 4.2 9.22495 4.2 8.71245C4.2 8.1987 4.28625 7.6862 4.45375 7.1862V5.03245H1.6775C1.16625 6.1362 0.899994 7.40495 0.899994 8.7112C0.899994 10.0175 1.16625 11.2862 1.6775 12.39L4.45375 10.2375Z" fill="#FBBC05" />
    <path d="M9.05996 3.71001C10.245 3.71001 11.3175 4.13251 12.1575 4.93501L14.5387 2.55376C13.2063 1.30501 11.3262 0.600006 9.05996 0.600006C5.89997 0.600006 3.07871 2.78251 1.67871 5.83376L4.45497 7.98751C5.10621 5.98876 6.9187 4.51001 9.05996 4.51001V3.71001Z" fill="#EA4335" />
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.7617 9.65039C12.7656 8.88867 13.0195 8.28516 13.5312 7.83984C13.2812 7.46289 12.8672 7.20312 12.2891 7.06055C11.7109 6.91797 11.0898 7.01953 10.4258 7.36523C9.76172 7.71094 9.33594 7.71094 9.14844 7.36523C9.14844 6.97852 9.42578 6.53711 9.98047 6.04102C10.5352 5.54492 11.0938 5.36133 11.6562 5.49023C12.2188 5.61914 12.7773 5.9375 13.332 6.45117C13.8867 6.96484 14.4375 6.69141 14.9844 5.63086C15.0781 6.58008 14.8047 7.39258 14.1641 8.06836C14.8203 8.55664 15.1484 9.27148 15.1484 10.2129C15.1484 11.1543 14.6875 11.9316 13.7656 12.5449C12.8438 13.1582 12.0938 13.3457 11.5156 13.1074C10.9375 12.8691 10.7812 12.6973 10.5312 12.5918C10.2812 12.4863 9.94141 12.6152 9.51562 12.9785C9.08984 13.3418 8.68359 13.2832 8.29688 12.8027C7.91016 12.3223 7.92969 11.7578 8.35547 11.1094C8.78125 10.4609 9.35938 10.1758 10.082 10.2539C10.8047 10.332 11.3281 10.1387 11.6523 9.67383C11.9766 9.20898 12.1016 8.60156 12.0273 7.85156C11.9258 8.06641 11.7812 8.2832 11.5938 8.5C11.4062 8.7168 11.168 8.80859 10.8789 8.77539C10.5898 8.74219 10.3789 8.5957 10.2461 8.33594C10.1133 8.07617 10.0742 7.7832 10.1289 7.45703C10.1836 7.13086 10.3398 6.86523 10.5977 6.66016C10.8555 6.45508 11.1328 6.38281 11.4297 6.44336C11.7266 6.5039 11.9531 6.66797 12.1094 6.93555C12.2656 7.20312 12.3086 7.50195 12.2383 7.83203C12.5977 7.83203 12.7734 8.14062 12.7656 8.75781V9.65039Z" fill="currentColor" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.1562 9.07031C17.1562 4.52344 13.5469 0.84375 9 0.84375C4.45312 0.84375 0.84375 4.52344 0.84375 9.07031C0.84375 13.1641 3.82812 16.5938 7.73438 17.1562V11.5312H5.67188V9.07031H7.73438V7.21875C7.73438 5.10938 8.97656 3.9375 10.8984 3.9375C11.8359 3.9375 12.7734 4.125 12.7734 4.125V6.11719H11.7656C10.7578 6.11719 10.3359 6.75 10.3359 7.42969V9.07031H12.6797L12.3281 11.5312H10.3359V17.1562C14.1719 16.5938 17.1562 13.1641 17.1562 9.07031Z" fill="currentColor" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.8906 4.83594C15.4688 5.01562 15.0469 5.13281 14.5547 5.19531C15.0469 4.88281 15.4688 4.375 15.6484 3.80859C15.2266 4.07812 14.7344 4.28906 14.2422 4.40625C13.8203 3.92969 13.2578 3.61719 12.5547 3.61719C11.2891 3.61719 10.2812 4.65625 10.2812 5.96094C10.2812 6.16406 10.2812 6.36719 10.3516 6.5C8.33594 6.40625 6.5 5.47656 5.25781 4.05469C5.02344 4.45312 4.92188 4.88281 4.92188 5.34375C4.92188 6.19531 5.34375 6.95312 6.03906 7.41406C5.64844 7.38281 5.28906 7.28906 4.95312 7.10938V7.14062C4.95312 8.29688 5.73438 9.28125 6.80469 9.51562C6.57031 9.57812 6.36719 9.60938 6.13281 9.60938C5.98438 9.60938 5.80469 9.60938 5.65625 9.57812C5.98438 10.5312 6.83594 11.2344 7.89844 11.2656C7.10156 11.9062 6.11719 12.2969 5.02344 12.2969C4.78906 12.2969 4.58594 12.2969 4.35156 12.2656C5.40625 12.9688 6.66406 13.3594 8.00781 13.3594C12.5547 13.3594 14.9844 9.67188 14.9844 6.47656C14.9844 6.33594 14.9844 6.22656 14.9844 6.08594C15.4062 5.74219 15.7734 5.30469 16.0312 4.83594H15.8906Z" fill="currentColor" />
  </svg>
);

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="currentColor" />
  </svg>
);

const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.2 2.65C4.2 3.5 3.5 4.2 2.65 4.2C1.8 4.2 1.1 3.5 1.1 2.65C1.1 1.8 1.8 1.1 2.65 1.1C3.5 1.1 4.2 1.8 4.2 2.65ZM4.2 5.61H1.1V16.3H4.2V5.61ZM9.68 5.61H6.61V16.3H9.68V10.68C9.68 7.82 13.39 7.61 13.39 10.68V16.3H16.5V9.6C16.5 4.69 11.08 4.83 9.68 7.25V5.61Z" fill="currentColor" />
  </svg>
);

export default SocialAuthButton; 