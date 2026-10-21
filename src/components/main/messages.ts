import { defineMessages } from 'react-intl';

export const intlMessages = defineMessages({
  appName: {
    id: 'app.name',
    description: 'Name of the plugin in the apps gallery',
    defaultMessage: 'Arena 3D',
  },
  showArena: {
    id: 'mediaArea.showArena',
    description: 'Media-area option that brings the game back',
    defaultMessage: 'Show Arena 3D',
  },
  showPresentation: {
    id: 'mediaArea.showPresentation',
    description: 'Media-area option that hides the game and shows the presentation',
    defaultMessage: 'Show presentation',
  },
  matchStarted: {
    id: 'notification.matchStarted',
    description: 'Toast when a moderator starts a match',
    defaultMessage: 'An Arena 3D match started! Click the arena to play.',
  },
  newRound: {
    id: 'notification.newRound',
    description: 'Toast when a moderator starts a new round',
    defaultMessage: 'New round: scores are back to zero.',
  },
  unknownPlayer: {
    id: 'players.unknown',
    description: 'Name shown for a player who is no longer in the user list',
    defaultMessage: 'Player',
  },
});
