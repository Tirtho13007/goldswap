# GoldSwap Design Tooling Lock

**Locked:** 2 November 2026

The project rules are in root `AGENTS.md`, visual tokens are in root `DESIGN.md`, and compact product context is in root `PRODUCT.md`. These files are versioned in Git and remain authoritative even if optional design skills are unavailable.

## Installed skills and provenance

| Tool | Installation | Upstream revision recorded during setup |
|---|---|---|
| Awesome DESIGN.md grounding | Custom Codex wrapper in `~/.codex/skills/awesome-design-md`; catalogue reference only | `voltagent/awesome-design-md@fcc70284932276d085f01ef9f83edde90b1258cb` |
| Impeccable | Global Codex/agents skill plus hook; engine `0.1.18` | `pbakaus/impeccable@e89e3ada3e875a89ac2c5d33d11e65ebef6fe285` |
| Taste Skill | Global Codex skill | `leonxlnx/taste-skill@12af471f627f866411b4bd785b19646d3672784c` |
| Web Design Guidelines | Global Codex skill | `vercel-labs/agent-skills@1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` |

Skills are available to new Codex turns/sessions after discovery refresh. Their upstream instructions supplement, but never override, direct user instructions or GoldSwap product/design truth.

## Reinstallation on another machine

From a trusted environment, install only from the recorded upstream repositories and review newer revisions before upgrading:

```text
python <skill-installer>/scripts/install-skill-from-github.py --repo leonxlnx/taste-skill --path skills/taste-skill
python <skill-installer>/scripts/install-skill-from-github.py --repo vercel-labs/agent-skills --path skills/web-design-guidelines
npx impeccable install --providers=codex --scope=global -y
```

Recreate the narrow `awesome-design-md` wrapper from the project rule if required; do not install all external brand files as GoldSwap tokens.

## Required frontend pipeline

1. Read `PRODUCT.md`, `DESIGN.md` and relevant source-of-truth documents.
2. Apply BOLD 55, MOTION 35 and DENSITY 58 unless an approved design-system change says otherwise.
3. Run Impeccable audit and polish for components, typography and backgrounds.
4. Run Web Design Guidelines and the local interaction-state checker.
5. Build/test.
6. Perform real localhost interaction and screenshot QA through Playwright MCP in desktop/mobile and light/dark.
7. Fix all observed overlap, overflow, contrast, focus and loading-state defects before completion.

Do not treat an automated audit as proof of visual correctness; closed-loop browser QA remains required.

