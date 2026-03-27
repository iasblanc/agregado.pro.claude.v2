import { redirect }       from 'next/navigation'
import { getServerUser }  from '@/lib/supabase/server'
import type { ReactNode } from 'react'
import { Sidebar }        from '@/components/layout/Sidebar'
import { MobileNav }      from '@/components/layout/MobileNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getServerUser()
  console.log('[LAYOUT] user:', user?.id ?? 'null')
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-ag-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-[60px] md:pb-0">
        {children}
      </div>
      <MobileNav />
    </div>
  )
}
