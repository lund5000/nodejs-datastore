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
/// <reference types="node" />
import { google } from '../proto/datastore';
import { CallOptions } from 'google-gax';
import { Transform } from 'stream';
import { entity, Entity, EntityProto, ValueProto, Entities } from './entity';
import { Query, QueryProto, RunQueryOptions, RunQueryResponse, RunQueryCallback } from './query';
import { Datastore } from '.';
/**
 * Handle logic for Datastore API operations. Handles request logic for
 * Datastore.
 *
 * Creates requests to the Datastore endpoint. Designed to be inherited by
 * the {@link Datastore} and {@link Transaction} classes.
 *
 * @class
 */
declare class DatastoreRequest {
    id: string | undefined;
    requests_: Entity | {
        mutations: Array<{}>;
    };
    requestCallbacks_: Array<(err: Error | null, resp: Entity | null) => void> | Entity;
    datastore: Datastore;
    [key: string]: Entity;
    /**
     * Format a user's input to mutation methods. This will create a deep clone of
     * the input, as well as allow users to pass an object in the format of an
     * entity.
     *
     * Both of the following formats can be supplied supported:
     *
     *     datastore.save({
     *       key: datastore.key('Kind'),
     *       data: { foo: 'bar' }
     *     }, (err) => {})
     *
     *     const entity = { foo: 'bar' }
     *     entity[datastore.KEY] = datastore.key('Kind')
     *     datastore.save(entity, (err) => {})
     *
     * @private
     *
     * @see [#1803]{@link https://github.com/GoogleCloudPlatform/google-cloud-node/issues/1803}
     *
     * @param {object} obj The user's input object.
     */
    static prepareEntityObject_(obj: Entity): PrepareEntityObjectResponse;
    allocateIds(key: entity.Key, options: AllocateIdsOptions | number): Promise<AllocateIdsResponse>;
    allocateIds(key: entity.Key, options: AllocateIdsOptions | number, callback: AllocateIdsCallback): void;
    /**
     * Retrieve the entities as a readable object stream.
     *
     * @throws {Error} If at least one Key object is not provided.
     *
     * @param {Key|Key[]} keys Datastore key object(s).
     * @param {object} [options] Optional configuration. See {@link Datastore#get}
     *     for a complete list of options.
     *
     * @example
     * const keys = [
     *   datastore.key(['Company', 123]),
     *   datastore.key(['Product', 'Computer'])
     * ];
     *
     * datastore.createReadStream(keys)
     *   .on('error', (err) =>  {})
     *   .on('data', (entity) => {
     *     // entity is an entity object.
     *   })
     *   .on('end', () => {
     *     // All entities retrieved.
     *   });
     */
    createReadStream(keys: Entities, options?: CreateReadStreamOptions): Transform;
    delete(keys: Entities, gaxOptions?: CallOptions): Promise<DeleteResponse>;
    delete(keys: Entities, callback: DeleteCallback): void;
    delete(keys: Entities, gaxOptions: CallOptions, callback: DeleteCallback): void;
    get(keys: entity.Key | entity.Key[], options?: CreateReadStreamOptions): Promise<GetResponse>;
    get(keys: entity.Key | entity.Key[], callback: GetCallback): void;
    get(keys: entity.Key | entity.Key[], options: CreateReadStreamOptions, callback: GetCallback): void;
    insert(entities: Entities): Promise<InsertResponse>;
    insert(entities: Entities, callback: InsertCallback): void;
    runQuery(query: Query, options?: RunQueryOptions): Promise<RunQueryResponse>;
    runQuery(query: Query, options: RunQueryOptions, callback: RunQueryCallback): void;
    runQuery(query: Query, callback: RunQueryCallback): void;
    /**
     * Get a list of entities as a readable object stream.
     *
     * See {@link Datastore#runQuery} for a list of all available options.
     *
     * @param {Query} query Query object.
     * @param {object} [options] Optional configuration.
     * @param {object} [options.gaxOptions] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/global.html#CallOptions.
     *
     * @example
     * datastore.runQueryStream(query)
     *   .on('error', console.error)
     *   .on('data', (entity) => {
     *     // Access the Key object for this entity.
     *     const key = entity[datastore.KEY];
     *   })
     *   .on('info', (info) => {})
     *   .on('end', () => {
     *     // All entities retrieved.
     *   });
     *
     * //-
     * // If you anticipate many results, you can end a stream early to prevent
     * // unnecessary processing and API requests.
     * //-
     * datastore.runQueryStream(query)
     *   .on('data', (entity) => {
     *     this.end();
     *   });
     */
    runQueryStream(query: Query, options?: RunQueryStreamOptions): Transform;
    save(entities: Entities, gaxOptions?: CallOptions): Promise<SaveResponse>;
    save(entities: Entities, gaxOptions: CallOptions, callback: SaveCallback): void;
    save(entities: Entities, callback: SaveCallback): void;
    update(entities: Entities): Promise<UpdateResponse>;
    update(entities: Entities, callback: UpdateCallback): void;
    upsert(entities: Entities): Promise<UpsertResponse>;
    upsert(entities: Entities, callback: UpsertCallback): void;
    merge(entities: Entities): Promise<CommitResponse>;
    merge(entities: Entities, callback: SaveCallback): void;
    request_(config: RequestConfig, callback: RequestCallback): void;
}
export interface BooleanObject {
    [key: string]: boolean;
}
export interface ConsistencyProtoCode {
    [key: string]: number;
}
export interface EntityProtoReduceAccumulator {
    [key: string]: ValueProto;
}
export interface EntityProtoReduceData {
    value: ValueProto;
    excludeFromIndexes: ValueProto;
    name: string | number;
}
export declare type AllocateIdsResponse = [entity.Key[], google.datastore.v1.IAllocateIdsResponse];
export interface AllocateIdsCallback {
    (a: Error | null, b: entity.Key[] | null, c: google.datastore.v1.IAllocateIdsResponse): void;
}
export interface AllocateIdsOptions {
    allocations?: number;
    gaxOptions?: CallOptions;
}
export interface CreateReadStreamOptions extends RunQueryOptions {
}
export interface GetCallback {
    (err?: Error | null, entity?: Entities): void;
}
export declare type GetResponse = [Entities];
export declare type GetProjectIdErr = Error | null | undefined;
export interface Mutation {
    [key: string]: EntityProto;
}
export interface PrepareEntityObject {
    [key: string]: google.datastore.v1.Key | undefined;
}
export interface PrepareEntityObjectResponse {
    key?: google.datastore.v1.Key;
    data?: google.datastore.v1.Entity;
    method?: string;
}
export declare type ProjectId = string | null | undefined;
export interface RequestCallback {
    (a?: Error | null, b?: any): void;
}
export interface RequestConfig {
    client: string;
    gaxOpts?: CallOptions;
    method: string;
    prepared?: boolean;
    reqOpts?: RequestOptions;
}
export interface RequestOptions {
    mutations?: google.datastore.v1.IMutation[];
    keys?: Entity;
    readOptions?: {
        readConsistency?: number;
        transaction?: string;
    };
    partitionId?: google.datastore.v1.IPartitionId | null;
    transactionOptions?: {
        readOnly?: {};
        readWrite?: {
            previousTransaction?: string;
        };
    } | null;
    transaction?: string | null;
    mode?: string;
    projectId?: ProjectId;
    query?: QueryProto;
}
export interface RunQueryStreamOptions extends RunQueryOptions {
}
export interface CommitCallback {
    (err?: Error | null, resp?: google.datastore.v1.ICommitResponse): void;
}
export declare type CommitResponse = [google.datastore.v1.ICommitResponse];
export interface SaveCallback extends CommitCallback {
}
export declare type SaveResponse = CommitResponse;
export interface UpdateCallback extends CommitCallback {
}
export declare type UpdateResponse = CommitResponse;
export interface UpsertCallback extends CommitCallback {
}
export declare type UpsertResponse = CommitResponse;
export interface DeleteCallback extends CommitCallback {
}
export declare type DeleteResponse = CommitResponse;
export interface InsertCallback extends CommitCallback {
}
export declare type InsertResponse = CommitResponse;
/**
 * Reference to the {@link DatastoreRequest} class.
 * @name module:@google-cloud/datastore.DatastoreRequest
 * @see DatastoreRequest
 */
export { DatastoreRequest };
