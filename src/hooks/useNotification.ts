'use client';

import { useNotification as useMuiNotification, NotificationOptions } from '../components/ui/mui-components';

export const useNotification = () => {
  return useMuiNotification();
};

export type { NotificationOptions };
export default useNotification; 