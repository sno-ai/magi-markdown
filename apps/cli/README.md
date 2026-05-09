# @markdown-ai/cli

Reference CLI for Markdown AI / MDA artifacts.

```sh
npx @markdown-ai/cli --help
```

The installed binary is `mda`.

```sh
mda init hello-skill --out hello.mda
mda validate hello.mda --json
mda compile hello.mda --target SKILL.md AGENTS.md MCP-SERVER.md --out-dir out --integrity
mda conformance --level V --json
```

See [HOW-TO-USE.md](./HOW-TO-USE.md) for the command manual.
