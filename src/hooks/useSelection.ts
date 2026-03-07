import { useState, useCallback, useMemo } from "react";

export function useSelection(allIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allIds));
  }, [allIds]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const count = selectedIds.size;
  const isAllSelected = allIds.length > 0 && count === allIds.length;
  const isIndeterminate = count > 0 && count < allIds.length;
  const ids = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      clear();
    } else {
      selectAll();
    }
  }, [isAllSelected, clear, selectAll]);

  return {
    selectedIds,
    toggle,
    selectAll,
    clear,
    isSelected,
    isAllSelected,
    isIndeterminate,
    count,
    ids,
    toggleAll,
  };
}
