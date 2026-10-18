# Working rules for this repo

This is an ARCH 540 Assignment 2 project: a scenario tool that traces the consequences of decisions in Vancouver's SRO conversion process across years, built on sourced claim chains. Read first_attempt.md, then edges.json, before touching code.

Rules that must not be broken by any change:
1. Nothing in code adds an edge, sets a lag, or chooses a source. Those happen only in edges.json, edited by hand with the paper open.
2. A model, if ever called, receives one edge plus its source's finding sentence and returns one sentence. It never sees the whole graph. No model is called in the first attempt.
3. An option with no sourced outgoing edge stops the run and asks for a source. Do not weaken this check.
4. Forks are drawn on both sides and never resolved in code.
5. render.py reads timeline.json only. It never reads edges.json directly.
6. Every change that alters a file in cases/ is committed on its own, with a message naming the rule that changed the output.
7. No magnitudes. Direction, lag, camp, claim type, evidence grade, source. Nothing else is asserted.

Palette for any output: background #E9E2D6, slate #3D5A6C, coral #E0724E, tan #C9A66B, text #2B3A42, muted #5F6E78.
No em dashes in any text.
