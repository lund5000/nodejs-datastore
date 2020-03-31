"use strict";
// Copyright 2014 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
const pjy = require("@google-cloud/projectify");
const pfy = require("@google-cloud/promisify");
const assert = require("assert");
const mocha_1 = require("mocha");
const extend = require("extend");
const is = require("is");
const proxyquire = require("proxyquire");
const sinon = require("sinon");
const stream_1 = require("stream");
const entity_js_1 = require("../src/entity.js");
const query_js_1 = require("../src/query.js");
const entity_1 = require("./entity");
let promisified = false;
const fakePfy = Object.assign({}, pfy, {
    promisifyAll(klass) {
        if (klass.name === 'DatastoreRequest') {
            promisified = true;
        }
    },
});
const fakePjy = {
    replaceProjectIdToken() {
        return (pjyOverride || pjy.replaceProjectIdToken).apply(null, arguments);
    },
};
let v1FakeClientOverride;
const fakeV1 = {
    FakeClient: class {
        constructor() {
            return (v1FakeClientOverride || (() => { })).apply(null, arguments);
        }
    },
};
class FakeQuery extends query_js_1.Query {
}
let pjyOverride;
mocha_1.describe('Request', () => {
    // tslint:disable-next-line variable-name
    let Request;
    let request;
    let key;
    const sandbox = sinon.createSandbox();
    before(() => {
        Request = proxyquire('../src/request', {
            '@google-cloud/promisify': fakePfy,
            '@google-cloud/projectify': fakePjy,
            './entity': { entity: entity_js_1.entity },
            './query': { Query: FakeQuery },
            './v1': fakeV1,
        }).DatastoreRequest;
    });
    after(() => {
        v1FakeClientOverride = null;
    });
    beforeEach(() => {
        pjyOverride = null;
        key = new entity_js_1.entity.Key({
            namespace: 'namespace',
            path: ['Company', 123],
        });
        v1FakeClientOverride = null;
        request = new Request();
    });
    afterEach(() => sandbox.restore());
    mocha_1.describe('instantiation', () => {
        mocha_1.it('should promisify all the things', () => {
            assert(promisified);
        });
    });
    mocha_1.describe('prepareEntityObject_', () => {
        mocha_1.it('should clone an object', () => {
            const obj = {
                data: {
                    nested: {
                        obj: true,
                    },
                },
                method: 'insert',
            };
            const expectedPreparedEntityObject = extend(true, {}, obj);
            const preparedEntityObject = Request.prepareEntityObject_(obj);
            assert.notStrictEqual(preparedEntityObject, obj);
            assert.notStrictEqual(preparedEntityObject.data.nested, obj.data.nested);
            assert.deepStrictEqual(preparedEntityObject, expectedPreparedEntityObject);
        });
        mocha_1.it('should format an entity', () => {
            const key = {};
            // tslint:disable-next-line:no-any
            const entityObject = { data: true };
            entityObject[entity_js_1.entity.KEY_SYMBOL] = key;
            const preparedEntityObject = Request.prepareEntityObject_(entityObject);
            assert.strictEqual(preparedEntityObject.key, key);
            assert.strictEqual(preparedEntityObject.data.data, entityObject.data);
        });
    });
    mocha_1.describe('allocateIds', () => {
        const INCOMPLETE_KEY = {};
        const ALLOCATIONS = 2;
        const OPTIONS = {
            allocations: ALLOCATIONS,
        };
        mocha_1.it('should throw if the key is complete', () => {
            sandbox.stub(entity_js_1.entity, 'keyToKeyProto');
            sandbox.stub(entity_js_1.entity, 'isKeyComplete').callsFake(key => {
                assert.strictEqual(key, INCOMPLETE_KEY);
                return true;
            });
            assert.throws(() => {
                request.allocateIds(INCOMPLETE_KEY, OPTIONS, assert.ifError);
            }, new RegExp('An incomplete key should be provided.'));
        });
        mocha_1.it('should make the correct request', done => {
            const keyProto = {};
            sandbox.stub(entity_js_1.entity, 'isKeyComplete');
            sandbox.stub(entity_js_1.entity, 'keyToKeyProto').callsFake(key => {
                assert.strictEqual(key, INCOMPLETE_KEY);
                return keyProto;
            });
            request.request_ = (config) => {
                assert.strictEqual(config.client, 'DatastoreClient');
                assert.strictEqual(config.method, 'allocateIds');
                const expectedKeys = [];
                expectedKeys.length = ALLOCATIONS;
                expectedKeys.fill(keyProto);
                assert.deepStrictEqual(config.reqOpts.keys, expectedKeys);
                assert.strictEqual(config.gaxOpts, undefined);
                done();
            };
            request.allocateIds(INCOMPLETE_KEY, OPTIONS, assert.ifError);
        });
        mocha_1.it('should allow a numeric shorthand for allocations', done => {
            sandbox.stub(entity_js_1.entity, 'isKeyComplete');
            sandbox.stub(entity_js_1.entity, 'keyToKeyProto');
            request.request_ = (config) => {
                assert.strictEqual(config.reqOpts.keys.length, ALLOCATIONS);
                done();
            };
            request.allocateIds(INCOMPLETE_KEY, ALLOCATIONS, assert.ifError);
        });
        mocha_1.it('should allow customization of GAX options', done => {
            sandbox.stub(entity_js_1.entity, 'isKeyComplete');
            sandbox.stub(entity_js_1.entity, 'keyToKeyProto');
            const options = Object.assign({}, OPTIONS, {
                gaxOptions: {},
            });
            request.request_ = (config) => {
                assert.strictEqual(config.gaxOpts, options.gaxOptions);
                done();
            };
            request.allocateIds(INCOMPLETE_KEY, options, assert.ifError);
        });
        mocha_1.describe('error', () => {
            const ERROR = new Error('Error.');
            const API_RESPONSE = {};
            beforeEach(() => {
                request.request_ = (_, callback) => {
                    callback(ERROR, API_RESPONSE);
                };
            });
            mocha_1.it('should exec callback with error & API response', done => {
                sandbox.stub(entity_js_1.entity, 'isKeyComplete');
                sandbox.stub(entity_js_1.entity, 'keyToKeyProto');
                request.allocateIds(INCOMPLETE_KEY, OPTIONS, (err, keys, resp) => {
                    assert.strictEqual(err, ERROR);
                    assert.strictEqual(keys, null);
                    assert.strictEqual(resp, API_RESPONSE);
                    done();
                });
            });
        });
        mocha_1.describe('success', () => {
            const KEY = {};
            const API_RESPONSE = {
                keys: [KEY],
            };
            beforeEach(() => {
                request.request_ = (_, callback) => {
                    callback(null, API_RESPONSE);
                };
            });
            mocha_1.it('should create and return Keys & API response', done => {
                const key = {};
                sandbox.stub(entity_js_1.entity, 'isKeyComplete');
                sandbox.stub(entity_js_1.entity, 'keyToKeyProto');
                sandbox.stub(entity_js_1.entity, 'keyFromKeyProto').callsFake(keyProto => {
                    assert.strictEqual(keyProto, API_RESPONSE.keys[0]);
                    return key;
                });
                request.allocateIds(INCOMPLETE_KEY, OPTIONS, (err, keys, resp) => {
                    assert.ifError(err);
                    assert.deepStrictEqual(keys, [key]);
                    assert.strictEqual(resp, API_RESPONSE);
                    done();
                });
            });
        });
    });
    mocha_1.describe('createReadStream', () => {
        beforeEach(() => {
            request.request_ = () => { };
        });
        mocha_1.it('should throw if no keys are provided', () => {
            assert.throws(() => {
                request.createReadStream(null);
            }, /At least one Key object is required/);
        });
        mocha_1.it('should convert key to key proto', done => {
            sandbox.stub(entity_js_1.entity, 'keyToKeyProto').callsFake(key_ => {
                assert.strictEqual(key_, key);
                done();
                return {};
            });
            request.createReadStream(key).on('error', done);
        });
        mocha_1.it('should make correct request when stream is ready', done => {
            request.request_ = (config) => {
                assert.strictEqual(config.client, 'DatastoreClient');
                assert.strictEqual(config.method, 'lookup');
                assert.deepStrictEqual(config.reqOpts.keys[0], entity_js_1.entity.keyToKeyProto(key));
                done();
            };
            const stream = request.createReadStream(key);
            stream.emit('reading');
        });
        mocha_1.it('should allow customization of GAX options', done => {
            const options = {
                gaxOptions: {},
            };
            request.request_ = (config) => {
                assert.strictEqual(config.gaxOpts, options.gaxOptions);
                done();
            };
            request
                .createReadStream(key, options)
                .on('error', done)
                .emit('reading');
        });
        mocha_1.it('should allow setting strong read consistency', done => {
            request.request_ = (config) => {
                assert.strictEqual(config.reqOpts.readOptions.readConsistency, 1);
                done();
            };
            request
                .createReadStream(key, { consistency: 'strong' })
                .on('error', done)
                .emit('reading');
        });
        mocha_1.it('should allow setting strong eventual consistency', done => {
            request.request_ = (config) => {
                assert.strictEqual(config.reqOpts.readOptions.readConsistency, 2);
                done();
            };
            request
                .createReadStream(key, { consistency: 'eventual' })
                .on('error', done)
                .emit('reading');
        });
        mocha_1.describe('error', () => {
            const error = new Error('Error.');
            const apiResponse = { a: 'b', c: 'd' };
            beforeEach(() => {
                request.request_ = (_, callback) => {
                    setImmediate(() => {
                        callback(error, apiResponse);
                    });
                };
            });
            mocha_1.it('should emit error', done => {
                request
                    .createReadStream(key)
                    .on('data', () => { })
                    .on('error', (err) => {
                    assert.strictEqual(err, error);
                    done();
                });
            });
            mocha_1.it('should end stream', done => {
                const stream = request.createReadStream(key);
                stream
                    .on('data', () => { })
                    .on('error', () => {
                    setImmediate(() => {
                        assert.strictEqual(stream.destroyed, true);
                        done();
                    });
                });
            });
            mocha_1.it('should emit an error from results decoding', done => {
                const largeInt = '922337203685477850';
                const propertyName = 'points';
                request.request_ = (config, callback) => {
                    callback(null, {
                        found: [
                            {
                                entity: {
                                    properties: {
                                        [propertyName]: {
                                            integerValue: largeInt,
                                            valueType: 'integerValue',
                                        },
                                    },
                                },
                            },
                        ],
                    });
                };
                const stream = request.createReadStream(key);
                stream
                    .on('data', () => { })
                    .on('error', (err) => {
                    assert.deepStrictEqual(err, entity_1.outOfBoundsError({ integerValue: largeInt, propertyName }));
                    setImmediate(() => {
                        assert.strictEqual(stream.destroyed, true);
                        done();
                    });
                });
            });
        });
        mocha_1.describe('success', () => {
            const apiResponse = {
                found: [
                    {
                        entity: {
                            key: {
                                partitionId: {
                                    projectId: 'grape-spaceship-123',
                                },
                                path: [
                                    {
                                        kind: 'Post',
                                        name: 'post1',
                                    },
                                ],
                            },
                            properties: {
                                title: {
                                    stringValue: 'How to make the perfect pizza in your grill',
                                },
                                tags: {
                                    arrayValue: {
                                        values: [
                                            {
                                                stringValue: 'pizza',
                                            },
                                            {
                                                stringValue: 'grill',
                                            },
                                        ],
                                    },
                                },
                                rating: {
                                    integerValue: '5',
                                },
                                author: {
                                    stringValue: 'Silvano',
                                },
                                wordCount: {
                                    integerValue: '400',
                                },
                                isDraft: {
                                    booleanValue: false,
                                },
                            },
                        },
                    },
                ],
            };
            const expectedResult = entity_js_1.entity.formatArray(apiResponse.found)[0];
            const apiResponseWithMultiEntities = extend(true, {}, apiResponse);
            const entities = apiResponseWithMultiEntities.found;
            entities.push(entities[0]);
            const apiResponseWithDeferred = extend(true, {}, apiResponse);
            apiResponseWithDeferred.deferred = [
                apiResponseWithDeferred.found[0].entity.key,
            ];
            beforeEach(() => {
                request.request_ = (_, callback) => {
                    callback(null, apiResponse);
                };
            });
            mocha_1.it('should format the results', done => {
                sandbox.stub(entity_js_1.entity, 'formatArray').callsFake(arr => {
                    assert.strictEqual(arr, apiResponse.found);
                    setImmediate(done);
                    return arr;
                });
                request
                    .createReadStream(key)
                    .on('error', done)
                    .emit('reading');
            });
            mocha_1.describe('should pass `wrapNumbers` to formatArray', () => {
                let wrapNumbersOpts;
                let formtArrayStub;
                beforeEach(() => {
                    formtArrayStub = sandbox
                        .stub(entity_js_1.entity, 'formatArray')
                        .callsFake(arr => {
                        assert.strictEqual(arr, apiResponse.found);
                        return arr;
                    });
                });
                afterEach(() => {
                    formtArrayStub.restore();
                });
                mocha_1.it('should pass `wrapNumbers` to formatArray as undefined by default', done => {
                    request
                        .createReadStream(key)
                        .on('error', done)
                        .resume();
                    setImmediate(() => {
                        wrapNumbersOpts = formtArrayStub.getCall(0).args[1];
                        assert.strictEqual(wrapNumbersOpts, undefined);
                        done();
                    });
                });
                mocha_1.it('should pass `wrapNumbers` to formatArray as bolean', done => {
                    request
                        .createReadStream(key, { wrapNumbers: true })
                        .on('error', done)
                        .resume();
                    setImmediate(() => {
                        wrapNumbersOpts = formtArrayStub.getCall(0).args[1];
                        assert.strictEqual(typeof wrapNumbersOpts, 'boolean');
                        done();
                    });
                });
                mocha_1.it('should pass `wrapNumbers` to formatArray as IntegerTypeCastOptions', done => {
                    const integerTypeCastOptions = {
                        integerTypeCastFunction: () => { },
                        properties: 'that',
                    };
                    request
                        .createReadStream(key, { wrapNumbers: integerTypeCastOptions })
                        .on('error', done)
                        .resume();
                    setImmediate(() => {
                        wrapNumbersOpts = formtArrayStub.getCall(0).args[1];
                        assert.strictEqual(wrapNumbersOpts, integerTypeCastOptions);
                        assert.deepStrictEqual(wrapNumbersOpts, integerTypeCastOptions);
                        done();
                    });
                });
            });
            mocha_1.it('should continue looking for deferred results', done => {
                let numTimesCalled = 0;
                request.request_ = (config, callback) => {
                    numTimesCalled++;
                    if (numTimesCalled === 1) {
                        callback(null, apiResponseWithDeferred);
                        return;
                    }
                    const expectedKeys = apiResponseWithDeferred.deferred
                        .map(entity_js_1.entity.keyFromKeyProto)
                        .map(entity_js_1.entity.keyToKeyProto);
                    assert.deepStrictEqual(config.reqOpts.keys, expectedKeys);
                    done();
                };
                request
                    .createReadStream(key)
                    .on('error', done)
                    .emit('reading');
            });
            mocha_1.it('should push results to the stream', done => {
                request
                    .createReadStream(key)
                    .on('error', done)
                    .on('data', (entity) => {
                    assert.deepStrictEqual(entity, expectedResult);
                })
                    .on('end', done)
                    .emit('reading');
            });
            mocha_1.it('should not push more results if stream was ended', done => {
                let entitiesEmitted = 0;
                request.request_ = (config, callback) => {
                    setImmediate(() => {
                        callback(null, apiResponseWithMultiEntities);
                    });
                };
                const stream = request.createReadStream([key, key]);
                stream
                    .on('data', () => {
                    entitiesEmitted++;
                    stream.end();
                })
                    .on('end', () => {
                    assert.strictEqual(entitiesEmitted, 1);
                    done();
                })
                    .emit('reading');
            });
            mocha_1.it('should not get more results if stream was ended', done => {
                let lookupCount = 0;
                request.request_ = (config, callback) => {
                    lookupCount++;
                    setImmediate(() => {
                        callback(null, apiResponseWithDeferred);
                    });
                };
                const stream = request.createReadStream(key);
                stream
                    .on('error', done)
                    .on('data', () => stream.end())
                    .on('end', () => {
                    assert.strictEqual(lookupCount, 1);
                    done();
                })
                    .emit('reading');
            });
        });
    });
    mocha_1.describe('delete', () => {
        mocha_1.it('should delete by key', done => {
            request.request_ = (config, callback) => {
                assert.strictEqual(config.client, 'DatastoreClient');
                assert.strictEqual(config.method, 'commit');
                assert(is.object(config.reqOpts.mutations[0].delete));
                callback(null);
            };
            request.delete(key, done);
        });
        mocha_1.it('should return apiResponse in callback', done => {
            const resp = { success: true };
            request.request_ = (config, callback) => {
                callback(null, resp);
            };
            request.delete(key, (err, apiResponse) => {
                assert.ifError(err);
                assert.deepStrictEqual(resp, apiResponse);
                done();
            });
        });
        mocha_1.it('should multi delete by keys', done => {
            request.request_ = (config, callback) => {
                assert.strictEqual(config.reqOpts.mutations.length, 2);
                callback(null);
            };
            request.delete([key, key], done);
        });
        mocha_1.it('should allow customization of GAX options', done => {
            const gaxOptions = {};
            request.request_ = (config) => {
                assert.strictEqual(config.gaxOpts, gaxOptions);
                done();
            };
            request.delete(key, gaxOptions, assert.ifError);
        });
        mocha_1.describe('transactions', () => {
            beforeEach(() => {
                // Trigger transaction mode.
                request.id = 'transaction-id';
                request.requests_ = [];
            });
            mocha_1.it('should queue request', () => {
                request.delete(key);
                assert(is.object(request.requests_[0].mutations[0].delete));
            });
        });
    });
    mocha_1.describe('get', () => {
        mocha_1.describe('success', () => {
            const keys = [key];
            const fakeEntities = [{ a: 'a' }, { b: 'b' }];
            beforeEach(() => {
                request.createReadStream = sandbox.spy(() => {
                    const stream = new stream_1.Transform({ objectMode: true });
                    setImmediate(() => {
                        fakeEntities.forEach(entity => stream.push(entity));
                        stream.push(null);
                    });
                    return stream;
                });
            });
            mocha_1.it('should return an array of entities', done => {
                const options = {};
                request.get(keys, options, (err, entities) => {
                    assert.ifError(err);
                    assert.deepStrictEqual(entities, fakeEntities);
                    const spy = request.createReadStream.getCall(0);
                    assert.strictEqual(spy.args[0], keys);
                    assert.strictEqual(spy.args[1], options);
                    done();
                });
            });
            mocha_1.it('should return a single entity', done => {
                request.get(key, (err, entity) => {
                    assert.ifError(err);
                    assert.strictEqual(entity, fakeEntities[0]);
                    done();
                });
            });
            mocha_1.it('should allow options to be omitted', done => {
                request.get(keys, (err) => {
                    assert.ifError(err);
                    done();
                });
            });
            mocha_1.it('should default options to an object', done => {
                request.get(keys, null, (err) => {
                    assert.ifError(err);
                    const spy = request.createReadStream.getCall(0);
                    assert.deepStrictEqual(spy.args[1], {});
                    done();
                });
            });
            mocha_1.describe('should pass `wrapNumbers` to createReadStream', () => {
                mocha_1.it('should pass `wrapNumbers` to createReadStream as undefined by default', done => {
                    request.get(keys, (err) => {
                        assert.ifError(err);
                        const createReadStreamOptions = request.createReadStream.getCall(0)
                            .args[1];
                        assert.strictEqual(createReadStreamOptions.wrapNumbers, undefined);
                        done();
                    });
                });
                mocha_1.it('should pass `wrapNumbers` to createReadStream as boolean', done => {
                    request.get(keys, { wrapNumbers: true }, (err) => {
                        assert.ifError(err);
                        const createReadStreamOptions = request.createReadStream.getCall(0)
                            .args[1];
                        assert.strictEqual(typeof createReadStreamOptions.wrapNumbers, 'boolean');
                        done();
                    });
                });
                mocha_1.it('should pass `wrapNumbers` to createReadStream as IntegerTypeCastOptions', done => {
                    const integerTypeCastOptions = {
                        integerTypeCastFunction: () => { },
                        properties: 'that',
                    };
                    request.get(keys, { wrapNumbers: integerTypeCastOptions }, (err) => {
                        assert.ifError(err);
                        const createReadStreamOptions = request.createReadStream.getCall(0).args[1];
                        assert.strictEqual(createReadStreamOptions.wrapNumbers, integerTypeCastOptions);
                        assert.deepStrictEqual(createReadStreamOptions.wrapNumbers, integerTypeCastOptions);
                        done();
                    });
                });
            });
        });
        mocha_1.describe('error', () => {
            const error = new Error('err');
            beforeEach(() => {
                request.createReadStream = sandbox.spy(() => {
                    const stream = new stream_1.Transform({ objectMode: true });
                    setImmediate(() => {
                        stream.emit('error', error);
                    });
                    return stream;
                });
            });
            mocha_1.it('send an error to the callback', done => {
                request.get(key, (err) => {
                    assert.strictEqual(err, error);
                    done();
                });
            });
        });
    });
    mocha_1.describe('insert', () => {
        mocha_1.it('should prepare entity objects', done => {
            const entityObject = {};
            const preparedEntityObject = { prepared: true };
            const expectedEntityObject = Object.assign({}, preparedEntityObject, {
                method: 'insert',
            });
            sandbox.stub(Request, 'prepareEntityObject_').callsFake(obj => {
                assert.strictEqual(obj, entityObject);
                return preparedEntityObject;
            });
            request.save = (entities) => {
                assert.deepStrictEqual(entities[0], expectedEntityObject);
                done();
            };
            request.insert(entityObject, assert.ifError);
        });
        mocha_1.it('should pass the correct arguments to save', done => {
            request.save = (entities, callback) => {
                assert.deepStrictEqual(JSON.parse(JSON.stringify(entities)), [
                    {
                        key: {
                            namespace: 'ns',
                            kind: 'Company',
                            path: ['Company', null],
                        },
                        data: {},
                        method: 'insert',
                    },
                ]);
                callback();
            };
            const key = new entity_js_1.entity.Key({ namespace: 'ns', path: ['Company'] });
            request.insert({ key, data: {} }, done);
        });
    });
    mocha_1.describe('runQueryStream', () => {
        beforeEach(() => {
            request.request_ = () => { };
        });
        mocha_1.it('should clone the query', done => {
            let query = new FakeQuery();
            query.namespace = 'namespace';
            query = extend(true, new FakeQuery(), query);
            sandbox.stub(entity_js_1.entity, 'queryToQueryProto').callsFake(query_ => {
                assert.notStrictEqual(query_, query);
                assert.deepStrictEqual(query_, query);
                done();
                return {};
            });
            request
                .runQueryStream(query)
                .on('error', done)
                .emit('reading');
        });
        mocha_1.it('should make correct request when the stream is ready', done => {
            const query = { namespace: 'namespace' };
            const queryProto = {};
            sandbox.stub(entity_js_1.entity, 'queryToQueryProto').returns(queryProto);
            request.request_ = (config) => {
                assert.strictEqual(config.client, 'DatastoreClient');
                assert.strictEqual(config.method, 'runQuery');
                assert(is.empty(config.reqOpts.readOptions));
                assert.strictEqual(config.reqOpts.query, queryProto);
                assert.strictEqual(config.reqOpts.partitionId.namespaceId, query.namespace);
                assert.strictEqual(config.gaxOpts, undefined);
                done();
            };
            request
                .runQueryStream(query)
                .on('error', done)
                .emit('reading');
        });
        mocha_1.it('should allow customization of GAX options', done => {
            sandbox.stub(entity_js_1.entity, 'queryToQueryProto');
            const options = {
                gaxOptions: {},
            };
            request.request_ = (config) => {
                assert.strictEqual(config.gaxOpts, options.gaxOptions);
                done();
            };
            request
                .runQueryStream({}, options)
                .on('error', done)
                .emit('reading');
        });
        mocha_1.it('should allow setting strong read consistency', done => {
            sandbox.stub(entity_js_1.entity, 'queryToQueryProto');
            request.request_ = (config) => {
                assert.strictEqual(config.reqOpts.readOptions.readConsistency, 1);
                done();
            };
            request
                .runQueryStream({}, { consistency: 'strong' })
                .on('error', done)
                .emit('reading');
        });
        mocha_1.it('should allow setting strong eventual consistency', done => {
            sandbox.stub(entity_js_1.entity, 'queryToQueryProto');
            request.request_ = (config) => {
                assert.strictEqual(config.reqOpts.readOptions.readConsistency, 2);
                done();
            };
            request
                .runQueryStream({}, { consistency: 'eventual' })
                .on('error', done)
                .emit('reading');
        });
        mocha_1.describe('error', () => {
            const error = new Error('Error.');
            beforeEach(() => {
                request.request_ = (config, callback) => {
                    callback(error);
                };
            });
            mocha_1.it('should emit error on a stream', done => {
                sandbox.stub(entity_js_1.entity, 'queryToQueryProto');
                request
                    .runQueryStream({})
                    .on('error', (err) => {
                    assert.strictEqual(err, error);
                    done();
                })
                    .emit('reading');
            });
            mocha_1.it('should emit an error when encoding fails', done => {
                const error = new Error('Encoding error.');
                sandbox.stub(entity_js_1.entity, 'queryToQueryProto').throws(error);
                request
                    .runQueryStream({})
                    .on('error', (err) => {
                    assert.strictEqual(err, error);
                    done();
                })
                    .emit('reading');
            });
            mocha_1.it('should emit an error from results decoding', done => {
                const largeInt = '922337203685477850';
                const propertyName = 'points';
                sandbox.stub(entity_js_1.entity, 'queryToQueryProto');
                request.request_ = (config, callback) => {
                    callback(null, {
                        batch: {
                            entityResults: [
                                {
                                    entity: {
                                        properties: {
                                            [propertyName]: {
                                                integerValue: largeInt,
                                                valueType: 'integerValue',
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    });
                };
                const stream = request.runQueryStream({});
                stream
                    .on('error', (err) => {
                    assert.deepStrictEqual(err, entity_1.outOfBoundsError({ integerValue: largeInt, propertyName }));
                    setImmediate(() => {
                        assert.strictEqual(stream.destroyed, true);
                        done();
                    });
                })
                    .emit('reading');
            });
        });
        mocha_1.describe('success', () => {
            const entityResultsPerApiCall = {
                1: [{ a: true }],
                2: [{ b: true }, { c: true }],
            };
            const apiResponse = {
                batch: {
                    entityResults: [{ a: true }, { b: true }, { c: true }],
                    endCursor: Buffer.from('abc'),
                    moreResults: 'MORE_RESULTS_AFTER_LIMIT',
                    skippedResults: 0,
                },
            };
            let formatArrayStub;
            beforeEach(() => {
                request.request_ = (config, callback) => {
                    callback(null, apiResponse);
                };
                formatArrayStub = sandbox
                    .stub(entity_js_1.entity, 'formatArray')
                    .callsFake(array => {
                    return array;
                });
            });
            mocha_1.it('should format results', done => {
                sandbox.stub(entity_js_1.entity, 'queryToQueryProto');
                formatArrayStub.restore();
                sandbox.stub(entity_js_1.entity, 'formatArray').callsFake(array => {
                    assert.strictEqual(array, apiResponse.batch.entityResults);
                    return array;
                });
                const entities = [];
                request
                    .runQueryStream({})
                    .on('error', done)
                    .on('data', (entity) => entities.push(entity))
                    .on('end', () => {
                    assert.deepStrictEqual(entities, apiResponse.batch.entityResults);
                    done();
                });
            });
            mocha_1.describe('should pass `wrapNumbers` to formatArray', () => {
                let wrapNumbersOpts;
                beforeEach(() => {
                    sandbox.stub(entity_js_1.entity, 'queryToQueryProto');
                    formatArrayStub.restore();
                    formatArrayStub = sandbox
                        .stub(entity_js_1.entity, 'formatArray')
                        .callsFake((array, wrapNumbers) => {
                        return array;
                    });
                });
                mocha_1.it('should pass `wrapNumbers` to formatArray as undefined by default', done => {
                    request
                        .runQueryStream({})
                        .on('error', assert.ifError)
                        .resume();
                    setImmediate(() => {
                        wrapNumbersOpts = formatArrayStub.getCall(0).args[1];
                        assert.strictEqual(wrapNumbersOpts, undefined);
                        done();
                    });
                });
                mocha_1.it('should pass `wrapNumbers` to formatArray as boolean', done => {
                    request
                        .runQueryStream({}, { wrapNumbers: true })
                        .on('error', assert.ifError)
                        .resume();
                    setImmediate(() => {
                        wrapNumbersOpts = formatArrayStub.getCall(0).args[1];
                        assert.strictEqual(typeof wrapNumbersOpts, 'boolean');
                        done();
                    });
                });
                mocha_1.it('should pass `wrapNumbers` to formatArray as IntegerTypeCastOptions', done => {
                    const integerTypeCastOptions = {
                        integerTypeCastFunction: () => { },
                        properties: 'that',
                    };
                    request
                        .runQueryStream({}, { wrapNumbers: integerTypeCastOptions })
                        .on('error', assert.ifError)
                        .resume();
                    setImmediate(() => {
                        wrapNumbersOpts = formatArrayStub.getCall(0).args[1];
                        assert.strictEqual(wrapNumbersOpts, integerTypeCastOptions);
                        assert.deepStrictEqual(wrapNumbersOpts, integerTypeCastOptions);
                        done();
                    });
                });
            });
            mocha_1.it('should re-run query if not finished', done => {
                const query = {
                    limitVal: 1,
                    offsetVal: 8,
                };
                const queryProto = {
                    limit: {
                        value: query.limitVal,
                    },
                };
                let timesRequestCalled = 0;
                let startCalled = false;
                let offsetCalled = false;
                formatArrayStub.restore();
                sandbox.stub(entity_js_1.entity, 'formatArray').callsFake(array => {
                    assert.strictEqual(array, entityResultsPerApiCall[timesRequestCalled]);
                    return entityResultsPerApiCall[timesRequestCalled];
                });
                request.request_ = (config, callback) => {
                    timesRequestCalled++;
                    const resp = extend(true, {}, apiResponse);
                    resp.batch.entityResults =
                        entityResultsPerApiCall[timesRequestCalled];
                    if (timesRequestCalled === 1) {
                        assert.strictEqual(config.client, 'DatastoreClient');
                        assert.strictEqual(config.method, 'runQuery');
                        resp.batch.moreResults = 'NOT_FINISHED';
                        callback(null, resp);
                    }
                    else {
                        assert.strictEqual(startCalled, true);
                        assert.strictEqual(offsetCalled, true);
                        assert.strictEqual(config.reqOpts.query, queryProto);
                        resp.batch.moreResults = 'MORE_RESULTS_AFTER_LIMIT';
                        callback(null, resp);
                    }
                };
                FakeQuery.prototype.start = function (endCursor) {
                    assert.strictEqual(endCursor, apiResponse.batch.endCursor.toString('base64'));
                    startCalled = true;
                    return this;
                };
                sandbox.stub(FakeQuery.prototype, 'offset').callsFake(offset_ => {
                    const offset = query.offsetVal - apiResponse.batch.skippedResults;
                    assert.strictEqual(offset_, offset);
                    offsetCalled = true;
                    return {};
                });
                sandbox.stub(FakeQuery.prototype, 'limit').callsFake(limit_ => {
                    if (timesRequestCalled === 1) {
                        assert.strictEqual(limit_, entityResultsPerApiCall[1].length - query.limitVal);
                    }
                    else {
                        // Should restore the original limit.
                        assert.strictEqual(limit_, query.limitVal);
                    }
                    return {};
                });
                sandbox.stub(entity_js_1.entity, 'queryToQueryProto').callsFake(query_ => {
                    if (timesRequestCalled > 1) {
                        assert.strictEqual(query_, query);
                    }
                    return queryProto;
                });
                const entities = [];
                let info;
                request
                    .runQueryStream(query)
                    .on('error', done)
                    .on('info', (_info) => {
                    info = _info;
                })
                    .on('data', (entity) => {
                    entities.push(entity);
                })
                    .on('end', () => {
                    const allResults = [].slice
                        .call(entityResultsPerApiCall[1])
                        .concat(entityResultsPerApiCall[2]);
                    assert.deepStrictEqual(entities, allResults);
                    assert.deepStrictEqual(info, {
                        endCursor: apiResponse.batch.endCursor.toString('base64'),
                        moreResults: apiResponse.batch.moreResults,
                    });
                    done();
                });
            });
            mocha_1.it('should handle large limitless queries', done => {
                let timesRequestCalled = 0;
                const query = {
                    limitVal: -1,
                };
                request.request_ = (_, callback) => {
                    let batch;
                    if (++timesRequestCalled === 2) {
                        batch = {};
                    }
                    else {
                        batch = {
                            moreResults: 'NOT_FINISHED',
                            endCursor: Buffer.from('abc'),
                        };
                    }
                    callback(null, { batch });
                };
                sandbox.stub(entity_js_1.entity, 'queryToQueryProto').returns({});
                const limitStub = sandbox.stub(FakeQuery.prototype, 'limit');
                request
                    .runQueryStream(query)
                    .on('error', done)
                    .on('data', () => { })
                    .on('end', () => {
                    assert.strictEqual(timesRequestCalled, 2);
                    assert.strictEqual(limitStub.called, false);
                    done();
                });
            });
            mocha_1.it('should not push more results if stream was ended', done => {
                let timesRequestCalled = 0;
                let entitiesEmitted = 0;
                sandbox.stub(entity_js_1.entity, 'queryToQueryProto');
                request.request_ = (config, callback) => {
                    timesRequestCalled++;
                    const resp = extend(true, {}, apiResponse);
                    resp.batch.entityResults =
                        entityResultsPerApiCall[timesRequestCalled];
                    if (timesRequestCalled === 1) {
                        resp.batch.moreResults = 'NOT_FINISHED';
                        callback(null, resp);
                    }
                    else {
                        resp.batch.moreResults = 'MORE_RESULTS_AFTER_LIMIT';
                        callback(null, resp);
                    }
                };
                const stream = request
                    .runQueryStream({})
                    .on('data', () => {
                    entitiesEmitted++;
                    stream.end();
                })
                    .on('end', () => {
                    assert.strictEqual(entitiesEmitted, 1);
                    done();
                });
            });
            mocha_1.it('should not get more results if stream was ended', done => {
                let timesRequestCalled = 0;
                sandbox.stub(entity_js_1.entity, 'queryToQueryProto');
                request.request_ = (config, callback) => {
                    timesRequestCalled++;
                    callback(null, apiResponse);
                };
                const stream = request.runQueryStream({});
                stream
                    .on('error', done)
                    .on('data', () => stream.end())
                    .on('end', () => {
                    assert.strictEqual(timesRequestCalled, 1);
                    done();
                });
            });
        });
    });
    mocha_1.describe('runQuery', () => {
        const query = {};
        mocha_1.describe('success', () => {
            const fakeInfo = {};
            const fakeEntities = [{ a: 'a' }, { b: 'b' }];
            beforeEach(() => {
                request.runQueryStream = sandbox.spy(() => {
                    const stream = new stream_1.Transform({ objectMode: true });
                    setImmediate(() => {
                        stream.emit('info', fakeInfo);
                        fakeEntities.forEach(entity => {
                            stream.push(entity);
                        });
                        stream.push(null);
                    });
                    return stream;
                });
            });
            mocha_1.it('should return an array of entities', done => {
                const options = {};
                request.runQuery(query, options, (err, entities, info) => {
                    assert.ifError(err);
                    assert.deepStrictEqual(entities, fakeEntities);
                    assert.strictEqual(info, fakeInfo);
                    const spy = request.runQueryStream.getCall(0);
                    assert.strictEqual(spy.args[0], query);
                    assert.strictEqual(spy.args[1], options);
                    done();
                });
            });
            mocha_1.describe('should pass `wrapNumbers` to runQueryStream', () => {
                mocha_1.it('should pass `wrapNumbers` to runQueryStream as undefined by default', done => {
                    request.runQuery(query, (err) => {
                        assert.ifError(err);
                        const runQueryOptions = request.runQueryStream.getCall(0).args[1];
                        assert.strictEqual(runQueryOptions.wrapNumbers, undefined);
                        done();
                    });
                });
                mocha_1.it('should pass `wrapNumbers` to runQueryStream boolean', done => {
                    request.runQuery(query, { wrapNumbers: true }, (err) => {
                        assert.ifError(err);
                        const runQueryOptions = request.runQueryStream.getCall(0).args[1];
                        assert.strictEqual(typeof runQueryOptions.wrapNumbers, 'boolean');
                        done();
                    });
                });
                mocha_1.it('should pass `wrapNumbers` to runQueryStream as IntegerTypeCastOptions', done => {
                    const integerTypeCastOptions = {
                        integerTypeCastFunction: () => { },
                        properties: 'that',
                    };
                    request.runQuery(query, { wrapNumbers: integerTypeCastOptions }, (err) => {
                        assert.ifError(err);
                        const runQueryOptions = request.runQueryStream.getCall(0).args[1];
                        assert.strictEqual(runQueryOptions.wrapNumbers, integerTypeCastOptions);
                        assert.deepStrictEqual(runQueryOptions.wrapNumbers, integerTypeCastOptions);
                        done();
                    });
                });
            });
            mocha_1.it('should allow options to be omitted', done => {
                request.runQuery(query, (err) => {
                    assert.ifError(err);
                    done();
                });
            });
            mocha_1.it('should default options to an object', done => {
                request.runQuery(query, null, (err) => {
                    assert.ifError(err);
                    const spy = request.runQueryStream.getCall(0);
                    assert.deepStrictEqual(spy.args[0], {});
                    done();
                });
            });
        });
        mocha_1.describe('error', () => {
            const error = new Error('err');
            beforeEach(() => {
                request.runQueryStream = sandbox.spy(() => {
                    const stream = new stream_1.Transform({ objectMode: true });
                    setImmediate(() => {
                        stream.emit('error', error);
                    });
                    return stream;
                });
            });
            mocha_1.it('send an error to the callback', done => {
                request.runQuery(query, (err) => {
                    assert.strictEqual(err, error);
                    done();
                });
            });
        });
    });
    mocha_1.describe('save', () => {
        mocha_1.it('should save with keys', done => {
            const expectedReq = {
                mutations: [
                    {
                        upsert: {
                            key: {
                                partitionId: {
                                    namespaceId: 'namespace',
                                },
                                path: [
                                    {
                                        kind: 'Company',
                                        id: 123,
                                    },
                                ],
                            },
                            properties: {
                                k: {
                                    stringValue: 'v',
                                },
                            },
                        },
                    },
                    {
                        upsert: {
                            key: {
                                partitionId: {
                                    namespaceId: 'namespace',
                                },
                                path: [
                                    {
                                        kind: 'Company',
                                        id: 123,
                                    },
                                ],
                            },
                            properties: {
                                k: {
                                    stringValue: 'v',
                                },
                            },
                        },
                    },
                ],
            };
            request.request_ = (config, callback) => {
                assert.strictEqual(config.client, 'DatastoreClient');
                assert.strictEqual(config.method, 'commit');
                assert.deepStrictEqual(config.reqOpts, expectedReq);
                assert.deepStrictEqual(config.gaxOpts, {});
                callback();
            };
            request.save([
                { key, data: { k: 'v' } },
                { key, data: { k: 'v' } },
            ], done);
        });
        mocha_1.it('should allow customization of GAX options', done => {
            const gaxOptions = {};
            request.request_ = (config) => {
                assert.strictEqual(config.gaxOpts, gaxOptions);
                done();
            };
            request.save({
                key,
                data: {},
            }, gaxOptions, assert.ifError);
        });
        mocha_1.it('should prepare entity objects', done => {
            const entityObject = {};
            let prepared = false;
            sandbox.stub(Request, 'prepareEntityObject_').callsFake(obj => {
                assert.strictEqual(obj, entityObject);
                prepared = true;
                return {
                    key,
                    method: 'insert',
                    data: { k: 'v' },
                };
            });
            request.request_ = () => {
                assert.strictEqual(prepared, true);
                done();
            };
            request.save(entityObject, assert.ifError);
        });
        mocha_1.it('should save with specific method', done => {
            request.request_ = (config, callback) => {
                assert.strictEqual(config.reqOpts.mutations.length, 3);
                assert(is.object(config.reqOpts.mutations[0].insert));
                assert(is.object(config.reqOpts.mutations[1].update));
                assert(is.object(config.reqOpts.mutations[2].upsert));
                const insert = config.reqOpts.mutations[0].insert;
                assert.deepStrictEqual(insert.properties.k, { stringValue: 'v' });
                const update = config.reqOpts.mutations[1].update;
                assert.deepStrictEqual(update.properties.k2, { stringValue: 'v2' });
                const upsert = config.reqOpts.mutations[2].upsert;
                assert.deepStrictEqual(upsert.properties.k3, { stringValue: 'v3' });
                callback();
            };
            request.save([
                { key, method: 'insert', data: { k: 'v' } },
                { key, method: 'update', data: { k2: 'v2' } },
                { key, method: 'upsert', data: { k3: 'v3' } },
            ], done);
        });
        mocha_1.it('should throw if a given method is not recognized', () => {
            assert.throws(() => {
                request.save({
                    key,
                    method: 'auto_insert_id',
                    data: {
                        k: 'v',
                    },
                }, assert.ifError);
            }, /Method auto_insert_id not recognized/);
        });
        mocha_1.it('should not alter the provided data object', done => {
            const entities = [
                {
                    key,
                    method: 'insert',
                    indexed: false,
                    data: {
                        value: {
                            a: 'b',
                            c: [1, 2, 3],
                        },
                    },
                },
            ];
            const expectedEntities = entities.map(x => extend(true, {}, x));
            request.request_ = () => {
                // By the time the request is made, the original object has already been
                // transformed into a raw request.
                assert.deepStrictEqual(entities, expectedEntities);
                done();
            };
            request.save(entities, assert.ifError);
        });
        mocha_1.it('should return apiResponse in callback', done => {
            const key = new entity_js_1.entity.Key({ namespace: 'ns', path: ['Company'] });
            const mockCommitResponse = {};
            request.request_ = (config, callback) => {
                callback(null, mockCommitResponse);
            };
            request.save({ key, data: {} }, (err, apiResponse) => {
                assert.ifError(err);
                assert.strictEqual(mockCommitResponse, apiResponse);
                done();
            });
        });
        mocha_1.it('should allow setting the indexed value of a property', done => {
            request.request_ = (config) => {
                const property = config.reqOpts.mutations[0].upsert.properties.name;
                assert.strictEqual(property.stringValue, 'value');
                assert.strictEqual(property.excludeFromIndexes, true);
                done();
            };
            request.save({
                key,
                data: [
                    {
                        name: 'name',
                        value: 'value',
                        excludeFromIndexes: true,
                    },
                ],
            }, assert.ifError);
        });
        mocha_1.it('should allow setting the indexed value on arrays', done => {
            request.request_ = (config) => {
                const property = config.reqOpts.mutations[0].upsert.properties.name;
                property.arrayValue.values.forEach((value) => {
                    assert.strictEqual(value.excludeFromIndexes, true);
                });
                done();
            };
            request.save({
                key,
                data: [
                    {
                        name: 'name',
                        value: ['one', 'two', 'three'],
                        excludeFromIndexes: true,
                    },
                ],
            }, assert.ifError);
        });
        mocha_1.it('should allow exclude property indexed with "*" wildcard from root', done => {
            const longString = Buffer.alloc(1501, '.').toString();
            const data = {
                longString,
                notMetadata: true,
                longStringArray: [longString],
                metadata: {
                    longString,
                    otherProperty: 'value',
                    obj: {
                        longStringArray: [
                            {
                                longString,
                                nestedLongStringArray: [
                                    {
                                        longString,
                                        nestedProperty: true,
                                    },
                                    {
                                        longString,
                                    },
                                ],
                            },
                        ],
                    },
                    longStringArray: [
                        {
                            longString,
                            nestedLongStringArray: [
                                {
                                    longString,
                                    nestedProperty: true,
                                },
                                {
                                    longString,
                                },
                            ],
                        },
                    ],
                },
            };
            const validateIndex = (data) => {
                if (data.arrayValue) {
                    data.arrayValue.values.forEach((value) => {
                        validateIndex(value);
                    });
                }
                else if (data.entityValue) {
                    Object.keys(data.entityValue.properties).forEach(path => {
                        validateIndex(data.entityValue.properties[path]);
                    });
                }
                else {
                    assert.strictEqual(data.excludeFromIndexes, true);
                }
            };
            request.request_ = (config) => {
                const properties = config.reqOpts.mutations[0].upsert.properties;
                Object.keys(properties).forEach(path => {
                    validateIndex(properties[path]);
                });
                done();
            };
            request.save({
                key,
                data,
                excludeFromIndexes: ['.*'],
            }, assert.ifError);
        });
        mocha_1.it('should allow exclude property indexed with "*" wildcard for object and array', done => {
            const longString = Buffer.alloc(1501, '.').toString();
            const data = {
                longString,
                notMetadata: true,
                longStringArray: [longString],
                metadata: {
                    longString,
                    otherProperty: 'value',
                    obj: {
                        longStringArray: [
                            {
                                longString,
                                nestedLongStringArray: [
                                    {
                                        longString,
                                        nestedProperty: true,
                                    },
                                    {
                                        longString,
                                    },
                                ],
                            },
                        ],
                    },
                    longStringArray: [
                        {
                            longString,
                            nestedLongStringArray: [
                                {
                                    longString,
                                    nestedProperty: true,
                                },
                                {
                                    longString,
                                },
                            ],
                        },
                    ],
                },
            };
            const validateIndex = (data) => {
                if (data.arrayValue) {
                    data.arrayValue.values.forEach((value) => {
                        validateIndex(value);
                    });
                }
                else if (data.entityValue) {
                    Object.keys(data.entityValue.properties).forEach(path => {
                        validateIndex(data.entityValue.properties[path]);
                    });
                }
                else {
                    assert.strictEqual(data.excludeFromIndexes, true);
                }
            };
            request.request_ = (config) => {
                const properties = config.reqOpts.mutations[0].upsert.properties;
                Object.keys(properties).forEach(path => {
                    validateIndex(properties[path]);
                });
                done();
            };
            request.save({
                key,
                data,
                excludeFromIndexes: [
                    'longString',
                    'notMetadata',
                    'longStringArray[]',
                    'metadata.longString',
                    'metadata.otherProperty',
                    'metadata.obj.*',
                    'metadata.longStringArray[].*',
                ],
            }, assert.ifError);
        });
        mocha_1.it('should allow setting the indexed value on arrays', done => {
            request.request_ = (config) => {
                const property = config.reqOpts.mutations[0].upsert.properties.name;
                property.arrayValue.values.forEach((value) => {
                    assert.strictEqual(value.excludeFromIndexes, true);
                });
                done();
            };
            request.save({
                key,
                data: [
                    {
                        name: 'name',
                        value: ['one', 'two', 'three'],
                        excludeFromIndexes: true,
                    },
                ],
            }, assert.ifError);
        });
        mocha_1.it('should prepare excludeFromIndexes array for large values', done => {
            const longString = Buffer.alloc(1501, '.').toString();
            const data = {
                longString,
                notMetadata: true,
                longStringArray: [longString],
                metadata: {
                    longString,
                    otherProperty: 'value',
                    obj: {
                        longStringArray: [
                            {
                                longString,
                                nestedLongStringArray: [
                                    {
                                        longString,
                                        nestedProperty: true,
                                    },
                                    {
                                        longString,
                                    },
                                ],
                            },
                        ],
                    },
                    longStringArray: [
                        {
                            longString,
                            nestedLongStringArray: [
                                {
                                    longString,
                                    nestedProperty: true,
                                },
                                {
                                    longString,
                                },
                            ],
                        },
                    ],
                },
            };
            const excludeFromIndexes = [
                'longString',
                'longStringArray[]',
                'metadata.longString',
                'metadata.obj.longStringArray[].longString',
                'metadata.obj.longStringArray[].nestedLongStringArray[].longString',
                'metadata.longStringArray[].longString',
                'metadata.longStringArray[].nestedLongStringArray[].longString',
            ];
            entity_js_1.entity.entityToEntityProto = entity => {
                return entity;
            };
            request.request_ = (config) => {
                assert.strictEqual(config.reqOpts.mutations[0].upsert
                    .excludeLargeProperties, true);
                assert.deepStrictEqual(config.reqOpts.mutations[0].upsert.excludeFromIndexes, excludeFromIndexes);
                done();
            };
            request.save({
                key,
                data,
                excludeLargeProperties: true,
            }, assert.ifError);
        });
        mocha_1.it('should allow auto setting the indexed value of a property with excludeLargeProperties', done => {
            const longString = Buffer.alloc(1501, '.').toString();
            const data = [
                {
                    name: 'name',
                    value: longString,
                },
                {
                    name: 'description',
                    value: 'value',
                },
            ];
            request.request_ = (config) => {
                assert.deepStrictEqual(config.reqOpts.mutations[0].upsert.properties.name
                    .excludeFromIndexes, true);
                done();
            };
            request.save({
                key,
                data,
                excludeLargeProperties: true,
            }, assert.ifError);
        });
        mocha_1.it('should assign ID on keys without them', done => {
            const incompleteKey = new entity_js_1.entity.Key({ path: ['Incomplete'] });
            const incompleteKey2 = new entity_js_1.entity.Key({ path: ['Incomplete'] });
            const completeKey = new entity_js_1.entity.Key({ path: ['Complete', 'Key'] });
            const keyProtos = [];
            const ids = [1, 2];
            const response = {
                mutationResults: [
                    {
                        key: {},
                    },
                    {
                        key: {},
                    },
                    {},
                ],
            };
            request.request_ = (config, callback) => {
                callback(null, response);
            };
            sandbox.stub(entity_js_1.entity, 'keyFromKeyProto').callsFake(keyProto => {
                keyProtos.push(keyProto);
                return {
                    id: ids[keyProtos.length - 1],
                };
            });
            request.save([
                { key: incompleteKey, data: {} },
                { key: incompleteKey2, data: {} },
                { key: completeKey, data: {} },
            ], (err) => {
                assert.ifError(err);
                assert.strictEqual(incompleteKey.id, ids[0]);
                assert.strictEqual(incompleteKey2.id, ids[1]);
                assert.strictEqual(keyProtos.length, 2);
                assert.strictEqual(keyProtos[0], response.mutationResults[0].key);
                assert.strictEqual(keyProtos[1], response.mutationResults[1].key);
                done();
            });
        });
        mocha_1.describe('transactions', () => {
            beforeEach(() => {
                // Trigger transaction mode.
                request.id = 'transaction-id';
                request.requestCallbacks_ = [];
                request.requests_ = [];
            });
            mocha_1.it('should queue request & callback', () => {
                request.save({
                    key,
                    data: [{ name: 'name', value: 'value' }],
                });
                assert.strictEqual(typeof request.requestCallbacks_[0], 'function');
                assert.strictEqual(typeof request.requests_[0], 'object');
            });
        });
    });
    mocha_1.describe('update', () => {
        mocha_1.it('should prepare entity objects', done => {
            const entityObject = {};
            const preparedEntityObject = { prepared: true };
            const expectedEntityObject = Object.assign({}, preparedEntityObject, {
                method: 'update',
            });
            sandbox.stub(Request, 'prepareEntityObject_').callsFake(obj => {
                assert.strictEqual(obj, entityObject);
                return preparedEntityObject;
            });
            request.save = (entities) => {
                assert.deepStrictEqual(entities[0], expectedEntityObject);
                done();
            };
            request.update(entityObject, assert.ifError);
        });
        mocha_1.it('should pass the correct arguments to save', done => {
            request.save = (entities, callback) => {
                assert.deepStrictEqual(JSON.parse(JSON.stringify(entities)), [
                    {
                        key: {
                            namespace: 'ns',
                            kind: 'Company',
                            path: ['Company', null],
                        },
                        data: {},
                        method: 'update',
                    },
                ]);
                callback();
            };
            const key = new entity_js_1.entity.Key({ namespace: 'ns', path: ['Company'] });
            request.update({ key, data: {} }, done);
        });
    });
    mocha_1.describe('upsert', () => {
        mocha_1.it('should prepare entity objects', done => {
            const entityObject = {};
            const preparedEntityObject = { prepared: true };
            const expectedEntityObject = Object.assign({}, preparedEntityObject, {
                method: 'upsert',
            });
            sandbox.stub(Request, 'prepareEntityObject_').callsFake(obj => {
                assert.strictEqual(obj, entityObject);
                return preparedEntityObject;
            });
            request.save = (entities) => {
                assert.deepStrictEqual(entities[0], expectedEntityObject);
                done();
            };
            request.upsert(entityObject, assert.ifError);
        });
        mocha_1.it('should pass the correct arguments to save', done => {
            request.save = (entities, callback) => {
                assert.deepStrictEqual(JSON.parse(JSON.stringify(entities)), [
                    {
                        key: {
                            namespace: 'ns',
                            kind: 'Company',
                            path: ['Company', null],
                        },
                        data: {},
                        method: 'upsert',
                    },
                ]);
                callback();
            };
            const key = new entity_js_1.entity.Key({ namespace: 'ns', path: ['Company'] });
            request.upsert({ key, data: {} }, done);
        });
    });
    mocha_1.describe('merge', () => {
        // tslint:disable-next-line: variable-name
        let Transaction;
        let transaction;
        const PROJECT_ID = 'project-id';
        const NAMESPACE = 'a-namespace';
        const DATASTORE = {
            request_() { },
            projectId: PROJECT_ID,
            namespace: NAMESPACE,
        };
        const key = {
            namespace: 'ns',
            kind: 'Company',
            path: ['Company', null],
        };
        const entityObject = {};
        before(() => {
            Transaction = proxyquire('../src/transaction.js', {
                '@google-cloud/promisify': fakePfy,
            }).Transaction;
        });
        beforeEach(() => {
            transaction = new Transaction(DATASTORE);
            transaction.request_ = () => { };
            transaction.commit = async () => {
                return [{}];
            };
            request.datastore = {
                transaction: () => transaction,
            };
            // tslint:disable-next-line: no-any
            transaction.run = (callback) => {
                callback(null);
            };
            transaction.get = async () => {
                return [entityObject];
            };
            transaction.commit = async () => {
                return [{}];
            };
        });
        afterEach(() => sandbox.restore());
        mocha_1.it('should return merge object for entity', done => {
            const updatedEntityObject = {
                status: 'merged',
            };
            transaction.save = (modifiedData) => {
                assert.deepStrictEqual(modifiedData.data, Object.assign({}, entityObject, updatedEntityObject));
            };
            request.merge({ key, data: updatedEntityObject }, done);
        });
        mocha_1.it('should return merge objects for entities', done => {
            const updatedEntityObject = [
                {
                    id: 1,
                    status: 'merged',
                },
                {
                    id: 2,
                    status: 'merged',
                },
            ];
            transaction.commit = async () => {
                transaction.modifiedEntities_.forEach((entity, index) => {
                    assert.deepStrictEqual(entity.args[0].data, Object.assign({}, entityObject, updatedEntityObject[index]));
                });
                return [{}];
            };
            request.merge([
                { key, data: updatedEntityObject[0] },
                { key, data: updatedEntityObject[1] },
            ], done);
        });
        mocha_1.it('transaction should rollback if error on transaction run!', done => {
            sandbox
                .stub(transaction, 'run')
                .callsFake((gaxOption, callback) => {
                callback = typeof gaxOption === 'function' ? gaxOption : callback;
                callback(new Error('Error'));
            });
            request.merge({ key, data: null }, (err) => {
                assert.strictEqual(err.message, 'Error');
                done();
            });
        });
        mocha_1.it('transaction should rollback if error for for transaction get!', done => {
            sandbox.stub(transaction, 'get').rejects(new Error('Error'));
            request.merge({ key, data: null }, (err) => {
                assert.strictEqual(err.message, 'Error');
                done();
            });
        });
        mocha_1.it('transaction should rollback if error for for transaction commit!', done => {
            sandbox.stub(transaction, 'commit').rejects(new Error('Error'));
            request.merge({ key, data: null }, (err) => {
                assert.strictEqual(err.message, 'Error');
                done();
            });
        });
    });
    mocha_1.describe('request_', () => {
        const CONFIG = {
            client: 'FakeClient',
            method: 'method',
            reqOpts: {
                a: 'b',
                c: 'd',
            },
            gaxOpts: {
                a: 'b',
                c: 'd',
            },
        };
        const PROJECT_ID = 'project-id';
        beforeEach(() => {
            const clients_ = new Map();
            clients_.set(CONFIG.client, {
                [CONFIG.method]() { },
            });
            request.datastore = {
                clients_,
                auth: {
                    getProjectId(callback) {
                        callback(null, PROJECT_ID);
                    },
                },
            };
        });
        mocha_1.it('should get the project ID', done => {
            request.datastore.auth.getProjectId = () => {
                done();
            };
            request.request_(CONFIG, assert.ifError);
        });
        mocha_1.it('should return error if getting project ID failed', done => {
            const error = new Error('Error.');
            request.datastore.auth.getProjectId = (callback) => {
                callback(error);
            };
            request.request_(CONFIG, (err) => {
                assert.strictEqual(err, error);
                done();
            });
        });
        mocha_1.it('should initiate and cache the client', () => {
            const fakeClient = {
                [CONFIG.method]() { },
            };
            v1FakeClientOverride = (options) => {
                assert.deepStrictEqual(options, request.datastore.options);
                return fakeClient;
            };
            request.datastore.clients_ = new Map();
            request.request_(CONFIG, assert.ifError);
            const client = request.datastore.clients_.get(CONFIG.client);
            assert.strictEqual(client, fakeClient);
        });
        mocha_1.it('should use the cached client', done => {
            v1FakeClientOverride = () => {
                done(new Error('Should not re-instantiate a GAX client.'));
            };
            request.request_(CONFIG);
            done();
        });
        mocha_1.it('should replace the project ID token', done => {
            const replacedReqOpts = {};
            const expectedReqOpts = Object.assign({}, CONFIG.reqOpts);
            expectedReqOpts.projectId = request.projectId;
            pjyOverride = (reqOpts, projectId) => {
                assert.notStrictEqual(reqOpts, CONFIG.reqOpts);
                assert.deepStrictEqual(reqOpts, expectedReqOpts);
                assert.strictEqual(projectId, PROJECT_ID);
                return replacedReqOpts;
            };
            request.datastore.clients_ = new Map();
            request.datastore.clients_.set(CONFIG.client, {
                [CONFIG.method](reqOpts) {
                    assert.strictEqual(reqOpts, replacedReqOpts);
                    done();
                },
            });
            request.request_(CONFIG, assert.ifError);
        });
        mocha_1.it('should send gaxOpts', done => {
            request.datastore.clients_ = new Map();
            request.datastore.clients_.set(CONFIG.client, {
                // tslint:disable-next-line no-any
                [CONFIG.method](_, gaxO) {
                    delete gaxO.headers;
                    assert.deepStrictEqual(gaxO, CONFIG.gaxOpts);
                    done();
                },
            });
            request.request_(CONFIG, assert.ifError);
        });
        mocha_1.it('should send google-cloud-resource-prefix', done => {
            request.datastore.clients_ = new Map();
            request.datastore.clients_.set(CONFIG.client, {
                // tslint:disable-next-line no-any
                [CONFIG.method](_, gaxO) {
                    assert.deepStrictEqual(gaxO.headers, {
                        'google-cloud-resource-prefix': 'projects/' + PROJECT_ID,
                    });
                    done();
                },
            });
            request.request_(CONFIG, assert.ifError);
        });
        mocha_1.describe('commit', () => {
            mocha_1.it('should set the mode', done => {
                request.datastore.clients_ = new Map();
                request.datastore.clients_.set(CONFIG.client, {
                    commit(reqOpts) {
                        assert.strictEqual(reqOpts.mode, 'NON_TRANSACTIONAL');
                        done();
                    },
                });
                const config = Object.assign({}, CONFIG, {
                    method: 'commit',
                });
                request.request_(config, assert.ifError);
            });
        });
        mocha_1.describe('transaction', () => {
            const TRANSACTION_ID = 'transaction';
            beforeEach(() => {
                request.id = TRANSACTION_ID;
            });
            mocha_1.it('should set the commit transaction info', done => {
                request.datastore.clients_ = new Map();
                request.datastore.clients_.set(CONFIG.client, {
                    commit(reqOpts) {
                        assert.strictEqual(reqOpts.mode, 'TRANSACTIONAL');
                        assert.strictEqual(reqOpts.transaction, TRANSACTION_ID);
                        done();
                    },
                });
                const config = Object.assign({}, CONFIG, {
                    method: 'commit',
                });
                request.request_(config, assert.ifError);
            });
            mocha_1.it('should set the rollback transaction info', done => {
                request.datastore.clients_ = new Map();
                request.datastore.clients_.set(CONFIG.client, {
                    rollback(reqOpts) {
                        assert.strictEqual(reqOpts.transaction, TRANSACTION_ID);
                        done();
                    },
                });
                const config = Object.assign({}, CONFIG, {
                    method: 'rollback',
                });
                request.request_(config, assert.ifError);
            });
            mocha_1.it('should set the lookup transaction info', done => {
                const config = extend(true, {}, CONFIG, {
                    method: 'lookup',
                });
                request.datastore.clients_ = new Map();
                request.datastore.clients_.set(CONFIG.client, {
                    lookup(reqOpts) {
                        assert.strictEqual(reqOpts.readOptions.transaction, TRANSACTION_ID);
                        done();
                    },
                });
                request.request_(config, assert.ifError);
            });
            mocha_1.it('should set the runQuery transaction info', done => {
                const config = extend(true, {}, CONFIG, {
                    method: 'runQuery',
                });
                request.datastore.clients_ = new Map();
                request.datastore.clients_.set(CONFIG.client, {
                    runQuery(reqOpts) {
                        assert.strictEqual(reqOpts.readOptions.transaction, TRANSACTION_ID);
                        done();
                    },
                });
                request.request_(config, assert.ifError);
            });
            mocha_1.it('should throw if read consistency is specified', () => {
                const config = extend(true, {}, CONFIG, {
                    method: 'runQuery',
                    reqOpts: {
                        readOptions: {
                            readConsistency: 1,
                        },
                    },
                });
                assert.throws(() => {
                    request.request_(config, assert.ifError);
                }, /Read consistency cannot be specified in a transaction\./);
            });
        });
    });
});
//# sourceMappingURL=request.js.map