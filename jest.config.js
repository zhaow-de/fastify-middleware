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
  coverageReporters: ['lcov', 'text', 'html'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
