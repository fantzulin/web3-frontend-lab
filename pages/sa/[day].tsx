import { useRouter } from 'next/router'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import { days } from '../../shared/data'
import dayComponents from '../../components/days'
import { Providers } from '../../components/providers';

export default function DayPage() {
  const router = useRouter()
  const { day } = router.query
  const n = Number(day)
  const meta = days.find((d) => d.day === n)

  if (!meta) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ padding: 24 }}>
          <h2>Day not found</h2>
          <p>Day must be between 1 and 30.</p>
          <p>
            <Link href="/">Back home</Link>
          </p>
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ padding: 24, flex: 1 }}>
        <h1>
          Day {meta.day} — {meta.chinese}
        </h1>
        <h3>{meta.title}</h3>

        {/* Render the specific Day component when available. */}
        {(() => {
          const DayComponent = dayComponents[meta.day]
          if (DayComponent) return (
            <Providers>
              <DayComponent />
            </Providers>
          )
          return (
            <>
              <p>Start implementing the feature for this day here.</p>
              <p>
                Example: create a component in <code>components/days/</code> named
                <code>Day{meta.day}.tsx</code> and export it from
                <code>components/days/index.ts</code>.
              </p>
            </>
          )
        })()}
        </main>
    </div>
  )
}
