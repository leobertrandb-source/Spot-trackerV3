import { useAuth } from "./AuthContext"
import { T } from "../lib/data"

export default function Topbar({ isMobile, onMenuClick }) {
  const { profile } = useAuth()
  const isCoach = profile?.role === "coach"

  return (
    <header
      style={{
        height: 70,
        borderBottom: `1px solid ${T.border}`,
        background: "rgba(10,14,13,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

        {isMobile && (
          <button
            onClick={onMenuClick}
            style={{
              fontSize: 22,
              background: "transparent",
              border: "none",
              color: T.text,
              cursor: "pointer"
            }}
          >
            ☰
          </button>
        )}

        <div style={{ fontWeight: 900 }}>
          LE SPOT
        </div>

        <div style={{ fontSize: 12, color: T.textDim }}>
          {isCoach ? "Espace coach" : "Espace athlète"}
        </div>

      </div>
    </header>
  )
}
