# 天空即为极限 · MCBE-Air

一个面向 Minecraft 基岩版的鞘翅飞行辅助 Addon。进入世界后会在快捷栏提供“飞行面板”，可以快速获得鞘翅/烟花、设置航点并开启自动驾驶。

[![Package mcpack](https://github.com/cmdcorp6534/MCBE-Air/actions/workflows/package.yml/badge.svg)](https://github.com/cmdcorp6534/MCBE-Air/actions/workflows/package.yml)

> 仅支持 Minecraft 基岩版（Behavior Pack），不适用于 Java 版。

## 功能

- **飞行面板**：快捷栏第 1 格自动放置“飞行面板”木棍，右键打开/操作菜单。
- **快速补给**：一键获得鞘翅，或 64 个飞行时间 3 的烟花火箭。
- **航点自动驾驶**：用命令设置水平航点，自动驾驶会持续把朝向修正到航点方向。
- **飞行安全检查**：自动检查鞘翅耐久、滑翔状态、高度、下降率和与航点的距离，不满足时自动断开。
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

> [!WARNING]
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
| 鞘翅 | 胸甲槽装备鞘翅，且耐久损耗低于 80% | 鞘翅损坏 |
| 航点 | 已用 `/cmdcorp_air:wpt` 设置航点 | 未定义航点 |
| 滑翔 | 正在使用鞘翅滑翔 | 未处于滑行状态 |
| 高度 | 相对下方方块/液面至少 30 格 | 高度过低 |
| 下降率 | 垂直速度不低于 -0.8 | 下降率过大 |
| 距离 | 距航点大于 50 格 | 已在航点附近 |

> 自动驾驶不会自动降落。进入航点 50 格范围内后会自动断开，请自行控制落地。

## 飞行 HUD

ActionBar 会显示：

- 当前选项和倒计时；
- 航点坐标、自动驾驶状态或禁用原因；
- `Speed`：总速度；
- `GroundSpeed`：水平速度；
- `VerticalVelocity`：垂直速度；
- `Altitude`：相对下方方块/液面的高度；
- `Pitch` / `Yaw`：俯仰角和偏航角；
- `ElytraDamage`：鞘翅耐久损耗百分比。

## 可调参数

参数集中在 [`src/config.js`](src/config.js)：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `CHOICE_REMAIN_TICKS` | `60` | 菜单倒计时，60 tick = 3 秒 |
| `AP_ALT_REQUIREMENT` | `30` | 自动驾驶最低高度 |
| `AP_SINK_RATE_MAX` | `0.8` | 允许的最大下降速度 |
| `AP_ETR_DAMAGE_MAX` | `80` | 鞘翅耐久损耗达到该百分比时禁用 AP |
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

## 声明
此 README 由人工智能生成，不保证与实际情况完全相符，具体情况请进入游戏体验。