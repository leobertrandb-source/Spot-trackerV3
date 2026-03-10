import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Input, Badge } from '../components/UI'
import { T } from '../lib/data'

function getInitials(name = '') {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

export default function CoachClientsPage() {
  const { user, profile } = useAuth()

  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadClients = useCallback(async () => {
    if (!user?.id) {
      setClients([])
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const { data: links, error: linksError } = await supabase
        .from('coach_clients')
        .select('client_id')
        .eq('coach_id', user.id)

      if (linksError) {
        throw linksError
      }

      const ids = (links || []).map((row) => row.client_id).filter(Boolean)

      if (!ids.length) {
        setClients([])
        return
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, goal_type')
        .in('id', ids)
        .order('full_name', { ascending: true })

      if (profilesError) {
        throw profilesError
      }

      setClients(profilesData || [])
    } catch (error) {
      console.error('Erreur chargement clients:', error)
      setClients([])
      setErrorMessage("Impossible de charger les clients pour le moment.")
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return clients

    return clients.filter((client) => {
      const name = String(client.full_name || '').toLowerCase()
      const email = String(client.email || '').toLowerCase()
      const goal = String(client.goal_type || '').toLowerCase()

      return name.includes(q) || email.includes(q) || goal.includes(q)
    })
  }, [clients, search])

  const stats = useMemo(() => {
    return {
      total: clients.length,
      filtered: filteredClients.length,
      coachName: profile?.full_name || user?.email || 'Coach',
    }
  }, [clients.length, filteredClients.length, profile?.full_name, user?.email])

  return (
    <PageWrap>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gap: 18,
        }}
      >
        <Card
          glow
          style={{
            padding: '24px 22px',
            background:
              'radial-gradient(circle at 18% 18%, rgba(45,255,155,0.10), transparent 30%), linear-gradient(135deg, rgba(20,24,22,0.96), rgba(10,14,12,0.98))',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '8px 12px',
              borderRadius: 999,
              border: `1px solid ${T.accent + '28'}`,
              background: 'rgba(45,255,155,0.10)',
              color: T.accentLight,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Espace coach
          </div>

          <div
            style={{
              color: T.text,
              fontFamily: T.fontDisplay,
              fontWeight: 900,
              fontSize: 30,
              lineHeight: 1,
            }}
          >
            MES CLIENTS
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.65,
              marginTop: 10,
            }}
          >
            Suivi des athlètes liés à {stats.coachName}.
          </div>
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <Input
            label="Rechercher un client"
            value={search}
            onChange={setSearch}
            placeholder="Nom, email, objectif..."
          />

          <div
            style={{
              height: 48,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 14px',
              borderRadius: 14,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.03)',
              color: T.textMid,
              fontSize: 13,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {stats.filtered} / {stats.total} client{stats.total > 1 ? 's' : ''}
          </div>

          <button
            type="button"
            onClick={loadClients}
            disabled={loading}
            style={{
              height: 48,
              borderRadius: 14,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.03)',
              color: T.text,
              padding: '0 16px',
              cursor: loading ? 'default' : 'pointer',
              fontWeight: 800,
              fontSize: 13,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </div>

        {errorMessage ? (
          <Card
            style={{
              padding: 16,
              border: '1px solid rgba(255,120,120,0.22)',
              background: 'rgba(255,90,90,0.06)',
            }}
          >
            <div
              style={{
                color: '#FFB3B3',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              {errorMessage}
            </div>
          </Card>
        ) : null}

        <Card style={{ padding: 18 }}>
          {loading ? (
            <div style={{ color: T.textDim, fontSize: 14 }}>
              Chargement des clients...
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div
                style={{
                  color: T.text,
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                Aucun client trouvé
              </div>

              <div
                style={{
                  color: T.textMid,
                  fontSize: 14,
                }}
              >
                {clients.length === 0
                  ? "Tu n'as pas encore de client lié à ton compte."
                  : 'Aucun résultat pour cette recherche.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredClients.map((client) => (
                <Link
                  key={client.id}
                  to={`/coach/client/${client.id}`}
                  style={{
                    textDecoration: 'none',
                    display: 'grid',
                    gridTemplateColumns: '56px minmax(0, 1fr) auto',
                    gap: 14,
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderRadius: 18,
                    border: `1px solid ${T.border}`,
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(45,255,155,0.10)',
                      border: `1px solid ${T.accent + '28'}`,
                      color: T.accentLight,
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {getInitials(client.full_name || client.email || 'CL')}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: T.text,
                        fontWeight: 800,
                        fontSize: 15,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {client.full_name || 'Client'}
                    </div>

                    <div
                      style={{
                        color: T.textDim,
                        fontSize: 13,
                        marginTop: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {client.email || 'Email non renseigné'}
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge>{client.role || 'athlete'}</Badge>
                      {client.goal_type ? <Badge color={T.blue}>{client.goal_type}</Badge> : null}
                    </div>
                  </div>

                  <div
                    style={{
                      color: T.textMid,
                      fontSize: 13,
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Voir la fiche →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageWrap>
  )
}
