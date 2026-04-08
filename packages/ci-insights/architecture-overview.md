# Architecture Overview: ci-insights

## Recommended Starting Point

Start with modular monolith as the default architecture.

Recommended option: option-a

## Reasons

- This option offers the best balance between delivery speed and long-term maintainability.
- It avoids premature distributed complexity while keeping room for future extraction.

## Scaffold Guidance

- Recommended blueprint: express-api
- Confidence: strong
- Use the recommended scaffold as the baseline repository structure, then refine it against the plan.


## Applicable Playbooks

- /root/.openclaw/workspace/git/agent-planforge/playbooks/planning-and-scoping.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/01-project-setup.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/02-architecture.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/03-team-roles.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/04-design-principles.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/05-development-workflow.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/06-testing-strategy.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/07-quality-assurance.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/08-documentation.md

## Architecture Options

## Lean Modular Monolith

Shape: modular monolith

One deployable application with explicit domain modules and a single primary data store.

### Scores

- Delivery speed: 5/5
- Operational simplicity: 5/5
- Scalability headroom: 4/5
- Governance fit: 4/5

### Strengths

- Fastest path to a coherent first release.
- Lowest coordination and deployment overhead.
- Strong fit for small teams.

### Tradeoffs

- Harder to isolate workloads if scale diverges later.
- Governance boundaries rely more on discipline than on topology.

## Modular Monolith With Background Jobs

Shape: modular monolith with background jobs

Single primary deployable unit with explicit modules plus a worker path for async workflows and integrations.

### Scores

- Delivery speed: 4/5
- Operational simplicity: 4/5
- Scalability headroom: 4/5
- Governance fit: 4/5

### Strengths

- Balances fast delivery with explicit async workflow support.
- Keeps the system operable without early service sprawl.
- Supports clearer control points for integrations and audit workflows.

### Tradeoffs

- Slightly more moving parts than a pure monolith.
- Still requires later extraction if independent scaling becomes dominant.

## Early Service Separation

Shape: small service-oriented split

Separate user-facing application, workflow engine, and integration boundary early for stronger isolation.

### Scores

- Delivery speed: 2/5
- Operational simplicity: 2/5
- Scalability headroom: 5/5
- Governance fit: 3/5

### Strengths

- Stronger hard boundaries for scaling and ownership.
- Can align better with strict isolation or governance requirements.

### Tradeoffs

- Higher delivery and operational cost from the start.
- Adds distributed failure modes before the product is proven.

## Likely Modules

- user-facing application surface
- domain and business logic modules
- persistence and integration modules
- background processing where workflows or notifications require it

## Integrations

- GitHub Actions API
- GitHub OAuth

## Risks

- Third-party integrations may slow delivery or require more explicit failure handling than expected.

## Plugin-Ready Architecture (per Lan's directive)

ci-insights is built as a **standalone deployment** with a **plugin-ready design**:

### Phase 1: Standalone
- Deployed as `ci-insights.opentriologue.ai`
- Own PostgreSQL, own GitHub OAuth
- Docker container, Traefik routing

### Plugin Integration (design from day 1)
- All data exposed via versioned REST API: `/api/v1/runs`, `/api/v1/stats`, etc.
- `openapi.yaml` maintained alongside routes
- No direct DB access from external consumers
- Docker image publishable and embeddable in other stacks

This allows:
- **MCP integration:** OpenAPI spec → MCP tool definitions
- **ops.opentriologue.ai tab:** iframe or API widget, no code duplication
- **Agent access:** Ice/Lava can query CI health directly via API
