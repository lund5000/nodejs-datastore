"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const projectify_1 = require("@google-cloud/projectify");
const promisify_1 = require("@google-cloud/promisify");
const arrify = require("arrify");
const concat = require('concat-stream');
const extend = require("extend");
const split_array_stream_1 = require("split-array-stream");
const streamEvents = require("stream-events");
const stream_1 = require("stream");
// Import the clients for each version supported by this package.
const gapic = Object.freeze({
    v1: require('./v1'),
});
const entity_1 = require("./entity");
const query_1 = require("./query");
/**
 * A map of read consistency values to proto codes.
 *
 * @type {object}
 * @private
 */
const CONSISTENCY_PROTO_CODE = {
    eventual: 2,
    strong: 1,
};
/**
 * Handle logic for Datastore API operations. Handles request logic for
 * Datastore.
 *
 * Creates requests to the Datastore endpoint. Designed to be inherited by
 * the {@link Datastore} and {@link Transaction} classes.
 *
 * @class
 */
class DatastoreRequest {
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
    static prepareEntityObject_(obj) {
        const entityObject = extend(true, {}, obj);
        // Entity objects are also supported.
        if (obj[entity_1.entity.KEY_SYMBOL]) {
            return {
                key: obj[entity_1.entity.KEY_SYMBOL],
                data: entityObject,
            };
        }
        return entityObject;
    }
    /**
     * Generate IDs without creating entities.
     *
     * @param {Key} key The key object to complete.
     * @param {number|object} options Either the number of IDs to allocate or an
     *     options object for further customization of the request.
     * @param {number} options.allocations How many IDs to allocate.
     * @param {object} [options.gaxOptions] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/global.html#CallOptions.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {array} callback.keys The generated IDs
     * @param {object} callback.apiResponse The full API response.
     *
     * @example
     * const incompleteKey = datastore.key(['Company']);
     *
     * //-
     * // The following call will create 100 new IDs from the Company kind, which
     * // exists under the default namespace.
     * //-
     * datastore.allocateIds(incompleteKey, 100, (err, keys) => {});
     *
     * //-
     * // Or, if you're using a transaction object.
     * //-
     * const transaction = datastore.transaction();
     *
     * transaction.run((err) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   transaction.allocateIds(incompleteKey, 100, (err, keys) => {
     *     if (err) {
     *       // Error handling omitted.
     *     }
     *
     *     transaction.commit((err) => {
     *       if (!err) {
     *         // Transaction committed successfully.
     *       }
     *     });
     *   });
     * });
     *
     * //-
     * // You may prefer to create IDs from a non-default namespace by providing
     * an
     * // incomplete key with a namespace. Similar to the previous example, the
     * call
     * // below will create 100 new IDs, but from the Company kind that exists
     * under
     * // the "ns-test" namespace.
     * //-
     * const incompleteKey = datastore.key({
     *   namespace: 'ns-test',
     *   path: ['Company']
     * });
     *
     * function callback(err, keys, apiResponse) {}
     *
     * datastore.allocateIds(incompleteKey, 100, callback);
     *
     * //-
     * // Returns a Promise if callback is omitted.
     * //-
     * datastore.allocateIds(incompleteKey, 100).then((data) => {
     *   const keys = data[0];
     *   const apiResponse = data[1];
     * });
     */
    allocateIds(key, options, callback) {
        if (entity_1.entity.isKeyComplete(key)) {
            throw new Error('An incomplete key should be provided.');
        }
        options = typeof options === 'number' ? { allocations: options } : options;
        this.request_({
            client: 'DatastoreClient',
            method: 'allocateIds',
            reqOpts: {
                keys: new Array(options.allocations).fill(entity_1.entity.keyToKeyProto(key)),
            },
            gaxOpts: options.gaxOptions,
        }, (err, resp) => {
            if (err) {
                callback(err, null, resp);
                return;
            }
            const keys = arrify(resp.keys).map(entity_1.entity.keyFromKeyProto);
            callback(null, keys, resp);
        });
    }
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
    createReadStream(keys, options = {}) {
        keys = arrify(keys).map(entity_1.entity.keyToKeyProto);
        if (keys.length === 0) {
            throw new Error('At least one Key object is required.');
        }
        const makeRequest = (keys) => {
            const reqOpts = {
                keys,
            };
            if (options.consistency) {
                const code = CONSISTENCY_PROTO_CODE[options.consistency.toLowerCase()];
                reqOpts.readOptions = {
                    readConsistency: code,
                };
            }
            this.request_({
                client: 'DatastoreClient',
                method: 'lookup',
                reqOpts,
                gaxOpts: options.gaxOptions,
            }, (err, resp) => {
                if (err) {
                    stream.destroy(err);
                    return;
                }
                let entities = [];
                try {
                    entities = entity_1.entity.formatArray(resp.found, options.wrapNumbers);
                }
                catch (err) {
                    stream.destroy(err);
                    return;
                }
                const nextKeys = (resp.deferred || [])
                    .map(entity_1.entity.keyFromKeyProto)
                    .map(entity_1.entity.keyToKeyProto);
                split_array_stream_1.split(entities, stream).then(streamEnded => {
                    if (streamEnded) {
                        return;
                    }
                    if (nextKeys.length > 0) {
                        makeRequest(nextKeys);
                        return;
                    }
                    stream.push(null);
                });
            });
        };
        const stream = streamEvents(new stream_1.Transform({ objectMode: true }));
        stream.once('reading', () => {
            makeRequest(keys);
        });
        return stream;
    }
    /**
     * Delete all entities identified with the specified key(s).
     *
     * @param {Key|Key[]} key Datastore key object(s).
     * @param {object} [gaxOptions] Request configuration options, outlined here:
     *     https://googleapis.github.io/gax-nodejs/global.html#CallOptions.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object} callback.apiResponse The full API response.
     *
     * @example
     * const key = datastore.key(['Company', 123]);
     * datastore.delete(key, (err, apiResp) => {});
     *
     * //-
     * // Or, if you're using a transaction object.
     * //-
     * const transaction = datastore.transaction();
     *
     * transaction.run((err) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   transaction.delete(key);
     *
     *   transaction.commit((err) => {
     *     if (!err) {
     *       // Transaction committed successfully.
     *     }
     *   });
     * });
     *
     * //-
     * // Delete multiple entities at once.
     * //-
     * datastore.delete([
     *   datastore.key(['Company', 123]),
     *   datastore.key(['Product', 'Computer'])
     * ], (err, apiResponse) => {});
     *
     * //-
     * // Returns a Promise if callback is omitted.
     * //-
     * datastore.delete().then((data) => {
     *   const apiResponse = data[0];
     * });
     */
    delete(keys, gaxOptionsOrCallback, cb) {
        const gaxOptions = typeof gaxOptionsOrCallback === 'object' ? gaxOptionsOrCallback : {};
        const callback = typeof gaxOptionsOrCallback === 'function' ? gaxOptionsOrCallback : cb;
        const reqOpts = {
            mutations: arrify(keys).map(key => {
                return {
                    delete: entity_1.entity.keyToKeyProto(key),
                };
            }),
        };
        if (this.id) {
            this.requests_.push(reqOpts);
            return;
        }
        this.request_({
            client: 'DatastoreClient',
            method: 'commit',
            reqOpts,
            gaxOpts: gaxOptions,
        }, callback);
    }
    /**
     * Retrieve the entities identified with the specified key(s) in the current
     * transaction. Get operations require a valid key to retrieve the
     * key-identified entity from Datastore.
     *
     * @throws {Error} If at least one Key object is not provided.
     *
     * @param {Key|Key[]} keys Datastore key object(s).
     * @param {object} [options] Optional configuration.
     * @param {string} [options.consistency] Specify either `strong` or `eventual`.
     *     If not specified, default values are chosen by Datastore for the
     *     operation. Learn more about strong and eventual consistency
     *     [here](https://cloud.google.com/datastore/docs/articles/balancing-strong-and-eventual-consistency-with-google-cloud-datastore).
     * @param {object} [options.gaxOptions] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/global.html#CallOptions.
     * @param {boolean | IntegerTypeCastOptions} [options.wrapNumbers=false]
     *     Wrap values of integerValue type in {@link Datastore#Int} objects.
     *     If a `boolean`, this will wrap values in {@link Datastore#Int} objects.
     *     If an `object`, this will return a value returned by
     *     `wrapNumbers.integerTypeCastFunction`.
     *     Please see {@link IntegerTypeCastOptions} for options descriptions.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object|object[]} callback.entity The entity object(s) which match
     *     the provided keys.
     *
     * @example
     * //-
     * // Get a single entity.
     * //-
     * const key = datastore.key(['Company', 123]);
     *
     * datastore.get(key, (err, entity) => {});
     *
     * //-
     * // Or, if you're using a transaction object.
     * //-
     * const transaction = datastore.transaction();
     *
     * transaction.run((err) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   transaction.get(key, (err, entity) => {
     *     if (err) {
     *       // Error handling omitted.
     *     }
     *
     *     transaction.commit((err) => {
     *       if (!err) {
     *         // Transaction committed successfully.
     *       }
     *     });
     *   });
     * });
     *
     * //-
     * // Get multiple entities at once with a callback.
     * //-
     * const keys = [
     *   datastore.key(['Company', 123]),
     *   datastore.key(['Product', 'Computer'])
     * ];
     *
     * datastore.get(keys, (err, entities) => {});
     *
     * //-
     * // Below is how to update the value of an entity with the help of the
     * // `save` method.
     * //-
     * datastore.get(key, (err, entity) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   entity.newValue = true;
     *
     *   datastore.save({
     *     key: key,
     *     data: entity
     *   }, (err) => {});
     * });
     *
     * //-
     * // Returns a Promise if callback is omitted.
     * //-
     * datastore.get(keys).then((data) => {
     *   const entities = data[0];
     * });
     */
    get(keys, optionsOrCallback, cb) {
        const options = typeof optionsOrCallback === 'object' && optionsOrCallback
            ? optionsOrCallback
            : {};
        const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : cb;
        this.createReadStream(keys, options)
            .on('error', callback)
            .pipe(concat((results) => {
            const isSingleLookup = !Array.isArray(keys);
            callback(null, isSingleLookup ? results[0] : results);
        }));
    }
    /**
     * Maps to {@link Datastore#save}, forcing the method to be `insert`.
     *
     * @param {object|object[]} entities Datastore key object(s).
     * @param {Key} entities.key Datastore key object.
     * @param {string[]} [entities.excludeFromIndexes] Exclude properties from
     *     indexing using a simple JSON path notation. See the examples in
     *     {@link Datastore#save} to see how to target properties at different
     *     levels of nesting within your entity.
     * @param {object} entities.data Data to save with the provided key.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object} callback.apiResponse The full API response.
     */
    insert(entities, callback) {
        entities = arrify(entities)
            .map(DatastoreRequest.prepareEntityObject_)
            .map((x) => {
            x.method = 'insert';
            return x;
        });
        this.save(entities, callback);
    }
    /**
     * Datastore allows you to query entities by kind, filter them by property
     * filters, and sort them by a property name. Projection and pagination are
     * also supported.
     *
     * The query is run, and the results are returned as the second argument to
     * your callback. A third argument may also exist, which is a query object
     * that uses the end cursor from the previous query as the starting cursor for
     * the next query. You can pass that object back to this method to see if more
     * results exist.
     * @param {Query} query Query object.
     * @param {object} [options] Optional configuration.
     * @param {string} [options.consistency] Specify either `strong` or `eventual`.
     *     If not specified, default values are chosen by Datastore for the
     *     operation. Learn more about strong and eventual consistency
     *     [here](https://cloud.google.com/datastore/docs/articles/balancing-strong-and-eventual-consistency-with-google-cloud-datastore).
     * @param {object} [options.gaxOptions] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/global.html#CallOptions.
     * @param {boolean | IntegerTypeCastOptions} [options.wrapNumbers=false]
     *     Wrap values of integerValue type in {@link Datastore#Int} objects.
     *     If a `boolean`, this will wrap values in {@link Datastore#Int} objects.
     *     If an `object`, this will return a value returned by
     *     `wrapNumbers.integerTypeCastFunction`.
     *     Please see {@link IntegerTypeCastOptions} for options descriptions.
     * @param {function} [callback] The callback function. If omitted, a readable
     *     stream instance is returned.
     * @param {?error} callback.err An error returned while making this request
     * @param {object[]} callback.entities A list of entities.
     * @param {object} callback.info An object useful for pagination.
     * @param {?string} callback.info.endCursor Use this in a follow-up query to
     *     begin from where these results ended.
     * @param {string} callback.info.moreResults Datastore responds with one of:
     *
     *     - {@link Datastore#MORE_RESULTS_AFTER_LIMIT}: There *may* be more
     *       results after the specified limit.
     *     - {@link Datastore#MORE_RESULTS_AFTER_CURSOR}: There *may* be more
     *       results after the specified end cursor.
     *     - {@link Datastore#NO_MORE_RESULTS}: There are no more results.
     *
     * @example
     * //-
     * // Where you see `transaction`, assume this is the context that's relevant
     * to
     * // your use, whether that be a Datastore or a Transaction object.
     * //-
     * const query = datastore.createQuery('Lion');
     *
     * datastore.runQuery(query, (err, entities, info) => {
     *   // entities = An array of records.
     *
     *   // Access the Key object for an entity.
     *   const firstEntityKey = entities[0][datastore.KEY];
     * });
     *
     * //-
     * // Or, if you're using a transaction object.
     * //-
     * const transaction = datastore.transaction();
     *
     * transaction.run((err) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   transaction.runQuery(query, (err, entities) => {
     *     if (err) {
     *       // Error handling omitted.
     *     }
     *
     *     transaction.commit((err) => {
     *       if (!err) {
     *         // Transaction committed successfully.
     *       }
     *     });
     *   });
     * });
     *
     * //-
     * // A keys-only query returns just the keys of the result entities instead
     * of
     * // the entities themselves, at lower latency and cost.
     * //-
     * const keysOnlyQuery = datastore.createQuery('Lion').select('__key__');
     *
     * datastore.runQuery(keysOnlyQuery, (err, entities) => {
     *   const keys = entities.map((entity) => {
     *     return entity[datastore.KEY];
     *   });
     * });
     *
     * //-
     * // Returns a Promise if callback is omitted.
     * //-
     * datastore.runQuery(query).then((data) => {
     *   const entities = data[0];
     * });
     */
    runQuery(query, optionsOrCallback, cb) {
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : cb;
        let info;
        this.runQueryStream(query, options)
            .on('error', callback)
            .on('info', info_ => {
            info = info_;
        })
            .pipe(concat((results) => {
            callback(null, results, info);
        }));
    }
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
    runQueryStream(query, options = {}) {
        query = extend(true, new query_1.Query(), query);
        const makeRequest = (query) => {
            const reqOpts = {};
            try {
                reqOpts.query = entity_1.entity.queryToQueryProto(query);
            }
            catch (e) {
                // using setImmediate here to make sure this doesn't throw a
                // synchronous error
                setImmediate(onResultSet, e);
                return;
            }
            if (options.consistency) {
                const code = CONSISTENCY_PROTO_CODE[options.consistency.toLowerCase()];
                reqOpts.readOptions = {
                    readConsistency: code,
                };
            }
            if (query.namespace) {
                reqOpts.partitionId = {
                    namespaceId: query.namespace,
                };
            }
            this.request_({
                client: 'DatastoreClient',
                method: 'runQuery',
                reqOpts,
                gaxOpts: options.gaxOptions,
            }, onResultSet);
        };
        function onResultSet(err, resp) {
            if (err) {
                stream.destroy(err);
                return;
            }
            const info = {
                moreResults: resp.batch.moreResults,
            };
            if (resp.batch.endCursor) {
                info.endCursor = resp.batch.endCursor.toString('base64');
            }
            let entities = [];
            if (resp.batch.entityResults) {
                try {
                    entities = entity_1.entity.formatArray(resp.batch.entityResults, options.wrapNumbers);
                }
                catch (err) {
                    stream.destroy(err);
                    return;
                }
            }
            // Emit each result right away, then get the rest if necessary.
            split_array_stream_1.split(entities, stream).then(streamEnded => {
                if (streamEnded) {
                    return;
                }
                if (resp.batch.moreResults !== 'NOT_FINISHED') {
                    stream.emit('info', info);
                    stream.push(null);
                    return;
                }
                // The query is "NOT_FINISHED". Get the rest of the results.
                const offset = query.offsetVal === -1 ? 0 : query.offsetVal;
                query.start(info.endCursor).offset(offset - resp.batch.skippedResults);
                const limit = query.limitVal;
                if (limit && limit > -1) {
                    query.limit(limit - resp.batch.entityResults.length);
                }
                makeRequest(query);
            });
        }
        const stream = streamEvents(new stream_1.Transform({ objectMode: true }));
        stream.once('reading', () => {
            makeRequest(query);
        });
        return stream;
    }
    /**
     * Insert or update the specified object(s). If a key is incomplete, its
     * associated object is inserted and the original Key object is updated to
     * contain the generated ID.
     *
     * This method will determine the correct Datastore method to execute
     * (`upsert`, `insert`, or `update`) by using the key(s) provided. For
     * example, if you provide an incomplete key (one without an ID), the request
     * will create a new entity and have its ID automatically assigned. If you
     * provide a complete key, the entity will be updated with the data specified.
     *
     * By default, all properties are indexed. To prevent a property from being
     * included in *all* indexes, you must supply an `excludeFromIndexes` array.
     *
     * To prevent large properties from being included in *all* indexes, you must supply
     * `excludeLargeProperties: true`.
     *  See below for an example.
     *
     * @borrows {@link Transaction#save} as save
     *
     * @throws {Error} If an unrecognized method is provided.
     *
     * @param {object|object[]} entities Datastore key object(s).
     * @param {Key} entities.key Datastore key object.
     * @param {string[]} [entities.excludeFromIndexes] Exclude properties from
     *     indexing using a simple JSON path notation. See the example below to
     * see how to target properties at different levels of nesting within your
     * @param {boolean} [entities.excludeLargeProperties] Automatically exclude
     *  large properties from indexing. It help in storing large values.
     * @param {string} [entities.method] Explicit method to use, either 'insert',
     *     'update', or 'upsert'.
     * @param {object} entities.data Data to save with the provided key.
     *     entity.
     * @param {object} [gaxOptions] Request configuration options, outlined here:
     *     https://googleapis.github.io/gax-nodejs/global.html#CallOptions.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object} callback.apiResponse The full API response.
     *
     * @example
     * //-
     * // Save a single entity.
     * //
     * // Notice that we are providing an incomplete key. After saving, the
     * original
     * // Key object used to save will be updated to contain the path with its
     * // generated ID.
     * //-
     * const key = datastore.key('Company');
     * const entity = {
     *   key: key,
     *   data: {
     *     rating: '10'
     *   }
     * };
     *
     * datastore.save(entity, (err) => {
     *   console.log(key.path); // [ 'Company', 5669468231434240 ]
     *   console.log(key.namespace); // undefined
     * });
     *
     * //-
     * // Save a single entity using a provided name instead of auto-generated ID.
     * //
     * // Here we are providing a key with name instead of an ID. After saving,
     * the
     * // original Key object used to save will be updated to contain the path
     * with
     * // the name instead of a generated ID.
     * //-
     * const key = datastore.key(['Company', 'donutshack']);
     * const entity = {
     *   key: key,
     *   data: {
     *     name: 'DonutShack',
     *     rating: 8
     *   }
     * };
     *
     * datastore.save(entity, (err) => {
     *   console.log(key.path); // ['Company', 'donutshack']
     *   console.log(key.namespace); // undefined
     * });
     *
     * //-
     * // Save a single entity with a provided namespace. Namespaces allow for
     * // multitenancy. To read more about this, see
     * // [the Datastore docs on key concepts](https://goo.gl/M1LUAu).
     * //
     * // Here we are providing a key with namespace.
     * //-
     * const key = datastore.key({
     *   namespace: 'my-namespace',
     *   path: ['Company', 'donutshack']
     * });
     *
     * const entity = {
     *   key: key,
     *   data: {
     *     name: 'DonutShack',
     *     rating: 8
     *   }
     * };
     *
     * datastore.save(entity, (err) => {
     *   console.log(key.path); // ['Company', 'donutshack']
     *   console.log(key.namespace); // 'my-namespace'
     * });
     *
     * //-
     * // Save different types of data, including ints, doubles, dates, booleans,
     * // blobs, and lists.
     * //
     * // Notice that we are providing an incomplete key. After saving, the
     * original
     * // Key object used to save will be updated to contain the path with its
     * // generated ID.
     * //-
     * const key = datastore.key('Company');
     * const entity = {
     *   key: key,
     *   data: {
     *     name: 'DonutShack',
     *     rating: datastore.int(10),
     *     worth: datastore.double(123456.78),
     *     location: datastore.geoPoint({
     *       latitude: 40.6894,
     *       longitude: -74.0447
     *     }),
     *     numDonutsServed: 45,
     *     founded: new Date('Tue May 12 2015 15:30:00 GMT-0400 (EDT)'),
     *     isStartup: true,
     *     donutEmoji: Buffer.from('\uD83C\uDF69'),
     *     keywords: [
     *       'donut',
     *       'coffee',
     *       'yum'
     *     ]
     *   }
     * };
     *
     * datastore.save(entity, (err, apiResponse) => {});
     *
     * //-
     * // Use an array, `excludeFromIndexes`, to exclude properties from indexing.
     * // This will allow storing string values larger than 1500 bytes.
     * //-
     * const entity = {
     *   key: datastore.key('Company'),
     *   excludeFromIndexes: [
     *     'description',
     *     'embeddedEntity.description',
     *     'arrayValue[]',
     *     'arrayValue[].description'
     *   ],
     *   data: {
     *     description: 'Long string (...)',
     *     embeddedEntity: {
     *       description: 'Long string (...)'
     *     },
     *     arrayValue: [
     *       'Long string (...)',
     *       {
     *         description: 'Long string (...)'
     *       }
     *     ]
     *   }
     * };
     *
     * datastore.save(entity, (err, apiResponse) => {});
     * //-
     * // Use boolean `excludeLargeProperties`, to auto exclude Large properties from indexing.
     * // This will allow storing string values larger than 1500 bytes.
     * //-
     * const entity = {
     *   key: datastore.key('Company'),
     *   data: {
     *     description: 'Long string (...)',
     *     embeddedEntity: {
     *       description: 'Long string (...)'
     *     },
     *     arrayValue: [
     *       'Long string (...)',
     *       {
     *         description: 'Long string (...)'
     *       }
     *     ]
     *   },
     *   excludeLargeProperties: true
     * };
     *
     * datastore.save(entity, (err, apiResponse) => {});
     *
     * //-
     * // Save multiple entities at once.
     * //-
     * const companyKey = datastore.key(['Company', 123]);
     * const productKey = datastore.key(['Product', 'Computer']);
     * const entities = [
     *   {
     *     key: companyKey,
     *     data: {
     *       HQ: 'Dallas, TX'
     *     }
     *   },
     *   {
     *     key: productKey,
     *     data: {
     *       vendor: 'Dell'
     *     }
     *   }
     * ];
     *
     * datastore.save(entities, (err, apiResponse) => {});
     *
     * //-
     * // Explicitly attempt to 'insert' a specific entity.
     * //-
     * const userKey = datastore.key(['User', 'chilts']);
     * const entity = {
     *   key: userKey,
     *   method: 'insert',
     *   data: {
     *     fullName: 'Andrew Chilton'
     *   }
     * };
     *
     * datastore.save(entity, (err, apiResponse) => {});
     *
     * //-
     * // Returns a Promise if callback is omitted.
     * //-
     * datastore.save(entity).then((data) => {
     *   const apiResponse = data[0];
     * });
     */
    save(entities, gaxOptionsOrCallback, cb) {
        entities = arrify(entities);
        const gaxOptions = typeof gaxOptionsOrCallback === 'object' ? gaxOptionsOrCallback : {};
        const callback = typeof gaxOptionsOrCallback === 'function' ? gaxOptionsOrCallback : cb;
        const insertIndexes = {};
        const mutations = [];
        const methods = {
            insert: true,
            update: true,
            upsert: true,
        };
        // Iterate over the entity objects, build a proto from all keys and values,
        // then place in the correct mutation array (insert, update, etc).
        entities
            .map(DatastoreRequest.prepareEntityObject_)
            .forEach((entityObject, index) => {
            const mutation = {};
            let entityProto = {};
            let method = 'upsert';
            if (entityObject.method) {
                if (methods[entityObject.method]) {
                    method = entityObject.method;
                }
                else {
                    throw new Error('Method ' + entityObject.method + ' not recognized.');
                }
            }
            if (entityObject.excludeLargeProperties) {
                entityObject.excludeFromIndexes = entity_1.entity.findLargeProperties_(entityObject.data, '', entityObject.excludeFromIndexes);
            }
            if (!entity_1.entity.isKeyComplete(entityObject.key)) {
                insertIndexes[index] = true;
            }
            // @TODO remove in @google-cloud/datastore@2.0.0
            // This was replaced with a more efficient mechanism in the top-level
            // `excludeFromIndexes` option.
            if (Array.isArray(entityObject.data)) {
                entityProto.properties = entityObject.data.reduce((acc, data) => {
                    const value = entity_1.entity.encodeValue(data.value, data.name.toString());
                    if (typeof data.excludeFromIndexes === 'boolean') {
                        const excluded = data.excludeFromIndexes;
                        let values = value.arrayValue && value.arrayValue.values;
                        if (values) {
                            values = values.map((x) => {
                                x.excludeFromIndexes = excluded;
                                return x;
                            });
                        }
                        else {
                            value.excludeFromIndexes = data.excludeFromIndexes;
                        }
                    }
                    acc[data.name] = value;
                    return acc;
                }, {});
            }
            else {
                entityProto = entity_1.entity.entityToEntityProto(entityObject);
            }
            entityProto.key = entity_1.entity.keyToKeyProto(entityObject.key);
            mutation[method] = entityProto;
            mutations.push(mutation);
        });
        const reqOpts = {
            mutations,
        };
        function onCommit(err, resp) {
            if (err || !resp) {
                callback(err, resp);
                return;
            }
            arrify(resp.mutationResults).forEach((result, index) => {
                if (!result.key) {
                    return;
                }
                if (insertIndexes[index]) {
                    const id = entity_1.entity.keyFromKeyProto(result.key).id;
                    entities[index].key.id = id;
                }
            });
            callback(null, resp);
        }
        if (this.id) {
            this.requests_.push(reqOpts);
            this.requestCallbacks_.push(onCommit);
            return;
        }
        this.request_({
            client: 'DatastoreClient',
            method: 'commit',
            reqOpts,
            gaxOpts: gaxOptions,
        }, onCommit);
    }
    /**
     * Maps to {@link Datastore#save}, forcing the method to be `update`.
     *
     * @param {object|object[]} entities Datastore key object(s).
     * @param {Key} entities.key Datastore key object.
     * @param {string[]} [entities.excludeFromIndexes] Exclude properties from
     *     indexing using a simple JSON path notation. See the examples in
     *     {@link Datastore#save} to see how to target properties at different
     *     levels of nesting within your entity.
     * @param {object} entities.data Data to save with the provided key.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object} callback.apiResponse The full API response.
     */
    update(entities, callback) {
        entities = arrify(entities)
            .map(DatastoreRequest.prepareEntityObject_)
            .map((x) => {
            x.method = 'update';
            return x;
        });
        this.save(entities, callback);
    }
    /**
     * Maps to {@link Datastore#save}, forcing the method to be `upsert`.
     *
     * @param {object|object[]} entities Datastore key object(s).
     * @param {Key} entities.key Datastore key object.
     * @param {string[]} [entities.excludeFromIndexes] Exclude properties from
     *     indexing using a simple JSON path notation. See the examples in
     *     {@link Datastore#save} to see how to target properties at different
     *     levels of nesting within your entity.
     * @param {object} entities.data Data to save with the provided key.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object} callback.apiResponse The full API response.
     */
    upsert(entities, callback) {
        entities = arrify(entities)
            .map(DatastoreRequest.prepareEntityObject_)
            .map((x) => {
            x.method = 'upsert';
            return x;
        });
        this.save(entities, callback);
    }
    /**
     * Merge the specified object(s). If a key is incomplete, its associated object
     * is inserted and the original Key object is updated to contain the generated ID.
     * For example, if you provide an incomplete key (one without an ID),
     * the request will create a new entity and have its ID automatically assigned.
     * If you provide a complete key, the entity will be get the data from datastore
     * and merge with the data specified.
     * By default, all properties are indexed. To prevent a property from being
     * included in *all* indexes, you must supply an `excludeFromIndexes` array.
     *
     * Maps to {@link Datastore#save}, forcing the method to be `merge`.
     *
     * @param {object|object[]} entities Datastore key object(s).
     * @param {Key} entities.key Datastore key object.
     * @param {string[]} [entities.excludeFromIndexes] Exclude properties from
     *     indexing using a simple JSON path notation. See the examples in
     *     {@link Datastore#save} to see how to target properties at different
     *     levels of nesting within your entity.
     * @param {object} entities.data Data to merge to the same for provided key.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object} callback.apiResponse The full API response.
     */
    merge(entities, callback) {
        const transaction = this.datastore.transaction();
        transaction.run(async (err) => {
            if (err) {
                transaction.rollback();
                callback(err);
                return;
            }
            try {
                await Promise.all(arrify(entities).map(async (objEntity) => {
                    const obj = DatastoreRequest.prepareEntityObject_(objEntity);
                    const [data] = await transaction.get(obj.key);
                    obj.method = 'upsert';
                    obj.data = Object.assign({}, data, obj.data);
                    transaction.save(obj);
                }));
                const [response] = await transaction.commit();
                callback(null, response);
            }
            catch (err) {
                transaction.rollback();
                callback(err);
            }
        });
    }
    /**
     * Make a request to the API endpoint. Properties to indicate a transactional
     * or non-transactional operation are added automatically.
     *
     * @param {object} config Configuration object.
     * @param {object} config.gaxOpts GAX options.
     * @param {function} config.method The gax method to call.
     * @param {object} config.reqOpts Request options.
     * @param {function} callback The callback function.
     *
     * @private
     */
    request_(config, callback) {
        const datastore = this.datastore;
        const isTransaction = this.id ? true : false;
        const method = config.method;
        let reqOpts = extend(true, {}, config.reqOpts);
        reqOpts.projectId = datastore.projectId;
        // Set properties to indicate if we're in a transaction or not.
        if (method === 'commit') {
            if (isTransaction) {
                reqOpts.mode = 'TRANSACTIONAL';
                reqOpts.transaction = this.id;
            }
            else {
                reqOpts.mode = 'NON_TRANSACTIONAL';
            }
        }
        if (method === 'rollback') {
            reqOpts.transaction = this.id;
        }
        if (isTransaction && (method === 'lookup' || method === 'runQuery')) {
            if (reqOpts.readOptions && reqOpts.readOptions.readConsistency) {
                throw new Error('Read consistency cannot be specified in a transaction.');
            }
            reqOpts.readOptions = {
                transaction: this.id,
            };
        }
        datastore.auth.getProjectId((err, projectId) => {
            if (err) {
                callback(err);
                return;
            }
            const clientName = config.client;
            if (!datastore.clients_.has(clientName)) {
                datastore.clients_.set(clientName, new gapic.v1[clientName](datastore.options));
            }
            const gaxClient = datastore.clients_.get(clientName);
            reqOpts = projectify_1.replaceProjectIdToken(reqOpts, projectId);
            const gaxOpts = extend(true, {}, config.gaxOpts, {
                headers: {
                    'google-cloud-resource-prefix': `projects/${projectId}`,
                },
            });
            gaxClient[method](reqOpts, gaxOpts, callback);
        });
    }
}
exports.DatastoreRequest = DatastoreRequest;
/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisify_1.promisifyAll(DatastoreRequest);
//# sourceMappingURL=request.js.map