import styled from 'styled-components';

const Root = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  user-select: none;
`;

const Viewport = styled.div`
  position: absolute;
  inset: 0;
`;

export default { Root, Viewport };
