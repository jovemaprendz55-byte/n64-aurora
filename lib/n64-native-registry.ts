export type ExpoNativeModules = {
  NativeUnimoduleProxy?: {
    viewManagersMetadata?: Record<string, unknown>;
  };
};

/**
 * Expo Modules registra views pelo adaptador ViewManagerAdapter_<módulo>.
 * A fonte confiável de descoberta é o metadado do NativeUnimoduleProxy,
 * não UIManager.getViewManagerConfig com o nome do módulo.
 */
export function hasExpoViewManager(nativeModules: ExpoNativeModules, moduleName: string): boolean {
  return Boolean(nativeModules.NativeUnimoduleProxy?.viewManagersMetadata?.[moduleName]);
}
