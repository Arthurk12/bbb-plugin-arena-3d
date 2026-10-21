import * as React from 'react';
import { pluginLogger } from 'bigbluebutton-html-plugin-sdk';
import { LOG_CODES } from '../../commons/constants';
import { ErrorBoundaryProps, ErrorBoundaryState } from './types';

/** Keeps a failed game download or crash inside the media area instead of the whole client. */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    const { pluginName } = this.props;
    pluginLogger.error(
      { logCode: LOG_CODES.GAME_LOAD_ERROR, extraInfo: { error: error.message } },
      `Failed to run the game of ${pluginName}`,
    );
  }

  render() {
    const { failed } = this.state;
    const { fallback, children } = this.props;
    return failed ? fallback : children;
  }
}

export default ErrorBoundary;
