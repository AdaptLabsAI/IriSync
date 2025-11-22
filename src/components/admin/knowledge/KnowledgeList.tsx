import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Paper,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

// Icons
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import ArchiveIcon from '@mui/icons-material/Archive';

// Types
interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  status: string;
  slug: string;
  accessLevel: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface KnowledgeListProps {
  items: KnowledgeItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function KnowledgeList({ items, isLoading, onRefresh }: KnowledgeListProps) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [actionItem, setActionItem] = React.useState<KnowledgeItem | null>(null);
  
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, item: KnowledgeItem) => {
    setAnchorEl(event.currentTarget);
    setActionItem(item);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActionItem(null);
  };
  
  const handleEdit = (id: string) => {
    handleCloseMenu();
    router.push(`/admin/knowledge/${id}`);
  };
  
  const handleView = (slug: string) => {
    handleCloseMenu();
    // Open in a new tab
    window.open(`/knowledge/${slug}`, '_blank');
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'success';
      case 'DRAFT':
        return 'warning';
      case 'ARCHIVED':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'PUBLIC':
        return 'success';
      case 'REGISTERED':
        return 'info';
      case 'PAID':
        return 'primary';
      case 'INFLUENCER':
        return 'secondary';
      case 'ENTERPRISE':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  if (!items || items.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No knowledge base articles found.
        </Typography>
      </Box>
    );
  }
  
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Access Level</TableCell>
            <TableCell>Last Updated</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                <Typography variant="body1" fontWeight={500}>
                  {item.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.description.length > 100 
                    ? `${item.description.substring(0, 100)}...` 
                    : item.description}
                </Typography>
                {item.tags && item.tags.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {item.tags.slice(0, 3).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                    {item.tags.length > 3 && (
                      <Chip
                        label={`+${item.tags.length - 3}`}
                        size="small"
                        variant="outline"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                )}
              </TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>
                <Chip
                  label={item.status}
                  size="small"
                  color={getStatusColor(item.status) as any}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={item.accessLevel}
                  size="small"
                  color={getAccessLevelColor(item.accessLevel) as any}
                />
              </TableCell>
              <TableCell>{formatDate(item.updatedAt)}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(item.id)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    size="small"
                    aria-label="more"
                    onClick={(e) => handleOpenMenu(e, item)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {actionItem && (
          <>
            <MenuItem onClick={() => handleEdit(actionItem.id)}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            
            {actionItem.status === 'PUBLISHED' && (
              <MenuItem onClick={() => handleView(actionItem.slug)}>
                <ListItemIcon>
                  <VisibilityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>View</ListItemText>
              </MenuItem>
            )}
            
            {actionItem.status === 'DRAFT' && (
              <MenuItem onClick={handleCloseMenu}>
                <ListItemIcon>
                  <PublishIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Publish</ListItemText>
              </MenuItem>
            )}
            
            {actionItem.status === 'PUBLISHED' && (
              <MenuItem onClick={handleCloseMenu}>
                <ListItemIcon>
                  <UnpublishedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Unpublish</ListItemText>
              </MenuItem>
            )}
            
            {actionItem.status !== 'ARCHIVED' && (
              <MenuItem onClick={handleCloseMenu}>
                <ListItemIcon>
                  <ArchiveIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Archive</ListItemText>
              </MenuItem>
            )}
            
            <MenuItem onClick={handleCloseMenu} sx={{ color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </TableContainer>
  );
} 