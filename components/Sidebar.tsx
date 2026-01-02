import Link from 'next/link'
import { days } from '../shared/data'

export default function Sidebar() {
  return (
    <aside style={{ width: 240, borderRight: '1px solid #eee', padding: 16 }}>
      <h3>30-day Lab</h3>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {days.map((d) => (
            <li key={d.day} style={{ margin: '6px 0' }}>
              <Link href={`/sa/${d.day}`}>
                {d.day}. {d.chinese} — {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
