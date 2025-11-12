'use client';

import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Paper,
  Breadcrumbs,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import axios from 'axios';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import HomeIcon from '@mui/icons-material/Home';

// Storage types for type safety
type StoragePlatform = 'google-drive' | 'dropbox' | 'onedrive' | 'canva' | 'adobe-express';

interface StorageConnection {
  platform: StoragePlatform;
  accountName: string;
  accountEmail: string;
  connected: boolean;
  connectedAt: string;
}

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  lastModified?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  platform: StoragePlatform;
}

export default function StorageDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [pathHistory, setPathHistory] = useState<{id: string, name: string}[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileActionLoading, setFileActionLoading] = useState<string | null>(null);

  // Fetch user's storage connections
  useEffect(() => {
    const fetchConnections = async () => {
      if (status !== 'authenticated') return;
      
      setLoading(true);
      try {
        const response = await axios.get('/api/storage/connections');
        const storageConnections = response.data.connections || [];
        setConnections(storageConnections);
        
        // Auto-select the first platform if available
        if (storageConnections.length > 0 && !activePlatform) {
          setActivePlatform(storageConnections[0].platform);
        }
      } catch (err) {
        console.error('Error fetching storage connections:', err);
        setError('Failed to load your storage connections. API: /api/storage/connections');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [status, activePlatform]);

  // Fetch files when the active platform or path changes
  useEffect(() => {
    if (!activePlatform) return;
    
    fetchFiles(activePlatform, currentPath === '/' ? null : currentPath);
  }, [activePlatform, currentPath]);

  // Fetch files from the specified platform and path
  const fetchFiles = async (platform: string, folderId: string | null) => {
    setLoadingFiles(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/storage/files', {
        platform,
        folderId
      });
      
      setFiles(response.data.files || []);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(`Failed to load files from ${platform}. API: /api/storage/files`);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Handle platform change
  const handlePlatformChange = (platform: string) => {
    setActivePlatform(platform);
    setCurrentPath('/');
    setPathHistory([]);
  };

  // Navigate to a folder
  const handleFolderClick = (file: FileItem) => {
    setPathHistory([...pathHistory, { id: currentPath, name: 'Current' }]);
    setCurrentPath(file.id);
  };

  // Navigate up in the folder hierarchy
  const handleBackClick = () => {
    if (pathHistory.length === 0) {
      setCurrentPath('/');
      return;
    }
    
    const newPath = pathHistory[pathHistory.length - 1];
    setCurrentPath(newPath.id);
    setPathHistory(pathHistory.slice(0, -1));
  };

  // Download a file
  const handleDownloadFile = async (file: FileItem) => {
    if (file.type !== 'file') return;
    
    setFileActionLoading(file.id);
    
    try {
      const response = await axios.post('/api/storage/download', {
        platform: file.platform,
        fileId: file.id
      }, {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError(`Failed to download "${file.name}". API: /api/storage/download`);
    } finally {
      setFileActionLoading(null);
    }
  };

  // Navigate to connections page
  const handleConnectStorage = () => {
    router.push('/dashboard/settings/connections');
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading your storage dashboard...
        </Typography>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Alert severity="warning">
          You need to be logged in to access the storage dashboard.
        </Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => router.push('/auth/login')}
        >
          Log In
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Storage Dashboard</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Access and manage your files across multiple cloud storage platforms.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {connections.length === 0 ? (
        <Card sx={{ mb: 4, p: 4, textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              No storage platforms connected
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Connect your cloud storage platforms to access and manage your files.
            </Typography>
            <Button 
              variant="contained"
              onClick={handleConnectStorage}
            >
              Connect Storage Platforms
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ErrorBoundary apiEndpoint="/api/storage/*">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Sidebar with platform selection */}
            <Box sx={{ width: { xs: '100%', md: 250 } }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>Connected Platforms</Typography>
                <List>
                  {connections.map((connection) => (
                    <ListItem 
                      disablePadding 
                      key={connection.platform}
                      sx={{ mb: 1 }}
                    >
                      <ListItemButton
                        selected={activePlatform === connection.platform}
                        onClick={() => handlePlatformChange(connection.platform)}
                      >
                        <ListItemText 
                          primary={connection.platform.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')} 
                          secondary={connection.accountName}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={handleConnectStorage}
                  sx={{ mt: 2 }}
                >
                  Manage Connections
                </Button>
              </Paper>
            </Box>

            {/* Main content area with files */}
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 2 }}>
                {/* Breadcrumbs navigation */}
                <Breadcrumbs 
                  separator={<NavigateNextIcon fontSize="small" />}
                  sx={{ mb: 2 }}
                >
                  <Button 
                    startIcon={<HomeIcon />}
                    onClick={() => {
                      setCurrentPath('/');
                      setPathHistory([]);
                    }}
                    size="small"
                  >
                    Home
                  </Button>
                  
                  {pathHistory.map((path, index) => (
                    <Button 
                      key={index}
                      onClick={() => {
                        setCurrentPath(path.id);
                        setPathHistory(pathHistory.slice(0, index));
                      }}
                      size="small"
                    >
                      {path.name}
                    </Button>
                  ))}
                  
                  {currentPath !== '/' && (
                    <Typography color="text.primary">Current Folder</Typography>
                  )}
                </Breadcrumbs>

                <Divider sx={{ mb: 2 }} />

                {/* Files list */}
                {loadingFiles ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>Loading files...</Typography>
                  </Box>
                ) : files.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography>No files found in this location.</Typography>
                  </Box>
                ) : (
                  <List>
                    {files.map((file) => (
                      <ListItem
                        key={`${file.platform}-${file.id}`}
                        secondaryAction={
                          file.type === 'file' && (
                            <IconButton 
                              edge="end" 
                              onClick={() => handleDownloadFile(file)}
                              disabled={fileActionLoading === file.id}
                            >
                              {fileActionLoading === file.id ? (
                                <CircularProgress size={24} />
                              ) : (
                                <CloudDownloadIcon />
                              )}
                            </IconButton>
                          )
                        }
                      >
                        <ListItemButton
                          onClick={() => file.type === 'folder' && handleFolderClick(file)}
                          disabled={file.type !== 'folder'}
                        >
                          <ListItemIcon>
                            {file.type === 'folder' ? <FolderIcon /> : <InsertDriveFileIcon />}
                          </ListItemIcon>
                          <ListItemText 
                            primary={file.name}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Chip 
                                  label={file.platform.split('-').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                  ).join(' ')}
                                  size="small"
                                  sx={{ height: 20 }}
                                />
                                {file.type === 'file' && (
                                  <>
                                    <Typography variant="caption" component="span">
                                      {formatFileSize(file.size)}
                                    </Typography>
                                    {file.lastModified && (
                                      <Typography variant="caption" component="span">
                                        Modified: {new Date(file.lastModified).toLocaleDateString()}
                                      </Typography>
                                    )}
                                  </>
                                )}
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Box>
          </Box>
        </ErrorBoundary>
      )}
    </Container>
  );
} 