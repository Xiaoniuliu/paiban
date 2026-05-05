import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { viewTitleKey } from '../i18n';
import type { Language, RuleCatalog, RuleRecentHit } from '../types';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { EmptyState, PageHeader } from '../components/framework/PageShell';
import { Timestamp } from '../components/time';
import type { PageProps } from './pageTypes';
import {
  compareRuleSeverity,
  hasRuleHits,
  isMandatoryRule,
  isExecutableRule,
  RuleControlCell,
  RuleDetailDrawer,
  RuleEntryTypeBadge,
  RuleFilterSelect,
  RuleSeverityBadge,
  ruleCenterDescription,
  ruleCenterListDescription,
  ruleCenterListTitle,
  ruleCenterMode,
  ruleCenterTitle,
  ruleLevel,
  ruleTitle,
  uniqueRuleValues,
} from './ruleCenterSupport';

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
  const [entryTypeFilter, setEntryTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [hitsLoading, setHitsLoading] = useState(false);
  const [savingRuleIds, setSavingRuleIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const pageMode = ruleCenterMode(activeView);

  useEffect(() => {
    setLoading(true);
    api.rules()
      .then((items) => {
        setRules(items);
      })
      .catch(() => setError(t('ruleCatalogLoadError')))
      .finally(() => setLoading(false));
  }, [api, t]);

  const scopeRules = useMemo(() => {
    if (pageMode === 'operational') return rules.filter(isExecutableRule);
    if (pageMode === 'hits') return rules.filter((rule) => isExecutableRule(rule) && hasRuleHits(rule));
    return rules;
  }, [pageMode, rules]);

  const categories = useMemo(() => uniqueRuleValues(scopeRules.map((rule) => rule.ruleCategory)), [scopeRules]);
  const severities = useMemo(() => uniqueRuleValues(scopeRules.map(ruleLevel)), [scopeRules]);
  const sections = useMemo(() => uniqueRuleValues(scopeRules.map((rule) => rule.sourceSection)), [scopeRules]);
  const clauses = useMemo(() => uniqueRuleValues(scopeRules.map((rule) => rule.sourceClause)), [scopeRules]);
  const statuses = useMemo(() => uniqueRuleValues(scopeRules.map((rule) => rule.versionStatus)), [scopeRules]);
  const entryTypes = useMemo(() => uniqueRuleValues(scopeRules.map((rule) => rule.catalogEntryType)), [scopeRules]);

  const filteredRules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return scopeRules.filter((rule) => {
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
        && (severityFilter === 'ALL' || ruleLevel(rule) === severityFilter)
        && (sectionFilter === 'ALL' || rule.sourceSection === sectionFilter)
        && (clauseFilter === 'ALL' || rule.sourceClause === clauseFilter)
        && (statusFilter === 'ALL' || rule.versionStatus === statusFilter)
        && (entryTypeFilter === 'ALL' || rule.catalogEntryType === entryTypeFilter);
    }).sort(compareRuleSeverity);
  }, [categoryFilter, clauseFilter, entryTypeFilter, language, query, scopeRules, sectionFilter, severityFilter, statusFilter]);

  const selectedRule = useMemo(() => (
    filteredRules.find((rule) => rule.ruleId === selectedRuleId) ?? null
  ), [filteredRules, selectedRuleId]);

  useEffect(() => {
    if (!selectedRule) {
      setRecentHits([]);
      setHitsLoading(false);
      return;
    }
    let ignoreResponse = false;
    const ruleId = selectedRule.ruleId;
    setRecentHits([]);
    setHitsLoading(true);
    api.ruleRecentHits(ruleId)
      .then((hits) => {
        if (!ignoreResponse) setRecentHits(hits);
      })
      .catch(() => {
        if (!ignoreResponse) setRecentHits([]);
      })
      .finally(() => {
        if (!ignoreResponse) setHitsLoading(false);
      });
    return () => {
      ignoreResponse = true;
    };
  }, [api, selectedRule]);

  const updateRuleActive = async (rule: RuleCatalog, active: boolean) => {
    if (isMandatoryRule(rule) && !active) {
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
        title={ruleCenterTitle(pageMode, t)}
        description={ruleCenterDescription(pageMode, t)}
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
        <>
          <Card className="rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{ruleCenterListTitle(pageMode, t)}</CardTitle>
              <CardDescription>{ruleCenterListDescription(pageMode, t)} {filteredRules.length}/{scopeRules.length}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">{t('ruleId')}</th>
                      <th className="px-4 py-3 font-medium">{t('name')}</th>
                      <th className="px-4 py-3 font-medium">{t('category')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleEntryType')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleApplicability')}</th>
                      <th className="px-4 py-3 font-medium">{t('severity')}</th>
                      <th className="px-4 py-3 font-medium">{t('source')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleControl')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleRecentHits')}</th>
                      <th className="px-4 py-3 font-medium">{t('ruleLatestHit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRules.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-6">
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
                            <td className="px-4 py-3"><RuleSeverityBadge severity={rule.severityDefault} level={ruleLevel(rule)} /></td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{rule.sourceSection} / {rule.sourceClause} / {t('page')} {rule.sourcePage}</td>
                            <td className="px-4 py-3">
                              <RuleControlCell rule={rule} disabled={savingRuleIds.includes(rule.ruleId)} t={t} onChange={(active) => updateRuleActive(rule, active)} />
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
          <RuleDetailDrawer rule={selectedRule} recentHits={recentHits} hitsLoading={hitsLoading} language={language} saving={selectedRule ? savingRuleIds.includes(selectedRule.ruleId) : false} t={t} onActiveChange={updateRuleActive} onClose={() => setSelectedRuleId(null)} />
        </>
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
