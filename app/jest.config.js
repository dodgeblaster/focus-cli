/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverageFrom: ['src/focus/**/*.ts'],
    testPathIgnorePatterns: ['<rootDir>/lib/'],
    globals: {
        'ts-jest': {
            isolatedModules: true
        }
    }
}
