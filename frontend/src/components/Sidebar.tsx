import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/auth'
import { useSidebar } from '@/context/sidebar'
import { Button } from '@/components/ui/button'
import { ThemeDropdown } from '@/components/ThemeDropdown'
import { 
  LayoutDashboard, Settings, Plus, LogOut, 
  PanelLeftClose, PanelLeft, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { collapsed, toggle } = useSidebar()
  
  const userNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Applications', end: true },
  ]

  const adminNavItems = [
    { to: '/admin', icon: Users, label: 'All Applications', end: true },
    { to: '/admin/programs', icon: Settings, label: 'Programs' },
  ]

  const navItems = isAdmin ? adminNavItems : userNavItems

  return (
    <aside 
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 transition-all duration-200 z-50",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-14 flex items-center border-b border-border",
        collapsed ? "px-3 justify-center" : "px-4 gap-3"
      )}>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isAdmin ? "bg-red-500" : "bg-primary")}>
          <span className="text-primary-foreground font-bold text-sm">K</span>
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-foreground">Kaaj</span>
              <span className="text-xs text-muted-foreground block -mt-0.5">{isAdmin ? 'Admin Portal' : 'Lender Platform'}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggle} 
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" 
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Expand button (collapsed state) */}
      {collapsed && (
        <div className="p-2 border-b border-border flex justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggle} 
            className="h-8 w-8 text-muted-foreground hover:text-foreground" 
            title="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* New Application Button (User only) */}
      {!isAdmin && (
        <div className={cn("border-b border-border", collapsed ? "p-2" : "p-3")}>
          <NavLink to="/new">
            {collapsed ? (
              <Button
                variant={location.pathname === '/new' ? 'default' : 'secondary'}
                size="icon"
                className="w-10 h-10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant={location.pathname === '/new' ? 'default' : 'default'}
                className="w-full justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Application
              </Button>
            )}
          </NavLink>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-3")}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed ? "justify-center w-10 h-10" : "gap-3 px-3 py-2.5",
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      {/* Theme Selector */}
      <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
        <ThemeDropdown />
      </div>

      {/* User / Admin Footer */}
      <div className={cn("border-t border-border", collapsed ? "p-2" : "px-3 py-3")}>
        {isAdmin ? (
          <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-2")}>
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium text-red-500">
              A
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Admin</p>
                <p className="text-xs text-muted-foreground">Full Access</p>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { sessionStorage.removeItem('admin'); window.location.href = '/admin' }}
              className="h-8 w-8" 
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-muted-foreground cursor-pointer"
              title={user?.name}
            >
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8" title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 shrink-0" title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}

