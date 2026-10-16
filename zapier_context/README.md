# Zapier Chatbot Context — Virginia Heat Vulnerability Project

## What This Is
A set of structured context files for the embedded Zapier chatbot on the Virginia Heat Vulnerability website.
Upload all `.md` files in this folder (except this README) into your Zapier chatbot's knowledge base.
Each file is well under 2 MB.

## File Map

| File | Purpose |
|------|---------|
| `key_findings.md` | Dr. Johnny Finn's research — the intellectual foundation the bot should anchor to |
| `programs_by_region.md` | Specific programs (tree planting, cooling assistance, shade, housing) by city/region, plus a **Jurisdiction Coverage Index** mapping all 133 VA jurisdictions to their applicable section |

## How to Use in Zapier
1. Go to your Zapier chatbot project (ID: cmvab5ost009veqxawinfyi6q)
2. In the knowledge base / documents section, upload each `.md` file
3. In the system prompt, add: *"You are a heat vulnerability advisor for Virginia. Use the attached documents to give specific, city-level recommendations. Always tie your advice back to Dr. Finn's framework: shade, trees, cooling access, and housing."*
4. Test with: *"I selected Newport News, Virginia — what programs should the city prioritize?"*

## Granularity
The project covers **133 Virginia jurisdictions** at the census block-group level.
The bot should:
- Give **city-specific** program recommendations when a city is selected
- Fall back to **statewide** programs when no city is selected
- Never recommend programs that don't exist in that city (check `programs_by_region.md`)
- Use the **Jurisdiction Coverage Index** in `programs_by_region.md` to confirm which section applies to the selected location; jurisdictions not in a regional section get **Statewide only** guidance
