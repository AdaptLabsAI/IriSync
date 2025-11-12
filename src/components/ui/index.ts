'use client';

/**
 * Export UI components
 */

// Core UI components
export * from './card';
export * from './skeleton';
export * from './alert';
export * from './form';
export * from './input';
export * from './select';
export * from './dialog';
export * from './tabs';
export * from './textarea';
export * from './use-toast';
export * from './table';
export * from './tag-input';
export * from './tooltip';
export * from './button';
export * from './checkbox';
export * from './radio';
export * from './switch';
export * from './spinner';
export * from './avatar';
export * from './dropdown-menu';
export * from './popover';
export * from './command';
export * from './separator';

// Export the Grid component (note: using correct casing)
// export { default as Grid } from './Grid';

// Re-export from individual files
import Badge from './Badge';
import Button, { IconButton } from './button';
import { label as Label } from './label';
import { Input as TextInput } from './input';
import Alert from './alert';

// Export individual components
export {
  Alert,
  Badge,
  Button,
  IconButton,
  Label,
  TextInput
};

// Export MUI components through our wrappers
export {
  Box,
  Container,
  Spinner,
  Input,
  SimpleGrid,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  FormControl,
  FormLabel,
  NotificationProvider,
  useNotification,
  useModal,
  useDisclosure,
  Select
} from './mui-components'; 