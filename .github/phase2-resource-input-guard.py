from pathlib import Path

path = Path("scripts/quickdeck-app.js")
text = path.read_text(encoding="utf-8")

old_commit = '''    const commitResourceInput = async (input) => {
      if (!input) return;
      const nextValue = String(input.value ?? "");
      if (input.dataset.qdResourceCommitPending === nextValue) return;
      if (input.dataset.qdResourceCommitted === nextValue) return;

      input.dataset.qdResourceCommitPending = nextValue;
      try {
        const actorId = input.dataset.actorId || this.activeActorId;
        const resource = input.dataset.resource;
        const didUpdate = await this.setActorResourceValue(actorId, resource, nextValue);
        if (didUpdate) input.dataset.qdResourceCommitted = nextValue;
      } finally {
        if (input.dataset.qdResourceCommitPending === nextValue) {
          delete input.dataset.qdResourceCommitPending;
        }
      }
    };

    html.find("[data-action='set-resource']").on("change blur", (event) => {
      void commitResourceInput(event.currentTarget);
    });
'''

new_commit = '''    const commitResourceInput = async (input) => {
      if (!input) return;
      const actorId = input.dataset.actorId || this.activeActorId;
      const resource = input.dataset.resource;
      const actor = this.resolveActorDocument(actorId);
      const nextValue = String(input.value ?? "").trim();
      const parsedValue = this.parseResourceNumber(nextValue);

      if (!Number.isFinite(parsedValue)) {
        const currentValue = this.parseResourceNumber(this.getResourceValue(actor, resource));
        input.value = Number.isFinite(currentValue) ? String(currentValue) : "";
        input.dataset.qdResourceCommitted = input.value;
        return;
      }

      const normalizedValue = String(parsedValue);
      if (input.dataset.qdResourceCommitPending === normalizedValue) return;
      if (input.dataset.qdResourceCommitted === normalizedValue) return;

      input.dataset.qdResourceCommitPending = normalizedValue;
      try {
        const didUpdate = await this.setActorResourceValue(actor, resource, parsedValue);
        if (didUpdate) {
          input.value = normalizedValue;
          input.dataset.qdResourceCommitted = normalizedValue;
        }
      } finally {
        if (input.dataset.qdResourceCommitPending === normalizedValue) {
          delete input.dataset.qdResourceCommitPending;
        }
      }
    };

    html.find("[data-action='set-resource']").on("change", (event) => {
      void commitResourceInput(event.currentTarget);
    });
'''

if text.count(old_commit) != 1:
    raise SystemExit(f"Expected one resource commit block, found {text.count(old_commit)}")
text = text.replace(old_commit, new_commit, 1)

if 'on("change blur"' in text:
    raise SystemExit("Resource input still commits directly on blur")
if text.count('on("change", (event) => {\n      void commitResourceInput(event.currentTarget);') != 1:
    raise SystemExit("Expected one guarded resource change listener")
if 'const parsedValue = this.parseResourceNumber(nextValue);' not in text:
    raise SystemExit("Missing numeric guard")
if 'input.value = Number.isFinite(currentValue) ? String(currentValue) : "";' not in text:
    raise SystemExit("Missing invalid-value restore")

path.write_text(text, encoding="utf-8")
