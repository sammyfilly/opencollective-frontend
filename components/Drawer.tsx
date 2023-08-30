import React, { createContext, useContext, useState } from 'react';
import MUIDrawer from '@mui/material/Drawer';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { useTwoFactorAuthenticationPrompt } from '../lib/two-factor-authentication/TwoFactorAuthenticationContext';
import { cn } from '../lib/utils';

import StyledRoundButton from './StyledRoundButton';

export const DrawerActionsContext = createContext(null);

export const useDrawerActionsContainer = () => useContext(DrawerActionsContext);

export function Drawer({
  open,
  onClose,
  children,
  className,
  showActionsContainer,
  showCloseButton = false,
  'data-cy': dataCy,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  showActionsContainer?: boolean;
  showCloseButton?: boolean;
  'data-cy'?: string;
  className?: string;
}) {
  const [drawerActionsContainer, setDrawerActionsContainer] = useState(null);
  const twoFactorPrompt = useTwoFactorAuthenticationPrompt();
  const disableEnforceFocus = Boolean(twoFactorPrompt?.isOpen);
  return (
    <DrawerActionsContext.Provider value={drawerActionsContainer}>
      <MUIDrawer anchor="right" open={open} onClose={onClose} disableEnforceFocus={disableEnforceFocus}>
        <div className={cn('flex h-full w-screen max-w-lg flex-col', className)} data-cy={dataCy}>
          <div className="flex flex-1 flex-col overflow-y-scroll">
            <div className="relative py-6">
              {showCloseButton && (
                <StyledRoundButton
                  className="absolute right-5 top-5"
                  size={36}
                  type="button"
                  isBorderless
                  onClick={onClose}
                >
                  <X size={20} aria-hidden="true" />
                </StyledRoundButton>
              )}

              <div className="px-4 sm:px-6">{children}</div>
            </div>
          </div>
          {showActionsContainer && (
            <div
              className="flex flex-shrink-0 flex-wrap justify-between gap-2 border-t p-4"
              ref={ref => setDrawerActionsContainer(ref)}
            />
          )}
        </div>
      </MUIDrawer>
    </DrawerActionsContext.Provider>
  );
}

export function DrawerActions(props: React.PropsWithChildren) {
  const drawerActionsContainer = useDrawerActionsContainer();

  if (!drawerActionsContainer) {
    return null;
  }

  return createPortal(props.children, drawerActionsContainer);
}

export function DrawerHeader({
  title,
  statusTag,
  onClose,
}: {
  title: React.ReactNode;
  statusTag?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <h3 className="mt-1 text-lg font-medium text-slate-900">{title}</h3>
      <div className="flex flex-col-reverse items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
        {statusTag}
        <StyledRoundButton size={36} type="button" isBorderless onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </StyledRoundButton>
      </div>
    </div>
  );
}
