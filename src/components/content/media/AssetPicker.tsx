import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Button, CircularProgress, TextField, List, ListItem, ListItemButton, ListItemText, Typography, Snackbar, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface AssetPickerProps {
  onSelect: (file: File | { source: 'google-drive' | 'dropbox' | 'onedrive' | 'canva' | 'airtable' | 'notion' | 'adobe-express', file: any }) => void;
  onClose: () => void;
}

export default function AssetPicker({ onSelect, onClose }: AssetPickerProps) {
  const [tab, setTab] = useState(0);
  // Local upload state
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Google Drive state
  const [gdTokens, setGdTokens] = useState<any>(null);
  const [gdFiles, setGdFiles] = useState<any[]>([]);
  const [gdLoading, setGdLoading] = useState(false);
  const [gdError, setGdError] = useState<string | null>(null);
  const [gdSearch, setGdSearch] = useState('');
  const [gdAuthUrl, setGdAuthUrl] = useState<string | null>(null);
  const [gdAuthLoading, setGdAuthLoading] = useState(false);
  // Dropbox state
  const [dbxTokens, setDbxTokens] = useState<any>(null);
  const [dbxFiles, setDbxFiles] = useState<any[]>([]);
  const [dbxLoading, setDbxLoading] = useState(false);
  const [dbxError, setDbxError] = useState<string | null>(null);
  const [dbxAuthUrl, setDbxAuthUrl] = useState<string | null>(null);
  const [dbxAuthLoading, setDbxAuthLoading] = useState(false);
  const [dbxPath, setDbxPath] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });
  // Add state for each new platform (tokens, files, loading, error, authUrl, etc.)
  const [onedriveTokens, setOnedriveTokens] = useState<any>(null);
  const [onedriveFiles, setOnedriveFiles] = useState<any[]>([]);
  const [onedriveLoading, setOnedriveLoading] = useState(false);
  const [onedriveError, setOnedriveError] = useState<string | null>(null);
  const [onedriveAuthUrl, setOnedriveAuthUrl] = useState<string | null>(null);
  const [onedriveAuthLoading, setOnedriveAuthLoading] = useState(false);

  const [canvaTokens, setCanvaTokens] = useState<any>(null);
  const [canvaFiles, setCanvaFiles] = useState<any[]>([]);
  const [canvaLoading, setCanvaLoading] = useState(false);
  const [canvaError, setCanvaError] = useState<string | null>(null);
  const [canvaAuthUrl, setCanvaAuthUrl] = useState<string | null>(null);
  const [canvaAuthLoading, setCanvaAuthLoading] = useState(false);

  const [airtableTokens, setAirtableTokens] = useState<any>(null);
  const [airtableFiles, setAirtableFiles] = useState<any[]>([]);
  const [airtableLoading, setAirtableLoading] = useState(false);
  const [airtableError, setAirtableError] = useState<string | null>(null);
  const [airtableAuthUrl, setAirtableAuthUrl] = useState<string | null>(null);
  const [airtableAuthLoading, setAirtableAuthLoading] = useState(false);
  const [airtableBaseId, setAirtableBaseId] = useState('');
  const [airtableTableId, setAirtableTableId] = useState('');

  const [notionTokens, setNotionTokens] = useState<any>(null);
  const [notionFiles, setNotionFiles] = useState<any[]>([]);
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [notionAuthUrl, setNotionAuthUrl] = useState<string | null>(null);
  const [notionAuthLoading, setNotionAuthLoading] = useState(false);

  const [adobeTokens, setAdobeTokens] = useState<any>(null);
  const [adobeFiles, setAdobeFiles] = useState<any[]>([]);
  const [adobeLoading, setAdobeLoading] = useState(false);
  const [adobeError, setAdobeError] = useState<string | null>(null);
  const [adobeAuthUrl, setAdobeAuthUrl] = useState<string | null>(null);
  const [adobeAuthLoading, setAdobeAuthLoading] = useState(false);

  // Extend useEffect for OAuth URLs for all new platforms
  useEffect(() => {
    // Google Drive
    if (tab === 1 && !gdTokens && !gdAuthUrl && !gdAuthLoading) {
      setGdAuthLoading(true);
      fetch('/api/integration/design/google-drive-auth')
        .then(res => res.json())
        .then(data => setGdAuthUrl(data.url))
        .catch(() => setGdError('Failed to get Google Drive auth URL'))
        .finally(() => setGdAuthLoading(false));
    }
    // Dropbox
    if (tab === 2 && !dbxTokens && !dbxAuthUrl && !dbxAuthLoading) {
      setDbxAuthLoading(true);
      fetch('/api/integration/design/dropbox-auth')
        .then(res => res.json())
        .then(data => setDbxAuthUrl(data.url))
        .catch(() => setDbxError('Failed to get Dropbox auth URL'))
        .finally(() => setDbxAuthLoading(false));
    }
    // OneDrive
    if (tab === 3 && !onedriveTokens && !onedriveAuthUrl && !onedriveAuthLoading) {
      setOnedriveAuthLoading(true);
      fetch('/api/integration/design/onedrive-auth')
        .then(res => res.json())
        .then(data => setOnedriveAuthUrl(data.url))
        .catch(() => setOnedriveError('Failed to get OneDrive auth URL'))
        .finally(() => setOnedriveAuthLoading(false));
    }
    // Canva
    if (tab === 4 && !canvaTokens && !canvaAuthUrl && !canvaAuthLoading) {
      setCanvaAuthLoading(true);
      fetch('/api/integration/design/canva-auth')
        .then(res => res.json())
        .then(data => setCanvaAuthUrl(data.url))
        .catch(() => setCanvaError('Failed to get Canva auth URL'))
        .finally(() => setCanvaAuthLoading(false));
    }
    // Airtable
    if (tab === 5 && !airtableTokens && !airtableAuthUrl && !airtableAuthLoading) {
      setAirtableAuthLoading(true);
      fetch('/api/integration/design/airtable-auth')
        .then(res => res.json())
        .then(data => setAirtableAuthUrl(data.url))
        .catch(() => setAirtableError('Failed to get Airtable auth URL'))
        .finally(() => setAirtableAuthLoading(false));
    }
    // Notion
    if (tab === 6 && !notionTokens && !notionAuthUrl && !notionAuthLoading) {
      setNotionAuthLoading(true);
      fetch('/api/integration/design/notion-auth')
        .then(res => res.json())
        .then(data => setNotionAuthUrl(data.url))
        .catch(() => setNotionError('Failed to get Notion auth URL'))
        .finally(() => setNotionAuthLoading(false));
    }
    // Adobe Express
    if (tab === 7 && !adobeTokens && !adobeAuthUrl && !adobeAuthLoading) {
      setAdobeAuthLoading(true);
      fetch('/api/integration/design/adobe-express-auth')
        .then(res => res.json())
        .then(data => setAdobeAuthUrl(data.url))
        .catch(() => setAdobeError('Failed to get Adobe Express auth URL'))
        .finally(() => setAdobeAuthLoading(false));
    }
  }, [tab, gdTokens, gdAuthUrl, gdAuthLoading, dbxTokens, dbxAuthUrl, dbxAuthLoading, onedriveTokens, onedriveAuthUrl, onedriveAuthLoading, canvaTokens, canvaAuthUrl, canvaAuthLoading, airtableTokens, airtableAuthUrl, airtableAuthLoading, notionTokens, notionAuthUrl, notionAuthLoading, adobeTokens, adobeAuthUrl, adobeAuthLoading]);

  // Google Drive file listing
  const fetchGdFiles = async (tokens: any, query = '') => {
    setGdLoading(true);
    setGdError(null);
    try {
      const res = await fetch('/api/integration/design/google-drive-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setGdFiles(data.files || []);
    } catch (err: any) {
      setGdError(err.message);
    } finally {
      setGdLoading(false);
    }
  };

  // Dropbox file listing
  const fetchDbxFiles = async (accessToken: string, path = '') => {
    setDbxLoading(true);
    setDbxError(null);
    try {
      const res = await fetch('/api/integration/design/dropbox-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setDbxFiles(data.files || []);
    } catch (err: any) {
      setDbxError(err.message);
    } finally {
      setDbxLoading(false);
    }
  };

  // Handle Google Drive OAuth callback
  useEffect(() => {
    if (tab === 1 && typeof window !== 'undefined' && !gdTokens) {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        setGdLoading(true);
        fetch('/api/integration/design/google-drive-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.tokens) {
              setGdTokens(data.tokens);
              fetchGdFiles(data.tokens);
              window.history.replaceState({}, document.title, url.pathname); // Clean up URL
            } else {
              setGdError('Failed to authenticate with Google Drive');
            }
          })
          .catch(() => setGdError('Failed to authenticate with Google Drive'))
          .finally(() => setGdLoading(false));
      }
    }
    // Handle Dropbox OAuth callback
    if (tab === 2 && typeof window !== 'undefined' && !dbxTokens) {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        setDbxLoading(true);
        fetch('/api/integration/design/dropbox-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.tokens) {
              setDbxTokens(data.tokens);
              fetchDbxFiles(data.tokens.access_token);
              window.history.replaceState({}, document.title, url.pathname); // Clean up URL
            } else {
              setDbxError('Failed to authenticate with Dropbox');
            }
          })
          .catch(() => setDbxError('Failed to authenticate with Dropbox'))
          .finally(() => setDbxLoading(false));
      }
    }
  }, [tab, gdTokens, dbxTokens]);

  // Local upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('File too large (max 100MB)');
      return;
    }
    setUploadError(null);
    onSelect(file);
  };

  // Google Drive file select
  const handleGdSelect = (file: any) => {
    onSelect({ source: 'google-drive', file });
  };
  // Dropbox file select
  const handleDbxSelect = (file: any) => {
    onSelect({ source: 'dropbox', file });
  };

  // Handlers for file listing and selection for each platform
  const fetchOnedriveFiles = async (tokens: any, folderId = 'root') => {
    setOnedriveLoading(true);
    setOnedriveError(null);
    try {
      const res = await fetch('/api/integration/design/onedrive-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, folderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setOnedriveFiles(data.files || []);
    } catch (err: any) {
      setOnedriveError(err.message);
    } finally {
      setOnedriveLoading(false);
    }
  };
  const handleOnedriveSelect = (file: any) => {
    onSelect({ source: 'onedrive', file });
  };

  const fetchCanvaFiles = async (tokens: any) => {
    setCanvaLoading(true);
    setCanvaError(null);
    try {
      const res = await fetch('/api/integration/design/canva-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setCanvaFiles(data.files || []);
    } catch (err: any) {
      setCanvaError(err.message);
    } finally {
      setCanvaLoading(false);
    }
  };
  const handleCanvaSelect = (file: any) => {
    onSelect({ source: 'canva', file });
  };

  const fetchAirtableFiles = async (tokens: any, baseId: string, tableId: string) => {
    setAirtableLoading(true);
    setAirtableError(null);
    try {
      const res = await fetch('/api/integration/design/airtable-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, baseId, tableId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setAirtableFiles(data.files || []);
    } catch (err: any) {
      setAirtableError(err.message);
    } finally {
      setAirtableLoading(false);
    }
  };
  const handleAirtableSelect = (file: any) => {
    onSelect({ source: 'airtable', file });
  };

  const fetchNotionFiles = async (tokens: any) => {
    setNotionLoading(true);
    setNotionError(null);
    try {
      const res = await fetch('/api/integration/design/notion-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setNotionFiles(data.files || []);
    } catch (err: any) {
      setNotionError(err.message);
    } finally {
      setNotionLoading(false);
    }
  };
  const handleNotionSelect = (file: any) => {
    onSelect({ source: 'notion', file });
  };

  const fetchAdobeFiles = async (tokens: any) => {
    setAdobeLoading(true);
    setAdobeError(null);
    try {
      const res = await fetch('/api/integration/design/adobe-express-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setAdobeFiles(data.files || []);
    } catch (err: any) {
      setAdobeError(err.message);
    } finally {
      setAdobeLoading(false);
    }
  };
  const handleAdobeSelect = (file: any) => {
    onSelect({ source: 'adobe-express', file });
  };

  // Handle OAuth callback for each platform (similar to Google Drive/Dropbox)
  useEffect(() => {
    // OneDrive
    if (tab === 3 && typeof window !== 'undefined' && !onedriveTokens) {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        setOnedriveLoading(true);
        fetch('/api/integration/design/onedrive-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.tokens) {
              setOnedriveTokens(data.tokens);
              fetchOnedriveFiles(data.tokens);
              window.history.replaceState({}, document.title, url.pathname);
            } else {
              setOnedriveError('Failed to authenticate with OneDrive');
            }
          })
          .catch(() => setOnedriveError('Failed to authenticate with OneDrive'))
          .finally(() => setOnedriveLoading(false));
      }
    }
    // Canva
    if (tab === 4 && typeof window !== 'undefined' && !canvaTokens) {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        setCanvaLoading(true);
        fetch('/api/integration/design/canva-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.tokens) {
              setCanvaTokens(data.tokens);
              fetchCanvaFiles(data.tokens);
              window.history.replaceState({}, document.title, url.pathname);
            } else {
              setCanvaError('Failed to authenticate with Canva');
            }
          })
          .catch(() => setCanvaError('Failed to authenticate with Canva'))
          .finally(() => setCanvaLoading(false));
      }
    }
    // Airtable
    if (tab === 5 && typeof window !== 'undefined' && !airtableTokens) {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        setAirtableLoading(true);
        fetch('/api/integration/design/airtable-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.tokens) {
              setAirtableTokens(data.tokens);
              // User must enter baseId/tableId to fetch files
              window.history.replaceState({}, document.title, url.pathname);
            } else {
              setAirtableError('Failed to authenticate with Airtable');
            }
          })
          .catch(() => setAirtableError('Failed to authenticate with Airtable'))
          .finally(() => setAirtableLoading(false));
      }
    }
    // Notion
    if (tab === 6 && typeof window !== 'undefined' && !notionTokens) {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        setNotionLoading(true);
        fetch('/api/integration/design/notion-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.tokens) {
              setNotionTokens(data.tokens);
              fetchNotionFiles(data.tokens);
              window.history.replaceState({}, document.title, url.pathname);
            } else {
              setNotionError('Failed to authenticate with Notion');
            }
          })
          .catch(() => setNotionError('Failed to authenticate with Notion'))
          .finally(() => setNotionLoading(false));
      }
    }
    // Adobe Express
    if (tab === 7 && typeof window !== 'undefined' && !adobeTokens) {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        setAdobeLoading(true);
        fetch('/api/integration/design/adobe-express-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.tokens) {
              setAdobeTokens(data.tokens);
              // File listing not supported, show error
              window.history.replaceState({}, document.title, url.pathname);
            } else {
              setAdobeError('Failed to authenticate with Adobe Express');
            }
          })
          .catch(() => setAdobeError('Failed to authenticate with Adobe Express'))
          .finally(() => setAdobeLoading(false));
      }
    }
  }, [tab, onedriveTokens, canvaTokens, airtableTokens, notionTokens, adobeTokens]);

  return (
    <Box p={2} width={400} maxWidth="100vw">
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Local Upload" />
        <Tab label="Google Drive" />
        <Tab label="Dropbox" />
        <Tab label="OneDrive" />
        <Tab label="Canva" />
        <Tab label="Airtable" />
        <Tab label="Notion" />
        <Tab label="Adobe Express" />
      </Tabs>
      {tab === 0 && (
        <Box mt={2}>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
            fullWidth
          >
            Select File
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
          {uploadError && <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>}
        </Box>
      )}
      {tab === 1 && (
        <Box mt={2}>
          {!gdTokens ? (
            gdAuthLoading ? <CircularProgress /> : gdAuthUrl ? (
              <Button variant="contained" color="primary" href={gdAuthUrl} fullWidth>
                Connect Google Drive
              </Button>
            ) : gdError ? <Alert severity="error">{gdError}</Alert> : null
          ) : (
            <>
              <TextField
                label="Search files"
                value={gdSearch}
                onChange={e => setGdSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') fetchGdFiles(gdTokens, gdSearch); }}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
              <Button onClick={() => fetchGdFiles(gdTokens, gdSearch)} disabled={gdLoading} sx={{ mb: 2 }}>Search</Button>
              {gdLoading ? <CircularProgress /> : gdError ? <Alert severity="error">{gdError}</Alert> : (
                <List>
                  {gdFiles.map(file => (
                    <ListItemButton key={file.id} onClick={() => handleGdSelect(file)}>
                      <ListItemText
                        primary={file.name}
                        secondary={file.mimeType}
                      />
                    </ListItemButton>
                  ))}
                  {gdFiles.length === 0 && <Typography variant="body2">No files found.</Typography>}
                </List>
              )}
            </>
          )}
        </Box>
      )}
      {tab === 2 && (
        <Box mt={2}>
          {!dbxTokens ? (
            dbxAuthLoading ? <CircularProgress /> : dbxAuthUrl ? (
              <Button variant="contained" color="primary" href={dbxAuthUrl} fullWidth>
                Connect Dropbox
              </Button>
            ) : dbxError ? <Alert severity="error">{dbxError}</Alert> : null
          ) : (
            <>
              <TextField
                label="Path"
                value={dbxPath}
                onChange={e => setDbxPath(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') fetchDbxFiles(dbxTokens.access_token, dbxPath); }}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />
              <Button onClick={() => fetchDbxFiles(dbxTokens.access_token, dbxPath)} disabled={dbxLoading} sx={{ mb: 2 }}>Browse</Button>
              {dbxLoading ? <CircularProgress /> : dbxError ? <Alert severity="error">{dbxError}</Alert> : (
                <List>
                  {dbxFiles.map(file => (
                    <ListItemButton key={file.id || file.name} onClick={() => handleDbxSelect(file)}>
                      <ListItemText
                        primary={file.name}
                        secondary={file['.tag']}
                      />
                    </ListItemButton>
                  ))}
                  {dbxFiles.length === 0 && <Typography variant="body2">No files found.</Typography>}
                </List>
              )}
            </>
          )}
        </Box>
      )}
      {tab === 3 && (
        <Box mt={2}>
          {!onedriveTokens ? (
            onedriveAuthLoading ? <CircularProgress /> : onedriveAuthUrl ? (
              <Button variant="contained" color="primary" href={onedriveAuthUrl} fullWidth>
                Connect OneDrive
              </Button>
            ) : onedriveError ? <Alert severity="error">{onedriveError}</Alert> : null
          ) : (
            <>
              <Button onClick={() => fetchOnedriveFiles(onedriveTokens)} disabled={onedriveLoading} sx={{ mb: 2 }}>Browse</Button>
              {onedriveLoading ? <CircularProgress /> : onedriveError ? <Alert severity="error">{onedriveError}</Alert> : (
                <List>
                  {onedriveFiles.map(file => (
                    <ListItemButton key={file.id} onClick={() => handleOnedriveSelect(file)}>
                      <ListItemText primary={file.name} secondary={file.fileType || file.mimeType} />
                    </ListItemButton>
                  ))}
                  {onedriveFiles.length === 0 && <Typography variant="body2">No files found.</Typography>}
                </List>
              )}
            </>
          )}
        </Box>
      )}
      {tab === 4 && (
        <Box mt={2}>
          {!canvaTokens ? (
            canvaAuthLoading ? <CircularProgress /> : canvaAuthUrl ? (
              <Button variant="contained" color="primary" href={canvaAuthUrl} fullWidth>
                Connect Canva
              </Button>
            ) : canvaError ? <Alert severity="error">{canvaError}</Alert> : null
          ) : (
            <>
              <Button onClick={() => fetchCanvaFiles(canvaTokens)} disabled={canvaLoading} sx={{ mb: 2 }}>Browse</Button>
              {canvaLoading ? <CircularProgress /> : canvaError ? <Alert severity="error">{canvaError}</Alert> : (
                <List>
                  {canvaFiles.map(file => (
                    <ListItemButton key={file.id} onClick={() => handleCanvaSelect(file)}>
                      <ListItemText primary={file.name} secondary={file.fileType || file.mimeType} />
                    </ListItemButton>
                  ))}
                  {canvaFiles.length === 0 && <Typography variant="body2">No files found.</Typography>}
                </List>
              )}
            </>
          )}
        </Box>
      )}
      {tab === 5 && (
        <Box mt={2}>
          {!airtableTokens ? (
            airtableAuthLoading ? <CircularProgress /> : airtableAuthUrl ? (
              <Button variant="contained" color="primary" href={airtableAuthUrl} fullWidth>
                Connect Airtable
              </Button>
            ) : airtableError ? <Alert severity="error">{airtableError}</Alert> : null
          ) : (
            <>
              <TextField label="Base ID" value={airtableBaseId} onChange={e => setAirtableBaseId(e.target.value)} fullWidth size="small" sx={{ mb: 2 }} />
              <TextField label="Table ID" value={airtableTableId} onChange={e => setAirtableTableId(e.target.value)} fullWidth size="small" sx={{ mb: 2 }} />
              <Button onClick={() => fetchAirtableFiles(airtableTokens, airtableBaseId, airtableTableId)} disabled={airtableLoading || !airtableBaseId || !airtableTableId} sx={{ mb: 2 }}>Browse</Button>
              {airtableLoading ? <CircularProgress /> : airtableError ? <Alert severity="error">{airtableError}</Alert> : (
                <List>
                  {airtableFiles.map(file => (
                    <ListItemButton key={file.id} onClick={() => handleAirtableSelect(file)}>
                      <ListItemText primary={file.name || file.id} secondary={file.fileType || file.mimeType} />
                    </ListItemButton>
                  ))}
                  {airtableFiles.length === 0 && <Typography variant="body2">No files found.</Typography>}
                </List>
              )}
            </>
          )}
        </Box>
      )}
      {tab === 6 && (
        <Box mt={2}>
          {!notionTokens ? (
            notionAuthLoading ? <CircularProgress /> : notionAuthUrl ? (
              <Button variant="contained" color="primary" href={notionAuthUrl} fullWidth>
                Connect Notion
              </Button>
            ) : notionError ? <Alert severity="error">{notionError}</Alert> : null
          ) : (
            <>
              <Button onClick={() => fetchNotionFiles(notionTokens)} disabled={notionLoading} sx={{ mb: 2 }}>Browse</Button>
              {notionLoading ? <CircularProgress /> : notionError ? <Alert severity="error">{notionError}</Alert> : (
                <List>
                  {notionFiles.map(file => (
                    <ListItemButton key={file.id} onClick={() => handleNotionSelect(file)}>
                      <ListItemText primary={file.name || file.id} secondary={file.fileType || file.mimeType} />
                    </ListItemButton>
                  ))}
                  {notionFiles.length === 0 && <Typography variant="body2">No files found or Notion API limitation."</Typography>}
                </List>
              )}
            </>
          )}
        </Box>
      )}
      {tab === 7 && (
        <Box mt={2}>
          {!adobeTokens ? (
            adobeAuthLoading ? <CircularProgress /> : adobeAuthUrl ? (
              <Button variant="contained" color="primary" href={adobeAuthUrl} fullWidth>
                Connect Adobe Express
              </Button>
            ) : adobeError ? <Alert severity="error">{adobeError}</Alert> : null
          ) : (
            <Alert severity="info">Adobe Express file listing is not supported via public API.</Alert>
          )}
        </Box>
      )}
      <Box mt={2} display="flex" gap={2}>
        <Button onClick={onClose} variant="outlined" color="secondary" fullWidth>Cancel</Button>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert elevation={6} variant="filled" severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 