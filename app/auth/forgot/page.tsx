"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setError("")
    setIsLoading(true)

    try {
      const fullEmail = email.includes("@") ? email : `${email}@apsit.edu.in`
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fullEmail }),
      })
      const data = await res.json()

      if (res.ok) {
        setMessage(data.message || "Password reset link sent to your email.")
      } else {
        setError(data.message || "Failed to send reset link.")
      }
    } catch (err) {
      setError("Something went wrong. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Forgot Password
          </h1>
          <p className="text-gray-600 mt-2">Enter your email to receive a password reset link</p>
        </div>

        {/* Form Card */}
        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-xl bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-gray-600">
              We'll send a link to reset your password
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

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {message && (
                <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>{message}</AlertDescription>
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
                    Sending link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
