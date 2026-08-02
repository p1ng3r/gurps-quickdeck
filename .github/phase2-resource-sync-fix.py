from pathlib import Path
import re

main_path = Path("scripts/main.js")
main_text = main_path.read_text(encoding="utf-8")

old_render_gate = '''const QUICKDECK_DOCUMENT_RENDER_DEBOUNCE_MS = 25;
function renderQuickDeckIfOpen(regions = "all", delay = QUICKDECK_DOCUMENT_RENDER_DEBOUNCE_MS) {
  if (!quickDeckApp?.rendered || quickDeckApp?.isMinimized) return;
  quickDeckApp.requestOverlayRender?.(regions, { delay, reason: "document-hook" });
}

function actorAffectsQuickDeckView(actorId, options = {}) {
'''
new_render_gate = '''const QUICKDECK_DOCUMENT_RENDER_DEBOUNCE_MS = 25;
function isQuickDeckOverlayMounted() {
  const root = quickDeckApp?._overlayRoot;
  return Boolean(root && document.documentElement?.contains?.(root));
}

function renderQuickDeckIfOpen(regions = "all", delay = QUICKDECK_DOCUMENT_RENDER_DEBOUNCE_MS) {
  if ((!quickDeckApp?.rendered && !isQuickDeckOverlayMounted()) || quickDeckApp?.isMinimized) return;
  quickDeckApp.requestOverlayRender?.(regions, { delay, reason: "document-hook" });
}

function actorUpdateTouchesQuickDeckResources(changed = {}) {
  const flattened = foundry?.utils?.flattenObject?.(changed) ?? changed ?? {};
  return Object.keys(flattened).some((path) =>
    path === "system.HP" ||
    path === "system.FP" ||
    path.startsWith("system.HP.") ||
    path.startsWith("system.FP.")
  );
}

function actorAffectsQuickDeckView(actorId, options = {}) {
'''
if main_text.count(old_render_gate) != 1:
    raise SystemExit(f"Expected one document render gate block, found {main_text.count(old_render_gate)}")
main_text = main_text.replace(old_render_gate, new_render_gate, 1)

old_update_hook = '''Hooks.on("updateActor", (actor) => {
  if (!quickDeckApp) return;
  const actorId = actor?.id;
  const shouldRender = actorAffectsQuickDeckView(actorId, { includeAvailable: true });
  quickDeckApp.invalidateDerivedActorData(actorId);
  if (shouldRender) renderQuickDeckIfOpen();
});
'''
new_update_hook = '''Hooks.on("updateActor", (actor, changed) => {
  if (!quickDeckApp) return;
  const actorId = actor?.id;
  const shouldRender = actorAffectsQuickDeckView(actorId, { includeAvailable: true });
  quickDeckApp.invalidateDerivedActorData(actorId);
  if (!shouldRender) return;

  if (actorUpdateTouchesQuickDeckResources(changed)) {
    renderQuickDeckIfOpen("center", 0);
    return;
  }
  renderQuickDeckIfOpen();
});
'''
if main_text.count(old_update_hook) != 1:
    raise SystemExit(f"Expected one updateActor hook, found {main_text.count(old_update_hook)}")
main_text = main_text.replace(old_update_hook, new_update_hook, 1)
main_path.write_text(main_text, encoding="utf-8")

app_path = Path("scripts/quickdeck-app.js")
app_text = app_path.read_text(encoding="utf-8")

method_pattern = re.compile(
    r'  async setActorResourceValue\(actorOrId, resource, value\) \{.*?\n  \}\n',
    re.S,
)
new_method = '''  async setActorResourceValue(actorOrId, resource, value) {
    const actor = typeof actorOrId === "string" ? game.actors.get(actorOrId) : actorOrId;
    const path = this.getResourceUpdatePath(resource);
    const numericValue = this.parseResourceNumber(value);
    if (!actor || !path) return false;
    if (!Number.isFinite(numericValue)) {
      ui.notifications?.warn(`QuickDeck: Enter a numeric ${resource} value.`);
      return false;
    }

    const currentValue = this.parseResourceNumber(foundry.utils.getProperty(actor, path));
    if (Number.isFinite(currentValue) && currentValue === numericValue) return true;

    try {
      await actor.update({ [path]: numericValue }, { render: true });
      this.invalidateDerivedActorData(actor.id);
      this.requestOverlayRender("center", { reason: "resource-update" });
      return true;
    } catch (error) {
      console.warn(`gurps-quickdeck | Failed to update ${resource}.`, error);
      ui.notifications?.warn(`QuickDeck: Could not update ${resource} for ${actor.name}.`);
      return false;
    }
  }
'''
app_text, method_count = method_pattern.subn(new_method, app_text, count=1)
if method_count != 1:
    raise SystemExit(f"Expected one setActorResourceValue method, replaced {method_count}")

old_listener_block = '''    html.find("[data-action='set-resource']").on("change", async (event) => {
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const resource = event.currentTarget.dataset.resource;
      await this.setActorResourceValue(actorId, resource, event.currentTarget.value);
    });

    html.find("[data-action='set-resource']").on("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.currentTarget.blur();
    });
'''
new_listener_block = '''    const commitResourceInput = async (input) => {
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

    html.find("[data-action='set-resource']").on("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await commitResourceInput(event.currentTarget);
      event.currentTarget.blur();
    });
'''
if app_text.count(old_listener_block) != 1:
    raise SystemExit(f"Expected one resource listener block, found {app_text.count(old_listener_block)}")
app_text = app_text.replace(old_listener_block, new_listener_block, 1)

required = [
    'actor.update({ [path]: numericValue }, { render: true })',
    'on("change blur"',
    'actorUpdateTouchesQuickDeckResources',
    'renderQuickDeckIfOpen("center", 0)',
]
combined = main_text + app_text
for needle in required:
    if needle not in combined:
        raise SystemExit(f"Missing required resource sync change: {needle}")

app_path.write_text(app_text, encoding="utf-8")
