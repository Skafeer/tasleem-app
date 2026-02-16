import { I18nManager } from 'react-native';

/**
 * دالة للتحقق من كون التطبيق بوضع RTL
 */
export const isRTL = (): boolean => {
  return I18nManager.isRTL;
};

/**
 * دالة لتطبيق اتجاه على الأنماط
 */
export const getDirectionalStyle = (
  ltrValue: any,
  rtlValue: any
): any => {
  return I18nManager.isRTL ? rtlValue : ltrValue;
};

/**
 * دالة لتحويل الهامش بناءً على الاتجاه
 */
export const getHorizontalPadding = (left: number, right: number) => {
  return I18nManager.isRTL ? { paddingRight: left, paddingLeft: right } : { paddingLeft: left, paddingRight: right };
};

export const getHorizontalMargin = (left: number, right: number) => {
  return I18nManager.isRTL ? { marginRight: left, marginLeft: right } : { marginLeft: left, marginRight: right };
};

/**
 * تطبيق RTL بشكل كامل
 */
export const setupRTL = () => {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
};
