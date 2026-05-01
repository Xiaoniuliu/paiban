import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { AssignmentRole, AssignmentTaskDetail, SaveAssignmentDraftRequest } from '../../types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Timestamp, TimeRange } from '../time';

interface AssignmentDrawerProps {
  detail: AssignmentTaskDetail;
  saving: boolean;
  error: string;
  t: (key: string) => string;
  onClose: () => void;
  onSave: (payload: SaveAssignmentDraftRequest) => Promise<void>;
  onClearDraft: () => Promise<void>;
}

type AdditionalAssignmentRole = Extract<AssignmentRole, 'RELIEF' | 'EXTRA'>;

interface AdditionalCrewRow {
  key: string;
  crewId: string;
  assignmentRole: AdditionalAssignmentRole;
}

export function AssignmentDrawer({
  detail,
  saving,
  error,
  t,
  onClose,
  onSave,
  onClearDraft,
}: AssignmentDrawerProps) {
  const [picCrewId, setPicCrewId] = useState(() => String(detail.selectedPicCrewId ?? ''));
  const [foCrewId, setFoCrewId] = useState(() => String(detail.selectedFoCrewId ?? ''));
  const [additionalAssignments, setAdditionalAssignments] = useState<AdditionalCrewRow[]>(() => initialAdditionalAssignments(detail));

  useEffect(() => {
    setPicCrewId(String(detail.selectedPicCrewId ?? ''));
    setFoCrewId(String(detail.selectedFoCrewId ?? ''));
    setAdditionalAssignments(initialAdditionalAssignments(detail));
  }, [detail]);

  const selectedPic = useMemo(() => (
    detail.picCandidates.find((candidate) => candidate.id === Number(picCrewId))
  ), [detail.picCandidates, picCrewId]);
  const selectedFo = useMemo(() => (
    detail.foCandidates.find((candidate) => candidate.id === Number(foCrewId))
  ), [detail.foCandidates, foCrewId]);
  const selectedAdditionalCandidates = useMemo(() => (
    additionalAssignments
      .map((assignment) => detail.additionalCandidates.find((candidate) => candidate.id === Number(assignment.crewId)))
      .filter((candidate): candidate is AssignmentTaskDetail['additionalCandidates'][number] => Boolean(candidate))
  ), [additionalAssignments, detail.additionalCandidates]);
  const assignedCrewIds = [
    picCrewId,
    foCrewId,
    ...additionalAssignments.map((assignment) => assignment.crewId),
  ].filter(Boolean);
  const hasDuplicateCrew = new Set(assignedCrewIds).size !== assignedCrewIds.length;
  const hasIncompleteAdditional = additionalAssignments.some((assignment) => assignment.crewId === '');
  const hasIneligibleCrew = [selectedPic, selectedFo, ...selectedAdditionalCandidates]
    .some((candidate) => candidate && !candidate.eligibleForAssignment);
  const canSave = detail.canEdit
    && picCrewId !== ''
    && foCrewId !== ''
    && !hasDuplicateCrew
    && !hasIncompleteAdditional
    && !hasIneligibleCrew
    && !saving;

  const addAdditionalCrew = () => {
    setAdditionalAssignments((current) => [
      ...current,
      { key: crypto.randomUUID(), crewId: '', assignmentRole: 'RELIEF' },
    ]);
  };

  const updateAdditionalCrew = (key: string, patch: Partial<AdditionalCrewRow>) => {
    setAdditionalAssignments((current) => current.map((assignment) => (
      assignment.key === key ? { ...assignment, ...patch } : assignment
    )));
  };

  const removeAdditionalCrew = (key: string) => {
    setAdditionalAssignments((current) => current.filter((assignment) => assignment.key !== key));
  };

  const save = async () => {
    if (!canSave) return;
    await onSave({
      picCrewId: Number(picCrewId),
      foCrewId: Number(foCrewId),
      additionalAssignments: additionalAssignments.map((assignment) => ({
        crewId: Number(assignment.crewId),
        assignmentRole: assignment.assignmentRole,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" data-testid="assignment-drawer">
      <aside className="flex h-full w-full max-w-[720px] flex-col bg-card shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <div className="text-lg font-semibold">{t('assignmentDrawerTitle')}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {detail.task.taskCode} · {routeLabel(detail.task)}
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
                  <span className="text-muted-foreground">{t('status')}</span>
                  <Badge variant="outline">{taskStatusLabel(detail.task.status, t)}</Badge>
                </div>
                <div className="mt-2 text-muted-foreground">
                  <TimeRange start={detail.task.scheduledStartUtc} end={detail.task.scheduledEndUtc} />
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-muted-foreground">{t('assignmentCurrent')}</div>
                <div className="mt-2 space-y-2">
                  <AssignmentCrewLine label={t('assignmentPic')} value={selectedPic ? crewLabel(selectedPic) : t('assignmentSelectPlaceholder')} />
                  <AssignmentCrewLine label={t('assignmentFo')} value={selectedFo ? crewLabel(selectedFo) : t('assignmentSelectPlaceholder')} />
                  {additionalAssignments.map((assignment) => {
                    const candidate = detail.additionalCandidates.find((item) => item.id === Number(assignment.crewId));
                    return (
                      <AssignmentCrewLine
                        key={assignment.key}
                        label={assignmentRoleLabel(assignment.assignmentRole, t)}
                        value={candidate ? crewLabel(candidate) : t('assignmentSelectPlaceholder')}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-muted-foreground">{t('taskPool')}</div>
                <div className="mt-1 font-medium">{detail.task.taskType}</div>
                <div className="mt-1 text-muted-foreground">{detail.task.sectorCount} {t('sectors')}</div>
              </div>
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto p-5">
            <div className="space-y-5">
              <div>
                <div className="text-base font-semibold">{t('assignmentCandidates')}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t('assignmentDrawerDescription')}</p>
              </div>

              {!detail.canEdit && (
                <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  {t('assignmentCannotEdit')} {assignmentReadOnlyReason(detail.readOnlyReason, t)}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <AssignmentSelect
                  id="assignment-pic-select"
                  label={t('assignmentPic')}
                  value={picCrewId}
                  disabled={!detail.canEdit}
                  placeholder={t('assignmentSelectPlaceholder')}
                  candidates={detail.picCandidates}
                  t={t}
                  onChange={setPicCrewId}
                />
                <AssignmentSelect
                  id="assignment-fo-select"
                  label={t('assignmentFo')}
                  value={foCrewId}
                  disabled={!detail.canEdit}
                  placeholder={t('assignmentSelectPlaceholder')}
                  candidates={detail.foCandidates}
                  t={t}
                  onChange={setFoCrewId}
                />
              </div>

              <div className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{t('assignmentAdditionalCrew')}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{t('assignmentDrawerDescription')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!detail.canEdit}
                    data-testid="assignment-additional-add"
                    onClick={addAdditionalCrew}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('assignmentAddCrew')}
                  </Button>
                </div>

                {additionalAssignments.length > 0 && (
                  <div className="space-y-2">
                    {additionalAssignments.map((assignment, index) => (
                      <div key={assignment.key} className="grid grid-cols-[120px_1fr_2.5rem] items-end gap-2">
                        <AssignmentRoleSelect
                          id={`assignment-additional-role-${index}`}
                          label={t('assignmentAdditionalRole')}
                          value={assignment.assignmentRole}
                          disabled={!detail.canEdit}
                          t={t}
                          onChange={(assignmentRole) => updateAdditionalCrew(assignment.key, { assignmentRole })}
                        />
                        <AssignmentSelect
                          id={`assignment-additional-crew-${index}`}
                          label={t('assignmentAdditionalCrew')}
                          value={assignment.crewId}
                          disabled={!detail.canEdit}
                          placeholder={t('assignmentSelectPlaceholder')}
                          candidates={detail.additionalCandidates}
                          t={t}
                          onChange={(crewId) => updateAdditionalCrew(assignment.key, { crewId })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={!detail.canEdit}
                          aria-label={t('assignmentRemoveCrew')}
                          onClick={() => removeAdditionalCrew(assignment.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {hasDuplicateCrew && (
                  <div className="text-sm text-destructive">{t('assignmentDuplicateCrew')}</div>
                )}
                {hasIneligibleCrew && (
                  <div className="text-sm text-destructive">{t('assignmentIneligibleCrewSelected')}</div>
                )}
              </div>

              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="mb-2 font-medium">{detail.task.taskCode}</div>
                <div className="grid grid-cols-1 gap-2 text-muted-foreground md:grid-cols-2">
                  <div>{t('route')}: {routeLabel(detail.task)}</div>
                  <div>{t('start')}: <Timestamp value={detail.task.scheduledStartUtc} /></div>
                  <div>{t('end')}: <Timestamp value={detail.task.scheduledEndUtc} /></div>
                  <div>{t('status')}: {taskStatusLabel(detail.task.status, t)}</div>
                </div>
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                {detail.canClearDraft && (
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="assignment-clear-draft"
                    disabled={saving}
                    onClick={() => {
                      void onClearDraft();
                    }}
                  >
                    {t('assignmentClearDraft')}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={onClose}>{t('closeArchiveDrawer')}</Button>
                <Button type="button" data-testid="assignment-save" disabled={!canSave} onClick={save}>
                  {saving ? t('loading') : t('assignmentSaveDraft')}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function AssignmentSelect({
  id,
  label,
  value,
  disabled,
  placeholder,
  candidates,
  t,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  placeholder: string;
  candidates: AssignmentTaskDetail['picCandidates'];
  t: (key: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm font-medium">
      <span>{label}</span>
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        data-testid={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id} disabled={!candidate.eligibleForAssignment}>
            {crewOptionLabel(candidate, t)}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssignmentRoleSelect({
  id,
  label,
  value,
  disabled,
  t,
  onChange,
}: {
  id: string;
  label: string;
  value: AdditionalAssignmentRole;
  disabled: boolean;
  t: (key: string) => string;
  onChange: (value: AdditionalAssignmentRole) => void;
}) {
  return (
    <label className="space-y-1 text-sm font-medium">
      <span>{label}</span>
      <select
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        data-testid={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as AdditionalAssignmentRole)}
      >
        {(['RELIEF', 'EXTRA'] as const).map((role) => (
          <option key={role} value={role}>{assignmentRoleLabel(role, t)}</option>
        ))}
      </select>
    </label>
  );
}

function AssignmentCrewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function crewLabel(candidate: AssignmentTaskDetail['picCandidates'][number]) {
  return `${candidate.crewCode} ${candidate.nameEn}`;
}

function crewOptionLabel(candidate: AssignmentTaskDetail['picCandidates'][number], t: (key: string) => string) {
  if (candidate.eligibleForAssignment) return crewLabel(candidate);
  const reasons = candidate.eligibilityReasonCodes.map((code) => eligibilityReasonLabel(code, t)).join(', ');
  return reasons ? `${crewLabel(candidate)} (${reasons})` : `${crewLabel(candidate)} (${t('assignmentIneligible')})`;
}

function eligibilityReasonLabel(code: string, t: (key: string) => string) {
  const key = `assignmentEligibility${code}`;
  const label = t(key);
  return label === key ? code : label;
}

function initialAdditionalAssignments(detail: AssignmentTaskDetail): AdditionalCrewRow[] {
  return detail.currentAssignments
    .filter((assignment) => assignment.assignmentRole === 'RELIEF' || assignment.assignmentRole === 'EXTRA')
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((assignment) => ({
      key: String(assignment.timelineBlockId ?? `${assignment.assignmentRole}-${assignment.crewId}`),
      crewId: String(assignment.crewId),
      assignmentRole: assignment.assignmentRole as AdditionalAssignmentRole,
    }));
}

function assignmentRoleLabel(role: AssignmentRole, t: (key: string) => string) {
  const key = `assignmentRole${role}`;
  const label = t(key);
  return label === key ? role : label;
}

function routeLabel(task: AssignmentTaskDetail['task']) {
  if (!task.departureAirport || !task.arrivalAirport) return '';
  return `${task.departureAirport}-${task.arrivalAirport}`;
}

function taskStatusLabel(status: string, t: (key: string) => string) {
  const key = `taskStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function assignmentReadOnlyReason(reason: string | null, t: (key: string) => string) {
  if (!reason) return '';
  const key = `assignmentReadOnlyReason${reason}`;
  const label = t(key);
  return label === key ? reason : label;
}
