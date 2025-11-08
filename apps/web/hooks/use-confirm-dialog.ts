// apps/web/hooks/use-confirm-dialog.ts
import { useState } from 'react';

export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<any>(null);

  const openDialog = (item: any) => {
    setData(item);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setData(null);
    setIsOpen(false);
  };

  return {
    isOpen,
    data,
    openDialog,
    closeDialog,
  };
};
