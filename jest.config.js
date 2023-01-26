/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/js-with-ts",
  testEnvironment: "node",
  coverageReporters: ["text-summary", "html", "cobertura"],
  transform: {
    "^.+\\.[jt]sx?$": "ts-jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!nanoid/)"],
};
