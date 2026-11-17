import * as React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { pluginLogger } from 'bigbluebutton-html-plugin-sdk';
import { LOG_CODES } from '../../commons/constants';
import { createArenaEngine } from '../../game/engine/engine';
import { ArenaEngine } from '../../game/engine/types';
import { initialHudState } from '../../game/hud/service';
import { HudState } from '../../game/hud/types';
import { createStore } from '../../store/service';
import Hud from '../hud/component';
import { createEngineContextReader } from './service';
import Styled from './styles';
import { ArenaViewProps } from './types';

/** The game in the media area: mounts the engine and draws the HUD over it. */
function ArenaView({ session }: ArenaViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ArenaEngine | null>(null);
  const hud = useMemo(() => createStore<HudState>(initialHudState()), []);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return undefined;
    const { pluginName } = session.state.getSnapshot();
    const engine = createArenaEngine({
      container,
      hud,
      getContext: createEngineContextReader(session.state.getSnapshot),
      onWebglError: (error) => pluginLogger.error(
        { logCode: LOG_CODES.WEBGL_ERROR, extraInfo: { error: String(error) } },
        `WebGL is unavailable for ${pluginName}`,
      ),
      onConnectionStatus: (status) => {
        if (status !== 'failed') return;
        pluginLogger.warn(
          { logCode: LOG_CODES.RELAY_FAILED, extraInfo: { relayUrl: session.state.getSnapshot().relayUrl } },
          `Cannot reach the arena relay for ${pluginName}`,
        );
      },
    });
    engineRef.current = engine;
    pluginLogger.info({ logCode: LOG_CODES.STARTED }, `Plugin started: ${pluginName}`);
    return () => {
      engine.dispose();
      engineRef.current = null;
      pluginLogger.info({ logCode: LOG_CODES.STOPPED }, `Plugin stopped: ${pluginName}`);
    };
  }, [session, hud]);

  const play = () => engineRef.current?.requestPlay();

  return (
    <Styled.Root>
      <Styled.Viewport ref={viewportRef} />
      <Hud hud={hud} session={session} onPlay={play} />
    </Styled.Root>
  );
}

export default ArenaView;
