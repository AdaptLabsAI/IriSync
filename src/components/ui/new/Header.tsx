// import React from 'react';
// import Link from 'next/link';
// import { Container } from './Container';
// import { Button } from './Button';
// import { cn } from '@/lib/utils';

// interface HeaderProps {
//   transparent?: boolean;
//   className?: string;
// }

// export const Header: React.FC<HeaderProps> = ({ transparent = false, className }) => {
//   return (
//     <header className={cn(
//       'w-full z-50',
//       transparent ? 'bg-transparent' : 'bg-gray-50',
//       className
//     )}>
//       <Container>
//         <div className="flex items-center justify-between h-20">
//           {/* Logo */}
//           <Link href="/" className="flex items-center space-x-2">
//             <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-sm">
//               <div className="relative w-10 h-10">
//                 {/* IriSync Logo - simplified version */}
//                 <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-900 rounded-lg"></div>
//                 <div className="absolute top-1 left-1 w-3 h-2 bg-white rounded-sm"></div>
//                 <div className="absolute top-2 right-1 w-2 h-3 bg-white rounded-sm"></div>
//                 <div className="absolute bottom-1 left-2 w-4 h-1 bg-white rounded-sm"></div>
//               </div>
//             </div>
//             <span className="text-2xl font-bold text-gray-900">IriSync</span>
//           </Link>

//           {/* Navigation */}
//           <nav className="hidden md:flex items-center space-x-20">
//             <Link 
//               href="/" 
//               className="text-lg font-medium text-gray-900 hover:text-green-600 transition-colors"
//             >
//               Home
//             </Link>
//             <Link 
//               href="/features-pricing" 
//               className="text-lg font-normal text-gray-500 hover:text-green-600 transition-colors"
//             >
//               Features
//             </Link>
//             <Link 
//               href="/integrations" 
//               className="text-lg font-normal text-gray-500 hover:text-green-600 transition-colors"
//             >
//               Integrations
//             </Link>
//             <Link 
//               href="/features-pricing" 
//               className="text-lg font-normal text-gray-500 hover:text-green-600 transition-colors"
//             >
//               Pricing
//             </Link>
//             <Link 
//               href="/careers" 
//               className="text-lg font-normal text-gray-500 hover:text-green-600 transition-colors"
//             >
//               Careers
//             </Link>
//             <Link 
//               href="/blog" 
//               className="text-lg font-normal text-gray-500 hover:text-green-600 transition-colors"
//             >
//               Blog
//             </Link>
//           </nav>

//           {/* Login Button */}
//           <div className="flex items-center">
//             <Link href="/login">
//               <Button>
//                 Log in
//               </Button>
//             </Link>
//           </div>

//           {/* Mobile menu button */}
//           <button className="md:hidden p-2">
//             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
//             </svg>
//           </button>
//         </div>
//       </Container>
//     </header>
//   );
// }; 