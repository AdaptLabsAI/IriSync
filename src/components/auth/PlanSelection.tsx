import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  useTheme,
  Divider,
  Chip
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';
import { SubscriptionTier } from '../../lib/subscription/models/subscription';

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface Plan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  priceUnit: string;
  features: PlanFeature[];
  isPopular?: boolean;
  isFree?: boolean;
  tokensPerMonth: number;
  accountLimit?: number;
  maxSchedules?: number;
}

interface PlanSelectionProps {
  selectedTier: SubscriptionTier;
  onTierSelect: (tier: SubscriptionTier) => void;
  isSignUp?: boolean;
}

export default function PlanSelection({ selectedTier, onTierSelect, isSignUp = false }: PlanSelectionProps) {
  const theme = useTheme();

  // Define plans
  const plans: Plan[] = [
    {
      tier: SubscriptionTier.CREATOR,
      name: 'Creator',
      description: 'Perfect for content creators and influencers',
      price: 80,
      priceUnit: 'mo',
      tokensPerMonth: 100,
      accountLimit: 5,
      maxSchedules: 50,
      features: [
        { text: '5 social accounts', included: true },
        { text: 'Advanced content creation', included: true },
        { text: 'Unlimited scheduling', included: true },
        { text: '100 AI tokens per month', included: true, highlight: true },
        { text: 'Content recycling', included: true },
        { text: 'Enhanced analytics', included: true },
        { text: 'Media management', included: true },
        { text: 'Advanced AI tools', included: true },
        { text: 'Team collaboration (1 user)', included: true },
        { text: 'Priority support', included: false }
      ]
    },
    {
      tier: SubscriptionTier.INFLUENCER,
      name: 'Influencer',
      description: 'For professional influencers and small businesses',
      price: 200,
      priceUnit: 'mo',
      isPopular: true,
      tokensPerMonth: 500,
      accountLimit: 10,
      maxSchedules: 200,
      features: [
        { text: 'Unlimited social accounts', included: true },
        { text: 'Advanced content creation', included: true },
        { text: 'Unlimited scheduling', included: true },
        { text: '500 AI tokens per month', included: true, highlight: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Media management & library', included: true },
        { text: 'All AI features', included: true },
        { text: 'Content campaigns', included: true },
        { text: 'Team collaboration (3 users)', included: true },
        { text: 'Priority support', included: true }
      ]
    },
    {
      tier: SubscriptionTier.ENTERPRISE,
      name: 'Enterprise',
      description: 'Custom solutions for organizations and agencies',
      price: 1250,
      priceUnit: 'mo',
      tokensPerMonth: 5000,
      features: [
        { text: 'Unlimited social accounts', included: true },
        { text: 'Unlimited scheduling', included: true },
        { text: 'All platform features', included: true },
        { text: 'Advanced team management', included: true },
        { text: '5,000 AI tokens (1,000 per seat for first 5)', included: true, highlight: true },
        { text: 'Advanced security controls', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Custom AI models', included: true },
        { text: 'SLA guarantee', included: true },
        { text: 'Enterprise support', included: true }
      ]
    }
  ];

  const handlePlanSelect = (tier: SubscriptionTier) => {
    onTierSelect(tier);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {isSignUp ? (
        // Compact display for signup
        <RadioGroup 
          value={selectedTier} 
          onChange={(e) => handlePlanSelect(e.target.value as SubscriptionTier)}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
            {plans.map((plan) => (
              <Box key={plan.tier} sx={{ width: '100%', px: 1, mb: 2 }}>
                <Card 
                  variant="outline" 
                  sx={{ 
                    borderColor: selectedTier === plan.tier ? theme.palette.primary.main : 'default',
                    backgroundColor: selectedTier === plan.tier ? alpha(theme.palette.primary.main, 0.05) : 'inherit'
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6" component="div">
                          {plan.name}
                          {plan.isPopular && (
                            <Chip
                              size="sm"
                              label="Popular"
                              color="secondary"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {plan.description}
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="h6" component="div">
                          {plan.isFree ? 'Free' : `$${plan.price}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {!plan.isFree && `per ${plan.priceUnit}`}
                        </Typography>
                      </Box>
                      <FormControlLabel 
                        value={plan.tier} 
                        control={<Radio />} 
                        label="" 
                        sx={{ ml: 2 }} 
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </RadioGroup>
      ) : (
        // Full display for plan comparison page
        <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
          {plans.map((plan) => (
            <Box key={plan.tier} sx={{ 
              width: { xs: '100%', sm: '50%', md: '25%' }, 
              px: 1.5, 
              mb: 3
            }}>
              <Card 
                variant={plan.isPopular ? 'elevation' : 'outlined'} 
                elevation={plan.isPopular ? 6 : 1}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  borderColor: selectedTier === plan.tier ? theme.palette.primary.main : 'default',
                  transform: plan.isPopular ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    zIndex: 1
                  }
                }}
              >
                {plan.isPopular && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 0, 
                      right: 20, 
                      transform: 'translateY(-50%)',
                      backgroundColor: theme.palette.secondary.main,
                      color: theme.palette.secondary.contrastText,
                      borderRadius: '20px',
                      px: 2,
                      py: 0.5
                    }}
                  >
                    Most Popular
                  </Box>
                )}
                <CardContent sx={{ pt: 3, flexGrow: 1 }}>
                  <Typography variant="h5" component="div" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {plan.description}
                  </Typography>
                  <Box sx={{ my: 2 }}>
                    <Typography variant="h4" component="div">
                      {plan.isFree ? 'Free' : `$${plan.price}`}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                      {!plan.isFree && `per ${plan.priceUnit}`}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      icon={<StarIcon />}
                      label={`${plan.tokensPerMonth.toLocaleString()} AI tokens per month`}
                      color="primary"
                      variant="outline"
                      sx={{ width: '100%', justifyContent: 'flex-start' }}
                    />
                  </Box>
                  
                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          {feature.included ? (
                            <CheckIcon color={feature.highlight ? "secondary" : "primary"} fontSize="small" />
                          ) : (
                            <Box sx={{ width: 24, height: 24 }} />
                          )}
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature.text} 
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            color: !feature.included ? 'text.disabled' : (feature.highlight ? 'secondary' : 'textPrimary')
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    variant={selectedTier === plan.tier ? "contained" : "outlined"}
                    color="primary"
                    fullWidth
                    onClick={() => handlePlanSelect(plan.tier)}
                  >
                    {selectedTier === plan.tier ? 'Selected' : plan.tier === SubscriptionTier.ENTERPRISE ? 'Contact Sales' : 'Select Plan'}
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// Import alpha function from MUI at the top of your file
// This helper is used to create semi-transparent variants of colors
function alpha(color: string, opacity: number): string {
  // Simple implementation for string-based colors
  if (color.startsWith('#')) {
    // For hex colors
    return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
  } else if (color.startsWith('rgb')) {
    // For rgb/rgba colors
    return color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
  }
  return color;
} 