
/*

    Polyfill for localstorage for testing in node.

*/

if(typeof window == 'undefined' && global !== undefined && global.localStorage === undefined) {
    global.localStorage = new class {

        [name: string]: any;

        get length(): number {
            return Object.keys(this).length;
        }

        clear(): void {
            for(const key in this) {
                delete this[key];
            }
        }

        getItem(key: string): string | null {
            const value = this[key];
            if(value == undefined) return null;
            if(typeof value == 'string') return value;
            if(typeof value.toString == 'function') return value.toString();
            if(typeof value == 'object') return JSON.stringify(value);
            throw new Error('Storage.getItem: Invalid item.');
        }

        key(index: number): string | null {
            return Object.keys(this)[index] ?? null;
        }

        removeItem(key: string): void {
            delete this[key];
        }

        setItem(key: string, value: string): void {
            this[key] = value;
        }

    }();
}

if(typeof window == 'undefined' && global !== undefined && global.addEventListener === undefined) {
    global.addEventListener = () => {};
}
