import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { seedData } from '@/api'
import { useSidebar } from '@/context/sidebar'
import { Sidebar } from '@/components/Sidebar'
import { cn } from '@/lib/utils'

import ApplicationsPage from '@/pages/Applications'
import NewApplicationPage from '@/pages/NewApplication'
import ApplicationDetailPage from '@/pages/ApplicationDetail'
import ProgramsPage from '@/pages/Programs'

export function Layout({ isAdmin = false }: { isAdmin?: boolean }) {
  const { collapsed } = useSidebar()

  useEffect(() => {
    seedData().catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex">
      <Sidebar isAdmin={isAdmin} />
      <main className={cn("flex-1 transition-all duration-200", collapsed ? "ml-16" : "ml-60")}>
        <div className="max-w-6xl mx-auto px-8 py-8">
          {isAdmin ? (
            <Routes>
              <Route path="/" element={<ApplicationsPage isAdmin={true} />} />
              <Route path="/applications/:id" element={<ApplicationDetailPage />} />
              <Route path="/programs" element={<ProgramsPage />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/" element={<ApplicationsPage />} />
              <Route path="/new" element={<NewApplicationPage />} />
              <Route path="/applications/:id" element={<ApplicationDetailPage />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
  )
}
