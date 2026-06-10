"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAsyncHooks = initAsyncHooks;
var context_js_1 = require("./src/context.js");
var initAsyncHooks_js_1 = require("./server/initAsyncHooks.js");
/**
 * Initializes and enables async context tracking for the server.
 *
 * This should be called before handling any incoming requests or calling `withRemult()`.
 * @example
 * import { remult, repo, withRemult } from 'remult';
 * import { initAsyncHooks } from 'remult/async-hooks';
 *
 * import { Task } from './entities/Task.js';
 *
 * initAsyncHooks();
 *
 * // Thx to the `initAsyncHooks` above,
 * // we have isolated async contexts with multiple `withRemult()`,
 * // without needing to initialize a `remultApi` all the time!
 * withRemult(async () => {
 *     remult.user = { id: '42' };
 *     repo(Task).find()
 * });
 *
 * withRemult(async () => {
 *     remult.user = { id: '21' };
 *     repo(Task).find()
 * });
 */
function initAsyncHooks() {
    (0, initAsyncHooks_js_1.initAsyncHooks)();
    context_js_1.RemultAsyncLocalStorage.enable();
}
