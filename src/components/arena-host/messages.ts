import { defineMessages } from 'react-intl';

export const intlMessages = defineMessages({
  loading: {
    id: 'arena.loading',
    description: 'Shown while the game downloads',
    defaultMessage: 'Loading the arena…',
  },
  loadError: {
    id: 'arena.loadError',
    description: 'Shown when the game could not be downloaded or crashed',
    defaultMessage: 'The game could not be loaded. Hide and show the arena to try again.',
  },
});
