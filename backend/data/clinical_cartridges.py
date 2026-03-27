"""
Clinical Cartridges — 5 therapy-approach-specific game scenarios.

Each cartridge is designed around a specific therapeutic modality and uses
the structured psychology JSON data to drive NPC behavior, quest mechanics,
and hidden therapeutic mappings.

Cartridges:
1. CBT — Thought Detective (cognitive distortion identification)
2. DBT — The Fire Keeper (distress tolerance + emotion regulation)
3. ACT — The Compass Quest (values-driven exploration)
4. IFS — The Council of Parts (internal family systems)
5. MI/OARS — The Listener's Garden (motivational interviewing)
"""

CLINICAL_CARTRIDGES = {
    # ── 1. CBT: Thought Detective ─────────────────────────────────
    "cbt_thought_detective": {
        "id": "cbt_thought_detective",
        "name": "The Thought Detective",
        "age": 16,
        "tagline": "A city of whispers, thought traps, and a magnifying glass that reveals the truth",
        "tone_hint": "curious, empowering",
        "clinical_approach": "CBT",
        "target_concerns": ["anxiety", "depression"],
        "narrator": {
            "voice": "Leda",
            "style": "encouraging mystery narrator — treats every distortion like a clue, celebrates detective work",
            "atmosphere": "noir-lite city, magnifying glass highlights, thought bubbles visible in the air",
        },
        "synthesis": {
            "character": {
                "name": "Scout",
                "protects": "a magnifying glass that glows when a thought trap is nearby",
                "companion": "Lens, a small owl who can see thoughts floating in the air and reads them aloud",
                "strength": "curiosity — the ability to question what seems obvious",
                "fear": "that the thought traps are right — that the whispers are true",
            },
            "world": {
                "safe_place": "The Evidence Room — a warm library where every shelf holds proof that thought traps lie. A fireplace crackles with debunked fears.",
                "exciting_place": "The Whisper Market — a busy square where everyone's inner critic speaks out loud. Thought traps float like neon signs above the crowd.",
                "avoided_place": "The Echo Chamber — a hall of mirrors where every thought repeats louder and louder until it feels like fact",
                "secret_place": "The Reframe Workshop — a hidden studio where thought traps can be rewritten. Old distortions hang on the wall, crossed out, with balanced thoughts beside them.",
            },
            "story": {
                "catalyst": "The city is being taken over by Thought Traps — invisible patterns that make everyone believe the worst. Scout's magnifying glass can reveal them.",
                "helper": "Dr. Evidence, an old scientist who speaks only in questions: 'What's the evidence for that?' 'What would you tell a friend?'",
                "antagonist": "The All-or-Nothing King — a figure who sees the world in black and white and wants everyone to think in extremes",
                "desire": "to free the city from automatic negative thoughts and show people there are other ways to see things",
            },
            "challenges": {
                "courage_level": "4",
                "approach": "Look at the thought carefully. Ask questions. Find the evidence. Then decide.",
                "hardest_moment": "when the thought trap sounds exactly like your own voice",
            },
            "choices": {
                "help_vs_solo": "Lens helps me spot them, Dr. Evidence helps me question them. I need both.",
                "desired_ending": "Scout realizes the magnifying glass was inside them all along — the power to question thoughts is a skill, not a tool",
                "sacrifice": "giving up the comfort of certainty to live with 'maybe' and 'sometimes'",
            },
            "preferences": {
                "genre": "mystery detective",
                "desired_feeling": "empowered, like a puzzle being solved",
                "cool_things": "magnifying glasses, thought bubbles, noir detective aesthetics, clue boards",
            },
        },
        "therapeutic_data": {
            "source_file": "cognitive_distortions.json",
            "mechanic": "Each quest stage presents a cognitive distortion. Player must identify it, find evidence against it, and write a balanced thought.",
            "npc_archetypes": ["mentor", "mirror"],
            "rest_point_skill": "thought_record",
        },
    },

    # ── 2. DBT: The Fire Keeper ───────────────────────────────────
    "dbt_fire_keeper": {
        "id": "dbt_fire_keeper",
        "name": "The Fire Keeper",
        "age": 19,
        "tagline": "A volcanic island, emotional flames, and the art of tending fire without burning down",
        "tone_hint": "warm, grounded",
        "clinical_approach": "DBT",
        "target_concerns": ["bpd", "emotion_dysregulation", "self_harm"],
        "narrator": {
            "voice": "Kore",
            "style": "steady campfire storyteller — warm, never rushed, models the calm she teaches",
            "atmosphere": "volcanic island, fire and water coexisting, hot springs, obsidian caves",
        },
        "synthesis": {
            "character": {
                "name": "Ember",
                "protects": "a flame that burns inside them — too hot sometimes, too cold others",
                "companion": "Tinder, a small fire salamander who absorbs excess heat and glows when Ember is regulated",
                "strength": "intensity — feeling everything deeply means caring deeply",
                "fear": "that the fire will consume them or extinguish completely — that there's no middle ground",
            },
            "world": {
                "safe_place": "The Hot Springs — warm pools surrounded by smooth obsidian. The water regulates temperature. Breathe in steam, breathe out tension.",
                "exciting_place": "The Forge — a workshop where raw emotional energy is shaped into something useful. Anger becomes a sword. Grief becomes a shield.",
                "avoided_place": "The Eruption Fields — where emotional volcanoes erupt unpredictably. The ground shakes. The air fills with ash.",
                "secret_place": "The Still Pool — deep underground, a perfectly still pool that reflects everything without distortion. Wise Mind lives here.",
            },
            "story": {
                "catalyst": "The island's central volcano is becoming unstable. Ember must learn to regulate the fire — not extinguish it, not let it rage — to save the island.",
                "helper": "Keeper Ashe, an ancient fire guardian who teaches TIPP techniques as volcanic rituals: cold water immersion, intense movement, paced breathing",
                "antagonist": "The Wildfire — not evil, just uncontrolled emotion that destroys what it touches. It was once a small, manageable flame.",
                "desire": "to learn that fire is not the enemy — uncontrolled fire is. The goal is to be a keeper, not a fighter.",
            },
            "challenges": {
                "courage_level": "5",
                "approach": "STOP first. Then observe. Then decide whether to add fuel or cool down.",
                "hardest_moment": "when the fire feels so big that running seems easier than staying",
            },
            "choices": {
                "help_vs_solo": "Tinder keeps me company. Keeper Ashe teaches me. But I have to do the practice myself.",
                "desired_ending": "Ember becomes the new Fire Keeper — someone who holds space for intensity without being destroyed by it",
                "sacrifice": "giving up the rush of the flame for the steady warmth of regulation",
            },
            "preferences": {
                "genre": "elemental fantasy",
                "desired_feeling": "grounded, powerful, like learning a martial art for emotions",
                "cool_things": "fire, obsidian, hot springs, forging, volcanoes, salamanders",
            },
        },
        "therapeutic_data": {
            "source_file": "dbt_skills.json",
            "mechanic": "Rest points teach TIPP skills. Quest choices mirror Opposite Action. Companion bond uses GIVE. The Still Pool is Wise Mind.",
            "npc_archetypes": ["mentor", "companion", "gatekeeper"],
            "rest_point_skill": "tipp",
        },
    },

    # ── 3. ACT: The Compass Quest ─────────────────────────────────
    "act_compass_quest": {
        "id": "act_compass_quest",
        "name": "The Compass Quest",
        "age": 25,
        "tagline": "An unmapped wilderness, a compass that points to what matters, and passengers who won't shut up",
        "tone_hint": "adventurous, philosophical",
        "clinical_approach": "ACT",
        "target_concerns": ["depression", "anxiety", "avoidance"],
        "narrator": {
            "voice": "Charon",
            "style": "trail guide philosopher — speaks about the journey, not the destination. Uses nature metaphors. Never rushes.",
            "atmosphere": "vast wilderness, compass navigation, weather as metaphor, streams and mountains",
        },
        "synthesis": {
            "character": {
                "name": "Wren",
                "protects": "a compass that doesn't point north — it points toward what matters most to them",
                "companion": "Cairn, a mountain goat who builds stone markers at every meaningful moment — even the painful ones",
                "strength": "persistence — keeping walking even when the path is unclear",
                "fear": "that the compass is broken, that they're walking in the wrong direction, that the passengers are right",
            },
            "world": {
                "safe_place": "Base Camp — a warm tent by a stream where the compass rests on a flat stone. The sound of water. A fire that doesn't need tending.",
                "exciting_place": "The Unmarked Ridge — a high path with no trail markers. The compass spins here. Every direction is possible.",
                "avoided_place": "The Passenger Valley — a canyon where every worry, self-doubt, and critical thought echoes off the walls as voices",
                "secret_place": "The Observation Point — the highest peak, where you can see the whole journey behind you and the valley ahead. Perspective lives here.",
            },
            "story": {
                "catalyst": "Wren has been standing at the trailhead for a long time, unable to start walking because the passengers keep arguing about which way to go. The compass is ready. The feet aren't.",
                "helper": "Guide, a quiet trail marker who appears at crossroads and asks one question: 'What matters to you here?'",
                "antagonist": "The Passengers — not enemies, just noisy inner voices (fear, doubt, perfectionism) who want to keep Wren safe by keeping them still",
                "desire": "to walk in the direction of values even when the passengers are screaming — to accept they're along for the ride without letting them drive",
            },
            "challenges": {
                "courage_level": "6",
                "approach": "notice the passengers, thank them for trying to help, and keep walking anyway",
                "hardest_moment": "when the compass points through the Passenger Valley — the only way forward is through the noise",
            },
            "choices": {
                "help_vs_solo": "Cairn walks with me. Guide appears when I need direction. The passengers come too — I can't leave them behind.",
                "desired_ending": "Wren reaches no specific destination but realizes the walking itself was the point. The passengers are quieter now — not gone, just less convincing.",
                "sacrifice": "giving up the fantasy of a life without discomfort to live a life that matters",
            },
            "preferences": {
                "genre": "wilderness adventure",
                "desired_feeling": "expansive, like standing on a mountain after a long climb",
                "cool_things": "compasses, mountain trails, stone cairns, weather, campfires, maps",
            },
        },
        "therapeutic_data": {
            "source_file": "act_processes.json",
            "mechanic": "Compass = Values. Passengers = Cognitive Defusion. Walking through = Committed Action. Observation Point = Self-as-Context. Every choice maps to ACT Matrix (toward/away).",
            "npc_archetypes": ["mentor", "challenger"],
            "rest_point_skill": "dropping_anchor",
        },
    },

    # ── 4. IFS: The Council of Parts ──────────────────────────────
    "ifs_council_of_parts": {
        "id": "ifs_council_of_parts",
        "name": "The Council of Parts",
        "age": 30,
        "tagline": "An inner castle, a council table, and the parts of you that have been protecting you all along",
        "tone_hint": "gentle, revelatory",
        "clinical_approach": "IFS",
        "target_concerns": ["ptsd", "bpd", "depression", "complex_trauma"],
        "narrator": {
            "voice": "Leda",
            "style": "gentle fairy tale narrator — speaks about inner characters with warmth and curiosity, never pathologizing",
            "atmosphere": "inner castle, council chamber, hidden rooms, protective walls, gardens beneath",
        },
        "synthesis": {
            "character": {
                "name": "Self",
                "protects": "a seat at the head of the Council Table — the place of calm leadership that's been empty for a long time",
                "companion": "Clarity, a small lantern that grows brighter the closer Self gets to understanding a Part's intention",
                "strength": "curiosity and compassion — the ability to listen to every Part without judgment",
                "fear": "that some Parts are too damaged, too angry, or too wounded to be understood",
            },
            "world": {
                "safe_place": "The Self Room — a warm, centered chamber at the heart of the castle. No Part controls it. It belongs to everyone equally.",
                "exciting_place": "The Manager's Wing — a busy office where Protectors plan and control everything. Filing cabinets of rules. Whiteboards of strategies.",
                "avoided_place": "The Exile's Keep — a locked tower where wounded Parts were sent long ago. It's dark and cold. Someone is crying.",
                "secret_place": "The Firefighter's Armory — a hidden room full of emergency measures: numbness shields, rage swords, escape tunnels. Used when pain breaks through.",
            },
            "story": {
                "catalyst": "The castle is in conflict. Managers and Firefighters are fighting for control, and no one is listening to the Exiles. Self must take the seat and bring the Parts to the table.",
                "helper": "Witness, an ancient painting on the castle wall that has watched every Part since childhood. It remembers why each Part was created.",
                "antagonist": "The Inner Critic — not evil, but a Manager Part that became so rigid it forgot its original purpose: to protect by preventing failure",
                "desire": "to unburden the Exiles, appreciate the Protectors, and lead the inner system with Self energy",
            },
            "challenges": {
                "courage_level": "7",
                "approach": "approach each Part with curiosity: 'What are you afraid would happen if you stopped doing your job?'",
                "hardest_moment": "entering the Exile's Keep and hearing what they've been holding",
            },
            "choices": {
                "help_vs_solo": "Clarity lights the way. Witness provides context. But only Self can sit at the table.",
                "desired_ending": "The Council meets. Every Part has a voice. The Exiles are unburdened. The Protectors find new roles. Self leads with compassion.",
                "sacrifice": "giving up the illusion of a single, simple identity to embrace the full, complex inner family",
            },
            "preferences": {
                "genre": "inner journey fantasy",
                "desired_feeling": "profound, like meeting yourself for the first time",
                "cool_things": "castles, council tables, lanterns, hidden rooms, ancient paintings, keys",
            },
        },
        "therapeutic_data": {
            "source_file": "ifs_model.json",
            "mechanic": "Each wing of the castle is a Part type. Quests involve approaching Parts with curiosity, understanding their protective intent, and unburdening Exiles. The Council Table is the integration space.",
            "npc_archetypes": ["mirror", "companion", "gatekeeper"],
            "rest_point_skill": "self_energy_meditation",
        },
    },

    # ── 5. MI/OARS: The Listener's Garden ─────────────────────────
    "mi_listeners_garden": {
        "id": "mi_listeners_garden",
        "name": "The Listener's Garden",
        "age": 20,
        "tagline": "A garden that grows from listening, seeds that bloom when heard, and a gate that opens to change",
        "tone_hint": "gentle, organic",
        "clinical_approach": "MI/OARS",
        "target_concerns": ["sud", "ambivalence", "avoidance", "low_motivation"],
        "narrator": {
            "voice": "Leda",
            "style": "gardener narrator — speaks in growth metaphors, patient, never rushes the season",
            "atmosphere": "lush garden, seeds and soil, rain, sunlight, seasons changing, roots visible underground",
        },
        "synthesis": {
            "character": {
                "name": "Reed",
                "protects": "a pouch of seeds — each one holds a conversation that mattered. Some haven't been planted yet.",
                "companion": "Echo, a small bird who repeats back what people say — but always catches the feeling underneath the words",
                "strength": "listening — really listening, not waiting to talk. Hearing what people mean, not just what they say.",
                "fear": "that some seeds won't grow no matter how much care you give them. That some conversations can't be heard.",
            },
            "world": {
                "safe_place": "The Listening Bench — a garden seat where you can hear the roots growing underground. No one talks here. Everything communicates in other ways.",
                "exciting_place": "The Ambivalence Crossroads — a garden fork where two paths are equally green. Both are valid. The choice isn't about right or wrong.",
                "avoided_place": "The Withered Patch — a section of the garden where nothing grows because someone kept telling the seeds what they should become instead of asking what they wanted to be",
                "secret_place": "The Root Network — underground, all the plants are connected. What happens to one affects all. This is where change really begins.",
            },
            "story": {
                "catalyst": "The garden is divided. One half is wild and overgrown (sustain talk — reasons not to change). The other half is bare (change talk — desire but no action). Reed must listen to both sides.",
                "helper": "Old Growth, a massive ancient tree who asks only open-ended questions and has never given advice in 500 years",
                "antagonist": "The Righting Reflex — a well-meaning wind that blows seeds where it thinks they should go, uprooting everything in the process",
                "desire": "to help the garden find its own direction — not by pushing, but by listening until the roots know where to grow",
            },
            "challenges": {
                "courage_level": "4",
                "approach": "ask, don't tell. Reflect, don't fix. Summarize, don't assume. Affirm, don't praise.",
                "hardest_moment": "when the garden is clearly dying and every instinct screams to intervene — but the garden needs to find its own way",
            },
            "choices": {
                "help_vs_solo": "Echo helps me hear. Old Growth helps me wait. But the garden does its own growing.",
                "desired_ending": "Reed learns that the most powerful thing in the world is a well-timed question. The garden blooms — not because Reed made it, but because Reed listened.",
                "sacrifice": "giving up the need to fix, solve, and save — to trust that listening is enough",
            },
            "preferences": {
                "genre": "botanical fantasy",
                "desired_feeling": "patient, like watching a time-lapse of a seed becoming a tree",
                "cool_things": "seeds, roots, rain, seasons, old trees, bird songs, garden paths",
            },
        },
        "therapeutic_data": {
            "source_file": "oars_framework.json",
            "mechanic": "Every NPC interaction uses OARS: Open questions, Affirmations, Reflections, Summaries. Echo models reflective listening. Old Growth models the curiosity stance. The Righting Reflex is the anti-pattern to avoid.",
            "npc_archetypes": ["scribe", "mentor", "peer_recovery"],
            "rest_point_skill": "reflective_listening",
        },
    },
}


def list_clinical_cartridges():
    """Return summary list of clinical cartridges."""
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "age": c["age"],
            "tagline": c["tagline"],
            "tone_hint": c["tone_hint"],
            "clinical_approach": c["clinical_approach"],
            "target_concerns": c["target_concerns"],
        }
        for c in CLINICAL_CARTRIDGES.values()
    ]


def get_clinical_cartridge(cartridge_id: str):
    """Return full clinical cartridge data or None."""
    return CLINICAL_CARTRIDGES.get(cartridge_id)
