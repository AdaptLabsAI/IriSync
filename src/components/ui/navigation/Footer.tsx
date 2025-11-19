import Link from "next/link"
import { Github, Linkedin, Youtube } from "lucide-react"

export default function Component() {
  return (
<footer className="w-full bg-gradient-to-b from-white via-[#00FF6A]/5 to-[#00FF6A]/10 px-6 py-12">
      <div className="container mx-auto max-w-7xl">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Navigation Columns */}
          <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Products Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg">Products</h3>
              <nav className="flex flex-col space-y-3">
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Features
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Pricing
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Integrations
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Changelog
                </Link>
              </nav>
            </div>

            {/* Resources Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg">Resources</h3>
              <nav className="flex flex-col space-y-3">
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Documentation
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Tutorials
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Blog
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  FAQs
                </Link>
              </nav>
            </div>

            {/* Company Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg">Company</h3>
              <nav className="flex flex-col space-y-3">
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  About
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Career
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Contact
                </Link>
                <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Partners
                </Link>
              </nav>
            </div>
          </div>

   
          <div className="md:col-span-4 space-y-4">
            <p className="text-gray-600 text-sm leading-relaxed">
              Iris AI helps businesses leverage artificial intelligence to automate workflows, analyze data, and enhance
              user experiences with cutting-edge technology.
            </p>
          </div>

          {/* Social Media Icons */}
          <div className="md:col-span-2 flex md:flex-col flex-row md:items-end items-center gap-4">
            <Link
              href="#"
              className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
              aria-label="X (Twitter)"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Link>
            <Link
              href="#"
              className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5 text-white" />
            </Link>
            <Link
              href="#"
              className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
              aria-label="YouTube"
            >
              <Youtube className="w-5 h-5 text-white" />
            </Link>
            <Link
              href="#"
              className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5 text-white" />
            </Link>
          </div>
        </div>


        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-black tracking-tight">irisync</h1>
        </div>

    
        <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-gray-200/50 ">
          <p className="text-gray-500 text-sm mb-4 sm:mb-0">© 2025 Vetra Holdings, Inc. IriSync™ is a trademark and proprietary software product of Vetra Holdings. All Rights Reserved.</p>
          <nav className="flex flex-wrap gap-6">
            <Link href="#" className="text-gray-500 hover:text-gray-700 transition-colors text-sm">
              Privacy Policies
            </Link>
            <Link href="#" className="text-gray-500 hover:text-gray-700 transition-colors text-sm">
              Terms & Conditions
            </Link>
            <Link href="#" className="text-gray-500 hover:text-gray-700 transition-colors text-sm">
              Cookies Policies
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
