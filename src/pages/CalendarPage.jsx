import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

const P = {
  bg: '#f5f3ef',
  card: '#ffffff',
  border: '#e8e4dc',
  text: '#1a1a1a',
  sub: '#6b6b6b',
  dim: '#9e9e9e',
  accent: '#1a3a2a',
  green: '#2d6a4f',
}

const EVENT_TYPES = {
  match: { color: '#c0392b', bg: '#fdecea', label: 'Match' },
  training: { color: '#2d6a4f', bg: '#e8f5ee', label: 'Training' },
  appointment: { color: '#1a3a5c', bg: '#eef3ff', label: 'Medical' },
}

const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// ---------- DATE FIX ----------
function parseLocalDate(value){
  if(!value) return new Date()
  if(/^\d{4}-\d{2}-\d{2}$/.test(value)){
    const [y,m,d] = value.split('-').map(Number)
    return new Date(y, m-1, d)
  }
  const d = new Date(value)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toISO(date){
  const d = parseLocalDate(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function startOfWeek(date){
  const d = parseLocalDate(date)
  const day = (d.getDay()+6)%7
  d.setDate(d.getDate()-day)
  return d
}

function addDays(date,n){
  const d = parseLocalDate(date)
  d.setDate(d.getDate()+n)
  return d
}

// ---------- UI ----------
function EventChip({event,onClick}){
  const t = EVENT_TYPES[event.type]
  return (
    <button onClick={()=>onClick(event)} style={{
      width:'100%',
      display:'flex',
      alignItems:'center',
      gap:6,
      padding:'4px 6px',
      borderRadius:6,
      border:'none',
      background:t.bg,
      color:t.color,
      fontSize:11,
      cursor:'pointer',
      marginBottom:3
    }}>
      <div style={{width:6,height:6,borderRadius:'50%',background:t.color}}/>
      {event.title}
    </button>
  )
}

function getDayIndicators(events){
  const count = {}
  events.forEach(e=>{
    count[e.type]=(count[e.type]||0)+1
  })
  return Object.entries(count)
}

// ---------- PAGE ----------
export default function CalendarPage(){
  const {user,isCoach} = useAuth()
  const navigate = useNavigate()

  const [currentDate,setCurrentDate] = useState(new Date())
  const [events,setEvents] = useState([])

  const load = useCallback(async()=>{

    const start = startOfWeek(currentDate)
    const end = addDays(start,6)

    const startISO = toISO(start)
    const endISO = toISO(end)

    let all=[]

    const {data:matches} = await supabase
      .from('match_history')
      .select('*')
      .gte('match_date',startISO)
      .lte('match_date',endISO)

    matches?.forEach(m=>{
      all.push({
        id:m.id,
        type:'match',
        date:toISO(parseLocalDate(m.match_date)),
        title:`vs ${m.opponent}`
      })
    })

    setEvents(all)

  },[currentDate])

  useEffect(()=>{load()},[load])

  function getEventsForDay(date){
    return events.filter(e=>e.date===toISO(date))
  }

  const weekStart = startOfWeek(currentDate)
  const weekDays = Array.from({length:7},(_,i)=>addDays(weekStart,i))

  return(
    <div style={{padding:20}}>

      <h2>Calendrier</h2>

      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(7,1fr)',
        background:P.card,
        border:`1px solid ${P.border}`
      }}>

        {weekDays.map((d,i)=>{
          const dayEvents = getEventsForDay(d)

          return(
            <div key={i} style={{
              borderRight:'1px solid #eee',
              padding:10,
              minHeight:120
            }}>
              <div style={{fontWeight:700}}>
                {DAYS_FR[i]} {d.getDate()}
              </div>

              {/* INDICATEURS */}
              <div style={{display:'flex',gap:4,margin:'4px 0'}}>
                {getDayIndicators(dayEvents).map(([t,c])=>(
                  <div key={t} style={{
                    background:EVENT_TYPES[t].bg,
                    color:EVENT_TYPES[t].color,
                    fontSize:10,
                    padding:'2px 4px',
                    borderRadius:4
                  }}>{c}</div>
                ))}
              </div>

              {/* EVENTS */}
              {dayEvents.map(e=>(
                <EventChip key={e.id} event={e} onClick={()=>{}}/>
              ))}
            </div>
          )
        })}

      </div>
    </div>
  )
}
