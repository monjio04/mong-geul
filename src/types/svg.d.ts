// SVG 파일을 React 컴포넌트로 import 가능하게 하는 TypeScript declaration.
// react-native-svg-transformer가 .svg 파일을 빌드 시 React 컴포넌트로 변환.

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
