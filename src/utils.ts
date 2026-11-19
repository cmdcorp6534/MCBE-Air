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

export function calcDis(currentLoc: mc.VectorXZ, targetLoc: mc.VectorXZ): number {
    return mcmath.VectorXZUtils.distance(currentLoc, targetLoc);
}

export function calcYaw(currentLoc: mc.VectorXZ, targetLoc: mc.VectorXZ): number | null {
    const dir = mcmath.VectorXZUtils.subtract(targetLoc, currentLoc);
    if (mcmath.VectorXZUtils.magnitude(dir) <= config.AP_DISTANCE_REQUIREMENT) return null;
    const rawYaw = Math.atan2(-dir.x, dir.z) * (180 / Math.PI);
    const normalizedYaw = ((rawYaw + 180) % 360 + 360) % 360 - 180;
    return normalizedYaw;
}

export interface AutoPilot {
    waypoint: mc.VectorXZ | undefined;
    status: boolean;
    disableReason: string | undefined;
}

export interface Choice {
    id: number;
    remains: number;
}

export interface FlightConsole {
    ap: AutoPilot;
    choice: Choice | undefined;
}

export interface GpwsWarning {
    text: string;
    alert: boolean;
}

export const defaultFlightConsole = (): FlightConsole => {
    return {
        ap: {
            waypoint: undefined,
            status: false,
            disableReason: undefined
        },
        choice: undefined,
    };
}

export function writeFlightConsole(pl: mc.Player, data: FlightConsole | undefined): void {
    const playerDataString = JSON.stringify(data);
    pl.setDynamicProperty(config.AP_SYSTEM, playerDataString);
}

export function getFlightConsole(pl: mc.Player): FlightConsole | undefined {
    const playerDataString = pl.getDynamicProperty(config.AP_SYSTEM);
    if (typeof playerDataString !== 'string') return undefined;
    try { return JSON.parse(playerDataString) as FlightConsole; }
    catch { return undefined; }
}

export function calcAlt(pl: mc.Player): number {
    const playerLocation = pl.location;
    const blockLocation = pl.dimension.getBlockBelow(playerLocation, { includeLiquidBlocks: true })?.location;
    if (blockLocation === undefined) return playerLocation.y - pl.dimension.heightRange.min;
    return playerLocation.y - blockLocation.y;
}

export interface ForwardHit {
    distance: number;
    face: mc.Direction;
}

export function getForwardHit(pl: mc.Player): ForwardHit | undefined {
    const velocity = pl.getVelocity();
    const speed = mcmath.Vector3Utils.magnitude(velocity);
    if (speed < 0.1) return undefined;

    const eye: mc.Vector3 = {
        x: pl.location.x,
        y: pl.location.y + 1.6,
        z: pl.location.z
    };
    const direction: mc.Vector3 = {
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

        const hitPoint: mc.Vector3 = {
            x: hit.block.location.x + hit.faceLocation.x,
            y: hit.block.location.y + hit.faceLocation.y,
            z: hit.block.location.z + hit.faceLocation.z
        };
        const distance = mcmath.Vector3Utils.distance(eye, hitPoint);
        return distance < 0.5 ? undefined : { distance, face: hit.face };
    }
    catch {
        return undefined;
    }
}

export function getSideImpactSpeed(velocity: mc.Vector3, face: mc.Direction): number {
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    if (face === mc.Direction.North || face === mc.Direction.South) {
        return Math.max(0, horizontalSpeed - Math.abs(velocity.x));
    }
    if (face === mc.Direction.East || face === mc.Direction.West) {
        return Math.max(0, horizontalSpeed - Math.abs(velocity.z));
    }
    return 0;
}

export function getGpwsWarnings(pl: mc.Player): GpwsWarning[] {
    if (!pl.isGliding) return [];

    const velocity = pl.getVelocity();
    const altitude = calcAlt(pl);
    const warnings: GpwsWarning[] = [];

    // 鞘翅耐久属于持续警告，不随起飞/接地阶段静默。
    const elytraDamage = getDurabilityPercent(pl);
    if (isNaN(elytraDamage) || elytraDamage >= config.AP_ETR_DAMAGE_MAX) {
        warnings.push({ text: GPWS_CAUTION_ELYTRA_DAMAGE, alert: false });
    }

    const climbing = velocity.y > 0;
    // 最后进近/接地阶段：低高度且下降平缓时不报地面类 GPWS。
    const landing = !climbing
        && altitude < config.GPWS_LANDING_ALT
        && velocity.y > -config.GPWS_LANDING_SINK;

    const forwardHit = getForwardHit(pl);
    const forwardDistance = forwardHit?.distance;
    // 顶面/底面不算“前方障碍”，避免竖直俯冲时把地面误报成 TERRAIN AHEAD。
    const obstacleDistance = (forwardHit !== undefined
        && forwardHit.face !== mc.Direction.Up
        && forwardHit.face !== mc.Direction.Down)
        ? forwardHit.distance
        : undefined;
    const sideImpactSpeed = (forwardHit !== undefined && obstacleDistance !== undefined)
        ? getSideImpactSpeed(velocity, forwardHit.face)
        : 0;
    const damagingObstacle = sideImpactSpeed > config.GPWS_KINETIC_DAMAGE_SPEED;
    // 即使没有直接动能伤害，高空撞墙后也可能进入自由落体并造成摔落伤害。
    const dangerousObstacle = damagingObstacle
        || altitude > config.GPWS_FALL_DAMAGE_ALT;

    // 高空也会报 STALL；爬升和最后进近/接地阶段不报。
    const stall = !climbing && !landing
        && pl.getRotation().x < -config.GPWS_STALL_PITCH;

    // 低高度下降由前向地形确认；前向障碍过近也直接 PULL UP。
    const lowSinkPullUp = !climbing && !landing
        && altitude < config.GPWS_PULL_UP_ALT
        && velocity.y < -config.GPWS_PULL_UP_SINK
        && forwardDistance !== undefined;
    // 前向障碍即使正在爬升/接地也要报，但撞击速度不足以造成动能伤害时不报。
    const obstaclePullUp = obstacleDistance !== undefined
        && obstacleDistance < config.GPWS_FORWARD_ALERT
        && damagingObstacle;

    // STALL 优先，避免 PULL UP 与 STALL 同时出现。
    const pullUp = !stall && (lowSinkPullUp || obstaclePullUp);

    if (pullUp) {
        warnings.push({ text: GPWS_ALERT_PULL_UP, alert: true });
    }
    else if (stall) {
        warnings.push({ text: GPWS_ALERT_STALL, alert: true });
    }

    if (!pullUp) {
        if (!climbing && !landing && velocity.y < -config.AP_SINK_RATE_MAX) {
            warnings.push({ text: GPWS_CAUTION_SINK_RATE, alert: false });
        }
        if (obstacleDistance !== undefined
            && obstacleDistance < config.GPWS_FORWARD_CAUTION
            && dangerousObstacle) {
            warnings.push({ text: GPWS_CAUTION_TERRAIN_AHEAD, alert: false });
        }
        else if (!climbing && !landing
            && altitude < config.AP_ALT_REQUIREMENT
            && velocity.y <= -config.GPWS_FALL_DAMAGE_SINK) {
            warnings.push({ text: GPWS_CAUTION_TERRAIN, alert: false });
        }
    }

    return warnings;
}

export function getDurabilityPercent(pl: mc.Player): number {
    if (!pl.isValid) return NaN;
    const equippableComp = pl.getComponent(mc.EntityComponentTypes.Equippable);
    if (!equippableComp?.isValid) return NaN;
    const chest = equippableComp.getEquipment(mc.EquipmentSlot.Chest);
    if (chest?.typeId !== vanilla.MinecraftItemTypes.Elytra) return NaN;
    const etrDurability = chest.getComponent(mc.ItemComponentTypes.Durability);
    if (etrDurability === undefined) return NaN;
    return etrDurability.damage / etrDurability.maxDurability * 100;
}


export function getConsoleText(data: FlightConsole, pl: mc.Player): string {
    const velocity = pl.getVelocity();
    const groundVelocity: mc.VectorXZ = { x: velocity.x, z: velocity.z };
    const speed = mcmath.Vector3Utils.magnitude(velocity);
    const groundSpeed = mcmath.VectorXZUtils.magnitude(groundVelocity);
    const currentLoc: mc.VectorXZ = { x: pl.location.x, z: pl.location.z };
    const gpwsWarnings = getGpwsWarnings(pl);
    const gpwsLine = [
        ...gpwsWarnings.filter(warning => warning.alert).map(warning => `§r§l§c${warning.text}`),
        ...gpwsWarnings.filter(warning => !warning.alert).map(warning => `§r§l§e${warning.text}`)
    ].join('  ');
    const hasWarning = (text: string): boolean => gpwsWarnings.some(warning => warning.text === text);
    const warnPullUp = hasWarning(GPWS_ALERT_PULL_UP);
    const warnStall = hasWarning(GPWS_ALERT_STALL);
    const warnSinkRate = hasWarning(GPWS_CAUTION_SINK_RATE);
    const warnTerrainAhead = hasWarning(GPWS_CAUTION_TERRAIN_AHEAD);
    const warnTerrain = hasWarning(GPWS_CAUTION_TERRAIN);
    const warnElytraDamage = hasWarning(GPWS_CAUTION_ELYTRA_DAMAGE);
    const redAltitude = warnPullUp || warnTerrainAhead || warnTerrain;
    const redVerticalVelocity = warnSinkRate || warnTerrain
        || (warnPullUp && velocity.y < -config.GPWS_PULL_UP_SINK);
    const txt = [
        '§r------',
        `§r§l${texts.CHOICE_TITLE}`,
        `§r${(data.choice?.id === 1) ? '>' : ' '}${texts.AP}  §r${(data.choice?.id === 2) ? '>' : ' '}${texts.ELY}`,
        // `§r${(data.choice?.id === 2) ? '*' : ' '} ${texts.ELY}`,
        `§r${(data.choice?.id === 3) ? '>' : ' '}${texts.FWR}  §r${(data.choice?.id === 4) ? '>' : ' '}${texts.EXIT}`,
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
        `§r§lSpeed §r§a${speed.toFixed(2)}  §r§lGroundSpeed §r§a${groundSpeed.toFixed(2)}  §r§l${redVerticalVelocity ? '§c' : ''}VerticalVelocity §r§a${velocity.y.toFixed(2)}`,
        `§r§l${redAltitude ? '§c' : ''}Altitude §r§a${calcAlt(pl).toFixed(2)}  §r§l${warnStall ? '§c' : ''}Pitch §r§a${pl.getRotation().x.toFixed(2)}  §r§lYaw §r§a${pl.getRotation().y.toFixed(2)}  §r§l${warnElytraDamage ? '§c' : ''}ElytraDamage §r§a${getDurabilityPercent(pl).toFixed(2)}${isNaN(getDurabilityPercent(pl)) ? '' : '%'}`,
        '§r------',
        `§r§l${texts.GPWS_TITLE}`,
        gpwsLine || '',
        `§r------\n\n\n\n\n\n\n\n\n\n\n\n`
    ];
    return txt.join('\n');
}
