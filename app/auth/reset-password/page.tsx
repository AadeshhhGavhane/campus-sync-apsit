import ResetPasswordPageClient from "./page-client"

export default function ResetPasswordPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const tokenParam = searchParams?.token
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam

  return <ResetPasswordPageClient token={token} />
}