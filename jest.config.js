module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    modulePaths: ['<rootDir>/src'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};