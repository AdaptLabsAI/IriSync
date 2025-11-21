'use client';

import React from 'react';
import { 
  Card as MuiCard, 
  CardContent as MuiCardContent, 
  CardHeader as MuiCardHeader, 
  CardActions,
  Typography, 
  Box, 
  useTheme 
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  isHoverable?: boolean;
  isBordered?: boolean;
  hasShadow?: boolean;
  bgColor?: string;
  width?: string | number;
  height?: string | number;
  onClick?: () => void;
  icon?: React.ReactElement;
  footer?: React.ReactNode;
  className?: string;
  testId?: string;
}

const StyledCard = styled(MuiCard)<{ 
  $isHoverable?: boolean;
  $hasShadow?: boolean;
  $isBordered?: boolean;
}>(({ theme, $isHoverable, $hasShadow, $isBordered }) => ({
  transition: 'all 0.2s',
  ...($isHoverable && {
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[4],
    }
  }),
  ...($hasShadow ? { boxShadow: theme.shadows[1] } : { boxShadow: 'none' }),
  ...($isBordered ? { border: `1px solid ${theme.palette.divider}` } : { border: 'none' }),
}));

/**
 * Card component for displaying content in a contained, styled box
 */
export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  isHoverable = false,
  isBordered = true,
  hasShadow = true,
  bgColor,
  width,
  height,
  onClick,
  icon,
  footer,
  className,
  testId,
}) => {
  const theme = useTheme();

  return (
    <StyledCard
      $isHoverable={isHoverable}
      $hasShadow={hasShadow}
      $isBordered={isBordered}
      sx={{
        bgcolor: bgColor || 'background.paper',
        width,
        height,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      className={className}
      data-testid={testId}
    >
      {(title || subtitle || icon) && (
        <MuiCardHeader
          avatar={icon}
          title={title && <Typography variant="h6">{title}</Typography>}
          subheader={subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        />
      )}

      <MuiCardContent>
        {children}
      </MuiCardContent>

      {footer && (
        <CardActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: 2 }}>
          {footer}
        </CardActions>
      )}
    </StyledCard>
  );
};

/**
 * CardHeader component for custom card headers
 */
export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  const theme = useTheme();
  
  return (
    <MuiCardHeader className={className}>
      {children}
    </MuiCardHeader>
  );
};

/**
 * CardBody component for card content
 */
export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  return <MuiCardContent className={className}>{children}</MuiCardContent>;
};

/**
 * CardFooter component for card footers
 */
export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  const theme = useTheme();
  
  return (
    <CardActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: 2 }} className={className}>
      {children}
    </CardActions>
  );
};

/**
 * CardTitle component for card titles
 */
export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  return <Typography variant="h6" className={className}>{children}</Typography>;
};

/**
 * CardDescription component for card descriptions
 */
export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  return <Typography variant="body2" color="text.secondary" className={className}>{children}</Typography>;
};

/**
 * CardContent component for card content
 */
export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  return <Box className={className}>{children}</Box>;
};

export default Card; 