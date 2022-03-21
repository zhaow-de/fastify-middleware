module.exports = {
  roots: ["<rootDir>/test"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  coveragePathIgnorePatterns: [
    "<rootDir>/dist/",
    "<rootDir>/src/config.ts",
    "<rootDir>/src/iocConfig.ts",
    "<rootDir>/src/routes/index.ts",
    "<rootDir>/node_modules/",
    "<rootDir>/test/",
  ],
  testEnvironment: "node",
  setupFilesAfterEnv: ["./jest.setup.js"],
  moduleNameMapper: {
    "^jose/(.*)$": "<rootDir>/node_modules/jose/dist/node/cjs/$1",
  },
  coverageReporters: ['json-summary', 'text', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
