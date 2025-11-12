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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import WebhookIcon from '@mui/icons-material/Webhook';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/layouts/MainLayout';
// Import with proper type handling for optional dependencies
import { SyntaxHighlighter, materialLight } from '@/lib/features/support/syntax-highlighter';
import SecurityIcon from '@mui/icons-material/Security';
import EventIcon from '@mui/icons-material/Event';
import VerifiedIcon from '@mui/icons-material/Verified';
import DnsIcon from '@mui/icons-material/Dns';
import CodeIcon from '@mui/icons-material/Code';
import ApiIcon from '@mui/icons-material/Api';
import Grid from '@/components/ui/grid';

// Example code for webhooks
const codeExamples = {
  handleWebhook: `// Example Express.js webhook handler
const express = require('express');
const crypto = require('crypto');
const app = express();

// Parse JSON requests
app.use(express.json({
  verify: (req, res, buf) => {
    // Store the raw body for webhook signature verification
    req.rawBody = buf;
  }
}));

app.post('/webhooks/irisync', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-irisync-signature'];
    const timestamp = req.headers['x-irisync-timestamp'];
    const webhookSecret = process.env.IRISYNC_WEBHOOK_SECRET;
    
    const payload = req.rawBody.toString();
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(\`\${timestamp}.\${payload}\`)
      .digest('hex');
    
    // Compare signatures
    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }
    
    // Process the webhook event
    const event = req.body;
    
    switch (event.type) {
      case 'content.published':
        await handleContentPublished(event.data);
        break;
      case 'user.subscribed':
        await handleUserSubscribed(event.data);
        break;
      default:
        console.log(\`Unhandled event type: \${event.type}\`);
    }
    
    // Always respond with 200 to acknowledge receipt
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});`,
  webhookRegistration: `// Register a new webhook programmatically
async function registerWebhook() {
  const response = await fetch('https://api.irisync.com/api/webhooks', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://your-domain.com/webhooks/irisync',
      events: ['content.published', 'user.subscribed', 'platform.connected'],
      description: 'Production webhook for content updates',
      active: true,
      secret: 'your_webhook_secret'  // Optional: If not provided, IriSync will generate one
    })
  });
  
  const data = await response.json();
  return data;
}`,
  handleRetries: `// Handling webhook retries and idempotency
function isIdempotentlyProcessed(eventId) {
  // Check if this event has already been processed
  // This could be a database check, Redis, etc.
  return db.webhookEvents.exists(eventId);
}

function markEventProcessed(eventId) {
  // Mark this event as processed to prevent duplicate processing
  return db.webhookEvents.create({ eventId, processedAt: new Date() });
}

app.post('/webhooks/irisync', async (req, res) => {
  try {
    // Verification code...
    
    const event = req.body;
    const eventId = event.id;
    
    // Check if already processed to ensure idempotency
    if (await isIdempotentlyProcessed(eventId)) {
      console.log(\`Event \${eventId} already processed\`);
      return res.status(200).send('Event already processed');
    }
    
    // Process the event...
    
    // Mark as processed after successful processing
    await markEventProcessed(eventId);
    
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});`
};

// Webhook event types
const webhookEvents = [
  {
    type: 'content.published',
    description: 'Triggered when content is published',
    payload: {
      id: 'evt_123abc',
      type: 'content.published',
      created: '2023-06-15T14:30:00Z',
      data: {
        content_id: 'cnt_456def',
        title: 'New Blog Post',
        status: 'published',
        published_at: '2023-06-15T14:30:00Z',
        author_id: 'usr_789ghi',
        platforms: ['twitter', 'linkedin']
      }
    }
  },
  {
    type: 'content.updated',
    description: 'Triggered when content is modified',
    payload: {
      id: 'evt_234bcd',
      type: 'content.updated',
      created: '2023-06-16T09:15:00Z',
      data: {
        content_id: 'cnt_456def',
        title: 'Updated Blog Post',
        status: 'published',
        updated_at: '2023-06-16T09:15:00Z',
        author_id: 'usr_789ghi'
      }
    }
  },
  {
    type: 'user.subscribed',
    description: 'Triggered when a user subscribes to a plan',
    payload: {
      id: 'evt_345cde',
      type: 'user.subscribed',
      created: '2023-06-17T11:00:00Z',
      data: {
        user_id: 'usr_890jkl',
        plan_id: 'pln_123abc',
        subscription_id: 'sub_456def',
        status: 'active',
        trial_end: '2023-07-17T11:00:00Z',
        billing_interval: 'month'
      }
    }
  },
  {
    type: 'platform.connected',
    description: 'Triggered when a platform is connected',
    payload: {
      id: 'evt_456def',
      type: 'platform.connected',
      created: '2023-06-18T13:45:00Z',
      data: {
        user_id: 'usr_901lmn',
        platform_id: 'twitter',
        connected_at: '2023-06-18T13:45:00Z',
        status: 'active',
        scopes: ['read', 'write']
      }
    }
  }
];

function WebhooksPage() {
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
          <Typography color="text.primary">Using Webhooks</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WebhookIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h3" component="h1">
            Using Webhooks
          </Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Learn how to set up and manage webhooks for real-time notifications
        </Typography>
        
        <Divider sx={{ mt: 3, mb: 4 }} />
      </Box>
      
      {/* Introduction */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          What are Webhooks?
        </Typography>
        <Typography paragraph>
          Webhooks allow IriSync to send real-time notifications to your application when specific events occur. 
          Rather than requiring your application to constantly poll the API for changes, webhooks provide 
          push-based updates delivered directly to your specified endpoint.
        </Typography>
        <Typography paragraph>
          When an event happens in IriSync (such as content being published or a user subscribing), 
          a webhook sends an HTTP POST request to your configured URL with information about the event.
          Your application can then react to these events in real-time.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Use Cases for Webhooks</Typography>
          <Box component="ul" sx={{ pl: 2, mb: 0 }}>
            <li>Trigger automated workflows when content is published</li>
            <li>Sync data between IriSync and your application</li>
            <li>Receive real-time notifications about user activities</li>
            <li>Track platform connections and disconnections</li>
            <li>Monitor subscription changes and billing events</li>
          </Box>
        </Alert>
      </Paper>
      
      {/* Getting Started */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Getting Started with Webhooks
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            1. Creating a Webhook Endpoint
          </Typography>
          <Typography paragraph>
            First, create an endpoint in your application that can receive POST requests. 
            This endpoint should:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <DnsIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Be publicly accessible" 
                secondary="IriSync needs to reach your server to deliver events" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Use HTTPS" 
                secondary="Webhooks contain sensitive data and should be sent securely" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <VerifiedIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Validate webhook signatures" 
                secondary="Confirm that events are actually coming from IriSync" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <EventIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Process events idempotently" 
                secondary="Handle potential duplicate events gracefully" 
              />
            </ListItem>
          </List>
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            2. Registering Your Webhook
          </Typography>
          <Typography paragraph>
            Once your endpoint is ready, register it with IriSync:
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Box borderRadius={1} border={1} borderColor="divider" p={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Option 1: Via Dashboard
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Go to Settings > Webhooks" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Click 'Create Webhook'" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Enter your endpoint URL" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Select events to subscribe to" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Click 'Save'" />
                  </ListItem>
                </List>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box borderRadius={1} border={1} borderColor="divider" p={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Option 2: Via API
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Use the Webhooks API endpoint" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Send a POST request with endpoint details" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Include event types to subscribe to" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Store the returned webhook ID and secret" />
                  </ListItem>
                </List>
              </Box>
            </Grid>
          </Grid>
          <Typography paragraph>
            Example code for registering a webhook via the API:
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
            {codeExamples.webhookRegistration}
          </SyntaxHighlighter>
        </Box>
        
        <Box>
          <Typography variant="h6" gutterBottom>
            3. Testing Your Webhook
          </Typography>
          <Typography paragraph>
            After registering your webhook, you can test it:
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Use the 'Test Webhook' button in the dashboard" 
                secondary="Sends a test event to your endpoint" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Check logs for incoming test events" 
                secondary="Verify your endpoint is receiving and processing events correctly" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Trigger real events in your IriSync account" 
                secondary="For example, publish a piece of content" 
              />
            </ListItem>
          </List>
        </Box>
      </Paper>
      
      {/* Event Types */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Webhook Event Types
        </Typography>
        <Typography paragraph>
          IriSync webhooks can notify you about various events. Here are the main event categories:
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Content Events
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="content.created" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="content.published" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="content.updated" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="content.deleted" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Events
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="user.created" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="user.updated" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="user.subscribed" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="user.unsubscribed" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Platform Events
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="platform.connected" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="platform.disconnected" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="platform.post.success" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="platform.post.failed" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          {webhookEvents.map((event) => (
            <Tab key={event.type} label={event.type} />
          ))}
        </Tabs>
        
        {webhookEvents.map((event, index) => (
          <Box key={event.type} sx={{ display: activeTab === index ? 'block' : 'none' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {event.type}
              </Typography>
              <Typography paragraph>
                {event.description}
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              Example Payload
            </Typography>
            <SyntaxHighlighter
              language="json"
              style={materialLight}
              customStyle={{
                borderRadius: 4,
                padding: 16,
                fontSize: 14
              }}
            >
              {JSON.stringify(event.payload, null, 2)}
            </SyntaxHighlighter>
          </Box>
        ))}
      </Paper>
      
      {/* Security */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Webhook Security
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Signature Verification
          </Typography>
          <Typography paragraph>
            Every webhook request from IriSync includes a signature in the <code>X-IriSync-Signature</code> header.
            This allows you to verify that the request came from IriSync and not a third party.
          </Typography>
          <Typography paragraph>
            To verify the signature:
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Get the signature from the X-IriSync-Signature header" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Get the timestamp from the X-IriSync-Timestamp header" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Create an HMAC SHA-256 hash of [timestamp].[payload] using your webhook secret" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Compare this hash to the signature in the header" 
              />
            </ListItem>
          </List>
        </Box>
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Best Security Practices
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Always verify the signature" 
                    secondary="Don't process webhooks without verifying" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Keep your webhook secret secure" 
                    secondary="Never commit it to public repositories" 
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Use HTTPS endpoints" 
                    secondary="Protect data in transit" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Rotate webhook secrets periodically" 
                    secondary="In the Settings > Webhooks section" 
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      {/* Implementation Example */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Webhook Implementation Example
        </Typography>
        <Typography paragraph>
          Here's a complete example of a Node.js webhook handler using Express:
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
          {codeExamples.handleWebhook}
        </SyntaxHighlighter>
      </Paper>
      
      {/* Reliability */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Webhook Reliability
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Handling Retries
          </Typography>
          <Typography paragraph>
            If your endpoint returns a non-2xx response code or times out, IriSync will retry the webhook 
            delivery on the following schedule:
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="1st retry: 5 minutes after initial failure" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="2nd retry: 30 minutes after initial failure" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="3rd retry: 2 hours after initial failure" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="4th retry: 5 hours after initial failure" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="5th retry: 10 hours after initial failure" 
              />
            </ListItem>
          </List>
          <Typography paragraph>
            After the 5th retry, the webhook will be marked as failed and will not be retried again.
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Idempotency
          </Typography>
          <Typography paragraph>
            Since webhooks might be delivered more than once, ensure your webhook handler is idempotent –
            it should produce the same result even if the same event is processed multiple times.
          </Typography>
          <Typography paragraph>
            Example of handling webhook idempotency:
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
            {codeExamples.handleRetries}
          </SyntaxHighlighter>
        </Box>
      </Paper>
      
      {/* Monitoring and Debugging */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Monitoring and Debugging
        </Typography>
        <Typography paragraph>
          IriSync provides tools to help you monitor and debug your webhooks:
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Webhook Logs
                </Typography>
                <Typography paragraph>
                  View detailed logs for each webhook delivery:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Go to Settings > Webhooks" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Click on a webhook" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="View the 'Recent Deliveries' section" />
                  </ListItem>
                </List>
                <Typography variant="body2">
                  Logs include request details, response codes, and timestamps for each attempt.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Webhook Testing
                </Typography>
                <Typography paragraph>
                  Test webhooks without triggering real events:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Go to Settings > Webhooks" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Select a webhook" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Click 'Send Test Event'" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Select an event type" />
                  </ListItem>
                </List>
                <Typography variant="body2">
                  Test events are clearly marked with a test flag in the payload.
                </Typography>
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
          Now that you understand webhooks, explore these related resources:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/endpoints"
            startIcon={<ApiIcon />}
          >
            API Endpoints Reference
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/documentation/category/api-guides/integration"
            startIcon={<CodeIcon />}
          >
            Platform Integration
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/api-reference#webhooks"
            startIcon={<WebhookIcon />}
          >
            Webhooks API Reference
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default function WrappedWebhooksPage() {
  return (
    <MainLayout>
      <WebhooksPage />
    </MainLayout>
  );
} 