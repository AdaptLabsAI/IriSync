'use client';

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Link as MuiLink,
  Breadcrumbs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Button
} from '@mui/material';
import Grid from '@/components/ui/grid';
import Link from 'next/link';

export default function CookiesPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <Typography color="text.primary">Cookie Policy</Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Cookie Policy
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Last updated: May 15, 2025
        </Typography>
      </Box>
      
      {/* Content */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, position: { md: 'sticky' }, top: { md: 100 } }}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Box component="li" sx={{ mb: 1 }}>
                <MuiLink component={Link} href="#what-are-cookies">
                  What Are Cookies?
                </MuiLink>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <MuiLink component={Link} href="#cookies-we-use">
                  Cookies We Use
                </MuiLink>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <MuiLink component={Link} href="#third-party-cookies">
                  Third-Party Cookies
                </MuiLink>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <MuiLink component={Link} href="#managing-cookies">
                  Managing Cookies
                </MuiLink>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <MuiLink component={Link} href="#policy-changes">
                  Changes to This Policy
                </MuiLink>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <MuiLink component={Link} href="#contact">
                  Contact Us
                </MuiLink>
              </Box>
            </Box>
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" gutterBottom>
                Related Policies
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button component={Link} href="/privacy" variant="outlined" size="small" fullWidth>
                  Privacy Policy
                </Button>
                <Button component={Link} href="/terms" variant="outlined" size="small" fullWidth>
                  Terms of Service
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="body1" paragraph>
              This Cookie Policy explains how IriSync ("we", "us", or "our") uses cookies and similar technologies on our website and services. This policy provides you with information about what cookies are, what cookies we use, and how you can manage them.
            </Typography>
            
            {/* Keep all original content from the cookies page */}
            <Box id="what-are-cookies" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                What Are Cookies?
              </Typography>
              <Typography variant="body1" paragraph>
                Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently, provide basic functionality such as remembering your preferences, and provide information to the owners of the site.
              </Typography>
              <Typography variant="body1" paragraph>
                Cookies can be "persistent" or "session" cookies. Persistent cookies remain on your device when you go offline, while session cookies are deleted as soon as you close your web browser.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="cookies-we-use" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                Cookies We Use
              </Typography>
              <Typography variant="body1" paragraph>
                We use different types of cookies for different purposes. The cookies we use can be categorized as follows:
              </Typography>
              
              <TableContainer component={Paper} variant="outlined" sx={{ my: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type of Cookie</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Purpose</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Essential Cookies</TableCell>
                      <TableCell>
                        These cookies are necessary for the website to function properly. They enable basic functions like page navigation, access to secure areas, and enable our services to work correctly. The website cannot function properly without these cookies.
                      </TableCell>
                      <TableCell>Session / Persistent</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Preference Cookies</TableCell>
                      <TableCell>
                        These cookies allow us to remember choices you make when you use our website, such as remembering your login details, language preference, or your customized settings. They enhance your experience by providing more personalized functionality.
                      </TableCell>
                      <TableCell>Persistent (1 year)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Analytics Cookies</TableCell>
                      <TableCell>
                        These cookies help us understand how visitors interact with our website. They provide information about the areas visited, time spent on the site, and any issues encountered. This helps us improve the performance of our website and services.
                      </TableCell>
                      <TableCell>Persistent (2 years)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Marketing Cookies</TableCell>
                      <TableCell>
                        These cookies track your online activity to help us deliver more relevant advertising or to limit how many times you see an ad. They can also help us measure the effectiveness of our marketing campaigns.
                      </TableCell>
                      <TableCell>Persistent (1-2 years)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Typography variant="body1" paragraph>
                Below is a detailed list of the first-party cookies we use:
              </Typography>
              
              <TableContainer component={Paper} variant="outlined" sx={{ my: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Cookie Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Purpose</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>irisync_session</TableCell>
                      <TableCell>Essential</TableCell>
                      <TableCell>Maintains your session state</TableCell>
                      <TableCell>Session</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>irisync_auth</TableCell>
                      <TableCell>Essential</TableCell>
                      <TableCell>Authentication token</TableCell>
                      <TableCell>30 days</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>irisync_preferences</TableCell>
                      <TableCell>Preference</TableCell>
                      <TableCell>Stores your preferences and settings</TableCell>
                      <TableCell>1 year</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>irisync_language</TableCell>
                      <TableCell>Preference</TableCell>
                      <TableCell>Remembers your language selection</TableCell>
                      <TableCell>1 year</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>irisync_analytics</TableCell>
                      <TableCell>Analytics</TableCell>
                      <TableCell>Collects anonymous information about how you use our site</TableCell>
                      <TableCell>2 years</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>irisync_marketing</TableCell>
                      <TableCell>Marketing</TableCell>
                      <TableCell>Tracks your interests to deliver more relevant ads</TableCell>
                      <TableCell>1 year</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="third-party-cookies" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                Third-Party Cookies
              </Typography>
              <Typography variant="body1" paragraph>
                In addition to our own cookies, we may also use various third-party cookies to enhance our services, improve site functionality, and analyze site usage. These third parties may include analytics providers, advertising networks, and social media platforms.
              </Typography>
              
              <TableContainer component={Paper} variant="outlined" sx={{ my: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Third Party</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Purpose</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Privacy Policy</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Google Analytics</TableCell>
                      <TableCell>Website analytics and performance tracking</TableCell>
                      <TableCell>
                        <MuiLink href="https://policies.google.com/privacy" target="_blank" rel="noopener">
                          Privacy Policy
                        </MuiLink>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Facebook Pixel</TableCell>
                      <TableCell>Marketing and advertising</TableCell>
                      <TableCell>
                        <MuiLink href="https://www.facebook.com/policy.php" target="_blank" rel="noopener">
                          Privacy Policy
                        </MuiLink>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Hotjar</TableCell>
                      <TableCell>User behavior analysis</TableCell>
                      <TableCell>
                        <MuiLink href="https://www.hotjar.com/legal/policies/privacy/" target="_blank" rel="noopener">
                          Privacy Policy
                        </MuiLink>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Intercom</TableCell>
                      <TableCell>Customer support and messaging</TableCell>
                      <TableCell>
                        <MuiLink href="https://www.intercom.com/legal/privacy" target="_blank" rel="noopener">
                          Privacy Policy
                        </MuiLink>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="managing-cookies" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                Managing Cookies
              </Typography>
              <Typography variant="body1" paragraph>
                You can control and manage cookies in various ways. Most web browsers allow you to manage your cookie preferences. You can:
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
                <li>Delete cookies from your device</li>
                <li>Block cookies by activating the setting on your browser that allows you to refuse all or some cookies</li>
                <li>Set your browser to notify you when you receive a cookie</li>
                <li>Use browser settings or extensions to enhance your control over cookies</li>
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  Browser Instructions
                </Typography>
                <Typography variant="body1" paragraph>
                  Below are links to instructions on how to manage cookies in common web browsers:
                </Typography>
                <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
                  <li>
                    <MuiLink href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">
                      Google Chrome
                    </MuiLink>
                  </li>
                  <li>
                    <MuiLink href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener">
                      Microsoft Edge
                    </MuiLink>
                  </li>
                  <li>
                    <MuiLink href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener">
                      Mozilla Firefox
                    </MuiLink>
                  </li>
                  <li>
                    <MuiLink href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener">
                      Safari
                    </MuiLink>
                  </li>
                </Typography>
              </Box>
              
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                Please note that if you choose to block cookies, some features of our website may not function correctly or at all.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="policy-changes" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                Changes to This Policy
              </Typography>
              <Typography variant="body1" paragraph>
                We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page and updating the "Last updated" date at the top of this page.
              </Typography>
              <Typography variant="body1" paragraph>
                We encourage you to review this Cookie Policy periodically to stay informed about our use of cookies.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="contact" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                Contact Us
              </Typography>
              <Typography variant="body1" paragraph>
                If you have any questions about our Cookie Policy, please contact us:
              </Typography>
              <Typography variant="body1">
                Email: privacy@irisync.com<br />
                Address: 123 Tech Plaza, Suite 400, San Francisco, CA 94107<br />
                Phone: (800) 555-0123
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 