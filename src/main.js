// @ts-check
'use strict';

import * as mc from '@minecraft/server';
import * as vanilla from '@minecraft/vanilla-data';
import * as utils from './utils';
import * as config from './config';
import * as texts from './texts';

/**
 * @param { mc.ItemStack | undefined } itemStack
 * @returns { boolean }
 */
const isFlightStick = (itemStack) =>
    itemStack?.typeId === vanilla.MinecraftItemTypes.Stick &&
    itemStack?.nameTag === texts.STICK_NAME;

const stick = () => {
    const stk = new mc.ItemStack(vanilla.MinecraftItemTypes.Stick, 1);
    stk.nameTag = texts.STICK_NAME;
    stk.lockMode = mc.ItemLockMode.slot;
    stk.setLore(texts.STICK_LORE_LIST);
    return stk;
}

(() => {
    function setStick() {
        const players = mc.world.getAllPlayers();
        players.forEach(p => {
            if (!p?.isValid) return;
            const inventoryComp = p.getComponent(mc.EntityComponentTypes.Inventory);
            if (!inventoryComp?.isValid) return;
            const containerComp = inventoryComp.container;
            if (!containerComp?.isValid) return;
            const firstHotbar = containerComp.getItem(0);
            if (!isFlightStick(firstHotbar)) containerComp.setItem(0, stick());
        });
        mc.system.run(setStick);
    }
    mc.system.run(setStick);
})();

mc.world.afterEvents.itemUse.subscribe(eventData => {
    const { source, itemStack } = eventData;
    if (!isFlightStick(itemStack)) return;
    const consoleData = utils.getFlightConsole(source);
    if (consoleData === undefined) {
        utils.writeFlightConsole(source, utils.defaultFlightConsole());
        return;
    }
    const choice = consoleData.choice;
    if (choice === undefined) {
        consoleData.choice = {
            id: 1,
            remains: config.CHOICE_REMAIN_TICKS
        }
        utils.writeFlightConsole(source, consoleData);
        return;
    }
    else if (choice.id >= 4) {
        consoleData.choice = undefined;
        utils.writeFlightConsole(source, consoleData);
        return;
    }
    else if (choice.id >= 1 && choice.id <= 3) {
        choice.id++;
        choice.remains = config.CHOICE_REMAIN_TICKS;
        utils.writeFlightConsole(source, consoleData);
        return;
    }
    else {
        utils.writeFlightConsole(source, undefined);
        return;
    }
});

(() => {
    function showConsole() {
        const players = mc.world.getAllPlayers();
        players.forEach(p => {
            const consoleData = utils.getFlightConsole(p);
            if (!consoleData) return;
            const menu = utils.getConsoleText(consoleData, p);
            p.onScreenDisplay.setActionBar(menu);
        });
        mc.system.run(showConsole);
    }
    mc.system.run(showConsole);
})();

(() => {
    function executer() {
        const players = mc.world.getAllPlayers();
        players.forEach(p => {
            const consoleData = utils.getFlightConsole(p);
            if (!consoleData) return;
            const choice = consoleData?.choice;
            if (!choice) return;
            if (choice.remains > 0) return;
            if (choice.id === 1) {
                if (consoleData.ap.disableReason) {
                    consoleData.choice = undefined;
                    utils.writeFlightConsole(p, consoleData);
                    return;
                }
                consoleData.ap.status = !consoleData.ap.status;
                consoleData.choice = undefined;
                utils.writeFlightConsole(p, consoleData);
                return;
            }
            else if (choice.id === 2) {
                p.runCommand('give @s elytra');
                consoleData.choice = undefined;
                utils.writeFlightConsole(p, consoleData);
                return;
            }
            else if (choice.id === 3) {
                p.runCommand(`give @s firework_rocket 64 ${config.FW_DATA}`);
                consoleData.choice = undefined;
                utils.writeFlightConsole(p, consoleData);
                return;
            }
            else {
                utils.writeFlightConsole(p, undefined);
                return;
            }
        });
        mc.system.run(executer);
    }
    mc.system.run(executer);
})();

(() => {
    function countDown() {
        const players = mc.world.getAllPlayers();
        players.forEach(p => {
            const consoleData = utils.getFlightConsole(p);
            if (!consoleData) return;
            const choice = consoleData.choice;
            if (!choice) return;
            if (choice.remains > 0) {
                choice.remains--;
                utils.writeFlightConsole(p, consoleData);
            }
        });
        mc.system.run(countDown);
    }
    mc.system.run(countDown);
})();

(() => {
    function apCheck() {
        const players = mc.world.getAllPlayers();
        players.forEach(p => {
            const consoleData = utils.getFlightConsole(p);
            if (!consoleData) return;
            const ap = consoleData.ap;
            /** @type { mc.VectorXZ } */
            const currentLoc = {
                x: p.location.x,
                z: p.location.z
            };
            if (ap.disableReason) {
                if (ap.disableReason === texts.AP_DISABLE_DAMAGE) {
                    if (!isNaN(utils.getDurabilityPercent(p)) && (utils.getDurabilityPercent(p) < config.AP_ETR_DAMAGE_MAX)) {
                        ap.disableReason = undefined;
                        utils.writeFlightConsole(p, consoleData);
                    }
                }
                else if (ap.disableReason === texts.AP_DISABLE_WP_UD) {
                    if (ap.waypoint) {
                        ap.disableReason = undefined;
                        utils.writeFlightConsole(p, consoleData);
                    }
                }
                else if (ap.disableReason === texts.AP_DISABLE_NOT_GLIDING) {
                    if (p.isGliding) {
                        ap.disableReason = undefined;
                        utils.writeFlightConsole(p, consoleData);
                    }
                }
                else if (ap.disableReason === texts.AP_DISABLE_SINK_RATE) {
                    if (p.getVelocity().y >= -config.AP_SINK_RATE_MAX) {
                        ap.disableReason = undefined;
                        utils.writeFlightConsole(p, consoleData);
                    }
                }
                else if (ap.disableReason === texts.AP_DISABLE_ALT_LOW) {
                    if (utils.calcAlt(p) >= config.AP_ALT_REQUIREMENT) {
                        ap.disableReason = undefined;
                        utils.writeFlightConsole(p, consoleData);
                    }
                }
                else if (ap.disableReason === texts.AP_DISABLE_APPROACH) {
                    if (!ap.waypoint) return;
                    if (utils.calcYaw(currentLoc, ap.waypoint) !== null) {
                        ap.disableReason = undefined;
                        utils.writeFlightConsole(p, consoleData);
                    }
                }
            }
            if (isNaN(utils.getDurabilityPercent(p)) || (utils.getDurabilityPercent(p) >= config.AP_ETR_DAMAGE_MAX)) {
                ap.disableReason = texts.AP_DISABLE_DAMAGE;
                utils.writeFlightConsole(p, consoleData);
                return;
            }
            if (!ap.waypoint) {
                ap.disableReason = texts.AP_DISABLE_WP_UD;
                utils.writeFlightConsole(p, consoleData);
                return;
            }
            if (!p.isGliding) {
                ap.disableReason = texts.AP_DISABLE_NOT_GLIDING;
                utils.writeFlightConsole(p, consoleData);
                return;
            }
            if (p.getVelocity().y < -config.AP_SINK_RATE_MAX) {
                ap.disableReason = texts.AP_DISABLE_SINK_RATE;
                utils.writeFlightConsole(p, consoleData);
                return;
            }
            if (utils.calcAlt(p) < config.AP_ALT_REQUIREMENT) {
                ap.disableReason = texts.AP_DISABLE_ALT_LOW;
                utils.writeFlightConsole(p, consoleData);
                return;
            }
            if (utils.calcYaw(currentLoc, ap.waypoint) === null) {
                ap.disableReason = texts.AP_DISABLE_APPROACH;
                utils.writeFlightConsole(p, consoleData);
                return;
            }
        });
        mc.system.run(apCheck);
    }
    mc.system.run(apCheck);
})();

(() => {
    function apWatchDog() {
        const players = mc.world.getAllPlayers();
        players.forEach(p => {
            const consoleData = utils.getFlightConsole(p);
            if (!consoleData) return;
            const ap = consoleData.ap;
            if (ap.disableReason && ap.status) ap.status = false;
            utils.writeFlightConsole(p, consoleData);
        });
        mc.system.run(apWatchDog);
    }
    mc.system.run(apWatchDog);
})();

(() => {
    function apNav() {
        const players = mc.world.getAllPlayers();
        players.forEach(p => {
            const consoleData = utils.getFlightConsole(p);
            if (!consoleData) return;
            const ap = consoleData.ap;
            if (!ap.status) return;
            if (!ap.waypoint) return;
            /** @type { mc.VectorXZ } */
            const currentLoc = {
                x: p.location.x,
                z: p.location.z
            };
            const targetYaw = utils.calcYaw(currentLoc, ap.waypoint);
            if (targetYaw === null) return;
            const currentYaw = p.getRotation().y;
            const diff = ((currentYaw - targetYaw + 540) % 360) - 180;
            if (Math.abs(diff) > 10) {
                p.teleport(p.location, {
                    rotation: {
                        x: p.getRotation().x,
                        y: targetYaw
                    }
                });
            }
        })
        mc.system.run(apNav);
    }
    mc.system.run(apNav);
})();

mc.system.beforeEvents.startup.subscribe(eventData => {
    eventData.customCommandRegistry.registerCommand(
        {
            cheatsRequired: false,
            description: texts.WP_CMD_DESCRIPTION,
            mandatoryParameters: [
                {
                    name: 'WaypointX',
                    type: mc.CustomCommandParamType.Float
                },
                {
                    name: 'WaypointZ',
                    type: mc.CustomCommandParamType.Float
                }
            ],
            name: 'cmdcorp_air:wpt',
            permissionLevel: mc.CommandPermissionLevel.Any
        },
        (commandOrigin, ...args) => {
            const sourceError = new Error('This command should be runned by a valid player');
            sourceError.name = 'SourceError';
            const sysNotStartError = new Error('Start AP System first');
            sysNotStartError.name = 'SystemNotStartedError';
            try {
                const { sourceEntity } = commandOrigin;
                if (!(sourceEntity instanceof mc.Player)) throw sourceError;
                if (!sourceEntity.isValid) throw sourceError;
                const consoleData = utils.getFlightConsole(sourceEntity);
                if (!consoleData) throw sysNotStartError;
                consoleData.ap.waypoint = {
                    x: args[0],
                    z: args[1]
                }
                utils.writeFlightConsole(sourceEntity, consoleData);
                return {
                    message: 'Waypoint was set',
                    status: mc.CustomCommandStatus.Success
                }
            }
            catch (err) {
                const e = err instanceof Error
                    ? `${err.name}: ${err.message}`
                    : `${String(err)}`;
                return {
                    message: e,
                    status: mc.CustomCommandStatus.Failure
                };
            }
        }
    );
});