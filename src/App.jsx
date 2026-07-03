import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { TEAM, DAYS, SLOTS, MIN_SLOTS } from './schedule'

const TABLE = 'bookings_week5'
const LS_KEY = 'sched-name-w5'

export default function App() {
  const [selected, setSelected] = useState(() => localStorage.getItem(LS_KEY) || '')
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    supabase.from(TABLE).select('*').then(({ data }) => setBookings(data || []))
    const sub = supabase.channel('realtime-w5')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => {
        supabase.from(TABLE).select('*').then(({ data }) => setBookings(data || []))
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const selectName = name => {
    setSelected(name)
    localStorage.setItem(LS_KEY, name)
  }

  const toggleSlot = async (slotId) => {
    if (!selected) return
    const mine = bookings.find(b => b.slot_id === slotId && b.person === selected)
    if (mine) {
      await supabase.from(TABLE).delete().eq('id', mine.id)
    } else {
      await supabase.from(TABLE).insert({ slot_id: slotId, person: selected })
    }
  }

  const slotPeople = (slotId) => bookings.filter(b => b.slot_id === slotId).map(b => b.person)
  const myCount = bookings.filter(b => b.person === selected).length

  return (
    <div className="app">
      <h1>שיבוץ ניסויים — שבוע 5</h1>
      <p className="subtitle">6–10 יולי 2026 | מינימום {MIN_SLOTS} שיבוצים לאדם</p>

      <div className="name-select">
        {TEAM.map(name => (
          <button key={name} className={`name-btn ${selected === name ? 'active' : ''}`} onClick={() => selectName(name)}>
            {name}
          </button>
        ))}
      </div>

      <div className="grid">
        {DAYS.map(day => (
          <div key={day.key} className="day-col">
            <div className="day-header">
              <div className="day-name">{day.label}</div>
              <div className="day-date">{day.date}</div>
            </div>
            {SLOTS.filter(s => s.dayKey === day.key).map(slot => {
              const people = slotPeople(slot.id)
              const isMine = people.includes(selected)
              const isTaken = !isMine && people.length > 0 && !selected
              return (
                <div
                  key={slot.id}
                  className={`slot ${isMine ? 'mine' : ''} ${!isMine && people.length > 0 ? 'taken' : ''}`}
                  onClick={() => toggleSlot(slot.id)}
                >
                  <span className="slot-time">{slot.time}</span>
                  <div className="slot-people">
                    {people.map(p => (
                      <span key={p} className={`person-tag ${p === selected ? 'me' : ''}`}>{p}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="status">
        {selected ? (
          <p className={myCount >= MIN_SLOTS ? 'ok' : 'warn'}>
            {selected}: {myCount} / {MIN_SLOTS} שיבוצים {myCount >= MIN_SLOTS ? '✓' : '(חסר עוד ' + (MIN_SLOTS - myCount) + ')'}
          </p>
        ) : <p>בחר/י שם כדי להתחיל</p>}
        <div className="person-counts">
          {TEAM.map(p => {
            const c = bookings.filter(b => b.person === p).length
            return <span key={p} className={`count-item ${c >= MIN_SLOTS ? 'done' : 'pending'}`}>{p}: {c}</span>
          })}
        </div>
      </div>
    </div>
  )
}
