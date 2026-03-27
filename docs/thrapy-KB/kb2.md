# Structured Communication Knowledge Base for a Therapist-Guided Narrative Game Mental Health App

***

## Executive Summary

This knowledge base is designed to power the voice interview and NPC interaction system of a therapist-guided narrative game app targeting mental health support. It draws from therapeutic communication science, motivational interviewing (MI), narrative therapy, trauma-informed care, and a rapidly expanding body of research on role-playing games (RPGs) and gamification in clinical settings. Every communication rule herein has a clinical grounding, and every game design principle reflects published evidence.

**Core thesis**: The game's voice interview and NPC system must operate as a *therapeutic communicator* â€” not a therapist â€” using validated language principles to build safety, invite self-disclosure, and allow the user to project their inner world onto fictional characters without ever feeling interrogated, diagnosed, or cornered.

***

## Part I: Why Game-Based Narrative Works for Mental Health

### The Clinical Foundation

Tabletop role-playing games (TTRPGs) and serious games are now formally recognized as evidence-based adjacent interventions[^1]. A 2025 APA *Monitor on Psychology* article confirmed that TTRPGs show promise for improving symptoms across anxiety, depression, trauma, and ADHD, with research reporting "improved mood and engagement" and reduced isolation following play[^2][^1]. Gamified interventions receive support in a 2025 systematic review published in the *International Journal of Social Psychiatry*, which found "encouraging preliminary outcomes in improving engagement, adherence, and short-term therapeutic results across multiple psychiatric conditions"[^3].

The **SPARX** game â€” a 7-module CBT-embedded RPG developed in New Zealand for adolescent depression â€” demonstrated in a landmark BMJ randomized controlled trial that it was non-inferior to face-to-face treatment-as-usual for adolescents with depressive symptoms[^4]. SPARX reduced depression, anxiety, hopelessness, and improved quality of life, with changes lasting at least three months[^5]. A follow-up Canadian pilot with Inuit youth confirmed decreased hopelessness, self-blame, rumination, and catastrophizing[^6]. Nationwide implementation launched in 2014 and has been used by over 9,000 adolescents[^7][^8].

### Why Characters and NPCs Work

The core psychological mechanism is **externalization** â€” a foundational technique from narrative therapy in which individuals are encouraged to articulate issues as separate from their identity[^9][^10]. By interacting with NPCs who carry emotional storylines, users can experience, process, and project personal emotional material through a character without the vulnerability of direct self-disclosure[^11]. This is the engine of your app's therapeutic potential.

Evidence from the *Hellblade: Senua's Sacrifice* study confirmed that playing a character with mental illness reduces stigma through **transportation** (being absorbed into the narrative) and **identification** (connecting with the character's inner experience)[^12]. Players showed significantly reduced desire for social distance from mentally ill individuals, mediated by how deeply they identified with the character[^12].

Avatar-based psychotherapy (ABP) research published in 2025 in *JMIR Human Factors* found that avatars reduce psychological barriers to therapy through **anonymity, ease of access, and enhanced potential for self-disclosure**[^13]. A key mechanism is **self-objectification** â€” the avatar creates psychological distance that allows for more objective self-reflection while maintaining emotional engagement[^13]. This applies directly to both NPC design and user character creation.

### The Dual-Loop Design Model

A framework published in *JMIR Serious Games* proposes that therapeutic games consist of two interlocking worlds: the **game world** (narrative, rules, aesthetics) and the **therapy world** (therapeutic goals, behavior change, processing)[^14][^15]. Both must deliver value independently â€” if the game isn't engaging, the therapy doesn't reach the user; if the therapy isn't grounded, the game becomes escapism without healing[^15]. The voice interview creates the bridge between these two worlds, surfacing the user's authentic emotional material to inform how the game world responds.

***

## Part II: Universal Communication Rules for All 10 Disorders

### The OARS Framework (Motivational Interviewing Core)

Motivational Interviewing (MI) is the most evidence-supported conversational framework for engaging people who may be ambivalent, withdrawn, or resistant to opening up[^16]. Its core technique is **OARS**:

| Skill | What It Is | Application in Voice Interview |
|-------|-----------|-------------------------------|
| **O** â€” Open-Ended Questions | Questions that cannot be answered with yes/no | "What matters most to you in a game?" vs. "Do you like adventure games?" |
| **A** â€” Affirmations | Statements of strength, effort, and courage | "It takes real courage to share that." |
| **R** â€” Reflective Listening | Rephrasing to capture implicit emotion/meaning | "So it sounds like you've been carrying this alone for a while." |
| **S** â€” Summarizing | Linking what was said to check understanding | "What I'm hearing is..." before continuing[^17][^18] |

A general clinical rule: at least **70% of questions asked should be open-ended**[^19]. Curious questions using WHAT, WHERE, HOW, WHEN, WHO, and WHAT IF generate far richer responses than "Do you...?" or "Are you...?" constructions[^20].

> **Critical MI rule**: Never ask "WHY?" â€” it is perceived as challenging or provocative and can generate defensiveness or feelings of hopelessness when the person doesn't know the answer[^20].

### The Curiosity Stance

A 2025 paper in *Psychotherapy* confirmed that therapeutic curiosity â€” when genuine, non-agenda-driven â€” transforms conversation into "shared exploration" and shifts the practitioner from authority to collaborative partner[^21]. For your voice AI, this means:
- Wait for a topic to organically emerge before probing deeper
- If no follow-up question feels natural, continue listening
- Questions should arise from what the user *just said*, not from a pre-set checklist[^21]

### Universal "Say This" Phrases

These are validated across disorders and safe for any user:

- *"Your feelings are valid. I'm here to listen."*[^22]
- *"It doesn't matter how long it's been. You deserve support now."*[^23]
- *"Thank you for trusting me with this."*[^23]
- *"Are you looking for input right now, or would you rather I just listen?"*[^24]
- *"I know things are really hard right now. You don't have to go through this alone."*[^22]
- *"I may not know exactly what you're going through, but I want to understand."*[^25]
- *"That sounds like it's been really heavy to carry."*
- *"What's that been like for you?"*[^26]
- *"Tell me more about that."*[^20]
- *"One of the things you've done is ___. How did that feel?"* (reflecting back something positive they mentioned)[^17]

### Universal "Never Say This" Phrases

These are harmful across **all** mental health presentations:

| Harmful Phrase | Why It's Harmful | Say Instead |
|---------------|-----------------|-------------|
| "Just calm down." | Implies anxiety is a controllable choice[^22] | "It makes sense your mind is working overtime right now." |
| "You're overreacting." | Invalidates subjective experience[^22] | "Your feelings make sense, even if the situation is hard to read from the outside." |
| "I know exactly how you feel." | Comparative invalidation; centers speaker[^27] | Keep the focus on them; reflect their emotion |
| "Have you tried just being positive?" | Oversimplifies complex conditions[^27] | "What's one small thing that used to bring you even a little relief?" |
| "You have so much to be grateful for." | Induces guilt; depression is not about lacking gratitude[^22] | "I hear that despite what you have, things feel really difficult." |
| "Why can't you just...?" | Challenges competence; sounds like interrogation[^25][^20] | "What gets in the way when you try to...?" |
| "Are you OK?!" | Creates social pressure to appear fine[^28] | "How are things going for you today â€” really?" |
| "At least you had / have..." | Minimizes pain via silver lining[^29] | "I can only imagine how painful that was." |
| "You're so strong." | Shame-inducing for those who feel they can't be vulnerable[^29] | "It makes sense you're feeling exhausted by all of this." |
| "You need to see a therapist / take medication." | Unsolicited advice removes autonomy[^27] | Let the therapist guide this; if urgent, provide resource gently |
| "You can't change the past." | Deeply invalidating to trauma survivors[^29] | "It takes time to work through what happened. You don't have to rush." |

***

## Part III: Disorder-Specific Communication Knowledge Base

### 1. Anxiety Disorders

**Understanding the Communication Landscape**: People with anxiety disorders are often hyper-attuned to ambiguity â€” the interaction itself can become a trigger[^30]. Ambiguity in your voice assistant's phrasing, unexpected topic shifts, or any sense of pressure to perform or answer "correctly" can escalate anxiety in real time.

**What Opens Them Up**:
- Offering **choices and control** at every junction: "We can go down this path, or we can do something else â€” what feels right?" Agency reduces anxiety[^30]
- Pacing: speak slowly, leave room for response, never rush
- Normalizing: "A lot of people find that part of the story challenging â€” there's no right way to play it"
- Small, concrete first steps: begin game world tasks that feel low-stakes before introducing emotionally complex quests

**Phrases That Help**:
- *"There's no pressure to go anywhere you don't want to go in this story."*
- *"Your character gets to set the pace."*
- *"What's the safest part of this world for your character right now?"*
- *"I noticed your character is hesitating here. What do you think they're feeling?"* (externalized, non-direct)

**What to Avoid**:
- Unpredictability in the interview â€” the voice system should telegraph transitions: *"I'm going to shift to a new part of the story now."*
- Piling on follow-up questions; ask one, wait, reflect before asking another
- Validating reassurance-seeking in loops ("Everything will definitely be fine") â€” this maintains anxiety
- Timed responses or performance pressure in quests (for generalized/social anxiety)
- High-stimulation scenes (loud effects, fast-paced NPC dialogue) without a decompression path

**NPC Design Considerations**:
- Design an NPC companion character who models calm affect and regulated behavior (polyvagal safety cue)[^31]
- Allow the anxious user's character to "prepare" before any new challenge: ritual = autonomic regulation
- NPCs should validate hesitation: "Are you sure you want to go in? There's no rush."

***

### 2. Major Depressive Disorder (MDD)

**Understanding the Communication Landscape**: Depression creates anhedonia (inability to feel pleasure), psychomotor slowing, and a negative cognitive triad (negative views of self, world, future). Verbal and non-verbal communication in depressed individuals shows restricted asserting and exploring modes[^32][^33]. The voice system may frequently encounter flat affect, short answers, or disengagement â€” this is not resistance; it is symptom expression.

**What Opens Them Up**:
- **Behavioral activation via micro-quests**: Gamification translates therapeutic goals into small, achievable challenges that are "more manageable and motivating, especially for users who find conventional therapy overwhelming"[^34]. Even completing tiny in-game tasks counteracts anhedonia's reward circuit suppression
- Emphasizing **meaning** over performance: "Your character doesn't have to defeat anything today. They just have to keep going."
- **Social connection** as game mechanic: NPCs who check in, remember the user's character, express warmth, reduce isolation
- Progress visibility: a simple narrative journal where the game tracks what their character has done ("your character has come a long way")

**Phrases That Help**:
- *"Your character has been through a lot. What do they need most right now?"*
- *"Even small steps count in this world."*
- *"I see your character. They matter to this story."*
- *"What's one thing your character is still holding on to?"* (resilience exploration via projection)

**What to Avoid**:
- Enthusiasm that feels performative or forced: artificial cheerfulness alienates depressed users
- Long branching dialogue trees requiring sustained concentration at the outset
- Narrative arcs that begin with crisis or suffering â€” start in a moment of relative calm
- Asking "What makes you happy?" â€” anhedonia makes this unanswerable and shame-inducing
- Closing scenes with unresolved negative affect â€” each session should end on a moment of stability

**NPC Design Considerations**:
- An NPC who has "been through something hard" and is still showing up normalizes depression without pathologizing it
- NPCs should notice the user's character: "I've been thinking about you." (counters worthlessness belief)
- Depression often involves social withdrawal â€” NPCs should reach out, not wait to be approached

***

### 3. PTSD and Trauma-Related Disorders

**Understanding the Communication Landscape**: Trauma survivors are exquisitely sensitive to safety, control, and re-traumatization. A 2025 study in *Trauma Surgery & Acute Care Open* calls trauma-informed language "a tool for health equity" â€” problematic language can re-traumatize, while thoughtful language equips clinicians (and systems) to "end cycles of re-traumatization"[^35]. The voice interview is potentially the most high-stakes interaction in your app.

**What Opens Them Up**:
- **Predictability and safety above all else**: "Surprises or unexpected changes can erode a survivor's comfort"[^36]. Announce transitions; no sudden narrative jumps
- Explicit user control: *"You decide how much your character shares and when. There are no wrong choices."*
- Gradual titration of emotionally loaded content â€” the narrative game world absorbs the emotional charge that would be intolerable in direct conversation
- **Externalization via character**: "What happened to your character" rather than "what happened to you" creates the therapeutic distance needed for safe processing[^10]
- The narrative provides what trauma therapy calls "titrated exposure" â€” approaching difficult content in small, controlled doses through the character[^37]

**Phrases That Help**:
- *"Your character gets to decide what they remember and what they keep private."*
- *"It takes a lot of courage to keep going in this story. You're doing that."*
- *"No matter when something happened to your character, what they're feeling now is real."* (adapted from[^23])
- *"Your character can pause here as long as they need."*
- *"I'm not going to ask you to explain anything you don't want to."*
- *"That sounds like something your character has been carrying for a long time."*

**What to Avoid**:
- Pressing for trauma narrative details before readiness â€” this is re-traumatization, not catharsis[^38]
- Game scenes that involve: ambush, sudden violence, loss of control of the character without consent, sensory overwhelm (loud sounds, flashing) without opt-out
- Physical/spatial metaphors that map onto the trauma (e.g., being "trapped," "held down") without extreme care
- Calling trauma survivors "survivors" or "victims" in ways that feel labeling
- Tone that suggests urgency or impatience: "Let's move on to..."
- Invalidating time ("it was a long time ago, right?"[^25])
- Suggesting the user is "brave" or "resilient" in ways that shame them for struggling[^29]

**Trauma-Informed Language Rules**:
- People-first language: "a person who experienced trauma" not "a traumatized person"[^35]
- Non-blaming, non-shaming: language that centers agency and dignity
- Avoid pathology language (symptoms, diagnosis) entirely in-game
- Normalize nervous system responses: "Your character's body is doing exactly what bodies do when they've been through too much."[^39]

**NPC Design Considerations**:
- At least one NPC who embodies *safety* â€” consistent, warm, non-demanding, always there
- NPCs should never betray trust, surprise the user, or disappear without explanation
- Allow the user's character to have a "safe place" in the game world they can return to at any time
- NPC dialogue should model co-regulation: calm breathing, grounded responses, witnessing

***

### 4. Substance Use Disorders (SUD)

**Understanding the Communication Landscape**: Shame and ambivalence are the defining communication challenges. MI was developed largely in the context of SUD and remains the gold standard for engagement[^19][^16]. Direct confrontation or moralizing **entrenches** avoidance and resistance rather than dissolving it[^16][^40].

**What Opens Them Up**:
- Exploring ambivalence: "What would be different in your character's life if they didn't need the substance to cope?" [adapted from MI][^41]
- Strengths-based language: acknowledging what they *have* managed, not what they've failed at[^17]
- "Rolling with resistance" / softening sustain talk: validate the part of the person that isn't ready to change â€” this paradoxically reduces resistance[^16][^40]
- NPC companions who model managing difficult situations without substances â€” vicarious learning through character observation

**Phrases That Help**:
- *"Your character has been coping with something really hard. That takes a lot out of you."*
- *"What has your character tried when things get really overwhelming?"* (strength inventory)
- *"It sounds like part of them wants something different. What does that part look like?"*
- *"There's no wrong answer here. We're just exploring."*
- On scale questions (MI technique): *"On a scale of 1â€“10, how much does your character care about making a change right now?"*[^42]

**What to Avoid**:
- Any language that conveys moral judgment: "that was wrong," "you shouldn't have," "don't you care about yourself?"
- Ultimatums or high-pressure NPC dialogue that mirrors real-life coercion
- Game mechanics that punish substance-related choices with shame (vs. natural consequences)
- Pushing for a commitment to change before the user signals readiness
- Directly confronting denial â€” "arguing with resistance" reinforces it[^16]

**NPC Design Considerations**:
- NPCs in recovery are powerful models â€” a mentor character who is honest about their own struggles
- Allow the game world to show natural consequences of in-world choices without moralizing narration
- A "what matters to you" mechanic built into the quest structure â€” what is the character working toward?

***

### 5. ADHD

**Understanding the Communication Landscape**: ADHD involves executive dysfunction (working memory, attention, impulse control) and often a history of criticism and failure. Many adults with ADHD carry deep shame around underperformance. Communication needs to be immediate, engaging, reinforcing, and low-frustration.

**What Opens Them Up**:
- **Gamification matches ADHD's neurology** more directly than any other disorder â€” immediate feedback, novelty, reward loops, and clear goals align with dopaminergic deficits[^34]
- Short, snappy voice interview segments: 2â€“3 questions maximum before a game-world transition
- Positive reinforcement of engagement, not performance: "Your character just did something worth remembering."
- Choice architecture: frequent branching decisions keep attention engaged
- Progress visibility: badges, maps, journal entries that show accumulation

**Phrases That Help**:
- *"What's the most interesting thing your character could do right now?"* (novelty-seeking engagement)
- *"Great â€” let's keep moving."* (forward momentum; no dwelling)
- *"Your character noticed something important there."* (affirming awareness)
- *"Let's take that in a different direction â€” what about...?"* (redirection without shame for tangents)

**What to Avoid**:
- Long monologue explanations or complex NPC backstory dumps
- Multi-step instructions or questions
- Drawing attention to tangents or "going off track" â€” redirect without labeling the behavior
- Frustration cues in voice tone or NPC dialogue when user takes non-linear paths
- Quest structures with no clear short-term reward cycle

**NPC Design Considerations**:
- An NPC who embodies ADHD traits positively â€” creative, spontaneous, inventive â€” validates the user's neurology
- Frequent in-world "discoveries" that reward curiosity and exploration
- Timer-free zones as the default; optional urgency elements clearly labeled

***

### 6. Bipolar Disorder

**Understanding the Communication Landscape**: Communication disruptions in bipolar disorder are both symptom-revealing and symptom-maintaining[^43]. The voice system must be able to adapt to radically different user states: expansive/talkative in hypomania vs. withdrawn/brief in depression. The Beck Institute's CBT guidance calls communication disruptions "early warning signs" and emphasizes helping clients find a "middle ground" rather than extremes[^43].

**What Opens Them Up**:
- **Naming the weather, not the diagnosis**: "Your character seems really energized today" or "Your character seems to be moving more quietly today" without clinical labeling
- Psychoeducation embedded in game lore: the game world has rhythms (day/night, seasons) that mirror mood cycles â€” normalizes fluctuation
- Stability-building: consistent NPCs, predictable rituals, clear narrative structure
- IPSRT-aligned mechanics: the game rewards routine (sleeping, eating, showing up) as part of the narrative

**Phrases That Help**:
- *"Your character's energy seems different today. What's the world like from where they're standing?"*
- *"What does your character need most right now to feel steady?"*
- *"What's one thing that keeps your character grounded when everything is moving fast?"*

**What to Avoid**:
- During high-energy states: matching the energy (escalation), setting challenging confrontational quests, or letting NPC dialogue spiral into grandiosity-reinforcing praise
- During depressive states: high expectations, quest demands, "why isn't your character doing anything?"
- Sudden, unexplained mood-matching: the voice assistant should maintain a calm, regulated baseline regardless of user's state
- Labeling the state: "It sounds like you might be manic right now" â€” this is the therapist's role

**NPC Design Considerations**:
- A stable, consistent NPC anchor whose behavior does not mirror the user's mood swings â€” this models co-regulation
- Narrative arcs that show bipolar-like cycles in the world (a kingdom that goes through seasons of abundance and scarcity) â€” universalizing without pathologizing
- Safe harbors the character can access during any mood state

***

### 7. Schizophrenia Spectrum Disorders

**Understanding the Communication Landscape**: Schizophrenia is characterized by distorted thinking, perceptions, emotions, and significant challenges in social engagement[^44]. Building trust is the foundational requirement â€” "open conversations, trust and respect play a fundamental role"[^45]. The voice interview must be the most structured, predictable, and clear of all disorder adaptations.

**What Opens Them Up**:
- **Simplicity and directness**: short sentences, plain language, one idea at a time[^46]
- **Scaffolding**: break game elements into very small steps; orient before proceeding[^46]
- **Validation without confirmation of delusions**: "That sounds really frightening for your character" acknowledges emotional reality without reinforcing content[^45]
- Patience: allow long processing pauses; do not interpret silence as disengagement[^46]
- Psychoeducation woven into NPC dialogue: NPCs explain the world's rules clearly, consistently[^45]
- Warm, manifest interest: "I'm genuinely interested in what your character thinks about this"[^45]

**Phrases That Help**:
- *"Take your time. There's no rush in this world."*
- *"Your character can ask me to explain anything again."*
- *"What does your character see from where they're standing?"* (grounding in the narrative present)
- *"That sounds like a lot for your character to process. What stands out most?"*
- *"Your character's thoughts matter in this story. What are they thinking?"*

**What to Avoid**:
- Abstract metaphors, complex symbolism, or ambiguous NPC dialogue
- Rapid NPC voice changes, multiple simultaneous voices, or dissonant audio design
- Confronting or arguing with unusual perceptions or beliefs
- Rushing transitions or creating narrative disorientation
- Jokes or irony without very clear signaling â€” sarcasm is easily misread

**NPC Design Considerations**:
- NPCs speak clearly, with one voice, one topic at a time
- Avoid NPCs whispering, talking behind the user's character, or conspiracies as central narrative tropes (can reinforce paranoid ideation)
- A central trusted NPC figure whose loyalty to the user's character is absolutely consistent

***

### 8. Obsessive-Compulsive Disorder (OCD)

**Understanding the Communication Landscape**: OCD involves intrusive thoughts and compulsive rituals that provide temporary relief but reinforce the anxiety cycle. The critical clinical trap in communication is **reassurance-seeking**: when someone with OCD asks for repeated confirmation ("Is my character going to be okay? Are you sure?"), answering yes each time maintains the OCD cycle. The evidence-based response is graduated non-engagement with reassurance-seeking, paired with validation.

**What Opens Them Up**:
- Normalizing uncertainty as a feature of the narrative world: "Part of what makes this world interesting is that not everything is certain â€” and your character is learning to be okay with that."
- Externalizing OCD as a character in the game: "The OCD voice in your character's head says ___ â€” what does the rest of them say?"[^9][^10]
- ERP-aligned game mechanics: quests that require the character to approach feared situations without checking, counting, or avoiding â€” rewarded by narrative progress, not reassurance
- Modeling: NPCs who tolerate uncertainty calmly in the game world

**Phrases That Help**:
- *"Your character doesn't have to know for sure what's ahead to keep moving."*
- *"That uncertain feeling makes sense. What does your character do anyway?"*
- *"Intrusive thoughts in this world don't predict what will happen â€” they're just thoughts."*
- *"What would your character do if they trusted themselves a little more right now?"*

**What to Avoid**:
- Responding to reassurance-seeking questions with definitive reassurance: "Yes, everything will be fine." This maintains the OCD loop
- Narrative content centered on contamination, checking rituals, or catastrophe without clinical guidance from the supervising therapist
- Punishing compulsive in-game behaviors (this induces shame, not change)
- Repeating information because the user asked for it again (graduated non-engagement, not cold refusal â€” gently redirect: *"We talked about that a moment ago. What does your character already know?"*)

**NPC Design Considerations**:
- A companion NPC who models tolerating uncertainty: "I don't know what's behind that door, but let's find out together."
- NPCs do not compulsively check or verify â€” model absence of compulsion as normal behavior
- Quest rewards tied to completing actions *despite* uncertainty, not *because* of certainty

***

### 9. Eating Disorders

**Understanding the Communication Landscape**: No other disorder has a greater density of language landmines. Bodies, food, weight, and appearance are all live wires. The goal is to completely bypass the disorder's language domain and reach the person beneath it â€” their emotions, relationships, values, and needs. Research confirms that written emotional disclosure is effective for EDs[^47], and that emotional dysregulation (not food itself) is the core communication target[^48][^49].

**What Opens Them Up**:
- Asking about **feelings, not behaviors**: "How was your character feeling before that happened?" rather than anything behavioral
- Validating complexity without centering food or body: "Your character is dealing with something that goes really deep."
- Connecting to values: "What does your character wish people understood about them?"
- Narrative arcs about nourishment, care, and deserving â€” not about eating
- **Written disclosure option**: offering the user a "journal" feature within the game world (their character's diary) as an indirect emotional outlet[^47]

**Phrases That Help**:
- *"What's going on for your character emotionally right now?"*
- *"Your character deserves to take up space in this world."*
- *"What does your character need that they haven't been able to ask for?"*
- *"What would it look like if your character took care of themselves the way they take care of others?"*

**What to Avoid** â€” these are hard rules, not suggestions:
- Any comment, even positive, about weight, appearance, or body shape in or out of the game
- "You look healthy / better / different" â€” carries enormous danger in ED context
- Any NPC content involving food choices, eating behaviors, or body comparisons
- Game mechanics involving visual body representation without extreme clinical oversight
- "You're so disciplined" â€” a compliment in most contexts; deeply reinforcing to restriction in ED
- Asking about meals, intake, or physical symptoms

**NPC Design Considerations**:
- NPCs are body-neutral by design â€” no NPC comments on another character's appearance
- Food, if present in the game world, is purely environmental and non-interactive for this user profile
- A storytelling NPC who invites the user's character to express themselves through narrative, art, or music within the game world (bypasses the body entirely)

***

### 10. Borderline Personality Disorder (BPD)

**Understanding the Communication Landscape**: BPD is defined by emotional dysregulation, intense fear of abandonment, unstable sense of self, and relational extremes. People with BPD hear words "inside out, sideways, and devoid of context"[^50]. Emotional attunement to what they're *feeling* rather than what they're *saying* is the communication priority[^50]. Consistency, predictability, and clearly maintained warmth are the protective factors.

**What Opens Them Up**:
- **Active, empathic listening**: listening to feelings, not just words; not trying to "win" the narrative conversation[^50]
- Validation without enabling escalation: "That sounds incredibly painful" without inflaming
- **Distraction into positive engagement** when emotions escalate: segue to an interesting game event rather than continuing to process the emotional content mid-escalation[^50]
- Consistent session endings: the voice assistant should always close sessions warmly and predictably â€” never abruptly
- DBT-informed language: validation, wise mind references, distress tolerance framing if the user knows DBT[^51]

**Phrases That Help**:
- *"Your character's feelings are real, and they matter in this story."*
- *"I'm not going anywhere. I'm here for the whole session."* (directly addresses abandonment fear)
- *"What does the wise part of your character think about this?"* (DBT "wise mind" projection)
- *"Your character is allowed to feel all of this."*
- *"Let's give your character a break from this for a moment â€” there's something interesting just over here..."* (distraction/regulation)
- *"It makes sense you feel that strongly. What does your character need right now to feel a little safer?"*

**What to Avoid**:
- Sudden session terminations or unannounced interruptions â€” this mirrors abandonment and can trigger crisis
- Arguing with the user's emotional interpretation, even when it seems distorted: "You said I was fine earlier" â€” the emotion is the data, not the interpretation
- Invalidating with logic: "That doesn't make sense" or "But you were fine a minute ago"
- Allowing NPC behavior to be inconsistent, disappearing without explanation, or expressing rejection
- Overstimulating emotional scenes without a recovery path
- Promises the system cannot keep: "I will always be here" â€” be truthful about the system's scope

**NPC Design Considerations**:
- The most consistently warm, stable NPC in the game should be the central companion for this user profile
- NPC loyalty and presence should never be in doubt: no disappearing acts, betrayals, or unannounced absences
- DBT skill metaphors embedded in the narrative: a "wise elder" who teaches distress tolerance; a "fire keeper" who teaches regulation of the inner flame

***

## Part IV: Voice Interview Design â€” Opening, Pacing, and Silence

### Opening the Interview

The first 90 seconds of any voice interaction establish whether the user feels safe enough to continue. Based on clinical interview research[^52][^53], the opening sequence should:

1. **Establish warmth, not urgency**: Slow pace, low-pressure greeting
2. **Offer explicit control**: "There's no right way to do this. You're in charge of how it goes."
3. **Signal safety through structure**: "I'm going to ask you a few questions to help build your character's world. At any point you can skip, change direction, or just listen."
4. **Start with values, not feelings**: "What kind of world does your character want to live in?" (less threatening than "How are you feeling?")
5. **Invite the character before the person**: "Tell me about the person you want to become in this story." (externalization from the start[^9])

### Pacing the Conversation

Therapeutic conversation research consistently confirms that **silence is a skill**[^54][^55][^56]:
- Deliberate pauses give clients time to think through personal content
- Never rush to fill silences â€” this communicates anxiety and short-circuits depth
- Let the user break silence, not the system
- Acknowledge pauses with soft continuers: "Take your time..." rather than re-asking the question
- Silences that last too long, however, can increase anxiety â€” a gentle offer after 10â€“15 seconds: "We can move forward whenever you're ready."[^54]

**Active Listening Cues** for voice UI (verbal equivalents of nodding)[^56]:
- "I see."
- "Go on."
- "That makes sense."
- "Tell me more."
- "What happened next?"[^56]

These "small rewards" â€” brief expressions of interest â€” encourage the user to keep going without directing where they go[^57].

### The Observer-Perspective Technique

One of the most powerful therapeutic conversational moves for game-based systems is asking the user to take an **observer perspective** on their character â€” this creates the therapeutic distance that makes difficult material accessible[^58]:

- "If someone who knew your character very well watched them in this moment, what would they see?"
- "What do you think your character's best friend would say about how they're handling this?"
- "If you could write a note from the future to your character right now, what would it say?"

This technique, supported by *Frontiers in Psychology* (2023) research on observer-perspective questions in therapy, helps users access alternative narratives about themselves through a less threatening frame[^58].

***

## Part V: Game and NPC Design â€” Clinical Principles

### Character Creation as a Therapeutic Intake

The character creation interview is, functionally, a therapeutic intake â€” and one of the most powerful therapeutic moments in the app. Research on TTRPG therapy at the APA (2025) notes that "character creation is a therapeutic goldmine" where "clients can explore different aspects of identity â€” strengths, values, fears, and aspirations"[^1]:

- **Ask about aspirations, not deficits**: "What quality does your character have that they're most proud of?" opens very differently than disorder-focused questions
- **Invite the user to give their character something they wish they had**: "What's one thing you'd give your character that would make their journey easier?"
- **Build a "safe place" into the world**: every character has a home base they can return to â€” clinically grounded in trauma therapy[^36]
- **Let the character look different from the user**: aesthetic distance reduces shame and allows projection

### NPC Functions (Mapped to Therapeutic Roles)

In TTRPG therapy, the therapist serves as: facilitator, observer, coach, and translator[^59]. Your NPCs can distribute these functions:

| NPC Archetype | Therapeutic Function | Disorder Fit |
|--------------|---------------------|-------------|
| **The Companion** | Unconditional warm presence; never abandons | BPD, PTSD, Depression |
| **The Mentor/Elder** | Psychoeducation, wisdom, non-directive guidance | OCD, Anxiety, Schizophrenia |
| **The Mirror** | Reflects the user's character's strengths back to them | Depression, BPD, Eating Disorders |
| **The Challenger** | Gentle in-world adversity; models persistence | PTSD recovery, ADHD, Anxiety |
| **The Peer in Recovery** | Lives with struggle; shows non-judgment | SUD, Bipolar, Schizophrenia |
| **The Gatekeeper** | Manages pacing; controls when hard content appears | All trauma presentations |
| **The Scribe** | Receives the user's character's written story/journal | PTSD, Eating Disorders, Anxiety |

### Projective Identification and NPC Design

When users project their internal world onto NPCs â€” known clinically as projective identification â€” NPCs can serve as a "receptacle for aspects of the client's identity," allowing the user to identify with the "other" and observe their own inner world from a distance[^60]. Design implications:
- NPCs should have clear, consistent emotional lives that are imperfect but evolving
- NPC dialogue choices should sometimes mirror the user character's experience without directly naming it
- The game master narrative voice can "offer candidate connections" between what happened in the game and what the NPC is feeling â€” creating gentle bridges to self-reflection[^61]

### Graduated Disclosure Architecture (GDA)

Inspired by trauma therapy's graduated exposure principles, the app's interview and NPC system should follow a **layered disclosure model**:

**Layer 1 â€” Aspirational**: What does the character want? What world do they want to live in? (Values, hopes â€” minimal emotional risk)

**Layer 2 â€” Relational**: Who matters to the character? Who have they lost or not connected with? (Relationships â€” moderate emotional content)

**Layer 3 â€” Historical**: What has the character been through? What shaped who they are? (Past experiences â€” higher emotional content, therapist-visibility milestone)

**Layer 4 â€” Core Wounds**: What does the character most fear? What do they most need? (Core material â€” therapist review required before game proceeds here)

The voice interview should only descend layers when: (a) the user's engagement level is high, (b) the session has established safety, and (c) the supervising therapist has reviewed prior layer content[^36].

***

## Part VI: Safety Architecture for the Voice Interview

### Non-Negotiable Safety Triggers

The following user inputs must trigger immediate protocol regardless of game context:

| Trigger Phrase / Pattern | Required Response |
|--------------------------|------------------|
| Direct statement of suicidal ideation | Stop game, warm acknowledgment, crisis line immediate display, therapist notification |
| Self-harm disclosure ("I hurt myself") | Acknowledge without panic, provide therapist hotline, do not continue game |
| Acute psychotic content (in the user's voice, not character) | Acknowledge the user (not character), provide grounding, pause game |
| Expressed intent to harm another | Follow mandatory reporting protocol; escalate to therapist/crisis line |
| "I don't want to play anymore" + significant distress signals | Slow down, offer support in-person from therapist, do not push re-engagement |

**System rule**: The app should never interpret these statements as character dialogue. A detection layer must distinguish between user-voice and character-voice statements.

### Therapist-Guided Model â€” Session Visibility

Since this app operates under therapist guidance:
- All Layer 3+ interview content should generate a therapist-review summary before the game unlocks deeper narrative branches
- Therapists should receive session transcripts with emotional intensity flagging (MI transcript-style)
- Risk-threshold language detection should alert therapist in near-real-time (not just post-session)
- The game should be pausable by the therapist remotely

### Scope Communication to the User

The voice system must communicate its scope clearly and warmly at first use and periodically thereafter:

> *"I'm here to help you build a story and explore your character's world. I'm not a therapist, and this isn't therapy â€” your therapist [name] is the person who guides your care. If things feel heavy, you can always reach out to them directly. This game is a space to explore, and your therapist and I are working together to make it as useful for you as possible."*

***

## Part VII: Gamification Mechanics â€” Clinical Evidence Map

| Mechanic | Clinical Mechanism | Disorder Best Fit |
|---------|-------------------|------------------|
| **Micro-quest system** | Behavioral activation; counters anhedonia/avoidance | Depression, ADHD, SUD[^34] |
| **Progress journal / narrative log** | Written emotional disclosure; meaning-making | PTSD, Eating Disorders, Anxiety[^47] |
| **Character creation interview** | Narrative identity reconstruction; externalization | All[^62][^63] |
| **Companion NPC relationships** | Co-regulation; attachment repair | PTSD, BPD, Depression[^59] |
| **"Safe room" mechanic** | Polyvagal safety activation; window of tolerance | PTSD, Anxiety, BPD[^31] |
| **Mood/state visible in game world** | Self-monitoring; psychoeducation | Bipolar, ADHD, BPD[^43] |
| **Observer-perspective NPC scenes** | Cognitive restructuring via detachment | OCD, Depression, Anxiety[^58] |
| **Uncertainty-tolerating quest design** | Graduated ERP | OCD, Anxiety[^64] |
| **Achievement badges** | Positive reinforcement; counters shame | ADHD, Depression, SUD[^34] |
| **Skill-teaching NPC mentors** | Psychoeducation; CBT skill modeling | All[^1] |
| **Peer NPC in recovery** | Vicarious social learning; stigma reduction | SUD, Schizophrenia, Bipolar[^12] |
| **Narrative arc with ups and downs** | Normalizes non-linear recovery | Bipolar, BPD, PTSD[^63] |

***

## Conclusion: The Voice That Heals

The voice interview's power lies not in what it asks, but in how it holds the space between questions. Research on therapeutic curiosity confirms that the most effective clinical conversations arise from "genuine interest rather than an effort to lead or control"[^21]. The system should aspire to be what the best therapists already are: a witness, a mirror, a co-author â€” one who knows when to ask, when to reflect, and when to simply be present in the silence.

Every disorder-specific adaptation in this knowledge base traces back to one core principle: **people open up when they feel safe, seen, and in control**. The narrative game world is not a trick or a diversion â€” it is a scientifically grounded structure that gives the nervous system permission to approach what direct conversation makes too dangerous. The NPCs are not just characters; they are externalized holding environments for the user's most vulnerable self.

The therapist remains the irreplaceable anchor. The game is the bridge. The voice is the hand that invites â€” never pushes â€” across it.

---

## References

1. [Improving treatment with role-playing games](https://www.apa.org/monitor/2025/04-05/role-playing-games-therapy) - Using games like Dungeons and Dragons in group therapy shows promise for treating anxiety, depressio...

2. [Evaluating the Feasibility of a Multiplayer Role-Playing Game as a Behavioral Health Intervention in Adolescent Patients With Chronic Physical or Mental Conditions: Protocol for a Cohort Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC10337425/) - ...Masks game sessions. In Masks, players assume the roles of young superheroes; select their charac...

3. [Gamification in Psychiatry: A Systematic Evaluation of Its ...](https://journals.sagepub.com/doi/10.1177/00207640251400797) - Gamification has demonstrated encouraging preliminary outcomes in improving engagement, adherence, a...

4. [The effectiveness of SPARX, a computerised self help ...](https://www.bmj.com/content/344/bmj.e2598) - by SN Merry Â· 2012 Â· Cited by 996 â€” SPARX is a potential alternative to usual care for adolescents p...

5. [SPARX Fact sheet - Medical and Health Sciences](https://www.fmhs.auckland.ac.nz/assets/fmhs/faculty/ABOUT/newsandevents/docs/SPARX%20Fact%20sheet.pdf) - Trials have shown the programme is at least as effective for NZ youth 12 â€“ 19 years old seeking help...

6. [Evaluating the Utility of a Psychoeducational Serious Game ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC10037175/) - by Y Bohr Â· 2023 Â· Cited by 16 â€” This serious game, SPARX, had previously demonstrated effectiveness...

7. [Nationwide Implementation of Unguided Cognitive ...](https://www.jmir.org/2025/1/e66047) - In 2014, the New Zealand Ministry of Health funded SPARX as an unguided self-help iCBT intervention....

8. [Enhancing an online cognitive behavioural therapy intervention for depression: Harnessing the feedback of sexual and gender minority youth to help improve SPARX - Mathijs FG Lucassen, Karolina Stasiak, Theresa Fleming, Matthew Shepherd, Sally N Merry, 2023](https://journals.sagepub.com/doi/full/10.1177/10398562231153061) - Objective SPARX is an online cognitive behavioural therapy self-help intervention for adolescent dep...

9. [Understanding Narrative Therapy: Concepts, Applications ...](https://multitherapy.co/blog-post17) - Narrative therapy is a therapeutic approach that views individuals as the authors of their own life ...

10. [Narrative Therapy: Techniques, Efficacy, and Use Cases](https://www.resiliencelab.us/thought-lab/narrative-therapy) - Key techniques used in narrative therapy include externalization (viewing issues as separate from on...

11. [Framework proposal for Role-Playing Games as mental ...](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2024.1297332/full) - by VHO Otani Â· 2024 Â· Cited by 11 â€” RPGs serve as potent instruments for crafting immersive fictiona...

12. [Reducing Mental Health Stigma Through Identification ... - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7509402/) - by A Ferchaud Â· 2020 Â· Cited by 65 â€” This study examines how playing a video game featuring a player...

13. [Exploring User Experience and the Therapeutic Relationship ...](https://humanfactors.jmir.org/2025/1/e66158) - by B Jang Â· 2025 Â· Cited by 8 â€” Nonverbal communication through avatars enhanced empathy and trust i...

14. [Game Design in Mental Health Care: Case Studyâ€“Based ... - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8686469/) - While there has been increasing interest in the use of gamification in mental health care, there is ...

15. [JMIR Serious Games - Game Design in Mental Health Care: Case Studyâ€“Based Framework for Integrating Game Design Into Therapeutic Content](https://games.jmir.org/2021/4/e27953) - While there has been increasing interest in the use of gamification in mental health care, there is ...

16. [Using Motivational Interviewing to Address Client Resistance](https://www.mentalhealthacademy.com.au/blog/using-motivational-interviewing-to-address-client-resistance) - This article explores the fundamentals of motivational interviewing, highlighting useful MI techniqu...

17. [Motivational interviewing techniques](https://www.racgp.org.au/afp/2012/september/motivational-interviewing-techniques) - When have you made a significant change in your life before? How did you do it? Â· What strengths do ...

18. [12+ Motivational Interviewing Questions & Techniques](https://positivepsychology.com/motivational-interviewing/) - In motivational interviewing, OARS or open-ended questions, affirmations, reflections, and summarizi...

19. [Motivational Interviewing: An Evidence-Based Approach for ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC8200683/) - by G Bischof Â· 2021 Â· Cited by 348 â€” One of the techniques of motivational interviewing is to ask op...

20. [Using Curious Questions in Motivational Interviewing - Veriti](https://www.veriti.com.au/using-curious-questions-in-motivational-interviewing/) - Using a curious approach with questions in motivational interviewing enables the clinician or helper...

21. [cultivating curiosity and insight in the therapeutic process - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12325357/) - by JA Brewer Â· 2025 Â· Cited by 3 â€” Curiosity as intentional stance enhancing empathy, acceptance, an...

22. [What to Say (and Not Say) to Support Mental Health](https://raftconsulting.com/blog/14673/Words-Matter-What-to-Say-and-Not-Say-to-Support-Mental-Health) - Words matter. Learn which phrases to avoidâ€”and what to say insteadâ€”to better support loved ones with...

23. [[PDF] PMWM-PTSD-supportive-language.pdf - AHA](https://www.aha.org/system/files/media/file/2022/04/PMWM-PTSD-supportive-language.pdf)

24. [What to say and what not to say to someone with a mental ...](https://rogersbh.org/wp-content/files/InHealthdodont919web.pdf) - See the guidelines below for what to avoid and suggested responses for someone dealing with a mental...

25. [6 Worst Things To Say To Someone With PTSD - Amen Clinics](https://www.amenclinics.com/blog/6-worst-things-to-say-to-someone-with-ptsd/) - Read about what not to say to someone with PTSD, plus empathy-driven alternatives to help you suppor...

26. [6 Types of Motivational Interviewing Questions for Therapists](https://thewellnesssociety.org/6-types-of-motivational-interviewing-questions-for-therapists/) - In this article, we'll explore the background of MI, its guiding principles, and six types of MI que...

27. [What to say and what not to say to someone with a mental ...](https://rogersbh.org/blog/what-say-and-what-not-say-someone-mental-health-condition/) - Help a friend facing a mental health challenge with the right words. Understand what to say for genu...

28. [What to Say and What Not to Say to Someone With a Mental ...](https://eliminatestigma.org/wp-content/uploads/What-to-Say-and-Not-to-Say.pdf) - See the guidelines below for what to avoid and suggested responses for someone dealing with a mental...

29. [7 Things to Avoid Saying to Someone With PTSD](https://www.resurfacegroup.com/post/x-things-to-avoid-saying-to-someone-with-ptsd) - Trauma is complex, and many loved ones feel nervous or confused about how to approach the subject. S...

30. [Alleviating Anxiety: Optimizing Communication With the Anxious Patient.](https://pmc.ncbi.nlm.nih.gov/articles/PMC6526974/) - ...Anxiety disorders are the most common psychiatric disorders in the United States, affecting an es...

31. [Reimagining Game Design for Mental Health](https://www.entropyinteractive.com.au/research/position-paper) - Games can bring joy, creativity and connection, but can also reinforce unhealthy patterns, exploit a...

32. [The Action of Verbal and Non-verbal Communication in the Therapeutic Alliance Construction: A Mixed Methods Approach to Assess the Initial Interactions With Depressed Patients](https://www.frontiersin.org/articles/10.3389/fpsyg.2020.00234/pdf) - In psychodynamic psychotherapy, verbal (structures and intents) and non-verbal (voice and interrupti...

33. [The Action of Verbal and Non-verbal Communication in the Therapeutic Alliance Construction: A Mixed Methods Approach to Assess the Initial Interactions With Depressed Patients](https://pmc.ncbi.nlm.nih.gov/articles/PMC7047748/) - In psychodynamic psychotherapy, verbal (structures and intents) and non-verbal (voice and interrupti...

34. [Exploring the Implementation of Gamification as a Treatment ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC12388161/) - by MA bin Zakaria Â· 2025 Â· Cited by 1 â€” By translating therapeutic goals into small, achievable chal...

35. [Trauma-informed language as a tool for health equity](https://pmc.ncbi.nlm.nih.gov/articles/PMC11683881/) - editorial Trauma Surg Acute Care Open. 2024 Dec 24;9(1):e001558. doi: 10.1136/tsaco-2024-001558

# T...

36. [Different experiences, different approach: trauma-informed care to address disparities and inequities](https://pmc.ncbi.nlm.nih.gov/articles/PMC11784121/) - ...regardless of their race, gender, sexuality, or other characteristics. It is through a consistent...

37. [Videogames as a Therapeutic Tool in the Context of Narrative Therapy](https://www.frontiersin.org/articles/10.3389/fpsyg.2016.01657/pdf) - ...traumatic brain injury (Llorens et al., 2015) and in conjunction with cognitiveâ€”behavioral therap...

38. [What To Say (and Not To Say) To Someone Who Has PTSDwww.nemahealth.com â€º blog-posts â€º what-to-say-and-not-to-say-to-someo...](https://www.nemahealth.com/blog-posts/what-to-say-and-not-to-say-to-someone-who-has-ptsd) - Learn how to support individuals with PTSD and Complex PTSD sensitively. Discover what to say, what ...

39. [Understanding Trauma Through Polyvagal Theory - Roamers Therapy](https://roamerstherapy.com/shifting-between-survival-modes-understanding-trauma-through-polyvagal-theory/) - The Polyvagal Theory, developed by Stephen Porges to explain the autonomic nervous systemâ€™s relation...

40. [Motivational Interviewing (MI) Rolling with Resistance What ...](https://health.mo.gov/living/healthcondiseases/chronic/wisewoman/pdf/MIRollingwithResistance.pdf) - Clients who exhibit resistance are less likely to change. Why does resistance occur? â€¢ It arises as ...

41. [Motivational Interviewing Techniques: Expert Guide](https://www.avidcounseling.org/motivational-interviewing-techniques-transform-lives-through-expert-counseling/) - The foundation of effective motivational interviewing lies in mastering the OARS techniquesâ€”Open-end...

42. [Motivational Interviewing Questions: Effective Techniques ...](https://www.blueprint.ai/blog/motivational-interviewing-questions-effective-techniques-for-enhancing-client-engagement) - Open-Ended Questions: Unlocking Self-Reflection and Motivation Â· "What are some of the benefits you ...

43. [Improving Self-Regulation of Communication in Patients ...](https://beckinstitute.org/blog/improving-self-regulation-of-communication-in-patients-experiencing-bipolar-episodes/) - This blog will briefly address the latter problem, ie, helping clients with their state-based commun...

44. [Establishing Trust Relationships with Schizophrenia Patients](https://www.avantpsychiatry.com/building-trust-for-therapeutic-relationships-with-schizophrenia-patients) - Developing a therapeutic connection with those diagnosed with schizophrenia is critical for effectiv...

45. [Treating Schizophrenia: Open Conversations and Stronger ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC7438851/) - by A Mucci Â· 2020 Â· Cited by 50 â€” To construct a strong therapeutic alliance, open conversations, tr...

46. [How Do You Engage Someone With Schizophrenia?](https://engagetherapy.com/how-do-you-engage-someone-with-schizophrenia/) - Psych Central provides the following suggestions to help enhance communication and engagement when i...

47. [Effectiveness of written emotional disclosure interventions for eating disorders: a systematic review and meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC11667891/) - ...This study aimed to review the effectiveness of written emotional disclosure in treating eating d...

48. [Difficulties in emotion regulation in patients with eating disorders](https://pmc.ncbi.nlm.nih.gov/articles/PMC4888739/) - Borderline Personal Disord Emot Dysregul. 2016 Jun 1;3:3. doi: 10.1186/s40479-016-0037-1

# Difficul...

49. [Examining emotion regulation in binge-eating disorder](https://pmc.ncbi.nlm.nih.gov/articles/PMC8504023/) - Background
Inefficient mechanisms of emotional regulation appear essential in understanding the deve...

50. [Dealing with BPD in Relationships Tips](https://www.helpguide.org/mental-health/personality-disorders/bpd-in-relationships) - Borderline personality disorder can take a toll on relationships. Learn how to help someone with BPD...

51. [Toolkit for Dietitians](https://www.bda.uk.com/asset/30E0DB1D-5F19-41CE-9B19828469B757D9/) - It is important to note that disordered eating is not a diagnosis within diagnostic manuals, althoug...

52. [What to take up from the patientâ€™s talk? The clinicianâ€™s responses to the patientâ€™s self-disclosure of their subjective experience in the psychiatric intake interview](https://pmc.ncbi.nlm.nih.gov/articles/PMC11224953/) - ...include the following: 1) the clinician transfers the topic to a new agenda question concerning a...

53. [Clinical interview - how to establish a therapeutic relationship and effectively listen to the patient.](https://pmc.ncbi.nlm.nih.gov/articles/PMC10418035/) - Abstract In this first session of our motivational interviewing workshop, we address the basic princ...

54. [6.9 Therapeutic Communication Techniques](https://openbooks.macewan.ca/professionalcommunication/chapter/6-9-communication-strategies/) - Silence is a strategy that aids active listening. It can be beneficial when the client is talking ab...

55. [How to Practice Active Listening | Supporting Mental Health](https://headsupguys.org/practice-active-listening-mental-health/) - This article will cover key components of active listening, including silence, non-verbal cues, and ...

56. [17 Therapeutic Communication Techniques](https://www.rivier.edu/academics/blog-posts/17-therapeutic-communication-techniques/) - Active listening involves showing interest in what patients have to say, acknowledging that you're l...

57. [Active Listening: The Art of Empathetic Conversation](https://positivepsychology.com/active-listening/) - Active listening builds and maintains therapeutic alliances and bonds by showing empathy and creatin...

58. [Strategic use of observer-perspective questions in couples therapy](https://pmc.ncbi.nlm.nih.gov/articles/PMC10501453/) - Questions are one of the most frequently used strategies in therapy. There is a body of theoretical ...

59. [How Table-Top Role-Playing Games Can Help With Therapy](https://galvingrowthgroup.com/how-table-top-role-playing-games-can-help-with-therapy/) - Tabletop role-playing games offer something uniquely therapeutic: a shared story where clients can e...

60. [A concrete representation of projective identification ... - Somer](https://www.somer.co.il/articles/liora-somer-a-concrete-representation-of-projective-identification-in-art-therapy-with-a-did-patient/) - This paper demonstrated a process in which transference, projective identification and projective co...

61. [Proffering Connections: Psychologising Experience in Psychotherapy and Everyday Life](https://pmc.ncbi.nlm.nih.gov/articles/PMC7852462/) - ...involving trainee therapists; (2) approximately 15 h of psychotherapy demonstration sessions invo...

62. [Narrative Identity Reconstruction as Adaptive Growth During Mental Health Recovery: A Narrative Coaching Boardgame Approach](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.00994/pdf) - Objective The purpose of this paper is to construct a conceptual framework for investigating the rec...

63. [Narrative Identity Reconstruction as Adaptive Growth During Mental Health Recovery: A Narrative Coaching Boardgame Approach](https://pmc.ncbi.nlm.nih.gov/articles/PMC6517514/) - Objective The purpose of this paper is to construct a conceptual framework for investigating the rec...

64. [Breakthrough OCD Treatment: Going Beyond Standard Behavioral ...](https://serenitymentalhealthcenters.com/adhd-blogs/new-treatments-for-ocd/) - Discover breakthrough OCD treatments that go beyond standard behavioral therapy, offering faster rel...
