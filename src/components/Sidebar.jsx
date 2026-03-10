import { Link, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { T } from "../lib/data"

export default function Sidebar({ isMobile = false, mobileOpen = false, onClose }) {

  const location = useLocation()
  const { profile } = useAuth()

  const isCoach = profile?.role === "coach"

  const coachLinks = [
    { to: "/coach", label: "Dashboard coach" },
    { to: "/coach/clients", label: "Clients" },
    { to: "/programmes", label: "Programmes" }
  ]

  const athleteLinks = [
    { to: "/mon-espace", label: "Mon espace" },
    { to: "/entrainement/aujourdhui", label: "Séance du jour" },
    { to: "/entrainement/libre", label: "Séance libre" },
    { to: "/entrainement/historique", label: "Historique" },
    { to: "/nutrition/macros", label: "Nutrition" },
    { to: "/nutrition/recettes", label: "Recettes" },
    { to: "/nutrition/plan", label: "Plan repas" },
    { to: "/progression", label: "Progression" }
  ]

  const links = isCoach ? coachLinks : athleteLinks

  const sidebarContent = (
    <aside
      style={{
        width: 280,
        height: "100dvh",
        background: "rgba(12,16,15,0.98)",
        borderRight: `1px solid ${T.border}`,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}
    >
      {links.map((item) => {

        const active = location.pathname.startsWith(item.to)

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={isMobile ? onClose : undefined}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              textDecoration: "none",
              background: active ? "rgba(45,255,155,0.1)" : "transparent",
              color: T.text
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </aside>
  )

  if (!isMobile) return sidebarContent

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 50
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          left: mobileOpen ? 0 : -300,
          top: 0,
          transition: "left .25s",
          zIndex: 60
        }}
      >
        {sidebarContent}
      </div>
    </>
  )
}
