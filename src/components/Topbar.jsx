import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { T } from '../lib/data'

const ROUTE_META = {
'/mon-espace': {
title: 'Mon espace',
subtitle: 'Ton dashboard personnalisé du jour',
},
'/objectif': {
title: 'Objectif',
subtitle: 'Choisis et ajuste ton parcours',
},
'/entrainement/aujourdhui': {
title: 'Séance du jour',
subtitle: 'Ton focus training du moment',
},
'/entrainement/libre': {
title: 'Séance libre',
subtitle: 'Construis ou saisis librement ta séance',
},
'/entrainement/historique': {
title: 'Historique',
subtitle: 'Retrouve tes séances précédentes',
},
'/nutrition/macros': {
title: 'Nutrition',
subtitle: 'Suivi des macros et hydratation',
},
'/nutrition/plan': {
title: 'Plan journalier',
subtitle: 'Organisation intelligente de ta journée',
},
'/nutrition/recettes': {
title: 'Recettes',
subtitle: 'Bibliothèque premium de recettes ajustables',
},
'/progression': {
title: 'Progression',
subtitle: 'Suivi de ton évolution',
},
'/coach': {
title: 'Vue coach',
subtitle: 'Suivi des athlètes et pilotage',
},
'/programmes': {
title: 'Programmes',
subtitle: 'Construction et gestion des programmes',
},
'/programme/bodybuilding': {
title: 'Programme',
subtitle: 'Prise de masse',
},
'/programme/perte-de-poids': {
title: 'Programme',
subtitle: 'Perte de poids',
},
'/programme/athletique': {
title: 'Programme',
subtitle: 'Athlétique',
},
}

function getMeta(pathname) {
if (ROUTE_META[pathname]) return ROUTE_META[pathname]

if (pathname.startsWith('/nutrition/recette/')) {
return {
title: 'Recette',
subtitle: 'Ajuste les calories et les quantités',
}
}

return {
title: 'Spot Training',
subtitle: 'Plateforme coaching premium',
}
}

export default function Topbar() {
const location = useLocation()
const { profile } = useAuth()

const meta = getMeta(location.pathname)
const goalLabel =
profile?.goal_type === 'mass_gain'
? 'Mass Gain'
: profile?.goal_type === 'fat_loss'
? 'Fat Loss'
: profile?.goal_type === 'athletic'
? 'Athletic'
: 'Setup'

return (
<header
style={{
position: 'sticky',
top: 0,
zIndex: 20,
padding: '16px 18px 14px',
background:
'linear-gradient(180deg, rgba(10,12,11,0.92), rgba(10,12,11,0.72))',
borderBottom: '1px solid rgba(255,255,255,0.06)',
backdropFilter: 'blur(16px)',
}}
>
<div
style={{
display: 'flex',
alignItems: 'center',
justifyContent: 'space-between',
gap: 18,
flexWrap: 'wrap',
}}
>
<div>
<div
style={{
color: T.text,
fontSize: 28,
fontWeight: 900,
letterSpacing: 0.8,
lineHeight: 1,
}}
>
{meta.title}
</div>

<div
style={{
color: T.textMid,
fontSize: 14,
marginTop: 8,
lineHeight: 1.5,
}}
>
{meta.subtitle}
</div>
</div>

<div
style={{
display: 'flex',
alignItems: 'stretch',
gap: 10,
flexWrap: 'wrap',
}}
>
<div style={glassPillStyle}>
<div style={pillLabelStyle}>Objectif</div>
<div style={pillValueStyle}>{goalLabel}</div>
</div>

<div style={glassPillStyle}>
<div style={pillLabelStyle}>Espace</div>
<div style={pillValueStyle}>Le Spot</div>
</div>
</div>
</div>
</header>
)
}

const glassPillStyle = {
minWidth: 130,
padding: '10px 12px',
borderRadius: 18,
border: '1px solid rgba(255,255,255,0.08)',
background: 'linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))',
boxShadow: '0 14px 24px rgba(0,0,0,0.18)',
backdropFilter: 'blur(12px)',
}

const pillLabelStyle = {
fontSize: 10,
fontWeight: 800,
letterSpacing: 1.1,
textTransform: 'uppercase',
color: '#8E9B94',
marginBottom: 6,
}

const pillValueStyle = {
fontSize: 13,
fontWeight: 800,
color: '#EAF2ED',
}
