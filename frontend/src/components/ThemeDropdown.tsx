import { useTheme } from '@/context/theme'
import { useSidebar } from '@/context/sidebar'
import { Button } from '@/components/ui/button'
import { Dropdown, DropdownItem } from '@/components/ui/dropdown'
import { Sun, Moon, Monitor, ChevronUp } from 'lucide-react'

export function ThemeDropdown() {
  const { theme, setTheme } = useTheme()
  const { collapsed } = useSidebar()
  
  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  const currentTheme = themes.find(t => t.value === theme) || themes[2]
  const CurrentIcon = currentTheme.icon

  if (collapsed) {
    return (
      <Dropdown
        trigger={
          <Button variant="ghost" size="icon" className="w-10 h-10">
            <CurrentIcon className="w-4 h-4" />
          </Button>
        }
      >
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownItem key={value} active={theme === value} onClick={() => setTheme(value)}>
            <Icon className="w-4 h-4" />
            {label}
          </DropdownItem>
        ))}
      </Dropdown>
    )
  }

  return (
    <Dropdown
      trigger={
        <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-2">
            <CurrentIcon className="w-4 h-4" />
            {currentTheme.label}
          </span>
          <ChevronUp className="w-4 h-4" />
        </Button>
      }
    >
      {themes.map(({ value, label, icon: Icon }) => (
        <DropdownItem key={value} active={theme === value} onClick={() => setTheme(value)}>
          <Icon className="w-4 h-4" />
          {label}
        </DropdownItem>
      ))}
    </Dropdown>
  )
}

