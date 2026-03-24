import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

const P = {
bg: '#05070a',
card: '#0b0f14',
card2: '#0f141b',
border: '#1b2430',
text: '#f3f5f7',
sub: '#9aa4b2',
dim: '#667085',
accent: '#19c37d',
green: '#2d6a4f',
yellow: '#b5830a',
red: '#c0392b',
blue: '#2f6fed',
}

const EVENT_TYPES = {
match: { color: '#c0392b', bg: 'rgba(192,57,43,0.16)', label: 'Match' },
training: { color: '#2d6a4f', bg: 'rgba(45,106,79,0.16)', label: 'Entraînement' },
appointment: { color: '#2f6fed', bg: 'rgba(47,111,237,0.16)', label: 'RDV médical' },
season: { color: '#b45309', bg: 'rgba(180,83,9,0.16)', label: 'Événement' },
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAYS_OF_WEEK = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 0: 'Dim' }

function parseLocalDate(value) {
if (!value) return new Date()

if (value instanceof Date) {
return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

if (typeof value === 'string') {
if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
const [y, m, d] = value.split('-').map(Number)
return new Date(y, m - 1, d)
}

const asDate = new Date(value)
if (!Number.isNaN(asDate.getTime())) {
return new Date(asDate.getFullYear(), asDate.getMonth(), asDate.getDate())
}
}

const fallback = new Date(value)
return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate())
}

function toISO(date) {
const d = parseLocalDate(date)
return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfWeek(date) {
const d = parseLocalDate(date)
const day = d.getDay()
const diff = day === 0 ? -6 : 1 - day
d.setDate(d.getDate() + diff)
d.setHours(0, 0, 0, 0)
return d
}

function addDays(date, n) {
const d = parseLocalDate(date)
d.setDate(d.getDate() + n)
d.setHours(0, 0, 0, 0)
return d
}

function getDayIndicators(dayEvents) {
const counts = {
match: 0,
training: 0,
appointment: 0,
season: 0,
}

for (const e of dayEvents) {
if (counts[e.type] !== undefined) counts[e.type] += 1
}

return Object.entries(counts).filter(([, n]) => n > 0)
}

function EventChip({ event, onClick }) {
const t = EVENT_TYPES[event.type] || EVENT_TYPES.season

return (
<button
onClick={() => onClick?.(event)}
style={{
width: '100%',
display: 'flex',
alignItems: 'center',
gap: 6,
fontSize: 11,
fontWeight: 600,
padding: '5px 8px',
borderRadius: 8,
border: 'none',
background: t.bg,
color: t.color,
cursor: 'pointer',
marginBottom: 4,
lineHeight: 1.35,
textAlign: 'left',
overflow: 'hidden',
}}
>
<span
style={{
width: 7,
height: 7,
borderRadius: '50%',
background: t.color,
flexShrink: 0,
}}
/>
<span
style={{
overflow: 'hidden',
textOverflow: 'ellipsis',
whiteSpace: 'nowrap',
display: 'block',
flex: 1,
}}
>
{event.title}
</span>
</button>
)
}

export default function CalendarPage() {
const { user, gym, isCoach } = useAuth()
const navigate = useNavigate()

const [view, setView] = useState('week')
const [currentDate, setCurrentDate] = useState(new Date())
const [events, setEvents] = useState([])
const [loading, setLoading] = useState(true)
const [selectedEvent, setSelectedEvent] = useState(null)

const load = useCallback(async () => {
setLoading(true)

const start = view === 'week'
? startOfWeek(currentDate)
: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

const end = view === 'week'
? addDays(start, 6)
: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

const startISO = toISO(start)
const endISO = toISO(end)

let allEvents = []

if (isCoach) {
const [{ data: matches }, { data: appts }, { data: sched }] = await Promise.all([
supabase.from('match_history').select('*')
.eq('coach_id', user.id)
.gte('match_date', startISO)
.lte('match_date', endISO),

supabase.from('medical_appointments').select('*, athlete:athlete_id(full_name, email)')
.eq('coach_id', user.id)
.gte('date_appointment', start.toISOString())
.lte('date_appointment', new Date(end.getTime() + 86400000).toISOString()),

supabase.from('training_schedule').select('*').eq('coach_id', user.id).eq('active', true),
])

for (const m of (matches || [])) {
allEvents.push({
id: `match-${m.id}`,
type: 'match',
date: toISO(parseLocalDate(m.match_date)),
title: m.label || `vs ${m.opponent}`,
subtitle: m.opponent,
location: m.location,
raw: m,
})
}

const schedDays = (sched || []).map(s => s.day_of_week)

let d = new Date(start)
while (d <= end) {
const dow = d.getDay()
if (schedDays.includes(dow)) {
allEvents.push({
id: `training-${toISO(d)}`,
type: 'training',
date: toISO(d),
title: 'Entraînement',
subtitle: DAYS_OF_WEEK[dow],
})
}
d = addDays(d, 1)
}

for (const a of (appts || [])) {
allEvents.push({
id: `appt-${a.id}`,
type: 'appointment',
date: toISO(parseLocalDate(a.date_appointment)),
title: `RDV ${a.type} — ${a.athlete?.full_name || a.athlete?.email || ''}`,
subtitle: a.location || '',
time: new Date(a.date_appointment).toLocaleTimeString('fr-FR', {
hour: '2-digit',
minute: '2-digit',
}),
raw: a,
})
}
} else {
const { data: link } = await supabase
.from('coach_clients')
.select('coach_id')
.eq('client_id', user.id)
.maybeSingle()

const coachId = link?.coach_id

if (coachId) {
const [{ data: matches }, { data: appts }, { data: sched }] = await Promise.all([
supabase.from('match_history').select('*')
.eq('coach_id', coachId)
.gte('match_date', startISO)
.lte('match_date', endISO),

supabase.from('medical_appointments').select('*')
.eq('athlete_id', user.id)
.gte('date_appointment', start.toISOString())
.lte('date_appointment', new Date(end.getTime() + 86400000).toISOString()),

supabase.from('training_schedule').select('*').eq('coach_id', coachId).eq('active', true),
])

for (const m of (matches || [])) {
allEvents.push({
id: `match-${m.id}`,
type: 'match',
date: toISO(parseLocalDate(m.match_date)),
title: m.label || `vs ${m.opponent}`,
subtitle: m.opponent,
location: m.location,
})
}

const schedDays = (sched || []).map(s => s.day_of_week)

let d = new Date(start)
while (d <= end) {
if (schedDays.includes(d.getDay())) {
allEvents.push({
id: `training-${toISO(d)}`,
type: 'training',
date: toISO(d),
title: 'Entraînement',
})
}
d = addDays(d, 1)
}

for (const a of (appts || [])) {
allEvents.push({
id: `appt-${a.id}`,
type: 'appointment',
date: toISO(parseLocalDate(a.date_appointment)),
title: `RDV ${a.type}`,
subtitle: a.location || '',
time: new Date(a.date_appointment).toLocaleTimeString('fr-FR', {
hour: '2-digit',
minute: '2-digit',
}),
})
}
}
}

setEvents(allEvents)
setLoading(false)
}, [user.id, isCoach, currentDate, view])

useEffect(() => {
load()
}, [load])

function getEventsForDay(dateStr) {
return events
.filter(e => e.date === dateStr)
.sort((a, b) => {
const order = { match: 0, training: 1, appointment: 2, season: 3 }
return (order[a.type] ?? 9) - (order[b.type] ?? 9)
})
}

function prev() {
if (view === 'week') setCurrentDate(d => addDays(d, -7))
else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
}

function next() {
if (view === 'week') setCurrentDate(d => addDays(d, 7))
else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
}

function goToday() {
setCurrentDate(new Date())
}

const weekStart = startOfWeek(currentDate)
const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

const year = currentDate.getFullYear()
const month = currentDate.getMonth()
const firstDay = new Date(year, month, 1)
const lastDay = new Date(year, month + 1, 0)
const startOffset = (firstDay.getDay() + 6) % 7

const monthDays = []
for (let i = 0; i < startOffset; i++) monthDays.push(null)
for (let d = 1; d <= lastDay.getDate(); d++) monthDays.push(new Date(year, month, d))

const today = toISO(new Date())
const gymName = gym?.name || 'Atlyo'

return (
<div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", padding: 'clamp(16px,2vw,28px)' }}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

<div style={{ maxWidth: 1120, margin: '0 auto' }}>
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
<div>
<div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: P.sub, marginBottom: 6 }}>
{gymName}
</div>
<h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 400, color: P.text, margin: 0 }}>
Calendrier
</h1>
</div>

<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
<div style={{ display: 'flex', background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden' }}>
{[{ key: 'week', label: 'Semaine' }, { key: 'month', label: 'Mois' }].map(v => (
<button
key={v.key}
onClick={() => setView(v.key)}
style={{
padding: '8px 16px',
border: 'none',
fontSize: 13,
fontWeight: 700,
cursor: 'pointer',
fontFamily: 'inherit',
transition: 'all 0.15s',
background: view === v.key ? P.accent : 'transparent',
color: view === v.key ? '#fff' : P.sub,
}}
>
{v.label}
</button>
))}
</div>

<div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
<button onClick={prev} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${P.border}`, background: P.card, cursor: 'pointer', fontSize: 16, color: P.text }}>‹</button>
<button onClick={goToday} style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${P.border}`, background: P.card, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: P.text, fontFamily: 'inherit' }}>Aujourd'hui</button>
<button onClick={next} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${P.border}`, background: P.card, cursor: 'pointer', fontSize: 16, color: P.text }}>›</button>
</div>

<div style={{ fontSize: 15, fontWeight: 700, color: P.text, minWidth: 180, textAlign: 'center' }}>
{view === 'week'
? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS_FR[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
: `${MONTHS_FR[month]} ${year}`
}
</div>
</div>
</div>

<div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
{Object.entries(EVENT_TYPES).map(([key, t]) => (
<div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: P.sub }}>
<div style={{ width: 10, height: 10, borderRadius: 3, background: t.color }} />
{t.label}
</div>
))}
</div>

{view === 'week' && (
<div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }}>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${P.border}` }}>
{weekDays.map((d, i) => {
const iso = toISO(d)
const isToday = iso === today
const dayEvents = getEventsForDay(iso)
const hasEvents = dayEvents.length > 0

return (
<div
key={i}
style={{
padding: '14px 8px 10px',
textAlign: 'center',
borderRight: i < 6 ? `1px solid ${P.border}` : 'none',
background: isToday ? 'rgba(25,195,125,0.10)' : P.card,
}}
>
<div style={{ fontSize: 12, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.6 }}>
{DAYS_FR[i]}
</div>

<div style={{
fontSize: 24,
fontWeight: 700,
fontFamily: "'DM Serif Display', serif",
color: isToday ? '#ffffff' : P.text,
lineHeight: 1.25,
marginTop: 2,
}}>
{d.getDate()}
</div>

{hasEvents && (
<div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
{getDayIndicators(dayEvents).map(([type, count]) => (
<div
key={type}
title={`${count} ${EVENT_TYPES[type]?.label || type}`}
style={{
minWidth: 16,
height: 16,
padding: '0 4px',
borderRadius: 999,
background: EVENT_TYPES[type].bg,
color: EVENT_TYPES[type].color,
fontSize: 9,
fontWeight: 700,
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
lineHeight: 1,
}}
>
{count}
</div>
))}
</div>
)}
</div>
)
})}
</div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 240 }}>
{weekDays.map((d, i) => {
const iso = toISO(d)
const dayEvents = getEventsForDay(iso)
const isToday = iso === today

return (
<div
key={i}
style={{
padding: '10px 8px',
minHeight: 150,
borderRight: i < 6 ? `1px solid ${P.border}` : 'none',
background: isToday ? 'rgba(25,195,125,0.04)' : P.card2,
}}
>
{loading ? null : dayEvents.length === 0 ? (
<div style={{ fontSize: 11, color: P.dim, textAlign: 'center', marginTop: 12 }}>—</div>
) : dayEvents.map(e => (
<EventChip key={e.id} event={e} onClick={setSelectedEvent} />
))}
</div>
)
})}
</div>
</div>
)}

{view === 'month' && (
<div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }}>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${P.border}` }}>
{DAYS_FR.map(d => (
<div key={d} style={{ padding: '12px 0', textAlign: 'center', fontSize: 12, fontWeight: 700, color: P.sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
{d}
</div>
))}
</div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
{monthDays.map((d, i) => {
if (!d) {
return (
<div
key={`empty-${i}`}
style={{
minHeight: 110,
borderRight: (i + 1) % 7 !== 0 ? `1px solid ${P.border}` : 'none',
borderBottom: `1px solid ${P.border}`,
background: '#0a0e13',
}}
/>
)
}

const iso = toISO(d)
const dayEvents = getEventsForDay(iso)
const isToday = iso === today

return (
<div
key={iso}
style={{
minHeight: 110,
padding: '8px',
borderRight: (i + 1) % 7 !== 0 ? `1px solid ${P.border}` : 'none',
borderBottom: `1px solid ${P.border}`,
background: isToday ? 'rgba(25,195,125,0.05)' : P.card2,
}}
>
<div
style={{
fontSize: 14,
fontWeight: 700,
color: isToday ? '#ffffff' : P.text,
width: 28,
height: 28,
borderRadius: '50%',
background: isToday ? 'rgba(25,195,125,0.16)' : 'transparent',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
marginBottom: 6,
}}
>
{d.getDate()}
</div>

{dayEvents.length > 0 && (
<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
{getDayIndicators(dayEvents).map(([type, count]) => (
<div
key={type}
title={`${count} ${EVENT_TYPES[type]?.label || type}`}
style={{
minWidth: 16,
height: 16,
padding: '0 4px',
borderRadius: 999,
background: EVENT_TYPES[type].bg,
color: EVENT_TYPES[type].color,
fontSize: 9,
fontWeight: 700,
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
lineHeight: 1,
}}
>
{count}
</div>
))}
</div>
)}

{dayEvents.slice(0, 3).map(e => (
<EventChip key={e.id} event={e} onClick={setSelectedEvent} />
))}

{dayEvents.length > 3 && (
<div style={{ fontSize: 10, color: P.sub, fontWeight: 700 }}>
+{dayEvents.length - 3} autres
</div>
)}
</div>
)
})}
</div>
</div>
)}

{selectedEvent && (
<div
onClick={() => setSelectedEvent(null)}
style={{
position: 'fixed',
inset: 0,
background: 'rgba(0,0,0,0.50)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
zIndex: 1000,
padding: 16,
}}
>
<div
onClick={e => e.stopPropagation()}
style={{
background: P.card,
border: `1px solid ${P.border}`,
borderRadius: 18,
padding: 24,
width: '100%',
maxWidth: 420,
boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
}}
>
{(() => {
const t = EVENT_TYPES[selectedEvent.type] || EVENT_TYPES.season
return (
<>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
<div style={{ padding: '5px 12px', borderRadius: 999, background: t.bg, color: t.color, fontSize: 12, fontWeight: 700 }}>
{t.label}
</div>
<button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: P.sub }}>×</button>
</div>

<div style={{ fontSize: 20, fontWeight: 800, color: P.text, marginBottom: 10 }}>
{selectedEvent.title}
</div>

<div style={{ fontSize: 13, color: P.sub, marginBottom: 6 }}>
📅 {parseLocalDate(selectedEvent.date).toLocaleDateString('fr-FR', {
weekday: 'long',
day: 'numeric',
month: 'long',
year: 'numeric',
})}
</div>

{selectedEvent.time && (
<div style={{ fontSize: 13, color: P.sub, marginBottom: 6 }}>
🕐 {selectedEvent.time}
</div>
)}

{selectedEvent.subtitle && (
<div style={{ fontSize: 13, color: P.sub, marginBottom: 6 }}>
⚔️ {selectedEvent.subtitle}
</div>
)}

{selectedEvent.location && (
<div style={{ fontSize: 13, color: P.sub, marginBottom: 6 }}>
📍 {selectedEvent.location}
</div>
)}

{selectedEvent.type === 'match' && isCoach && (
<button
onClick={() => {
navigate('/medical')
setSelectedEvent(null)
}}
style={{
marginTop: 18,
width: '100%',
padding: '11px',
borderRadius: 12,
border: `1px solid ${P.border}`,
background: P.card2,
color: P.text,
fontSize: 13,
fontWeight: 700,
cursor: 'pointer',
fontFamily: 'inherit',
}}
>
Voir les blessures de ce match →
</button>
)}

{selectedEvent.type === 'appointment' && isCoach && selectedEvent.raw?.athlete_id && (
<button
onClick={() => {
navigate(`/medical/${selectedEvent.raw.athlete_id}`)
setSelectedEvent(null)
}}
style={{
marginTop: 18,
width: '100%',
padding: '11px',
borderRadius: 12,
border: `1px solid ${P.border}`,
background: P.card2,
color: P.text,
fontSize: 13,
fontWeight: 700,
cursor: 'pointer',
fontFamily: 'inherit',
}}
>
Fiche médicale du joueur →
</button>
)}
</>
)
})()}
</div>
</div>
)}
</div>
</div>
)
}
