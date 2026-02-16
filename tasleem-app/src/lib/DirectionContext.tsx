import React, { ReactNode } from 'react';
import { I18nManager } from 'react-native';

type DirectionContextType = {
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
};

const DirectionContext = React.createContext<DirectionContextType | undefined>(undefined);

export const DirectionProvider = ({ children }: { children: ReactNode }) => {
  const value: DirectionContextType = {
    isRTL: I18nManager.isRTL,
    direction: I18nManager.isRTL ? 'rtl' : 'ltr',
  };

  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
};

export const useDirection = (): DirectionContextType => {
  const context = React.useContext(DirectionContext);
  if (!context) {
    return { isRTL: I18nManager.isRTL, direction: I18nManager.isRTL ? 'rtl' : 'ltr' };
  }
  return context;
};
