from pathlib import Path

app_path = Path("scripts/quickdeck-app.js")
app_text = app_path.read_text(encoding="utf-8")

constructor_marker = '''    this._derivedActorDataCache = new Map();
    this.referenceApp = null;
'''
constructor_replacement = '''    this._derivedActorDataCache = new Map();
    this._preferredActorDocumentsById = new Map();
    this.referenceApp = null;
'''
if app_text.count(constructor_marker) != 1:
    raise SystemExit(f"Expected one actor cache constructor marker, found {app_text.count(constructor_marker)}")
app_text = app_text.replace(constructor_marker, constructor_replacement, 1)

old_active_actor = '''  getActiveActor() {
    return this.activeActorId ? game.actors.get(this.activeActorId) : null;
  }
'''
new_active_actor = '''  isSyntheticTokenActor(actor) {
    return Boolean(
      actor?.isToken === true ||
      actor?.parent?.documentName === "Token" ||
      actor?.token?.documentName === "Token"
    );
  }

  rememberActorDocument(actor) {
    const actorId = String(actor?.id ?? "");
    if (!actorId || !this.isSyntheticTokenActor(actor)) return actor ?? null;
    this._preferredActorDocumentsById.set(actorId, actor);
    return actor;
  }

  getCanvasTokenActor(actorId) {
    const id = String(actorId ?? "");
    if (!id) return null;

    const controlledTokens = Array.from(canvas?.tokens?.controlled ?? []);
    const controlledMatch = controlledTokens.find((token) => String(token?.actor?.id ?? "") === id);
    if (controlledMatch?.actor) return controlledMatch.actor;

    const currentCombatant = game?.combat?.combatant ?? null;
    const currentTokenId = currentCombatant?.tokenId ?? currentCombatant?.token?.id ?? null;
    const currentToken = currentTokenId ? canvas?.tokens?.get?.(currentTokenId) : null;
    if (String(currentToken?.actor?.id ?? "") === id) return currentToken.actor;

    const matches = Array.from(canvas?.tokens?.placeables ?? [])
      .filter((token) => String(token?.actor?.id ?? "") === id);
    return matches.length === 1 ? matches[0].actor : null;
  }

  resolveActorDocument(actorOrId) {
    if (actorOrId && typeof actorOrId === "object") {
      return this.rememberActorDocument(actorOrId);
    }

    const actorId = String(actorOrId ?? "");
    if (!actorId) return null;

    const canvasActor = this.getCanvasTokenActor(actorId);
    if (canvasActor) return this.rememberActorDocument(canvasActor);

    const rememberedActor = this._preferredActorDocumentsById.get(actorId);
    if (rememberedActor) return rememberedActor;

    return game.actors.get(actorId) ?? null;
  }

  getActiveActor() {
    return this.resolveActorDocument(this.activeActorId);
  }
'''
if app_text.count(old_active_actor) != 1:
    raise SystemExit(f"Expected one getActiveActor method, found {app_text.count(old_active_actor)}")
app_text = app_text.replace(old_active_actor, new_active_actor, 1)

old_adjust = '''  async adjustActorResource(actorId, resource, delta) {
    const actor = actorId ? game.actors.get(actorId) : null;
'''
new_adjust = '''  async adjustActorResource(actorId, resource, delta) {
    const actor = this.resolveActorDocument(actorId);
'''
if app_text.count(old_adjust) != 1:
    raise SystemExit(f"Expected one adjustActorResource actor lookup, found {app_text.count(old_adjust)}")
app_text = app_text.replace(old_adjust, new_adjust, 1)

old_set = '''  async setActorResourceValue(actorOrId, resource, value) {
    const actor = typeof actorOrId === "string" ? game.actors.get(actorOrId) : actorOrId;
'''
new_set = '''  async setActorResourceValue(actorOrId, resource, value) {
    const actor = this.resolveActorDocument(actorOrId);
'''
if app_text.count(old_set) != 1:
    raise SystemExit(f"Expected one setActorResourceValue actor lookup, found {app_text.count(old_set)}")
app_text = app_text.replace(old_set, new_set, 1)

old_uuid_return = '''        if (resolvedDocument?.documentName === "Actor" || resolvedDocument instanceof Actor) {
          return resolvedDocument;
        }
'''
new_uuid_return = '''        if (resolvedDocument?.documentName === "Actor" || resolvedDocument instanceof Actor) {
          return this.rememberActorDocument(resolvedDocument);
        }
'''
if app_text.count(old_uuid_return) != 1:
    raise SystemExit(f"Expected one UUID actor return, found {app_text.count(old_uuid_return)}")
app_text = app_text.replace(old_uuid_return, new_uuid_return, 1)

old_id_return = '''    if (actorId) {
      const actor = game.actors.get(actorId);
      if (actor) return actor;
    }
'''
new_id_return = '''    if (actorId) {
      const actor = this.resolveActorDocument(actorId);
      if (actor) return actor;
    }
'''
if app_text.count(old_id_return) != 1:
    raise SystemExit(f"Expected one dropped actor ID fallback, found {app_text.count(old_id_return)}")
app_text = app_text.replace(old_id_return, new_id_return, 1)

app_path.write_text(app_text, encoding="utf-8")

main_path = Path("scripts/main.js")
main_text = main_path.read_text(encoding="utf-8")

old_resource_detector = '''function actorUpdateTouchesQuickDeckResources(changed = {}) {
  const flattened = foundry?.utils?.flattenObject?.(changed) ?? changed ?? {};
  return Object.keys(flattened).some((path) =>
    path === "system.HP" ||
    path === "system.FP" ||
    path.startsWith("system.HP.") ||
    path.startsWith("system.FP.")
  );
}
'''
new_resource_detector = '''function actorUpdateTouchesQuickDeckResources(changed = {}) {
  const flattened = foundry?.utils?.flattenObject?.(changed) ?? changed ?? {};
  return Object.keys(flattened).some((path) =>
    /(?:^|\\.)system\\.(?:HP|FP)(?:\\.|$)/.test(String(path))
  );
}
'''
if main_text.count(old_resource_detector) != 1:
    raise SystemExit(f"Expected one resource detector, found {main_text.count(old_resource_detector)}")
main_text = main_text.replace(old_resource_detector, new_resource_detector, 1)

old_update_actor = '''Hooks.on("updateActor", (actor, changed) => {
  if (!quickDeckApp) return;
  const actorId = actor?.id;
  const shouldRender = actorAffectsQuickDeckView(actorId, { includeAvailable: true });
  quickDeckApp.invalidateDerivedActorData(actorId);
'''
new_update_actor = '''Hooks.on("updateActor", (actor, changed) => {
  if (!quickDeckApp) return;
  const actorId = actor?.id;
  quickDeckApp.rememberActorDocument?.(actor);
  const shouldRender = actorAffectsQuickDeckView(actorId, { includeAvailable: true });
  quickDeckApp.invalidateDerivedActorData(actorId);
'''
if main_text.count(old_update_actor) != 1:
    raise SystemExit(f"Expected one updateActor hook header, found {main_text.count(old_update_actor)}")
main_text = main_text.replace(old_update_actor, new_update_actor, 1)

insert_after_update_actor = '''Hooks.on("updateActor", (actor, changed) => {
  if (!quickDeckApp) return;
  const actorId = actor?.id;
  quickDeckApp.rememberActorDocument?.(actor);
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
update_token_hook = insert_after_update_actor + '''
Hooks.on("updateToken", (tokenDocument, changed) => {
  if (!quickDeckApp || !actorUpdateTouchesQuickDeckResources(changed)) return;
  const actor = tokenDocument?.actor ?? null;
  const actorId = actor?.id ?? tokenDocument?.actorId ?? null;
  if (!actorId) return;

  quickDeckApp.rememberActorDocument?.(actor);
  quickDeckApp.invalidateDerivedActorData(actorId);
  if (actorAffectsQuickDeckView(actorId, { includeAvailable: true })) {
    renderQuickDeckIfOpen("center", 0);
  }
});
'''
if main_text.count(insert_after_update_actor) != 1:
    raise SystemExit(f"Expected one completed updateActor hook, found {main_text.count(insert_after_update_actor)}")
main_text = main_text.replace(insert_after_update_actor, update_token_hook, 1)

main_path.write_text(main_text, encoding="utf-8")

combined = app_text + main_text
required = [
    "this._preferredActorDocumentsById = new Map()",
    "rememberActorDocument(actor)",
    "getCanvasTokenActor(actorId)",
    "resolveActorDocument(actorOrId)",
    "const actor = this.resolveActorDocument(actorId)",
    "const actor = this.resolveActorDocument(actorOrId)",
    'Hooks.on("updateToken"',
    "quickDeckApp.rememberActorDocument?.(actor)",
]
for needle in required:
    if needle not in combined:
        raise SystemExit(f"Missing synthetic actor sync change: {needle}")
