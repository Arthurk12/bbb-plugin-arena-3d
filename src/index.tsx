import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import ArenaPlugin from './components/main/component';

const uuid = document.currentScript?.getAttribute('uuid') || 'root';

const pluginName = document.currentScript?.getAttribute('pluginName') || 'plugin';

// The script is served by the BBB server, which also runs the relay.
const scriptSrc = (document.currentScript as HTMLScriptElement | null)?.src || null;

const root = ReactDOM.createRoot(document.getElementById(uuid)!);
root.render(<ArenaPlugin pluginUuid={uuid} pluginName={pluginName} scriptSrc={scriptSrc} />);
