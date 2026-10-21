import { defineMessages } from 'react-intl';

export const intlMessages = defineMessages({
  title: {
    id: 'scoreboard.title',
    description: 'Title of the scoreboard',
    defaultMessage: 'Scores',
  },
  player: {
    id: 'scoreboard.player',
    description: 'Scoreboard column: player name',
    defaultMessage: 'Player',
  },
  frags: {
    id: 'scoreboard.frags',
    description: 'Scoreboard column: kills',
    defaultMessage: 'Frags',
  },
  deaths: {
    id: 'scoreboard.deaths',
    description: 'Scoreboard column: deaths',
    defaultMessage: 'Deaths',
  },
  you: {
    id: 'scoreboard.you',
    description: 'Marks your own row in the scoreboard',
    defaultMessage: '(you)',
  },
});
