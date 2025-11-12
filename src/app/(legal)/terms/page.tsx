'use client';

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Link as MuiLink,
  Breadcrumbs,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import Grid from '@/components/ui/grid';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <Typography color="text.primary">Terms of Service</Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Terms of Service
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
              Table of Contents
            </Typography>
            <List dense>
              <ListItem component={Link} href="#acceptance" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="1. Acceptance of Terms" />
              </ListItem>
              <ListItem component={Link} href="#description" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="2. Description of Service" />
              </ListItem>
              <ListItem component={Link} href="#eligibility" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="3. Eligibility" />
              </ListItem>
              <ListItem component={Link} href="#accounts" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="4. User Accounts" />
              </ListItem>
              <ListItem component={Link} href="#content" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="5. User Content" />
              </ListItem>
              <ListItem component={Link} href="#billing" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="6. Billing and Payments" />
              </ListItem>
              <ListItem component={Link} href="#privacy" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="7. Privacy" />
              </ListItem>
              <ListItem component={Link} href="#termination" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="8. Termination" />
              </ListItem>
              <ListItem component={Link} href="#limitations" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="9. Limitations of Liability" />
              </ListItem>
              <ListItem component={Link} href="#changes" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="10. Changes to Terms" />
              </ListItem>
              <ListItem component={Link} href="#contact" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="11. Contact Us" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="body1" paragraph>
              Welcome to IriSync. Please read these Terms of Service ("Terms") carefully as they contain important information about your legal rights, remedies, and obligations. By accessing or using the IriSync platform, you agree to comply with and be bound by these Terms.
            </Typography>
            
            <Box id="acceptance" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                1. Acceptance of Terms
              </Typography>
              <Typography variant="body1" paragraph>
                By registering for and/or using the IriSync services in any manner, including but not limited to visiting or browsing the site, you agree to these Terms and all other operating rules, policies, and procedures that may be published by IriSync, which are incorporated by reference.
              </Typography>
              <Typography variant="body1" paragraph>
                If you do not agree to these terms, you must not access or use our services.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="description" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                2. Description of Service
              </Typography>
              <Typography variant="body1" paragraph>
                IriSync provides an AI-powered social media management platform designed to help businesses create, schedule, and analyze content across multiple platforms (the "Service"). Our Service includes content creation tools, scheduling capabilities, analytics dashboards, and platform integrations.
              </Typography>
              <Typography variant="body1" paragraph>
                IriSync reserves the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice. We shall not be liable to you or to any third party for any modification, suspension, or discontinuation of the Service.
              </Typography>
            </Box>
            
            {/* Rest of the terms content... */}
            {/* Keep all the existing content below unchanged */}
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="eligibility" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                3. Eligibility
              </Typography>
              <Typography variant="body1" paragraph>
                You must be at least 18 years old and able to form a binding contract with IriSync to use our Service. By agreeing to these Terms, you represent and warrant that you meet all eligibility requirements.
              </Typography>
              <Typography variant="body1" paragraph>
                The Service is not available to users who have been temporarily or permanently suspended from the IriSync platform. We reserve the right to refuse service to anyone for any reason at any time.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="accounts" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                4. User Accounts
              </Typography>
              <Typography variant="body1" paragraph>
                When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
              </Typography>
              <Typography variant="body1" paragraph>
                You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. We encourage you to use "strong" passwords (passwords that use a combination of upper and lower case letters, numbers, and symbols) with your account.
              </Typography>
              <Typography variant="body1" paragraph>
                You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="content" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                5. User Content
              </Typography>
              <Typography variant="body1" paragraph>
                Our Service allows you to create, upload, post, send, and store content, including messages, text, photos, videos, and other materials (collectively "User Content"). You retain all rights in, and are solely responsible for, the User Content you create through our Service.
              </Typography>
              <Typography variant="body1" paragraph>
                By creating, uploading, posting, sending, or storing User Content to or through our Service, you grant IriSync a worldwide, non-exclusive, royalty-free license to use, host, store, reproduce, modify, adapt, publish, and distribute such User Content for the purpose of providing and improving the Service.
              </Typography>
              <Typography variant="body1" paragraph>
                You represent and warrant that: (i) you own the User Content or have the right to use it and grant us the rights and license as provided in these Terms, and (ii) the creation, uploading, posting, or submission of the User Content does not violate the privacy rights, publicity rights, copyrights, contract rights, or any other rights of any person.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="billing" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                6. Billing and Payments
              </Typography>
              <Typography variant="body1" paragraph>
                Some aspects of the Service require payment of fees. You agree to pay all fees in accordance with the pricing and payment terms presented to you for the Service. You will be billed using the billing method you select when you initiate your subscription.
              </Typography>
              <Typography variant="body1" paragraph>
                Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period. You may cancel your subscription at any time through your account settings or by contacting our customer support team.
              </Typography>
              <Typography variant="body1" paragraph>
                IriSync may change the fees for the Service at any time, provided that, for existing subscribers, the change will become effective at the start of the next billing cycle. We will give you reasonable prior notice of any change in fees.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="privacy" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                7. Privacy
              </Typography>
              <Typography variant="body1" paragraph>
                Your privacy is important to us. Our <MuiLink component={Link} href="/privacy">Privacy Policy</MuiLink> explains how we collect, use, and disclose information about you. By using the Service, you agree to the collection, use, and disclosure of your information as described in our Privacy Policy.
              </Typography>
              <Typography variant="body1" paragraph>
                Information regarding our use of cookies and similar technologies can be found in our <MuiLink component={Link} href="/cookies">Cookie Policy</MuiLink>.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="termination" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                8. Termination
              </Typography>
              <Typography variant="body1" paragraph>
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach of the Terms.
              </Typography>
              <Typography variant="body1" paragraph>
                If you wish to terminate your account, you may simply discontinue using the Service, or notify us that you wish to delete your account. All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="limitations" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                9. Limitations of Liability
              </Typography>
              <Typography variant="body1" paragraph>
                In no event shall IriSync, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use, or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence), or any other legal theory, whether or not we have been informed of the possibility of such damage.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="changes" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                10. Changes to Terms
              </Typography>
              <Typography variant="body1" paragraph>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </Typography>
              <Typography variant="body1" paragraph>
                By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="contact" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                11. Contact Us
              </Typography>
              <Typography variant="body1" paragraph>
                If you have any questions about these Terms, please contact us at:
              </Typography>
              <Typography variant="body1">
                Email: legal@irisync.com<br />
                Address: 123 Tech Plaza, Suite 400, San Francisco, CA 94107
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 