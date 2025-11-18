"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MessageSquare, Menu, X, Bell, Settings, User } from "lucide-react"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { firestore } from "@/lib/core/firebase"
import { useRouter, usePathname } from "next/navigation"

// Define the navigation links
const navItems = [
  { name: "Home", href: "/" },
  { name: "Features", href: "/features-pricing" },
  { name: "Pricing", href: "/pricing" },
  { name: "Careers", href: "/careers" },
  { name: "Blog", href: "/blog" },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  // Determine if we're on a marketing page
  const isMarketingPage =
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/features-pricing" ||
    pathname === "/pricing" ||
    pathname === "/blog" ||
    pathname === "/careers"

  // Check authentication state
  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser && firestore) {
        try {
          const userRef = doc(firestore, "users", currentUser.uid)
          const userSnap = await getDoc(userRef)

          if (userSnap.exists()) {
            const userData = userSnap.data()
            const role = userData.role || "user"
            setIsAdmin(role === "admin" || role === "super_admin")
            setNotificationCount(Math.floor(Math.random() * 5))
          }
        } catch (error) {
          console.error("Error checking admin status:", error)
        }
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  return (
    <>
      <nav className="w-full lg:w-[90%] xl:w-[80%] mx-auto bg-white border-b border-gray-100 top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-gray-900">IriSync</span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                {isMarketingPage &&
                  navItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        pathname === item.href
                          ? "text-gray-900 border-b-2 border-green-500"
                          : "text-gray-500 hover:text-gray-900 hover:border-b-2 hover:border-gray-300"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}

                <Link
                  href="/support"
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === "/support" || pathname?.startsWith("/support/")
                      ? "text-gray-900 border-b-2 border-green-500"
                      : "text-gray-500 hover:text-gray-900 hover:border-b-2 hover:border-gray-300"
                  }`}
                >
                  Support
                </Link>
              </div>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:block">
              <div className="ml-4 flex items-center space-x-4">
                {user ? (
                  <>
                    {notificationCount > 0 && (
                      <button
                        onClick={() => router.push("/dashboard")}
                        className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100"
                      >
                        <Bell className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {notificationCount}
                        </span>
                      </button>
                    )}

                    <Link
                      href="/dashboard"
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        pathname?.startsWith("/dashboard")
                          ? "border-green-500 text-green-600 bg-green-50"
                          : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      Dashboard
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pathname?.startsWith("/admin")
                            ? "bg-purple-600 text-white"
                            : "bg-purple-500 text-white hover:bg-purple-600"
                        }`}
                      >
                        <Settings className="w-4 h-4" />
                        Admin
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      className="bg-green-500 hover:bg-green-600 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors"
                    >
                      Sign Up Free
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={handleDrawerToggle}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleDrawerToggle} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-80 bg-white shadow-xl">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between py-6 border-b">
                <Link href="/" className="flex items-center gap-2" onClick={handleDrawerToggle}>
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-semibold text-gray-900">IriSync</span>
                </Link>
                <button
                  onClick={handleDrawerToggle}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="py-6 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleDrawerToggle}
                    className={`block px-3 py-3 text-base font-medium rounded-md transition-colors ${
                      pathname === item.href
                        ? "text-green-600 bg-green-50"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}

                <Link
                  href="/support"
                  onClick={handleDrawerToggle}
                  className={`block px-3 py-3 text-base font-medium rounded-md transition-colors ${
                    pathname === "/support" || pathname?.startsWith("/support/")
                      ? "text-green-600 bg-green-50"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Support
                </Link>

                <div className="border-t pt-6 mt-6">
                  {user ? (
                    <div className="space-y-1">
                      <Link
                        href="/dashboard"
                        onClick={handleDrawerToggle}
                        className="flex items-center gap-3 px-3 py-3 text-base font-medium text-green-600 bg-green-50 rounded-md"
                      >
                        <User className="w-5 h-5" />
                        Dashboard
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin/dashboard"
                          onClick={handleDrawerToggle}
                          className="flex items-center gap-3 px-3 py-3 text-base font-medium text-purple-600 bg-purple-50 rounded-md"
                        >
                          <Settings className="w-5 h-5" />
                          Admin Panel
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Link
                        href="/login"
                        onClick={handleDrawerToggle}
                        className="block w-full px-3 py-3 text-base font-medium text-green-600 bg-green-50 rounded-md text-center"
                      >
                        Log In
                      </Link>
                      <Link
                        href="/register"
                        onClick={handleDrawerToggle}
                        className="block w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg text-center transition-colors"
                      >
                        Sign Up Free
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
