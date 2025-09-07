"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import TopProgressBar from "@/components/ui/top-progress-bar"
import { useQueryClient } from "@tanstack/react-query"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    // Delayed appearance for smooth card animation
    const timer = setTimeout(() => setShowForm(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const fullEmail = email.includes("@") ? email : `${email}@apsit.edu.in`
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fullEmail, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Clear all cached data since user is logging in
        queryClient.clear()
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800))
        router.push("/home")
      } else {
        setError(data.message || "Login failed")
      }
    } catch (error) {
      setError("An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <TopProgressBar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <img 
              src="/apsit.png" 
              alt="CampusSync" 
              className="h-16 w-16 mx-auto mb-4 transition-transform duration-500 hover:scale-110" 
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-gray-600 mt-2">Sign in to your CampusSync account</p>
          </div>

          {/* Login Form */}
          <Card className={`transition-all duration-500 ease-out transform ${
            showForm ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          } shadow-xl border-0`}>
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                Sign In
              </CardTitle>
              <CardDescription className="text-gray-600">
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <div className="flex">
                    <Input
                      id="email"
                      type="text"
                      placeholder="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ''))}
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300 rounded-r-none"
                    />
                    <span className="inline-flex items-center px-3 border border-l-0 rounded-r-md bg-gray-50 text-gray-600 text-sm">
                      @apsit.edu.in
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-300"
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-600 mt-6">
                Don't have an account?{" "}
                <Link 
                  href="/auth/signup" 
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200 hover:underline"
                >
                  Sign up here
                </Link>
              </p>
              <div className="text-right mt-1">
               <Link
                 href="/auth/forgot"
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors duration-200 hover:underline"
                 >
                 Forgot password?
                 </Link>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}