import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../../../lib/api';
import { apiErrorMessage } from '../../../lib/apiErrors';
import type { DraftRosteringTask } from '../../../types';

export function useDraftRosteringTasks(api: ApiClient, t: (key: string) => string) {
  const [tasks, setTasks] = useState<DraftRosteringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshSequenceRef = useRef(0);

  const refresh = useCallback(() => {
    const requestSequence = refreshSequenceRef.current + 1;
    refreshSequenceRef.current = requestSequence;
    setLoading(true);
    setError('');
    api.draftRosteringTasks()
      .then((response) => {
        if (refreshSequenceRef.current === requestSequence) {
          setTasks(response.tasks);
        }
      })
      .catch((nextError: unknown) => {
        if (refreshSequenceRef.current === requestSequence) {
          setError(apiErrorMessage(nextError, t('draftRosteringLoadError')));
        }
      })
      .finally(() => {
        if (refreshSequenceRef.current === requestSequence) {
          setLoading(false);
        }
      });
  }, [api, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tasks, loading, error, refresh };
}
