import { BrowserRouter, Routes, Route } from "react-router-dom"

import Sidebar from "./components/Sidebar"

import AujourdhuiPage from "./pages/AujourdhuiPage"
import SaisiePage from "./pages/SaisiePage"
import HistoriquePage from "./pages/HistoriquePage"

import NutritionPage from "./pages/NutritionPage"
import RecipesPage from "./pages/RecipesPage"
import RecipeDetailPage from "./pages/RecipeDetailPage"
import MealPlanPage from "./pages/MealPlanPage"

import ProgressionPage from "./pages/ProgressionPage"

export default function App() {

  return (

    <BrowserRouter>

      <div style={{display:"flex"}}>

        <Sidebar/>

        <div style={{flex:1,padding:30}}>

          <Routes>

            {/* ENTRAINEMENT */}

            <Route path="/entrainement/aujourdhui" element={<AujourdhuiPage/>}/>
            <Route path="/entrainement/libre" element={<SaisiePage/>}/>
            <Route path="/entrainement/historique" element={<HistoriquePage/>}/>

            {/* NUTRITION */}

            <Route path="/nutrition/macros" element={<NutritionPage/>}/>
            <Route path="/nutrition/plan" element={<MealPlanPage/>}/>
            <Route path="/nutrition/recettes" element={<RecipesPage/>}/>
            <Route path="/nutrition/recette/:id" element={<RecipeDetailPage/>}/>

            {/* PROGRESSION */}

            <Route path="/progression" element={<ProgressionPage/>}/>

          </Routes>

        </div>

      </div>

    </BrowserRouter>

  )
}
