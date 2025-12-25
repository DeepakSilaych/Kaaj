import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "left" | "right"
}

export function Dropdown({ trigger, children, align = "left" }: DropdownProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute bottom-full mb-1 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-lg z-50",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, {
                  onClick: () => {
                    (child.props as { onClick?: () => void }).onClick?.()
                    setOpen(false)
                  },
                })
              : child
          )}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
}

export function DropdownItem({ className, active, children, ...props }: DropdownItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-popover-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

