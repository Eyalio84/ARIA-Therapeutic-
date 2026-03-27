"""
Pre-built game cartridges — 3 complete mock user profiles that bypass the interview.

Each cartridge provides a synthesis dict identical to what GameInterviewEngine.synthesize()
would return, so GameGenerator.generate() produces a valid GameConfig from it.
"""

CARTRIDGES = {
    "maya": {
        "id": "maya",
        "name": "Maya",
        "age": 14,
        "tagline": "Ocean depths, school pressure, a luminous jellyfish named Glow",
        "tone_hint": "adventurous, warm",
        "narrator": {
            "voice": "Leda",
            "style": "gentle, full of wonder, speaks like reading a picture book — simple words, vivid images, pauses for awe",
            "atmosphere": "oceanic, bioluminescent, dreamlike — sounds of water, soft light, distant whale song",
        },
        "synthesis": {
            "character": {
                "name": "Maya",
                "protects": "her little brother and her sketchbook full of ocean drawings",
                "companion": "Glow, a luminous jellyfish who pulses with soft light when Maya is scared",
                "strength": "noticing things others miss — patterns in waves, moods in silence",
                "fear": "being invisible, fading into the background while everyone moves on without her",
            },
            "world": {
                "safe_place": "A coral library beneath the reef where bioluminescent fish drift between the shelves. It's quiet here. The water hums.",
                "exciting_place": "The Abyssal Rift — a deep ocean canyon where giant kelp sways like cathedral pillars and strange creatures glow in the dark",
                "avoided_place": "The Surface School — a floating platform of desks and bells where the water churns with noise and everyone talks over each other",
                "secret_place": "A hidden underwater cave behind a waterfall, where the walls are covered in ancient drawings that look like her sketches",
            },
            "story": {
                "catalyst": "The tides are rising. The coral library is flooding, and the ancient drawings are washing away. Someone has to dive deeper to save them.",
                "helper": "Coral, an old sea turtle who speaks slowly and remembers everything — even things that haven't happened yet",
                "antagonist": "The Tide — a rising pressure that drowns out everything quiet and beautiful, replacing it with noise and rush",
                "desire": "to be seen — really seen — without having to shout",
            },
            "challenges": {
                "courage_level": "4",
                "approach": "I'd watch and wait, figure out the pattern, then move when the time is right",
                "hardest_moment": "when everyone is talking and I can't find a gap to say what I need to say",
            },
            "choices": {
                "help_vs_solo": "I'd want help but I'd be afraid to ask. I'd probably try alone first, then realize I need someone.",
                "desired_ending": "I want Maya to realize that being quiet is her superpower, not her weakness",
                "sacrifice": "I'd give up being comfortable to protect something beautiful that nobody else notices",
            },
            "preferences": {
                "genre": "ocean fantasy",
                "desired_feeling": "adventure and wonder, like Studio Ghibli underwater",
                "cool_things": "dolphins, underwater caves, bioluminescence, Spirited Away",
            },
        },
    },
    "ren": {
        "id": "ren",
        "name": "Ren",
        "age": 22,
        "tagline": "Space station, failing comms, a repair drone named Fix",
        "tone_hint": "mysterious, hopeful",
        "narrator": {
            "voice": "Charon",
            "style": "measured, quiet intensity — speaks like a ship's log narrator, technical words mixed with loneliness, pauses that feel like void",
            "atmosphere": "sci-fi, metallic hums, distant static, emergency lights flickering — isolation in vast space",
        },
        "synthesis": {
            "character": {
                "name": "Ren",
                "protects": "a playlist of songs that remind him of people he used to talk to",
                "companion": "Fix, a small repair drone who beeps encouragingly and fixes broken things — except loneliness",
                "strength": "understanding systems — how machines work, how signals travel, how code flows",
                "fear": "that the silence around him isn't because comms are broken — it's because nobody's trying to reach him",
            },
            "world": {
                "safe_place": "The engine room — warm hum of the reactor, screens glowing blue, Fix charging in the corner. The only place that feels alive.",
                "exciting_place": "Sector 7 — an abandoned research wing where strange experiments left behind encrypted logs and half-built machines",
                "avoided_place": "The Observation Deck — a glass dome showing infinite stars. Beautiful, but the silence there is too heavy.",
                "secret_place": "A sealed lab with a working terminal that still receives transmissions from Earth — someone is still broadcasting",
            },
            "story": {
                "catalyst": "The station's communication array has gone dark. Not broken — deliberately shut down. Someone on the station doesn't want anyone to connect.",
                "helper": "Echo, a holographic AI fragment from the station's original crew — glitchy, incomplete, but trying to help",
                "antagonist": "The Static — an interference pattern that scrambles all communication, growing stronger the more Ren tries to connect",
                "desire": "to hear another real voice — to know that connection is still possible",
            },
            "challenges": {
                "courage_level": "5",
                "approach": "I'd reverse-engineer the problem. Trace the signal. Find the source. Fix the code.",
                "hardest_moment": "sending a message into the void and getting nothing back",
            },
            "choices": {
                "help_vs_solo": "I'm used to being alone. But Fix makes it bearable. I'd accept help if it was offered genuinely.",
                "desired_ending": "Ren restores the comms and hears a voice — not rescuers, but someone else alone on another station. They start talking.",
                "sacrifice": "I'd risk the safe routine of isolation to reach out — even knowing the signal might never be returned",
            },
            "preferences": {
                "genre": "sci-fi",
                "desired_feeling": "mystery and discovery, like Blade Runner meets Firewatch",
                "cool_things": "synthesizers, space stations, AI companions, old radio signals, Blade Runner",
            },
        },
    },
    "ash": {
        "id": "ash",
        "name": "Ash",
        "age": 35,
        "tagline": "Fog-covered city, shifting buildings, a stray cat named Nobody",
        "tone_hint": "contemplative, atmospheric",
        "narrator": {
            "voice": "Kore",
            "style": "noir narration — short sentences, dry observations, philosophical asides, speaks like a detective's inner monologue",
            "atmosphere": "rain-soaked, fog, neon reflections on wet streets, jazz piano in the distance, cigarette smoke metaphors",
        },
        "synthesis": {
            "character": {
                "name": "Ash",
                "protects": "a chess piece — a black knight — carried since childhood. Can't remember who gave it to them.",
                "companion": "Nobody, a stray cat who appears in impossible places and stares like it knows something you don't",
                "strength": "patience — the ability to sit with discomfort and wait for clarity",
                "fear": "that there is no real self underneath all the roles — that 'Ash' is just a collection of habits",
            },
            "world": {
                "safe_place": "A small rain-soaked cafe that serves black coffee and plays jazz that's always slightly familiar. The barista never asks questions.",
                "exciting_place": "The Shifting District — a part of the city where buildings rearrange overnight. Maps are useless here. You navigate by feeling.",
                "avoided_place": "The Mirror City — a district where every surface is reflective and every reflection shows a different version of you",
                "secret_place": "An old clocktower that stopped at 3:47. Inside, time doesn't apply. Things from the past and future coexist.",
            },
            "story": {
                "catalyst": "Ash woke up and couldn't remember what they did for a living. Not amnesia — the answer just stopped mattering. Then the city started changing to match.",
                "helper": "Rook, a retired detective who runs a bookshop full of unfinished novels. Speaks only in questions.",
                "antagonist": "The Mirror City — not a person but a place that reflects every version of who you could be, making it impossible to commit to one",
                "desire": "to feel like a single, continuous person — not a kaleidoscope of fragments",
            },
            "challenges": {
                "courage_level": "6",
                "approach": "I'd think. Walk. Smoke. Think more. Move when the pattern reveals itself.",
                "hardest_moment": "Looking in a mirror and not recognizing the expression looking back",
            },
            "choices": {
                "help_vs_solo": "I'd sit with Rook in silence. Not asking for help exactly — just being near someone who understands that some things can't be fixed.",
                "desired_ending": "Ash stops looking for the 'real' version and learns to be comfortable being multiple things at once",
                "sacrifice": "I'd give up the comfort of a single identity to embrace the full, contradictory truth",
            },
            "preferences": {
                "genre": "noir philosophical",
                "desired_feeling": "contemplative, like a Kafka story crossed with a rainy window",
                "cool_things": "chess, rain, Kafka, noir films, jazz, clocks, fog",
            },
        },
    },
}


def list_cartridges():
    """Return summary list of available pre-built games."""
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "age": c["age"],
            "tagline": c["tagline"],
            "tone_hint": c["tone_hint"],
        }
        for c in CARTRIDGES.values()
    ]


def get_cartridge(cartridge_id: str):
    """Return full cartridge data or None."""
    return CARTRIDGES.get(cartridge_id)
