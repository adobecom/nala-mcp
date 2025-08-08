export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": ["warn", { allow: ["error"] }],
      "quotes": ["error", "single"],
      "semi": ["error", "always"]
    }
  }
];