import * as React from 'react';
import { DATA_TEST } from '../../commons/constants';
import { useStore } from '../../store/hooks';
import { intlMessages as arenaMessages } from '../arena/messages';
import { intlMessages as mainMessages } from '../main/messages';
import Scoreboard from '../scoreboard/component';
import { HEADSHOT_ICON, HUD_COLORS, LOW_HEALTH } from './constants';
import { intlMessages } from './messages';
import { nameOf } from './service';
import Styled from './styles';
import { HudProps } from './types';

const CONTROLS = [
  intlMessages.controlsMove,
  intlMessages.controlsAim,
  intlMessages.controlsWeapons,
  intlMessages.controlsOther,
];

/** Everything drawn over the 3D view. Re-renders only when the game reports a change. */
function Hud({ hud, session, onPlay }: HudProps) {
  const state = useStore(hud);
  const { intl, users, currentUserId } = useStore(session.state);
  const fallback = intl.formatMessage(mainMessages.unknownPlayer);
  const name = (userId: string) => nameOf(userId, users, fallback);
  const color = (userId: string) => users[userId]?.color ?? HUD_COLORS.text;
  const outOfAmmo = state.mag + state.reserve === 0;
  let ammoText = `${state.mag} / ${state.reserve}`;
  if (state.reloading) ammoText = intl.formatMessage(intlMessages.reloading);
  else if (outOfAmmo) ammoText = intl.formatMessage(intlMessages.noAmmo);

  if (state.webglError) {
    return (
      <Styled.Overlay role="alert">
        {intl.formatMessage(arenaMessages.webglError)}
      </Styled.Overlay>
    );
  }

  const scoreboard = (
    <Scoreboard
      intl={intl}
      rows={state.scoreboard}
      users={users}
      currentUserId={currentUserId}
      fallbackName={fallback}
    />
  );

  return (
    <Styled.Layer>
      {state.connection === 'connecting' || state.connection === 'failed' ? (
        <Styled.Notice role="status">
          {intl.formatMessage(state.connection === 'failed'
            ? intlMessages.connectionFailed
            : intlMessages.connecting)}
        </Styled.Notice>
      ) : null}
      {state.scoped ? <Styled.Scope /> : null}
      {state.alive && state.locked && !state.scoped ? <Styled.Crosshair /> : null}
      {state.hitMarkerSeq > 0 ? (
        <Styled.HitMarker key={state.hitMarkerSeq} $kind={state.hitMarker} />
      ) : null}
      {state.damageSeq > 0 ? <Styled.DamageFlash key={state.damageSeq} /> : null}

      <Styled.Corner $top>
        <Styled.Stats data-test={DATA_TEST.HUD_SCORE}>
          <div>
            <Styled.Label>{intl.formatMessage(intlMessages.frags)}</Styled.Label>
            <Styled.BigNumber>{state.kills}</Styled.BigNumber>
          </div>
          <div>
            <Styled.Label>{intl.formatMessage(intlMessages.deaths)}</Styled.Label>
            <Styled.BigNumber>{state.deaths}</Styled.BigNumber>
          </div>
        </Styled.Stats>
      </Styled.Corner>

      <Styled.Feed aria-live="polite">
        {state.feed.map((item) => (
          <li key={item.id}>
            {item.killer === item.victim ? (
              intl.formatMessage(intlMessages.feedSuicide, { victim: name(item.victim) })
            ) : (
              <>
                <Styled.PlayerName $color={color(item.killer)}>
                  {name(item.killer)}
                </Styled.PlayerName>
                <Styled.FeedWeapon>
                  {intl.formatMessage(intlMessages[item.weapon])}
                  {item.headshot ? (
                    <Styled.FeedHeadshot
                      role="img"
                      aria-label={intl.formatMessage(intlMessages.feedHeadshot)}
                    >
                      {HEADSHOT_ICON}
                    </Styled.FeedHeadshot>
                  ) : null}
                </Styled.FeedWeapon>
                <Styled.PlayerName $color={color(item.victim)}>
                  {name(item.victim)}
                </Styled.PlayerName>
              </>
            )}
          </li>
        ))}
      </Styled.Feed>

      <Styled.Corner data-test={DATA_TEST.HUD_HEALTH}>
        <Styled.Label>{intl.formatMessage(intlMessages.health)}</Styled.Label>
        <Styled.BigNumber $danger={state.health <= LOW_HEALTH}>{state.health}</Styled.BigNumber>
      </Styled.Corner>
      <Styled.Corner $right data-test={DATA_TEST.HUD_AMMO}>
        <Styled.BigNumber>{intl.formatMessage(intlMessages[state.weapon])}</Styled.BigNumber>
        <Styled.Ammo $low={state.lowAmmo || outOfAmmo}>{ammoText}</Styled.Ammo>
      </Styled.Corner>
      {state.muted ? <Styled.Muted>{intl.formatMessage(intlMessages.muted)}</Styled.Muted> : null}

      {!state.alive ? (
        <Styled.Death role="status">
          <div>
            {state.killer === currentUserId
              ? intl.formatMessage(intlMessages.suicide)
              : intl.formatMessage(intlMessages.fraggedBy, { name: name(state.killer) })}
          </div>
          <div>{intl.formatMessage(intlMessages.respawning, { seconds: state.respawnIn })}</div>
        </Styled.Death>
      ) : null}

      {state.locked && state.showScoreboard ? (
        <Styled.ScoreboardSlot>{scoreboard}</Styled.ScoreboardSlot>
      ) : null}

      {!state.locked ? (
        <Styled.Overlay data-test={DATA_TEST.ARENA_PLAY_OVERLAY}>
          <Styled.Title>{intl.formatMessage(intlMessages.title)}</Styled.Title>
          <Styled.PlayButton type="button" onClick={onPlay}>
            {intl.formatMessage(intlMessages.clickToPlay)}
          </Styled.PlayButton>
          <Styled.Controls>
            {CONTROLS.map((message) => <li key={message.id}>{intl.formatMessage(message)}</li>)}
          </Styled.Controls>
          {state.scoreboard.length ? scoreboard : null}
        </Styled.Overlay>
      ) : null}
    </Styled.Layer>
  );
}

export default Hud;
