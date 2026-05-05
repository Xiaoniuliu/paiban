UPDATE timeline_block tb
JOIN roster_version rv ON rv.id = tb.roster_version_id
SET tb.start_utc = '2026-05-23 14:00:00',
    tb.end_utc = '2026-05-25 00:00:00'
WHERE rv.version_no = 'RV-2026-05-W1-DRAFT'
  AND tb.block_type = 'DDO'
  AND tb.start_utc = '2026-05-24 00:00:00'
  AND tb.end_utc = '2026-05-25 10:00:00';

DELETE vh
FROM violation_hit vh
JOIN rule_catalog rc ON rc.id = vh.rule_catalog_id
JOIN timeline_block tb ON tb.id = vh.timeline_block_id
JOIN roster_version rv ON rv.id = tb.roster_version_id
WHERE rc.rule_id = 'RG-BASE-008'
  AND rv.version_no = 'RV-2026-05-W1-DRAFT'
  AND tb.block_type = 'DDO'
  AND tb.start_utc = '2026-05-23 14:00:00'
  AND tb.end_utc = '2026-05-25 00:00:00';
