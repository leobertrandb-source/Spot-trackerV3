import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'

const C = {
  bg:     '#080808',
  card:   'rgba(12,16,24,0.85)',
  border: 'rgba(255,255,255,0.08)',
  text:   '#edf2f7',
  sub:    '#7a8fa6',
  dim:    '#3d4f61',
  accent: '#3ecf8e',
  red:    '#f87171',
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  )
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit', border: 'none',
      background: active ? C.accent : 'rgba(255,255,255,0.06)',
      color: active ? '#080808' : C.sub,
      transition: 'all 0.15s',
    }}>{label}</button>
  )
}

export default function PrivacyPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState('politique')
  const [deleting, setDeleting] = useState(false)
  const [deleteStep, setDeleteStep] = useState(0) // 0: idle, 1: confirm, 2: done
  const [exporting, setExporting] = useState(false)

  // ── Suppression du compte ─────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (deleteStep === 0) { setDeleteStep(1); return }
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setDeleteStep(2)
      setTimeout(() => navigate('/'), 2000)
    } catch (e) {
      alert(`Erreur : ${e.message}`)
    }
    setDeleting(false)
  }

  // ── Export des données ────────────────────────────────────────────────────
  async function handleExportData() {
    if (!user?.id) return
    setExporting(true)
    try {
      const [
        { data: profile },
        { data: sessions },
        { data: hooper },
        { data: injuries },
        { data: appts },
        { data: attendance },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('sessions').select('*').eq('user_id', user.id),
        supabase.from('hooper_logs').select('*').eq('user_id', user.id),
        supabase.from('medical_injuries').select('*').eq('athlete_id', user.id),
        supabase.from('medical_appointments').select('*').eq('athlete_id', user.id),
        supabase.from('training_attendance').select('*').eq('athlete_id', user.id),
      ])

      const exportData = {
        export_date: new Date().toISOString(),
        profile,
        sessions: sessions || [],
        hooper: hooper || [],
        medical_injuries: injuries || [],
        medical_appointments: appts || [],
        training_attendance: attendance || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `atlyo-mes-donnees-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(`Erreur lors de l'export : ${e.message}`)
    }
    setExporting(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif', padding: '32px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub, fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0, fontFamily: 'inherit' }}>
            ← Retour
          </button>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.text }}>
            atl<span style={{ color: C.accent }}>yo</span> — Informations légales
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>Dernière mise à jour : mars 2026</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          <Tab label="Politique de confidentialité" active={tab === 'politique'} onClick={() => setTab('politique')} />
          <Tab label="Mentions légales" active={tab === 'mentions'} onClick={() => setTab('mentions')} />
          <Tab label="Mes droits" active={tab === 'droits'} onClick={() => setTab('droits')} />
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '32px 28px', backdropFilter: 'blur(24px)' }}>

          {/* ── POLITIQUE DE CONFIDENTIALITÉ ── */}
          {tab === 'politique' && (
            <>
              <Section title="1. Responsable du traitement">
                <p>Atlyo est édité par Léo Bertrand, préparateur physique indépendant, domicilié dans les Landes (France).</p>
                <p style={{ marginTop: 8 }}>Contact : <a href="mailto:contact@atlyo.fr" style={{ color: C.accent }}>contact@atlyo.fr</a></p>
              </Section>

              <Section title="2. Données collectées">
                <p><strong style={{ color: C.text }}>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone (optionnel), poste sportif.</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: C.text }}>Données de santé :</strong> composition corporelle (poids, masse grasse, masse musculaire), questionnaire de bien-être quotidien (HOOPER), historique de blessures, rendez-vous médicaux, notes paramédicales. Ces données constituent des données de santé au sens de l'article 9 du RGPD et bénéficient d'une protection renforcée.</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: C.text }}>Données sportives :</strong> charge d'entraînement, GPS PlayerTek, présences aux entraînements.</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: C.text }}>Données de connexion :</strong> identifiant de session, date et heure de connexion.</p>
              </Section>

              <Section title="3. Finalités du traitement">
                <p>Les données sont utilisées exclusivement pour :</p>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>Assurer le suivi physique et médical des athlètes</li>
                  <li>Permettre la communication entre le staff et les athlètes</li>
                  <li>Générer des statistiques de performance individuelles</li>
                  <li>Envoyer des notifications liées au suivi</li>
                </ul>
              </Section>

              <Section title="4. Base légale">
                <p>Le traitement des données est fondé sur :</p>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li><strong style={{ color: C.text }}>Consentement explicite</strong> pour les données de santé (article 9.2.a du RGPD)</li>
                  <li><strong style={{ color: C.text }}>Exécution d'un contrat</strong> pour les données nécessaires à la fourniture du service</li>
                  <li><strong style={{ color: C.text }}>Intérêt légitime</strong> pour la sécurité et la prévention des blessures</li>
                </ul>
              </Section>

              <Section title="5. Hébergement et transfert de données">
                <p>Les données sont hébergées par <strong style={{ color: C.text }}>Supabase</strong> sur des serveurs situés dans l'Union Européenne (région eu-west). Aucun transfert de données hors UE n'est effectué.</p>
                <p style={{ marginTop: 8 }}>L'analyse des bilans InBody utilise l'API OpenAI (GPT-4o-mini). Les images sont transmises de façon temporaire et ne sont pas conservées par OpenAI au-delà du traitement.</p>
              </Section>

              <Section title="6. Durée de conservation">
                <p>Les données sont conservées pendant toute la durée du compte et supprimées dans un délai de 30 jours suivant la demande de suppression ou la fermeture du compte.</p>
              </Section>

              <Section title="7. Partage des données">
                <p>Les données personnelles ne sont jamais vendues ni partagées avec des tiers à des fins commerciales. Elles sont accessibles uniquement au staff autorisé (préparateur physique, staff médical) dans le cadre du suivi de l'athlète concerné.</p>
              </Section>

              <Section title="8. Sécurité">
                <p>Les données sont protégées par :</p>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>Chiffrement en transit (HTTPS/TLS)</li>
                  <li>Chiffrement au repos côté Supabase</li>
                  <li>Contrôle d'accès par Row Level Security (RLS)</li>
                  <li>Authentification sécurisée via Supabase Auth</li>
                </ul>
              </Section>
            </>
          )}

          {/* ── MENTIONS LÉGALES ── */}
          {tab === 'mentions' && (
            <>
              <Section title="Éditeur">
                <p>Atlyo est édité par Léo Bertrand, entrepreneur individuel.</p>
                <p style={{ marginTop: 8 }}>Adresse : Landes (40), France</p>
                <p style={{ marginTop: 4 }}>Email : <a href="mailto:contact@atlyo.fr" style={{ color: C.accent }}>contact@atlyo.fr</a></p>
              </Section>

              <Section title="Hébergement">
                <p><strong style={{ color: C.text }}>Application :</strong> Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, USA (serveurs européens).</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: C.text }}>Base de données :</strong> Supabase Inc., région EU West (Irlande).</p>
              </Section>

              <Section title="Propriété intellectuelle">
                <p>L'ensemble du contenu d'Atlyo (code source, design, textes, logos) est la propriété exclusive de Léo Bertrand. Toute reproduction sans autorisation est interdite.</p>
              </Section>

              <Section title="Cookies">
                <p>Atlyo utilise uniquement des cookies de session strictement nécessaires au fonctionnement de l'authentification. Aucun cookie publicitaire ou de tracking n'est utilisé.</p>
              </Section>

              <Section title="Droit applicable">
                <p>Les présentes mentions légales sont soumises au droit français. Tout litige sera soumis aux juridictions compétentes du ressort du tribunal de Dax (40).</p>
              </Section>
            </>
          )}

          {/* ── MES DROITS ── */}
          {tab === 'droits' && (
            <>
              <Section title="Vos droits RGPD">
                <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
                <ul style={{ marginTop: 12, paddingLeft: 20 }}>
                  <li style={{ marginBottom: 8 }}><strong style={{ color: C.text }}>Droit d'accès</strong> — obtenir une copie de vos données personnelles</li>
                  <li style={{ marginBottom: 8 }}><strong style={{ color: C.text }}>Droit de rectification</strong> — corriger des données inexactes</li>
                  <li style={{ marginBottom: 8 }}><strong style={{ color: C.text }}>Droit à l'effacement</strong> — supprimer votre compte et toutes vos données</li>
                  <li style={{ marginBottom: 8 }}><strong style={{ color: C.text }}>Droit à la portabilité</strong> — exporter vos données dans un format lisible</li>
                  <li style={{ marginBottom: 8 }}><strong style={{ color: C.text }}>Droit d'opposition</strong> — vous opposer à certains traitements</li>
                  <li><strong style={{ color: C.text }}>Droit de retrait du consentement</strong> — retirer votre consentement à tout moment</li>
                </ul>
                <p style={{ marginTop: 12 }}>Pour toute demande : <a href="mailto:contact@atlyo.fr" style={{ color: C.accent }}>contact@atlyo.fr</a></p>
                <p style={{ marginTop: 8 }}>Vous pouvez également introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noreferrer" style={{ color: C.accent }}>CNIL</a>.</p>
              </Section>

              {user && (
                <>
                  <div style={{ height: 1, background: C.border, margin: '24px 0' }} />

                  {/* Export des données */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>📥 Exporter mes données</div>
                    <div style={{ fontSize: 13, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>
                      Téléchargez une copie de toutes vos données personnelles (profil, séances, HOOPER, données médicales, présences) au format JSON.
                    </div>
                    <button onClick={handleExportData} disabled={exporting} style={{
                      padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      cursor: exporting ? 'default' : 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${C.accent}`, background: 'transparent',
                      color: C.accent, opacity: exporting ? 0.7 : 1,
                    }}>
                      {exporting ? 'Export en cours...' : '📥 Télécharger mes données'}
                    </button>
                  </div>

                  {/* Suppression du compte */}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.red, marginBottom: 6 }}>🗑️ Supprimer mon compte</div>
                    <div style={{ fontSize: 13, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>
                      La suppression est définitive et irréversible. Toutes vos données personnelles, médicales et sportives seront effacées dans un délai de 30 jours.
                    </div>

                    {deleteStep === 2 ? (
                      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 13, color: C.red, fontWeight: 600 }}>
                        ✓ Compte supprimé. Redirection...
                      </div>
                    ) : deleteStep === 1 ? (
                      <div>
                        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 13, color: C.red, marginBottom: 12 }}>
                          ⚠️ Cette action est irréversible. Confirmez-vous la suppression définitive de votre compte et de toutes vos données ?
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => setDeleteStep(0)} style={{
                            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                            border: `1px solid ${C.border}`, background: 'transparent', color: C.sub,
                          }}>Annuler</button>
                          <button onClick={handleDeleteAccount} disabled={deleting} style={{
                            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                            cursor: deleting ? 'default' : 'pointer', fontFamily: 'inherit',
                            border: `1px solid ${C.red}`, background: 'rgba(248,113,113,0.1)',
                            color: C.red, opacity: deleting ? 0.7 : 1,
                          }}>
                            {deleting ? 'Suppression...' : '✓ Confirmer la suppression'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={handleDeleteAccount} style={{
                        padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        border: `1px solid rgba(248,113,113,0.4)`, background: 'rgba(248,113,113,0.08)',
                        color: C.red,
                      }}>
                        🗑️ Supprimer mon compte
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
