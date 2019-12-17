const path = require('path');

module.exports = {
    moduleFileExtensions: ['js'],
    moduleDirectories: ['node_modules'],
    testPathIgnorePatterns: ['/node_modules/'],
    testRegex: '.*.test.js$',
    testURL: 'http://localhost',
    verbose: true
};
