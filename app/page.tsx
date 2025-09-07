"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Clock, ArrowRight, CheckCircle, Star, Shield, Zap, Home, GraduationCap, Building2, Users2, BookOpen, Menu } from "lucide-react"
import { LoadingPage } from "@/components/ui/loading-spinner"
import TopProgressBar from "@/components/ui/top-progress-bar"
import { ThemeSwitcher } from "@/components/Themeswitcher" // 1. Import the new component

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  if (isAuthenticated === null) {
    return <LoadingPage text="Loading..." />
  }

  return (
    <>
      <TopProgressBar />
      {/* Added dark mode background classes */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
        <nav className="absolute top-0 left-0 right-0 z-50 p-6">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/apsit.png" alt="APSIT" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">APSIT</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              {isAuthenticated ? (
                <>
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Welcome, {user?.name}</span>
                  <Button asChild size="sm" className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                    <Link href="/home" className="flex items-center">
                      <Home className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-red-300 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-500"
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/logout', { method: 'POST' })
                        setIsAuthenticated(false)
                        setUser(null)
                        router.push('/')
                      } catch (error) {
                        console.error('Logout error:', error)
                      }
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-105 font-medium link-enhanced">
                    Log In
                  </Link>
                  <Button asChild size="sm" className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                    <Link href="/auth/signup">Get Started</Link>
                  </Button>
                </>
              )}
              {/* 2. Add the ThemeSwitcher */}
              <ThemeSwitcher />
            </div>

            <div className="md:hidden flex items-center space-x-2">
              {/* 3. Add the ThemeSwitcher for mobile */}
              <ThemeSwitcher />
              <Button
                variant="ghost"
                size="sm"
                className="transition-all duration-200 hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border dark:border-gray-700 p-4 animate-in slide-in-from-top-2 duration-300">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-center pb-2 border-b dark:border-gray-700">
                    Welcome, {user?.name}
                  </div>
                  <Button asChild className="w-full" size="sm">
                    <Link href="/home" className="flex items-center justify-center">
                      <Home className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full hover:border-red-300 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-500"
                    size="sm"
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/logout', { method: 'POST' })
                        setIsAuthenticated(false)
                        setUser(null)
                        setMobileMenuOpen(false)
                        router.push('/')
                      } catch (error) {
                        console.error('Logout error:', error)
                      }
                    }}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button asChild className="w-full" size="sm">
                    <Link href="/auth/login">Log In</Link>
                  </Button>
                  <Button asChild className="w-full" size="sm">
                    <Link href="/auth/signup">Register</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </nav>

        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10"></div>
              <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center mb-8">
                <img src="/apsit.png" alt="APSIT" className="h-20 w-20 mr-4" />
                <div className="text-left">
                  <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-gradient">
                    CampusSync
                  </h1>
                  <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-medium">by APSIT</p>
                </div>
              </div>
              
              {isAuthenticated ? (
                <>
                  <p className="text-2xl md:text-3xl text-gray-700 dark:text-gray-200 mb-8 leading-relaxed">
                    Welcome back to <span className="font-semibold text-blue-600 dark:text-blue-400">CampusSync</span>,<br className="sm:hidden" /> {user?.name}!
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                    Continue managing your academic operations with intelligent scheduling, seamless group management, and comprehensive event tracking.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button asChild size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1">
                      <Link href="/home" className="flex items-center">
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-2 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-300 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1">
                      <Link href="/groups" className="flex items-center">
                        View Groups
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-2xl md:text-3xl text-gray-700 dark:text-gray-200 mb-8 leading-relaxed">
                    The ultimate <span className="font-semibold text-blue-600 dark:text-blue-400">campus management system</span> for <span className="font-bold text-purple-600 dark:text-purple-400">APSIT College</span>
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                    Streamline your academic operations with intelligent scheduling, seamless group management, and comprehensive event tracking. Built specifically for APSIT's HODs, faculty, and students.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button asChild size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover-lift">
                      <Link href="/auth/signup" className="flex items-center">
                        Start Free Today
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 hover-lift">
                      <Link href="/auth/login">Sign In</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Everything APSIT needs to manage campus
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Powerful tools designed specifically for APSIT College to enhance productivity and collaboration across all departments
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <Card className="group hover:shadow-2xl transition-all duration-500 ease-out transform hover:-translate-y-1 hover:scale-[1.02] border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out shadow-lg group-hover:shadow-xl">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">Smart Group Management</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                    Create and manage academic groups with intelligent role-based permissions and seamless collaboration
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center transition-all duration-300 group-hover:translate-x-1"><CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />Role-based access control</li>
                    <li className="flex items-center transition-all duration-300 group-hover:translate-x-1" style={{transitionDelay: '50ms'}}><CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />Easy member management</li>
                    <li className="flex items-center transition-all duration-300 group-hover:translate-x-1" style={{transitionDelay: '100ms'}}><CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />Secure join codes</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-500 ease-out transform hover:-translate-y-1 hover:scale-[1.02] border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700" style={{animationDelay: '150ms'}}>
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out shadow-lg group-hover:shadow-xl">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300">Intelligent Timetables</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                    Build and manage weekly schedules with smart conflict detection and flexible time slot management
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center transition-all duration-300 group-hover:translate-x-1"><CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />Drag & drop scheduling</li>
                    <li className="flex items-center transition-all duration-300 group-hover:translate-x-1" style={{transitionDelay: '50ms'}}><CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />Conflict prevention</li>
                    <li className="flex items-center transition-all duration-300 group-hover:translate-x-1" style={{transitionDelay: '100ms'}}><CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />Real-time updates</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-500 ease-out transform hover:-translate-y-1 hover:scale-[1.02] border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700" style={{animationDelay: '300ms'}}>
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out shadow-lg group-hover:shadow-xl">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">Comprehensive Events</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                    Track holidays, exams, meetings, and important dates with smart categorization and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center transition-all duration-300 group-hover:translate-x-1"><CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />Event categorization</li>
                    <li className="flex items-center transition-all duration-300 group-hover:translate-x-1" style={{transitionDelay: '50ms'}}><CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />Smart date ranges</li>
                    <li className="flex items-center transition-all duration-300 group-hover:translate-x-1" style={{transitionDelay: '100ms'}}><CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />Calendar integration</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Built for APSIT College Excellence
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                CampusSync is specifically designed to meet the unique needs of APSIT College, empowering our academic community with modern tools for success
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Academic Excellence</h3>
                    <p className="text-gray-600 dark:text-gray-300">Supporting APSIT's mission to provide quality education through efficient department management</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Department Focus</h3>
                    <p className="text-gray-600 dark:text-gray-300">Tailored for APSIT's department structure and academic workflow requirements</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Community Driven</h3>
                    <p className="text-gray-600 dark:text-gray-300">Built by APSIT, for APSIT - understanding our unique academic culture and needs</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-8 text-white">
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-4">100%</div>
                    <div className="text-xl mb-6">APSIT Made</div>
                    <div className="flex justify-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-6 w-6 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm mt-4 opacity-90">Custom-built for our college</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                  Why APSIT chooses CampusSync
                </h2>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Lightning Fast</h3>
                      <p className="text-gray-600 dark:text-gray-300">Built with modern technology for instant loading and smooth performance</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Enterprise Security</h3>
                      <p className="text-gray-600 dark:text-gray-300">Bank-level security with role-based access and encrypted data storage</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">User Experience</h3>
                      <p className="text-gray-600 dark:text-gray-300">Intuitive design that works seamlessly across all devices and platforms</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-3xl p-8 text-white">
                  <div className="text-center">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-80" />
                    <div className="text-2xl font-bold mb-2">APSIT College</div>
                    <div className="text-lg mb-4">Campus Management</div>
                    <p className="text-sm opacity-90">Streamlined • Efficient • Modern</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-12 bg-gray-900 dark:bg-black text-white">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center mb-6">
              <img src="/apsit.png" alt="APSIT" className="h-8 w-8 mr-3" />
              <span className="text-xl font-bold">APSIT College</span>
            </div>
            <p className="text-gray-400 mb-4">
              CampusSync - Streamlined campus management for APSIT College
            </p>
            <p className="text-sm text-gray-500">
              © 2025 APSIT College. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
