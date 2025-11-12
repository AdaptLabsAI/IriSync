import React, { useState } from 'react';
import { 
  TextField, 
  Chip, 
  Box, 
  Typography,
  InputAdornment,
  IconButton, 
  FormHelperText,
  FormControl as MuiFormControl
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
  maxTags?: number;
  id?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  label,
  placeholder = 'Add a tag...',
  error,
  helperText,
  isRequired = false,
  isDisabled = false,
  className,
  maxTags,
  id,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    if (inputValue.trim() && (!maxTags || value.length < maxTags)) {
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    onChange(value.filter(tag => tag !== tagToDelete));
  };

  return (
    <MuiFormControl 
      fullWidth 
      required={isRequired} 
      disabled={isDisabled}
      error={!!error}
      className={className}
    >
      {label && (
        <Typography 
          component="label" 
          sx={{ 
            fontSize: '0.875rem',
            fontWeight: 500,
            mb: 1,
            display: 'block'
          }}
        >
          {label}
        </Typography>
      )}

      <TextField
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        fullWidth
        id={id}
        disabled={isDisabled || (maxTags && value.length >= maxTags)}
        error={!!error}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton 
                edge="end" 
                onClick={handleAddTag}
                disabled={isDisabled || !inputValue.trim() || (maxTags && value.length >= maxTags)}
                size="small"
              >
                <AddIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      
      {(error || helperText) && (
        <FormHelperText error={!!error}>
          {error || helperText}
        </FormHelperText>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {value.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            onDelete={() => handleDeleteTag(tag)}
            disabled={isDisabled}
            size="small"
          />
        ))}
      </Box>
    </MuiFormControl>
  );
};

export default TagInput; 