import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { viewTitleKey } from '../i18n';
import type { Language, RuleCatalog, RuleRecentHit } from '../types';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { EmptyState, PageHeader } from '../components/framework/PageShell';
import { Timestamp } from '../components/time';
import type { PageProps } from './pageTypes';

export function RuleCenterPage({ activeView, api, language, t }: PageProps) {
  const [rules, setRules] = useState<RuleCatalog[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [recentHits, setRecentHits] = useState<RuleRecentHit[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [clauseFilter, setClauseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [entryTypeFilter, setEntryTypeFilter] = useState('DISPLAY_RULE');
  const [loading, setLoading] = useState(true);
  const [hitsLoading, setHitsLoading] = useState(false);
  const [savingRuleIds, setSavingRuleIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.rules()
      .then((items) => {
        setRules(items);
        setSelectedRuleId((current) => current ?? items.find((item) => item.catalogEntryType === 'DISPLAY_RULE')?.ruleId ?? items[0]?.ruleId ?? null);
      })
      .catch(() => setError(t('ruleCatalogLoadError')))
      .finally(() => setLoading(false));
  }, [api, t]);

  const categories = useMemo(() => uniqueRuleValues(rules.map((rule) => rule.ruleCategory)), [rules]);
  const severities = useMemo(() => uniqueRuleValues(rules.map((rule) => rule.severityDefault)), [rules]);
  const sections = useMemo(() => uniqueRuleValues(rules.map((rule) => rule.sourceSection)), [rules]);
  const clauses = useMemo(() => uniqueRuleValues(rules.map((rule) => rule.sourceClause)), [rules]);
  const statuses = useMemo(() => uniqueRuleValues(rules.map((rule) => rule.versionStatus)), [rules]);
  const entryTypes = useMemo(() => uniqueRuleValues(rules.map((rule) => rule.catalogEntryType)), [rules]);

  const filteredRules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rules.filter((rule) => {
      const haystack = [
        rule.ruleId,
        ruleTitle(rule, language),
        rule.ruleCategory,
        rule.severityDefault,
        rule.sourceSection,
        rule.sourceClause,
        rule.versionStatus,
        rule.phaseCode,
        rule.catalogEntryType,
        rule.displayRuleCode ?? '',
        rule.sourceRuleIds ?? '',
      ].join(' ').toLowerCase();
      return (!normalizedQuery || haystack.includes(normalizedQuery))
        && (categoryFilter === 'ALL' || rule.ruleCategory === categoryFilter)
        && (severityFilter === 'ALL' || rule.severityDefault === severityFilter)
        && (sectionFilter === 'ALL' || rule.sourceSection === sectionFilter)
        && (clauseFilter === 'ALL' || rule.sourceClause === clauseFilter)
        && (statusFilter === 'ALL' || rule.versionStatus === statusFilter)
        && (entryTypeFilter === 'ALL' || rule.catalogEntryType === entryTypeFilter);
    }).sort(compareRuleSeverity);
  }, [categoryFilter, clauseFilter, entryTypeFilter, language, query, rules, sectionFilter, severityFilter, statusFilter]);

  const selectedRule = useMemo(() => (
    filteredRules.find((rule) => rule.ruleId === selectedRuleId) ?? filteredRules[0] ?? rules[0] ?? null
  ), [filteredRules, rules, selectedRuleId]);

  useEffect(() => {
    if (!selectedRule) {
      setRecentHits([]);
      return;
    }
    setHitsLoading(true);
    api.ruleRecentHits(selectedRule.ruleId)
      .then(setRecentHits)
      .catch(() => setRecentHits([]))
      .finally(() => setHitsLoading(false));
  }, [api, selectedRule]);

  const updateRuleActive = async (rule: RuleCatalog, active: boolean) => {
    if (rule.activationLocked && !active) {
      return;
    }
    setSavingRuleIds((current) => [...current, rule.ruleId]);
    setError('');
    try {
      const updated = await api.updateRuleActive(rule.ruleId, active);
      setRules((current) => current.map((item) => (item.ruleId === updated.ruleId ? updated : item)));
    } catch {
      setError(t('ruleActivationUpdateError'));
    } finally {
      setSavingRuleIds((current) => current.filter((ruleId) => ruleId !== rule.ruleId));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ShieldCheck}
        title={t(viewTitleKey[activeView])}
        description={t('ruleCenterDescription')}
      />
      <Card className="rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('ruleFilters')}</CardTitle>
          <CardDescription>{t('ruleCenterFilterDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8">
          <Input className="xl:col-span-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('ruleSearchPlaceholder')} />
          <RuleFilterSelect value={categoryFilter} values={categories} label={t('category')} allLabel={t('all')} onChange={setCategoryFilter} />
          <RuleFilterSelect value={severityFilter} values={severities} label={t('severity')} allLabel={t('all')} onChange={setSeverityFilter} />
          <RuleFilterSelect value={sectionFilter} values={sections} label={t('ruleSourceSection')} allLabel={t('all')} onChange={setSectionFilter} />
          <RuleFilterSelect value={clauseFilter} values={clauses} label={t('ruleSourceClause')} allLabel={t('all')} onChange={setClauseFilter} />
          <RuleFilterSelect value={statusFilter} values={statuses} label={t('status')} allLabel={t('all')} onChange={setStatusFilter} />
          <RuleFilterSelect value={entryTypeFilter} values={entryTypes} label={t('ruleEntryType')} allLabel={t('all')} onChange={setEntryTypeFilter} />
        </CardContent>
      </Card>
      {loading && <Card className="rounded-lg p-6 text-sm text-muted-foreground">{t('loading')}...</Card>}
      {error && <Card className="rounded-lg p-6 text-sm text-destructive">{error}</Card>}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card className="rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('ruleCatalogTable')}</CardTitle>
              <CardDescription>{t('ruleCatalogTableDescription')} {filteredRules.length}/{rules.length}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">{t('ruleId')}</th>
                      <th className="px-4 py-3 font-medium">{t('name')}</th>
                      <th className="px-4 py-3 font-medium">{t('category')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleEntryType')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleApplicability')}</th>
                      <th className="px-4 py-3 font-medium">{t('severity')}</th>
                      <th className="px-4 py-3 font-medium">{t('source')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleVersion')}</th>
                      <th className="px-4 py-3 font-medium">{t('status')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleActivation')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleRecentHits')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleLatestHit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRules.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-6">
                          <EmptyState title={t('noData')} description={t('ruleNoMatches')} />
                        </td>
                      </tr>
                    ) : (
                      filteredRules.map((rule) => {
                        const isSelected = selectedRule?.ruleId === rule.ruleId;
                        return (
                          <tr key={rule.ruleId} className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 ${isSelected ? 'bg-muted/50' : ''}`} onClick={() => setSelectedRuleId(rule.ruleId)}>
                            <td className="whitespace-nowrap px-4 py-3 font-semibold">{rule.ruleId}</td>
                            <td className="min-w-[14rem] px-4 py-3">{ruleTitle(rule, language)}</td>
                            <td className="px-4 py-3"><Badge variant="outline">{rule.ruleCategory}</Badge></td>
                            <td className="px-4 py-3"><RuleEntryTypeBadge entryType={rule.catalogEntryType} /></td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{rule.applicability}</td>
                            <td className="px-4 py-3"><RuleSeverityBadge severity={rule.severityDefault} /></td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{rule.sourceSection} / {rule.sourceClause} / {t('page')} {rule.sourcePage}</td>
                            <td className="whitespace-nowrap px-4 py-3">{rule.phaseCode}</td>
                            <td className="px-4 py-3"><RuleVersionStatusBadge status={rule.versionStatus} active={rule.activeFlag} /></td>
                            <td className="px-4 py-3">
                              <RuleActivationSwitch rule={rule} disabled={savingRuleIds.includes(rule.ruleId)} t={t} onChange={(active) => updateRuleActive(rule, active)} />
                            </td>
                            <td className="px-4 py-3">{rule.hitCount}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{rule.latestHitAtUtc ? <Timestamp value={rule.latestHitAtUtc} /> : t('noData')}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <RuleDetailPanel rule={selectedRule} recentHits={recentHits} hitsLoading={hitsLoading} language={language} saving={selectedRule ? savingRuleIds.includes(selectedRule.ruleId) : false} t={t} onActiveChange={updateRuleActive} />
        </div>
      )}
    </div>
  );
}

export function LegacyRuleCenterPage({ activeView, api, language, t }: PageProps) {
  const [rules, setRules] = useState<RuleCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.rules().then(setRules).catch(() => setError(t('ruleCatalogLoadError'))).finally(() => setLoading(false));
  }, [api, t]);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{t(viewTitleKey[activeView])}</CardTitle>
        <CardDescription>{t('ruleCenterDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}
        {!loading && !error && (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{rule.ruleId}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{language === 'zh-CN' ? rule.titleZh : rule.titleEn}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{rule.ruleCategory}</Badge>
                    <Badge>{rule.severityDefault}</Badge>
                    <Badge variant="outline">{t('ruleRecentHits')}: {rule.hitCount}</Badge>
                  </div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{t('source')}: {rule.sourceSection} / {rule.sourceClause} / Page {rule.sourcePage}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t('ruleVersion')}: {rule.phaseCode} 路 {t('ruleLatestHit')}: {rule.latestHitAtUtc ? <Timestamp value={rule.latestHitAtUtc} /> : t('noData')}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RuleFilterSelect({ value, values, label, allLabel, onChange }: { value: string; values: string[]; label: string; allLabel: string; onChange: (value: string) => void; }) {
  return (
    <select aria-label={label} className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="ALL">{allLabel} {label}</option>
      {values.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
  );
}

function RuleActivationSwitch({ rule, disabled, t, onChange }: { rule: RuleCatalog; disabled: boolean; t: (key: string) => string; onChange: (active: boolean) => void; }) {
  const lockedOff = rule.activationLocked;
  return (
    <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <Switch checked={rule.activeFlag} disabled={disabled || lockedOff} onCheckedChange={onChange} aria-label={`${t('ruleActivation')} ${rule.ruleId}`} />
      <span className="whitespace-nowrap text-xs text-muted-foreground">{lockedOff ? t('ruleActivationLocked') : rule.activeFlag ? t('active') : t('inactive')}</span>
    </div>
  );
}

function RuleDetailPanel({ rule, recentHits, hitsLoading, language, saving, t, onActiveChange }: { rule: RuleCatalog | null; recentHits: RuleRecentHit[]; hitsLoading: boolean; language: Language; saving: boolean; t: (key: string) => string; onActiveChange: (rule: RuleCatalog, active: boolean) => void; }) {
  if (!rule) {
    return <Card className="rounded-lg"><CardContent className="p-6"><EmptyState title={t('ruleDetail')} description={t('ruleDetailEmpty')} /></CardContent></Card>;
  }

  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-3">
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
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{rule.ruleCategory}</Badge>
          <RuleSeverityBadge severity={rule.severityDefault} />
          <Badge variant="outline">{rule.applicability}</Badge>
        </div>
        <RuleDetailSection title={t('ruleDescription')} text={localizedRuleText(rule.descriptionZh, rule.descriptionEn, language)} />
        <RuleDetailSection title={t('ruleTriggerSummary')} text={localizedRuleText(rule.triggerSummaryZh, rule.triggerSummaryEn, language)} />
        <RuleDetailSection title={t('ruleHandlingMethod')} text={localizedRuleText(rule.handlingMethodZh, rule.handlingMethodEn, language)} />
        <RuleDetailSection title={t('ruleSourceRuleIds')} text={ruleSourceIdsText(rule)} />
        <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-background p-3">
          <RuleDetailFact label={t('ruleExceptionAllowed')} value={rule.exceptionAllowed ? t('yes') : t('no')} />
          <RuleDetailFact label={t('ruleVersionStatus')} value={rule.versionStatus} />
          <RuleDetailFact label={t('ruleEntryType')} value={rule.catalogEntryType} />
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
      </CardContent>
    </Card>
  );
}

function RuleDetailSection({ title, text }: { title: string; text: string }) {
  return <div><div className="font-medium">{title}</div><p className="mt-1 text-muted-foreground">{text || '-'}</p></div>;
}

function RuleDetailFact({ label, value, children }: { label: string; value: string; children?: ReactNode; }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-medium">{children ?? value}</div></div>;
}

function RuleSeverityBadge({ severity }: { severity: string }) {
  if (severity === 'BLOCK' || severity === 'NON_COMPLIANT') return <Badge variant="destructive">{severity}</Badge>;
  if (severity === 'WARNING' || severity === 'ALERT') return <Badge variant="outline" className="border-warning text-warning">{severity}</Badge>;
  return <Badge variant="outline">{severity}</Badge>;
}

function RuleVersionStatusBadge({ status, active }: { status: string; active: boolean }) {
  if (active && status === 'ACTIVE') return <Badge className="bg-success text-white">ACTIVE</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function RuleEntryTypeBadge({ entryType }: { entryType: string }) {
  if (entryType === 'DISPLAY_RULE') return <Badge className="bg-primary text-primary-foreground">DISPLAY_RULE</Badge>;
  if (entryType === 'SYSTEM_GATE') return <Badge variant="outline" className="border-warning text-warning">SYSTEM_GATE</Badge>;
  if (entryType === 'DERIVATION') return <Badge variant="outline">DERIVATION</Badge>;
  return <Badge variant="outline">{entryType}</Badge>;
}

function ruleTitle(rule: RuleCatalog, language: Language) {
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
  if (hit.taskId || hit.timelineBlockId) return '/rostering-workbench/draft-versions';
  if (hit.crewId) return '/rostering-workbench/crew-view';
  return '/rostering-workbench/draft-versions';
}

function compareRuleSeverity(left: RuleCatalog, right: RuleCatalog) {
  const severityDiff = severityRank(left.severityDefault) - severityRank(right.severityDefault);
  if (severityDiff !== 0) return severityDiff;
  return left.ruleId.localeCompare(right.ruleId);
}

function severityRank(severity: string) {
  const ranks: Record<string, number> = { BLOCK: 0, NON_COMPLIANT: 1, WARNING: 2, ALERT: 3, INFO: 4 };
  return ranks[severity] ?? 99;
}

function uniqueRuleValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}
