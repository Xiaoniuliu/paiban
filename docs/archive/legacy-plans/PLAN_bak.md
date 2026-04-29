# 飞行员排班系统校验规则全集

## Summary
- 主源是本地 [FOM Chapter 7.pdf](</D:/排班/FOM Chapter 7.pdf>)；`Table A / B` 的四分之一小时数值因本地 PDF 为图片表格，我用 OCR 提取后再与官方 [CAD 371](https://www.cad.gov.hk/english/pdf/CAD371.pdf) 对照，判断数值一致。这里把它们作为“可实现规则”，上线前建议再人工复核一次。
- 下列规则分为三类：`硬校验`（系统必须算）、`告警/留痕`（系统不一定拦截，但必须提示并记录）、`治理提醒`（偏组织义务，系统宜做提醒而非阻断）。

## Validation Rules
### 1. 基础口径与前置数据
- 排班规则适用于所有 operating crew，不只是最低配备飞行员。
- 每名飞行员必须有 `home base`、机组身份、机型资格、当前 acclimatized 状态、最近 28 天飞行小时、最近 28 天 duty 小时。
- 若 duty 结束地与 home base 本地时间相差超过 3 小时，机组立即视为 `unacclimatized`。
- 若机组自 home-base duty/duty cycle 开始后 48 小时内返回 home base，可恢复为 `acclimatized`；超过 48 小时则需完成 `7.1.21` recovery period 后才恢复。
- `Duty` 包含 FDP、positioning、ground training、ground duties、standby，以及飞行结束后固定 30 分钟 post-flight duty。
- `FDP` 从要求报到执行飞行时开始，至最终航段上轮挡/关车，或机组最后离开操纵位且后续不再承担飞行职责时结束，以较早者为准。
- `DDO` 单次最少 34 连续小时且包含 2 个 local nights；连续额外 DDO 每个至少 24 小时并多含 1 个 local night。
- `EXB` 是 away from home base 的无 duty 时段，最少 30 连续小时。
- `Late Night Period` 为机组所适应时区的 0100-0659；`WOCL` 为个人生理钟 0200-0559；`Local Night` 为当地 2200-0800 中任意连续 8 小时。

### 2. 报到、收工与时间计算
- 飞行 duty 的计划报到时间默认为 `STD - 60 min`，或公司另行通知的更早时间。
- Positioning 的计划报到时间也默认为 `STD - 60 min`，或另行通知的更早时间。
- 无后续 duty 时，飞行或 positioning 的计划收工/休息开始时间为最终航段 `STA + 30 min`。
- 实际报到时间取“计划报到”和“实际报到”中的较晚者。
- 无后续 duty 时，飞行或 positioning 的实际收工/休息开始时间为 `ATA on-block + 30 min`，若存在异常 post-flight duties 则取更晚时间。
- 机场流程导致 terminal 与 reporting place 间长期延迟时，系统应触发“需调整报到规则”的治理告警。

### 3. 标准 FDP 上限
**Table A：Acclimatized 机组标准 FDP（小时）**

| Local start | 1 sector | 2 | 3 | 4 | 5 | 6 | 7 | 8+ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0700-0759 | 13 | 12.25 | 11.5 | 10.75 | 10 | 9.25 | 9 | 9 |
| 0800-1259 | 14 | 13.25 | 12.5 | 11.75 | 11 | 10.25 | 9.5 | 9 |
| 1300-1759 | 13 | 12.25 | 11.5 | 10.75 | 10 | 9.25 | 9 | 9 |
| 1800-2159 | 12 | 11.25 | 10.5 | 9.75 | 9 | 9 | 9 | 9 |
| 2200-0659 | 11 | 10.25 | 9.5 | 9 | 9 | 9 | 9 | 9 |

**Table B：Unacclimatized 机组标准 FDP（小时）**

| Preceding rest | 1 sector | 2 | 3 | 4 | 5 | 6 | 7+ |
|---|---:|---:|---:|---:|---:|---:|---:|
| Up to 18h | 13 | 12.25 | 11.5 | 10.75 | 10 | 9.25 | 9 |
| 18-30h | 11.5 | 11 | 10.5 | 9.75 | 9 | 9 | 9 |
| Over 30h | 13 | 12.25 | 11.5 | 10.75 | 10 | 9.25 | 9 |

- 正常运行下，acclimatized 用 Table A，unacclimatized 用 Table B。
- 两人制飞机若计划航段大于 9 小时，或大于 8 小时且该航段穿越/结束于 FDP 起始地当地 0200-0559，则必须额外上 1 名符合 relief 资格的飞行员。
- 前序 rest 被减少过时，后续 allowable FDP 必须按“reduced rest 后规则”重新判定，不能直接按普通 Table A/B 放行。

### 4. Extended FDP、ULR、Split Duty
- 只有同时满足 relief crew qualification 和 in-flight relief facility 时，才允许 extended FDP。
- 总 in-flight relief 少于 3 小时，不允许延长标准 FDP。
- 有 bunk 时，FDP 可延长 `总 relief 的 1/2`，但总 FDP 不得超过 18 小时。
- 只有 seat 时，FDP 可延长 `总 relief 的 1/3`，但总 FDP 不得超过 15 小时。
- 任一飞行员不得连续在 controls 超过 8 小时且中间没有至少 1 小时完全脱离 flight duty 的 relief；整个 FDP 内在 controls 的累计时间不得超过 10 小时。
- 计入 in-flight relief 的最大时长不得超过 `actual block time - 1 hour`；地面过站时间不能算。
- 当天发生非计划长地停时，机上地面休息只有在 FOM 允许条件下才可按 seat/bunk 比例计入 relief。
- 机组完成 relief 后若余下航段完全不再承担 duty，剩余飞行可按 positioning 处理。
- 为满足额外飞行员要求而上第三人时，必须提供 comfortable seat 或 bunk。
- `ULR` 定义为两人制机型、上 3 名及以上飞行员、起止地时差 6 小时及以上。
- ULR 下 FDP 不看 acclimatization 和 start band；3 pilots 最多 13 小时，4 pilots 最多 18 小时。
- ULR 扩展 FDP 最多排 2 个 sectors；第 3 个 sector 只能在 service disruption 下飞。
- ULR 每多 1 个额外航段，最大 FDP 再减 45 分钟。
- ULR 中每名机组总 relief 不得少于 3 小时，且在 controls 限制与普通 extended FDP 相同。
- Split duty 休息少于 3 小时不增加 FDP；3-10 小时增加 `休息时长的一半`。
- Split duty 的休息前后两段 FDP 各自都不得超过 10 小时，总 split-duty FDP 不得超过 18 小时。
- Split duty 不能与 augmented crew extended FDP 叠加使用。
- Split duty 中间休息不含 pre/post-flight duties 和往返休息地点 travel time。
- 中间休息少于 6 小时时，只需 quiet/comfortable 且非公众区域；超过 6 小时或覆盖当地 2200-0800 中 3 小时以上时，必须提供 suitable accommodation，除非 security 原因豁免。
- 在地面飞机上休息仅在以下同时满足时允许：休息少于 6 小时、有 reclining seat/bunk、无旅客、无装卸货、附近无维修、温控和通风可控。

### 5. Late Finish / Early Start、Mixed Duties、Travel
- 早班晚班限制只适用于 acclimatized flight crew，且 duty cycle 内存在一个 FDP，而其前有落入 LNP 的 duty；纯 ground duties 不适用；因 service disruption 延误进入 LNP 的 FDP 不适用。
- 连续落入 LNP 的 duties 不得超过 3 次，任意连续 6 天内此类 duties 不得超过 4 次。
- 若住公司提供的 suitable accommodation 且至报到点正常车程不超过 15 分钟，可把 0659 门槛改按 0559 处理。
- 除 regular overnight 例外外，飞行员不得被排超过 3 个连续 encroach LNP 的 duties。
- 若有连续 encroach LNP 的 FDP 序列，则首个此类 FDP 前一天，飞行员必须在 home base time 2100 前脱离所有 duty。
- 若出现连续 3 个、或 7 天内超过 3 个 encroach LNP 的 FDP/duty，后续 free period 必须至少 48 小时且含 2 个 local nights。
- Regular overnight duty 最多连续 5 个 encroach LNP 的 FDP，但前置 rest 至少 36 小时、每个 FDP 不得超过 8 小时、结束后 free 至少 63 小时。
- 计划飞行前若先执行公司安排的任务，该任务时间计入后续 FDP。
- 管理飞行员的 office time 若发生在飞行前，计入 duty，并须记录实际完成时长。
- Simulator 与 aircraft flying 同一 duty period 内连续发生时，simulator 时间全额计入后续 FDP；FDP 起算点是 simulator report time；受训者的 simulator 计作一个 sector，教员/检查员的不计 sector。
- 普通 commuting/travelling 不算 duty；但从家前往“非通常运营机场”的超出部分算 positioning。
- 若 home-to-normal-airport 通勤通常超过 1.5 小时，系统应给出疲劳/住宿建议告警。
- 改班且机组尚未离开休息地点时，若报到延误，allowable FDP 取 planned/actual report 所对应更严格 band，并从 actual report 算；若延误达到 4 小时，则从“原报到后第 4 小时”开始算 FDP。
- 若公司在离开休息地点前 10 小时以上通知延误，且之后未再打扰到约定时间，则这段 elapsed time 可算 rest；再次延误时要重新套用同一规则。

### 6. Positioning、Standby、Rest、Recovery、DDO
- 所有 positioning 都计入 duty；除 FOM 特别规定外，不计 sector；FDP 不得晚于 positioning report time 开始。
- FDP 后 positioning 本身没有单独上限，但必须仍满足 cumulative duty hours。
- 若 positioning 后获得的 rest 少于 minimum rest，随后又飞 FDP，则若想用 split duty 计算 allowable FDP，前述 positioning 必须计作一个 sector；不计则不能用 split duty。
- Standby 的起止时间和性质必须明确并提前通知；standby 最长 12 小时。
- Call-out 后，standby 在机组抵达指定 reporting point 时结束。
- 机场 immediate-readiness standby 的 allowable FDP 从 standby start 开始计算。
- 家中/公司住宿 standby 被叫出时：acclimatized 机组按“standby start 与 actual report 中更严格的 time band”算 FDP；unacclimatized 机组按 Table B 的 preceding rest 算 FDP；两者都从 actual report 起算。
- 但若 actual report 晚于 standby start 4 小时及以上，则 FDP 一律从第 4 小时点开始。
- Standby call-out 后，总 duty = standby 时间（最多计 4 小时）+ 实际 FDP + post-flight duties（含 positioning）。
- 一般 rest 规则：若前后 duty 起止地时差小于 6 小时，下一次 rest 取 `前序 duty 时长` 与 `11 小时` 的较大者。
- 当 earned rest 恰为 11 小时且公司提供住宿时，可减 1 小时；若机场往返住宿路程合计超过 1 小时，则把超出部分补回；房间可用时长不得少于 10 小时。
- 若前序 duty（含 positioning）超过 18 小时，后续 rest 必须包含 1 个 local night。
- 若前后 duty 起止地时差达到 6 小时以上，且该 rest 发生在 duty cycle 开始后 72 小时内，则 next rest 取以下最大值：前序 duty 时长、能在 2200-0800 home base time 内提供 8 小时 sleep opportunity 的时长、14 小时。
- 若该 rest 发生在 duty cycle 开始 72 小时之后，则 sleep opportunity 的判断窗口改为“最后休息地点当地 2200-0800”。
- 对上述两种 6h+ 时差情况，也可改用 `max(前序 duty 时长, 34 小时)` 的替代规则。
- “reduced rest 后又 extended FDP”的下一次 rest 不得再减少。
- Unacclimatized 机组在 14 天内，18-30 小时带内的 rest 最多排 3 次连续或累计 4 次；若已达到，14 天内后续 EXB 必须至少 34 小时；standby 排班不受此条限制。
- Duty cycle 超过 48 小时且机组在其间变成 unacclimatized，返 home base 后必须按 Table X 给 recovery；rest 可并入 recovery。
- Recovery 仅可为保持 roster stability 而减少，且 28 天内最多一次，只适用于原计划 recovery 长度至少 4 个 DDO 的情况。
- 因 service disruption 晚返 base 时，公司可把 recovery 减 1 个 DDO；经机组同意最多再减 1 个，总减幅不得超过 2 个 DDO。
- `Table X`：48-72h/4-5-6-7/8-12 zones => 1/1/2/2/2 DDO；72-96h => 全部 3；96-120h => 3/4/4/4/4；120-144h => 3/4/5/5/5；>144h => 3/4/5/6/6。
- 飞行员连续 duty 不得超过 6 天才给 DDO 或 EXB；第 7 天可只用于 positioning 回 home base，但之后必须给至少 2 个连续 DDO。
- 任意连续 14 天内，必须出现一组 2 个连续 DDO；连续 3 个四周周期平均，每 4 周至少平均 8 个 DDO。

### 7. 飞行小时、Duty 小时、记录、Discretion
- 开始任一航班前，滚动 28 天飞行小时不得超过 100 小时。
- 开始任一航班前，截止上月底的 12 个月飞行小时不得超过 900 小时。
- Cumulative duty 统计窗口默认从 Macao local time 每日 0001 开始；若大量海外 base 机组，允许按其 home base 午夜统计。
- Duty hours 上限：任意连续 7 天 55 小时；若已开始的 rostered duty 因不可预见延误扩张，可放宽到 60 小时。
- 上述 60 小时又可额外超出最多 10 小时，但只能用于把机组 positioning 回 home base，以便开始 DDO 或 Table X recovery/rest。
- Duty hours 上限：任意连续 14 天 95 小时；任意连续 28 天 190 小时。
- 若某个 duty period 含有一个“FDP 起止地时差 6 小时及以上”的 FDP，则该机组 28 天 allowable duty 上限每次再减 8 小时。
- 计入 cumulative duty 的口径：所有 duty periods/FDPs 与 post-flight duties 全额计入；所有 positioning 全额计入；standby 默认全额计入。
- 下列 standby 按 1/2 计入：通知提前量至少为 minimum report time 的 3 倍；或 home/accommodation standby 发生在 2200-0800 且机组能无干扰休息且未被 call-out。
- 若机组连续 28 天及以上未被排 standby 或 flying duty，则旧 duty hours 可不带入累计；但回归前 28 天的 duty 仍须记录，并在安排新 flight duty 前校验合规。
- 海外长期课程/地面任务可为实现培训目的而变更 DDO 和 Table X，但返回飞行前必须重新满足本章合规，必要时先给 recovery。
- 系统必须保存：每次 duty/FDP 的开始、结束、时长、岗位功能；每次飞行前或 standby 前的 rest 时长；DDO 日期；cumulative duty totals；每日/滚动 28 天/12 个月飞行小时；保存期至少 12 个月。
- 所有延长 FDP 或减少 rest 的 CDR 与公司请求记录必须保留至少 12 个月。
- 计划 block/sector times 必须反映实际可达运行时间；若触发 PIC discretion 的情况增多，系统必须记录并支持月度复核。
- 若 2 个月内有 15% 及以上航班的实际 block time 比计划多 15 分钟以上，则必须调整计划 block times。
- `Commander’s Discretion` 只能用于已开始 rostered FDP 后出现的不可预见情况，不能预先排入班表，也不能形成常态。
- 公司请求 discretion 时，只能由 FOM 指定管理角色发起；请求必须合理；PIC 决定最终且不可质疑。
- 延长 FDP 的 discretion：普通情况下最多在原 allowable FDP 上加 3 小时；若原 FDP 已因 augmented crew、split duty 或 reduced rest 被特殊处理，则最多只再加 2 小时；超过此值只能是 emergency。
- Reduced-rest discretion 不适用于 duty cycles 之间的 recovery periods。
- 通过 discretion 减 rest 时，即使低于 normal minimum rest，也必须保证分配给机组的房间可占用不少于 10 小时。
- 任何 reduced rest 或 extended FDP 都必须生成 CDR；若 FDP 延长超过 2 小时、或该延长发生在 reduced rest 之后、或 rest 减少超过 1 小时，则 CDR 与公司记录必须在飞机返 base/返 Macao 后 7 天内提交 AACM。

## Governance Reminders
- 班表应尽量避免 day/night duties 交替，避免无生理意义的 18-30 小时 rest，提前通知 days off。
- 新开跨时区超过 6 小时的航线，应触发 AACM 通知、进一步评估或 FRMS 评审提醒。
- 计划 FDP 超过 18 小时时，必须有 safety case 并提交 AACM。
- Away from home base 时，公司应提供适当住宿；若通知太短，公司来不及安排，则由 PIC 接管责任。
- 机组如有其他受雇飞行/工作记录，安排 flight duty 前必须先补齐并纳入最近 28 天/12 个月校验。

## Assumptions
- 上述清单按“系统可实现”为目标做了转写；纯教育、培训、咨询、管理职责已尽量转成提醒或留痕规则。
- `Table A / B` 的数值采用本地 FOM 图表与官方 CAD 371 的一致部分；如果你们后续确认 AACM 覆盖层有澳门专属差异，应在规则层覆盖这些表值和 note 条件。
