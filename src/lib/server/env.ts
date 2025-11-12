const cache = new Map<string, string>();

function readEnv(key: string, { optional = false }: { optional?: boolean } = {}): string {
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const value = process.env[key];

  if (!value || value.trim() === '') {
    if (optional) {
      cache.set(key, '');
      return '';
    }

    throw new Error(`Missing required environment variable: ${key}`);
  }

  cache.set(key, value);
  return value;
}

export function getGenLangApiKey(): string {
  return readEnv('GEN_LANG_API_KEY');
}

export function getGoogleOAuthClientId(): string {
  return readEnv('GOOGLE_OAUTH_CLIENT_ID');
}

export function getStripeSecretKey(): string {
  return readEnv('STRIPE_SECRET_KEY', { optional: true });
}

export function getNextAuthSecret(): string {
  return readEnv('NEXTAUTH_SECRET', { optional: true });
}

export const firebaseAdminServiceAccount = {
  projectId: () => readEnv('FIREBASE_ADMIN_PROJECT_ID', { optional: true }),
  clientEmail: () => readEnv('FIREBASE_ADMIN_CLIENT_EMAIL', { optional: true }),
  privateKey: () => readEnv('FIREBASE_ADMIN_PRIVATE_KEY', { optional: true }),
};

export function assertServerEnv() {
  getGenLangApiKey();
}

export function getOptionalEnv(key: string): string {
  return readEnv(key, { optional: true });
}
