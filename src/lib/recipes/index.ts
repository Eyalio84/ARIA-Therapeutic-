import { registerRecipe } from "../recipeRunner"
import { calculatorRecipe } from "./calculator"
import { quizRecipe } from "./quiz"
import { trafficLightRecipe } from "./trafficLight"
import { moodTrackerRecipe } from "./moodTracker"
import { catchGameRecipe } from "./catchGame"

export function initRecipes() {
  registerRecipe(calculatorRecipe)
  registerRecipe(quizRecipe)
  registerRecipe(trafficLightRecipe)
  registerRecipe(moodTrackerRecipe)
  registerRecipe(catchGameRecipe)
}

export { calculatorRecipe, quizRecipe, trafficLightRecipe, moodTrackerRecipe, catchGameRecipe }
