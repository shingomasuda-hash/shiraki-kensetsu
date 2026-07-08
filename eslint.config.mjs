import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/**",
      "playwright-report/**",
      "test-results/**",
      ".design_build_tmp/**",
    ],
  },
];

export default eslintConfig;
