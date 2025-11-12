"use client"

import React from "react";
import { FormLabel as MuiFormLabel, FormLabelProps } from "@mui/material";

export const Label = React.forwardRef<
  HTMLLabelElement,
  FormLabelProps
>(({ className, ...props }, ref) => (
  <MuiFormLabel
    ref={ref}
    className={className}
    {...props}
  />
));

Label.displayName = "Label";

// Export lowercase alias for compatibility
export const label = Label; 