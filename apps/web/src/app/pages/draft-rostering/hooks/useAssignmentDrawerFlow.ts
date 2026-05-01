import { useCallback, useRef, useState } from 'react';
import type { ApiClient } from '../../../lib/api';
import { apiErrorMessage } from '../../../lib/apiErrors';
import type { AssignmentTaskDetail, SaveAssignmentDraftRequest } from '../../../types';

export function useAssignmentDrawerFlow(
  api: ApiClient,
  t: (key: string) => string,
  refreshTasks: () => void,
) {
  const [detail, setDetail] = useState<AssignmentTaskDetail | null>(null);
  const [openError, setOpenError] = useState('');
  const [drawerError, setDrawerError] = useState('');
  const [saving, setSaving] = useState(false);
  const detailRef = useRef<AssignmentTaskDetail | null>(null);
  const openSequenceRef = useRef(0);
  const mutationSequenceRef = useRef(0);

  const setCurrentDetail = useCallback((nextDetail: AssignmentTaskDetail | null) => {
    detailRef.current = nextDetail;
    setDetail(nextDetail);
  }, []);

  const isCurrentMutation = useCallback((operationToken: number, taskId: number) => (
    mutationSequenceRef.current === operationToken && detailRef.current?.task.id === taskId
  ), []);

  const openAssignment = useCallback((taskId: number) => {
    const requestSequence = openSequenceRef.current + 1;
    openSequenceRef.current = requestSequence;
    mutationSequenceRef.current += 1;
    setOpenError('');
    setDrawerError('');
    setSaving(false);
    api.assignmentTask(taskId)
      .then((nextDetail) => {
        if (openSequenceRef.current === requestSequence) {
          setCurrentDetail(nextDetail);
        }
      })
      .catch((nextError: unknown) => {
        if (openSequenceRef.current === requestSequence) {
          setOpenError(apiErrorMessage(nextError, t('assignmentLoadError')));
        }
      });
  }, [api, setCurrentDetail, t]);

  const closeAssignment = useCallback(() => {
    openSequenceRef.current += 1;
    mutationSequenceRef.current += 1;
    setCurrentDetail(null);
    setOpenError('');
    setDrawerError('');
    setSaving(false);
  }, [setCurrentDetail]);

  const saveAssignmentDraft = useCallback(async (payload: SaveAssignmentDraftRequest) => {
    if (!detail) return;
    const taskId = detail.task.id;
    const operationToken = mutationSequenceRef.current + 1;
    mutationSequenceRef.current = operationToken;
    setSaving(true);
    setDrawerError('');
    try {
      await api.saveAssignmentDraft(taskId, payload);
      if (isCurrentMutation(operationToken, taskId)) {
        setSaving(false);
        setCurrentDetail(null);
        setOpenError('');
        setDrawerError('');
        refreshTasks();
      }
    } catch (nextError: unknown) {
      if (isCurrentMutation(operationToken, taskId)) {
        setDrawerError(apiErrorMessage(nextError, t('assignmentSaveError')));
      }
    } finally {
      if (isCurrentMutation(operationToken, taskId)) {
        setSaving(false);
      }
    }
  }, [api, detail, isCurrentMutation, refreshTasks, setCurrentDetail, t]);

  const clearAssignmentDraft = useCallback(async () => {
    if (!detail) return;
    const taskId = detail.task.id;
    const operationToken = mutationSequenceRef.current + 1;
    mutationSequenceRef.current = operationToken;
    setSaving(true);
    setDrawerError('');
    try {
      await api.clearAssignmentDraft(taskId);
      if (isCurrentMutation(operationToken, taskId)) {
        setSaving(false);
        setCurrentDetail(null);
        setOpenError('');
        setDrawerError('');
        refreshTasks();
      }
    } catch (nextError: unknown) {
      if (isCurrentMutation(operationToken, taskId)) {
        setDrawerError(apiErrorMessage(nextError, t('assignmentClearDraftError')));
      }
    } finally {
      if (isCurrentMutation(operationToken, taskId)) {
        setSaving(false);
      }
    }
  }, [api, detail, isCurrentMutation, refreshTasks, setCurrentDetail, t]);

  return {
    detail,
    openError,
    drawerError,
    saving,
    openAssignment,
    closeAssignment,
    saveAssignmentDraft,
    clearAssignmentDraft,
  };
}
