'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Stack,
  Paper,
  useTheme
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function NotFound() {
  const theme = useTheme();
  
  // Log the not found error to help with debugging
  useEffect(() => {
    console.error('404 - Page not found');
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(circle at 50% 50%, ${theme.palette.primary.main}22 0%, transparent 50%)`,
          opacity: 0.7
        }}
      />
      
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 3,
            textAlign: 'center',
            bgcolor: 'transparent'
          }}
        >
          {/* Animated 404 with icon */}
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                mb: 2
              }}
            >
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: '6rem', md: '8rem' },
                  fontWeight: 'bold',
                  color: 'primary.main',
                  lineHeight: 1,
                  letterSpacing: -2
                }}
              >
                4
              </Typography>
              <ErrorOutlineIcon 
                sx={{ 
                  fontSize: { xs: '4rem', md: '6rem' }, 
                  color: 'primary.main',
                  animation: 'rotate 3s linear infinite',
                  '@keyframes rotate': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' }
                  }
                }} 
              />
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: '6rem', md: '8rem' },
                  fontWeight: 'bold',
                  color: 'primary.main',
                  lineHeight: 1,
                  letterSpacing: -2
                }}
              >
                4
              </Typography>
            </Box>
          </Box>
          
          {/* Error message */}
          <Typography 
            variant="h4" 
            component="h2" 
            gutterBottom 
            sx={{ 
              color: 'text.primary',
              fontWeight: 'medium',
              mb: 2
            }}
          >
            Page Not Found
          </Typography>
          
          <Typography 
            variant="h6" 
            color="text.secondary" 
            paragraph
            sx={{ 
              maxWidth: 500, 
              mx: 'auto', 
              mb: 5 
            }}
          >
            The page you're looking for might have been moved, deleted, 
            or perhaps you just mistyped the URL.
          </Typography>
          
          {/* Action buttons */}
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            justifyContent="center"
            alignItems="center"
          >
            <Button
              variant="contained"
              size="large"
              component={Link}
              href="/"
              startIcon={<HomeIcon />}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                px: 4,
                py: 1.5,
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              Return Home
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={() => window.history.back()}
              startIcon={<ArrowBackIcon />}
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                px: 4,
                py: 1.5,
                fontWeight: 'bold',
                '&:hover': {
                  borderColor: 'primary.dark',
                  color: 'primary.dark',
                  bgcolor: 'rgba(0, 201, 87, 0.04)'
                }
              }}
            >
              Go Back
            </Button>
            
            <Button
              variant="text"
              size="large"
              component={Link}
              href="/search"
              startIcon={<SearchIcon />}
              sx={{
                color: 'text.secondary',
                px: 4,
                py: 1.5,
                '&:hover': {
                  bgcolor: 'transparent',
                  color: 'primary.main'
                }
              }}
            >
              Search Site
            </Button>
          </Stack>
          
          {/* Helpful links */}
          <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You might be looking for:
            </Typography>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              justifyContent="center"
              divider={<Typography sx={{ display: { xs: 'none', sm: 'block' } }}>•</Typography>}
            >
              <Link href="/features-pricing" passHref>
                <Typography 
                  variant="body2" 
                  component="a"
                  sx={{ 
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Features & Pricing
                </Typography>
              </Link>
              <Link href="/documentation" passHref>
                <Typography 
                  variant="body2" 
                  component="a"
                  sx={{ 
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Documentation
                </Typography>
              </Link>
              <Link href="/support" passHref>
                <Typography 
                  variant="body2" 
                  component="a"
                  sx={{ 
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Support Center
                </Typography>
              </Link>
              <Link href="/about" passHref>
                <Typography 
                  variant="body2" 
                  component="a"
                  sx={{ 
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  About Us
                </Typography>
              </Link>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}