/*!
 * Copyright 2014 Google LLC.
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
import { CallOptions } from 'google-gax';
import { google } from '../proto/datastore';
import { Datastore, TransactionOptions } from '.';
import { Entity, Entities } from './entity';
import { Query } from './query';
import { CommitCallback, CommitResponse, DatastoreRequest } from './request';
/**
 * A transaction is a set of Datastore operations on one or more entities. Each
 * transaction is guaranteed to be atomic, which means that transactions are
 * never partially applied. Either all of the operations in the transaction are
 * applied, or none of them are applied.
 *
 * @see [Transactions Reference]{@link https://cloud.google.com/datastore/docs/concepts/transactions}
 *
 * @class
 * @extends {Request}
 * @param {Datastore} datastore A Datastore instance.
 * @mixes module:datastore/request
 *
 * @example
 * const {Datastore} = require('@google-cloud/datastore');
 * const datastore = new Datastore();
 * const transaction = datastore.transaction();
 */
declare class Transaction extends DatastoreRequest {
    projectId: string;
    namespace?: string;
    readOnly: boolean;
    request: Function;
    modifiedEntities_: ModifiedEntities;
    skipCommit?: boolean;
    constructor(datastore: Datastore, options?: TransactionOptions);
    /*! Developer Documentation
     *
     * Below, we override two methods that we inherit from DatastoreRequest:
     * `delete` and `save`. This is done because:
     *
     *   A) the documentation needs to be different for a transactional save, and
     *   B) we build up a "modifiedEntities_" array on this object, used to build
     *      the final commit request with.
     */
    commit(gaxOptions?: CallOptions): Promise<CommitResponse>;
    commit(callback: CommitCallback): void;
    commit(gaxOptions: CallOptions, callback: CommitCallback): void;
    createQuery(kind?: string): Query;
    createQuery(kind?: string[]): Query;
    createQuery(namespace: string, kind: string): Query;
    createQuery(namespace: string, kind: string[]): Query;
    /**
     * Delete all entities identified with the specified key(s) in the current
     * transaction.
     *
     * @param {Key|Key[]} key Datastore key object(s).
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const transaction = datastore.transaction();
     *
     * transaction.run((err) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   // Delete a single entity.
     *   transaction.delete(datastore.key(['Company', 123]));
     *
     *   // Delete multiple entities at once.
     *   transaction.delete([
     *     datastore.key(['Company', 123]),
     *     datastore.key(['Product', 'Computer'])
     *   ]);
     *
     *   transaction.commit((err) => {
     *     if (!err) {
     *       // Transaction committed successfully.
     *     }
     *   });
     * });
     */
    delete(entities?: Entities): any;
    rollback(callback: RollbackCallback): void;
    rollback(gaxOptions?: CallOptions): Promise<RollbackResponse>;
    rollback(gaxOptions: CallOptions, callback: RollbackCallback): void;
    run(options?: RunOptions): Promise<RunResponse>;
    run(callback: RunCallback): void;
    run(options: RunOptions, callback: RunCallback): void;
    /**
     * Insert or update the specified object(s) in the current transaction. If a
     * key is incomplete, its associated object is inserted and the original Key
     * object is updated to contain the generated ID.
     *
     * This method will determine the correct Datastore method to execute
     * (`upsert`, `insert`, or `update`) by using the key(s) provided. For
     * example, if you provide an incomplete key (one without an ID), the request
     * will create a new entity and have its ID automatically assigned. If you
     * provide a complete key, the entity will be updated with the data specified.
     *
     * By default, all properties are indexed. To prevent a property from being
     * included in *all* indexes, you must supply an `excludeFromIndexes` array.
     * See below for an example.
     *
     * @param {object|object[]} entities Datastore key object(s).
     * @param {Key} entities.key Datastore key object.
     * @param {string[]} [entities.excludeFromIndexes] Exclude properties from
     *     indexing using a simple JSON path notation. See the example below to
     * see how to target properties at different levels of nesting within your
     *     entity.
     * @param {object} entities.data Data to save with the provided key.
     *
     * @example
     * <caption>Save a single entity.</caption>
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const transaction = datastore.transaction();
     *
     * // Notice that we are providing an incomplete key. After the transaction is
     * // committed, the Key object held by the `key` variable will be populated
     * // with a path containing its generated ID.
     * //-
     * const key = datastore.key('Company');
     *
     * transaction.run((err) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   transaction.save({
     *     key: key,
     *     data: {
     *       rating: '10'
     *     }
     *   });
     *
     *   transaction.commit((err) => {
     *     if (!err) {
     *       // Data saved successfully.
     *     }
     *   });
     * });
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const transaction = datastore.transaction();
     *
     * // Use an array, `excludeFromIndexes`, to exclude properties from indexing.
     * // This will allow storing string values larger than 1500 bytes.
     *
     * transaction.run((err) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   transaction.save({
     *     key: key,
     *     excludeFromIndexes: [
     *       'description',
     *       'embeddedEntity.description',
     *       'arrayValue[].description'
     *     ],
     *     data: {
     *       description: 'Long string (...)',
     *       embeddedEntity: {
     *         description: 'Long string (...)'
     *       },
     *       arrayValue: [
     *         {
     *           description: 'Long string (...)'
     *         }
     *       ]
     *     }
     *   });
     *
     *   transaction.commit((err) => {
     *     if (!err) {
     *       // Data saved successfully.
     *     }
     *   });
     * });
     *
     * @example
     * <caption>Save multiple entities at once.</caption>
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const transaction = datastore.transaction();
     * const companyKey = datastore.key(['Company', 123]);
     * const productKey = datastore.key(['Product', 'Computer']);
     *
     * transaction.run((err) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   transaction.save([
     *     {
     *       key: companyKey,
     *       data: {
     *         HQ: 'Dallas, TX'
     *       }
     *     },
     *     {
     *       key: productKey,
     *       data: {
     *         vendor: 'Dell'
     *       }
     *     }
     *   ]);
     *
     *   transaction.commit((err) => {
     *     if (!err) {
     *       // Data saved successfully.
     *     }
     *   });
     * });
     */
    save(entities: Entities): any;
}
export declare type ModifiedEntities = Array<{
    entity: {
        key: Entity;
    };
    method: string;
    args: Entity[];
}>;
export declare type RunResponse = [Transaction, google.datastore.v1.IBeginTransactionResponse];
export interface RunCallback {
    (error: Error | null, transaction: Transaction | null, response?: google.datastore.v1.IBeginTransactionResponse): void;
}
export interface RollbackCallback {
    (error: Error | null, response?: google.datastore.v1.IRollbackResponse): void;
}
export declare type RollbackResponse = [google.datastore.v1.IRollbackResponse];
export interface RunOptions {
    readOnly?: boolean;
    transactionId?: string;
    transactionOptions?: TransactionOptions;
    gaxOptions?: CallOptions;
}
/**
 * Reference to the {@link Transaction} class.
 * @name module:@google-cloud/datastore.Transaction
 * @see Transaction
 */
export { Transaction };
