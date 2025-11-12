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

export default function PrivacyPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <Typography color="text.primary">Privacy Policy</Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Privacy Policy
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
              <ListItem component={Link} href="#introduction" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="1. Introduction" />
              </ListItem>
              <ListItem component={Link} href="#collection" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="2. Information We Collect" />
              </ListItem>
              <ListItem component={Link} href="#usage" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="3. How We Use Your Information" />
              </ListItem>
              <ListItem component={Link} href="#sharing" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="4. Information Sharing" />
              </ListItem>
              <ListItem component={Link} href="#cookies" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="5. Cookies and Tracking" />
              </ListItem>
              <ListItem component={Link} href="#security" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="6. Data Security" />
              </ListItem>
              <ListItem component={Link} href="#rights" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="7. Your Rights" />
              </ListItem>
              <ListItem component={Link} href="#children" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="8. Children's Privacy" />
              </ListItem>
              <ListItem component={Link} href="#international" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="9. International Transfers" />
              </ListItem>
              <ListItem component={Link} href="#changes" sx={{ color: 'inherit', textDecoration: 'none' }}>
                <ListItemText primary="10. Changes to This Policy" />
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
              At IriSync, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our platform. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
            </Typography>
            
            {/* All the sections from the original privacy policy */}
            <Box id="introduction" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                1. Introduction
              </Typography>
              <Typography variant="body1" paragraph>
                IriSync ("we", "us", or "our") provides a social media management platform that helps businesses create, schedule, and analyze content across multiple platforms. This Privacy Policy applies to all information collected through our website, platform, and any related services, sales, marketing, or events (collectively, the "Services").
              </Typography>
              <Typography variant="body1" paragraph>
                By using our Services, you consent to the collection, use, processing, and disclosure of information as described in this Privacy Policy.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="collection" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                2. Information We Collect
              </Typography>
              <Typography variant="body1" paragraph>
                We collect information you provide directly to us, information automatically collected when you use our Services, and information from third parties, such as social media platforms.
              </Typography>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Information You Provide to Us:
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
                <li>Account Information: When you register for an account, we collect your name, email address, password, and other contact or identification information.</li>
                <li>Profile Information: When you create a profile, we collect professional information such as your job title, company information, and profile photo.</li>
                <li>Payment Information: When you make a purchase, we collect payment information, including credit card numbers, billing address, and other payment details.</li>
                <li>Content: When you create, upload, or share content through our platform, we collect the content and metadata associated with it.</li>
                <li>Communications: When you communicate with us or other users through our platform, we collect the content of those communications.</li>
              </Typography>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 2 }}>
                Information Automatically Collected:
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
                <li>Usage Information: We collect information about your interactions with our Services, such as the pages you view, links you click, and other actions you take.</li>
                <li>Device Information: We collect information about the device you use to access our Services, including hardware model, operating system, and unique device identifiers.</li>
                <li>Location Information: We may collect information about your location when you use our Services, including IP address and browser-provided location information.</li>
                <li>Log Information: We collect standard server logs, including IP addresses, browser type, referring/exit pages, and date/time stamps.</li>
              </Typography>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 2 }}>
                Information from Third Parties:
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
                <li>Social Media Platforms: When you connect your social media accounts to our platform, we collect information from those accounts, such as your profiles, connections, content, and engagement metrics.</li>
                <li>Analytics Providers: We may receive information from analytics providers to help us understand how users interact with our Services.</li>
                <li>Business Partners: We may receive information about you from our business partners, such as when they co-sponsor an event or promotion.</li>
              </Typography>
            </Box>
            
            {/* Include remaining sections from privacy policy */}
            <Divider sx={{ my: 3 }} />
            
            <Box id="usage" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                3. How We Use Your Information
              </Typography>
              <Typography variant="body1" paragraph>
                We use the information we collect for various purposes, including:
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
                <li>Providing our Services and fulfilling your requests</li>
                <li>Processing transactions and sending related information</li>
                <li>Sending administrative messages, updates, and security alerts</li>
                <li>Personalizing your experience and delivering content relevant to your interests</li>
                <li>Improving, testing, and developing new features and services</li>
                <li>Monitoring and analyzing trends, usage, and activities</li>
                <li>Detecting, preventing, and addressing technical issues and fraudulent activities</li>
                <li>Complying with legal obligations and enforcing our terms and policies</li>
              </Typography>
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                We may use your information for any other purpose disclosed to you at the time we collect or receive the information, or otherwise with your consent.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="sharing" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                4. Information Sharing
              </Typography>
              <Typography variant="body1" paragraph>
                We may share your information in the following circumstances:
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
                <li>With social media platforms when you connect your accounts</li>
                <li>With service providers who perform services on our behalf</li>
                <li>With business partners with whom we jointly offer products or services</li>
                <li>In connection with a merger, sale, or acquisition of all or a portion of our business</li>
                <li>When we believe disclosure is necessary to protect rights, property, or safety</li>
                <li>To comply with applicable law, legal process, or government request</li>
                <li>With your consent or at your direction</li>
              </Typography>
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                We may also share aggregated or de-identified information that cannot reasonably be used to identify you.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="cookies" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                5. Cookies and Tracking
              </Typography>
              <Typography variant="body1" paragraph>
                We and our third-party service providers use cookies, web beacons, and other tracking technologies to track and analyze your usage of our Services. These technologies help us understand how you use our Services, personalize your experience, and analyze the effectiveness of our marketing campaigns.
              </Typography>
              <Typography variant="body1" paragraph>
                You can set your browser to refuse all or some browser cookies, or to alert you when cookies are being sent. However, some parts of our Services may not function properly without cookies.
              </Typography>
              <Typography variant="body1" paragraph>
                For more detailed information about our use of cookies and similar technologies, please see our <MuiLink component={Link} href="/cookies">Cookie Policy</MuiLink>.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="security" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                6. Data Security
              </Typography>
              <Typography variant="body1" paragraph>
                We implement appropriate technical and organizational security measures designed to protect your information from unauthorized access, disclosure, alteration, and destruction. These measures include encryption of sensitive data, regular security assessments, and restricted access to personal information.
              </Typography>
              <Typography variant="body1" paragraph>
                However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security. If you have reason to believe that your interaction with us is no longer secure, please contact us immediately.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="rights" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                7. Your Rights
              </Typography>
              <Typography variant="body1" paragraph>
                Depending on your location, you may have certain rights regarding your personal information, including:
              </Typography>
              <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
                <li>Access: You may request access to the personal information we hold about you.</li>
                <li>Correction: You may request that we correct inaccurate or incomplete information.</li>
                <li>Deletion: You may request that we delete your personal information.</li>
                <li>Restriction: You may request that we restrict the processing of your information.</li>
                <li>Data Portability: You may request a copy of your personal information in a structured, machine-readable format.</li>
                <li>Objection: You may object to our processing of your personal information.</li>
                <li>Opt-Out: You may opt-out of certain uses and disclosures of your information.</li>
              </Typography>
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                To exercise these rights, please contact us at privacy@irisynce.com. Please note that some of these rights may be subject to limitations and exceptions under applicable law.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="children" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                8. Children's Privacy
              </Typography>
              <Typography variant="body1" paragraph>
                Our Services are not directed to children under the age of 18, and we do not knowingly collect personal information from children under 18. If we learn that we have collected personal information from a child under 18 without parental consent, we will take steps to delete that information as quickly as possible.
              </Typography>
              <Typography variant="body1" paragraph>
                If you believe we might have any information from or about a child under 18, please contact us at privacy@irisynce.com.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="international" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                9. International Transfers
              </Typography>
              <Typography variant="body1" paragraph>
                IriSync is based in the United States, and we process and store information on servers located in the United States and other countries. If you are located outside the United States, your information may be transferred to, stored, and processed in a country where the privacy laws may not be as comprehensive as those in your country.
              </Typography>
              <Typography variant="body1" paragraph>
                By using our Services, you consent to the transfer of your information to the United States and other countries where IriSync operates.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="changes" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                10. Changes to This Policy
              </Typography>
              <Typography variant="body1" paragraph>
                We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email (if you have an account with us) or by posting a notice on our website prior to the change becoming effective.
              </Typography>
              <Typography variant="body1" paragraph>
                We encourage you to review this Privacy Policy periodically to stay informed about our data practices. Your continued use of our Services after any changes to this Privacy Policy constitutes your acceptance of the changes.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box id="contact" sx={{ mb: 4, scrollMarginTop: '100px' }}>
              <Typography variant="h5" gutterBottom>
                11. Contact Us
              </Typography>
              <Typography variant="body1" paragraph>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
              </Typography>
              <Typography variant="body1">
                Email: privacy@irisynce.com<br />
               </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 