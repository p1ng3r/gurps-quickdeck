from pathlib import Path

path = Path("scripts/quickdeck-app.js")
text = path.read_text(encoding="utf-8")

replacements = [
    (
'''      this.setQuickSkillSelected(actorId, skillKey, shouldSelect);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.setQuickSkillSelected(actorId, skillKey, shouldSelect);
      this.requestOverlayRender(["center", "right"], { reason: "toggle-quick-skill" });
      this.scheduleNativeWindowFocusAfterRender();
'''
    ),
    (
'''      this.setQuickSkillSelected(actorId, skillKey, false);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.setQuickSkillSelected(actorId, skillKey, false);
      this.requestOverlayRender(["center", "right"], { reason: "unpin-quick-skill" });
      this.scheduleNativeWindowFocusAfterRender();
'''
    ),
    (
'''      const selection = this.getFavoriteAttackSelection(actorId);
      this.setFavoriteAttackSelected(actorId, attackKey, !selection.has(attackKey));
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      const selection = this.getFavoriteAttackSelection(actorId);
      this.setFavoriteAttackSelected(actorId, attackKey, !selection.has(attackKey));
      this.requestOverlayRender(["center", "right"], { reason: "favorite-attack" });
      this.scheduleNativeWindowFocusAfterRender();
'''
    ),
    (
'''      this.togglePinnedAction(actorId, "attack", attackKey);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.togglePinnedAction(actorId, "attack", attackKey);
      this.requestOverlayRender(["center", "right"], { reason: "pin-attack" });
      this.scheduleNativeWindowFocusAfterRender();
'''
    ),
    (
'''      this.removePinnedAction(actorId, type, key);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.removePinnedAction(actorId, type, key);
      this.requestOverlayRender(["center", "right"], { reason: "remove-pinned-action" });
      this.scheduleNativeWindowFocusAfterRender();
'''
    ),
    (
'''      this.togglePinnedAction(actorId, "skill", skillKey);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.togglePinnedAction(actorId, "skill", skillKey);
      this.requestOverlayRender(["center", "right"], { reason: "pin-skill" });
      this.scheduleNativeWindowFocusAfterRender();
'''
    ),
    (
'''      this.togglePinnedAction(actorId, "spell", spellKey);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
''',
'''      this.togglePinnedAction(actorId, "spell", spellKey);
      this.requestOverlayRender(["center", "right"], { reason: "pin-spell" });
      this.scheduleNativeWindowFocusAfterRender();
'''
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one handler block, found {count}: {old.splitlines()[0]}")
    text = text.replace(old, new, 1)

for forbidden in [
    'this.togglePinnedAction(actorId, "attack", attackKey);\n      this.render(false, { focus: false });',
    'this.togglePinnedAction(actorId, "skill", skillKey);\n      this.render(false, { focus: false });',
    'this.togglePinnedAction(actorId, "spell", spellKey);\n      this.render(false, { focus: false });',
]:
    if forbidden in text:
        raise SystemExit(f"Full render remains in pin handler: {forbidden}")

path.write_text(text, encoding="utf-8")
