import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * يفتح معرض الصور ويضغط الصورة قبل الإرجاع
 * @param options خيارات اختيارية
 * @returns base64 string أو null
 */
export async function pickAndCompressImage(options?: {
  maxWidth?: number;   // الحد الأقصى للعرض (افتراضي: 1024)
  quality?: number;    // جودة الضغط 0-1 (افتراضي: 0.6)
  multiple?: boolean;  // اختيار متعدد
  limit?: number;      // الحد الأقصى للصور المتعددة
}): Promise<string | string[] | null> {
  const { maxWidth = 1024, quality = 0.6, multiple = false, limit = 1 } = options || {};

  // طلب الصلاحية
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  // اختيار الصورة
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? limit : 1,
    base64: false, // نضغط بعدين
    quality: 1,    // نجيب الأصلية ونضغطها نحن
  });

  if (result.canceled || !result.assets.length) return null;

  // ضغط كل صورة
  const compress = async (uri: string): Promise<string> => {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return `data:image/jpeg;base64,${manipulated.base64}`;
  };

  if (multiple) {
    const results = await Promise.all(result.assets.map(a => compress(a.uri)));
    return results;
  }

  return compress(result.assets[0].uri);
}

/**
 * ضغط صورة من URI مباشرة
 */
export async function compressImage(uri: string, options?: {
  maxWidth?: number;
  quality?: number;
}): Promise<string> {
  const { maxWidth = 1024, quality = 0.6 } = options || {};
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return `data:image/jpeg;base64,${manipulated.base64}`;
}
