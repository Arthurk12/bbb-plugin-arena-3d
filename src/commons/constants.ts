export const DATA_CHANNELS = {
  MATCH: 'match',
} as const;

export const LOG_CODES = {
  STARTED: 'plg_started',
  STOPPED: 'plg_stopped',
  SETTINGS_ERROR: 'arena3d_settings_error',
  CURRENT_USER_ERROR: 'arena3d_current_user_error',
  USERS_ERROR: 'arena3d_users_error',
  MATCH_ERROR: 'arena3d_match_error',
  MATCH_CHANGED: 'arena3d_match_changed',
  RELAY_FAILED: 'arena3d_relay_failed',
  GAME_LOAD_ERROR: 'arena3d_game_load_error',
  WEBGL_ERROR: 'arena3d_webgl_error',
  FRAG: 'arena3d_frag',
} as const;

export const MODERATOR_ROLE = 'MODERATOR';

export const HIDDEN_ARENA_STORAGE_KEY_PREFIX = 'bbb-plugin-arena-3d:hidden:';

export const DATA_TEST = {
  APPS_GALLERY_ENTRY: 'arena3dAppsGalleryEntry',
  MEDIA_AREA_TOGGLE: 'arena3dMediaAreaToggle',
  MAIN_AREA_ARENA: 'arena3dMainArea',
  ADMIN_MODAL: 'arena3dAdminModal',
  ADMIN_START: 'arena3dAdminStart',
  ADMIN_NEW_ROUND: 'arena3dAdminNewRound',
  ADMIN_STOP: 'arena3dAdminStop',
  ARENA_CANVAS: 'arena3dCanvas',
  ARENA_PLAY_OVERLAY: 'arena3dPlayOverlay',
  HUD_HEALTH: 'arena3dHudHealth',
  HUD_SCORE: 'arena3dHudScore',
  HUD_AMMO: 'arena3dHudAmmo',
  SCOREBOARD: 'arena3dScoreboard',
} as const;
