// Metro 설정 — SVG 파일을 React 컴포넌트로 import 가능하게 함.
//   import MyIcon from './icon.svg';
//   <MyIcon width={24} height={24} />
//
// react-native-svg-transformer 사용. assets/images/main_char.svg 등 큰 SVG도 처리.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

module.exports = config;
