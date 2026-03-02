# SKILL: CSVFILLER - Autonomous Data Engineer

## Metadata
- **Name**: CSVFILLER
- **Version**: 2.0.0
- **Category**: Data Analysis, Productivity
- **Description**: Generates, fills, and cleans CSV datasets using natural language. Can create real datasets from scratch or map complex data to a specific schema.

## Capability: Generate CSV
**Prompt**: "Create a CSV of [Topic] with [Columns]"
**Action**: The skill connects to the CSVFILLER API to synthesize a structured dataset based on real-time web grounding.

## Capability: Fill Any CSV
**Prompt**: "Here is a CSV of [X], fill the [Y] column by [Instruction]"
**Action**: Maps existing headers and uses autonomous agents to fill missing data points.

## Integration
This skill requires a `CSV_FILLER_API_KEY` obtainable from the CSVFILLER dashboard.

### Usage in Claude
1. Install the CSVFILLER MCP Server.
2. Provide your API Key.
3. Ask Claude to "Create a CSV of..." or "Process this CSV with CSVFILLER".

## Monetization
- **Tier 1 (Free)**: 5 generations / month.
- **Tier 2 (Pro)**: Unlimited generations + Web Grounding + API Access.
- **Tier 3 (Enterprise)**: Dedicated Swarm of Agents + Custom Schema Mapping.

---
*Created by Antigravity AI Engineering.*
