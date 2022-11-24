/// <reference types="node" />
interface Item {
    slug: string;
    path: string;
    source: string;
    title?: string;
    excerpt?: string;
    date: Date;
    attributes?: Record<string, unknown>;
    caption?: string;
}
/**
 * Execute a function with the given arguments using eval
 * Largely based on actions/github-script
 * @param args - Arguments for the async function
 * @param source - The source code of the async function as a string
 * @returns The result of the async function
 * @link https://github.com/actions/github-script/blob/v6.3.3/src/async-function.ts#L21
 * @license MIT
 */
export declare function callAsyncFunction<T = string>(args: Item & {
    require: NodeRequire;
    __original_require__: NodeRequire;
}, source: string): Promise<T>;
export declare const wrapRequire: any;
export declare const run: () => Promise<void>;
export {};
