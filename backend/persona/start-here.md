<!-- last-verified: 2026-03-25 -->
> Parent: [../start-here.md](../start-here.md)

# persona/ — Start Here

> Read this first. Jump to [persona.md](persona.md) or [persona.ctx](persona.ctx) only for the component you need.

| Component | What it is | persona.md | persona.ctx |
|---|---|---|---|
| **BrandEmotionalComputer** | Computes brand mood (X-axis) from customer signals like gift shopping, price sensitivity, and product interest | [BrandEmotionalComputer](persona.md#BrandEmotionalComputer) | BrandEmotionalComputer node |
| **BrandLinguisticComputer** | Defines fixed jewelry brand voice (Z-axis) with vocabulary transforms and Aria's character prompt | [BrandLinguisticComputer](persona.md#BrandLinguisticComputer) | BrandLinguisticComputer node |
| **BrandRelationalComputer** | Detects product/material/occasion entities in messages via SQLite jewelry KG traversal (Y-axis) | [BrandRelationalComputer](persona.md#BrandRelationalComputer) | BrandRelationalComputer node |
| **BrandTemporalComputer** | Tracks customer journey stage from greeting through decision (T-axis) | [BrandTemporalComputer](persona.md#BrandTemporalComputer) | BrandTemporalComputer node |
| **TherapyEmotionalComputer** | Computes empathy level (X-axis) from crisis flags, breakthroughs, and KG concern intensities | [TherapyEmotionalComputer](persona.md#TherapyEmotionalComputer) | TherapyEmotionalComputer node |
| **TherapyLinguisticComputer** | Adapts therapeutic voice (Z-axis) using media analogies, mood-based tone, and clinical-to-human vocabulary | [TherapyLinguisticComputer](persona.md#TherapyLinguisticComputer) | TherapyLinguisticComputer node |
| **TherapyRelationalComputer** | Activates therapy KG subgraphs (Y-axis) from concern/trigger mentions, including media analogies and coping strategies | [TherapyRelationalComputer](persona.md#TherapyRelationalComputer) | TherapyRelationalComputer node |
| **TherapyTemporalComputer** | Tracks session arc and cross-session continuity (T-axis), generates the "handoff moment" prompt | [TherapyTemporalComputer](persona.md#TherapyTemporalComputer) | TherapyTemporalComputer node |
