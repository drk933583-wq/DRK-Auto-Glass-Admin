import { render as reports } from './reports.js';
export const render = (root, session) => reports(root, session, '', { overview: true });
