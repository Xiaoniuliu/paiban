import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import type { ArchiveCaseDetail, CrewArchiveForm, DisplayTimezone, SaveCrewArchiveFormRequest } from '../../types';
import { displayDateTimeLocalToUtcIso, toDisplayDateTimeLocal } from '../../lib/time';
import { useTimeFormatter } from '../../lib/TimeDisplayContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Timestamp, TimeRange, TimezoneBadge } from '../time';

interface ArchiveDrawerProps {
  detail: ArchiveCaseDetail;
  saving: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onSave: (formId: number, payload: SaveCrewArchiveFormRequest) => Promise<void>;
}

interface ArchiveFormState {
  actualDutyStart: string;
  actualDutyEnd: string;
  actualFdpStart: string;
  actualFdpEnd: string;
  flyingHourMinutes: string;
  noFlyingHourFlag: boolean;
}

export function ArchiveDrawer({ detail, saving, t, onClose, onSave }: ArchiveDrawerProps) {
  const { timezone } = useTimeFormatter();
  const [selectedFormId, setSelectedFormId] = useState(() => initialForm(detail.crewForms)?.id ?? 0);
  const selectedForm = detail.crewForms.find((form) => form.id === selectedFormId) ?? detail.crewForms[0];
  const [formState, setFormState] = useState<ArchiveFormState>(() => buildFormState(detail, selectedForm, timezone));
  const [error, setError] = useState('');

  useEffect(() => {
    const nextForm = detail.crewForms.find((form) => form.id === selectedFormId) ?? initialForm(detail.crewForms);
    if (nextForm) {
      setSelectedFormId(nextForm.id);
      setFormState(buildFormState(detail, nextForm, timezone));
      setError('');
    }
  }, [detail, selectedFormId, timezone]);

  const canEdit = Boolean(selectedForm?.canEdit && detail.archiveCase.canEditArchive);
  const saveDisabled = saving || !canEdit || !selectedForm;
  const currentDisplayPreview = useMemo(() => {
    if (!selectedForm) return null;
    const preview = {
      dutyStartUtc: safeToUtc(formState.actualDutyStart, timezone),
      dutyEndUtc: safeToUtc(formState.actualDutyEnd, timezone),
      fdpStartUtc: safeToUtc(formState.actualFdpStart, timezone),
      fdpEndUtc: safeToUtc(formState.actualFdpEnd, timezone),
    };
    return Object.values(preview).every(Boolean) ? preview : null;
  }, [formState, selectedForm, timezone]);

  const handleSave = async () => {
    if (!selectedForm) return;
    try {
      const payload: SaveCrewArchiveFormRequest = {
        expectedRevision: selectedForm.revision,
        actualDutyStartUtc: displayDateTimeLocalToUtcIso(formState.actualDutyStart, timezone),
        actualDutyEndUtc: displayDateTimeLocalToUtcIso(formState.actualDutyEnd, timezone),
        actualFdpStartUtc: displayDateTimeLocalToUtcIso(formState.actualFdpStart, timezone),
        actualFdpEndUtc: displayDateTimeLocalToUtcIso(formState.actualFdpEnd, timezone),
        flyingHourMinutes: formState.noFlyingHourFlag ? null : Number(formState.flyingHourMinutes),
        noFlyingHourFlag: formState.noFlyingHourFlag,
      };
      setError('');
      await onSave(selectedForm.id, payload);
    } catch {
      setError(t('archiveFormSaveError'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" data-testid="archive-drawer">
      <aside className="flex h-full w-full max-w-[720px] flex-col bg-card shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <div className="text-lg font-semibold">{t('archiveDrawerTitle')}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {detail.archiveCase.taskCode} · {detail.archiveCase.route}
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t('closeArchiveDrawer')}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden md:grid-cols-[260px_1fr]">
          <section className="border-b border-border p-4 md:border-b-0 md:border-r">
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t('archiveStatus')}</span>
                  <Badge data-testid="archive-case-status">{t(`archiveStatus${detail.archiveCase.archiveStatus}`)}</Badge>
                </div>
                <div className="mt-2 text-muted-foreground">
                  <TimeRange start={detail.archiveCase.scheduledStartUtc} end={detail.archiveCase.scheduledEndUtc} />
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-muted-foreground">{t('archiveDeadline')}</div>
                <div className="mt-1 font-medium">
                  <Timestamp value={detail.archiveCase.archiveDeadlineAtUtc} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-muted-foreground">{t('archiveCrewSummary')}</span>
                <span className="font-medium">
                  {detail.archiveCase.completedCount}/{detail.archiveCase.totalCount}
                </span>
              </div>
              <div className="space-y-2">
                <div className="font-medium">{t('archiveCrewForms')}</div>
                {detail.crewForms.map((form) => (
                  <button
                    key={form.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm ${
                      selectedForm?.id === form.id ? 'border-primary bg-primary/5' : 'border-border bg-background'
                    }`}
                    data-testid={`archive-crew-row-${form.crewId}`}
                    onClick={() => {
                      setSelectedFormId(form.id);
                      setFormState(buildFormState(detail, form, timezone));
                      setError('');
                    }}
                  >
                    <span>
                      <span className="block font-medium">{form.crewCode}</span>
                      <span className="text-muted-foreground">{form.crewName}</span>
                    </span>
                    <Badge variant="outline">{t(`archiveFormStatus${form.formStatus}`)}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto p-5">
            {selectedForm && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{t('archiveFormTitle')}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {selectedForm.crewCode} · {selectedForm.crewName}
                    </div>
                  </div>
                  <TimezoneBadge>{t('archiveInputTimezone')}: {timezone}</TimezoneBadge>
                </div>

                {!canEdit && (
                  <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    {t('archiveReadOnly')}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ArchiveDateTimeInput
                    id="archive-form-duty-start"
                    label={t('actualDutyStart')}
                    value={formState.actualDutyStart}
                    disabled={!canEdit}
                    onChange={(event) => setFormState((current) => ({ ...current, actualDutyStart: event.target.value }))}
                  />
                  <ArchiveDateTimeInput
                    id="archive-form-duty-end"
                    label={t('actualDutyEnd')}
                    value={formState.actualDutyEnd}
                    disabled={!canEdit}
                    onChange={(event) => setFormState((current) => ({ ...current, actualDutyEnd: event.target.value }))}
                  />
                  <ArchiveDateTimeInput
                    id="archive-form-fdp-start"
                    label={t('actualFdpStart')}
                    value={formState.actualFdpStart}
                    disabled={!canEdit}
                    onChange={(event) => setFormState((current) => ({ ...current, actualFdpStart: event.target.value }))}
                  />
                  <ArchiveDateTimeInput
                    id="archive-form-fdp-end"
                    label={t('actualFdpEnd')}
                    value={formState.actualFdpEnd}
                    disabled={!canEdit}
                    onChange={(event) => setFormState((current) => ({ ...current, actualFdpEnd: event.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium">
                    <span>{t('flyingHourMinutes')}</span>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      data-testid="archive-form-flying-hour"
                      type="number"
                      min="0"
                      value={formState.flyingHourMinutes}
                      disabled={!canEdit || formState.noFlyingHourFlag}
                      onChange={(event) => setFormState((current) => ({ ...current, flyingHourMinutes: event.target.value }))}
                    />
                  </label>
                  <label className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                    <input
                      data-testid="archive-form-no-flying-hour"
                      type="checkbox"
                      checked={formState.noFlyingHourFlag}
                      disabled={!canEdit}
                      onChange={(event) => setFormState((current) => ({ ...current, noFlyingHourFlag: event.target.checked }))}
                    />
                    <span>{t('noFlyingHourFlag')}</span>
                  </label>
                </div>

                {currentDisplayPreview && (
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {t('archiveUtcConfirmation')}
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div>{t('actualDutyStart')}: {currentDisplayPreview.dutyStartUtc}</div>
                      <div>{t('actualDutyEnd')}: {currentDisplayPreview.dutyEndUtc}</div>
                      <div>{t('actualFdpStart')}: {currentDisplayPreview.fdpStartUtc}</div>
                      <div>{t('actualFdpEnd')}: {currentDisplayPreview.fdpEndUtc}</div>
                    </div>
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="mb-2 font-medium">{t('archiveCurrentDisplayConfirmation')}</div>
                      <div className="space-y-1 text-muted-foreground">
                        <div>{t('actualDutyStart')}: <Timestamp value={currentDisplayPreview.dutyStartUtc} /></div>
                        <div>{t('actualDutyEnd')}: <Timestamp value={currentDisplayPreview.dutyEndUtc} /></div>
                        <div>{t('actualFdpStart')}: <Timestamp value={currentDisplayPreview.fdpStartUtc} /></div>
                        <div>{t('actualFdpEnd')}: <Timestamp value={currentDisplayPreview.fdpEndUtc} /></div>
                      </div>
                    </div>
                  </div>
                )}

                {error && <div className="text-sm text-destructive">{error}</div>}

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>{t('closeArchiveDrawer')}</Button>
                  <Button type="button" data-testid="archive-form-save" disabled={saveDisabled} onClick={handleSave}>
                    {saving ? t('loading') : t('saveArchiveForm')}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function ArchiveDateTimeInput({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="space-y-1 text-sm font-medium">
      <span>{label}</span>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        data-testid={id}
        type="datetime-local"
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    </label>
  );
}

function initialForm(forms: CrewArchiveForm[]) {
  return forms.find((form) => form.formStatus === 'NotStarted') ?? forms[0];
}

function buildFormState(detail: ArchiveCaseDetail, form: CrewArchiveForm | undefined, timezone: DisplayTimezone): ArchiveFormState {
  return {
    actualDutyStart: toDisplayDateTimeLocal(form?.actualDutyStartUtc ?? detail.archiveCase.scheduledStartUtc, timezone),
    actualDutyEnd: toDisplayDateTimeLocal(form?.actualDutyEndUtc ?? detail.archiveCase.scheduledEndUtc, timezone),
    actualFdpStart: toDisplayDateTimeLocal(form?.actualFdpStartUtc ?? detail.archiveCase.scheduledStartUtc, timezone),
    actualFdpEnd: toDisplayDateTimeLocal(form?.actualFdpEndUtc ?? detail.archiveCase.scheduledEndUtc, timezone),
    flyingHourMinutes: form?.flyingHourMinutes == null ? '' : String(form.flyingHourMinutes),
    noFlyingHourFlag: Boolean(form?.noFlyingHourFlag),
  };
}

function safeToUtc(value: string, timezone: DisplayTimezone) {
  try {
    return displayDateTimeLocalToUtcIso(value, timezone);
  } catch {
    return '';
  }
}
