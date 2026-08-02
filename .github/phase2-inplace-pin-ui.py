from pathlib import Path

path = Path("scripts/quickdeck-app.js")
text = path.read_text(encoding="utf-8")

marker = '''  activateListeners(html) {
    super.activateListeners(html);
'''
helper = '''  syncRightDrawerFavoriteState(type, key, isActive) {
    const root = this._overlayRoot;
    if (!root || !type || !key) return;

    const config = {
      attack: {
        action: "toggle-favorite-attack",
        datasetKey: "attackKey",
        activeTitle: "Unpin attack",
        inactiveTitle: "Pin attack"
      },
      skill: {
        action: "toggle-quick-skill",
        datasetKey: "skillKey",
        activeTitle: "Unpin skill",
        inactiveTitle: "Pin skill"
      },
      spell: {
        action: "toggle-favorite-spell",
        datasetKey: "spellKey",
        activeTitle: "Unpin spell",
        inactiveTitle: "Pin spell"
      }
    }[type];
    if (!config) return;

    const normalizedKey = String(key);
    const buttons = root.querySelectorAll(`[data-action="${config.action}"]`);
    for (const button of buttons) {
      if (String(button.dataset?.[config.datasetKey] ?? "") !== normalizedKey) continue;
      button.classList.toggle("is-active", Boolean(isActive));
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.title = isActive ? config.activeTitle : config.inactiveTitle;
      button.closest(".qd-ui2-action-row")?.classList.toggle("is-favorite", Boolean(isActive));
    }
  }

  renderCenterAfterPinChange(reason) {
    this.requestOverlayRender("center", { reason });
    this.scheduleNativeWindowFocusAfterRender();
  }

  activateListeners(html) {
    super.activateListeners(html);
'''
if text.count(marker) != 1:
    raise SystemExit(f"Expected one activateListeners marker, found {text.count(marker)}")
text = text.replace(marker, helper, 1)

replacements = [
(
'''      this.setQuickSkillSelected(actorId, skillKey, shouldSelect);
      this.requestOverlayRender(["center", "right"], { reason: "toggle-quick-skill" });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.setQuickSkillSelected(actorId, skillKey, shouldSelect);
      this.syncRightDrawerFavoriteState("skill", skillKey, shouldSelect);
      this.renderCenterAfterPinChange("toggle-quick-skill");
'''
),
(
'''      this.setQuickSkillSelected(actorId, skillKey, false);
      this.requestOverlayRender(["center", "right"], { reason: "unpin-quick-skill" });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.setQuickSkillSelected(actorId, skillKey, false);
      this.syncRightDrawerFavoriteState("skill", skillKey, false);
      this.renderCenterAfterPinChange("unpin-quick-skill");
'''
),
(
'''      const selection = this.getFavoriteAttackSelection(actorId);
      this.setFavoriteAttackSelected(actorId, attackKey, !selection.has(attackKey));
      this.requestOverlayRender(["center", "right"], { reason: "favorite-attack" });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      const selection = this.getFavoriteAttackSelection(actorId);
      const isSelected = !selection.has(attackKey);
      this.setFavoriteAttackSelected(actorId, attackKey, isSelected);
      this.syncRightDrawerFavoriteState("attack", attackKey, isSelected);
      this.renderCenterAfterPinChange("favorite-attack");
'''
),
(
'''      this.togglePinnedAction(actorId, "attack", attackKey);
      this.requestOverlayRender(["center", "right"], { reason: "pin-attack" });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.togglePinnedAction(actorId, "attack", attackKey);
      this.renderCenterAfterPinChange("pin-attack");
'''
),
(
'''      this.removePinnedAction(actorId, type, key);
      this.requestOverlayRender(["center", "right"], { reason: "remove-pinned-action" });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.removePinnedAction(actorId, type, key);
      this.renderCenterAfterPinChange("remove-pinned-action");
'''
),
(
'''      this.togglePinnedAction(actorId, "skill", skillKey);
      this.requestOverlayRender(["center", "right"], { reason: "pin-skill" });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.togglePinnedAction(actorId, "skill", skillKey);
      this.renderCenterAfterPinChange("pin-skill");
'''
),
(
'''      this.togglePinnedAction(actorId, "spell", spellKey);
      this.requestOverlayRender(["center", "right"], { reason: "pin-spell" });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.togglePinnedAction(actorId, "spell", spellKey);
      this.renderCenterAfterPinChange("pin-spell");
'''
),
(
'''      const selection = this.getFavoriteSpellSelection(actorId);
      this.setFavoriteSpellSelected(actorId, spellKey, !selection.has(spellKey));
      this.requestOverlayRender(["center", "right"], { reason: "favorite-spell" });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      const selection = this.getFavoriteSpellSelection(actorId);
      const isSelected = !selection.has(spellKey);
      this.setFavoriteSpellSelected(actorId, spellKey, isSelected);
      this.syncRightDrawerFavoriteState("spell", spellKey, isSelected);
      this.renderCenterAfterPinChange("favorite-spell");
'''
),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one handler block, found {count}: {old.splitlines()[0]}")
    text = text.replace(old, new, 1)

for reason in [
    "toggle-quick-skill", "unpin-quick-skill", "favorite-attack", "pin-attack",
    "remove-pinned-action", "pin-skill", "pin-spell", "favorite-spell"
]:
    forbidden = f'requestOverlayRender(["center", "right"], {{ reason: "{reason}" }})'
    if forbidden in text:
        raise SystemExit(f"Right drawer render remains for {reason}")

if text.count("syncRightDrawerFavoriteState(type, key, isActive)") != 1:
    raise SystemExit("In-place right drawer helper was not installed exactly once")

path.write_text(text, encoding="utf-8")
