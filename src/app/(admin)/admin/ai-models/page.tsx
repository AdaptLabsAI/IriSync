'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@mui/material/Button';
import Input from '@mui/material/Input';
import { Select, MenuItem, FormControl, InputLabel, FormControlLabel } from '@mui/material';
import Badge from '@mui/material/Badge';
import { Tabs, Tab, Box } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Switch from '@mui/material/Switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Edit, Trash2, Bot, Settings, Activity } from 'lucide-react';
import TextField from '@mui/material/TextField';

interface ModelConfiguration {
  id?: string;
  tier: string;
  taskType: string;
  model: string;
  parameters?: {
    temperature: number;
    maxTokens: number;
    qualityPreference: 'standard' | 'high' | 'highest';
  };
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

interface AvailableOptions {
  tiers: string[];
  taskTypes: string[];
  models: string[];
}

// TabPanel component for use with MUI Tabs
interface TabPanelProps {
  children?: React.ReactNode;
  value: any;
  index: any;
  className?: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, className, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      className={className}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

export default function AIModelsAdminPage() {
  const [modelConfigurations, setModelConfigurations] = useState<ModelConfiguration[]>([]);
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions>({
    tiers: [],
    taskTypes: [],
    models: []
  });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfiguration | null>(null);
  const [formData, setFormData] = useState<ModelConfiguration>({
    tier: '',
    taskType: '',
    model: '',
    parameters: {
      temperature: 0.7,
      maxTokens: 1000,
      qualityPreference: 'standard'
    },
    isActive: true
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const { toast } = useToast();

  // Load model configurations
  const loadConfigurations = async () => {
    try {
      const response = await fetch('/api/admin/ai-models');
      const data = await response.json();

      if (data.success) {
        setModelConfigurations(data.modelConfigurations);
        setAvailableOptions(data.availableOptions);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load model configurations',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to the server',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit form (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const method = editingConfig ? 'PUT' : 'POST';
      const payload = editingConfig 
        ? { ...formData, id: editingConfig.id }
        : formData;

      const response = await fetch('/api/admin/ai-models', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
          variant: 'default'
        });
        setIsDialogOpen(false);
        setEditingConfig(null);
        resetForm();
        loadConfigurations();
      } else {
        toast({
          title: 'Error',
          description: data.error || data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive'
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete configuration
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model configuration?')) return;

    try {
      const response = await fetch(`/api/admin/ai-models?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
          variant: 'default'
        });
        loadConfigurations();
      } else {
        toast({
          title: 'Error',
          description: data.error || data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete configuration',
        variant: 'destructive'
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      tier: '',
      taskType: '',
      model: '',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
        qualityPreference: 'standard'
      },
      isActive: true
    });
  };

  // Open edit dialog
  const openEditDialog = (config: ModelConfiguration) => {
    setEditingConfig(config);
    setFormData({ ...config });
    setIsDialogOpen(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditingConfig(null);
    resetForm();
    setIsDialogOpen(true);
  };

  useEffect(() => {
    loadConfigurations();
  }, []);

  // Group configurations by tier
  const configurationsByTier = modelConfigurations.reduce((acc, config) => {
    if (!acc[config.tier]) acc[config.tier] = [];
    acc[config.tier].push(config);
    return acc;
  }, {} as Record<string, ModelConfiguration[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading AI model configurations...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Model Management</h1>
          <p className="text-muted-foreground">
            Configure AI models for different subscription tiers and task types
          </p>
        </div>
        <Button variant="contained" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Model Configuration
        </Button>
      </div>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={0} onChange={(e, newValue) => console.log(newValue)}>
            <Tab label="View by Tier" />
            <Tab label="All Configurations" />
          </Tabs>
        </Box>
        <Box sx={{ p: 2 }}>
          <TabPanel value={0} index={0} className="space-y-6">
            {Object.entries(configurationsByTier).map(([tier, configs]) => (
              <Card key={tier}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bot className="h-5 w-5 mr-2" />
                    {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                    <Badge badgeContent={configs.length} color="primary">
                      {configs.length} configuration{configs.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {configs.map((config) => (
                      <Card key={config.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">
                              {config.taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </CardTitle>
                            <div className="flex space-x-1">
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => openEditDialog(config)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => handleDelete(config.id!)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Model:</span>
                              <Badge color="primary">{config.model}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge color={config.isActive ? "success" : "default"}>
                                {config.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            {config.parameters && (
                              <div className="pt-2 border-t">
                                <div className="flex justify-between text-xs">
                                  <span>Temp: {config.parameters.temperature}</span>
                                  <span>Tokens: {config.parameters.maxTokens}</span>
                                  <span>Quality: {config.parameters.qualityPreference}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabPanel>

          <TabPanel value={0} index={1}>
            <Card>
              <CardHeader>
                <CardTitle>All Model Configurations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modelConfigurations.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="grid grid-cols-4 gap-4 flex-1">
                        <div>
                          <span className="text-sm text-muted-foreground">Tier</span>
                          <div className="font-medium">{config.tier}</div>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Task</span>
                          <div className="font-medium">
                            {config.taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Model</span>
                          <div className="font-medium">{config.model}</div>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge color={config.isActive ? "success" : "default"}>
                            {config.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => openEditDialog(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => handleDelete(config.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabPanel>
        </Box>
      </Box>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>
          {editingConfig ? 'Edit Model Configuration' : 'Add Model Configuration'}
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormControl fullWidth>
                  <InputLabel id="tier-label">Subscription Tier</InputLabel>
                  <Select
                    labelId="tier-label"
                    id="tier"
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value as string })}
                    disabled={!!editingConfig}
                  >
                    {availableOptions.tiers.map((tier) => (
                      <MenuItem key={tier} value={tier}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              <div>
                <FormControl fullWidth>
                  <InputLabel id="task-type-label">Task Type</InputLabel>
                  <Select
                    labelId="task-type-label"
                    id="task-type"
                    value={formData.taskType}
                    onChange={(e) => setFormData({ ...formData, taskType: e.target.value as string })}
                    disabled={!!editingConfig}
                  >
                    {availableOptions.taskTypes.map((taskType) => (
                      <MenuItem key={taskType} value={taskType}>
                        {taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </div>
            
            <div>
              <FormControl fullWidth>
                <InputLabel id="model-label">AI Model</InputLabel>
                <Select
                  labelId="model-label"
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value as string })}
                >
                  {availableOptions.models.map((model) => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <FormControl fullWidth>
                  <InputLabel id="temperature-label">Temperature</InputLabel>
                  <TextField
                    id="temperature"
                    type="number"
                    inputProps={{
                      min: 0,
                      max: 2,
                      step: 0.1
                    }}
                    value={formData.parameters?.temperature || 0.7}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters!,
                        temperature: parseFloat(e.target.value)
                      }
                    })}
                  />
                </FormControl>
              </div>
              <div>
                <FormControl fullWidth>
                  <InputLabel id="max-tokens-label">Max Tokens</InputLabel>
                  <TextField
                    id="max-tokens"
                    type="number"
                    inputProps={{
                      min: 100,
                      max: 8000,
                      step: 100
                    }}
                    value={formData.parameters?.maxTokens || 1000}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters!,
                        maxTokens: parseInt(e.target.value)
                      }
                    })}
                  />
                </FormControl>
              </div>
              <div>
                <FormControl fullWidth>
                  <InputLabel id="quality-label">Quality Preference</InputLabel>
                  <Select
                    labelId="quality-label"
                    id="quality"
                    value={formData.parameters?.qualityPreference || 'standard'}
                    onChange={(e) => setFormData({
                      ...formData,
                      parameters: {
                        ...formData.parameters!,
                        qualityPreference: e.target.value as 'standard' | 'high' | 'highest'
                      }
                    })}
                  >
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="highest">Highest</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </div>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Configuration is active"
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setIsDialogOpen(false)}
            disabled={submitLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={submitLoading}
          >
            {submitLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingConfig ? 'Update' : 'Create'} Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
} 