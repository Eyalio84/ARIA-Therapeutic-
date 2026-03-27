# Therapeutic Narrative Game Engine — Psychology Research Backup

## Date: 2026-03-20
## Purpose: Ground the Week 2 game engine design in evidence-based psychology

---

## 1. Narrative Therapy (Michael White & David Epston, 1980s)

### Core Techniques
- **Externalizing**: Separate person from problem. "Anxiety visits me" not "I am anxious." In-game: character's obstacles externalize user's struggles.
- **Unique outcomes**: Moments contradicting the problem story. System should amplify when character does something brave/resourceful.
- **Re-authoring**: Co-constructing preferred narratives. Game-building IS re-authoring.

### Effective Question Patterns
- Landscape of action: "What happened?"
- Landscape of identity: "What does this say about what matters to you?"
- Never impose interpretation — let user make meaning.

### Risks
- Re-traumatization without safeguards
- AI imposing interpretations (critical risk)
- Oversimplification of complex issues
- Not suitable for crisis situations
- Cultural mismatch (Western individualism bias)

### Sources
- White & Epston — "Narrative Means to Therapeutic Ends" (1990)
- Dulwich Centre (Adelaide)
- Carey & Russell — re-authoring questions
- David Crenshaw — projective storytelling with resistant children

---

## 2. Game-Based Therapy for Children/Adolescents

### Validated Games
- **MindLight**: As effective as CBT for children's anxiety
- **SPARX**: CBT embedded in gameplay, validated for adolescent depression
- **Silver**: Improved cognitive vulnerability in adolescents (2024)

### Age Considerations
- **10-14**: Simpler narratives, clear choices, more scaffolding. Not purely abstract.
- **15-18**: Greater autonomy, complex characters, subtler guidance. Must NOT feel childish.
- **Adults**: Full range, can toggle fiction/reality.

### Key Finding
35% of therapists using therapeutic games reported REDUCED BARRIERS to abuse disclosure. Games = "third party in the room."

### Counterproductive Mechanics
- Competitive mechanics, streaks, loss aversion
- "Your character misses you" notifications
- Points undermining intrinsic motivation
- Addictive engagement loops

### Sources
- JMIR Mental Health (2025) — systematic review
- JMIR Serious Games (2024) — Silver game
- Scholten et al. — MindLight RCT
- PMC (2021) — "Vil Du?!" therapeutic game

---

## 3. Projective Techniques

### Good Projective Prompts
- Genuinely ambiguous (multiple valid interpretations)
- Don't suggest "correct" response
- Culturally neutral
- Enough structure to engage, enough openness for expression

### Bad Projective Prompts
- Suggest specific emotions ("Tell me about rejection")
- Embed assumptions ("Why are you angry at family?")
- Push toward disclosure before trust established
- Lead to over-interpretation

### Optimal Distance by Age
- Under 11: Maximum distance — fantasy, animal characters, magical worlds
- 11-14: Moderate — fictional humans in relatable situations
- 15-18: Flexible — can toggle fiction/reality
- Adults: Full range

### Critical Rule
System must NEVER interpret what choices "mean" — that's diagnosis, requires license.

### Sources
- Henry Murray & Christiana Morgan — TAT (1935)
- Robert Landy — aesthetic distance
- PMC (2024) — projective techniques in digital era
- Crenshaw — projective storytelling

---

## 4. Therapeutic Question Design

### SFBT Patterns (translate to game design)
- **Miracle Question** → "If character's challenge was gone tomorrow, what's different?"
- **Exception Question** → "Has character ever found a way through something similar?"
- **Scaling Question** → "Character's courage is at 4. What moves it to 5?"
- **Coping Question** → "What's been keeping your character going?"

### OARS (Aria's conversational style)
- **Open** questions (invite their story)
- **Affirmations** (genuine, not formulaic)
- **Reflections** (mirror back)
- **Summaries** (at transitions)

### Questions AI Must NEVER Ask
1. Direct diagnostic questions
2. Trauma excavation
3. Suicidal ideation assessment (detect + route, never assess)
4. Questions implying diagnosis
5. Medication questions
6. Challenging coping mechanisms
7. Leading questions with embedded assumptions

### Handling Unexpected Emotional Responses
- Acknowledge without analyzing: "That question brought up something important"
- Offer choice: "Keep exploring or do something different?"
- Normalize: "Stories sometimes bring up real feelings — that's okay"
- Always provide exit ramp
- Crisis → immediate resources (not after more questions)

### Sources
- de Shazer & Berg — SFBT, Milwaukee
- Miller & Rollnick — Motivational Interviewing (1991)

---

## 5. AI-Assisted Therapy Research

### Documented Failures
- **Woebot** (shut down June 2025): Couldn't assess severity, assumed neurotypicality
- **Brown University (Oct 2025)**: 15 ethical failures across 137 sessions
- **NEDA**: Chatbot gave eating disorder users dieting tips

### APA Ethical Guidelines (June 2025)
- Informed consent and transparency
- Human autonomy (augment, not replace)
- Bias and fairness
- Professional oversight
- Beneficence/Nonmaleficence

### What AI Must NEVER Do
1. Claim to be a therapist
2. Conduct diagnostic assessments
3. Provide treatment recommendations
4. Attempt crisis intervention without routing to humans
5. Use deceptive empathy
6. Challenge delusions
7. Store sensitive data without consent
8. Create dependency
9. Discourage seeking human help
10. Use therapeutic data for other purposes

### Sources
- Brown University (2025)
- APA (June 2025)
- Stanford HAI
- California SB 243

---

## 6. Creative Expression as Therapy

### Aesthetic Distance (Robert Landy)
- **Under-distance**: Overwhelmed, flooded, no separation
- **Over-distance**: Detached, intellectualized, no connection
- **Aesthetic distance (optimal)**: Close enough to feel, distant enough to reflect

### Maps to Three Transparency Modes
- A (Implicit) = Maximum distance — safest for resistant/young users
- B (Subtle) = Moderate distance — bridges fiction and reality
- C (Explicit) = Minimum distance — requires trust and readiness

### Sand Tray Therapy Parallels
- Users create miniature worlds = game world-building
- Meta-analysis: significant improvements across child and adult mental health
- Broad prompts work best: "Create a world" not "Show me what scares you"
- Early creations chaotic → later ones organized = therapeutic progress indicator

### Sources
- Robert Landy — NYU drama therapy
- Phil Jones — distancing continuum
- APA PsycNet (2022) — sandplay meta-analysis

---

## 7. Safety for Minors

### Regulatory
- **COPPA** (amended April 2025, compliance April 2026): Parental consent for under-13
- **California SB 243** (effective July 2027): AI chatbot protocols for minors, annual reporting
- Data minimization, encryption, never use for training

### Disclosure Protocol
- Games WILL surface disclosures (research shows this)
- Do not probe further
- Acknowledge gently
- Provide crisis resources
- Alert human oversight layer if possible

### Design Without Manipulation
- No dark patterns, streaks, FOMO, loss aversion
- All engagement from genuine interest
- Voluntary participation always
- Co-design with target age group

### Parental Involvement
- Summaries (not full transcripts — preserve therapeutic trust)
- Boundary-setting powers
- 64% of US teens use AI for emotional support; only 51% of parents knew

### Sources
- FTC COPPA (2025)
- California SB 243
- UNICEF Innocenti (2025)
- Georgetown Law Tech Institute

---

## Cross-Cutting Design Principles

### Non-Negotiables
1. Aria is creative companion, NEVER therapist (architecturally enforced)
2. Crisis detection with human routing from day one
3. COPPA compliance and age-appropriate experiences
4. System never interprets/diagnoses/analyzes psychological meaning of choices

### Core Therapeutic Mechanism
5. Game-building IS therapy (like sand tray)
6. Aesthetic distance = primary safety mechanism
7. Users control their own distance level
8. Follow user's lead (suggest, never direct)

### Question Framework
9. SFBT patterns as backbone (miracle, exception, scaling, coping)
10. OARS as conversational style
11. Every deep question has exit ramp
12. Pace responsively, err toward lighter

### Safety Architecture
13. Pattern detection for disclosures in game content
14. Parental oversight without destroying trust
15. Data minimization and encryption
16. Annual review against evolving regulations
