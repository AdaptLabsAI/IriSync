'use client';

import React from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Breadcrumbs,
  Link as MuiLink,
  Divider,
  Alert,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/layouts/MainLayout';
// Import with proper type handling for optional dependencies
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// Code examples
const codeExamples = {
  apiKey: {
    curl: `curl -X GET "https://api.irisync.com/api/users/me" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    javascript: `// Using fetch API
const fetchUser = async () => {
  const response = await fetch('https://api.irisync.com/api/users/me', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
};`,
    python: `import requests

def fetch_user():
    headers = {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
    
    response = requests.get('https://api.irisync.com/api/users/me', headers=headers)
    return response.json()`,
    php: `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.irisync.com/api/users/me');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
?>`,
  },
  oauth: {
    authFlow: `// 1. Redirect user to authorization URL
window.location.href = 'https://api.irisync.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=read,write';

// 2. After user authorizes, handle the callback
const handleCallback = async (code) => {
  const response = await fetch('https://api.irisync.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET',
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: 'YOUR_REDIRECT_URI'
    })
  });
  
  const { access_token, refresh_token, expires_in } = await response.json();
  // Store these tokens securely
};`,
    refreshToken: `// When token expires, use refresh token to get a new one
const refreshAccessToken = async (refreshToken) => {
  const response = await fetch('https://api.irisync.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  const { access_token, refresh_token, expires_in } = await response.json();
  // Store the new tokens
};`
  }
};

function AuthenticationPage() {
  const [activeTab, setActiveTab] = React.useState(0);
  const [activeCodeTab, setActiveCodeTab] = React.useState(0);
  const { data: session } = useSession();
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCodeTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveCodeTab(newValue);
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header and Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/documentation" color="inherit">
            Documentation
          </MuiLink>
          <MuiLink component={Link} href="/documentation/category/api-guides" color="inherit">
            API Guides
          </MuiLink>
          <Typography color="text.primary">Authentication</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LockIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h3" component="h1">
            API Authentication
          </Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Learn how to authenticate your requests to the IriSync API
        </Typography>
        
        <Divider sx={{ mt: 3, mb: 4 }} />
      </Box>
      
      {/* Introduction */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Overview
        </Typography>
        <Typography paragraph>
          The IriSync API uses OAuth 2.0 and API keys for authentication. All API requests must include 
          authentication credentials in the request headers. Unauthenticated requests will be rejected with 
          a 401 Unauthorized response.
        </Typography>
        <Typography paragraph>
          There are two authentication methods available:
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="API Keys" 
              secondary="Simple method for server-to-server communication where you control both the client and server" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="OAuth 2.0" 
              secondary="Recommended for third-party applications acting on behalf of IriSync users" 
            />
          </ListItem>
        </List>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Production vs. Development</Typography>
          <Typography variant="body2">
            We recommend using separate API keys for production and development environments to prevent 
            any accidental modifications to production data.
          </Typography>
        </Alert>
      </Paper>
      
      {/* Authentication Methods Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="API Key Authentication" />
          <Tab label="OAuth 2.0 Authentication" />
        </Tabs>
        
        {/* API Key Authentication */}
        <Box sx={{ p: 4, display: activeTab === 0 ? 'block' : 'none' }}>
          <Typography variant="h5" gutterBottom>
            API Key Authentication
          </Typography>
          <Typography paragraph>
            API keys provide a simple way to authenticate with the IriSync API. Each API key is associated with 
            your IriSync account and has specific permissions.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Obtaining an API Key
            </Typography>
            <Typography paragraph>
              To get an API key:
            </Typography>
            <ol>
              <li>
                <Typography paragraph>
                  Log in to your IriSync account
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  Go to Settings &gt; API Keys
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  Click "Create New API Key"
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  Name your key and select the appropriate permissions
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  Copy your API key (it will only be shown once)
                </Typography>
              </li>
            </ol>
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2">Important Security Notice</Typography>
              <Typography variant="body2">
                Your API key provides access to your IriSync account. Never share it publicly or 
                include it in client-side code. Store it securely and only use it in server-side applications.
              </Typography>
            </Alert>
          </Box>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Using Your API Key
            </Typography>
            <Typography paragraph>
              Include your API key in the Authorization header of your requests as a Bearer token:
            </Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography fontFamily="monospace">
                Authorization: Bearer YOUR_API_KEY
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              Example Request
            </Typography>
            <Tabs
              value={activeCodeTab}
              onChange={handleCodeTabChange}
              indicatorColor="secondary"
              textColor="secondary"
              sx={{ mb: 2 }}
            >
              <Tab label="cURL" />
              <Tab label="JavaScript" />
              <Tab label="Python" />
              <Tab label="PHP" />
            </Tabs>
            {activeCodeTab === 0 && (
              <SyntaxHighlighter
                language="bash"
                style={materialLight}
                customStyle={{
                  borderRadius: 4,
                  padding: 16,
                  fontSize: 14
                }}
              >
                {codeExamples.apiKey.curl}
              </SyntaxHighlighter>
            )}
            {activeCodeTab === 1 && (
              <SyntaxHighlighter
                language="javascript"
                style={materialLight}
                customStyle={{
                  borderRadius: 4,
                  padding: 16,
                  fontSize: 14
                }}
              >
                {codeExamples.apiKey.javascript}
              </SyntaxHighlighter>
            )}
            {activeCodeTab === 2 && (
              <SyntaxHighlighter
                language="python"
                style={materialLight}
                customStyle={{
                  borderRadius: 4,
                  padding: 16,
                  fontSize: 14
                }}
              >
                {codeExamples.apiKey.python}
              </SyntaxHighlighter>
            )}
            {activeCodeTab === 3 && (
              <SyntaxHighlighter
                language="php"
                style={materialLight}
                customStyle={{
                  borderRadius: 4,
                  padding: 16,
                  fontSize: 14
                }}
              >
                {codeExamples.apiKey.php}
              </SyntaxHighlighter>
            )}
          </Box>
          
          <Box>
            <Typography variant="h6" gutterBottom>
              API Key Management Best Practices
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Rotate keys regularly" 
                  secondary="Create new API keys and deprecate old ones on a schedule" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Use environment variables" 
                  secondary="Never hardcode API keys in your application code" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Limit permissions" 
                  secondary="Grant only the permissions each key needs" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Monitor usage" 
                  secondary="Regularly check API key usage in your IriSync dashboard" 
                />
              </ListItem>
            </List>
          </Box>
        </Box>
        
        {/* OAuth 2.0 Authentication */}
        <Box sx={{ p: 4, display: activeTab === 1 ? 'block' : 'none' }}>
          <Typography variant="h5" gutterBottom>
            OAuth 2.0 Authentication
          </Typography>
          <Typography paragraph>
            OAuth 2.0 is the recommended authentication method for third-party applications that need to 
            access IriSync on behalf of users without storing their credentials.
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Setting Up OAuth
            </Typography>
            <Typography paragraph>
              To use OAuth with IriSync:
            </Typography>
            <ol>
              <li>
                <Typography paragraph>
                  Register your application in the IriSync Developer Portal
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  Obtain your Client ID and Client Secret
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  Configure your redirect URIs
                </Typography>
              </li>
            </ol>
            <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
              <Typography variant="subtitle2">Redirect URIs</Typography>
              <Typography variant="body2">
                Your redirect URI must exactly match what you registered in the Developer Portal. We recommend using HTTPS for all redirect URIs in production.
              </Typography>
            </Alert>
          </Box>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              OAuth 2.0 Flow
            </Typography>
            <Typography paragraph>
              IriSync supports the standard OAuth 2.0 Authorization Code flow:
            </Typography>
            
            <Card sx={{ mb: 2, border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  1. Redirect to Authorization URL
                </Typography>
                <Typography variant="body2" paragraph>
                  Redirect the user to the IriSync authorization URL:
                </Typography>
                <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography fontFamily="monospace" fontSize="0.875rem">
                    https://api.irisync.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=read,write
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Card sx={{ mb: 2, border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  2. Handle the Callback
                </Typography>
                <Typography variant="body2" paragraph>
                  After the user authorizes your application, IriSync will redirect to your redirect URI with an authorization code:
                </Typography>
                <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography fontFamily="monospace" fontSize="0.875rem">
                    https://your-app.com/callback?code=AUTHORIZATION_CODE
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Card sx={{ mb: 2, border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  3. Exchange Code for Access Token
                </Typography>
                <Typography variant="body2" paragraph>
                  Exchange the authorization code for an access token:
                </Typography>
                <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography fontFamily="monospace" fontSize="0.875rem" sx={{ whiteSpace: 'pre-wrap' }}>
                    {`POST https://api.irisync.com/oauth/token

Content-Type: application/json

{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE",
  "grant_type": "authorization_code",
  "redirect_uri": "YOUR_REDIRECT_URI"
}`}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Card sx={{ border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  4. Use Access Token in API Requests
                </Typography>
                <Typography variant="body2" paragraph>
                  Include the access token in the Authorization header of your API requests:
                </Typography>
                <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                  <Typography fontFamily="monospace" fontSize="0.875rem">
                    Authorization: Bearer ACCESS_TOKEN
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Refreshing Access Tokens
            </Typography>
            <Typography paragraph>
              Access tokens expire after a certain period (usually 1 hour). Use the refresh token to obtain a new access token:
            </Typography>
            <SyntaxHighlighter
              language="javascript"
              style={materialLight}
              customStyle={{
                borderRadius: 4,
                padding: 16,
                fontSize: 14
              }}
            >
              {codeExamples.oauth.refreshToken}
            </SyntaxHighlighter>
          </Box>
          
          <Box>
            <Typography variant="h6" gutterBottom>
              Available Scopes
            </Typography>
            <Typography paragraph>
              Scopes define the level of access your application has to a user's IriSync account:
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="read" 
                  secondary="Read-only access to user data" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="write" 
                  secondary="Modify user data" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="content:read" 
                  secondary="Access content data only" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="content:write" 
                  secondary="Create and modify content" 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="analytics:read" 
                  secondary="Access analytics data" 
                />
              </ListItem>
            </List>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Best Practice</Typography>
              <Typography variant="body2">
                Always request the minimal set of scopes needed for your application.
              </Typography>
            </Alert>
          </Box>
        </Box>
      </Paper>
      
      {/* Next Steps */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Next Steps
        </Typography>
        <Typography paragraph>
          Now that you understand authentication, check out these resources:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/endpoints"
          >
            API Endpoints Reference
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/api-reference"
          >
            API Reference
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/integration"
          >
            Platform Integration
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default function WrappedAuthenticationPage() {
  return (
    <MainLayout>
      <AuthenticationPage />
    </MainLayout>
  );
}