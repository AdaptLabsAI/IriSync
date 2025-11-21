import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Chip, 
  Card, 
  CardContent,
  Alert,
  Tooltip,
  IconButton,
  Divider
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Share as ShareIcon, 
  ContentCopy as CopyIcon, 
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Twitter as TwitterIcon,
  Facebook as FacebookIcon,
  QrCode as QrCodeIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Token as TokenIcon
} from '@mui/icons-material';
import { useToast } from '../ui/use-toast';

interface ReferralStats {
  userId: string;
  referralCode: string;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalTokensEarned: number;
  lastReferralDate?: any;
  monthlyStats: {
    month: string;
    referrals: number;
    completedReferrals: number;
    tokensEarned: number;
  }[];
}

interface ReferralSectionProps {
  className?: string;
}

export const ReferralSection: React.FC<ReferralSectionProps> = ({ className = '' }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get referral code and share URL
      const codeResponse = await fetch('/api/referrals');
      if (!codeResponse.ok) {
        throw new Error('Failed to fetch referral code');
      }
      const codeData = await codeResponse.json();
      setShareUrl(codeData.shareUrl);
      
      // Get referral statistics
      const statsResponse = await fetch('/api/referrals?action=stats');
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch referral stats');
      }
      const statsData = await statsResponse.json();
      setStats(statsData.stats);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
      console.error('Error fetching referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
        variant: 'default'
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: 'Copy failed',
        description: 'Please copy manually',
        variant: 'destructive'
      });
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Join IriSync with my referral code!');
    const body = encodeURIComponent(
      `Hi! I've been using IriSync for my social media management and thought you'd love it too.\n\n` +
      `Sign up with my referral code "${stats?.referralCode}" to get started:\n${shareUrl}\n\n` +
      `IriSync makes managing social media so much easier with AI-powered content generation, scheduling, and analytics.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareOnSocial = (platform: string) => {
    const text = `Check out IriSync! Use my referral code "${stats?.referralCode}" to get started with this amazing social media management platform.`;
    const url = shareUrl;
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
    };
    
    if (shareUrls[platform as keyof typeof shareUrls]) {
      window.open(shareUrls[platform as keyof typeof shareUrls], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <Paper className={`p-6 ${className}`}>
        <Typography variant="h6" gutterBottom>
          Referral Program
        </Typography>
        <Typography>Loading referral information...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper className={`p-6 ${className}`}>
        <Typography variant="h6" gutterBottom>
          Referral Program
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper className={`p-6 ${className}`}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon color="primary" />
          Referral Program
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Earn 100 bonus tokens for each friend who completes their first month!
        </Typography>
      </Box>

      {/* Referral Code Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
          Your Referral Code
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            value={stats?.referralCode || ''}
            label="Referral Code"
            variant="outlined"
            size="sm"
            InputProps={{
              readOnly: true,
              style: { 
                fontFamily: 'monospace', 
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#1976d2'
              }
            }}
            sx={{ minWidth: 150 }}
          />
          <Tooltip title="Copy referral code">
            <IconButton 
              onClick={() => copyToClipboard(stats?.referralCode || '', 'Referral code')}
              color="primary"
            >
              <CopyIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
          <TextField
            value={shareUrl}
            label="Share Link"
            variant="outlined"
            size="sm"
            fullWidth
            InputProps={{
              readOnly: true,
              style: { fontSize: '0.9rem' }
            }}
          />
          <Tooltip title="Copy share link">
            <IconButton 
              onClick={() => copyToClipboard(shareUrl, 'Share link')}
              color="primary"
            >
              <CopyIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Share Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="sm"
            startIcon={<EmailIcon />}
            onClick={shareViaEmail}
          >
            Email
          </Button>
          <Button
            variant="outlined"
            size="sm"
            startIcon={<TwitterIcon />}
            onClick={() => shareOnSocial('twitter')}
          >
            Twitter
          </Button>
          <Button
            variant="outlined"
            size="sm"
            startIcon={<FacebookIcon />}
            onClick={() => shareOnSocial('facebook')}
          >
            Facebook
          </Button>
          <Button
            variant="outlined"
            size="sm"
            startIcon={<WhatsAppIcon />}
            onClick={() => shareOnSocial('whatsapp')}
          >
            WhatsApp
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Stats Section */}
      <Box>
        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
          Your Referral Stats
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <PeopleIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {stats?.totalReferrals || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Referrals
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <TrendingUpIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {stats?.completedReferrals || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: 'warning.main' }}>
                  <PeopleIcon sx={{ fontSize: 32, mb: 1 }} />
                </Box>
                <Typography variant="h4" fontWeight={600}>
                  {stats?.pendingReferrals || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <TokenIcon color="secondary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {stats?.totalTokensEarned || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tokens Earned
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* How it works */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom fontWeight={600}>
            How it works:
          </Typography>
          <Typography variant="body2">
            1. Share your referral code with friends<br/>
            2. They sign up using your code<br/>
            3. When they complete their first paid month (after trial), you earn 100 bonus tokens<br/>
            4. These tokens are added to your account automatically
          </Typography>
        </Alert>
      </Box>
    </Paper>
  );
}; 