/// <reference types="node" />
import { Query, QueryProto, IntegerTypeCastOptions } from './query';
import { PathType } from '.';
import * as Protobuf from 'protobufjs';
import { google } from '../proto/datastore';
export declare namespace entity {
    interface InvalidKeyErrorOptions {
        code: string;
    }
    class InvalidKeyError extends Error {
        constructor(opts: InvalidKeyErrorOptions);
    }
    /**
     * A symbol to access the Key object from an entity object.
     *
     * @type {symbol}
     * @private
     */
    const KEY_SYMBOL: unique symbol;
    /**
     * Build a Datastore Double object. For long doubles, a string can be
     * provided.
     *
     * @class
     * @param {number} value The double value.
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const aDouble = datastore.double(7.3);
     */
    class Double {
        type: string;
        value: number;
        constructor(value: number);
    }
    /**
     * Check if something is a Datastore Double object.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsDouble(value?: {}): boolean;
    /**
     * Check if a value is a Datastore Double object converted from JSON.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsDoubleLike(value: unknown): boolean;
    /**
     * Build a Datastore Int object. For long integers, a string can be provided.
     *
     * @class
     * @param {number|string} value The integer value.
     * @param {object} [typeCastOptions] Configuration to convert
     *     values of `integerValue` type to a custom value. Must provide an
     *     `integerTypeCastFunction` to handle `integerValue` conversion.
     * @param {function} typeCastOptions.integerTypeCastFunction A custom user
     *     provided function to convert `integerValue`.
     * @param {sting|string[]} [typeCastOptions.properties] `Entity` property
     *     names to be converted using `integerTypeCastFunction`.
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const anInt = datastore.int(7);
     */
    class Int extends Number {
        type: string;
        value: string;
        typeCastFunction?: Function;
        typeCastProperties?: string[];
        private _entityPropertyName;
        constructor(value: number | string | ValueProto, typeCastOptions?: IntegerTypeCastOptions);
        valueOf(): any;
        toJSON(): Json;
    }
    /**
     * Check if something is a Datastore Int object.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsInt(value?: {}): boolean;
    /**
     * Check if a value is a Datastore Int object converted from JSON.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsIntLike(value: unknown): boolean;
    interface Coordinates {
        latitude: number;
        longitude: number;
    }
    /**
     * Build a Datastore Geo Point object.
     *
     * @class
     * @param {object} coordinates Coordinate value.
     * @param {number} coordinates.latitude Latitudinal value.
     * @param {number} coordinates.longitude Longitudinal value.
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const coordinates = {
     *   latitude: 40.6894,
     *   longitude: -74.0447
     * };
     *
     * const geoPoint = datastore.geoPoint(coordinates);
     */
    class GeoPoint {
        value: Coordinates;
        constructor(coordinates: Coordinates);
    }
    /**
     * Check if something is a Datastore Geo Point object.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsGeoPoint(value?: {}): boolean;
    interface KeyOptions {
        namespace?: string;
        path: PathType[];
    }
    /**
     * Build a Datastore Key object.
     *
     * @class
     * @param {object} options Configuration object.
     * @param {array} options.path Key path.
     * @param {string} [options.namespace] Optional namespace.
     *
     * @example
     * //-
     * // Create an incomplete key with a kind value of `Company`.
     * //-
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const key = datastore.key('Company');
     *
     * @example
     * //-
     * // Create a complete key with a kind value of `Company` and id`123`.
     * //-
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const key = datastore.key(['Company', 123]);
     *
     * @example
     * //-
     * // If the ID integer is outside the bounds of a JavaScript Number
     * // object, create an Int.
     * //-
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const key = datastore.key([
     *   'Company',
     *   datastore.int('100000000000001234')
     * ]);
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * // Create a complete key with a kind value of `Company` and name `Google`.
     * // Note: `id` is used for numeric identifiers and `name` is used otherwise.
     * const key = datastore.key(['Company', 'Google']);
     *
     * @example
     * //-
     * // Create a complete key from a provided namespace and path.
     * //-
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const key = datastore.key({
     *   namespace: 'My-NS',
     *   path: ['Company', 123]
     * });
     *
     * @example <caption>Serialize the key for later re-use.</caption>
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const key = datastore.key({
     *   namespace: 'My-NS',
     *   path: ['Company', 123]
     * });
     * // Later...
     * const key = datastore.key(key.serialized);
     */
    class Key {
        namespace?: string;
        id?: string;
        name?: string;
        kind: string;
        parent?: Key;
        path: Array<string | number>;
        constructor(options: KeyOptions);
        /**
         * Access the `serialized` property for a library-compatible way to re-use a
         * key.
         *
         * @returns {object}
         *
         * @example
         * const key = datastore.key({
         *   namespace: 'My-NS',
         *   path: ['Company', 123]
         * });
         *
         * // Later...
         * const key = datastore.key(key.serialized);
         */
        get serialized(): {
            namespace: string | undefined;
            path: (string | Int)[];
        };
    }
    /**
     * Check if something is a Datastore Key object.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsKey(value?: {}): boolean;
    /**
     * @typedef {object} IntegerTypeCastOptions Configuration to convert
     *     values of `integerValue` type to a custom value. Must provide an
     *     `integerTypeCastFunction` to handle `integerValue` conversion.
     * @property {function} integerTypeCastFunction A custom user
     *     provided function to convert `integerValue`.
     * @property {string | string[]} [properties] `Entity` property
     *     names to be converted using `integerTypeCastFunction`.
     */
    /**
     * Convert a protobuf Value message to its native value.
     *
     * @private
     * @param {object} valueProto The protobuf Value message to convert.
     * @param {boolean | IntegerTypeCastOptions} [wrapNumbers=false] Wrap values of integerValue type in
     *     {@link Datastore#Int} objects.
     *     If a `boolean`, this will wrap values in {@link Datastore#Int} objects.
     *     If an `object`, this will return a value returned by
     *     `wrapNumbers.integerTypeCastFunction`.
     *     Please see {@link IntegerTypeCastOptions} for options descriptions.
     * @returns {*}
     *
     * @example
     * decodeValueProto({
     *   booleanValue: false
     * });
     * // false
     *
     * decodeValueProto({
     *   stringValue: 'Hi'
     * });
     * // 'Hi'
     *
     * decodeValueProto({
     *   blobValue: Buffer.from('68656c6c6f')
     * });
     * // <Buffer 68 65 6c 6c 6f>
     */
    function decodeValueProto(valueProto: ValueProto, wrapNumbers?: boolean | IntegerTypeCastOptions): any;
    /**
     * Convert any native value to a protobuf Value message object.
     *
     * @private
     * @param {*} value Native value.
     * @returns {object}
     *
     * @example
     * encodeValue('Hi');
     * // {
     * //   stringValue: 'Hi'
     * // }
     */
    function encodeValue(value: any, property: string): ValueProto;
    /**
     * Convert any entity protocol to a plain object.
     *
     * @todo Use registered metadata if provided.
     *
     * @private
     * @param {object} entityProto The protocol entity object to convert.
     * @param {boolean | IntegerTypeCastOptions} [wrapNumbers=false] Wrap values of integerValue type in
     *     {@link Datastore#Int} objects.
     *     If a `boolean`, this will wrap values in {@link Datastore#Int} objects.
     *     If an `object`, this will return a value returned by
     *     `wrapNumbers.integerTypeCastFunction`.
     *     Please see {@link IntegerTypeCastOptions} for options descriptions.
     * @returns {object}
     *
     * @example
     * entityFromEntityProto({
     *   properties: {
     *     map: {
     *       name: {
     *         value: {
     *           valueType: 'stringValue',
     *           stringValue: 'Stephen'
     *         }
     *       }
     *     }
     *   }
     * });
     * // {
     * //   name: 'Stephen'
     * // }
     */
    function entityFromEntityProto(entityProto: EntityProto, wrapNumbers?: boolean | IntegerTypeCastOptions): any;
    /**
     * Convert an entity object to an entity protocol object.
     *
     * @private
     * @param {object} entityObject The entity object to convert.
     * @returns {object}
     *
     * @example
     * entityToEntityProto({
     *   excludeFromIndexes: [
     *     'name'
     *   ],
     *   data: {
     *     name: 'Burcu',
     *     legit: true
     *   }
     * });
     * // {
     * //   key: null,
     * //   properties: {
     * //     name: {
     * //       stringValue: 'Burcu'
     * //       excludeFromIndexes: true
     * //     },
     * //     legit: {
     * //       booleanValue: true
     * //     }
     * //   }
     * // }
     */
    function entityToEntityProto(entityObject: EntityObject): EntityProto;
    /**
     * Convert an API response array to a qualified Key and data object.
     *
     * @private
     * @param {object[]} results The response array.
     * @param {object} results.entity An entity object.
     * @param {object} results.entity.key The entity's key.
     * @param {boolean | IntegerTypeCastOptions} [wrapNumbers=false] Wrap values of integerValue type in
     *     {@link Datastore#Int} objects.
     *     If a `boolean`, this will wrap values in {@link Datastore#Int} objects.
     *     If an `object`, this will return a value returned by
     *     `wrapNumbers.integerTypeCastFunction`.
     *     Please see {@link IntegerTypeCastOptions} for options descriptions.
     *
     * @example
     * request_('runQuery', {}, (err, response) => {
     *   const entityObjects = formatArray(response.batch.entityResults);
     *   // {
     *   //   key: {},
     *   //   data: {
     *   //     fieldName: 'value'
     *   //   }
     *   // }
     *   //
     * });
     */
    function formatArray(results: ResponseResult[], wrapNumbers?: boolean | IntegerTypeCastOptions): any[];
    /**
     * Find the properties which value size is large than 1500 bytes,
     * with excludeLargeProperties enabled, automatically exclude properties from indexing.
     * This will allow storing string values larger than 1500 bytes
     *
     * @param entities Datastore key object(s).
     * @param path namespace of provided entity properties
     * @param properties properties which value size is large than 1500 bytes
     */
    function findLargeProperties_(entities: Entities, path: string, properties?: string[]): string[];
    /**
     * Check if a key is complete.
     *
     * @private
     * @param {Key} key The Key object.
     * @returns {boolean}
     *
     * @example
     * isKeyComplete(new Key(['Company', 'Google'])); // true
     * isKeyComplete(new Key('Company')); // false
     */
    function isKeyComplete(key: Key): boolean;
    /**
     * Convert a key protocol object to a Key object.
     *
     * @private
     * @param {object} keyProto The key protocol object to convert.
     * @returns {Key}
     *
     * @example
     * const key = keyFromKeyProto({
     *   partitionId: {
     *     projectId: 'project-id',
     *     namespaceId: ''
     *   },
     *   path: [
     *     {
     *       kind: 'Kind',
     *       id: '4790047639339008'
     *     }
     *   ]
     * });
     */
    function keyFromKeyProto(keyProto: KeyProto): Key;
    /**
     * Convert a Key object to a key protocol object.
     *
     * @private
     * @param {Key} key The Key object to convert.
     * @returns {object}
     *
     * @example
     * const keyProto = keyToKeyProto(new Key(['Company', 1]));
     * // {
     * //   path: [
     * //     {
     * //       kind: 'Company',
     * //       id: 1
     * //     }
     * //   ]
     * // }
     */
    function keyToKeyProto(key: Key): KeyProto;
    /**
     * Convert a query object to a query protocol object.
     *
     * @private
     * @param {object} q The query object to convert.
     * @returns {object}
     *
     * @example
     * queryToQueryProto({
     *   namespace: '',
     *   kinds: [
     *     'Kind'
     *   ],
     *   filters: [],
     *   orders: [],
     *   groupByVal: [],
     *   selectVal: [],
     *   startVal: null,
     *   endVal: null,
     *   limitVal: -1,
     *   offsetVal: -1
     * });
     * // {
     * //   projection: [],
     * //   kinds: [
     * //     {
     * //       name: 'Kind'
     * //     }
     * //   ],
     * //   order: [],
     * //   groupBy: []
     * // }
     */
    function queryToQueryProto(query: Query): QueryProto;
    /**
     * URL safe key encoding and decoding helper utility.
     *
     *  This is intended to work with the "legacy" representation of a
     * datastore "Key" used within Google App Engine (a so-called "Reference").
     *
     * @private
     * @class
     */
    class URLSafeKey {
        protos: any;
        constructor();
        /**
         *  Load AppEngine protobuf file.
         *
         *  @private
         */
        loadProtos_(): {
            [k: string]: Protobuf.ReflectionObject;
        } | undefined;
        /**
         * Convert key to url safe base64 encoded string.
         *
         * @private
         * @param {string} projectId Project Id.
         * @param {entity.Key} key Entity key object.
         * @param {string} locationPrefix Optional .
         *  The location prefix of an App Engine project ID.
         *  Often this value is 's~', but may also be 'e~', or other location prefixes
         *  currently unknown.
         * @returns {string} base64 endocded urlsafe key.
         */
        legacyEncode(projectId: string, key: entity.Key, locationPrefix?: string): string;
        /**
         * Helper to convert URL safe key string to entity key object
         *
         * This is intended to work with the "legacy" representation of a
         * datastore "Key" used within Google App Engine (a so-called "Reference").
         *
         * @private
         * @param {entity.Key} key Entity key object.
         * @param {string} locationPrefix Optional .
         *  The location prefix of an App Engine project ID.
         *  Often this value is 's~', but may also be 'e~', or other location prefixes
         *  currently unknown.
         * @returns {string} Created urlsafe key.
         */
        legacyDecode(key: string): entity.Key;
        /**
         * Convert buffer to base64 encoding.
         *
         * @private
         * @param {Buffer} buffer
         * @returns {string} Base64 encoded string.
         */
        convertToBase64_(buffer: Buffer): string;
        /**
         * Rebuild base64 from encoded url safe string and convert to buffer.
         *
         * @private
         * @param {string} val Encoded url safe string.
         * @returns {string} Base64 encoded string.
         */
        convertToBuffer_(val: string): Buffer;
    }
}
export interface ValueProto {
    [index: string]: any;
    valueType?: string;
    values?: ValueProto[];
    value?: any;
    propertyName?: string;
}
export interface EntityProto {
    key?: KeyProto | null;
    properties?: {
        [k: string]: ValueProto;
    };
    excludeFromIndexes?: boolean;
}
export declare type Entity = any;
export declare type Entities = Entity | Entity[];
interface KeyProtoPathElement extends google.datastore.v1.Key.IPathElement {
    [index: string]: any;
    idType?: string;
}
export interface KeyProto {
    partitionId?: google.datastore.v1.IPartitionId | null;
    path?: KeyProtoPathElement[] | null;
}
export interface ResponseResult {
    entity: EntityProto;
}
export interface EntityObject {
    data: {
        [k: string]: Entity;
    };
    excludeFromIndexes: string[];
}
export interface Json {
    [field: string]: string;
}
export {};
