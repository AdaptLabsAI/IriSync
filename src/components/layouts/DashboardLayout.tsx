'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Avatar,
  Stack,
  Divider,
  Menu,
  MenuItem,
  Button,
  AppBar,
  Toolbar,
  useTheme,
  SvgIcon,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { TeamSwitcher } from '@/components/ui/TeamSwitcher';
import { useTeam } from '@/context/TeamContext';
import {  MdHealthAndSafety, MdLock, MdOutlineAnalytics, MdOutlineWindow } from 'react-icons/md';
// Interface for sidebar item
interface NavItemProps {
  name: string;
  icon: React.ElementType;
  path: string;
  isActive?: boolean;
  children?: React.ReactNode;
  lockIcon?: boolean; 
}

// Navigation items
import { ReactElement } from 'react';
import { MdWindow, MdArticle, MdCalendarToday, MdAnalytics, MdBuild, MdPeople, MdStorage, MdSettings, MdHelpOutline, MdHome } from 'react-icons/md';
import { TiMessages } from 'react-icons/ti';
import { BsMagic } from 'react-icons/bs';
import { TbUsersGroup, TbEar } from "react-icons/tb";
import { RiComputerLine } from "react-icons/ri";
import { CiSettings } from "react-icons/ci";
import { HiOutlineCalendar } from "react-icons/hi";

// Navigation items matching Figma design and Hootsuite-style dashboard
const baseNavItems: Array<Omit<NavItemProps, 'isActive' | 'children'>> = [
  {
    name: 'Dashboard',
    icon: MdHome,
    path: '/dashboard'
  },
  {
    name: 'Planner',
    icon: HiOutlineCalendar,
    path: '/dashboard/planner'
  },
  {
    name: 'Inbox',
    icon: TiMessages,
    path: '/dashboard/inbox'
  },
  {
    name: 'Analytics',
    icon: MdOutlineAnalytics,
    path: '/dashboard/analytics'
  },
  {
    name: 'AI Toolkit',
    icon: BsMagic,
    path: '/dashboard/ai'
  },
  {
    name: 'System Health',
    icon: MdHealthAndSafety,
    path: '/dashboard/system-health'
  },
  {
    name: 'Settings',
    icon: CiSettings,
    path: '/dashboard/settings'
  },
];


// Admin item to show for admin users
const adminNavItem: Omit<NavItemProps, 'isActive' | 'children'> = {
  name: 'Admin',
  icon: AdminPanelSettingsIcon,
  path: '/admin/dashboard'
};

const drawerWidth = 220;
const collapsedWidth = 72; // Width when collapsed

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' && prop !== 'sidebarCollapsed' })<{
  open?: boolean;
  sidebarCollapsed?: boolean;
}>(({ theme, open, sidebarCollapsed }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
  [theme.breakpoints.up('md')]: {
    marginLeft: 0,
    width: sidebarCollapsed 
      ? `calc(100% - ${collapsedWidth}px)` 
      : `calc(100% - ${drawerWidth}px)`,
  },
}));

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const theme = useTheme();
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            bgcolor: 'background.paper'
          },
        }}
      >
        <SidebarContent onClose={handleDrawerToggle} collapsed={false} onToggleCollapse={() => {}} />
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: sidebarCollapsed ? collapsedWidth : drawerWidth,
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden'
          },
        }}
        open
      >
        <SidebarContent onClose={() => {}} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </Drawer>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { 
            xs: '100%',
            md: sidebarCollapsed 
              ? `calc(100% - ${collapsedWidth}px)` 
              : `calc(100% - ${drawerWidth}px)` 
          },
          ml: { 
            xs: 0,
            md: sidebarCollapsed ? `${collapsedWidth}px` : `${drawerWidth}px` 
          },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Header */}
        <AppBar
          position="fixed"
          color="default"
          elevation={0}
          sx={{
            width: { 
              xs: '100%',
              md: sidebarCollapsed 
                ? `calc(100% - ${collapsedWidth}px)` 
                : `calc(100% - ${drawerWidth}px)` 
            },
            ml: { 
              xs: 0,
              md: sidebarCollapsed ? `${collapsedWidth}px` : `${drawerWidth}px` 
            },
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <SvgIcon component={HamburgerIcon} />
            </IconButton>
            
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ display: { xs: 'flex', md: 'none' }, fontWeight: 'bold' }}
            >
              IriSync
            </Typography>
            
            <AccountMenu />
          </Toolbar>
        </AppBar>
        
        {/* Add toolbar spacing */}
        <Toolbar />
        
        {/* Page content */}
        <Box>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

interface SidebarProps {
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const SidebarContent = ({ onClose, collapsed, onToggleCollapse }: SidebarProps) => {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Get team context
  const { 
    currentTeamId, 
    currentOrganizationId, 
    switchTeam, 
    switching 
  } = useTeam();

  // Check if user is admin or super_admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (currentUser && firestore) {
          const userRef = doc(firestore, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const role = userData.role || 'user';
            setIsAdmin(role === 'admin' || role === 'super_admin');
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, []);
  
  // Handle team switching
  const handleTeamChange = async (team: { id: string; name: string; organizationId: string }) => {
    try {
      await switchTeam(team.id);
    } catch (error) {
      console.error('Error switching team:', error);
    }
  };
 
  // Create navigation items including admin link if user is admin
  const sidebarItems = isAdmin 
    ? [...baseNavItems, adminNavItem]
    : baseNavItems;
  
  return (
    <>
    <div className="h-screen "  style={{
    background: '#131A13',
  }}>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: collapsed ? 'center' : 'space-between', 
        px: collapsed ? 1 : [1, 2],
        minHeight: 64 
      }}>
        {!collapsed && (
          <Link href="/dashboard" passHref style={{ textDecoration: 'none' }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
              IriSync
            </Typography>
          </Link>
        )}
        
        {collapsed && (
          <Tooltip title="IriSync">
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: 20 }}
            >
              I
            </Typography>
          </Tooltip>
        )}
        
        <Box sx={{ display: 'flex' }}>
          {/* Toggle sidebar button - displayed on larger screens */}
          <IconButton
            onClick={onToggleCollapse}
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            <SvgIcon component={collapsed ? MenuRightIcon : MenuLeftIcon} fontSize="small" />
          </IconButton>
          
          {/* Close button for mobile */}
          <IconButton
            onClick={onClose}
            sx={{ display: { xs: 'flex', md: 'none',color:"white" } }}
          >
            <SvgIcon component={CloseIcon} />
          </IconButton>
        </Box>
      </Toolbar>
      
      <Divider />
      
      {/* Team Switcher */}
      <Box sx={{ px: collapsed ? 1 : 2, py: 1 }}>
        {currentOrganizationId && (
          <TeamSwitcher 
            className={collapsed ? "w-full" : "w-full"}
            currentTeamId={currentTeamId || undefined}
            currentOrganizationId={currentOrganizationId}
            onTeamChange={handleTeamChange}
          />
        )}
      </Box>
      
      <Divider />
      
  <List className="text-gray-400 text-[20px]">
  {sidebarItems.map((item) => {
    const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/ && 
                   pathname !== '/dashboard');  `);

    return (
      <NavItem 
        key={item.name} 
        icon={item.icon} 
        path={item.path} 
        isActive={isActive}
        name={item.name}
        collapsed={collapsed}
        lockIcon={item.lockIcon} 
        
      >
        {item.name}
      </NavItem>
      
    );
  })}
</List>
<Box
  sx={{
    position: 'absolute',
    bottom: 0,
    width: '100%',
    px: collapsed ? 1 : 2,
    py: 2,
    backgroundColor: 'transparent'
  }}
>
  <Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
    <Box
      display="flex"
      alignItems="center"
      justifyContent={collapsed ? 'center' : 'space-between'}
      sx={{
        backgroundColor: '',
        px: 1.5,
        py: 1.5,
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          backgroundColor: '#3a3a3a'
        }
      }}
    >
      <Avatar
        sx={{ width:40, height: 40 }}
        src="https://randomuser.me/api/portraits/women/44.jpg" 
      />
      {!collapsed && (
        <Box ml={2}>
          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
            Sophia Adam
          </Typography>
          <Typography variant="caption" sx={{ color: '#99a1af' }}>
            Black Rust Corp.
          </Typography>
        </Box>
      )}
    </Box>
  </Link>
</Box>

      </div>
    </>
  );
};

interface NavItemComponentProps {
  icon: React.ElementType;
  path: string;
  isActive?: boolean;
  name: string;
  children: React.ReactNode;
  collapsed?: boolean;
  lockIcon?: boolean;
}

const NavItem = ({ icon, path, isActive, name, children, collapsed, lockIcon }: NavItemComponentProps) => {
  const router = useRouter();

  const handleNavigation = () => {
    router.push(path);
  };

  return (
    <ListItem disablePadding sx={{ display: 'block', mb: 0.7 }}>
      <Tooltip title={collapsed ? name : ''} placement="right">
        <ListItemButton
          onClick={handleNavigation}
          selected={isActive}
          sx={{
            minHeight: 48,
            justifyContent: collapsed ? 'center' : 'initial',
            px: 2.5,
            mx: 1,
            borderRadius: '12px',
            position: 'relative',
            overflow: 'hidden',
            bgcolor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: isActive ? 'white' : 'inherit',
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.08)',
            },
            '&::before': isActive
              ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '8%',
                  bottom: '8%',
                  width: '6px',
                  borderRadius: '6px',
                  background: 'linear-gradient(180deg, #00FF66, #00CC44)',
                  boxShadow: '0 0 10px #00FF66, 0 0 20px #00FF66',
                }
              : {},
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: collapsed ? 0 : 2,
              justifyContent: 'center',
              backgroundColor: 'transparent',
              color: 'inherit',
              '& .MuiSvgIcon-root': {
                color: 'inherit',
              },
            }}
          >
            <SvgIcon component={icon} fontSize="small" />
          </ListItemIcon>

          {!collapsed && (
            <>
              <ListItemText
                primary={children}
                primaryTypographyProps={{ fontSize: '14px', fontWeight: 500 }}
                sx={{ opacity: collapsed ? 0 : 1 }}
              />
              {/* Lock icon appears after text */}
              {lockIcon && (
                <Box sx={{ ml: 1 }}>
                  <SvgIcon
                    component={MdLock}
                    fontSize="small"
                    sx={{
                      fontSize: '0.9rem',
                      color: 'grey.400',
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </ListItemButton>
      </Tooltip>
    </ListItem>

  );
};


// Menu Right Icon (expand sidebar)
function MenuRightIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// Menu Left Icon (collapse sidebar)
function MenuLeftIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      color='white'
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const AccountMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const [userData, setUserData] = useState<any>({
    displayName: '',
    email: '',
    photoURL: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          // Start with Firebase Auth data
          let displayName = currentUser.displayName || '';
          let email = currentUser.email || '';
          let photoURL = currentUser.photoURL || '';

          // Try to get additional data from Firestore
          if (firestore) {
            try {
              const userRef = doc(firestore, 'users', currentUser.uid);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                const userData = userSnap.data();
                // If Firestore has a name, use it instead
                displayName = userData.name || 
                             `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                             displayName;
                
                // Use Firestore email if available
                email = userData.email || email;
                
                // Use Firestore photo if available
                photoURL = userData.photoURL || userData.image || photoURL;
              }
            } catch (firestoreError) {
              console.error('Error fetching user data from Firestore:', firestoreError);
              // Continue with auth data if Firestore fails
            }
          }

          setUserData({
            displayName: displayName || email.split('@')[0],
            email,
            photoURL
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      // Clear both Firebase auth and session cookie
      const auth = getAuth();
      await signOut(auth);
      console.log('Firebase signed out');
      
      // Use the unrestricted logout endpoint
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (res.ok) {
        console.log('Server-side logout successful');
        
        // Force a full page refresh to clear all state
        window.location.href = '/';
      } else {
        console.error('Server-side logout failed, forcing navigation');
        // Even on failure, try to navigate away
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation anyway on error
      window.location.href = '/';
    }
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          p: 1,
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
        onClick={handleMenu}
      >
        <Avatar
          sx={{ width: 32, height: 32, mr: 1 }}
          src={userData.photoURL}
        >
          {userData.displayName ? userData.displayName[0].toUpperCase() : ''}
        </Avatar>
        <Typography variant="body2" noWrap>
          {loading ? 'Loading...' : (userData.displayName || 'User')}
        </Typography>
      </Box>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {userData.displayName || 'User'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {userData.email || ''}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => {
          handleClose();
          router.push('/dashboard/settings/profile');
        }}>
          Profile Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          Sign Out
        </MenuItem>
      </Menu>
    </>
  );
};

// Simple icons for the sidebar
// function HomeIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
//   return (
//     <svg
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//       {...props}
//     >
//       <path
//         d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
//         stroke="currentColor"
//         strokeWidth="2"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M9 22V12H15V22"
//         stroke="currentColor"
//         strokeWidth="2"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }

// function ContentIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
//   return (
//     <svg
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       {...props}
//     >
//       <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
//       <polyline points="14 2 14 8 20 8"></polyline>
//       <line x1="16" y1="13" x2="8" y2="13"></line>
//       <line x1="16" y1="17" x2="8" y2="17"></line>
//       <polyline points="10 9 9 9 8 9"></polyline>
//     </svg>
//   );
// }

// function CalendarIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
//   return (
//     <svg
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       {...props}
//     >
//       <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
//       <line x1="16" y1="2" x2="16" y2="6"></line>
//       <line x1="8" y1="2" x2="8" y2="6"></line>
//       <line x1="3" y1="10" x2="21" y2="10"></line>
//     </svg>
//   );
// }

// function AnalyticsIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
//   return (
//     <svg
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       {...props}
//     >
//       <line x1="18" y1="20" x2="18" y2="10"></line>
//       <line x1="12" y1="20" x2="12" y2="4"></line>
//       <line x1="6" y1="20" x2="6" y2="14"></line>
//     </svg>
//   );
// }

// function AIToolsIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
//   return (
//     <svg
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       {...props}
//     >
//       <path d="M12 2a9 9 0 0 1 9 9c0 3.22-1.5 6.47-4 8.5M12 2a9 9 0 0 0-9 9c0 3.22 1.5 6.47 4 8.5"></path>
//       <polygon points="12 2 15.5 9 9 15.5 9 19.5 12 22 15 19.5 15 15.5 21 12 12 2"></polygon>
//     </svg>
//   );
// }

// function SettingsIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
//   return (
//     <svg
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       {...props}
//     >
//       <circle cx="12" cy="12" r="3"></circle>
//       <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
//     </svg>
//   );
// }

function HamburgerIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

// function CRMIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
//   return (
//     <svg
//       fill="currentColor"
//       viewBox="0 0 24 24"
//       width="24px"
//       height="24px"
//       {...props}
//     >
//       <path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
//     </svg>
//   );
// }

function StorageIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      width="24px"
      height="24px"
      {...props}
    >
      <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6zm0 2c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
    </svg>
  );
}
