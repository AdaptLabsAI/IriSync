@echo off
echo Preparing Firebase Admin environment variables...

echo Using default project configuration unless environment variables are already set.
if not defined FIREBASE_ADMIN_PROJECT_ID set FIREBASE_ADMIN_PROJECT_ID=irisai-c83a1
if not defined FIREBASE_ADMIN_CLIENT_EMAIL set FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@irisai-c83a1.iam.gserviceaccount.com

if not defined FIREBASE_ADMIN_PRIVATE_KEY (
  echo FIREBASE_ADMIN_PRIVATE_KEY is not defined. Please set it in your environment before running this script.
  exit /b 1
)

echo Running migration script...
node scripts/compiled/migrate-organization-roles.js %1

echo Migration complete.
pause
