import React from 'react';
import {
  Table as MuiTable,
  TableBody as MuiTableBody,
  TableCell as MuiTableCell,
  TableContainer as MuiTableContainer,
  TableHead as MuiTableHead,
  TableRow as MuiTableRow,
  Paper,
  Box
} from '@mui/material';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <MuiTableContainer component={Paper} className={className}>
      <MuiTable>
        {children}
      </MuiTable>
    </MuiTableContainer>
  );
};

export const TableHead: React.FC<TableProps> = ({ children, className }) => {
  return (
    <MuiTableHead className={className}>
      {children}
    </MuiTableHead>
  );
};

export const TableBody: React.FC<TableProps> = ({ children, className }) => {
  return (
    <MuiTableBody className={className}>
      {children}
    </MuiTableBody>
  );
};

export const TableRow: React.FC<TableProps> = ({ children, className }) => {
  return (
    <MuiTableRow className={className}>
      {children}
    </MuiTableRow>
  );
};

export const TableCell: React.FC<TableProps> = ({ children, className }) => {
  return (
    <MuiTableCell className={className}>
      {children}
    </MuiTableCell>
  );
};

export const TableHeaderCell: React.FC<TableProps> = ({ children, className }) => {
  return (
    <MuiTableCell component="th" className={className}>
      {children}
    </MuiTableCell>
  );
};

// Alias for TableHead to match expected import
export const TableHeader = TableHead;

export default Table; 