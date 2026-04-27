const MODULE_ID = "epic-rolls-pf2e";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Epic Rolls PF2E (Phase 0)`);

  ui.EpicRollsPF2e ??= {};

  ui.EpicRollsPF2e.requestRoll = async function requestRoll(data = {}) {
    console.debug(`${MODULE_ID} | requestRoll called`, data);
    ui.notifications?.info("Epic Rolls PF2E not implemented yet (Phase 0)");
  };
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});
