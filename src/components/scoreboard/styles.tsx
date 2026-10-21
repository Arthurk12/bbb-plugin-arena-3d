import styled from 'styled-components';
import { HUD_COLORS } from '../hud/constants';

const Table = styled.table`
  min-width: min(22rem, 80vw);
  border-collapse: collapse;
  background: ${HUD_COLORS.panel};
  font-size: 12px;

  caption {
    padding: 8px;
    color: ${HUD_COLORS.accent};
  }

  th, td {
    padding: 6px 10px;
    text-align: left;
  }

  th:not(:first-child), td:not(:first-child) {
    text-align: right;
  }
`;

const Row = styled.tr<{ $self: boolean }>`
  background: ${({ $self }) => ($self ? 'rgba(255, 204, 51, 0.18)' : 'transparent')};
`;

const Name = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
`;

export default { Table, Row, Name };
