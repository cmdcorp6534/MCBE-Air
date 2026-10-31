// @ts-check
'use strict';

import * as mc from '@minecraft/server';
import * as vanilla from '@minecraft/vanilla-data';
import * as mcmath from '@minecraft/math';
import * as config from './config';
import * as texts from './texts';

/**
 * @param { mc.VectorXZ } currentLoc
 * @param { mc.VectorXZ } targetLoc
 * @returns { number | null } - Yaw but not pitch
 */
export function calcYaw(currentLoc, targetLoc) {
    const dir = mcmath.VectorXZUtils.subtract(targetLoc, currentLoc);
    if (mcmath.VectorXZUtils.magnitude(dir) <= config.AP_DISTANCE_REQUIREMENT) return null;
    const rawYaw = Math.atan2(-dir.x, dir.z) * (180 / Math.PI);
    const normalizedYaw = ((rawYaw + 180) % 360 + 360) % 360 - 180;
    return normalizedYaw;
}

/**
 * @typedef { Object } AutoPilot
 * @property { mc.VectorXZ | undefined } waypoint
 * @property { boolean } status
 * @property { string | undefined } disableReason
 */
/**
 * @typedef { Object } Choice
 * @property { number } id
 * @property { number } remains
 */
/**
 * @typedef { Object } FlightConsole
 * @property { AutoPilot } ap
 * @property { Choice | undefined } choice
 */

/** @returns { FlightConsole } */
export const defaultFlightConsole = () => {
    return {
        ap: {
            waypoint: undefined,
            status: false,
            disableReason: texts.AP_DISABLE_WP_UD
        },
        choice: undefined,
    };
}

/**
 * @param { mc.Player } pl
 * @param { FlightConsole | undefined } data
 */
export function writeFlightConsole(pl, data) {
    const playerDataString = JSON.stringify(data);
    pl.setDynamicProperty(config.AP_SYSTEM, playerDataString);
}

/**
 * @param { mc.Player } pl
 * @returns { FlightConsole | undefined }
 */
export function getFlightConsole(pl) {
    const playerDataString = pl.getDynamicProperty(config.AP_SYSTEM);
    if (typeof playerDataString !== 'string') return undefined;
    try { return /** @type { FlightConsole } */ (JSON.parse(playerDataString))}
    catch { return undefined }
}

/**
 * @param { mc.Player } pl
 * @returns { number }
 */
export function calcAlt(pl) {
    const playerLocation = pl.location;
    const blockLocation = pl.dimension.getBlockBelow(playerLocation, { includeLiquidBlocks: true })?.location;
    if (blockLocation === undefined) return playerLocation.y - pl.dimension.heightRange.min;
    return playerLocation.y - blockLocation.y;
}

/**
 * @param { mc.Player } pl
 * @returns { number }
 */
export function getDurabilityPercent(pl) {
    if (!pl.isValid) return NaN;
    const equippableComp = pl.getComponent(mc.EntityComponentTypes.Equippable);
    if (!equippableComp?.isValid) return NaN;
    const chest = equippableComp.getEquipment(mc.EquipmentSlot.Chest);
    if (chest?.typeId !== vanilla.MinecraftItemTypes.Elytra) return NaN;
    const etrDurability = chest.getComponent(mc.ItemComponentTypes.Durability);
    if (etrDurability === undefined) return NaN;
    return etrDurability.damage / etrDurability.maxDurability * 100;
}


/**
 * @param { FlightConsole } data
 * @param { mc.Player } pl
 * @returns { string }
 */
export function getConsoleText(data, pl) {
    const velocity = pl.getVelocity();
    /** @type { mc.VectorXZ } */
    const groundVelocity = { x: velocity.x, z: velocity.z };
    const speed = mcmath.Vector3Utils.magnitude(velocity);
    const groundSpeed = mcmath.VectorXZUtils.magnitude(groundVelocity);
    const txt = [
        '§r------',
        `§r§l${texts.CHOICE_TITLE}`,
        `§r${(data.choice?.id === 1) ? '>' : ''}${texts.AP}  §r${(data.choice?.id === 2) ? '>' : ''}${texts.ELY}`,
        // `§r${(data.choice?.id === 2) ? '*' : ' '} ${texts.ELY}`,
        `§r${(data.choice?.id === 3) ? '>' : ''}${texts.FWR}  §r${(data.choice?.id === 4) ? '>' : ''}${texts.EXIT}`,
        // `§r${(data.choice?.id === 4) ? '*' : ' '} ${texts.EXIT}`,
        `§r§a${(data.choice !== undefined) ? data.choice.remains : 'N/A'}`,
        '§r------',
        `§r§l${texts.AP_TITLE}`,
        (data.ap.waypoint !== undefined)
        ? `§r§c${data.ap.waypoint.x.toFixed(2)} §9${data.ap.waypoint.z.toFixed(2)}`
        : `§r§e${texts.AP_WP_UD}`,
        (data.ap.status)
        ? `§r§a${texts.AP_ON}`
        : ((data.ap.disableReason === undefined)
            ? `§r§e${texts.AP_OFF}`
            : `§r§c${data.ap.disableReason}`
        ),
        '§r------',
        `§r§lSpeed §r§a${speed.toFixed(2)}  §r§lGroundSpeed §r§a${groundSpeed.toFixed(2)}  §r§l${velocity.y < -config.AP_SINK_RATE_MAX ? '§c' : ''}VerticalVelocity §r§a${velocity.y.toFixed(2)}`,
        `§r§lAltitude §r§a${calcAlt(pl).toFixed(2)}  §r§lPitch §r§a${pl.getRotation().x.toFixed(2)}  §r§lYaw §r§a${pl.getRotation().y.toFixed(2)}  §r§l${isNaN(getDurabilityPercent(pl)) || (getDurabilityPercent(pl) >= config.AP_ETR_DAMAGE_MAX) ? '§c' : ''}ElytraDamage §r§a${getDurabilityPercent(pl).toFixed(2)}${isNaN(getDurabilityPercent(pl)) ? '' : '%'}`,
        `§r------\n\n\n\n\n\n`
    ];
    return txt.join('\n');
}