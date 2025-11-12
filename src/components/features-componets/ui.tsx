import type React from "react"

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={`rounded-md bg-white shadow-sm ${className}`}>{children}</div>
}

export const Typography = ({
  variant,
  children,
  className,
}: { variant?: "h1" | "h2" | "h3" | "body"; children: React.ReactNode; className?: string }) => {
  let Tag: React.ElementType = "p"
  let fontSizeClass = ""

  switch (variant) {
    case "h1":
      Tag = "h1"
      fontSizeClass = "text-4xl"
      break
    case "h2":
      Tag = "h2"
      fontSizeClass = "text-3xl"
      break
    case "h3":
      Tag = "h3"
      fontSizeClass = "text-2xl"
      break
    default:
      Tag = "p"
      fontSizeClass = "text-base"
      break
  }

  return <Tag className={`${fontSizeClass} ${className}`}>{children}</Tag>
}

export const Button = ({
  variant,
  children,
  className,
  size,
}: { variant?: "default" | "outline"; children: React.ReactNode; className?: string; size?: "sm" | "lg" }) => {
  let paddingClass = "px-4 py-2"
  if (size === "lg") {
    paddingClass = "px-6 py-3"
  }

  const baseClass = `rounded-md font-medium ${paddingClass}`
  let variantClass = "bg-gray-100 hover:bg-gray-200"

if (variant === "outline") {
  variantClass = "border border-gray-300 text-white hover:bg-gray-50"
}


  return <button className={`${baseClass} ${variantClass} ${className}`}>{children}</button>
}
