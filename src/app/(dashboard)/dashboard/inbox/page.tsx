"use client";

import { useState } from "react";
import {
  Avatar,
  IconButton,
  Chip,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Drawer,
} from "@mui/material";
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  ViewList as ViewListIcon,
} from "@mui/icons-material";
import { Archive, ListTodo, User, Lock, Pencil } from "lucide-react";
import { Edit, Trash2 } from "lucide-react";
import { firestore } from "@/lib/core/firebase/client";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { useEffect } from "react";

// Interfaces
interface Contact {
  id: string;
  name: string;
  message: string;
  time: string;
  avatar: string;
  isOnline?: boolean;
  unreadCount?: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

interface Message {
  id: string;
  text: string;
  time: string;
  sender: "user" | "contact";
}

// Sample data
const contacts: Contact[] = [
  {
    id: "1",
    name: "Marvin McKinney",
    message: "Typing...",
    time: "02:15 PM",
    avatar: "/images/profile3.png",
    isOnline: true,
  },
  // ... other contacts
];
const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Mike Anderson",
    role: "Manager",
    avatar: "/images/profile3.png",
  },
  
  // ...
  //  other team members
];

const messages: Message[] = [
  {
    id: "1",
    text: "Typing...",
    time: "03:45 pm",
    sender: "contact",
  },
  // ... other messages
];

export default function MessagingApp() {
  const [activeTab, setActiveTab] = useState("All");
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [messageText, setMessageText] = useState("");
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!selectedContact) return;
    const q = query(
      collection(firestore, "conversations", selectedContact.id, "messages"),
      orderBy("time", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[]
      );
    });
    return () => unsubscribe();
  }, [selectedContact]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      await addDoc(
        collection(firestore, "conversations", selectedContact.id, "messages"),
        {
          text: messageText,
          sender: "user", // Replace with actual user if available
          time: serverTimestamp(),
        }
      );
      setMessageText(""); // Clear input
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const tabs = ["All", "Unread", "Assigned", "Mentions"];

  const toggleLeftSidebar = () => {
    setIsLeftSidebarOpen(!isLeftSidebarOpen);
  };

  const toggleRightSidebar = () => {
    setIsRightSidebarOpen(!isRightSidebarOpen);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Hamburger Menu for Mobile */}
      <div className="md:hidden p-4 bg-white border-b border-gray-200">
        <button onClick={toggleLeftSidebar} className="text-gray-600">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Left Sidebar (Drawer on Mobile) */}
      <Drawer
        anchor="left"
        open={isLeftSidebarOpen}
        onClose={toggleLeftSidebar}
        className="md:hidden"
      >
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
              <div className="inline-flex items-center bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 text-red-800 text-sm font-medium">
                <span className="mr-2">Channels</span>
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  14
                </span>
              </div>
            </div>
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setIsLeftSidebarOpen(false);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    activeTab === tab
                      ? "bg-green-100 text-green-800"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-2">
            <div className="flex space-x-2">
              <button className="flex-1 flex flex-col items-center justify-center text-gray-800 border border-gray-200 h-20 rounded-md hover:bg-gray-50 transition">
                <Pencil className="w-6 h-6" />
                <span className="text-sm">Start Conversation</span>
              </button>
              <button className="flex-1 flex flex-col items-center justify-center text-gray-800 border border-gray-200 h-20 rounded-md hover:bg-gray-50 transition">
                <Archive className="w-6 h-6" />
                <span className="text-sm">Archived Chats</span>
              </button>
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => {
                  setSelectedContact(contact);
                  setIsLeftSidebarOpen(false);
                }}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedContact.id === contact.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar src={contact.avatar} className="w-10 h-10" />
                    {contact.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.name}
                      </p>
                      <p className="text-xs text-gray-500">{contact.time}</p>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {contact.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Drawer>

      {/* Left Sidebar (Visible on Desktop) */}
      <div className="hidden md:block md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
            <div className="inline-flex items-center bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 text-red-800 text-sm font-medium">
              <span className="mr-2">Channels</span>
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                14
              </span>
            </div>
          </div>
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  activeTab === tab
                    ? "bg-green-100 text-green-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-2">
          <div className="flex space-x-2">
            <button className="flex-1 flex flex-col items-center justify-center text-gray-800 border border-gray-200 h-20 rounded-md hover:bg-gray-50 transition">
              <Pencil className="w-6 h-6" />
              <span className="text-sm">Start Conversation</span>
            </button>
            <button className="flex-1 flex flex-col items-center justify-center text-gray-800 border border-gray-200 h-20 rounded-md hover:bg-gray-50 transition">
              <Archive className="w-6 h-6" />
              <span className="text-sm">Archived Chats</span>
            </button>
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedContact.id === contact.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar src={contact.avatar} className="w-10 h-10" />
                  {contact.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-gray-500">{contact.time}</p>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {contact.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar src={selectedContact.avatar} className="w-10 h-10" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedContact.name}
              </h2>
              <p className="text-sm text-green-600">Active 3 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Chip label="Customer" className="bg-gray-100 text-gray-600" />
            <button onClick={toggleRightSidebar} className="md:hidden text-gray-600">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] sm:max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === "user"
                    ? "bg-green-100 text-gray-900"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs text-gray-500 mt-1">{message.time && (typeof message.time === 'string' ? message.time : (message.time.toDate ? message.time.toDate().toLocaleTimeString() : ''))}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <TextField
              fullWidth
              placeholder="Type your message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton size="small">
                      <EmojiIcon className="text-gray-400" />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small">
                      <AttachFileIcon className="text-gray-400" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              className="rounded-full"
            />
            <IconButton
              className="bg-green-600 text-white hover:bg-green-700"
              size="small"
              onClick={sendMessage}
            >
              <SendIcon  />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Right Sidebar (Drawer on Mobile) */}
      <Drawer
        anchor="right"
        open={isRightSidebarOpen}
        onClose={toggleRightSidebar}
        className="md:hidden"
      >
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
          {/* Team Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Team Black Rust Corp.
                </h2>
                <p className="text-sm text-gray-600">Customer</p>
              </div>
              <div className="flex space-x-2">
                <IconButton size="small">
                  <AddIcon className="text-gray-400" />
                </IconButton>
                <IconButton size="small">
                  <ViewListIcon className="text-gray-400" />
                </IconButton>
              </div>
            </div>
            <div className="flex justify-center space-x-2">
              <button className="w-28 flex flex-col items-center justify-center border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition py-2">
                <User className="w-5 h-5 mb-1" />
                <span>Add Members</span>
              </button>
              <button className="w-28 flex flex-col items-center justify-center border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition py-2">
                <ListTodo className="w-5 h-5 mb-1" />
                <span>View All</span>
              </button>
            </div>
          </div>

          {/* Team Members */}
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar src={member.avatar} className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-600">{member.role}</p>
                    </div>
                  </div>
                  <IconButton size="small">
                    <MoreVertIcon className="text-gray-400" />
                  </IconButton>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div className="p-4 border-b border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
              <button className="text-gray-600 text-sm hover:underline transition">
                View All
              </button>
            </div>
            <Card className="bg-green-50 border border-gray-300">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">
                    by Sam Houghton
                  </p>
                  <div className="flex space-x-1">
                    <button className="p-1 rounded hover:bg-blue-100 transition">
                      <Edit className="text-blue-400 w-4 h-4" />
                    </button>
                    <button className="p-1 rounded hover:bg-red-100 transition">
                      <Trash2 className="text-red-400 w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been the industry's
                  standard dummy text ever since the 1500s.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sentiment Analysis */}
          <div className="p-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sentiment Analysis
            </h3>
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <div className="w-24 h-24 mx-auto mb-4 relative">
                <div className="w-full h-full rounded-full bg-green-200 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-300 flex items-center justify-center">
                    <span className="text-2xl">
                      <Lock className="text-white text-lg opacity-50" />
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Positive sentiment detected
              </p>
            </div>
          </div>

          {/* Upgrade Button */}
          <div className="p-4 border-t border-gray-200">
            <button className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-md font-medium transition hover:opacity-90 bg-gradient-to-r from-[#00C853] to-[#003305]">
              <span className="text-lg">👑</span>
              Upgrade to Influencer+
            </button>
          </div>
        </div>
      </Drawer>

      {/* Right Sidebar (Visible on Desktop) */}
      <div className="hidden md:block md:w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col">
        {/* Team Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Team Black Rust Corp.
              </h2>
              <p className="text-sm text-gray-600">Customer</p>
            </div>
            <div className="flex space-x-2">
              <IconButton size="small">
                <AddIcon className="text-gray-400" />
              </IconButton>
              <IconButton size="small">
                <ViewListIcon className="text-gray-400" />
              </IconButton>
            </div>
          </div>
          <div className="flex justify-center space-x-2">
            <button className="w-36 flex flex-col items-center justify-center border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition py-2">
              <User className="w-5 h-5 mb-1" />
              <span>Add Members</span>
            </button>
            <button className="w-36 flex flex-col items-center justify-center border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition py-2">
              <ListTodo className="w-5 h-5 mb-1" />
              <span>View All</span>
            </button>
          </div>
        </div>

        {/* Team Members */}
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Avatar src={member.avatar} className="w-8 h-8" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-600">{member.role}</p>
                  </div>
                </div>
                <IconButton size="small">
                  <MoreVertIcon className="text-gray-400" />
                </IconButton>
              </div>
            ))}
          </div>
        </div>

        {/* Notes Section */}
        <div className="p-4 border-b border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
            <button className="text-gray-600 text-sm hover:underline transition">
              View All
            </button>
          </div>
          <Card className="bg-green-50 border border-gray-300">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">
                  by Sam Houghton
                </p>
                <div className="flex space-x-1">
                  <button className="p-1 rounded hover:bg-blue-100 transition">
                    <Edit className="text-blue-400 w-4 h-4" />
                  </button>
                  <button className="p-1 rounded hover:bg-red-100 transition">
                    <Trash2 className="text-red-400 w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Lorem Ipsum is simply dummy text of the printing and
                typesetting industry. Lorem Ipsum has been the industry's
                standard dummy text ever since the 1500s.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Analysis */}
        <div className="p-4 flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sentiment Analysis
          </h3>
          <div className="bg-green-50 rounded-lg p-6 text-center">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <div className="w-full h-full rounded-full bg-green-200 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-300 flex items-center justify-center">
                  <span className="text-2xl">
                    <Lock className="text-white text-lg opacity-50" />
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Positive sentiment detected
            </p>
          </div>
        </div>

        {/* Upgrade Button */}
        <div className="p-4 border-t border-gray-200">
          <button className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-md font-medium transition hover:opacity-90 bg-gradient-to-r from-[#00C853] to-[#003305]">
            <span className="text-lg">👑</span>
            Upgrade to Influencer+
          </button>
        </div>
      </div>
    </div>
  );
}