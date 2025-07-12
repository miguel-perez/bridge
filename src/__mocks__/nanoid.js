/* eslint-env jest, node */

// CommonJS mock for nanoid
const nanoid = () => 'mock-id-' + Math.random().toString(36).substr(2, 9);

module.exports = nanoid;
module.exports.nanoid = nanoid; 