import { useState } from "react"
import { Link, useLocation } from "react-router-dom"

export default function Sidebar() {

  const location = useLocation()

  const [openTraining,setOpenTraining] = useState(true)
  const [openNutrition,setOpenNutrition] = useState(true)

  function Item({to,label}) {
    const active = location.pathname === to

    return (
      <Link
        to={to}
        style={{
          display:"block",
          padding:"8px 14px",
          marginBottom:4,
          borderRadius:8,
          background: active ? "#0f2f1c" : "transparent",
          color:"#e8f5ee",
          textDecoration:"none",
          fontWeight: active ? 700 : 500
        }}
      >
        {label}
      </Link>
    )
  }

  return (
    <div
      style={{
        width:230,
        background:"#0b0f0d",
        borderRight:"1px solid #1c1f1d",
        padding:20,
        height:"100vh"
      }}
    >

      <h2 style={{marginBottom:30}}>Spot Tracker</h2>

      {/* ENTRAINEMENT */}

      <div style={{marginBottom:15}}>

        <div
          onClick={()=>setOpenTraining(!openTraining)}
          style={{
            cursor:"pointer",
            fontWeight:700,
            marginBottom:6
          }}
        >
          Entraînement {openTraining ? "▾":"▸"}
        </div>

        {openTraining && (
          <div style={{paddingLeft:10}}>
            <Item to="/entrainement/aujourdhui" label="Séance du jour"/>
            <Item to="/entrainement/libre" label="Séance libre"/>
            <Item to="/entrainement/historique" label="Historique"/>
          </div>
        )}

      </div>


      {/* NUTRITION */}

      <div style={{marginBottom:15}}>

        <div
          onClick={()=>setOpenNutrition(!openNutrition)}
          style={{
            cursor:"pointer",
            fontWeight:700,
            marginBottom:6
          }}
        >
          Nutrition {openNutrition ? "▾":"▸"}
        </div>

        {openNutrition && (
          <div style={{paddingLeft:10}}>
            <Item to="/nutrition/macros" label="Suivi macros"/>
            <Item to="/nutrition/plan" label="Plan journalier"/>
            <Item to="/nutrition/recettes" label="Recettes"/>
          </div>
        )}

      </div>


      {/* PROGRESSION */}

      <div style={{marginTop:20}}>
        <Item to="/progression" label="Progression"/>
      </div>

    </div>
  )
}
