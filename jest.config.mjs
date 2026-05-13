import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/jest.polyfill.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/tests/e2e/"],
  collectCoverageFrom: ["lib/**/*.ts", "components/**/*.tsx", "app/api/**/*.ts"],
};

export default createJestConfig(config);
