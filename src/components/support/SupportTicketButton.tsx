import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { 
  LifeBuoy, 
  Plus, 
  MessageSquare,
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Loader2,
  ChevronDown,
  PaperclipIcon,
  Send
} from 'lucide-react';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  category: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  content: string;
  sender: 'user' | 'support';
  createdAt: Date;
  attachments?: { name: string; url: string }[];
}

export interface SupportTicketButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * List of support tickets
   */
  tickets?: SupportTicket[];
  /**
   * Callback for creating a new ticket
   */
  onCreateTicket?: (ticket: { title: string; description: string; priority: TicketPriority; category: string }) => Promise<SupportTicket>;
  /**
   * Callback for sending a message to a ticket
   */
  onSendMessage?: (ticketId: string, content: string, attachments?: File[]) => Promise<TicketMessage>;
  /**
   * Callback for closing a ticket
   */
  onCloseTicket?: (ticketId: string) => Promise<void>;
  /**
   * Callback for reopening a ticket
   */
  onReopenTicket?: (ticketId: string) => Promise<void>;
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
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * SupportTicketButton - A component for creating and managing support tickets.
 * This component allows users to submit support tickets and track their status.
 */
const SupportTicketButton: React.FC<SupportTicketButtonProps> = ({
  tickets = [],
  onCreateTicket,
  onSendMessage,
  onCloseTicket,
  onReopenTicket,
  isDisabled = false,
  iconOnly = false,
  size = 'sm',
  variant = 'outline',
  className = '',
  ...buttonProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [localTickets, setLocalTickets] = useState<SupportTicket[]>([...tickets]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState('');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    category: 'general'
  });
  const { toast } = useToast();
  
  React.useEffect(() => {
    setLocalTickets([...tickets]);
  }, [tickets]);
  
  const handleOpenDialog = () => {
    setIsOpen(true);
  };
  
  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'waiting': return <Clock className="h-4 w-4 text-purple-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-[#00CC44]" />;
      case 'closed': return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getStatusText = (status: TicketStatus) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'waiting': return 'Waiting on You';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
    }
  };
  
  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'waiting': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-[#00FF6A]/10 text-[#00CC44]';
      case 'closed': return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-[#00FF6A]/10 text-[#00CC44]';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };
  
  const handleCreateTicket = async () => {
    if (!onCreateTicket) return;
    
    if (!newTicket.title.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a title for your ticket",
        variant: "destructive"
      });
      return;
    }
    
    if (!newTicket.description.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a description for your ticket",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const ticket = await onCreateTicket(newTicket);
      
      setLocalTickets(prev => [ticket, ...prev]);
      
      toast({
        title: "Ticket created",
        description: "Your support ticket has been created successfully."
      });
      
      // Reset form and go back to tickets view
      setNewTicket({
        title: '',
        description: '',
        priority: 'medium',
        category: 'general'
      });
      setIsCreating(false);
    } catch (err) {
      console.error('Error creating support ticket:', err);
      toast({
        title: "Failed to create ticket",
        description: "An error occurred while creating your support ticket. Please try again.",
        variant: "destructive"
      });
      setIsCreating(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!onSendMessage || !selectedTicket || !message.trim()) return;
    
    setIsSending(true);
    
    try {
      const newMessage = await onSendMessage(selectedTicket.id, message);
      
      // Update the local ticket with the new message
      setLocalTickets(prev => 
        prev.map(ticket => 
          ticket.id === selectedTicket.id 
            ? { ...ticket, messages: [...ticket.messages, newMessage] } 
            : ticket
        )
      );
      
      // Update selected ticket
      setSelectedTicket(prev => 
        prev ? { ...prev, messages: [...prev.messages, newMessage] } : null
      );
      
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: "Failed to send message",
        description: "An error occurred while sending your message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleCloseTicket = async (ticketId: string) => {
    if (!onCloseTicket) return;
    
    try {
      await onCloseTicket(ticketId);
      
      // Update local state
      setLocalTickets(prev => 
        prev.map(ticket => 
          ticket.id === ticketId ? { ...ticket, status: 'closed' } : ticket
        )
      );
      
      // Update selected ticket if it's the one being closed
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: 'closed' } : null);
      }
      
      toast({
        title: "Ticket closed",
        description: "The support ticket has been closed."
      });
    } catch (err) {
      console.error('Error closing ticket:', err);
      toast({
        title: "Failed to close ticket",
        description: "An error occurred while closing the ticket. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleReopenTicket = async (ticketId: string) => {
    if (!onReopenTicket) return;
    
    try {
      await onReopenTicket(ticketId);
      
      // Update local state
      setLocalTickets(prev => 
        prev.map(ticket => 
          ticket.id === ticketId ? { ...ticket, status: 'open' } : ticket
        )
      );
      
      // Update selected ticket if it's the one being reopened
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: 'open' } : null);
      }
      
      toast({
        title: "Ticket reopened",
        description: "The support ticket has been reopened."
      });
    } catch (err) {
      console.error('Error reopening ticket:', err);
      toast({
        title: "Failed to reopen ticket",
        description: "An error occurred while reopening the ticket. Please try again.",
        variant: "destructive"
      });
    }
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
        <LifeBuoy className="h-4 w-4 mr-2" />
        {!iconOnly && "Support"}
      </Button>
      
      <Dialog
        open={isOpen}
        onOpenChange={(open: any) => {
          setIsOpen(open);
          if (!open) {
            setSelectedTicket(null);
            setIsCreating(false);
            setMessage('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <LifeBuoy className="h-5 w-5 text-blue-500 mr-2" />
              {selectedTicket ? 'Ticket: ' + selectedTicket.title : isCreating ? 'Create Support Ticket' : 'Support Tickets'}
            </DialogTitle>
            <DialogDescription>
              {selectedTicket ? 
                'View and reply to your support ticket.' : 
                isCreating ? 
                  'Submit a new support ticket to get help from our team.' : 
                  'Manage your support tickets and get help from our team.'}
            </DialogDescription>
          </DialogHeader>
          
          {/* List view */}
          {!selectedTicket && !isCreating && (
            <div className="py-4 space-y-6">
              <div className="flex justify-end">
                <Button
                  onClick={() => setIsCreating(true)}
                  className="space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Ticket</span>
                </Button>
              </div>
              
              {localTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <LifeBuoy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No support tickets</p>
                  <p className="text-xs mt-1">Create your first support ticket to get help from our team.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localTickets.map(ticket => (
                    <div 
                      key={ticket.id}
                      className="border rounded-md p-4 hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex justify-between">
                        <h3 className="text-sm font-medium">{ticket.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                          {getStatusText(ticket.status)}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500 flex items-center space-x-3">
                        <span>#{ticket.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </span>
                        <span>{formatDate(ticket.createdAt)}</span>
                      </div>
                      
                      <p className="mt-2 text-sm text-gray-600 line-clamp-1">
                        {ticket.description}
                      </p>
                      
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        <span>{ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}</span>
                        {ticket.messages.length > 0 && (
                          <span className="ml-2 text-gray-400">
                            Last update: {formatDate(ticket.messages[ticket.messages.length - 1].createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Create ticket form */}
          {isCreating && (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Brief summary of your issue"
                  value={newTicket.title}
                  onChange={(e: any) => setNewTicket({ ...newTicket, title: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={newTicket.category}
                  onChange={(e: any) => setNewTicket({ ...newTicket, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                  <option value="account">Account</option>
                  <option value="feature">Feature Request</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={newTicket.priority}
                  onChange={(e: any) => setNewTicket({ ...newTicket, priority: e.target.value as TicketPriority })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md min-h-[120px]"
                  placeholder="Please provide details about your issue"
                  value={newTicket.description}
                  onChange={(e: any) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>Submit Ticket</>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {/* Ticket detail view */}
          {selectedTicket && (
            <div className="py-4 space-y-4">
              <div className="flex justify-between">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-sm text-blue-600 hover:underline flex items-center"
                >
                  ← Back to tickets
                </button>
                
                <div className="flex items-center space-x-2">
                  {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReopenTicket(selectedTicket.id)}
                    >
                      Reopen Ticket
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCloseTicket(selectedTicket.id)}
                    >
                      Close Ticket
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="border p-4 rounded-md">
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-base font-medium">{selectedTicket.title}</h3>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(selectedTicket.status)}`}>
                        {getStatusText(selectedTicket.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 flex items-center space-x-3">
                      <span>#{selectedTicket.id.slice(0, 8)}</span>
                      <span className={`px-2 py-0.5 rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
                      </span>
                      <span>Created: {formatDate(selectedTicket.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-sm border-t pt-3">
                  <p>{selectedTicket.description}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Conversation</h3>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto p-1">
                  {selectedTicket.messages.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Start the conversation by sending a message.</p>
                    </div>
                  ) : (
                    selectedTicket.messages.map(msg => (
                      <div 
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.sender === 'user' 
                            ? 'bg-blue-50 ml-4' 
                            : 'bg-gray-50 mr-4'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-medium">
                            {msg.sender === 'user' ? 'You' : 'Support Agent'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{msg.content}</p>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.attachments.map((attachment, i) => (
                              <a
                                key={i}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center bg-white px-2 py-1 rounded border"
                              >
                                <PaperclipIcon className="h-3 w-3 mr-1" />
                                {attachment.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">Reply</label>
                  <div className="flex">
                    <textarea
                      className="flex-1 px-3 py-2 border rounded-l-md min-h-[80px]"
                      placeholder="Type your message here..."
                      value={message}
                      onChange={(e: any) => setMessage(e.target.value)}
                      disabled={selectedTicket.status === 'closed'}
                    />
                    <Button
                      className="rounded-l-none"
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isSending || selectedTicket.status === 'closed'}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {selectedTicket.status === 'closed' && (
                    <p className="text-xs text-red-500 mt-1">
                      This ticket is closed. Reopen it to continue the conversation.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SupportTicketButton; 