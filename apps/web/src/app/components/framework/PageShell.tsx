import type { ElementType, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

export function PageHeader({
  icon: Icon,
  title,
  description,
  actionLabel,
}: {
  icon?: ElementType;
  title: string;
  description: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" />}
          <h2 className="truncate text-lg font-semibold">{title}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && (
        <Button size="sm" className="w-full sm:w-auto">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function FilterBar({ t }: { t: (key: string) => string }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder={t('searchPlaceholder')} />
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          {t('filter')}
        </Button>
      </CardContent>
    </Card>
  );
}

export function DataTableShell({
  columns,
  rows,
  emptyState,
}: {
  columns: string[];
  rows: ReactNode[][];
  emptyState: ReactNode;
}) {
  return (
    <Card className="rounded-lg">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-6">
                    {emptyState}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center">
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function DetailDrawer({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="hidden w-80 shrink-0 border-l border-border bg-card p-4 xl:block">
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription className="mt-2">{children}</CardDescription>
    </aside>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
}) {
  return (
    <Card className="rounded-lg border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm">{confirmLabel}</Button>
      </CardContent>
    </Card>
  );
}
