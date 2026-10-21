import styled from 'styled-components';

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: min(28rem, 80vw);
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
`;

export default { Body, Actions };
