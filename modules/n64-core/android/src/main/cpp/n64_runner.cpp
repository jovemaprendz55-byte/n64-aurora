#include <android/log.h>
#include <jni.h>
#include <dlfcn.h>

#include <array>
#include <fstream>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

namespace {
constexpr const char* kTag = "N64AuroraJNI";
constexpr int kCoreApiVersion = 0x20001;
constexpr int kCommandRomOpen = 1;
constexpr int kCommandRomClose = 2;
constexpr int kCommandExecute = 5;
constexpr int kCommandStop = 6;
constexpr int kCommandPause = 7;
constexpr int kCommandResume = 8;
constexpr int kPluginRsp = 1;
constexpr int kPluginGfx = 2;
constexpr int kPluginAudio = 3;
constexpr int kPluginInput = 4;
constexpr int kPakMemory = 2;

using CoreStartup = int (*)(int, const char*, const char*, void*, void*, void*, void*);
using CoreShutdown = int (*)();
using CoreAttachPlugin = int (*)(int, void*);
using CoreDoCommand = int (*)(int, int, void*);
using SetNativeWindow = void (*)(JNIEnv*, jobject);
using UnsetNativeWindow = void (*)();
using OverrideVideo = int (*)();
using SetInputConfig = void (*)(JNIEnv*, jclass, jint, jboolean, jint);
using SetInputState = void (*)(JNIEnv*, jclass, jint, jbooleanArray, jdouble, jdouble, jboolean);

std::mutex g_mutex;
std::thread g_emulation_thread;
void* g_core = nullptr;
void* g_bridge = nullptr;
void* g_rsp = nullptr;
void* g_gfx = nullptr;
void* g_audio = nullptr;
void* g_input = nullptr;
CoreDoCommand g_do_command = nullptr;
CoreShutdown g_shutdown = nullptr;
CoreAttachPlugin g_attach_plugin = nullptr;
SetNativeWindow g_set_window = nullptr;
UnsetNativeWindow g_unset_window = nullptr;
OverrideVideo g_override_video = nullptr;
SetInputConfig g_set_input_config = nullptr;
SetInputState g_set_input_state = nullptr;
bool g_running = false;
bool g_starting = false;
std::string g_last_error;
std::array<jboolean, 16> g_button_state{};
double g_analog_x = 0.0;
double g_analog_y = 0.0;

void set_error(const std::string& error) {
  g_last_error = error;
  __android_log_print(ANDROID_LOG_ERROR, kTag, "%s", error.c_str());
}

void close_library(void*& handle) {
  if (handle != nullptr) {
    dlclose(handle);
    handle = nullptr;
  }
}

void close_plugins() {
  close_library(g_input);
  close_library(g_audio);
  close_library(g_gfx);
  close_library(g_rsp);
  close_library(g_core);
  close_library(g_bridge);
}

bool load_library(void*& handle, const char* name) {
  handle = dlopen(name, RTLD_NOW | RTLD_GLOBAL);
  if (handle != nullptr) return true;
  set_error(std::string("Não foi possível carregar ") + name + ": " + dlerror());
  return false;
}

bool load_engine() {
  if (g_core != nullptr) return true;
  if (!load_library(g_bridge, "libae-bridge.so") ||
      !load_library(g_core, "libmupen64plus-core.so") ||
      !load_library(g_rsp, "libmupen64plus-rsp-hle.so") ||
      !load_library(g_gfx, "libmupen64plus-video-gln64.so") ||
      !load_library(g_audio, "libmupen64plus-audio-android.so") ||
      !load_library(g_input, "libmupen64plus-input-android.so")) {
    close_plugins();
    return false;
  }

  g_shutdown = reinterpret_cast<CoreShutdown>(dlsym(g_core, "CoreShutdown"));
  g_attach_plugin = reinterpret_cast<CoreAttachPlugin>(dlsym(g_core, "CoreAttachPlugin"));
  g_do_command = reinterpret_cast<CoreDoCommand>(dlsym(g_core, "CoreDoCommand"));
  g_set_window = reinterpret_cast<SetNativeWindow>(dlsym(g_bridge, "setNativeWindow"));
  g_unset_window = reinterpret_cast<UnsetNativeWindow>(dlsym(g_bridge, "unsetNativeWindow"));
  g_override_video = reinterpret_cast<OverrideVideo>(dlsym(g_bridge, "overrideAeVidExtFuncs"));
  g_set_input_config = reinterpret_cast<SetInputConfig>(dlsym(g_input, "Java_paulscode_android_mupen64plusae_jni_NativeInput_setConfig"));
  g_set_input_state = reinterpret_cast<SetInputState>(dlsym(g_input, "Java_paulscode_android_mupen64plusae_jni_NativeInput_setState"));

  if (g_shutdown == nullptr || g_attach_plugin == nullptr || g_do_command == nullptr || g_set_window == nullptr ||
      g_unset_window == nullptr || g_override_video == nullptr || g_set_input_config == nullptr || g_set_input_state == nullptr) {
    set_error("A API esperada do core, do ae-bridge ou do plugin de entrada não foi encontrada.");
    close_plugins();
    return false;
  }
  return true;
}

int button_index(const std::string& input) {
  if (input == "dpadRight") return 0;
  if (input == "dpadLeft") return 1;
  if (input == "dpadDown") return 2;
  if (input == "dpadUp") return 3;
  if (input == "start") return 4;
  if (input == "z") return 5;
  if (input == "b") return 6;
  if (input == "a") return 7;
  if (input == "cRight") return 8;
  if (input == "cLeft") return 9;
  if (input == "cDown") return 10;
  if (input == "cUp") return 11;
  if (input == "r") return 12;
  if (input == "l") return 13;
  return -1;
}

void push_input(JNIEnv* env) {
  if (!g_running || g_set_input_state == nullptr) return;
  jbooleanArray buttons = env->NewBooleanArray(static_cast<jsize>(g_button_state.size()));
  if (buttons == nullptr) return;
  env->SetBooleanArrayRegion(buttons, 0, static_cast<jsize>(g_button_state.size()), g_button_state.data());
  g_set_input_state(env, nullptr, 0, buttons, g_analog_x, g_analog_y, JNI_FALSE);
  env->DeleteLocalRef(buttons);
}

bool read_rom(const std::string& path, std::vector<unsigned char>& bytes) {
  std::ifstream input(path, std::ios::binary | std::ios::ate);
  if (!input) {
    set_error("Não foi possível abrir a cópia local da ROM.");
    return false;
  }
  const auto size = input.tellg();
  if (size <= 0) {
    set_error("A ROM selecionada está vazia.");
    return false;
  }
  bytes.resize(static_cast<size_t>(size));
  input.seekg(0, std::ios::beg);
  input.read(reinterpret_cast<char*>(bytes.data()), size);
  if (!input.good()) {
    set_error("Não foi possível ler a ROM selecionada.");
    return false;
  }
  return true;
}

std::string as_string(JNIEnv* env, jstring value) {
  const char* chars = env->GetStringUTFChars(value, nullptr);
  std::string result(chars == nullptr ? "" : chars);
  if (chars != nullptr) env->ReleaseStringUTFChars(value, chars);
  return result;
}
}  // namespace

extern "C" JNIEXPORT jboolean JNICALL
Java_expo_modules_n64core_Mupen64Bridge_nativeAttachSurface(JNIEnv* env, jobject, jobject surface) {
  std::lock_guard<std::mutex> lock(g_mutex);
  if (!load_engine() || g_set_window == nullptr) return JNI_FALSE;
  g_set_window(env, surface);
  return JNI_TRUE;
}

extern "C" JNIEXPORT jstring JNICALL
Java_expo_modules_n64core_Mupen64Bridge_nativeStart(JNIEnv* env, jobject, jstring rom_path, jstring config_path, jstring data_path) {
  {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (g_running || g_starting) return nullptr;
    if (!load_engine()) return env->NewStringUTF(g_last_error.c_str());
    // Libere o mutex antes de CoreDoCommand: VidExtFuncSetMode pode esperar
    // a SurfaceView, enquanto nativeAttachSurface precisa deste mesmo mutex.
    g_starting = true;
  }

  std::vector<unsigned char> rom;
  if (!read_rom(as_string(env, rom_path), rom)) {
    std::lock_guard<std::mutex> lock(g_mutex);
    g_starting = false;
    return env->NewStringUTF(g_last_error.c_str());
  }
  const std::string config = as_string(env, config_path);
  const std::string data = as_string(env, data_path);
  const auto startup = reinterpret_cast<CoreStartup>(dlsym(g_core, "CoreStartup"));
  if (startup == nullptr || startup(kCoreApiVersion, config.c_str(), data.c_str(), nullptr, nullptr, nullptr, nullptr) != 0) {
    set_error("O core não conseguiu criar sua configuração local.");
    std::lock_guard<std::mutex> lock(g_mutex);
    g_starting = false;
    close_plugins();
    return env->NewStringUTF(g_last_error.c_str());
  }

  // O override precisa ser instalado antes de plugin_start_gfx(); caso contrário
  // o plugin inicia com as funções de vídeo padrão e a SurfaceView permanece preta.
  if (g_override_video() != 0) {
    set_error("O core não aceitou a tabela de funções de vídeo do ae-bridge.");
    std::lock_guard<std::mutex> lock(g_mutex);
    g_starting = false;
    g_shutdown();
    close_plugins();
    return env->NewStringUTF(g_last_error.c_str());
  }

  if (g_do_command(kCommandRomOpen, static_cast<int>(rom.size()), rom.data()) != 0) {
    set_error("O core não conseguiu abrir a ROM selecionada.");
    g_shutdown();
    std::lock_guard<std::mutex> lock(g_mutex);
    g_starting = false;
    close_plugins();
    return env->NewStringUTF(g_last_error.c_str());
  }

  // O frontend Mupen64Plus só aceita CoreAttachPlugin depois de ROM_OPEN;
  // plugin_start_gfx também precisa dos dados da ROM para criar a saída de vídeo.
  if (g_attach_plugin(kPluginGfx, g_gfx) != 0 || g_attach_plugin(kPluginAudio, g_audio) != 0 ||
      g_attach_plugin(kPluginInput, g_input) != 0 || g_attach_plugin(kPluginRsp, g_rsp) != 0) {
    set_error("O core Mupen64Plus-AE recusou a inicialização de um plugin após abrir a ROM.");
    g_shutdown();
    std::lock_guard<std::mutex> lock(g_mutex);
    g_starting = false;
    close_plugins();
    return env->NewStringUTF(g_last_error.c_str());
  }
  g_set_input_config(env, nullptr, 0, JNI_TRUE, kPakMemory);

  {
    std::lock_guard<std::mutex> lock(g_mutex);
    g_running = true;
    g_starting = false;
  }
  g_emulation_thread = std::thread([rom = std::move(rom)]() mutable {
    const int execute_result = g_do_command(kCommandExecute, 0, nullptr);
    if (execute_result != 0) set_error("A execução do core foi interrompida com erro.");
    g_do_command(kCommandRomClose, 0, nullptr);
    std::lock_guard<std::mutex> state_lock(g_mutex);
    g_running = false;
  });
  return nullptr;
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_n64core_Mupen64Bridge_nativePause(JNIEnv*, jobject) {
  std::lock_guard<std::mutex> lock(g_mutex);
  if (g_running && g_do_command != nullptr) g_do_command(kCommandPause, 0, nullptr);
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_n64core_Mupen64Bridge_nativeResume(JNIEnv*, jobject) {
  std::lock_guard<std::mutex> lock(g_mutex);
  if (g_running && g_do_command != nullptr) g_do_command(kCommandResume, 0, nullptr);
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_n64core_Mupen64Bridge_nativeSetButton(JNIEnv* env, jobject, jstring input, jboolean pressed) {
  std::lock_guard<std::mutex> lock(g_mutex);
  const int index = button_index(as_string(env, input));
  if (index < 0) return;
  g_button_state[static_cast<size_t>(index)] = pressed;
  push_input(env);
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_n64core_Mupen64Bridge_nativeSetAnalog(JNIEnv* env, jobject, jdouble x, jdouble y) {
  std::lock_guard<std::mutex> lock(g_mutex);
  g_analog_x = x < -1.0 ? -1.0 : (x > 1.0 ? 1.0 : x);
  g_analog_y = y < -1.0 ? -1.0 : (y > 1.0 ? 1.0 : y);
  push_input(env);
}

extern "C" JNIEXPORT void JNICALL
Java_expo_modules_n64core_Mupen64Bridge_nativeStop(JNIEnv*, jobject) {
  {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (g_running && g_do_command != nullptr) g_do_command(kCommandStop, 0, nullptr);
  }
  if (g_emulation_thread.joinable()) g_emulation_thread.join();
  std::lock_guard<std::mutex> lock(g_mutex);
  if (g_unset_window != nullptr) g_unset_window();
  if (g_shutdown != nullptr) g_shutdown();
  close_plugins();
  g_do_command = nullptr;
  g_shutdown = nullptr;
  g_attach_plugin = nullptr;
  g_set_window = nullptr;
  g_unset_window = nullptr;
  g_override_video = nullptr;
  g_set_input_config = nullptr;
  g_set_input_state = nullptr;
  g_button_state.fill(JNI_FALSE);
  g_analog_x = 0.0;
  g_analog_y = 0.0;
  g_running = false;
}
