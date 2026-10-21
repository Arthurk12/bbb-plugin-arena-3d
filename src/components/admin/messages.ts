import { defineMessages } from 'react-intl';

export const intlMessages = defineMessages({
  title: {
    id: 'admin.title',
    description: 'Title of the moderator modal',
    defaultMessage: 'Arena 3D',
  },
  description: {
    id: 'admin.description',
    description: 'What the game is, in the moderator modal',
    defaultMessage: 'A retro first-person arena shooter for everyone in the session. Starting a match shows the arena in everyone\'s media area; each person can switch back to the presentation at any time.',
  },
  statusActive: {
    id: 'admin.statusActive',
    description: 'Status line while a match runs',
    defaultMessage: 'A match is running.',
  },
  statusIdle: {
    id: 'admin.statusIdle',
    description: 'Status line while no match runs',
    defaultMessage: 'No match is running.',
  },
  start: {
    id: 'admin.start',
    description: 'Button that starts a match',
    defaultMessage: 'Start match',
  },
  newRound: {
    id: 'admin.newRound',
    description: 'Button that starts a new round, zeroing every score',
    defaultMessage: 'New round (reset scores)',
  },
  stop: {
    id: 'admin.stop',
    description: 'Button that ends the match for everyone',
    defaultMessage: 'Stop match',
  },
  showArena: {
    id: 'admin.showArena',
    description: 'Button that brings the arena back for the moderator who hid it',
    defaultMessage: 'Show the arena',
  },
});
