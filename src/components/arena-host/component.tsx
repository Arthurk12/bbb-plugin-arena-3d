import * as React from 'react';
import { Suspense } from 'react';
import { useStore } from '../../store/hooks';
import ErrorBoundary from '../error-boundary/component';
import { intlMessages } from './messages';
import Styled from './styles';
import { ArenaHostProps } from './types';

// three.js and the game download only when someone opens the arena.
const ArenaView = React.lazy(() => import(/* webpackChunkName: "game" */ '../arena/component'));

/** Main-area content: downloads the game, and shows a message while it loads or if it fails. */
function ArenaHost({ session }: ArenaHostProps) {
  const { intl, pluginName } = useStore(session.state);
  const loading = <Styled.Message>{intl.formatMessage(intlMessages.loading)}</Styled.Message>;
  return (
    <ErrorBoundary
      pluginName={pluginName}
      fallback={<Styled.Message role="alert">{intl.formatMessage(intlMessages.loadError)}</Styled.Message>}
    >
      <Suspense fallback={loading}>
        <ArenaView session={session} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default ArenaHost;
