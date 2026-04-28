import { useState } from 'react';
import type { ComponentType } from 'react';
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Plane,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { viewTitleKey } from '../i18n';
import { nowUtc } from '../lib/time';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { DataTableShell, EmptyState, FilterBar, PageHeader } from '../components/framework/PageShell';
import { Timestamp } from '../components/time';
import OldDashboard from '../components/Dashboard';
import OldScheduleGantt from '../components/ScheduleGantt';
import OldComplianceCheck from '../components/ComplianceCheck';
import type { PageProps } from './pageTypes';

export function DashboardPage({ activeView, user, t }: PageProps) {
  const stats = [
    { label: t('menu-task-plan'), value: '1', icon: CalendarDays, tone: 'text-primary' },
    { label: t('validation-rule-hits'), value: '2', icon: AlertTriangle, tone: 'text-warning' },
    { label: t('exception-requests'), value: '0', icon: FileCheck2, tone: 'text-success' },
    { label: t('reports-archive'), value: '0', icon: Archive, tone: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className="mt-2 text-3xl font-semibold">{stat.value}</div>
                </div>
                <Icon className={`h-7 w-7 ${stat.tone}`} />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="rounded-lg xl:col-span-2">
          <CardHeader>
            <CardTitle>{t(viewTitleKey[activeView])}</CardTitle>
            <CardDescription><Timestamp value={nowUtc()} /></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                t('taskPlanDescription'),
                t('workbenchDescription'),
                t('validationDescription'),
                t('exceptionsDescription'),
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{user.displayName}</CardTitle>
            <CardDescription>{t('role')}: {user.role}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('currentSystemTime')}</span>
              <Timestamp value={nowUtc()} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('language')}</span>
              <span>{t('appName')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ValidationCenterPage({ activeView, t }: PageProps) {
  return (
    <StandardPlaceholderPage
      icon={ShieldCheck}
      title={t(viewTitleKey[activeView])}
      description={t('validationDescription')}
      t={t}
    />
  );
}

export function ExceptionsCdrPage({ activeView, t }: PageProps) {
  return (
    <StandardPlaceholderPage
      icon={FileCheck2}
      title={t(viewTitleKey[activeView])}
      description={t('exceptionsDescription')}
      t={t}
    />
  );
}

export function ReportsPage({ activeView, t }: PageProps) {
  return (
    <StandardPlaceholderPage
      icon={FileCheck2}
      title={t(viewTitleKey[activeView])}
      description={t('reportsDescription')}
      t={t}
    />
  );
}

export function AdminPage({ activeView, t }: PageProps) {
  return (
    <StandardPlaceholderPage
      icon={Users}
      title={t(viewTitleKey[activeView])}
      description={t('adminDescription')}
      t={t}
    />
  );
}

export function PilotPortalPage({ activeView, user, t }: PageProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{t(viewTitleKey[activeView])}</CardTitle>
        <CardDescription>{user.displayName}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: Plane, title: t('myRoster'), text: t('publishedRosterAndRest') },
          { icon: AlertTriangle, title: t('myAlerts'), text: t('alertsAndNotices') },
          { icon: UserRound, title: t('statusReport'), text: t('fatigueUnfitConflict') },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-lg border border-border bg-background p-4">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <div className="font-medium">{item.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          );
        })}
        <div className="text-sm text-muted-foreground md:col-span-3"><Timestamp value={nowUtc()} /></div>
      </CardContent>
    </Card>
  );
}

export function LegacyReferencePage({ t }: { t: (key: string) => string }) {
  const [tab, setTab] = useState<'dashboard' | 'gantt' | 'compliance'>('dashboard');
  return (
    <div className="space-y-4">
      <Card className="rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{t('legacy')}</div>
            <p className="text-sm text-muted-foreground">{t('visualReferenceOnly')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant={tab === 'dashboard' ? 'default' : 'outline'} size="sm" onClick={() => setTab('dashboard')}>Dashboard</Button>
            <Button variant={tab === 'gantt' ? 'default' : 'outline'} size="sm" onClick={() => setTab('gantt')}>Gantt</Button>
            <Button variant={tab === 'compliance' ? 'default' : 'outline'} size="sm" onClick={() => setTab('compliance')}>Compliance</Button>
          </div>
        </div>
      </Card>
      {tab === 'dashboard' && <OldDashboard />}
      {tab === 'gantt' && <OldScheduleGantt />}
      {tab === 'compliance' && <OldComplianceCheck />}
    </div>
  );
}

export function AccessDeniedPage({ t }: PageProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{t('accessDenied')}</CardTitle>
        <CardDescription>{t('accessDeniedDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState title={t('accessDenied')} description={t('accessDeniedDescription')} />
      </CardContent>
    </Card>
  );
}

function StandardPlaceholderPage({
  icon: Icon,
  title,
  description,
  t,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        icon={Icon}
        title={title}
        description={description}
        actionLabel={t('refresh')}
      />
      <FilterBar t={t} />
      <DataTableShell
        columns={[t('status'), t('currentSystemTime')]}
        rows={[]}
        emptyState={(
          <EmptyState
            title={t('frameworkPlaceholderTitle')}
            description={<>{t('frameworkPlaceholder')} <Timestamp value={nowUtc()} /></>}
          />
        )}
      />
    </div>
  );
}
