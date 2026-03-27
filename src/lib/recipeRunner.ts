/**
 * Recipe Runner — Aria-Guided Tutorial System
 *
 * Loads JSON recipe files and executes them step-by-step,
 * calling handleFunction() for each action. Between steps,
 * displays narration and explanation text for the user.
 *
 * Recipes are ordered lists of steps. Each step has:
 * - title: what this step does
 * - aria_says: what Aria would narrate (voice TTS or text display)
 * - actions: array of { fn, args } to call via handleFunction
 * - explain: educational context about WHY this step matters
 * - pause: whether to wait for user "Next" before continuing
 */

export interface RecipeAction {
  fn: string
  args: Record<string, any>
}

export interface RecipeStep {
  step: number
  title: string
  aria_says: string
  actions: RecipeAction[]
  explain: string
  pause?: boolean  // default true
}

export interface Recipe {
  id: string
  name: string
  description: string
  difficulty: "beginner" | "intermediate" | "advanced"
  estimated_steps: number
  objects_used: string[]
  logic_used: string[]
  icon: string
  steps: RecipeStep[]
}

export interface RunnerState {
  recipe: Recipe
  stepIndex: number
  running: boolean
  completed: boolean
  stepStatus: "ready" | "executing" | "explaining" | "done"
}

/**
 * Execute a single step's actions sequentially.
 * Returns a promise that resolves when all actions are done.
 */
/**
 * Execute a single step's actions sequentially.
 * After each creation action (add_*), waits an extra frame for React to sync selectedRef.
 * Returns a promise that resolves when all actions are done.
 */
export async function executeStep(
  step: RecipeStep,
  handleFunction: (name: string, args: Record<string, any>) => Promise<{ narrative: string }>,
  delayBetweenActions: number = 400,
): Promise<string[]> {
  const narratives: string[] = []

  for (let i = 0; i < step.actions.length; i++) {
    const action = step.actions[i]
    try {
      const result = await handleFunction(action.fn, action.args)
      narratives.push(result.narrative)
    } catch (e) {
      narratives.push(`Error: ${action.fn} failed`)
    }

    // After creation actions, wait extra for React to update selectedRef
    const isCreation = action.fn.startsWith("add_")
    const delay = isCreation ? Math.max(delayBetweenActions, 500) : delayBetweenActions

    if (i < step.actions.length - 1 && delay > 0) {
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  return narratives
}

/**
 * Get all available recipes (built-in).
 * In the future this could also load from files/network.
 */
export function getAvailableRecipes(): Recipe[] {
  return BUILT_IN_RECIPES
}

// Built-in recipes are imported from separate files
// For now they're inline — will be loaded from /public/recipes/ in production
export const BUILT_IN_RECIPES: Recipe[] = []

/**
 * Register a recipe (called during initialization).
 */
export function registerRecipe(recipe: Recipe) {
  const existing = BUILT_IN_RECIPES.findIndex((r) => r.id === recipe.id)
  if (existing >= 0) BUILT_IN_RECIPES[existing] = recipe
  else BUILT_IN_RECIPES.push(recipe)
}
