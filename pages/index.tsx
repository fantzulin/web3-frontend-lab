import Link from 'next/link'
import { days } from '../shared/data'
import Sidebar from '../components/Sidebar'

export default function Home() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ padding: 24, flex: 1 }}>
        <h1>Web3 Frontend Lab - 卅 (Sa)</h1>
        <p>Welcome — pick a day to start building features.</p>

        <p>All 30 days are available via the sidebar or by URL /sa/&lt;day&gt; (1-30).</p>
      </main>
    </div>
  )
}
