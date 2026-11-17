import { defineMessages } from 'react-intl';

export const intlMessages = defineMessages({
  title: {
    id: 'hud.title',
    description: 'Game title on the start overlay',
    defaultMessage: 'ARENA 3D',
  },
  clickToPlay: {
    id: 'hud.clickToPlay',
    description: 'Button that captures the mouse and starts playing',
    defaultMessage: 'Click to play',
  },
  controlsMove: {
    id: 'hud.controls.move',
    description: 'Controls help: movement',
    defaultMessage: 'W A S D or arrows: move · Space: jump · Shift: walk',
  },
  controlsAim: {
    id: 'hud.controls.aim',
    description: 'Controls help: aiming and shooting',
    defaultMessage: 'Mouse: aim · Click: shoot · Right click: sniper scope',
  },
  controlsWeapons: {
    id: 'hud.controls.weapons',
    description: 'Controls help: weapons',
    defaultMessage: '1–4, Q or mouse wheel: switch weapon · R: reload',
  },
  controlsOther: {
    id: 'hud.controls.other',
    description: 'Controls help: scores, sound and leaving',
    defaultMessage: 'Tab: scores · M: sound on/off · Esc: release the mouse',
  },
  health: {
    id: 'hud.health',
    description: 'Label of the health counter',
    defaultMessage: 'Health',
  },
  frags: {
    id: 'hud.frags',
    description: 'Label of the kills counter',
    defaultMessage: 'Frags',
  },
  deaths: {
    id: 'hud.deaths',
    description: 'Label of the deaths counter',
    defaultMessage: 'Deaths',
  },
  blaster: {
    id: 'weapon.blaster',
    description: 'Name of the pistol-like weapon',
    defaultMessage: 'Blaster',
  },
  shotgun: {
    id: 'weapon.shotgun',
    description: 'Name of the shotgun',
    defaultMessage: 'Shotgun',
  },
  smg: {
    id: 'weapon.smg',
    description: 'Name of the submachine gun',
    defaultMessage: 'SMG',
  },
  sniper: {
    id: 'weapon.sniper',
    description: 'Name of the sniper rifle',
    defaultMessage: 'Sniper',
  },
  reloading: {
    id: 'hud.reloading',
    description: 'Shown instead of the ammo count while reloading',
    defaultMessage: 'Reloading…',
  },
  noAmmo: {
    id: 'hud.noAmmo',
    description: 'Shown instead of the ammo count when the weapon has no rounds left',
    defaultMessage: 'No ammo',
  },
  fraggedBy: {
    id: 'hud.fraggedBy',
    description: 'Death message; {name} is who killed you',
    defaultMessage: 'Fragged by {name}',
  },
  suicide: {
    id: 'hud.suicide',
    description: 'Death message when you killed yourself (fall, slime)',
    defaultMessage: 'You fragged yourself',
  },
  respawning: {
    id: 'hud.respawning',
    description: 'Countdown until respawn',
    defaultMessage: 'Respawning in {seconds}…',
  },
  feedSuicide: {
    id: 'feed.suicide',
    description: 'Kill feed line for a suicide; {victim} is the player',
    defaultMessage: '{victim} fragged themselves',
  },
  feedHeadshot: {
    id: 'feed.headshot',
    description: 'Accessible label of the headshot mark in the kill feed',
    defaultMessage: 'Headshot',
  },
  muted: {
    id: 'hud.muted',
    description: 'Shown while game sounds are off',
    defaultMessage: 'Sound off (M)',
  },
  connecting: {
    id: 'hud.connecting',
    description: 'Shown while the game connects to its server',
    defaultMessage: 'Connecting to the arena server…',
  },
  connectionFailed: {
    id: 'hud.connectionFailed',
    description: 'Shown when the game cannot reach its server; it keeps retrying',
    defaultMessage: "Can't reach the arena server. Trying again…",
  },
});
