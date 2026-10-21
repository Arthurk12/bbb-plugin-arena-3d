import { defineMessages } from 'react-intl';

export const intlMessages = defineMessages({
  webglError: {
    id: 'arena.webglError',
    description: 'Shown when the browser cannot draw 3D graphics',
    defaultMessage: 'Your browser can\'t draw 3D graphics (WebGL is off or unsupported), so the arena can\'t run here.',
  },
});
