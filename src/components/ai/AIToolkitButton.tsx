import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Sparkles, BarChart2, PenTool, HashIcon, Image, Users, Zap, MessageSquare, X, ArrowRight } from 'lucide-react';
import Dialog from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export interface AITool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'content' | 'analysis' | 'media' | 'audience';
  featureTier: 'creator' | 'influencer' | 'enterprise' | 'all';
  href: string;
  isNew?: boolean;
  disabled?: boolean;
}

export interface AIToolkitButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Available AI tools
   */
  availableTools?: AITool[];
  /**
   * Current user's subscription tier
   */
  currentTier?: 'creator' | 'influencer' | 'enterprise';
  /**
   * Callback when a tool is selected
   */
  onSelectTool?: (toolId: string) => void;
  /**
   * Callback when the upgrade button is clicked
   */
  onUpgradeClick?: () => void;
  /**
   * The number of tokens remaining for AI usage
   */
  tokensRemaining?: number;
  /**
   * The total token limit for the current plan
   */
  tokenLimit?: number;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
}

/**
 * A button that provides access to the AI Toolkit features.
 * This component serves as the main entry point for all AI capabilities.
 * Different AI features are available on different subscription tiers.
 */
const AIToolkitButton: React.FC<AIToolkitButtonProps> = ({
  availableTools = [],
  currentTier = 'creator',
  onSelectTool,
  onUpgradeClick,
  tokensRemaining,
  tokenLimit,
  iconOnly = false,
  variant = 'outline',
  size = 'sm',
  children,
  ...buttonProps
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Organize tools by category
  const toolsByCategory = availableTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, AITool[]>);
  
  const categoryNames = {
    'content': 'Content Generation',
    'analysis': 'Analysis & Insights',
    'media': 'Media Generation',
    'audience': 'Audience Intelligence'
  };
  
  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };
  
  const handleSelectTool = (toolId: string) => {
    if (!onSelectTool) return;
    
    onSelectTool(toolId);
    setIsDialogOpen(false);
  };

  const canAccessTool = (tool: AITool) => {
    if (tool.featureTier === 'all') return true;
    
    const tierLevels = {
      'creator': 1,
      'influencer': 2,
      'enterprise': 3
    };
    
    return tierLevels[currentTier] >= tierLevels[tool.featureTier];
  };

  const getTokenPercentage = () => {
    if (tokensRemaining === undefined || tokenLimit === undefined || tokenLimit === 0) return 100;
    return Math.floor((tokensRemaining / tokenLimit) * 100);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        leftIcon={<Sparkles className="h-4 w-4" />}
        {...buttonProps}
      >
        {iconOnly ? null : children || 'AI Toolkit'}
      </Button>

      <Dialog
        open={isDialogOpen}
        onClose={handleClose}
        title="IriSync AI Toolkit"
        className="max-w-4xl"
      >
        <div className="space-y-6">
          {(tokensRemaining !== undefined && tokenLimit !== undefined) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">AI Credits Remaining</h4>
                <span className="text-sm font-medium">{tokensRemaining.toLocaleString()} / {tokenLimit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    getTokenPercentage() > 50 ? 'bg-[#00CC44]' :
                    getTokenPercentage() > 25 ? 'bg-yellow-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${getTokenPercentage()}%` }}
                ></div>
              </div>
              <div className="mt-2 text-xs text-gray-500 flex justify-between">
                <span>Refreshes on your next billing cycle</span>
                {getTokenPercentage() < 50 && (
                  <button
                    onClick={onUpgradeClick}
                    className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                  >
                    Need more? Upgrade
                  </button>
                )}
              </div>
            </div>
          )}
          
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Tools</TabsTrigger>
              {Object.keys(toolsByCategory).map(category => (
                <TabsTrigger key={category} value={category}>
                  {categoryNames[category as keyof typeof categoryNames]}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="all" className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTools.map(tool => (
                  <div 
                    key={tool.id} 
                    className={`p-4 border rounded-lg ${
                      canAccessTool(tool) && !tool.disabled ? 
                      'hover:border-blue-400 cursor-pointer transition-colors' : 
                      'opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => canAccessTool(tool) && !tool.disabled && handleSelectTool(tool.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="bg-blue-50 p-2 rounded-lg">
                        {tool.icon}
                      </div>
                      
                      {(tool.isNew || !canAccessTool(tool)) && (
                        <div
                          className={`px-2 py-0.5 text-xs rounded-md ${
                            tool.isNew ? 'bg-[#00FF6A]/10 text-[#00CC44]' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {tool.isNew ? 'New' : `${tool.featureTier.charAt(0).toUpperCase() + tool.featureTier.slice(1)}+`}
                        </div>
                      )}
                    </div>
                    
                    <h3 className="font-medium mt-3">{tool.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                    
                    {canAccessTool(tool) && !tool.disabled ? (
                      <div className="mt-3 flex justify-end">
                        <ArrowRight className="h-5 w-5 text-blue-500" />
                      </div>
                    ) : !canAccessTool(tool) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpgradeClick?.();
                        }}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                      >
                        Upgrade to unlock <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <div className="mt-3 text-sm text-gray-500">
                        Coming soon
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
            
            {Object.entries(toolsByCategory).map(([category, tools]) => (
              <TabsContent key={category} value={category} className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tools.map(tool => (
                    <div 
                      key={tool.id} 
                      className={`p-4 border rounded-lg ${
                        canAccessTool(tool) && !tool.disabled ? 
                        'hover:border-blue-400 cursor-pointer transition-colors' : 
                        'opacity-60 cursor-not-allowed'
                      }`}
                      onClick={() => canAccessTool(tool) && !tool.disabled && handleSelectTool(tool.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="bg-blue-50 p-2 rounded-lg">
                          {tool.icon}
                        </div>
                        
                        {(tool.isNew || !canAccessTool(tool)) && (
                          <div
                            className={`px-2 py-0.5 text-xs rounded-md ${
                              tool.isNew ? 'bg-[#00FF6A]/10 text-[#00CC44]' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tool.isNew ? 'New' : `${tool.featureTier.charAt(0).toUpperCase() + tool.featureTier.slice(1)}+`}
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-medium mt-3">{tool.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                      
                      {canAccessTool(tool) && !tool.disabled ? (
                        <div className="mt-3 flex justify-end">
                          <ArrowRight className="h-5 w-5 text-blue-500" />
                        </div>
                      ) : !canAccessTool(tool) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpgradeClick?.();
                          }}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                        >
                          Upgrade to unlock <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="mt-3 text-sm text-gray-500">
                          Coming soon
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          <div className="text-center pt-4 border-t text-sm text-gray-500">
            <p>AI features use tokens from your plan's monthly allocation</p>
          </div>
        </div>
      </Dialog>
    </>
  );
};

// Example default tools that can be used
export const defaultAITools: AITool[] = [
  {
    id: 'content-generator',
    name: 'Content Generator',
    description: 'Generate post content for different platforms and audiences',
    icon: <PenTool className="h-5 w-5 text-blue-600" />,
    category: 'content',
    featureTier: 'creator',
    href: '/dashboard/ai/content'
  },
  {
    id: 'hashtag-generator',
    name: 'Hashtag Generator',
    description: 'Generate relevant hashtags for your social media posts',
    icon: <HashIcon className="h-5 w-5 text-blue-600" />,
    category: 'content',
    featureTier: 'creator',
    href: '/dashboard/ai/hashtags'
  },
  {
    id: 'content-analyzer',
    name: 'Content Analyzer',
    description: 'Analyze content performance and get recommendations',
    icon: <BarChart2 className="h-5 w-5 text-blue-600" />,
    category: 'analysis',
    featureTier: 'influencer',
    href: '/dashboard/ai/analyze'
  },
  {
    id: 'sentiment-analyzer',
    name: 'Sentiment Analyzer',
    description: 'Analyze sentiment in comments and messages',
    icon: <MessageSquare className="h-5 w-5 text-blue-600" />,
    category: 'analysis',
    featureTier: 'influencer',
    href: '/dashboard/ai/sentiment'
  },
  {
    id: 'image-generator',
    name: 'Image Generator',
    description: 'Generate custom images for your social media posts',
    icon: <Image className="h-5 w-5 text-blue-600" />,
    category: 'media',
    featureTier: 'enterprise',
    href: '/dashboard/ai/images'
  },
  {
    id: 'audience-insights',
    name: 'Audience Insights',
    description: 'Get AI-powered insights about your audience',
    icon: <Users className="h-5 w-5 text-blue-600" />,
    category: 'audience',
    featureTier: 'enterprise',
    href: '/dashboard/ai/audience',
    isNew: true
  },
  {
    id: 'trend-analysis',
    name: 'Trend Analysis',
    description: 'Identify trending topics relevant to your audience',
    icon: <Zap className="h-5 w-5 text-blue-600" />,
    category: 'audience',
    featureTier: 'enterprise',
    href: '/dashboard/ai/trends'
  }
];

export default AIToolkitButton; 