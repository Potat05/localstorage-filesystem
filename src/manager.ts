
/*

    Directory structure


    TODO: Redo EVERYTHING. (It's all dogshit.)
    Sorta just made this in a span of 2 days, It's very bad how it's implemented currently.


    CURRENT STRUCTURE:
        All parameters are seperated by ':'
        FILE LIST ARRAY:
            filename path
            filename data encoded with base64
            FILE DATA
                1 byte - compression method
                1 byte - encryption method
                length - 2 bytes - data (encrypted & compressed)
    
    EXAMPLE: 'message.txt:AABIZWxsbywgV29ybGQh'


    FUTURE STRUCTURE:
        4 byte - "LSDR" signature (Local Storage DiRectory)
        2 byte - Version (Always 1)
        4 byte - CRC32 (CRC32 for every byte after this.)
        1 byte - Directory Encryption method (Encryption for every byte after this.)
        1 byte - FILE LIST COMPRESSION METHOD
        4 byte - FILE LIST LENGTH
        FILE LIST LENGTH: (Compressed with FILE LIST COMPRESSION METHOD)
            File list data. An array of files until the end of file list.
            FILE:
                VARIABLE BYTES - File name null terminated string
                1 byte - File compression method
                1 byte - File encryption method
                4 byte - File offset
                4 byte - File compressed length
    

*/

import * as aesjs from "aes-js";
import Pako = require("pako");
import { syncScrypt } from "scrypt-js";



const SPLITTER = ':';
const REGEX_INVALID_PATH_CHARS = /[:]/;



namespace Base64 {

    export function encode(buffer: ArrayBuffer): string {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    }
    
    export function decode(data: string): ArrayBuffer {
        return Uint8Array.from(atob(data), c => c.charCodeAt(0));
    }

}





namespace Compression {

    export enum Method {
        None,
        Deflate
    }



    const compress = {
        [Method.None]: (uncompressed: ArrayBuffer): ArrayBuffer => {
            return uncompressed;
        },
        [Method.Deflate]: (uncompressed: ArrayBuffer): ArrayBuffer => {
            return Pako.deflate(uncompressed);
        }
    }

    const decompress = {
        [Method.None]: (compressed: ArrayBuffer): ArrayBuffer => {
            return compressed;
        },
        [Method.Deflate]: (compressed: ArrayBuffer): ArrayBuffer => {
            return Pako.inflate(compressed);
        }
    }



    export function compressData(data: ArrayBuffer, method: Method): ArrayBuffer {

        if(!(method in Method)) {
            throw new Error(`Compression.compressData: Invalid compression method. ${method}`);
        }

        const compressFunc = compress[method];
        if(compressFunc === undefined) {
            throw new Error(`Compression.compressData: Unsupported compression method. ${Method[method]}`);
        }

        return compressFunc(data);

    }

    export function decompressData(data: ArrayBuffer, method: Method): ArrayBuffer {

        if(!(method in Method)) {
            throw new Error(`Compression.compressData: Invalid compression method. ${method}`);
        }

        const decompressFunc = decompress[method];
        if(decompressFunc === undefined) {
            throw new Error(`Compression.decompressData: Unsupported decompression method. ${Method[method]}`);
        }

        return decompressFunc(data);

    }

}



namespace Encryption {

    export enum Method {
        None,
        AES_128,
        AES_192,
        AES_256
    }



    const keySizes = {
        [Encryption.Method.None]: 0,
        [Encryption.Method.AES_128]: 16,
        [Encryption.Method.AES_192]: 24,
        [Encryption.Method.AES_256]: 32
    }



    function encryptAES(unencrypted: ArrayBuffer, key: ArrayBuffer): ArrayBuffer {
        const aesCtr = new aesjs.ModeOfOperation.ctr(new Uint8Array(key));
        return aesCtr.encrypt(unencrypted);
    }

    function decryptAES(encrypted: ArrayBuffer, key: ArrayBuffer): ArrayBuffer {
        const aesCtr = new aesjs.ModeOfOperation.ctr(new Uint8Array(key));
        return aesCtr.decrypt(encrypted);
    }

    const encrypt = {
        [Encryption.Method.None]: (unincrypted: ArrayBuffer): ArrayBuffer => {
            return unincrypted;
        },
        [Encryption.Method.AES_128]: encryptAES,
        [Encryption.Method.AES_192]: encryptAES,
        [Encryption.Method.AES_256]: encryptAES
    }

    const decrypt = {
        [Encryption.Method.None]: (encrypted: ArrayBuffer): ArrayBuffer => {
            return encrypted;
        },
        [Encryption.Method.AES_128]: decryptAES,
        [Encryption.Method.AES_192]: decryptAES,
        [Encryption.Method.AES_256]: decryptAES
    }


    
    export type Password = string | number[] | ArrayBuffer | Uint8Array;

    const SALT = new Uint8Array([
        0xAB, 0x24, 0xED, 0x52,
        0x35, 0x6B, 0xD0, 0x90,
        0x05, 0x6C, 0x3D, 0xAF,
        0xF1, 0xC3, 0x46, 0x60,
        0xCF, 0x82, 0x8D, 0x79,
        0x07, 0x74, 0xA1, 0x56,
        0x4C, 0xC4, 0x38, 0xBF,
        0x67, 0x27, 0x70, 0x57
    ]);
    
    function deriveKey(password: Password, size: number): ArrayBuffer {
        if(typeof password == 'string') {
            const passwordBytes = new TextEncoder().encode(password.normalize('NFKC'));
            password = syncScrypt(passwordBytes, SALT, 1024, 8, 1, size);
        }
        if(Array.isArray(password)) {
            password = new Uint8Array(password);
        }
        if(password instanceof Uint8Array) {
            password = password.buffer;
        }
        if(password.byteLength != size) {
            throw new Error('deriveKey: Invalid password.');
        }
        return password;
    }



    export function encryptData(data: ArrayBuffer, method: Method, password?: Password): ArrayBuffer {

        if(!(method in Method)) {
            throw new Error(`Encryption.encryptData: Invalid encryption method. "${method}"`);
        }

        if(method == Method.None) return data;

        if(password === undefined) {
            throw new Error('Encryption.encryptData: Must provide key if encrypting.');
        }

        const key = deriveKey(password, keySizes[method]);

        const encryptFunc = encrypt[method];
        if(encryptFunc === undefined) {
            throw new Error(`Encryption.encryptData: Unsupported encryption method. "${Method[method]}"`);
        }

        return encryptFunc(data, key);

    }

    export function decryptData(data: ArrayBuffer, method: Method, password?: Password): ArrayBuffer {

        if(!(method in Method)) {
            throw new Error(`Encryption.decryptData: Invalid decryption method. "${method}"`);
        }

        if(method == Method.None) return data;

        if(password === undefined) {
            throw new Error('Encryption.decryptData: Must provide key if decrypting.');
        }

        const key = deriveKey(password, keySizes[method]);

        const decryptFunc = decrypt[method];
        if(decryptFunc === undefined) {
            throw new Error(`Encryption.decryptData: Unsupported decryption method. "${Method[method]}"`);
        }

        return decryptFunc(data, key);

    }

}





type FileGetOptions = {

    /**
     * Get file contents as type.  
     * @default 'buffer'  
     */
    as?: 'buffer' | 'string';

    /**
     * Password used to decrypt the file if necessary.  
     * If the password is a string it will use pbkdf to derive the key.  
     * @default ''  
     */
    password?: Encryption.Password;
}



type FileSetOptions = {

    /**
     * Compression method the file should use.
     * @default Compression.Method.Deflate
     */
    compressionMethod?: Compression.Method;

    /**
     * Encryption method the file should use.  
     * @default Encryption.Method.AES_256  
     * If password is not set it will default to None.  
     *   
     * WARNING:  
     * The creator of this has no idea how encryption works.  
     * They just put it all together how they think it should be.  
     * This is not validated on how it should actually be implemented.  
     */
    encryptionMethod?: Encryption.Method;

    /**
     * Password for encryption of the file.  
     * If the password is a string it will use pbkdf to derive the key.  
     * If password is undefined and encryption method is not none, an error will be thrown.  
     * @default undefined  
     *   
     * WARNING:  
     * The creator of this has no idea how encryption works.  
     * They just put it all together how they think it should be.  
     * This is not validated on how it should actually be implemented.  
     */
    password?: Encryption.Password;

}



type FileSetOutputInfo = {
    /**
     * Compression method the file was compressed with.  
     */
    compressionMethod: Compression.Method;
    /**
     * The compression ratio of the file.  
     */
    compressionRatio: number;
    /**
     * Encryption method the file was encrypted with.  
     */
    encryptionMethod: Encryption.Method;
}



function validatePath(path: string): string {
    if(REGEX_INVALID_PATH_CHARS.test(path)) {
        throw new Error('validatePath: Invalid path characters.');
    }
    path = path.replace(/[\\\/]/g, '\\');
    return path;
}



/**
 * This may be pretty slow, but it sort of doesn't matter.
 * Because almost all browsers have a max limit of 5mb.
 * 
 * TODO: Directory encryption.
 */
class Directory {

    public readonly entryName: string;

    /** Files in compressed base64 form. */
    public files: {[path: string]: string} = {};



    constructor(entryName: string = 'localstorage-filesystem') {
        this.entryName = entryName;

        // Load from storage.
        this.load();

        // Save to storage on page leave.
        addEventListener('beforeunload', () => this.save());
    }



    /** Get contents of a file. */
    public get(path: string, options?: FileGetOptions | { as: 'buffer' }): ArrayBuffer;
    public get(path: string, options?: FileGetOptions | { as: 'string' }): string;
    public get(path: string, options: FileGetOptions = {}): unknown | undefined {
        path = validatePath(path);

        // Get file string.
        const string = this.files[path];
        if(string === undefined) return undefined;

        // Decode base64
        const decoded = Base64.decode(string);

        // Decrypt
        const encryptionMethod: Encryption.Method = new Uint8Array(decoded)[1];
        const decrypted = Encryption.decryptData(decoded.slice(2), encryptionMethod, options.password);
        
        // Decompress
        const compressionMethod: Compression.Method = new Uint8Array(decoded)[0];
        const decompressed = Compression.decompressData(decrypted, compressionMethod);

        // Return
        switch(options.as ?? 'buffer') {
            case 'buffer': return decompressed;
            case 'string': return new TextDecoder('utf-8').decode(decompressed);
            default: throw new Error(`Directory.get: Invalid get as type. "${options.as}"`);
        }

    }

    /** Set contents of a file. */
    public set(path: string, data: ArrayBuffer | string, options: FileSetOptions = {}): FileSetOutputInfo {
        path = validatePath(path);

        // Always array buffer
        if(typeof data == 'string') {
            data = new TextEncoder().encode(data);
        }

        // Compress
        const compressionMethod = options.compressionMethod ?? Compression.Method.Deflate;
        const compressed = Compression.compressData(data, compressionMethod);

        // Encrypt
        const encryptionMethod = options.encryptionMethod ?? Encryption.Method.AES_256;
        const encrypted = Encryption.encryptData(compressed, encryptionMethod, options.password);

        // File header
        const storeData = new ArrayBuffer(encrypted.byteLength + 2);
        new Uint8Array(storeData)[0] = compressionMethod;
        new Uint8Array(storeData)[1] = encryptionMethod;
        new Uint8Array(storeData).set(new Uint8Array(encrypted), 2);

        // Encode base64
        const encoded = Base64.encode(storeData);

        // Set file
        this.files[path] = encoded;

        return {
            compressionMethod,
            compressionRatio: compressed.byteLength / data.byteLength,
            encryptionMethod
        }

    }



    /** Remove a file. */
    public remove(path: string): void {
        path = validatePath(path);
        delete this.files[path];
    }

    /** Does a file exist. */
    public exists(path: string): boolean {
        path = validatePath(path);
        return this.files[path] !== undefined;
    }

    /** Removes every file in directory. */
    public clear(): void {
        this.files = {};
    }



    public fromString(text: string): void {

        const split = text.split(SPLITTER);
        if(split.length == 1) return;
        if(split.length % 2 != 0) {
            throw new Error('Directory.fromString: Invalid string.');
        }
        this.files = Object.fromEntries(
            split.reduce((acc, item, index) => {
                const i = index >> 1;
                // @ts-ignore
                if(!acc[i]) acc[i] = [];
                acc[i].push(item);
                return acc;
            }, [] as [ string, string ][])
        );

    }

    public toString(): string {

        return Object.entries(this.files)
            .flat()
            .join(SPLITTER);

    }

    /** Size of directory on localstorage. */
    public sizeOnLocalStorage(): number {
        let size = 0;


        // Key
        size += this.entryName.length;
        size += 2; // ""
        size ++; // :

        // Value
        for(const path in this.files) {
            size += path.length; // file path
            size += this.files[path].length; // file content
            size += 2; // ; seperater
        }
        size--; // No ending :
        size += 2; // ""


        return size;
    }

    /** Load directory contents from localstorage. (Will overwrite everything in this.) */
    public load(entryName: string = this.entryName): void {
        this.clear();
        this.fromString(localStorage.getItem(entryName) ?? '')
    }

    /** Save current contents of directory to localstorage. (Will automatically be called on page beforeunload.) */
    public save(entryName: string = this.entryName): void {
        localStorage.setItem(entryName, this.toString());
    }

}



export { Directory, Compression, Encryption };
