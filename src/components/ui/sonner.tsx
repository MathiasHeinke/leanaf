
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton
      richColors
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toast]:bg-destructive group-[.toast]:text-destructive-foreground",
          success: "group-[.toast]:bg-green-50 group-[.toast]:text-green-800 dark:group-[.toast]:bg-green-900/20 dark:group-[.toast]:text-green-200",
          warning: "group-[.toast]:bg-yellow-50 group-[.toast]:text-yellow-800 dark:group-[.toast]:bg-yellow-900/20 dark:group-[.toast]:text-yellow-200",
          info: "group-[.toast]:bg-blue-50 group-[.toast]:text-blue-800 dark:group-[.toast]:bg-blue-900/20 dark:group-[.toast]:text-blue-200"
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
