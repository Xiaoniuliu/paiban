import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { CardDescription, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Timestamp } from '../components/time';
import type { Language, RuleCatalog, RuleRecentHit } from '../types';
import type { PageProps } from './pageTypes';

export type RuleLevel = 'P0' | 'P1' | 'P2' | 'P3';

export function RuleFilterSelect({ value, values, label, allLabel, onChange }: { value: string; values: string[]; label: string; allLabel: string; onChange: (value: string) => void; }) {
  return (
    <select aria-label={label} className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="ALL">{allLabel} {label}</option>
      {values.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
  );
}

export function RuleActivationSwitch({ rule, disabled, t, onChange }: { rule: RuleCatalog; disabled: boolean; t: (key: string) => string; onChange: (active: boolean) => void; }) {
  const mandatory = isMandatoryRule(rule);
  return (
    <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <Switch checked={mandatory || rule.activeFlag} disabled={disabled || mandatory} onCheckedChange={onChange} aria-label={`${t('ruleActivation')} ${rule.ruleId}`} />
      <span className="whitespace-nowrap text-xs text-muted-foreground">{mandatory ? t('ruleActivationLocked') : rule.activeFlag ? t('active') : t('inactive')}</span>
    </div>
  );
}

export function RuleControlCell({ rule, disabled, t, onChange }: { rule: RuleCatalog; disabled: boolean; t: (key: string) => string; onChange: (active: boolean) => void; }) {
  return (
    <div className="flex min-w-[150px] flex-col gap-1">
      <RuleActivationSwitch rule={rule} disabled={disabled} t={t} onChange={onChange} />
      <span className="text-xs text-muted-foreground">{ruleControlPolicy(rule, t)}</span>
    </div>
  );
}

export function RuleDetailDrawer({ rule, recentHits, hitsLoading, language, saving, t, onActiveChange, onClose }: { rule: RuleCatalog | null; recentHits: RuleRecentHit[]; hitsLoading: boolean; language: Language; saving: boolean; t: (key: string) => string; onActiveChange: (rule: RuleCatalog, active: boolean) => void; onClose: () => void; }) {
  if (!rule) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" data-testid="rule-detail-drawer" onClick={onClose}>
      <aside className="flex h-full w-full max-w-[560px] flex-col bg-card shadow-xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{rule.ruleId}</CardTitle>
            <CardDescription>{ruleTitle(rule, language)}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <RuleVersionStatusBadge status={rule.versionStatus} active={rule.activeFlag} />
            <RuleActivationSwitch rule={rule} disabled={saving} t={t} onChange={(active) => onActiveChange(rule, active)} />
          </div>
        </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t('closeArchiveDrawer')}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{rule.ruleCategory}</Badge>
          <RuleSeverityBadge severity={rule.severityDefault} level={ruleLevel(rule)} />
          <Badge variant="outline">{rule.applicability}</Badge>
          <Badge variant={isMandatoryRule(rule) ? 'destructive' : 'outline'}>{ruleControlPolicy(rule, t)}</Badge>
        </div>
        <RuleDetailSection title={t('ruleDescription')} text={localizedRuleText(rule.descriptionZh, rule.descriptionEn, language)} />
        <RuleDetailSection title={t('ruleTriggerSummary')} text={localizedRuleText(rule.triggerSummaryZh, rule.triggerSummaryEn, language)} />
        <RuleDetailSection title={t('ruleHandlingMethod')} text={localizedRuleText(rule.handlingMethodZh, rule.handlingMethodEn, language)} />
        <RuleDetailSection title={t('ruleSourceRuleIds')} text={ruleSourceIdsText(rule)} />
        <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-background p-3">
          <RuleDetailFact label={t('ruleExceptionAllowed')} value={rule.exceptionAllowed ? t('yes') : t('no')} />
          <RuleDetailFact label={t('ruleVersionStatus')} value={rule.versionStatus} />
          <RuleDetailFact label={t('ruleEntryType')} value={rule.catalogEntryType} />
          <RuleDetailFact label={t('ruleControlPolicy')} value={ruleControlPolicy(rule, t)} />
          <RuleDetailFact label={t('source')} value={`${rule.sourceSection} / ${rule.sourceClause}`} />
          <RuleDetailFact label={t('page')} value={`${rule.sourcePage}`} />
          <RuleDetailFact label={t('ruleFomReference')} value={rule.pdfDeeplink ? '' : t('noData')}>{rule.pdfDeeplink ? <a className="text-primary hover:underline" href={rule.pdfDeeplink} target="_blank" rel="noreferrer">{t('ruleOpenFom')}</a> : null}</RuleDetailFact>
          <RuleDetailFact label={t('effectiveFrom')} value={rule.effectiveFromUtc ? '' : t('noData')}>{rule.effectiveFromUtc ? <Timestamp value={rule.effectiveFromUtc} /> : null}</RuleDetailFact>
          <RuleDetailFact label={t('effectiveTo')} value={rule.effectiveToUtc ? '' : t('noData')}>{rule.effectiveToUtc ? <Timestamp value={rule.effectiveToUtc} /> : null}</RuleDetailFact>
        </div>
        <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
          <div className="font-medium">{t('ruleTrial')}</div>
          <p className="mt-1 text-muted-foreground">{t('ruleTrialPlaceholder')}</p>
        </div>
        <div>
          <div className="font-medium">{t('ruleRecentHitCases')}</div>
          <div className="mt-2 space-y-2">
            {hitsLoading && <div className="text-muted-foreground">{t('loading')}...</div>}
            {!hitsLoading && recentHits.length === 0 && <div className="rounded-md border border-border bg-background p-3 text-muted-foreground">{t('noData')}</div>}
            {!hitsLoading && recentHits.map((hit) => (
              <div key={hit.hitId} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{hit.taskCode ?? hit.targetType ?? hit.ruleId}</div>
                  <RuleSeverityBadge severity={hit.severity} />
                </div>
                <div className="mt-1 text-muted-foreground">{hit.route || hit.crewName || hit.crewCode || t('noData')}</div>
                <div className="mt-2 text-muted-foreground">{hit.message}</div>
                <div className="mt-2"><a className="text-xs font-medium text-primary hover:underline" href={ruleHitHref(hit)}>{t('ruleOpenRelatedContext')}</a></div>
                {(hit.evidenceWindowStartUtc || hit.evidenceWindowEndUtc) && <div className="mt-2 text-xs text-muted-foreground">{hit.evidenceWindowStartUtc ? <Timestamp value={hit.evidenceWindowStartUtc} /> : t('noData')} {' - '} {hit.evidenceWindowEndUtc ? <Timestamp value={hit.evidenceWindowEndUtc} /> : t('noData')}</div>}
              </div>
            ))}
          </div>
        </div>
        </div>
      </aside>
    </div>
  );
}

function RuleDetailSection({ title, text }: { title: string; text: string }) {
  return <div><div className="font-medium">{title}</div><p className="mt-1 text-muted-foreground">{text || '-'}</p></div>;
}

function RuleDetailFact({ label, value, children }: { label: string; value: string; children?: ReactNode; }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-medium">{children ?? value}</div></div>;
}

export function RuleSeverityBadge({ severity, level }: { severity: string; level?: RuleLevel }) {
  const display = level ?? severity;
  if (level === 'P0' || severity === 'BLOCK' || severity === 'NON_COMPLIANT') return <Badge variant="destructive">{display}</Badge>;
  if (level === 'P1') return <Badge variant="outline" className="border-warning text-warning">{display}</Badge>;
  if (level === 'P2' || severity === 'WARNING' || severity === 'ALERT') return <Badge variant="outline" className="border-warning text-warning">{display}</Badge>;
  return <Badge variant="outline">{display}</Badge>;
}

export function RuleVersionStatusBadge({ status, active }: { status: string; active: boolean }) {
  if (active && status === 'ACTIVE') return <Badge className="bg-success text-white">ACTIVE</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function RuleEntryTypeBadge({ entryType }: { entryType: string }) {
  if (entryType === 'DISPLAY_RULE') return <Badge className="bg-primary text-primary-foreground">DISPLAY_RULE</Badge>;
  if (entryType === 'SYSTEM_GATE') return <Badge variant="outline" className="border-warning text-warning">SYSTEM_GATE</Badge>;
  if (entryType === 'DERIVATION') return <Badge variant="outline">DERIVATION</Badge>;
  return <Badge variant="outline">{entryType}</Badge>;
}

export function ruleTitle(rule: RuleCatalog, language: Language) {
  return language === 'zh-CN' ? rule.titleZh : rule.titleEn;
}

function localizedRuleText(zh: string, en: string, language: Language) {
  return language === 'zh-CN' ? zh : en;
}

function ruleSourceIdsText(rule: RuleCatalog) {
  if (!rule.sourceRuleIds) return '-';
  try {
    const sourceIds = JSON.parse(rule.sourceRuleIds);
    return Array.isArray(sourceIds) && sourceIds.length > 0 ? sourceIds.join(', ') : '-';
  } catch {
    return rule.sourceRuleIds;
  }
}

function ruleHitHref(hit: RuleRecentHit) {
  const params = new URLSearchParams();
  if (hit.taskId) params.set('taskId', String(hit.taskId));
  if (hit.crewId) params.set('crewId', String(hit.crewId));
  if (hit.ruleId) params.set('ruleId', hit.ruleId);
  const query = params.toString();
  return `/validation-center/violation-handling${query ? `?${query}` : ''}`;
}

export function compareRuleSeverity(left: RuleCatalog, right: RuleCatalog) {
  const severityDiff = severityRank(ruleLevel(left)) - severityRank(ruleLevel(right));
  if (severityDiff !== 0) return severityDiff;
  return left.ruleId.localeCompare(right.ruleId);
}

export function ruleLevel(rule: RuleCatalog): RuleLevel {
  if (rule.severityDefault === 'P0' || rule.severityDefault === 'P0 BLOCK' || rule.severityDefault === 'BLOCK') return 'P0';
  if (rule.severityDefault === 'P1' || rule.severityDefault === 'P1 NON_COMPLIANT' || rule.severityDefault === 'NON_COMPLIANT') return 'P1';
  if (rule.severityDefault === 'P2' || rule.severityDefault === 'P2 WARNING' || rule.severityDefault === 'WARNING' || rule.severityDefault === 'ALERT') return 'P2';
  return 'P3';
}

export function isMandatoryRule(rule: RuleCatalog) {
  return ruleLevel(rule) === 'P0';
}

export function ruleControlPolicy(rule: RuleCatalog, t: (key: string) => string) {
  if (isMandatoryRule(rule)) return t('ruleP0MandatoryPolicy');
  if (ruleLevel(rule) === 'P1' || ruleLevel(rule) === 'P2') return t('ruleP1P2TogglePolicy');
  return t('ruleCatalogOnlyPolicy');
}

export function isExecutableRule(rule: RuleCatalog) {
  return ruleLevel(rule) !== 'P3';
}

export function hasRuleHits(rule: RuleCatalog) {
  return rule.hitCount > 0 || Boolean(rule.latestHitAtUtc);
}

function severityRank(level: RuleLevel) {
  const ranks: Record<RuleLevel, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return ranks[level] ?? 99;
}

export function ruleCenterMode(activeView: PageProps['activeView']) {
  if (activeView === 'recent-hits' || activeView === 'validation-rule-hits') return 'hits' as const;
  if (activeView === 'rule-catalog' || activeView === 'rule-versions' || activeView === 'fom-references' || activeView === 'admin-rule-config') return 'catalog' as const;
  return 'operational' as const;
}

export function ruleCenterTitle(mode: ReturnType<typeof ruleCenterMode>, t: (key: string) => string) {
  if (mode === 'catalog') return t('ruleCatalogPageTitle');
  if (mode === 'hits') return t('ruleHitsPageTitle');
  return t('operationalRulesPageTitle');
}

export function ruleCenterListTitle(mode: ReturnType<typeof ruleCenterMode>, t: (key: string) => string) {
  if (mode === 'catalog') return t('ruleCatalogTable');
  if (mode === 'hits') return t('ruleRecentHits');
  return t('operationalRulesPageTitle');
}

export function ruleCenterDescription(mode: ReturnType<typeof ruleCenterMode>, t: (key: string) => string) {
  if (mode === 'catalog') return t('ruleCatalogPageDescription');
  if (mode === 'hits') return t('ruleHitsPageDescription');
  return t('operationalRulesPageDescription');
}

export function ruleCenterListDescription(mode: ReturnType<typeof ruleCenterMode>, t: (key: string) => string) {
  if (mode === 'catalog') return t('ruleCatalogPageDescription');
  if (mode === 'hits') return t('ruleHitsPageDescription');
  return t('operationalRulesPageDescription');
}

export function uniqueRuleValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}
