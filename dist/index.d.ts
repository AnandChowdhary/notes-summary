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
export declare function callAsyncFunction<T = string>(args: AsyncFunctionArguments, source: string): Promise<T>;
export declare const wrapRequire: any;
export declare const run: () => Promise<void>;
export {};
