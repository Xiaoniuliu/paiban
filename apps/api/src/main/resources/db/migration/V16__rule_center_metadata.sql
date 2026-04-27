ALTER TABLE rule_catalog
  ADD COLUMN applicability VARCHAR(128) NOT NULL DEFAULT 'Roster validation' AFTER active_flag,
  ADD COLUMN description_zh VARCHAR(512) NOT NULL DEFAULT '' AFTER applicability,
  ADD COLUMN description_en VARCHAR(512) NOT NULL DEFAULT '' AFTER description_zh,
  ADD COLUMN trigger_summary_zh VARCHAR(512) NOT NULL DEFAULT '' AFTER description_en,
  ADD COLUMN trigger_summary_en VARCHAR(512) NOT NULL DEFAULT '' AFTER trigger_summary_zh,
  ADD COLUMN handling_method_zh VARCHAR(512) NOT NULL DEFAULT '' AFTER trigger_summary_en,
  ADD COLUMN handling_method_en VARCHAR(512) NOT NULL DEFAULT '' AFTER handling_method_zh,
  ADD COLUMN exception_allowed BOOLEAN NOT NULL DEFAULT FALSE AFTER handling_method_en,
  ADD COLUMN pdf_deeplink VARCHAR(255) NULL AFTER exception_allowed,
  ADD COLUMN version_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' AFTER pdf_deeplink,
  ADD COLUMN effective_from_utc DATETIME NULL AFTER version_status,
  ADD COLUMN effective_to_utc DATETIME NULL AFTER effective_from_utc;

UPDATE rule_catalog
SET applicability = 'Rostering Workbench',
    description_zh = '发布前基础排班门槛规则，来自排班工作台一期与二期收口。',
    description_en = 'Basic publish gate rule for assignment readiness in the rostering workbench.',
    trigger_summary_zh = '任务处于待排、阻断、缺少 PIC/FO 或需要经理复核时命中。',
    trigger_summary_en = 'Triggered when a task is unassigned, blocked, missing PIC/FO, or needs manager review.',
    handling_method_zh = '返回待排航班或排班抽屉完成修复；WARNING 需经理确认或例外流程。',
    handling_method_en = 'Return to the assignment drawer to resolve blockers; warnings require manager confirmation or exception flow.',
    exception_allowed = CASE WHEN rule_id = 'MANAGER_REVIEW_REQUIRED' THEN TRUE ELSE FALSE END,
    version_status = 'ACTIVE',
    effective_from_utc = '2026-04-26 00:00:00'
WHERE phase_code = 'PHASE_2'
  AND rule_category = 'PUBLISH_GATE';

UPDATE rule_catalog
SET applicability = 'Crew Timeline',
    description_zh = '基于 timeline_block 的二期时间冲突规则。',
    description_en = 'Phase 2 time conflict rule based on timeline_block data.',
    trigger_summary_zh = '同一机组在重叠时间窗口内存在多个业务块，或航班与休息/值班/训练等状态块重叠。',
    trigger_summary_en = 'Triggered when a crew member has overlapping blocks, including flight versus rest, duty, standby, training, DDO, or recovery.',
    handling_method_zh = '调整排班、运行日调整或状态时间线，重新校验后清除命中。',
    handling_method_en = 'Adjust assignment, run-day change, or crew status timeline, then rerun validation.',
    exception_allowed = FALSE,
    version_status = 'ACTIVE',
    effective_from_utc = '2026-04-26 00:00:00'
WHERE phase_code = 'PHASE_2'
  AND rule_category = 'TIME_CONFLICT';

UPDATE rule_catalog
SET applicability = 'FDP',
    description_zh = '标准 FDP 上限规则目录项。本轮只进入规则中心，三期接规则引擎后执行计算。',
    description_en = 'Standard FDP limit catalog entry. It is listed now and will be calculated by the Phase 3 rule engine.',
    trigger_summary_zh = '三期根据适应状态、开始时段、航段数和前序休息计算。',
    trigger_summary_en = 'Phase 3 will calculate from acclimatization, start band, sector count, and preceding rest.',
    handling_method_zh = '三期启用后，超限任务需调整航班、增员或进入例外流程。',
    handling_method_en = 'When enabled, over-limit duties must be adjusted, augmented, or moved into exception handling.',
    exception_allowed = TRUE,
    pdf_deeplink = '/docs/FOM-Chapter-7.pdf#page=10',
    version_status = 'PHASE_3',
    phase_code = 'PHASE_3',
    active_flag = FALSE
WHERE rule_id = 'FDP_STD_A';

INSERT IGNORE INTO rule_catalog (
  rule_id, title_zh, title_en, rule_category, severity_default,
  source_section, source_clause, source_page, phase_code, active_flag,
  applicability, description_zh, description_en, trigger_summary_zh, trigger_summary_en,
  handling_method_zh, handling_method_en, exception_allowed, pdf_deeplink, version_status
) VALUES
  ('RG-FDP-006', 'FDP 不得超过允许上限', 'FDP must not exceed allowable limit', '硬校验', 'NON_COMPLIANT', '7.1', 'FDP Table A/B', 10, 'PHASE_3', FALSE,
   'FDP', '标准 FDP 上限规则，三期接入完整计算。', 'Standard FDP limit rule planned for Phase 3 calculation.',
   '按适应状态、开始时段、航段数和前序休息计算允许 FDP。', 'Calculate allowable FDP from acclimatization, start band, sectors, and preceding rest.',
   '调整任务时间、增员或进入例外流程。', 'Adjust timing, augment crew, or start exception flow.', TRUE, '/docs/FOM-Chapter-7.pdf#page=10', 'PHASE_3'),
  ('RG-FDP-007', '两人制长航段需增员', 'Two-pilot long sector requires augmentation', '硬校验', 'BLOCK', '7.1', 'Augmentation requirement', 10, 'PHASE_3', FALSE,
   'FDP', '两人制大于 9h 或夜间大于 8h 的任务需额外机组。', 'Two-pilot duties beyond 9h or night duties beyond 8h require augmentation.',
   '检查计划时长、夜间窗口和额外人员。', 'Check planned duration, night window, and additional crew.',
   '增加 RELIEF / EXTRA 人员或调整航班。', 'Add RELIEF / EXTRA crew or adjust the flight.', FALSE, '/docs/FOM-Chapter-7.pdf#page=10', 'PHASE_3'),
  ('RG-REST-001', 'Minimum rest 不得不足', 'Minimum rest must be satisfied', '硬校验', 'NON_COMPLIANT', '7.1', 'Minimum rest', 19, 'PHASE_3', FALSE,
   'Rest', '前后 duty 之间必须满足最小休息。', 'Minimum rest is required between duties.',
   '根据前序 duty、时差和住宿条件计算所需休息。', 'Calculate required rest from prior duty, timezone difference, and accommodation.',
   '插入休息或调整后续任务。', 'Insert rest or adjust subsequent tasks.', TRUE, '/docs/FOM-Chapter-7.pdf#page=19', 'PHASE_3'),
  ('RG-BASE-008', 'DDO 至少 34h 且含 2 个 local nights', 'DDO requires at least 34h and two local nights', '硬校验', 'NON_COMPLIANT', '7.1', 'DDO validity', 9, 'PHASE_3', FALSE,
   'DDO', '计划 DDO 是否有效由规则层计算，不由状态录入直接判定。', 'Planned DDO validity is decided by rule evaluation, not by manual entry.',
   '检查 DDO 块长度和 local nights。', 'Check DDO duration and local nights.',
   '延长 DDO、补充休息或调整任务。', 'Extend DDO, add rest, or adjust duties.', FALSE, '/docs/FOM-Chapter-7.pdf#page=9', 'PHASE_3'),
  ('RG-DDO-003', '任意 14 天内必须有 2 连续 DDO', 'Two consecutive DDOs required in any 14 days', '硬校验', 'NON_COMPLIANT', '7.1', '14-day DDO', 20, 'PHASE_3', FALSE,
   'DDO', '滚动 14 天 DDO 连续性规则。', 'Rolling 14-day DDO continuity rule.',
   '按机组连续时间轴查找 2 个连续 DDO。', 'Scan crew timeline for two consecutive DDOs.',
   '补充 DDO 或调整 duty 排列。', 'Add DDOs or adjust duty sequence.', TRUE, '/docs/FOM-Chapter-7.pdf#page=20', 'PHASE_3'),
  ('RG-REC-001', '跨时区 duty cycle 返 base 后需 Recovery', 'Recovery required after qualifying cross-timezone duty cycle', '硬校验', 'NON_COMPLIANT', '7.1', 'Recovery', 20, 'PHASE_3', FALSE,
   'Recovery', '跨时区 duty cycle 后的 recovery 要求。', 'Recovery requirement after cross-timezone duty cycles.',
   '根据 duty cycle 长度、跨越时区数和返 base 状态计算。', 'Calculate from duty-cycle duration, timezone zones crossed, and return-to-base state.',
   '补充 Recovery 或调整后续任务。', 'Add recovery or adjust subsequent tasks.', TRUE, '/docs/FOM-Chapter-7.pdf#page=20', 'PHASE_3'),
  ('RG-HOUR-001', '滚动 28 天飞行小时不得超过 100h', 'Rolling 28-day flight hours must not exceed 100h', '硬校验', 'NON_COMPLIANT', '7.1', 'Flight hours', 21, 'PHASE_3', FALSE,
   'Flight Hours', '飞行小时累计上限规则。', 'Cumulative flight hour limit rule.',
   '根据归档实际飞行时间和历史小时滚动计算。', 'Calculate from archived actual flight time and historical totals.',
   '调整任务或触发经理复核。', 'Adjust tasks or trigger manager review.', TRUE, '/docs/FOM-Chapter-7.pdf#page=21', 'PHASE_3'),
  ('RG-STBY-002', 'Standby 最长 12h', 'Standby must not exceed 12h', '硬校验', 'NON_COMPLIANT', '7.1', 'Standby limit', 18, 'PHASE_3', FALSE,
   'Standby', '待命状态块时长上限规则。', 'Standby block duration limit rule.',
   '检查 STANDBY 状态块起止时间。', 'Check STANDBY block start and end times.',
   '缩短待命或拆分安排。', 'Shorten or split standby assignment.', FALSE, '/docs/FOM-Chapter-7.pdf#page=18', 'PHASE_3'),
  ('RG-DISC-010', 'Discretion 必须生成 CDR', 'Discretion must generate CDR', '告警留痕', 'BLOCK', '7.1', 'CDR record', 23, 'PHASE_3', FALSE,
   'CDR / AACM', '运行例外和 PIC discretion 的记录闭环规则。', 'Record-keeping rule for operational discretion and CDR.',
   '发生 discretion 后检查 CDR / AACM 记录。', 'Check CDR / AACM records after discretion.',
   '补录 CDR 或进入 AACM 报送。', 'Complete CDR or start AACM reporting.', FALSE, '/docs/FOM-Chapter-7.pdf#page=23', 'PHASE_3');
