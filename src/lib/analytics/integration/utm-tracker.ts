/**
 * UTM tracking parameters interface
 */
export interface UTMParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  landing_time?: string;
}

/**
 * Setup UTM parameter tracking
 * Extracts UTM parameters from URL and stores them in session storage
 */
export function setupUTMTracking(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  const utmParams: UTMParameters = {};
  let hasParams = false;
  
  // Extract all UTM parameters
  const params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  params.forEach(param => {
    const value = url.searchParams.get(param);
    if (value) {
      utmParams[param as keyof UTMParameters] = value;
      hasParams = true;
    }
  });
  
  // Only store UTM parameters if we have at least one, or if we don't have any stored yet
  if (hasParams || !sessionStorage.getItem('irisync_utm_params')) {
    // Add additional tracking data
    utmParams.referrer = document.referrer || '';
    utmParams.landing_page = window.location.pathname;
    utmParams.landing_time = new Date().toISOString();
    
    // Store in session storage to persist during the session
    sessionStorage.setItem('irisync_utm_params', JSON.stringify(utmParams));
  }
}

/**
 * Get stored UTM parameters
 * @returns The stored UTM parameters, or empty object if none
 */
export function getUTMParameters(): UTMParameters {
  if (typeof window === 'undefined') return {};

  try {
    const utmParamsStr = sessionStorage.getItem('irisync_utm_params');
    if (utmParamsStr) {
      return JSON.parse(utmParamsStr) as UTMParameters;
    }
  } catch (error) {
    console.error('Error retrieving UTM parameters:', error);
  }
  
  return {};
}

/**
 * Clear stored UTM parameters
 */
export function clearUTMParameters(): void {
  if (typeof window === 'undefined') return;
  
  sessionStorage.removeItem('irisync_utm_params');
}

/**
 * Add UTM parameters to an event properties object
 * @param properties The event properties to enrich with UTM data
 * @returns The properties with UTM parameters added
 */
export function addUTMToEventProperties(
  properties: Record<string, any> = {}
): Record<string, any> {
  const utmParams = getUTMParameters();
  
  if (Object.keys(utmParams).length === 0) {
    return properties;
  }
  
  // Create a copy of properties object with UTM data
  return {
    ...properties,
    utm_source: utmParams.utm_source,
    utm_medium: utmParams.utm_medium,
    utm_campaign: utmParams.utm_campaign,
    utm_term: utmParams.utm_term,
    utm_content: utmParams.utm_content,
    original_referrer: utmParams.referrer,
    landing_page: utmParams.landing_page,
    landing_time: utmParams.landing_time
  };
}

/**
 * Generate a UTM-tagged URL
 * @param baseUrl The base URL to add UTM parameters to
 * @param utmParams The UTM parameters to add
 * @returns The URL with UTM parameters added
 */
export function generateUTMUrl(
  baseUrl: string,
  utmParams: UTMParameters
): string {
  try {
    const url = new URL(baseUrl);
    const params = Object.entries(utmParams)
      .filter(([_, value]) => value !== undefined && value !== '');
    
    params.forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });
    
    return url.toString();
  } catch (e) {
    console.error('Error generating UTM URL:', e);
    return baseUrl;
  }
}
