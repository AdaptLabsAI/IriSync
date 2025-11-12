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
  ListItemText,
  ListItemIcon,
  Step,
  StepLabel,
  Stepper
} from '@mui/material';
import Grid from '@/components/ui/grid';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import LinkIcon from '@mui/icons-material/Link';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/layouts/MainLayout';
// Import with proper type handling for optional dependencies
import { SyntaxHighlighter, materialLight } from '@/lib/support/syntax-highlighter';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SettingsIcon from '@mui/icons-material/Settings';
import CodeIcon from '@mui/icons-material/Code';
import ApiIcon from '@mui/icons-material/Api';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import LaunchIcon from '@mui/icons-material/Launch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import GitHubIcon from '@mui/icons-material/GitHub';

// Example platform integration code
const codeExamples = {
  oauth: `// Setup OAuth authentication with the platform
const authUrl = 'https://platform.example.com/oauth/authorize';
const params = new URLSearchParams({
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'https://yourdomain.com/platforms/callback',
  response_type: 'code',
  scope: 'read_content,publish_content'
});

// Redirect user to platform's authorization page
window.location.href = \`\${authUrl}?\${params.toString()}\`;`,
  callbackHandler: `// Handle the callback from the platform's OAuth flow
export async function handleCallback(code: string) {
  try {
    // Exchange authorization code for access token
    const response = await fetch('https://platform.example.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: 'YOUR_CLIENT_ID',
        client_secret: 'YOUR_CLIENT_SECRET',
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://yourdomain.com/platforms/callback'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get access token');
    }
    
    // Store the tokens securely
    await storeTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      platformId: 'example_platform',
      userId: 'current_user_id'
    });
    
    return { success: true };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return { success: false, error };
  }
}`,
  postContent: `// Post content to a platform using stored credentials
export async function postToSocialPlatform(content, platform, userId) {
  // Get stored tokens for this user and platform
  const tokens = await getTokensForUserAndPlatform(userId, platform);
  
  if (!tokens || !tokens.accessToken) {
    throw new Error('User not connected to platform');
  }
  
  // Format content according to platform requirements
  const formattedContent = formatContentForPlatform(content, platform);
  
  // Post to the platform
  const response = await fetch('https://api.platform.com/v1/posts', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${tokens.accessToken}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formattedContent)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // Handle token expiration
    if (response.status === 401 && tokens.refreshToken) {
      const newTokens = await refreshAccessToken(platform, tokens.refreshToken);
      if (newTokens) {
        // Retry with new token
        return postToSocialPlatform(content, platform, userId);
      }
    }
    throw new Error(data.error || 'Failed to post content');
  }
  
  return data;
}`
};

// Platform list
const platforms = [
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: <TwitterIcon fontSize="large" sx={{ color: '#1DA1F2' }} />,
    description: 'Connect with your audience through tweets, threads, and media',
    integrationSteps: [
      'Register a Twitter developer account',
      'Create a Twitter App in the developer portal', 
      'Configure OAuth settings and callback URL',
      'Implement the OAuth flow in your application'
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <FacebookIcon fontSize="large" sx={{ color: '#4267B2' }} />,
    description: 'Share content to Facebook pages, groups, and profiles',
    integrationSteps: [
      'Register a Facebook application in the Meta for Developers portal',
      'Configure the App Dashboard with required permissions',
      'Set up OAuth redirect URLs',
      'Implement the Facebook Login flow'
    ]
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <InstagramIcon fontSize="large" sx={{ color: '#E1306C' }} />,
    description: 'Share images and videos with your Instagram audience',
    integrationSteps: [
      'Use the Facebook Developer portal to create an Instagram application',
      'Configure Instagram Basic Display API permissions',
      'Set up OAuth redirect URLs for Instagram',
      'Implement the authentication flow in your application'
    ]
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <LinkedInIcon fontSize="large" sx={{ color: '#0077B5' }} />,
    description: 'Connect with professionals and share business content',
    integrationSteps: [
      'Create a LinkedIn Developer application',
      'Configure OAuth 2.0 settings and redirect URLs',
      'Request necessary API permissions',
      'Implement the LinkedIn authentication flow'
    ]
  }
];

function IntegrationPage() {
  const [activeTab, setActiveTab] = React.useState(0);
  const { data: session } = useSession();
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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
          <Typography color="text.primary">Platform Integration</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IntegrationInstructionsIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h3" component="h1">
            Platform Integration
          </Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Learn how to integrate third-party platforms with IriSync
        </Typography>
        
        <Divider sx={{ mt: 3, mb: 4 }} />
      </Box>
      
      {/* Introduction */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Overview
        </Typography>
        <Typography paragraph>
          IriSync's platform integration capabilities allow you to connect with various third-party services 
          and social media platforms. This guide covers the necessary steps to implement these integrations in 
          your application.
        </Typography>
        <Typography paragraph>
          Most platform integrations use OAuth 2.0 for authentication, allowing your users to grant access
          to their platform accounts without sharing passwords. IriSync simplifies this process with standardized
          connectors for popular platforms.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Before You Begin</Typography>
          <Typography variant="body2">
            You'll need developer accounts for each platform you want to integrate with. Each platform has its own
            developer portal where you can register your application and get API credentials.
          </Typography>
        </Alert>
      </Paper>
      
      {/* Integration Process */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Integration Process
        </Typography>
        <Typography paragraph>
          Integrating with third-party platforms typically follows these steps:
        </Typography>
        
        <Stepper activeStep={-1} orientation="vertical" sx={{ mb: 4 }}>
          <Step>
            <StepLabel>
              <Typography variant="subtitle1">Register Your Application</Typography>
            </StepLabel>
            <Box sx={{ ml: 4, mt: 1, mb: 2 }}>
              <Typography paragraph>
                Create a developer account on the platform and register your application to get API credentials:
              </Typography>
              <List sx={{ pl: 2 }}>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Client ID (or API Key)" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Client Secret" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Redirect URI configuration" />
                </ListItem>
              </List>
            </Box>
          </Step>
          
          <Step>
            <StepLabel>
              <Typography variant="subtitle1">Set Up OAuth Flow</Typography>
            </StepLabel>
            <Box sx={{ ml: 4, mt: 1, mb: 2 }}>
              <Typography paragraph>
                Implement the OAuth 2.0 flow to allow users to authorize your application:
              </Typography>
              <List sx={{ pl: 2 }}>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Create a connect button for the platform" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Redirect users to the platform's authorization page" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Handle the callback with authorization code" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Exchange the code for access tokens" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Store the tokens securely" />
                </ListItem>
              </List>
            </Box>
          </Step>
          
          <Step>
            <StepLabel>
              <Typography variant="subtitle1">Implement API Interactions</Typography>
            </StepLabel>
            <Box sx={{ ml: 4, mt: 1, mb: 2 }}>
              <Typography paragraph>
                Use the obtained access tokens to interact with the platform's API:
              </Typography>
              <List sx={{ pl: 2 }}>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Read data from the platform" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Post content to the platform" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Handle token refreshing when needed" />
                </ListItem>
              </List>
            </Box>
          </Step>
          
          <Step>
            <StepLabel>
              <Typography variant="subtitle1">Handle Edge Cases</Typography>
            </StepLabel>
            <Box sx={{ ml: 4, mt: 1, mb: 2 }}>
              <Typography paragraph>
                Ensure your integration handles common issues:
              </Typography>
              <List sx={{ pl: 2 }}>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Token expiration and refresh" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="API rate limiting" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="Error responses and retries" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText primary="User revocation of access" />
                </ListItem>
              </List>
            </Box>
          </Step>
        </Stepper>
      </Paper>
      
      {/* Platform Integrations */}
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {platforms.map(platform => (
            <Tab key={platform.id} icon={platform.icon} label={platform.name} />
          ))}
        </Tabs>
        
        {platforms.map((platform, index) => (
          <Box key={platform.id} sx={{ p: 4, display: activeTab === index ? 'block' : 'none' }}>
            <Typography variant="h5" gutterBottom>
              {platform.name} Integration
            </Typography>
            <Typography paragraph>
              {platform.description}
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Integration Steps
              </Typography>
              <List>
                {platform.integrationSteps.map((step, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon>
                      <Box sx={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}>
                        {idx + 1}
                      </Box>
                    </ListItemIcon>
                    <ListItemText primary={step} />
                  </ListItem>
                ))}
              </List>
            </Box>
            
            <Alert severity="info" sx={{ mb: 4 }}>
              <Typography variant="subtitle2">Developer Resources</Typography>
              <Typography variant="body2" paragraph>
                Visit the platform's developer documentation for detailed API information:
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<CodeIcon />}
                href={`https://developer.${platform.id}.com`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mr: 2 }}
              >
                Developer Portal
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<ApiIcon />}
                href={`https://developer.${platform.id}.com/docs`}
                target="_blank"
                rel="noopener noreferrer"
              >
                API Reference
              </Button>
            </Alert>
          </Box>
        ))}
      </Paper>
      
      {/* Code Examples */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Code Examples
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            OAuth Authorization
          </Typography>
          <Typography paragraph>
            Redirect the user to the platform's authorization page:
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
            {codeExamples.oauth}
          </SyntaxHighlighter>
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Handling OAuth Callback
          </Typography>
          <Typography paragraph>
            Process the callback from the platform and exchange the code for tokens:
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
            {codeExamples.callbackHandler}
          </SyntaxHighlighter>
        </Box>
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Posting Content to Platforms
          </Typography>
          <Typography paragraph>
            Send content to a connected platform using stored credentials:
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
            {codeExamples.postContent}
          </SyntaxHighlighter>
        </Box>
      </Paper>
      
      {/* Best Practices */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Best Practices
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <VpnKeyIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Security
                  </Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Never expose client secrets in client-side code" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Use HTTPS for all API requests" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Encrypt stored access tokens" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Use state parameters in OAuth to prevent CSRF attacks" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SettingsIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Reliability
                  </Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Implement token refresh logic" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Handle API rate limits with backoff strategies" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Implement error handling and retry logic" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Monitor platform API changes and deprecations" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LinkIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    User Experience
                  </Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Provide clear connection status indicators" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Allow users to disconnect platforms easily" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Show appropriate error messages for connection issues" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Request minimum required permissions" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CodeIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Development
                  </Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Use platform-specific SDKs when available" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Create abstractions for common platform operations" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Document platform-specific quirks and limitations" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Test integrations thoroughly with different account types" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Next Steps */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Next Steps
        </Typography>
        <Typography paragraph>
          Explore these resources to learn more about specific integration points:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/authentication"
          >
            API Authentication
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/webhooks"
          >
            Using Webhooks
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
            href="/documentation/category/api-guides/examples"
          >
            Code Examples
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default function WrappedIntegrationPage() {
  return (
    <MainLayout>
      <IntegrationPage />
    </MainLayout>
  );
} 