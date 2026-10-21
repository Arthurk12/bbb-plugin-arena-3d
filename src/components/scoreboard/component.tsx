import * as React from 'react';
import { DATA_TEST } from '../../commons/constants';
import { HUD_COLORS } from '../hud/constants';
import { nameOf } from '../hud/service';
import { intlMessages } from './messages';
import Styled from './styles';
import { ScoreboardProps } from './types';

function Scoreboard({
  intl, rows, users, currentUserId, fallbackName,
}: ScoreboardProps) {
  return (
    <Styled.Table data-test={DATA_TEST.SCOREBOARD}>
      <caption>{intl.formatMessage(intlMessages.title)}</caption>
      <thead>
        <tr>
          <th scope="col">{intl.formatMessage(intlMessages.player)}</th>
          <th scope="col">{intl.formatMessage(intlMessages.frags)}</th>
          <th scope="col">{intl.formatMessage(intlMessages.deaths)}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Styled.Row key={row.userId} $self={row.userId === currentUserId}>
            <td>
              <Styled.Name $color={users[row.userId]?.color ?? HUD_COLORS.text}>
                {nameOf(row.userId, users, fallbackName)}
              </Styled.Name>
              {row.userId === currentUserId ? ` ${intl.formatMessage(intlMessages.you)}` : null}
            </td>
            <td>{row.kills}</td>
            <td>{row.deaths}</td>
          </Styled.Row>
        ))}
      </tbody>
    </Styled.Table>
  );
}

export default Scoreboard;
