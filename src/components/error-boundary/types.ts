import * as React from 'react';

export interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  pluginName: string;
  children: React.ReactNode;
}

export interface ErrorBoundaryState {
  failed: boolean;
}
