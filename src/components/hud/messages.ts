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
    defaultMessage: 'Mouse: aim · Click: shoot',
  },
  controlsWeapons: {
    id: 'hud.controls.weapons',
    description: 'Controls help: weapons',
    defaultMessage: '1 / 2, Q or mouse wheel: switch weapon',
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
  muted: {
    id: 'hud.muted',
    description: 'Shown while game sounds are off',
    defaultMessage: 'Sound off (M)',
  },
});
