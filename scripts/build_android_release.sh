#!/usr/bin/env bash
set -Eeuo pipefail

readonly REQUIRED_NDK_VERSION="26.1.10909125"
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREPARE_ONLY=false

usage() {
  cat <<'EOF'
Uso: bash scripts/build_android_release.sh [--prepare-only]

Gera o APK Android Release do N64 Aurora em uma máquina local configurada.

Opções:
  --prepare-only  Executa auditoria e prebuild, sem chamar o Gradle.
  --help          Exibe esta mensagem.

Pré-requisitos:
  - Node.js 22+ e pnpm 9+
  - Java compatível com o projeto Android
  - Android SDK em ANDROID_SDK_ROOT ou ANDROID_HOME
  - Android NDK 26.1.10909125 em <SDK>/ndk/26.1.10909125
EOF
}

fail() {
  printf '\nERRO: %s\n' "$1" >&2
  exit 1
}

for argument in "$@"; do
  case "$argument" in
    --) ;;
    --prepare-only) PREPARE_ONLY=true ;;
    --help|-h) usage; exit 0 ;;
    *) fail "Argumento desconhecido: $argument" ;;
  esac
done

command -v node >/dev/null || fail "Node.js não foi encontrado."
command -v pnpm >/dev/null || fail "pnpm não foi encontrado."

cd "$PROJECT_ROOT"

printf '== N64 Aurora: auditoria nativa ==\n'
pnpm audit:native

printf '\n== N64 Aurora: prebuild Android ==\n'
CI=1 EXPO_NO_TELEMETRY=1 npx expo prebuild --clean --platform android --no-install

[[ -f android/gradlew ]] || fail "O prebuild não gerou android/gradlew."
grep -q "mupen64plus-core" android/settings.gradle || fail "Os módulos do Mupen64Plus-AE não foram incluídos no Gradle."
grep -q "android.packagingOptions.pickFirsts=.*libc++_shared" android/gradle.properties || fail "A regra de empacotamento C++ não foi aplicada."

if [[ "$PREPARE_ONLY" == true ]]; then
  printf '\nPrebuild e auditoria concluídos. Nenhum APK foi compilado por --prepare-only.\n'
  exit 0
fi

SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
[[ -n "$SDK_ROOT" ]] || fail "Defina ANDROID_SDK_ROOT ou ANDROID_HOME apontando para o Android SDK."
[[ -d "$SDK_ROOT" ]] || fail "O diretório do Android SDK não existe: $SDK_ROOT"
[[ -d "$SDK_ROOT/ndk/$REQUIRED_NDK_VERSION" ]] || fail "Instale o Android NDK $REQUIRED_NDK_VERSION em $SDK_ROOT/ndk/."

export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export ANDROID_NDK_HOME="$SDK_ROOT/ndk/$REQUIRED_NDK_VERSION"

printf '\n== N64 Aurora: assembleRelease ==\n'
(
  cd android
  ./gradlew --no-daemon :app:assembleRelease --stacktrace
)

APK_PATH="$(find android/app/build/outputs/apk/release -maxdepth 1 -type f -name '*.apk' -print -quit)"
[[ -n "$APK_PATH" ]] || fail "O Gradle terminou, mas nenhum APK release foi encontrado."

printf '\nAPK Release criado:\n%s\n' "$PROJECT_ROOT/$APK_PATH"
