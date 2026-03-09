import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"
import { Card, Input, Btn, PageWrap, Label } from "../components/UI"
import { T } from "../lib/data"

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "")
}

export default function CoachInvitePage() {

  const { user } = useAuth()

  const [email,setEmail] = useState("")
  const [inviteLink,setInviteLink] = useState("")
  const [loading,setLoading] = useState(false)

  async function createInvite(){

    if(!email) return

    setLoading(true)

    const token = generateToken()

    const { error } = await supabase
      .from("coach_invites")
      .insert({
        coach_id:user.id,
        email,
        invite_token:token
      })

    if(error){
      console.error(error)
      setLoading(false)
      return
    }

    const link = `${window.location.origin}/invite/${token}`

    setInviteLink(link)

    setLoading(false)

  }

  function copyLink(){
    navigator.clipboard.writeText(inviteLink)
  }

  return (

    <PageWrap>

      <Card>

        <Label>Inviter un client</Label>

        <Input
          label="Email du client"
          value={email}
          onChange={setEmail}
          placeholder="client@email.com"
        />

        <Btn onClick={createInvite} disabled={loading}>
          Générer le lien
        </Btn>

        {inviteLink && (

          <div style={{marginTop:20}}>

            <Label>Lien d'invitation</Label>

            <div style={{
              background:T.surface,
              padding:10,
              borderRadius:6,
              fontSize:12
            }}>
              {inviteLink}
            </div>

            <Btn onClick={copyLink} style={{marginTop:10}}>
              Copier le lien
            </Btn>

          </div>

        )}

      </Card>

    </PageWrap>

  )

}