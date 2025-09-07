"use client"

import React, { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Home, Users, Calendar, Clock, Plus, Menu, LogOut, X, Building2, BookOpen, FlaskConical, Layers } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useUser, useLogout, usePrefetchData } from "@/hooks/use-app-data"

export default function Navigation({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPath, setCurrentPath] = useState("")
  const router = useRouter()
  const pathname = usePathname()
  
  // Use our new state management
  const { user, isLoading } = useUser()
  const logoutMutation = useLogout()
  
  // Prefetch data for seamless navigation
  usePrefetchData()

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleNavigation = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }

  // Set current path
  React.useEffect(() => {
    setCurrentPath(pathname)
  }, [pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading CampusSync...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navItems = [
    { href: "/home", title: "Dashboard", icon: Home },
    { href: "/groups", title: "Groups", icon: Users },
    { href: "/timetables", title: "Timetables", icon: Clock },
    { href: "/calendars", title: "Calendars", icon: Calendar },
    ...(user.role === "hod" ? [{ href: "/rooms", title: "Rooms", icon: Building2 }] : []),
    ...(user.role === "hod" ? [{ href: "/subjects", title: "Subjects", icon: BookOpen }] : []),
    ...(user.role === "hod" ? [{ href: "/labs", title: "Labs", icon: FlaskConical }] : []),
    ...(user.role === "hod" ? [{ href: "/batches", title: "Batches", icon: Layers }] : []),
  ]

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <img src="/apsit.png" alt="CampusSync" className="h-8 w-8" />
          <span className="text-xl font-bold">CampusSync</span>
        </div>
        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="lg:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    isActive 
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                      : "text-gray-700 hover:bg-gray-100 hover:shadow-md"
                  }`}
                >
                  <item.icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                  <span className="font-medium">{item.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <Avatar className="ring-2 ring-transparent hover:ring-blue-200 transition-all duration-300">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
              {(user.name?.charAt(0) || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name || "User"}</p>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {user.role?.toUpperCase() || "USER"}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Logout Button */}
        <div className="mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-300 transform hover:scale-105"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
        <NavContent />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <img src="/apsit.png" alt="CampusSync" className="h-6 w-6" />
            <span className="text-lg font-bold">CampusSync</span>
          </div>

          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="transition-all duration-300 hover:scale-110 hover:bg-gray-100 rounded-full p-2">
                  <Avatar className="h-8 w-8 ring-2 ring-transparent hover:ring-blue-200 transition-all duration-300">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                      {(user.name?.charAt(0) || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-64 shadow-lg border-0 bg-white/95 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200"
                sideOffset={8}
              >
                <DropdownMenuLabel className="pb-3">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                          {(user.name?.charAt(0) || "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="w-fit text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {user.role?.toUpperCase() || "USER"}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="transition-all duration-200 hover:bg-red-50 hover:text-red-600 cursor-pointer group"
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">
                    {logoutMutation.isPending ? "Logging out..." : "Log out"}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden transition-all duration-300 hover:scale-110 hover:bg-gray-100 rounded-md p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`fixed left-0 top-0 h-full z-50 lg:hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}>
          {/* Sidebar with smooth slide animation */}
          <div className={`relative h-full w-80 bg-white shadow-2xl transform transition-all duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <NavContent />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </div>
    </>
  )
}
