import React, { useRef, useState, useEffect } from 'react';
import cn from 'classnames';

export interface SliderProps {
  /**
   * The current value of the slider (controlled)
   */
  value?: number;
  /**
   * Default value (uncontrolled)
   */
  defaultValue?: number;
  /**
   * Called when the slider value changes
   */
  onChange?: (value: number) => void;
  /**
   * Minimum value
   */
  min?: number;
  /**
   * Maximum value
   */
  max?: number;
  /**
   * Step increment value
   */
  step?: number;
  /**
   * Whether to show the current value
   */
  showValue?: boolean;
  /**
   * Custom formatter for the value display
   */
  valueFormatter?: (value: number) => string;
  /**
   * Whether the slider is disabled
   */
  disabled?: boolean;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Label for the slider
   */
  label?: string;
  /**
   * Marks to display underneath the slider
   */
  marks?: {
    value: number;
    label: string;
  }[];
  /**
   * Display orientation
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Custom classes to apply to the slider
   */
  className?: string;
  /**
   * Error message to display
   */
  error?: string;
}

/**
 * Slider component for selecting a value from a range
 */
export const Slider: React.FC<SliderProps> = ({
  value,
  defaultValue = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showValue = false,
  valueFormatter = (value) => value.toString(),
  disabled = false,
  required = false,
  label,
  marks = [],
  orientation = 'horizontal',
  className,
  error,
}) => {
  // Reference to the track element
  const trackRef = useRef<HTMLDivElement>(null);
  
  // State for uncontrolled component
  const [sliderValue, setSliderValue] = useState<number>(
    defaultValue !== undefined ? clamp(defaultValue, min, max) : min
  );
  
  // State for tracking mouse/touch interactions
  const [isDragging, setIsDragging] = useState(false);
  
  // Determine if component is controlled
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : sliderValue;
  
  // Clamp a value between min and max
  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
  
  // Calculate the slider percentage (0-100) based on value
  const getPercentage = (value: number): number => {
    return ((value - min) / (max - min)) * 100;
  };
  
  // Get value from percentage
  const getValueFromPercentage = (percentage: number): number => {
    const rawValue = (percentage / 100) * (max - min) + min;
    
    // Apply step
    const steps = Math.round((rawValue - min) / step);
    return min + steps * step;
  };
  
  // Calculate value from pointer position
  const getValueFromPointer = (event: MouseEvent | TouchEvent): number => {
    if (!trackRef.current) return currentValue;
    
    const track = trackRef.current;
    const rect = track.getBoundingClientRect();
    
    let clientPosition: number;
    if ('touches' in event) {
      clientPosition = orientation === 'horizontal' ? 
        event.touches[0].clientX : 
        event.touches[0].clientY;
    } else {
      clientPosition = orientation === 'horizontal' ? 
        event.clientX : 
        event.clientY;
    }
    
    let percentage: number;
    if (orientation === 'horizontal') {
      percentage = ((clientPosition - rect.left) / rect.width) * 100;
    } else {
      // For vertical slider, invert the percentage (0 at bottom, 100 at top)
      percentage = 100 - ((clientPosition - rect.top) / rect.height) * 100;
    }
    
    // Clamp percentage to 0-100 range
    percentage = clamp(percentage, 0, 100);
    
    // Convert percentage to value
    return getValueFromPercentage(percentage);
  };
  
  // Start dragging
  const startDrag = (event: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    
    // Prevent default to avoid text selection
    event.preventDefault();
    
    // Set dragging state
    setIsDragging(true);
    
    // Set initial value based on pointer position
    updateValueFromEvent(event.nativeEvent);
  };
  
  // Update value during drag
  const updateValueFromEvent = (event: MouseEvent | TouchEvent) => {
    const newValue = getValueFromPointer(event);
    const clampedValue = clamp(newValue, min, max);
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSliderValue(clampedValue);
    }
    
    // Notify parent component
    onChange?.(clampedValue);
  };
  
  // Set up event listeners for dragging
  useEffect(() => {
    const handleMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      // Prevent scrolling on touch devices
      event.preventDefault();
      
      updateValueFromEvent(event);
    };
    
    const handleEnd = () => {
      setIsDragging(false);
    };
    
    // Add event listeners for drag behavior
    if (isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, min, max, step, isControlled, onChange]);
  
  // Generate a unique ID for accessibility
  const id = useRef(`slider-${Math.random().toString(36).substring(2, 11)}`);
  
  // Calculate percentage for rendering
  const percentage = getPercentage(currentValue);
  
  return (
    <div className={cn(
      "space-y-2",
      orientation === 'vertical' && "h-48",
      className
    )}>
      {/* Label and value display */}
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <label 
              htmlFor={id.current}
              className="text-sm font-medium text-gray-900"
            >
              {label} {required && <span className="text-destructive">*</span>}
            </label>
          )}
          
          {showValue && (
            <span className="text-sm text-gray-700">
              {valueFormatter(currentValue)}
            </span>
          )}
        </div>
      )}
      
      {/* Slider track */}
      <div
        ref={trackRef}
        className={cn(
          "relative rounded-full bg-gray-200 cursor-pointer",
          orientation === 'horizontal' ? "h-2 w-full" : "w-2 h-full mx-auto",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        aria-disabled={disabled}
      >
        {/* Filled track */}
        <div
          className={cn(
            "absolute rounded-full bg-primary",
            orientation === 'horizontal' 
              ? "h-full left-0" 
              : "w-full bottom-0"
          )}
          style={orientation === 'horizontal' 
            ? { width: `${percentage}%` } 
            : { height: `${percentage}%` }
          }
        />
        
        {/* Thumb */}
        <div
          className={cn(
            "absolute bg-white border-2 border-primary rounded-full h-4 w-4 -translate-x-1/2 -translate-y-1/2 shadow-md focus:outline-none",
            orientation === 'horizontal' 
              ? "top-1/2" 
              : "left-1/2",
            disabled ? "cursor-not-allowed" : "cursor-grab"
          )}
          style={orientation === 'horizontal' 
            ? { left: `${percentage}%` } 
            : { bottom: `${percentage}%`, top: 'auto' }
          }
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={currentValue}
          aria-labelledby={label ? id.current : undefined}
          aria-disabled={disabled}
          aria-orientation={orientation}
          onKeyDown={(e) => {
            if (disabled) return;
            
            let newValue = currentValue;
            const stepSize = step;
            
            switch (e.key) {
              case 'ArrowRight':
              case 'ArrowUp':
                newValue = clamp(currentValue + stepSize, min, max);
                break;
              case 'ArrowLeft':
              case 'ArrowDown':
                newValue = clamp(currentValue - stepSize, min, max);
                break;
              case 'Home':
                newValue = min;
                break;
              case 'End':
                newValue = max;
                break;
              default:
                return;
            }
            
            // Prevent default behavior (scrolling)
            e.preventDefault();
            
            // Update value if changed
            if (newValue !== currentValue) {
              if (!isControlled) {
                setSliderValue(newValue);
              }
              onChange?.(newValue);
            }
          }}
        />
      </div>
      
      {/* Marks */}
      {marks && marks.length > 0 && (
        <div className={cn(
          "relative",
          orientation === 'horizontal' ? "mt-2" : "ml-4 -mt-[10px]",
          orientation === 'horizontal' ? "w-full" : "h-full"
        )}>
          {marks.map((mark) => {
            const markPercentage = getPercentage(mark.value);
            
            return (
              <div
                key={mark.value}
                className={cn(
                  "absolute flex flex-col items-center",
                  orientation === 'horizontal' 
                    ? "-translate-x-1/2" 
                    : "-translate-y-1/2"
                )}
                style={orientation === 'horizontal' 
                  ? { left: `${markPercentage}%` } 
                  : { bottom: `${markPercentage}%` }
                }
              >
                <div className="h-1 w-1 rounded-full bg-gray-400" />
                <span className="mt-1 text-xs text-gray-600">
                  {mark.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

export default Slider; 