import React from 'react';
import { View, Text, ViewProps, TextProps } from 'react-native';
import { I18nManager } from 'react-native';

/**
 * مكون View يدعم RTL
 */
export const RTLView = React.forwardRef<View, ViewProps>(
  ({ style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={style}
        {...props}
      />
    );
  }
);

RTLView.displayName = 'RTLView';

/**
 * مكون Text يدعم RTL
 */
export const RTLText = React.forwardRef<Text, TextProps>(
  ({ style, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        style={[
          { textAlign: I18nManager.isRTL ? 'right' : 'left' },
          style,
        ]}
        {...props}
      />
    );
  }
);

RTLText.displayName = 'RTLText';

/**
 * helper لاتجاه النص
 */
export const getTextAlignment = (isRTL: boolean) => ({
  textAlign: isRTL ? 'right' : 'left' as const,
});

/**
 * helper لاتجاه العناصر
 */
export const getFlexDirection = (isRTL: boolean) => ({
  flexDirection: isRTL ? 'row-reverse' : 'row' as const,
});
