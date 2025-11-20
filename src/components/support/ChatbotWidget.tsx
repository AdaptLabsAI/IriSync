'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '../../hooks/useUserProfile';
import { FiSend, FiChevronDown, FiX, FiMessageCircle } from 'react-icons/fi';

// Define UserTier enum to match the backend
enum UserTier {
  ANONYMOUS = 'anonymous',
  CREATOR = 'creator',
  INFLUENCER = 'influencer',
  ENTERPRISE = 'enterprise'
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
}

interface ChatbotWidgetProps {
  initialMessage?: string;
  position?: 'bottom-right' | 'bottom-left';
  customStyles?: React.CSSProperties;
  onClose?: () => void;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  initialMessage = "How can I help you today?",
  position = 'bottom-right',
  customStyles = {},
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const { profile } = useUserProfile();
  const router = useRouter();

  // Determine user tier based on organization subscription
  const getUserTier = (): UserTier => {
    // If user is not authenticated, they're anonymous
    if (!session?.user) {
      return UserTier.ANONYMOUS;
    }
    
    // If user has an organization, use that tier
    if (profile?.organizationId && profile?.organizationSubscriptionTier) {
      switch (profile.organizationSubscriptionTier.toLowerCase()) {
        case 'enterprise':
          return UserTier.ENTERPRISE;
        case 'influencer':
          return UserTier.INFLUENCER;
        case 'creator':
          return UserTier.CREATOR;
        default:
          return UserTier.CREATOR;
      }
    }
    
    // Default to creator tier if user is authenticated but no organization tier is found
    return UserTier.CREATOR;
  };

  // Initialize conversation
  useEffect(() => {
    const initConversation = async () => {
      if (isOpen && !conversationId) {
        try {
          setIsLoading(true);
          
          const userTier = getUserTier();
          
          const response = await fetch('/api/support/chatbot/conversation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userTier,
              organizationId: profile?.organizationId || undefined,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setConversationId(data.conversationId);
            
            // Add welcome message if no messages yet
            if (data.messages && data.messages.length > 0) {
              setMessages(data.messages);
              setMessageCount(data.messages.length);
            } else {
              // Add default welcome message
              setMessages([
                {
                  id: 'welcome',
                  content: 'Hello! I\'m Iris, your IriSync assistant. How can I help you today?',
                  role: 'assistant',
                  timestamp: new Date(),
                },
              ]);
            }
          }
        } catch (error) {
          console.error('Error initializing conversation:', error);
          // Add fallback welcome message
          setMessages([
            {
              id: 'welcome',
              content: 'Hello! I\'m Iris, your IriSync assistant. How can I help you today?',
              role: 'assistant',
              timestamp: new Date(),
            },
          ]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    initConversation();
  }, [isOpen, conversationId, profile]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Toggle chat open/closed
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Handle sending a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // For anonymous users, check message limit
      if (getUserTier() === UserTier.ANONYMOUS && messageCount >= 4) {
        // Add message about creating an account after 2 exchanges
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `limit-${Date.now()}`,
              content: 'To continue this conversation, please sign up for a free account or log in.',
              role: 'assistant',
              timestamp: new Date(),
            },
          ]);
          setIsLoading(false);
        }, 500);
        return;
      }
      
      if (!conversationId) {
        // Initialize conversation with this message
        const response = await fetch('/api/support/chatbot/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userTier: getUserTier(),
            initialMessage: input.trim(),
            organizationId: profile?.organizationId || undefined,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setConversationId(data.conversationId);
          
          if (data.messages && data.messages.length > 0) {
            // Replace our temporary messages with the actual ones from the server
            setMessages(data.messages);
            setMessageCount(data.messages.length);
          }
        }
      } else {
        // Send to existing conversation
        const response = await fetch(`/api/support/chatbot/conversation/${conversationId}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input.trim(),
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          // Update with latest messages
          setMessages(data.messages);
          setMessageCount(prev => prev + 2); // User message + assistant response
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: 'Sorry, I encountered an error. Please try again later.',
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new support ticket
  const createSupportTicket = () => {
    router.push('/support/new-ticket');
    if (onClose) onClose();
  };

  // Position styles
  const positionStyles: React.CSSProperties = 
    position === 'bottom-right' 
      ? { bottom: '20px', right: '20px' } 
      : { bottom: '20px', left: '20px' };

  // Format timestamp for display
  const formatTimestamp = (timestamp: Date | string): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed z-50"
      style={{ ...positionStyles, ...customStyles }}
    >
      {/* Chat toggle button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 ease-in-out"
          aria-label="Open chat"
        >
          <FiMessageCircle size={24} />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl flex flex-col w-80 sm:w-96 h-[32rem] max-h-[calc(100vh-40px)] transition-all duration-200 ease-in-out">
          {/* Chat header */}
          <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-medium">Iris Support Assistant</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleChat}
                className="p-1 hover:bg-indigo-500 rounded transition-colors"
                aria-label="Minimize chat"
              >
                <FiChevronDown size={18} />
              </button>
              <button
                onClick={() => onClose ? onClose() : toggleChat()}
                className="p-1 hover:bg-indigo-500 rounded transition-colors"
                aria-label="Close chat"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          {/* Messages container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-none'
                      : message.role === 'system'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-indigo-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 p-3 rounded-lg rounded-bl-none max-w-[75%]">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Support options */}
          <div className="p-2 bg-gray-50 border-t border-gray-200">
            <button
              onClick={createSupportTicket}
              className="w-full text-indigo-600 hover:text-indigo-800 text-sm p-2 text-center transition-colors"
            >
              Need more help? Create a support ticket
            </button>
          </div>

          {/* Input area */}
          <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-3 bg-white rounded-b-lg flex items-center">
            <input
              type="text"
              ref={inputRef}
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget; 