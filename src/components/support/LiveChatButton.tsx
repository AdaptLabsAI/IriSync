import React, { useState, useEffect, useRef } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  X, 
  Bot, 
  Clock, 
  ChevronDown,
  Paperclip,
  Smile
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: Date;
  botName?: string;
  attachment?: { name: string; url: string };
}

export interface AIChatButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Function to initialize a chat session
   */
  onInitChat?: () => Promise<{ sessionId: string; welcomeMessage: string }>;
  /**
   * Function to send a message
   */
  onSendMessage?: (sessionId: string, message: string, attachment?: File) => Promise<ChatMessage>;
  /**
   * Function to end a chat session
   */
  onEndChat?: (sessionId: string) => Promise<void>;
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
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * AIChatButton - A component for chatting with the AI assistant.
 * This component allows users to get instant help from our AI chatbot.
 */
const AIChatButton: React.FC<AIChatButtonProps> = ({
  onInitChat,
  onSendMessage,
  onEndChat,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleOpenChat = () => {
    setIsOpen(true);
    if (!isChatActive && !isInitializing) {
      initializeChat();
    }
  };
  
  const initializeChat = async () => {
    if (!onInitChat) return;
    
    setIsInitializing(true);
    
    try {
      // Call the real chat API to create a conversation
      const response = await fetch('/api/support/chatbot/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello, I need help with my account.',
          metadata: {
            source: 'live-chat-widget',
            page: window.location.pathname
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize chat');
      }

      const data = await response.json();
      
      setSessionId(data.id);
      setIsChatActive(true);
      
      // Set the initial messages from the API response
      setMessages(data.messages || [
        {
          id: 'welcome',
          content: 'Hello! I\'m Iris, your AI assistant. How can I help you today?',
          sender: 'system',
          timestamp: new Date()
        }
      ]);
      
      // For real chat, we don't need to simulate agent connection
      // The API handles the AI assistant responses directly
      
    } catch (err) {
      console.error('Error initializing chat:', err);
      toast({
        title: "Chat Initialization Failed",
        description: "We couldn't start a chat session. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isSending || !sessionId) return;
    
    setIsSending(true);
    
    // Add user message to the chat immediately
    const tempId = `temp-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: tempId,
      content: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    if (attachment) {
      userMessage.attachment = {
        name: attachment.name,
        url: URL.createObjectURL(attachment)
      };
    }
    
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage;
    setCurrentMessage('');
    setAttachment(null);
    
    try {
      // Send to the real chat API
      const response = await fetch(`/api/support/chatbot/conversation/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          metadata: {
            source: 'live-chat-widget',
            page: window.location.pathname
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Replace temp message with confirmed message and add AI response
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => msg.id !== tempId);
        const confirmedUserMessage = {
          ...userMessage,
          id: data.userMessage?.id || tempId
        };
        
        const messages = [confirmedUserMessage];
        
        // Add AI response if present
        if (data.response) {
          messages.push({
            id: data.response.id || `ai-${Date.now()}`,
            content: data.response.content,
            sender: 'bot' as const,
            botName: 'AI Assistant',
            timestamp: new Date(data.response.timestamp || Date.now())
          });
        }
        
        return [...withoutTemp, ...messages];
      });
      
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Show error toast
      toast({
        title: "Message Not Sent",
        description: "Your message couldn't be sent. Please try again.",
        variant: "destructive"
      });
      
      // Remove the temporary message
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };
  
  const handleEndChat = async () => {
    if (!sessionId || !onEndChat) return;
    
    try {
      await onEndChat(sessionId);
      
      // Add end message
      setMessages(prev => [
        ...prev,
        {
          id: `end-${Date.now()}`,
          content: "Chat session has ended. Thank you for using our live chat support.",
          sender: 'system',
          timestamp: new Date()
        }
      ]);
      
      // Reset chat state
      setIsChatActive(false);
      setSessionId(null);
      
      // Show success toast
      toast({
        title: "Chat Ended",
        description: "Your chat session has ended. You can start a new chat anytime."
      });
      
      // Close dialog after a short delay
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error ending chat:', err);
      toast({
        title: "Error",
        description: "Failed to properly end the chat session.",
        variant: "destructive"
      });
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachment(files[0]);
      
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    }
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <>
      <Button
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={handleOpenChat}
        {...buttonProps}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        {!iconOnly && "AI Assistant"}
      </Button>
      
      <Dialog
        isOpen={isOpen}
        onClose={() => {
          if (isChatActive && sessionId) {
            // Confirm before closing active chat
            if (window.confirm('Are you sure you want to end this chat session?')) {
              handleEndChat();
            } else {
              return;
            }
          }
          setIsOpen(false);
        }}
        title={
          <div className="flex items-center">
            <Bot className="h-5 w-5 text-blue-500 mr-2" />
            AI Assistant
          </div>
        }
        size="md"
      >
        <div className="h-[450px] flex flex-col">
          <div className="mb-4 text-sm text-gray-600">
            Chat with our AI assistant for immediate help and support.
          </div>
          
          {isInitializing ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-gray-500">Starting conversation with AI assistant...</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id}
                      className={`max-w-[80%] ${
                        message.sender === 'user' 
                          ? 'ml-auto bg-blue-500 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                          : message.sender === 'bot'
                            ? 'mr-auto bg-gray-100 text-gray-800 rounded-tl-lg rounded-tr-lg rounded-br-lg'
                            : 'mx-auto bg-gray-200 text-gray-600 text-center text-sm rounded-lg'
                      } p-3`}
                    >
                      {message.sender === 'bot' && message.botName && (
                        <div className="text-xs font-medium mb-1 text-gray-500">
                          {message.botName} • {formatTime(message.timestamp)}
                        </div>
                      )}
                      
                      <div>{message.content}</div>
                      
                      {message.attachment && (
                        <div className="mt-2">
                          <a 
                            href={message.attachment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs underline flex items-center"
                          >
                            <Paperclip className="h-3 w-3 mr-1" />
                            {message.attachment.name}
                          </a>
                        </div>
                      )}
                      
                      {message.sender === 'user' && (
                        <div className="text-xs text-right mt-1 text-blue-200">
                          {formatTime(message.timestamp)}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>
              
              <div className="border-t p-3">
                {attachment && (
                  <div className="mb-2 flex items-center justify-between bg-gray-100 p-2 rounded">
                    <div className="text-xs flex items-center text-gray-700">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {attachment.name}
                    </div>
                    <button
                      onClick={() => setAttachment(null)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-end space-x-2">
                  <textarea
                    className="flex-1 p-2 border rounded-md min-h-[60px] max-h-[120px] resize-none"
                    placeholder="Type your message here..."
                    value={currentMessage}
                    onChange={e => setCurrentMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={!isChatActive || isSending}
                  />
                  <div className="flex flex-col space-y-2">
                    <button
                      className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded"
                      onClick={handleFileSelect}
                      disabled={!isChatActive || isSending}
                    >
                      <Paperclip className="h-5 w-5" />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                      />
                    </button>
                    <button
                      className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      onClick={handleSendMessage}
                      disabled={!isChatActive || isSending || !currentMessage.trim()}
                    >
                      {isSending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {isChatActive && (
                  <div className="mt-2 flex justify-between items-center">
                    <button 
                      className="text-xs text-red-600 hover:underline"
                      onClick={handleEndChat}
                    >
                      End Chat
                    </button>
                    <div className="text-xs text-gray-500">
                      <Bot className="h-3 w-3 inline mr-1" />
                      Support Agent
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
};

export default AIChatButton; 