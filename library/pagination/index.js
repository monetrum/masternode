'use strict';

const Pagination = require('./pagination/pagination');
const CursorHandler = require('./pagination/cursorHandler');

Pagination.setTypes({CursorHandler});
CursorHandler.setTypes({Pagination});

module.exports = { Pagination, CursorHandler };