/* eslint-env jest, node */

// Mock for nanoid module using CommonJS syntax
const nanoid = jest.fn(() => 'mock-id-' + Math.random().toString(36).substr(2, 9));

module.exports = { nanoid };
module.exports.default = nanoid; 