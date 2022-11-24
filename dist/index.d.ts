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
type AsyncFunctionArguments = Item & {
    require: NodeRequire;
    __original_require__: NodeRequire;
};
/**
 * Call as async function with arguments
 * @param args
 * @param source
 * @link https://github.com/actions/github-script/blob/main/src/async-function.ts
 * @returns
 */
export declare function callAsyncFunction(args: AsyncFunctionArguments, source: string): Promise<string>;
export declare const run: () => Promise<void>;
export {};
