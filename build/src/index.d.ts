/*!
 * Copyright 2018 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { GoogleAuth, GoogleAuthOptions } from 'google-auth-library';
import { ClientStub } from 'google-gax';
import { ChannelCredentials } from '@grpc/grpc-js';
import { entity } from './entity';
import { Query } from './query';
import { DatastoreRequest } from './request';
import { Transaction } from './transaction';
export declare type PathType = string | number | entity.Int;
/**
 * Idiomatic class for interacting with Cloud Datastore. Uses the lower-level
 * {@link v1.DatastoreClient} class under the hood.
 *
 * In addition to the constructor options shown here, the {@link Datastore}
 * class constructor accepts the same options accepted by
 * {@link v1.DatastoreClient}.
 *
 * <h4>The Datastore Emulator</h4>
 *
 * Make sure you have the <a href="https://cloud.google.com/sdk/downloads">
 * gcloud SDK installed</a>, then run:
 *
 * <pre>
 *   $ gcloud beta emulators datastore start --no-legacy
 * </pre>
 *
 * You will see the following printed:
 *
 * <pre>
 *   [datastore] API endpoint: http://localhost:8005
 *   [datastore] If you are using a library that supports the
 *               DATASTORE_EMULATOR_HOST environment variable, run:
 *   [datastore]
 *   [datastore]   export DATASTORE_EMULATOR_HOST=localhost:8005
 *   [datastore]
 *   [datastore] Dev App Server is now running.
 * </pre>
 *
 * Set that environment variable and your localhost Datastore will
 * automatically be used. You can also pass this address in manually with
 * `apiEndpoint`.
 *
 * Additionally, `DATASTORE_PROJECT_ID` is recognized. If you have this set,
 * you don't need to provide a `projectId`.
 *
 *
 * @class
 * @extends {DatastoreRequest}
 *
 * @see [Cloud Datastore Concepts Overview]{@link https://cloud.google.com/datastore/docs/concepts/overview}
 *
 * @param {object} [options] Configuration options.
 * @param {string} [options.apiEndpoint] Override the default API endpoint used
 *     to reach Datastore. This is useful for connecting to your local Datastore
 *     server (usually "http://localhost:8080").
 * @param {string} [options.namespace] Namespace to isolate transactions to.
 *
 * @example <caption>Import the client library</caption>
 * const {Datastore} = require('@google-cloud/datastore');
 *
 * @example <caption>Create a client that uses <a
 * href="https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application">Application
 * Default Credentials (ADC)</a>:</caption> const datastore = new Datastore();
 *
 * @example <caption>Create a client with <a
 * href="https://cloud.google.com/docs/authentication/production#obtaining_and_providing_service_account_credentials_manually">explicit
 * credentials</a>:</caption> const datastore = new Datastore({ projectId:
 * 'your-project-id', keyFilename: '/path/to/keyfile.json'
 * });
 *
 * @example <caption>Retrieving Records</caption>
 * const {Datastore} = require('@google-cloud/datastore');
 * const datastore = new Datastore();
 *
 * // Records, called "entities" in Datastore, are retrieved by using a key. The
 * // key is more than a numeric identifier, it is a complex data structure that
 * // can be used to model relationships. The simplest key has a string `kind`
 * // value, and either a numeric `id` value, or a string `name` value.
 * //
 * // A single record can be retrieved with {@link Datastore#key} and
 * // {@link Datastore#get}.
 * //-
 * const key = datastore.key(['Company', 'Google']);
 *
 * datastore.get(key, function(err, entity) {
 *   // entity = The record.
 *   // entity[datastore.KEY] = The key for this entity.
 * });
 *
 * //-
 * // <h3>Querying Records</h3>
 * //
 * // Create a query with {@link Datastore#createQuery}.
 * //-
 * const query = datastore.createQuery('Company');
 *
 * //-
 * // Multiple records can be found that match criteria with
 * // {@link Query#filter}.
 * //-
 * query.filter('location', 'CA');
 *
 * //-
 * // Records can also be ordered with {@link Query#order}.
 * //-
 * query.order('name');
 *
 * //-
 * // The number of records returned can be specified with
 * // {@link Query#limit}.
 * //-
 * query.limit(5);
 *
 * //-
 * // Records' key structures can also be queried with
 * // {@link Query#hasAncestor}.
 * //-
 * const ancestorKey = datastore.key(['ParentCompany', 'Alphabet']);
 *
 * query.hasAncestor(ancestorKey);
 *
 * //-
 * // Run the query with {@link Datastore#runQuery}.
 * //-
 * datastore.runQuery(query, (err, entities) => {
 *   // entities = An array of records.
 *
 *   // Access the Key object for an entity.
 *   const firstEntityKey = entities[0][datastore.KEY];
 * });
 *
 * @example <caption>Paginating Records</caption>
 * // Imagine building a website that allows a user to sift through hundreds of
 * // their contacts. You'll likely want to only display a subset of these at
 * // once, so you set a limit.
 * //-
 * const express = require('express');
 * const app = express();
 *
 * const NUM_RESULTS_PER_PAGE = 15;
 *
 * app.get('/contacts', (req, res) => {
 *   const query = datastore.createQuery('Contacts')
 *     .limit(NUM_RESULTS_PER_PAGE);
 *
 *   if (req.query.nextPageCursor) {
 *     query.start(req.query.nextPageCursor);
 *   }
 *
 *   datastore.runQuery(query, (err, entities, info) => {
 *     if (err) {
 *       // Error handling omitted.
 *       return;
 *     }
 *
 *     // Respond to the front end with the contacts and the cursoring token
 *     // from the query we just ran.
 *     const frontEndResponse = {
 *       contacts: entities
 *     };
 *
 *     // Check if  more results may exist.
 *     if (info.moreResults !== datastore.NO_MORE_RESULTS) {
 *       frontEndResponse.nextPageCursor = info.endCursor;
 *     }
 *
 *     res.render('contacts', frontEndResponse);
 *   });
 * });
 *
 * @example <caption>Creating Records</caption>
 * // New entities can be created and persisted with {@link Datastore#save}.
 * // The entitiy must have a key to be saved. If you don't specify an
 * // identifier for the key, one is generated for you.
 * //
 * // We will create a key with a `name` identifier, "Google".
 * //-
 * const key = datastore.key(['Company', 'Google']);
 *
 * const data = {
 *   name: 'Google',
 *   location: 'CA'
 * };
 *
 * datastore.save({
 *   key: key,
 *   data: data
 * }, (err) => {
 *   if (!err) {
 *     // Record saved successfully.
 *   }
 * });
 *
 * //-
 * // We can verify the data was saved by using {@link Datastore#get}.
 * //-
 * datastore.get(key, (err, entity) => {
 *   // entity = {
 *   //   name: 'Google',
 *   //   location: 'CA'
 *   // }
 * });
 *
 * //-
 * // If we want to update this record, we can modify the data object and re-
 * // save it.
 * //-
 * data.symbol = 'GOOG';
 *
 * datastore.save({
 *   key: key, // defined above (datastore.key(['Company', 'Google']))
 *   data: data
 * }, (err, entity) => {
 *   if (!err) {
 *     // Record updated successfully.
 *   }
 * });
 *
 * @example <caption>Deleting Records</caption>
 * // Entities can be removed from Datastore by passing the entity's key object
 * // to {@link Datastore#delete}.
 * //-
 * const key = datastore.key(['Company', 'Google']);
 *
 * datastore.delete(key, (err) => {
 *   if (!err) {
 *     // Record deleted successfully.
 *   }
 * });
 *
 * @example <caption>Transactions</caption>
 * // Complex logic can be wrapped in a transaction with
 * // {@link Datastore#transaction}. All queries and updates run within
 * // the transaction will be applied when the `done` function is called.
 * //-
 * const transaction = datastore.transaction();
 *
 * transaction.run((err) => {
 *   if (err) {
 *     // Error handling omitted.
 *   }
 *
 *   const key = datastore.key(['Company', 'Google']);
 *
 *   transaction.get(key, (err, entity) => {
 *     if (err) {
 *       // Error handling omitted.
 *     }
 *
 *     entity.symbol = 'GOOG';
 *
 *     transaction.save(entity);
 *
 *     transaction.commit((err) => {
 *       if (!err) {
 *         // Transaction committed successfully.
 *       }
 *     });
 *   });
 * });
 *
 * @example <caption>Queries with Ancestors</caption>
 * const {Datastore} = require('@google-cloud/datastore');
 * const datastore = new Datastore();
 *
 * const customerId1 = 2993844;
 * const customerId2 = 4993882;
 * const customerKey1 = datastore.key(['Customer', customerId1]);
 * const customerKey2 = datastore.key(['Customer', customerId2]);
 * const cookieKey1 = datastore.key(['Customer', customerId1, 'Cookie',
 * 'cookie28839']); // child entity const cookieKey2 =
 * datastore.key(['Customer', customerId1, 'Cookie', 'cookie78984']); // child
 * entity const cookieKey3 = datastore.key(['Customer', customerId2, 'Cookie',
 * 'cookie93911']); // child entity
 *
 * const entities = [];
 *
 * entities.push({
 *   key: customerKey1,
 *   data: {
 *     name: 'Jane Doe',
 *     address: '4848 Liller'
 *   }
 * });
 *
 * entities.push({
 *   key: customerKey2,
 *   data: {
 *     name: 'John Smith',
 *     address: '4848 Pine'
 *   }
 * });
 *
 * entities.push({
 *   key: cookieKey1,
 *   data: {
 *     cookieVal: 'dj83kks88rkld'
 *   }
 * });
 *
 * entities.push({
 *   key: cookieKey2,
 *   data: {
 *     cookieVal: 'sj843ka99s'
 *   }
 * });
 *
 * entities.push({
 *   key: cookieKey3,
 *   data: {
 *     cookieVal: 'otk82k2kw'
 *   }
 * });
 *
 * datastore.upsert(entities);
 *
 * const query = datastore.createQuery().hasAncestor(customerKey1);
 *
 * datastore.runQuery(query, (err, entities) => {
 *   for (let entity of entities) {
 *     console.log(entity[datastore.KEY]);
 *   }
 * });
 *
 * const query2 = datastore.createQuery().hasAncestor(customerKey2);
 *
 * datastore.runQuery(query2, (err, entities) => {
 *   for (let entity of entities) {
 *     console.log(entity[datastore.KEY]);
 *   }
 * });
 *
 * datastore.runQuery(query2, (entities) => {
 *   console.log(entities);
 * });
 */
declare class Datastore extends DatastoreRequest {
    clients_: Map<string, ClientStub>;
    namespace?: string;
    projectId: string;
    defaultBaseUrl_: string;
    options: DatastoreOptions;
    baseUrl_?: string;
    port_?: number;
    customEndpoint_?: boolean;
    auth: GoogleAuth;
    constructor(options?: DatastoreOptions);
    /**
     * Helper function to get a Datastore Double object.
     *
     * @param {number} value The double value.
     * @returns {object}
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const threeDouble = datastore.double(3.0);
     */
    static double(value: number): entity.Double;
    double(value: number): entity.Double;
    /**
     * Helper function to check if something is a Datastore Double object.
     *
     * @param {*} value
     * @returns {boolean}
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * datastore.isDouble(0.42); // false
     * datastore.isDouble(datastore.double(0.42)); // true
     */
    static isDouble(value?: {}): boolean;
    isDouble(value?: {}): boolean;
    /**
     * Helper function to get a Datastore Geo Point object.
     *
     * @param {object} coordinates Coordinate value.
     * @param {number} coordinates.latitude Latitudinal value.
     * @param {number} coordinates.longitude Longitudinal value.
     * @returns {object}
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
    static geoPoint(coordinates: entity.Coordinates): entity.GeoPoint;
    geoPoint(coordinates: entity.Coordinates): entity.GeoPoint;
    /**
     * Helper function to check if something is a Datastore Geo Point object.
     *
     * @param {*} value
     * @returns {boolean}
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const coordinates = {
     *   latitude: 0,
     *   longitude: 0
     * };
     *
     * datastore.isGeoPoint(coordinates); // false
     * datastore.isGeoPoint(datastore.geoPoint(coordinates)); // true
     */
    static isGeoPoint(value?: {}): boolean;
    isGeoPoint(value?: {}): boolean;
    /**
     * Helper function to get a Datastore Integer object.
     *
     * This is also useful when using an ID outside the bounds of a JavaScript
     * Number object.
     *
     * @param {number} value The integer value.
     * @returns {object}
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const sevenInteger = datastore.int(7);
     *
     * //-
     * // Create an Int to support long Key IDs.
     * //-
     * const key = datastore.key([
     *   'Kind',
     *   datastore.int('100000000000001234')
     * ]);
     */
    static int(value: number | string): entity.Int;
    int(value: number | string): entity.Int;
    /**
     * Helper function to check if something is a Datastore Integer object.
     *
     * @param {*} value
     * @returns {boolean}
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * datastore.isInt(42); // false
     * datastore.isInt(datastore.int(42)); // true
     */
    static isInt(value?: {}): boolean;
    isInt(value?: {}): boolean;
    /**
     * Access the Key from an Entity object.
     *
     * @name Datastore.KEY
     * @type {symbol}
     */
    /**
     * Access the Key from an Entity object.
     *
     * @name Datastore#KEY
     * @type {symbol}
     */
    static KEY: typeof entity.KEY_SYMBOL;
    KEY: typeof entity.KEY_SYMBOL;
    /**
     * This is one of three values which may be returned from
     * {@link Datastore#runQuery}, {@link Transaction#runQuery}, and
     * {@link Query#run} as `info.moreResults`.
     *
     * There *may* be more results after the specified end cursor.
     *
     * @type {string}
     */
    static MORE_RESULTS_AFTER_CURSOR: string;
    MORE_RESULTS_AFTER_CURSOR: string;
    /**
     * This is one of three values which may be returned from
     * {@link Datastore#runQuery}, {@link Transaction#runQuery}, and
     * {@link Query#run} as `info.moreResults`.
     *
     * There *may* be more results after the specified limit.
     *
     * @type {string}
     */
    static MORE_RESULTS_AFTER_LIMIT: string;
    MORE_RESULTS_AFTER_LIMIT: string;
    /**
     * This is one of three values which may be returned from
     * {@link Datastore#runQuery}, {@link Transaction#runQuery}, and
     * {@link Query#run} as `info.moreResults`.
     *
     * There are no more results left to query for.
     *
     * @type {string}
     */
    static NO_MORE_RESULTS: string;
    NO_MORE_RESULTS: string;
    createQuery(kind?: string): Query;
    createQuery(kind?: string[]): Query;
    createQuery(namespace: string, kind: string): Query;
    createQuery(namespace: string, kind: string[]): Query;
    key(options: entity.KeyOptions): entity.Key;
    key(path: PathType[]): entity.Key;
    key(path: string): entity.Key;
    /**
     * Helper function to check if something is a Datastore Key object.
     *
     * @param {*} value
     * @returns {boolean}
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * datastore.isKey({path: ['Company', 123]}); // false
     * datastore.isKey(datastore.key(['Company', 123])); // true
     */
    static isKey(value?: {}): boolean;
    isKey(value?: {}): boolean;
    keyToLegacyUrlSafe(key: entity.Key, locationPrefix?: string): Promise<string>;
    keyToLegacyUrlSafe(key: entity.Key, callback: KeyToLegacyUrlSafeCallback): void;
    keyToLegacyUrlSafe(key: entity.Key, locationPrefix: string, callback: KeyToLegacyUrlSafeCallback): void;
    /**
     * Helper to convert URL safe key string to entity key object
     *
     * This is intended to work with the "legacy" representation of a
     * datastore "Key" used within Google App Engine (a so-called "Reference").
     *
     * @param {entity.Key} key Entity key object.
     * @param {string} locationPrefix Optional .
     *  The location prefix of an App Engine project ID.
     *  Often this value is 's~', but may also be 'e~', or other location prefixes
     *  currently unknown.
     * @returns {string} Created urlsafe key.
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const urlSafeKey = 'ag9ncmFzcy1jbHVtcC00NzlyEwsSB0NvbXBhbnkiBkdvb2dsZQw';
     *
     * datastore.keyFromLegacyUrlsafe(key);
     *
     */
    keyFromLegacyUrlsafe(key: string): entity.Key;
    /**
     * Create a new Transaction object.
     *
     * @param {object} [options] Configuration object.
     * @param {string} [options.id] The ID of a previously run transaction.
     * @param {boolean} [options.readOnly=false] A read-only transaction cannot
     *     modify entities.
     * @returns {Transaction}
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const transaction = datastore.transaction();
     */
    transaction(options?: TransactionOptions): Transaction;
    /**
     * Determine the appropriate endpoint to use for API requests. If not
     * explicitly defined, check for the "DATASTORE_EMULATOR_HOST" environment
     * variable, used to connect to a local Datastore server.
     *
     * @private
     *
     * @param {string} customApiEndpoint Custom API endpoint.
     */
    determineBaseUrl_(customApiEndpoint?: string): void;
    /**
     * {@link DatastoreRequest} class.
     *
     * @name Datastore.DatastoreRequest
     * @see DatastoreRequest
     * @type {constructor}
     */
    DatastoreRequest: typeof DatastoreRequest;
    /**
     * {@link Query} class.
     *
     * @name Datastore.Query
     * @see Query
     * @type {constructor}
     */
    Query: typeof Query;
    /**
     * {@link Transaction} class.
     *
     * @name Datastore.Transaction
     * @see Transaction
     * @type {constructor}
     */
    Transaction: typeof Transaction;
}
export { Datastore };
export interface TransactionOptions {
    id?: string;
    readOnly?: boolean;
}
export { DatastoreRequest, Query, Transaction };
export interface DatastoreOptions extends GoogleAuthOptions {
    namespace?: string;
    apiEndpoint?: string;
    sslCreds?: ChannelCredentials;
}
export interface KeyToLegacyUrlSafeCallback {
    (err?: Error | null, urlSafeKey?: string): void;
}
import * as protos from '../protos/protos';
export { protos };
