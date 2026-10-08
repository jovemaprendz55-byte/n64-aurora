#include <GL/EGLLoader.h>
#include "ae_bridge.h"
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <android/log.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include <mutex>
#include <thread>
#include <vector>
#include <atomic>
#include <stdio.h>
#include <unistd.h>
#include <dlfcn.h>
#include <m64p_frontend.h>
#include <m64p_debugger.h>
#include <rc_client.h>
#include <rc_consoles.h>

extern "C" void ra_set_rich_presence_enabled(rc_client_t* client, int enabled);

#define RA_TAG "RetroAchievements"
#define RALOGI(...) __android_log_print(ANDROID_LOG_INFO,  RA_TAG, __VA_ARGS__)
#define RALOGW(...) __android_log_print(ANDROID_LOG_WARN,  RA_TAG, __VA_ARGS__)
#define RALOGE(...) __android_log_print(ANDROID_LOG_ERROR, RA_TAG, __VA_ARGS__)

EGLDisplay display = EGL_NO_DISPLAY;
EGLConfig config;
EGLContext context = EGL_NO_CONTEXT;
EGLSurface surface = EGL_NO_SURFACE;
ANativeWindow* native_window = nullptr;
std::mutex nativeWindowAccess;
int isGLES2 = 1;
bool new_surface = false;
int FPSRecalcPeriod = 0;
uint32_t frameCount = 0;
int64_t oldTime;
int vsync = 0;
int oldVsync = 1;
bool isPaused = false;
static bool detachOnQuitCore = false;
static uint64_t videoModeCount = 0;
static uint64_t swapAttemptCount = 0;
static uint64_t swapFailureCount = 0;
static uint64_t missingWindowCount = 0;
static EGLint lastSwapError = EGL_SUCCESS;
static int lastWindowWidth = 0;
static int lastWindowHeight = 0;
static int lastWindowFormat = 0;
static bool videoInitialized = false;
static bool videoModeReady = false;

m64p_dynlib_handle CoreHandle = NULL;
ptr_CoreOverrideVidExt  CoreOverrideVidExt = NULL;
ptr_DebugMemGetPointer  DebugMemGetPointer = NULL;

void (*fpsCounterCallback)(int);

// ---------- RetroAchievements ----------
// All functions below use plain C calling convention (no JNIEnv/jclass params)
// so they can be called via JNA from Java, matching the pattern used for
// other ae-bridge functions like overrideAeVidExtFuncs().

extern JavaVM* mJavaVM;  // defined in JNI_OnLoad below

static rc_client_t*  g_rc_client  = nullptr;
static uint8_t*      g_rdram      = nullptr;

static jclass      g_ra_class                  = nullptr;
static jmethodID   g_ra_server_call            = nullptr;
static jmethodID   g_ra_achievement_triggered  = nullptr;
static jmethodID   g_ra_game_loaded            = nullptr;
static jmethodID   g_ra_game_completed         = nullptr;
static jmethodID   g_ra_leaderboard_started    = nullptr;
static jmethodID   g_ra_leaderboard_submitted  = nullptr;
static jmethodID   g_ra_leaderboard_tracker    = nullptr;
static jmethodID   g_ra_challenge_indicator    = nullptr;
static jmethodID   g_ra_progress_indicator     = nullptr;
static jmethodID   g_ra_leaderboard_scoreboard = nullptr;
static jmethodID   g_ra_server_error           = nullptr;
static jmethodID   g_ra_login_success          = nullptr;

static std::string g_achievements_json;

static std::string g_ra_host_override;

// Restore requested before the game finished identifying; applied on game load.
static std::string g_pending_progress_path;
static bool        g_has_pending_progress = false;
static void ra_apply_progress_file(const char* path);

struct PendingServerCall {
    rc_client_server_callback_t callback;
    void* callback_data;
};

static JNIEnv* ra_get_env(bool* attached) {
    JNIEnv* env;
    *attached = false;
    if (mJavaVM->GetEnv((void**)&env, JNI_VERSION_1_6) != JNI_OK) {
        mJavaVM->AttachCurrentThread(&env, nullptr);
        *attached = true;
    }
    return env;
}

static void ra_log_callback(const char* message, const rc_client_t*) {
    RALOGI("%s", message);
}

static uint32_t ra_read_memory(uint32_t address, uint8_t* buffer, uint32_t num_bytes, rc_client_t*) {
    if (!g_rdram && DebugMemGetPointer)
        g_rdram = (uint8_t*)DebugMemGetPointer(M64P_DBG_PTR_RDRAM);
    if (!g_rdram) return 0;
    if (address >= 0x800000) return 0;
    uint32_t i;
    for (i = 0; i < num_bytes && (address + i) < 0x800000; i++)
        buffer[i] = g_rdram[address + i];
    return i;
}

static void ra_server_call(const rc_api_request_t* request,
                           rc_client_server_callback_t callback,
                           void* callback_data, rc_client_t*) {
    if (!g_ra_class || !g_ra_server_call) {
        rc_api_server_response_t resp = {};
        resp.http_status_code = RC_API_SERVER_RESPONSE_CLIENT_ERROR;
        callback(&resp, callback_data);
        return;
    }
    bool attached;
    JNIEnv* env = ra_get_env(&attached);
    auto* pending = new PendingServerCall{callback, callback_data};
    jstring url   = env->NewStringUTF(request->url);
    jstring body  = request->post_data ? env->NewStringUTF(request->post_data) : nullptr;
    env->CallStaticVoidMethod(g_ra_class, g_ra_server_call, url, body, (jlong)(uintptr_t)pending);
    env->DeleteLocalRef(url);
    if (body) env->DeleteLocalRef(body);
    if (attached) mJavaVM->DetachCurrentThread();
}

static void ra_event_handler(const rc_client_event_t* event, rc_client_t* client) {
    switch (event->type) {
        case RC_CLIENT_EVENT_ACHIEVEMENT_TRIGGERED: {
            if (!g_ra_class || !g_ra_achievement_triggered) break;
            bool attached; JNIEnv* env = ra_get_env(&attached);
            jstring title      = env->NewStringUTF(event->achievement->title);
            jstring desc       = env->NewStringUTF(event->achievement->description);
            jstring badgeUrl   = env->NewStringUTF(event->achievement->badge_url ? event->achievement->badge_url : "");
            jboolean unofficial = (jboolean)(event->achievement->category == RC_CLIENT_ACHIEVEMENT_CATEGORY_UNOFFICIAL);
            env->CallStaticVoidMethod(g_ra_class, g_ra_achievement_triggered,
                                      title, desc, (jint)event->achievement->points, badgeUrl, unofficial);
            env->DeleteLocalRef(title); env->DeleteLocalRef(desc); env->DeleteLocalRef(badgeUrl);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_GAME_COMPLETED: {
            if (!g_ra_class || !g_ra_game_completed) break;
            const rc_client_game_t* game = rc_client_get_game_info(client);
            bool attached; JNIEnv* env = ra_get_env(&attached);
            jstring title    = env->NewStringUTF(game ? game->title : "");
            jboolean hardcore = (jboolean)rc_client_get_hardcore_enabled(client);
            jstring badgeUrl = env->NewStringUTF(game && game->badge_url ? game->badge_url : "");
            env->CallStaticVoidMethod(g_ra_class, g_ra_game_completed, title, hardcore, badgeUrl);
            env->DeleteLocalRef(title); env->DeleteLocalRef(badgeUrl);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_LEADERBOARD_STARTED: {
            if (!g_ra_class || !g_ra_leaderboard_started || !event->leaderboard) break;
            bool attached; JNIEnv* env = ra_get_env(&attached);
            jstring title = env->NewStringUTF(event->leaderboard->title);
            env->CallStaticVoidMethod(g_ra_class, g_ra_leaderboard_started, title);
            env->DeleteLocalRef(title);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_LEADERBOARD_SUBMITTED: {
            if (!g_ra_class || !g_ra_leaderboard_submitted || !event->leaderboard) break;
            bool attached; JNIEnv* env = ra_get_env(&attached);
            jstring title = env->NewStringUTF(event->leaderboard->title);
            jstring value = env->NewStringUTF(event->leaderboard->tracker_value
                                               ? event->leaderboard->tracker_value : "");
            env->CallStaticVoidMethod(g_ra_class, g_ra_leaderboard_submitted, title, value);
            env->DeleteLocalRef(title); env->DeleteLocalRef(value);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_LEADERBOARD_SCOREBOARD: {
            if (!g_ra_class || !g_ra_leaderboard_scoreboard || !event->leaderboard_scoreboard) break;
            bool attached; JNIEnv* env = ra_get_env(&attached);
            const rc_client_leaderboard_scoreboard_t* sb = event->leaderboard_scoreboard;
            jstring submitted = env->NewStringUTF(sb->submitted_score);
            jstring best      = env->NewStringUTF(sb->best_score);
            env->CallStaticVoidMethod(g_ra_class, g_ra_leaderboard_scoreboard,
                                      submitted, best,
                                      (jint)sb->new_rank, (jint)sb->num_entries);
            env->DeleteLocalRef(submitted); env->DeleteLocalRef(best);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_RESET:
            rc_client_reset(client);
            break;
        case RC_CLIENT_EVENT_SERVER_ERROR:
            if (event->server_error) {
                RALOGE("Server error [%s]: %s", event->server_error->api,
                       event->server_error->error_message);
                if (g_ra_class && g_ra_server_error) {
                    bool attached; JNIEnv* env = ra_get_env(&attached);
                    jstring api = env->NewStringUTF(event->server_error->api ? event->server_error->api : "");
                    jstring msg = env->NewStringUTF(event->server_error->error_message ? event->server_error->error_message : "unknown error");
                    env->CallStaticVoidMethod(g_ra_class, g_ra_server_error, api, msg);
                    env->DeleteLocalRef(api); env->DeleteLocalRef(msg);
                    if (attached) mJavaVM->DetachCurrentThread();
                }
            }
            break;
        case RC_CLIENT_EVENT_LEADERBOARD_FAILED:
            if (event->leaderboard)
                RALOGI("Leaderboard failed: %s", event->leaderboard->title);
            break;
        case RC_CLIENT_EVENT_LEADERBOARD_TRACKER_SHOW:
        case RC_CLIENT_EVENT_LEADERBOARD_TRACKER_UPDATE:
        case RC_CLIENT_EVENT_LEADERBOARD_TRACKER_HIDE: {
            if (!g_ra_class || !g_ra_leaderboard_tracker || !event->leaderboard_tracker) break;
            bool attached; JNIEnv* env = ra_get_env(&attached);
            // type: 0=show, 1=update, 2=hide  (matches Java constants)
            jint type = (event->type == RC_CLIENT_EVENT_LEADERBOARD_TRACKER_SHOW)  ? 0 :
                        (event->type == RC_CLIENT_EVENT_LEADERBOARD_TRACKER_UPDATE) ? 1 : 2;
            jint id   = (jint)event->leaderboard_tracker->id;
            jstring display = env->NewStringUTF(event->leaderboard_tracker->display);
            env->CallStaticVoidMethod(g_ra_class, g_ra_leaderboard_tracker, type, id, display);
            env->DeleteLocalRef(display);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_ACHIEVEMENT_CHALLENGE_INDICATOR_SHOW:
        case RC_CLIENT_EVENT_ACHIEVEMENT_CHALLENGE_INDICATOR_HIDE: {
            if (!g_ra_class || !g_ra_challenge_indicator || !event->achievement) break;
            bool attached; JNIEnv* env = ra_get_env(&attached);
            jint type     = (event->type == RC_CLIENT_EVENT_ACHIEVEMENT_CHALLENGE_INDICATOR_SHOW) ? 0 : 1;
            jint id       = (jint)event->achievement->id;
            jstring title    = env->NewStringUTF(event->achievement->title);
            // Pass badge_url for SHOW so the indicator can display the achievement icon
            const char* burl = (type == 0) ? event->achievement->badge_url : nullptr;
            jstring badgeUrl = env->NewStringUTF(burl ? burl : "");
            env->CallStaticVoidMethod(g_ra_class, g_ra_challenge_indicator, type, id, title, badgeUrl);
            env->DeleteLocalRef(title); env->DeleteLocalRef(badgeUrl);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_ACHIEVEMENT_PROGRESS_INDICATOR_SHOW:
        case RC_CLIENT_EVENT_ACHIEVEMENT_PROGRESS_INDICATOR_UPDATE: {
            if (!g_ra_class || !g_ra_progress_indicator || !event->achievement) break;
            bool attached; JNIEnv* env = ra_get_env(&attached);
            jint type     = (event->type == RC_CLIENT_EVENT_ACHIEVEMENT_PROGRESS_INDICATOR_SHOW) ? 0 : 1;
            jstring title    = env->NewStringUTF(event->achievement->title ? event->achievement->title : "");
            jstring prog     = env->NewStringUTF(event->achievement->measured_progress ? event->achievement->measured_progress : "");
            // Use badge_locked_url so the indicator shows the locked (in-progress) icon
            const char* burl = event->achievement->badge_locked_url;
            jstring badgeUrl = env->NewStringUTF(burl ? burl : "");
            env->CallStaticVoidMethod(g_ra_class, g_ra_progress_indicator, type, title, prog, badgeUrl);
            env->DeleteLocalRef(title); env->DeleteLocalRef(prog); env->DeleteLocalRef(badgeUrl);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_ACHIEVEMENT_PROGRESS_INDICATOR_HIDE: {
            if (!g_ra_class || !g_ra_progress_indicator) break;
            bool attached; JNIEnv* env = ra_get_env(&attached);
            jstring empty = env->NewStringUTF("");
            env->CallStaticVoidMethod(g_ra_class, g_ra_progress_indicator, (jint)2, empty, empty, empty);
            env->DeleteLocalRef(empty);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_SUBSET_COMPLETED: {
            if (!g_ra_class || !g_ra_game_completed) break;
            bool attached; JNIEnv* env = ra_get_env(&attached);
            jstring title    = env->NewStringUTF(event->subset ? event->subset->title : "");
            jboolean hardcore = (jboolean)rc_client_get_hardcore_enabled(client);
            jstring badgeUrl = env->NewStringUTF(
                event->subset && event->subset->badge_url ? event->subset->badge_url : "");
            env->CallStaticVoidMethod(g_ra_class, g_ra_game_completed, title, hardcore, badgeUrl);
            env->DeleteLocalRef(title); env->DeleteLocalRef(badgeUrl);
            if (attached) mJavaVM->DetachCurrentThread();
            break;
        }
        case RC_CLIENT_EVENT_DISCONNECTED:
            RALOGW("Disconnected â€” pending unlocks will be retried");
            break;
        case RC_CLIENT_EVENT_RECONNECTED:
            RALOGI("Reconnected â€” pending unlocks delivered");
            break;
        default:
            break;
    }
}

static void ra_login_callback(int result, const char* error_message,
                              rc_client_t* client, void*) {
    if (result != RC_OK) {
        RALOGW("Login failed: %s", error_message ? error_message : "unknown");
        return;
    }
    const rc_client_user_t* user = rc_client_get_user_info(client);
    RALOGI("Logged in as %s (%u softcore pts)", user ? user->display_name : "?",
           user ? user->score_softcore : 0);
    if (!g_ra_class || !g_ra_login_success || !user) return;
    bool attached; JNIEnv* env = ra_get_env(&attached);
    jstring name = env->NewStringUTF(user->display_name);
    env->CallStaticVoidMethod(g_ra_class, g_ra_login_success, name, (jint)user->score_softcore);
    env->DeleteLocalRef(name);
    if (attached) mJavaVM->DetachCurrentThread();
}

// JNA-callable: create client and log in with a saved token
extern "C" DECLSPEC void rcheevosInit(const char* username, const char* token) {
    if (g_rc_client) rc_client_destroy(g_rc_client);
    g_rc_client = rc_client_create(ra_read_memory, ra_server_call);
    rc_client_enable_logging(g_rc_client, RC_CLIENT_LOG_LEVEL_INFO, ra_log_callback);
    rc_client_set_hardcore_enabled(g_rc_client, 0);
    if (!g_ra_host_override.empty()) {
        rc_client_set_host(g_rc_client, g_ra_host_override.c_str());
        RALOGI("Host override: %s", g_ra_host_override.c_str());
    }
    rc_client_set_event_handler(g_rc_client, ra_event_handler);
    // Rich presence disabled by default until explicitly enabled via rcheevosSetRichPresenceEnabled
    ra_set_rich_presence_enabled(g_rc_client, 0);
    RALOGI("Logging in as %s", username);
    rc_client_begin_login_with_token(g_rc_client, username, token, ra_login_callback, nullptr);
}

extern "C" DECLSPEC void rcheevosSetHost(const char* host) {
    if (host && host[0] != '\0') {
        g_ra_host_override = host;
    } else {
        g_ra_host_override.clear();
    }
    if (g_rc_client) {
        rc_client_set_host(g_rc_client, g_ra_host_override.empty() ? nullptr
                                                                   : g_ra_host_override.c_str());
    }
    RALOGI("Host override set to '%s'", g_ra_host_override.empty() ? "(default)"
                                                                   : g_ra_host_override.c_str());
}

// JNA-callable: enable or disable rich presence reporting to the RA server
extern "C" DECLSPEC void rcheevosSetRichPresenceEnabled(int enabled) {
    ra_set_rich_presence_enabled(g_rc_client, enabled);
    RALOGI("Rich presence %s", enabled ? "enabled" : "disabled");
}

// JNA-callable: enable or disable loading of unofficial achievements
extern "C" DECLSPEC void rcheevosSetUnofficialEnabled(int enabled) {
    if (!g_rc_client) return;
    rc_client_set_unofficial_enabled(g_rc_client, enabled);
    RALOGI("Unofficial achievements %s", enabled ? "enabled" : "disabled");
}

static void ra_game_loaded_callback(int result, const char* error_message,
                                    rc_client_t* client, void*) {
    if (result != RC_OK) {
        RALOGW("Game load failed: %s", error_message ? error_message : "unknown");
        return;
    }
    if (!g_ra_class || !g_ra_game_loaded) return;

    const rc_client_game_t* game = rc_client_get_game_info(client);
    if (!game) return;

    // Apply a restore that arrived before the game was ready. Done before the
    // achievement list is built below so the counts sent to Java reflect the
    // restored runtime rather than a fresh one.
    if (g_has_pending_progress) {
        const std::string pending = g_pending_progress_path;
        g_has_pending_progress = false;
        g_pending_progress_path.clear();
        ra_apply_progress_file(pending.empty() ? nullptr : pending.c_str());
    }

    auto esc = [](const char* s) -> std::string {
        std::string out;
        if (!s) return out;
        for (; *s; ++s) {
            if (*s == '"') out += "\\\"";
            else if (*s == '\\') out += "\\\\";
            else out += *s;
        }
        return out;
    };

    // Create the achievement list first so we can read the primary subset ID.
    // game->id is the website game ID; the primary subset has its own internal ID
    // that only appears in bucket->subset_id â€” it is not the same value.
    rc_client_achievement_list_t* list = rc_client_create_achievement_list(
        client,
        RC_CLIENT_ACHIEVEMENT_CATEGORY_CORE_AND_UNOFFICIAL,
        RC_CLIENT_ACHIEVEMENT_LIST_GROUPING_LOCK_STATE);

    uint32_t primary_id = (list && list->num_buckets > 0) ? list->buckets[0].subset_id : 0;

    // Summary API filters warning achievements (ID >= 101000001), giving the correct counts.
    rc_client_user_game_summary_t summary = {};
    if (primary_id != 0)
        rc_client_get_user_subset_summary(client, primary_id, &summary);
    else
        rc_client_get_user_game_summary(client, &summary);
    int total       = (int)summary.num_core_achievements;
    int earned      = (int)summary.num_unlocked_achievements;
    int unsupported = (int)summary.num_unsupported_achievements;

    // Build JSON for the primary bucket, skipping warning achievements so the
    // list count matches the summary counts above.
    g_achievements_json.clear();
    g_achievements_json += '[';

    if (
