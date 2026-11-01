// @ts-check
'use strict';

import * as mc from '@minecraft/server';
import * as vanilla from '@minecraft/vanilla-data';
import * as mcmath from '@minecraft/math';
import * as config from './config';
import * as texts from './texts';

export const GPWS_ALERT_PULL_UP = 'PULL UP';
export const GPWS_ALERT_STALL = 'STALL';
export const GPWS_CAUTION_SINK_RATE = 'SINK RATE';
export const GPWS_CAUTION_TERRAIN = 'TERRAIN';
export const GPWS_CAUTION_TERRAIN_AHEAD = 'TERRAIN AHEAD';
export const GPWS_CAUTION_ELYTRA_DAMAGE = 'ELYTRA DAMAGE';
export const GPWS_REASON = 'GPWS';

/**
 * @param { mc.VectorXZ } currentLoc
 * @param { mc.VectorXZ } targetLoc
 * @returns { number }
 */
export function calcDis(currentLoc, targetLoc) {
    return mcmath.VectorXZUtils.distance(currentLoc, targetLoc);
}

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
 * @property { boolean | undefined } gpwsRecover
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

/**
 * @typedef { Object } GpwsWarning
 * @property { string } text
 * @property { boolean } alert
 */

/** @returns { FlightConsole } */
export const defaultFlightConsole = () => {
    return {
        ap: {
            waypoint: undefined,
            status: false,
            disableReason: undefined,
            gpwsRecover: false
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
 * @returns { number | undefined }
 */
export function getForwardDistance(pl) {
    const velocity = pl.getVelocity();
    const speed = mcmath.Vector3Utils.magnitude(velocity);
    if (speed < 0.1) return undefined;

    const eye = {
        x: pl.location.x,
        y: pl.location.y + 1.6,
        z: pl.location.z
    };
    const direction = {
        x: velocity.x / speed,
        y: velocity.y / speed,
        z: velocity.z / speed
    };

    try {
        const hit = pl.dimension.getBlockFromRay(eye, direction, {
            maxDistance: config.GPWS_FORWARD_DIST,
            includeLiquidBlocks: true,
            includePassableBlocks: false
        });
        if (hit === undefined) return undefined;

        const hitPoint = {
            x: hit.block.location.x + hit.faceLocation.x,
            y: hit.block.location.y + hit.faceLocation.y,
            z: hit.block.location.z + hit.faceLocation.z
        };
        const distance = mcmath.Vector3Utils.distance(eye, hitPoint);
        return distance < 0.5 ? undefined : distance;
    }
    catch {
        return undefined;
    }
}

/**
 * @param { mc.Player } pl
 * @returns { GpwsWarning[] }
 */
export function getGpwsWarnings(pl) {
    if (!pl.isGliding) return [];

    const velocity = pl.getVelocity();
    const altitude = calcAlt(pl);
    /** @type { GpwsWarning[] } */
    const warnings = [];

    // 鞘翅耐久属于持续警告，不随起飞/接地阶段静默。
    const elytraDamage = getDurabilityPercent(pl);
    if (isNaN(elytraDamage) || elytraDamage >= config.AP_ETR_DAMAGE_MAX) {
        warnings.push({ text: GPWS_CAUTION_ELYTRA_DAMAGE, alert: false });
    }

    // 刚起飞/爬升阶段不报 GPWS；VerticalSpeed 为正时不触发 STALL。
    if (velocity.y > 0) return warnings;

    // 最后进近/接地阶段：低高度且下降平缓时不报 GPWS。
    if (altitude < config.GPWS_LANDING_ALT && velocity.y > -config.GPWS_LANDING_SINK) {
        return warnings;
    }

    const forwardDistance = getForwardDistance(pl);

    // 只有接近地面、下降率可能造成摔落伤害时才报 STALL。
    const stall = pl.getRotation().x < -config.GPWS_STALL_PITCH
        && altitude < config.GPWS_STALL_ALT
        && velocity.y < -config.GPWS_STALL_SINK;

    // 低高度下降由前向地形确认；前向障碍过近也直接 PULL UP。
    const lowSinkPullUp = altitude < config.GPWS_PULL_UP_ALT
        && velocity.y < -config.GPWS_PULL_UP_SINK
        && forwardDistance !== undefined;
    const obstaclePullUp = forwardDistance !== undefined
        && forwardDistance < config.GPWS_FORWARD_ALERT;

    // STALL 优先，避免 PULL UP 与 STALL 同时出现。
    const pullUp = !stall && (lowSinkPullUp || obstaclePullUp);

    if (pullUp) {
        warnings.push({ text: GPWS_ALERT_PULL_UP, alert: true });
    }
    else if (stall) {
        warnings.push({ text: GPWS_ALERT_STALL, alert: true });
    }

    if (!pullUp) {
        if (velocity.y < -config.AP_SINK_RATE_MAX) {
            warnings.push({ text: GPWS_CAUTION_SINK_RATE, alert: false });
        }
        if (forwardDistance !== undefined && forwardDistance < config.GPWS_FORWARD_CAUTION) {
            warnings.push({ text: GPWS_CAUTION_TERRAIN_AHEAD, alert: false });
        }
        else if (altitude < config.AP_ALT_REQUIREMENT) {
            warnings.push({ text: GPWS_CAUTION_TERRAIN, alert: false });
        }
    }

    return warnings;
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
    /** @type { mc.VectorXZ } */
    const currentLoc = { x: pl.location.x, z: pl.location.z };
    const gpwsWarnings = getGpwsWarnings(pl);
    const gpwsLine = [
        ...gpwsWarnings.filter(warning => warning.alert).map(warning => `§r§l§c${warning.text}`),
        ...gpwsWarnings.filter(warning => !warning.alert).map(warning => `§r§l§e${warning.text}`)
    ].join(' ');
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
        ? `§r§lLocation §r§c${data.ap.waypoint.x.toFixed(2)} §9${data.ap.waypoint.z.toFixed(2)}  §r§lDistance §r§a${calcDis(currentLoc, data.ap.waypoint).toFixed(2)}`
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
        '§r------',
        `§r§l${texts.GPWS_TITLE}`,
        ...(gpwsLine ? [gpwsLine] : []),
        `§r------\n\n\n\n\n\n\n\n\n`
    ];
    return txt.join('\n');
}