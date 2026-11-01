# 天空即为极限 · MCBE-Air

一个面向 Minecraft 基岩版的鞘翅飞行辅助 Addon。进入世界后会在快捷栏提供“飞行面板”，可以快速获得鞘翅/烟花、设置航点并开启自动驾驶。

[![Package mcpack](https://github.com/cmdcorp6534/MCBE-Air/actions/workflows/package.yml/badge.svg)](https://github.com/cmdcorp6534/MCBE-Air/actions/workflows/package.yml)

> 仅支持 Minecraft 基岩版（Behavior Pack），不适用于 Java 版。

## 功能

- **飞行面板**：快捷栏第 1 格自动放置“飞行面板”木棍，右键打开/操作菜单。
- **快速补给**：一键获得鞘翅，或 64 个飞行时间 3 的烟花火箭。
- **航点自动驾驶**：用命令设置水平航点，自动驾驶会持续把朝向修正到航点方向。
- **飞行安全检查**：自动检查鞘翅耐久、滑翔状态、高度、下降率和与航点的距离，不满足时自动断开。
- **EGPWS 注意与警告**：HUD 下方显示 `PULL UP`、`STALL`、`SINK RATE`、`TERRAIN AHEAD`、`TERRAIN`、`ELYTRA DAMAGE` 等警告；包含前向地形检测与鞘翅耐久监控。
- **飞行 HUD**：ActionBar 显示速度、水平速度、垂直速度、高度、俯仰/偏航和鞘翅耐久。

## 环境要求

- Minecraft Bedrock，建议 1.21.0 及以上，且游戏版本需要支持 `@minecraft/server` 2.10.0。
- 需要启用行为包；本包不包含资源包。

## 安装

1. 从 [Releases](https://github.com/cmdcorp6534/MCBE-Air/releases) 下载最新的 `.mcpack`。
2. 双击文件，或用 Minecraft 打开，等待行为包导入。
3. 进入世界设置 → **行为包**，激活“天空即为极限”。
4. 进入世界即可使用。

开发时也可以直接把本目录放进 `development_behavior_packs` 下测试。

## 快速开始

### 1. 飞行面板

进入世界后，快捷栏第 1 格会被强制替换为名为“飞行面板”的木棍。

- 第一次使用（尚无面板数据）时，右键初始化，ActionBar 出现菜单。
- 之后每次右键：切换到下一个选项，并重置 3 秒倒计时。
- **停止右键 60 ticks**后，当前选项才会执行；继续右键会切到下一项。

面板状态按玩家独立保存在动态属性中，重进世界仍会保留，直到选择“关闭并重置”。

> [!CAUTION]
> 面板会强制占用快捷栏第 1 格，并覆盖该格原有物品。使用前请先清空这一格，避免丢失物品。
>
> 面板木棍锁定在该槽位，不能移动或丢弃。

### 2. 设置航点

先初始化面板，然后执行：

```text
/cmdcorp_air:wpt <x> <z>
```

例如：

```text
/cmdcorp_air:wpt 1000 -200
```

- `x`、`z` 是绝对坐标，支持小数。
- 只设置水平航点，不设置高度。
- 如果面板尚未初始化，命令会返回 `SystemNotStartedError`。

### 3. 开启自动驾驶

1. 装备鞘翅；
2. 使用鞘翅飞行；
3. 确认高度不低于 30 格、距离航点超过 50 格；
4. 用面板选择“自动驾驶”，停止右键等待 3 秒。

自动驾驶开启后会持续把朝向修正到航点方向。它只修正水平朝向（Yaw），**不会自动控制俯仰和高度**，飞行高度仍需要自己用视角或烟花维持。

## 面板选项

| 选项 | 作用 |
| --- | --- |
| 自动驾驶 | 切换自动驾驶开关；条件不满足时不会开启，并在 HUD 显示原因 |
| 获得鞘翅 | 获得 1 个鞘翅 |
| 获得烟花火箭 | 获得 64 个飞行时间 3 的烟花火箭 |
| 关闭并重置 | 清除航点、自动驾驶状态和面板数据 |

选择“关闭并重置”后需要停手等待 3 秒，倒计时结束才会真正重置。

## 自动驾驶条件

自动驾驶开启后，每 tick 都会重新检查以下条件；任意一项失效都会自动断开：

| 条件 | 要求 | 不满足时的提示 |
| --- | --- | --- |
| 鞘翅 | 胸甲槽装备鞘翅，且耐久损耗低于 80% | GPWS `ELYTRA DAMAGE` |
| 航点 | 已用 `/cmdcorp_air:wpt` 设置航点 | 未定义航点 |
| 滑翔 | 正在使用鞘翅滑翔 | 未处于滑行状态 |
| 高度 | 相对下方方块/液面至少 30 格；低于时触发 GPWS `TERRAIN` 系列 | GPWS |
| 下降率 | 垂直速度不低于 -0.8；超过时触发 GPWS `SINK RATE` / `PULL UP` | GPWS |
| 距离 | 距航点大于 50 格 | 已在航点附近 |

> 自动驾驶不会自动降落。进入航点 50 格范围内后会自动断开，请自行控制落地。

## 注意与警告（GPWS）

HUD 最下方有一栏“注意与警告”。正常飞行时该栏为空；触发 Caution 或 Alert 时显示对应英文警告：

| 警告 | 类型 | 触发条件 |
| --- | --- | --- |
| `PULL UP` | Alert（粗体红色） | 低高度下降且前向检测到地形（高度 < 30、下降 > 0.5 格/刻），或前方侧面障碍距离 < 20 格且撞击速度足以造成动能伤害 |
| `STALL` | Alert（粗体红色） | 非爬升、非接地阶段，仰角超过 60°（`Pitch < -60`）；高空也会报告 |
| `SINK RATE` | Caution（粗体黄色） | 非爬升、非接地阶段，下降速度超过 0.8 格/刻（16 m/s），且没有 `PULL UP` |
| `TERRAIN AHEAD` | Caution（粗体黄色） | 前向检测到 60 格内的侧面地形/障碍，且撞击速度足以造成动能伤害，并且没有 `PULL UP` |
| `TERRAIN` | Caution（粗体黄色） | 非爬升、非接地阶段，高度低于 30 格，垂直速度达到 0.5 格/刻（10 m/s，可能产生摔落伤害），且没有 `PULL UP`、也不是前向地形警告 |
| `ELYTRA DAMAGE` | Caution（粗体黄色） | 鞘翅耐久损耗达到 80%（`AP_ETR_DAMAGE_MAX`） |

补充规则：

- 爬升阶段（`VerticalSpeed > 0`）不报 `STALL`、`SINK RATE`、`TERRAIN` 和低高度 `PULL UP`，但**前向侧面障碍仍然会触发 `TERRAIN AHEAD` / `PULL UP`**，避免起飞时撞墙；
- 高度低于 30 格且下降速度小于 0.2 格/刻（4 m/s）时，视为最后进近/接地阶段，地面类警告静默，但前向侧面障碍仍然生效；
- `PULL UP` 显示时，不再同时显示 `SINK RATE`、`TERRAIN AHEAD` 和 `TERRAIN`；
- `PULL UP` 与 `STALL` 不会同时出现，STALL 优先级更高；
- `ELYTRA DAMAGE` 是持续警告，不受起飞/接地静默影响；
- 前向检测沿玩家速度方向、从头部发射，最大 80 格；只有命中方块**侧面**才算 `TERRAIN AHEAD` 障碍，顶面/底面会被忽略，所以竖直俯冲时不会把地面误报成 `TERRAIN AHEAD`；
- 低高度 `PULL UP` 仍可用任意前向地形确认，减少在虚空/开阔空域中的误报；
- 根据 Wiki 的摔落伤害规则，垂直速度小于 0.5 格/刻（10 m/s）时下落高度会重置，通常不会摔伤，因此 `TERRAIN` 只在垂直速度达到 0.5 格/刻时显示；
- 根据 Wiki 的动能伤害公式，水平撞击速度不大于 0.3 格/刻（6 m/s）时不会造成动能伤害，因此 `TERRAIN AHEAD` 和侧面障碍触发的 `PULL UP` 只在撞击速度大于 0.3 格/刻时显示；
- 警报合并为一行，Alert 在前、Caution 在后，例如 `STALL SINK RATE`。

> 速度单位说明：Script API 的 `getVelocity()` 返回格/游戏刻（block/tick），Wiki 通常使用米/秒；换算为 1 格/刻 = 20 格/秒。`0.5 格/刻 ≈ 10 m/s`，`0.8 格/刻 = 16 m/s`，`1.0 格/刻 ≈ 20 m/s`。

自动驾驶处于接通状态时，任意 Caution/Alert 都会断开 AP，禁用原因显示为 `GPWS`。警告解除后 AP **不会自动恢复接通**，需要手动重新选择“自动驾驶”；如果仍存在其他禁用条件，则继续显示对应原因。

## 飞行 HUD

ActionBar 会显示：

- 当前选项和倒计时；
- 航点坐标、自动驾驶状态或禁用原因；
- `Speed`：总速度；
- `GroundSpeed`：水平速度；
- `VerticalVelocity`：垂直速度；
- `Altitude`：相对下方方块/液面的高度；
- `Pitch` / `Yaw`：俯仰角和偏航角；
- `ElytraDamage`：鞘翅耐久损耗百分比；
- “注意与警告”：GPWS Caution/Alert。

当 GPWS 发出警告时，仪表区内相关参数名称会变红：

- `Altitude`：`PULL UP`、`TERRAIN AHEAD`、`TERRAIN`；
- `VerticalVelocity`：`SINK RATE`、`TERRAIN`，或由下降率触发的 `PULL UP`；
- `Pitch`：`STALL`；
- `ElytraDamage`：`ELYTRA DAMAGE`。

## 可调参数

参数集中在 [`src/config.js`](src/config.js)：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `CHOICE_REMAIN_TICKS` | `60` | 菜单倒计时，60 tick = 3 秒 |
| `AP_ALT_REQUIREMENT` | `30` | 自动驾驶最低高度 / GPWS `TERRAIN` 阈值 |
| `AP_SINK_RATE_MAX` | `0.8` | 允许的最大下降速度 / GPWS `SINK RATE` 阈值 |
| `GPWS_PULL_UP_ALT` | `30` | `PULL UP` 高度阈值 |
| `GPWS_PULL_UP_SINK` | `0.5` | `PULL UP` 下降速度阈值（格/刻，≈10 m/s） |
| `GPWS_STALL_PITCH` | `60` | `STALL` 仰角阈值（度） |
| `GPWS_LANDING_ALT` | `30` | 进近/接地阶段高度阈值 |
| `GPWS_LANDING_SINK` | `0.2` | 进近/接地阶段下降速度阈值（格/刻，4 m/s） |
| `GPWS_FORWARD_DIST` | `80` | 前向检测最大距离（格） |
| `GPWS_FORWARD_CAUTION` | `60` | `TERRAIN AHEAD` 警戒距离（格） |
| `GPWS_FORWARD_ALERT` | `20` | 触发 `PULL UP` 的前向障碍距离（格） |
| `GPWS_FALL_DAMAGE_SINK` | `0.5` | 可能造成摔落伤害的垂直速度阈值（格/刻，10 m/s） |
| `GPWS_KINETIC_DAMAGE_SPEED` | `0.3` | 可能造成动能伤害的水平撞击速度阈值（格/刻，6 m/s） |
| `AP_ETR_DAMAGE_MAX` | `80` | 鞘翅耐久损耗达到该百分比时触发 `ELYTRA DAMAGE` |
| `AP_DISTANCE_REQUIREMENT` | `50` | 小于等于该距离时视为到达航点附近 |
| `FW_DATA` | `3` | 发放的烟花飞行时间，范围 1–3 |

修改这些值后，需要重新生成 [`scripts/air.js`](scripts/air.js)。

## 开发与构建

- `src/` 是源码，[`scripts/air.js`](scripts/air.js) 是已经打包好的脚本，也是 `manifest.json` 的入口。
- 仓库目前没有提交 `package.json` / 构建脚本；修改 `src/` 后，需要用 esbuild 重新生成 `scripts/air.js`（`@minecraft/server` 作为 external，`@minecraft/math` 和 `@minecraft/vanilla-data` 可以一起打包）。
- 提交前确认 `scripts/air.js` 已更新，否则游戏和 Release 里运行的仍是旧代码。

GitHub Actions 的打包流程见 [`.github/workflows/package.yml`](.github/workflows/package.yml)：

- push 到 `main`：生成 Actions artifact；
- push `v*` tag：生成 `.mcpack` 并上传到对应的 GitHub Release；
- Workflow 不执行 esbuild，直接使用已提交的 `scripts/air.js`；
- 打包内容只包含 `manifest.json`、`README.md`、`LICENSE` 和 `scripts/` 目录，`src/` 不会进入 mcpack。

发版示例：

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 反馈

遇到问题或想提建议，欢迎在 [Issues](https://github.com/cmdcorp6534/MCBE-Air/issues) 反馈。

## 许可证

本项目使用 [GNU Affero General Public License v3.0](LICENSE)。

## 鸣谢

1. 本项目灵感来源于纪录片《空中浩劫》，原名 *Air Crash Investigation* 或 *Mayday* 。
2. 本项目少部分内容为人工智能 *DeepSeek* 编写。

## 声明

此 README 由人工智能生成，不保证与实际情况完全相符，具体情况请进入游戏体验。