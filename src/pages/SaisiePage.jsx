import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { PageWrap, Card, Btn, Input, Badge } from "../components/UI"
import { useAuth } from "../components/AuthContext"
import { T } from "../lib/data"

function roundWeight(v) {
  return Math.round(v * 2) / 2
}

function computeSuggestion(lastSet) {

  if (!lastSet) return null

  const weight = Number(lastSet.weight || 0)
  const reps = Number(lastSet.reps || 0)
  const rpe = Number(lastSet.rpe || 8)

  let suggestedWeight = weight
  let suggestedReps = reps
  let reason = "Maintien"

  if (rpe <= 7) {
    suggestedWeight = roundWeight(weight * 1.03)
    reason = "Charge augmentée"
  }

  else if (rpe <= 8.5 && reps < 10) {
    suggestedReps = reps + 1
    reason = "Ajout répétition"
  }

  else if (rpe <= 8.5) {
    suggestedWeight = roundWeight(weight * 1.025)
    reason = "Progression charge"
  }

  else if (rpe > 9.3) {
    suggestedWeight = roundWeight(weight * 0.95)
    reason = "Deload conseillé"
  }

  return {
    weight: suggestedWeight,
    reps: suggestedReps,
    reason
  }
}

export default function SaisiePage() {

  const { user } = useAuth()

  const [exercises,setExercises] = useState([])
  const [search,setSearch] = useState("")
  const [selected,setSelected] = useState(null)
  const [sets,setSets] = useState([])
  const [suggestion,setSuggestion] = useState(null)

  async function loadExercises(){

    const { data } = await supabase
      .from("exercises")
      .select("*")
      .order("name")

    setExercises(data || [])

  }

  async function loadHistory(exercise){

    const { data } = await supabase
      .from("sets")
      .select("*")
      .eq("exercise",exercise)
      .order("created_at",{ascending:false})
      .limit(1)

    const last = data?.[0]

    setSuggestion(computeSuggestion(last))

  }

  useEffect(()=>{
    loadExercises()
  },[])

  function addSet(){

    setSets([
      ...sets,
      { weight:"", reps:"", rpe:"" }
    ])

  }

  function updateSet(i,key,val){

    const copy=[...sets]

    copy[i][key]=val

    setSets(copy)

  }

  async function saveSession(){

    if(!selected) return

    for(const s of sets){

      await supabase.from("sets").insert({
        user_id:user.id,
        exercise:selected.name,
        weight:Number(s.weight),
        reps:Number(s.reps),
        rpe:Number(s.rpe)
      })

    }

    setSets([])

    alert("Séance enregistrée")

  }

  const filtered = exercises.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (

    <PageWrap>

      <div style={{maxWidth:900,margin:"auto",display:"grid",gap:18}}>

        <Card>

          <div style={{fontWeight:900,fontSize:22}}>
            Séance libre
          </div>

          <div style={{marginTop:10,color:T.textDim}}>
            Choisis un exercice et enregistre tes séries
          </div>

        </Card>

        {!selected && (

          <Card>

            <Input
              placeholder="Rechercher exercice..."
              value={search}
              onChange={setSearch}
            />

            <div style={{marginTop:16,display:"grid",gap:8}}>

              {filtered.slice(0,20).map(ex=>{

                const image = ex.image_url

                return(

                  <div
                    key={ex.id}
                    onClick={()=>{

                      setSelected(ex)

                      loadHistory(ex.name)

                    }}
                    style={{
                      display:"flex",
                      alignItems:"center",
                      gap:12,
                      padding:12,
                      border:`1px solid ${T.border}`,
                      borderRadius:14,
                      cursor:"pointer"
                    }}
                  >

                    {image && (

                      <img
                        src={image}
                        alt=""
                        style={{
                          width:52,
                          height:52,
                          borderRadius:10,
                          objectFit:"cover"
                        }}
                      />

                    )}

                    <div style={{fontWeight:700}}>
                      {ex.name}
                    </div>

                  </div>

                )

              })}

            </div>

          </Card>

        )}

        {selected && (

          <Card>

            <div style={{fontWeight:900,fontSize:20}}>
              {selected.name}
            </div>

            {suggestion && (

              <div
                style={{
                  marginTop:12,
                  padding:12,
                  borderRadius:12,
                  background:"rgba(45,255,155,0.08)",
                  border:`1px solid ${T.accent}`
                }}
              >

                <div style={{fontWeight:800}}>
                  Coach intelligent
                </div>

                <div style={{marginTop:4}}>
                  Suggestion : {suggestion.weight} kg × {suggestion.reps}
                </div>

                <div style={{fontSize:12,color:T.textDim}}>
                  {suggestion.reason}
                </div>

              </div>

            )}

            <div style={{marginTop:16,display:"grid",gap:10}}>

              {sets.map((s,i)=>(

                <div
                  key={i}
                  style={{
                    display:"grid",
                    gridTemplateColumns:"1fr 1fr 1fr",
                    gap:8
                  }}
                >

                  <Input
                    placeholder="kg"
                    value={s.weight}
                    onChange={v=>updateSet(i,"weight",v)}
                  />

                  <Input
                    placeholder="reps"
                    value={s.reps}
                    onChange={v=>updateSet(i,"reps",v)}
                  />

                  <Input
                    placeholder="RPE"
                    value={s.rpe}
                    onChange={v=>updateSet(i,"rpe",v)}
                  />

                </div>

              ))}

            </div>

            <div style={{display:"flex",gap:10,marginTop:16}}>

              <Btn onClick={addSet}>
                Ajouter série
              </Btn>

              <Btn
                variant="secondary"
                onClick={saveSession}
              >
                Sauvegarder
              </Btn>

            </div>

          </Card>

        )}

      </div>

    </PageWrap>

  )

}
