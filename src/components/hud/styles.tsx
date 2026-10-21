import styled, { css, keyframes } from 'styled-components';
import { HUD_COLORS, HUD_FONT } from './constants';

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0;
  }
`;

const Layer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: ${HUD_COLORS.text};
  font-family: ${HUD_FONT};
  text-shadow: 2px 2px 0 #000;
`;

const Crosshair = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);

  &::before, &::after {
    content: '';
    position: absolute;
    background: ${HUD_COLORS.accent};
    box-shadow: 0 0 0 1px #000;
  }

  &::before { left: 8px; top: 0; width: 2px; height: 18px; }
  &::after { top: 8px; left: 0; width: 18px; height: 2px; }
`;

const HitMarker = styled.div<{ $head: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%) rotate(45deg);
  animation: ${fadeOut} 250ms ease-out forwards;
  ${noMotion}

  &::before, &::after {
    content: '';
    position: absolute;
    background: ${({ $head }) => ($head ? HUD_COLORS.headshot : HUD_COLORS.hit)};
  }

  &::before { left: 13px; top: 0; width: 2px; height: 28px; }
  &::after { top: 13px; left: 0; width: 28px; height: 2px; }
`;

const DamageFlash = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(255, 0, 0, 0.55) 100%);
  animation: ${fadeOut} 450ms ease-out forwards;
  ${noMotion}
`;

const Corner = styled.div<{ $top?: boolean; $right?: boolean }>`
  position: absolute;
  ${({ $top }) => ($top ? 'top: 12px;' : 'bottom: 12px;')}
  ${({ $right }) => ($right ? 'right: 12px; text-align: right;' : 'left: 12px;')}
  padding: 8px 12px;
  background: ${HUD_COLORS.panel};
  border-radius: 4px;
`;

const Label = styled.div`
  font-size: 10px;
  opacity: 0.8;
  text-transform: uppercase;
`;

const BigNumber = styled.div<{ $danger?: boolean }>`
  font-size: 28px;
  line-height: 1.2;
  color: ${({ $danger }) => ($danger ? HUD_COLORS.danger : HUD_COLORS.text)};
`;

const Stats = styled.div`
  display: flex;
  gap: 16px;
  font-size: 14px;
`;

const Feed = styled.ul`
  position: absolute;
  top: 12px;
  right: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 11px;
  text-align: right;

  li {
    margin-bottom: 4px;
    padding: 4px 8px;
    background: ${HUD_COLORS.panel};
    border-radius: 4px;
  }
`;

const PlayerName = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
`;

const Death = styled.div`
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  font-size: 18px;
  line-height: 2;
  color: ${HUD_COLORS.danger};
`;

const Muted = styled.div`
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  opacity: 0.8;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  box-sizing: border-box;
  background: ${HUD_COLORS.overlay};
  text-align: center;
  overflow: auto;
`;

const Title = styled.h2`
  margin: 0;
  font-size: clamp(20px, 5vw, 40px);
  color: ${HUD_COLORS.accent};
  letter-spacing: 4px;
`;

const PlayButton = styled.button`
  pointer-events: auto;
  padding: 14px 28px;
  border: 3px solid ${HUD_COLORS.accent};
  border-radius: 4px;
  background: #2a1b3d;
  color: ${HUD_COLORS.accent};
  font-family: ${HUD_FONT};
  font-size: 16px;
  cursor: pointer;

  &:hover, &:focus-visible {
    background: ${HUD_COLORS.accent};
    color: #2a1b3d;
    outline: none;
  }
`;

const Controls = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 11px;
  line-height: 2;
  opacity: 0.9;
`;

const ScoreboardSlot = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

export default {
  Layer,
  Crosshair,
  HitMarker,
  DamageFlash,
  Corner,
  Label,
  BigNumber,
  Stats,
  Feed,
  PlayerName,
  Death,
  Muted,
  Overlay,
  Title,
  PlayButton,
  Controls,
  ScoreboardSlot,
};
