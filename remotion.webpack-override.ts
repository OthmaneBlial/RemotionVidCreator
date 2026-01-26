/**
 * Webpack override for Remotion bundling.
 * This configures webpack for the Remotion renderer.
 */
export const webpackOverride = (currentConfiguration: any) => {
  return {
    ...currentConfiguration,
    module: {
      ...currentConfiguration.module,
      rules: [
        ...(currentConfiguration.module?.rules || []),
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader", "postcss-loader"],
          type: "javascript/auto",
        },
      ],
    },
  };
};
