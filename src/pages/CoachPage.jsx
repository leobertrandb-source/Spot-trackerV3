import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { PageWrap, Card, Btn, Input, StatCard } from '../components/UI'
import { T } from '../lib/data'

export default function CoachPage() {
  const { user, profile } = useAuth()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const coachName = profile?.full_name || user?.email || 'Coach'

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
        .select('id, full_name, email, role')
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

  const createInvite = useCallback(async () => {
    const email = inviteEmail.trim().toLowerCase()

    if (!user?.id || !email) return

    setInviteLoading(true)
    setInviteLink('')
    setErrorMessage('')

    try {
      const token =
        globalThis.crypto?.randomUUID?.().replace(/-/g, '') ||
        `${Date.now()}${Math.random().toString(36).slice(2, 10)}`

      const { error } = await supabase.from('coach_invites').insert({
        coach_id: user.id,
        email,
        invite_token: token,
        status: 'pending',
      })

      if (error) {
        throw error
      }

      setInviteLink(`${window.location.origin}/invite/${token}`)
    } catch (error) {
      console.error('Erreur invitation:', error)
      setErrorMessage(error.message || "Impossible de créer l'invitation.")
    } finally {
      setInviteLoading(false)
    }
  }, [inviteEmail, user?.id])

  const copyInviteLink = useCallback(async () => {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink)
      window.alert('Lien copié')
    } catch (error) {
      console.error('Erreur copie lien:', error)
      window.alert('Impossible de copier le lien')
    }
  }, [inviteLink])

  const stats = useMemo(() => {
    return {
      totalClients: clients.length,
      pendingInvite: inviteLink ? 1 : 0,
    }
  }, [clients.length, inviteLink])

  return (
    <PageWrap>
      <div
        style={{
          maxWidth: 1160,
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
              fontSize: 32,
              lineHeight: 1,
            }}
          >
            COACH DASHBOARD
          </div>

          <div
            style={{
              color: T.textMid,
              fontSize: 14,
              lineHeight: 1.65,
              marginTop: 10,
            }}
          >
            Bonjour {coachName}.
          </div>
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          <StatCard label="Clients actifs" value={stats.totalClients} accent />
          <StatCard label="Invitation prête" value={stats.pendingInvite} />
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)',
            gap: 18,
          }}
        >
          <Card style={{ padding: 20 }}>
            <div
              style={{
                color: T.text,
                fontFamily: T.fontDisplay,
                fontWeight: 800,
                fontSize: 18,
                marginBottom: 14,
              }}
            >
              Inviter un client
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <Input
                label="Email du client"
                value={inviteEmail}
                onChange={setInviteEmail}
                placeholder="client@email.com"
              />

              <Btn
                onClick={createInvite}
                disabled={inviteLoading || !inviteEmail.trim()}
              >
                {inviteLoading ? 'Création...' : "Générer un lien d'invitation"}
              </Btn>

              {inviteLink ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                      background: T.surface,
                      color: T.textMid,
                      fontSize: 12,
                      wordBreak: 'break-all',
                    }}
                  >
                    {inviteLink}
                  </div>

                  <Btn onClick={copyInviteLink}>Copier le lien</Btn>
                </div>
              ) : null}
            </div>
          </Card>

          <Card style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  color: T.text,
                  fontFamily: T.fontDisplay,
                  fontWeight: 800,
                  fontSize: 18,
                }}
              >
                Mes clients
              </div>

              <button
                type="button"
                onClick={loadClients}
                disabled={loading}
                style={{
                  border: `1px solid ${T.border}`,
                  background: 'rgba(255,255,255,0.03)',
                  color: T.textMid,
                  borderRadius: 12,
                  padding: '8px 12px',
                  cursor: loading ? 'default' : 'pointer',
                  fontWeight: 800,
                  fontSize: 12,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Chargement...' : 'Rafraîchir'}
              </button>
            </div>

            {loading ? (
              <div style={{ color: T.textDim, fontSize: 14 }}>
                Chargement des clients...
              </div>
            ) : clients.length === 0 ? (
              <div style={{ color: T.textMid, fontSize: 14 }}>
                Aucun client pour le moment.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {clients.map((client) => (
                  <Link
                    key={client.id}
                    to={`/coach/client/${client.id}`}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      textDecoration: 'none',
                      display: 'block',
                    }}
                  >
                    <div
                      style={{
                        color: T.text,
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      {client.full_name || 'Client'}
                    </div>

                    <div
                      style={{
                        color: T.textDim,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {client.email || 'Email non renseigné'}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageWrap>
  )
}
