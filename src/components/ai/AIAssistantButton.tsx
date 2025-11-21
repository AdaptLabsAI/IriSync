import React, { useState, useRef, useEffect } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { useSubscription, type SubscriptionTier } from '../../hooks/useSubscription';
import { useAIToolkit } from '../../hooks/useAIToolkit';
import { TextArea } from '../ui/textarea/TextArea';
import { Loader2, Bot, Lock, Send, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Avatar } from '../ui/avatar';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIAssistantButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Context information to help the AI understand the user's needs
   */
  contextInfo?: Record<string, any>;
  /**
   * Callback for when a message is sent
   */
  onMessageSent?: (message: string) => void;
  /**
   * Callback to save chat history
   */
  onSaveChat?: (messages: ChatMessage[]) => Promise<void>;
  /**
   * Callback to clear chat history
   */
  onClearChat?: () => Promise<void>;
  /**
   * Function to send a message to the AI assistant
   */
  onSendMessage?: (message: string, history: ChatMessage[]) => Promise<string>;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * AIAssistantButton - A component for chatting with an AI assistant.
 * This provides a conversational interface for users to ask questions and get help.
 * Different subscription tiers provide access to different capabilities of the assistant.
 */
const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({
  contextInfo = {},
  onMessageSent,
  onSaveChat,
  onClearChat,
  onSendMessage,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const { sendChatMessage, loading, error } = useAIToolkit();

  // Explicitly type userTier to match the subscription tier union
  const userTier: SubscriptionTier = subscription?.tier || 'creator';

  // Check feature availability - all subscription tiers (creator, influencer, enterprise) can use AI Assistant
  // Users with a subscription can access the AI Assistant
  const canUseAIAssistant = !!subscription;

  // Different capabilities based on tier
  const hasAdvancedCapabilities = userTier === 'enterprise' || userTier === 'influencer';
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isExpanded]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleOpenDialog = () => {
    if (!canUseAIAssistant) {
      toast({
        title: "Feature not available",
        description: "AI Assistant requires a Creator subscription or higher",
        variant: "destructive"
      });
      return;
    }
    
    setIsOpen(true);
    // Add a welcome message if this is a new conversation
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your AI assistant for IriSync. How can I help you with your social media management today?`,
          timestamp: new Date()
        }
      ]);
    }
  };
  
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isProcessing) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsProcessing(true);
    
    if (onMessageSent) {
      onMessageSent(userMessage.content);
    }
    
    try {
      // Use provided function or hook function
      const response = onSendMessage 
        ? await onSendMessage(userMessage.content, messages)
        : await sendChatMessage(userMessage.content, messages, contextInfo);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message to AI:', err);
      
      toast({
        title: "Message failed",
        description: typeof error === 'string' ? error : error?.message || "Failed to get a response. Please try again.",
        variant: "destructive"
      });
      
      // Add error message from assistant
      setMessages(prev => [
        ...prev, 
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm sorry, I couldn't process your request at the moment. Please try again later.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsProcessing(false);
      setTimeout(scrollToBottom, 100);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleMinimize = () => {
    setIsMinimized(true);
  };
  
  const handleRestore = () => {
    setIsMinimized(false);
  };
  
  const handleClearChat = async () => {
    if (isProcessing) return;
    
    try {
      if (onClearChat) {
        await onClearChat();
      }
      
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your AI assistant for IriSync. How can I help you with your social media management today?`,
          timestamp: new Date()
        }
      ]);
      
      toast({
        title: "Chat cleared",
        description: "Your conversation has been reset",
      });
    } catch (err) {
      console.error('Error clearing chat:', err);
    }
  };
  
  const handleSaveChat = async () => {
    if (isProcessing || messages.length <= 1) return;
    
    try {
      if (onSaveChat) {
        await onSaveChat(messages);
        
        toast({
          title: "Chat saved",
          description: "Your conversation has been saved",
        });
      }
    } catch (err) {
      console.error('Error saving chat:', err);
      
      toast({
        title: "Failed to save",
        description: "Could not save the conversation",
        variant: "destructive"
      });
    }
  };
  
  // Render a chat message
  const renderMessage = (message: ChatMessage) => {
    const isUserMessage = message.role === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`flex items-start max-w-[75%] ${
            isUserMessage ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <div className={`flex-shrink-0 ${isUserMessage ? 'ml-2' : 'mr-2'}`}>
            <Avatar
              src={isUserMessage ? '' : '/icons/assistant-avatar.png'}
              alt={isUserMessage ? 'You' : 'AI Assistant'}
              fallback={isUserMessage ? 'U' : 'AI'}
              size="small"
            />
          </div>
          <div
            className={`p-3 rounded-lg ${
              isUserMessage
                ? 'bg-blue-500 text-white rounded-tr-none'
                : 'bg-gray-100 text-gray-800 rounded-tl-none'
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
            <div
              className={`text-xs mt-1 ${
                isUserMessage ? 'text-blue-100' : 'text-gray-500'
              }`}
            >
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the minimized chat bubble
  const renderMinimizedChat = () => {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white shadow-lg rounded-full p-3 cursor-pointer" onClick={handleRestore}>
          <Bot className="h-6 w-6 text-blue-500" />
        </div>
      </div>
    );
  };
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={handleOpenDialog}
        {...buttonProps}
      >
        <Bot className="h-4 w-4 mr-2" />
        {!iconOnly && "AI Assistant"}
        {!canUseAIAssistant && <Lock className="h-3 w-3 ml-1" />}
      </Button>
      
      {isMinimized ? (
        renderMinimizedChat()
      ) : (
        <Dialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        >
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="h-5 w-5 text-blue-500 mr-2" />
                <DialogTitle>AI Assistant</DialogTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="small"
                  className="h-8 w-8 p-0"
                  onClick={handleToggleExpand}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  className="h-8 w-8 p-0"
                  onClick={handleMinimize}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Minimize</span>
                </Button>
              </div>
            </DialogHeader>
            
            {isExpanded && (
              <DialogDescription className="flex-shrink-0">
                Ask me anything about social media management, content creation, or how to use IriSync
              </DialogDescription>
            )}
            
            <div className={`flex-grow overflow-y-auto py-4 ${isExpanded ? 'flex flex-col' : 'hidden'}`}>
              <div className="flex-grow">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            <div className="flex-shrink-0 pt-4 border-t mt-auto">
              <div className="flex justify-between mb-2">
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={handleClearChat}
                    disabled={isProcessing || messages.length <= 1}
                  >
                    Clear Chat
                  </Button>
                  
                  {hasAdvancedCapabilities && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={handleSaveChat}
                      disabled={isProcessing || messages.length <= 1}
                    >
                      Save Chat
                    </Button>
                  )}
                </div>
                
                {!isExpanded && (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={handleToggleExpand}
                  >
                    Show Chat
                  </Button>
                )}
              </div>
              
              <div className="flex items-end space-x-2">
                <TextArea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-grow resize-none"
                  rows={2}
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isProcessing}
                  size="small"
                  className="mb-1"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sr-only">Send</span>
                </Button>
              </div>
              
              {!hasAdvancedCapabilities && (
                <div className="text-xs text-amber-600 mt-2">
                  Upgrade to Influencer or Enterprise tier for advanced AI capabilities and chat history
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AIAssistantButton; 