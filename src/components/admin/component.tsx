import * as React from 'react';
import { BBBModal, BBButton, BBBTypography } from '@bigbluebutton/bbb-ui-components-react';
import { DATA_TEST } from '../../commons/constants';
import { getModalParent } from './constants';
import { intlMessages } from './messages';
import Styled from './styles';
import { AdminModalProps } from './types';

function AdminModal({
  intl, isOpen, onClose, matchActive, hidden, controls, onShowArena,
}: AdminModalProps) {
  const title = intl.formatMessage(intlMessages.title);

  const runAndClose = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <BBBModal
      isOpen={isOpen}
      onRequestClose={onClose}
      parentSelector={getModalParent}
      ariaHideApp={false}
      title={title}
      contentLabel={title}
      testId={DATA_TEST.ADMIN_MODAL}
      noFooter
    >
      <Styled.Body>
        <BBBTypography>{intl.formatMessage(intlMessages.description)}</BBBTypography>
        <BBBTypography variant="selected">
          {intl.formatMessage(matchActive ? intlMessages.statusActive : intlMessages.statusIdle)}
        </BBBTypography>
        <Styled.Actions>
          {matchActive && hidden ? (
            <BBButton
              variant="tertiary"
              label={intl.formatMessage(intlMessages.showArena)}
              onClick={runAndClose(onShowArena)}
            />
          ) : null}
          {matchActive ? (
            <BBButton
              variant="secondary"
              color="danger"
              label={intl.formatMessage(intlMessages.stop)}
              dataTest={DATA_TEST.ADMIN_STOP}
              onClick={runAndClose(controls.stop)}
            />
          ) : null}
          {matchActive ? (
            <BBButton
              variant="secondary"
              label={intl.formatMessage(intlMessages.newRound)}
              dataTest={DATA_TEST.ADMIN_NEW_ROUND}
              onClick={runAndClose(controls.newRound)}
            />
          ) : (
            <BBButton
              label={intl.formatMessage(intlMessages.start)}
              dataTest={DATA_TEST.ADMIN_START}
              onClick={runAndClose(controls.start)}
            />
          )}
        </Styled.Actions>
      </Styled.Body>
    </BBBModal>
  );
}

export default AdminModal;
