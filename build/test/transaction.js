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
const pfy = require("@google-cloud/promisify");
const arrify = require("arrify");
const assert = require("assert");
const mocha_1 = require("mocha");
const proxyquire = require("proxyquire");
const { entity } = require('../src/entity');
let promisified = false;
const fakePfy = Object.assign({}, pfy, {
    promisifyAll(klass, options) {
        if (klass.name !== 'Transaction') {
            return;
        }
        promisified = true;
        assert.deepStrictEqual(options.exclude, ['createQuery', 'delete', 'save']);
    },
});
// tslint:disable-next-line variable-name
const DatastoreRequestOverride = {
    delete() { },
    save() { },
};
class FakeDatastoreRequest {
    delete() {
        const args = [].slice.apply(arguments);
        const results = DatastoreRequestOverride.delete.apply(null, args);
        DatastoreRequestOverride.delete = (() => { });
        return results;
    }
    save() {
        const args = [].slice.apply(arguments);
        const results = DatastoreRequestOverride.save.apply(null, args);
        DatastoreRequestOverride.save = (() => { });
        return results;
    }
}
mocha_1.describe('Transaction', () => {
    // tslint:disable-next-line variable-name
    let Transaction;
    let transaction;
    const TRANSACTION_ID = 'transaction-id';
    const PROJECT_ID = 'project-id';
    const NAMESPACE = 'a-namespace';
    const DATASTORE = {
        request_() { },
        projectId: PROJECT_ID,
        namespace: NAMESPACE,
    };
    function key(path) {
        return new entity.Key({ path: arrify(path) });
    }
    before(() => {
        Transaction = proxyquire('../src/transaction.js', {
            '@google-cloud/promisify': fakePfy,
            './request.js': { DatastoreRequest: FakeDatastoreRequest },
        }).Transaction;
    });
    beforeEach(() => {
        transaction = new Transaction(DATASTORE);
    });
    mocha_1.describe('instantiation', () => {
        mocha_1.it('should promisify all the things', () => {
            assert(promisified);
        });
        mocha_1.it('should localize the datastore instance', () => {
            assert.strictEqual(transaction.datastore, DATASTORE);
        });
        mocha_1.it('should localize the project ID', () => {
            assert.strictEqual(transaction.projectId, PROJECT_ID);
        });
        mocha_1.it('should localize the namespace', () => {
            assert.strictEqual(transaction.namespace, NAMESPACE);
        });
        mocha_1.it('should localize the transaction ID', () => {
            const options = {
                id: 'transaction-id',
            };
            const transaction = new Transaction(DATASTORE, options);
            assert.strictEqual(transaction.id, options.id);
        });
        mocha_1.it('should localize readOnly', () => {
            const options = {
                readOnly: true,
            };
            const transaction = new Transaction(DATASTORE, options);
            assert.strictEqual(transaction.readOnly, true);
        });
        mocha_1.it('should localize request function', done => {
            const fakeDataset = {
                request_: {
                    bind(context) {
                        assert.strictEqual(context, fakeDataset);
                        setImmediate(() => {
                            assert.strictEqual(transaction.request, fakeDataset.request);
                            done();
                        });
                        return fakeDataset.request;
                    },
                },
            };
            const transaction = new Transaction(fakeDataset);
        });
        mocha_1.it('should localize default properties', () => {
            assert.deepStrictEqual(transaction.modifiedEntities_, []);
            assert.deepStrictEqual(transaction.requestCallbacks_, []);
            assert.deepStrictEqual(transaction.requests_, []);
        });
    });
    mocha_1.describe('commit', () => {
        beforeEach(() => {
            transaction.id = TRANSACTION_ID;
        });
        mocha_1.it('should commit', done => {
            transaction.request_ = config => {
                assert.strictEqual(config.client, 'DatastoreClient');
                assert.strictEqual(config.method, 'commit');
                assert.deepStrictEqual(config.gaxOpts, {});
                done();
            };
            transaction.commit();
        });
        mocha_1.it('should accept gaxOptions', done => {
            const gaxOptions = {};
            transaction.request_ = config => {
                assert.deepStrictEqual(config.gaxOpts, {});
                done();
            };
            transaction.commit(gaxOptions);
        });
        mocha_1.it('should skip the commit', done => {
            transaction.skipCommit = true;
            // If called, the test will blow up.
            transaction.request_ = done;
            transaction.commit(done);
        });
        mocha_1.describe('errors', () => {
            const error = new Error('Error.');
            const apiResponse = {};
            const rollbackError = new Error('Error.');
            const rollbackApiResponse = {};
            beforeEach(() => {
                transaction.rollback = ((callback) => {
                    callback(rollbackError, rollbackApiResponse);
                });
                transaction.request_ = (config, callback) => {
                    callback(error, apiResponse);
                };
            });
            mocha_1.it('should pass the commit error to the callback', done => {
                transaction.commit((err, resp) => {
                    assert.strictEqual(err, error);
                    assert.strictEqual(resp, apiResponse);
                    done();
                });
            });
        });
        mocha_1.it('should pass apiResponse to callback', done => {
            const resp = { success: true };
            transaction.request_ = (config, callback) => {
                callback(null, resp);
            };
            transaction.commit((err, apiResponse) => {
                assert.ifError(err);
                assert.deepStrictEqual(resp, apiResponse);
                done();
            });
        });
        mocha_1.it('should group mutations & execute original methods', () => {
            const deleteArg1 = key(['Product', 123]);
            const deleteArg2 = key(['Product', 234]);
            const saveArg1 = { key: key(['Product', 345]), data: '' };
            const saveArg2 = { key: key(['Product', 456]), data: '' };
            // Queue saves & deletes in varying order.
            transaction.delete(deleteArg1);
            transaction.save(saveArg1);
            transaction.delete(deleteArg2);
            transaction.save(saveArg2);
            const args = [];
            let deleteCalled = 0;
            DatastoreRequestOverride.delete = ((a) => {
                args.push(a);
                deleteCalled++;
            });
            let saveCalled = 0;
            DatastoreRequestOverride.save = ((a) => {
                args.push(a);
                saveCalled++;
            });
            transaction.request_ = () => { };
            transaction.commit();
            assert.strictEqual(deleteCalled, 1);
            assert.strictEqual(saveCalled, 1);
            assert.strictEqual(args.length, 2);
            // Save arguments must come first.
            assert.deepStrictEqual(args, [
                [saveArg1, saveArg2],
                [deleteArg1, deleteArg2],
            ]);
        });
        mocha_1.it('should honor ordering of mutations (last wins)', () => {
            // The delete should be ignored.
            transaction.delete(key(['Product', 123]));
            transaction.save({ key: key(['Product', 123]), data: '' });
            let deleteCalled = 0;
            DatastoreRequestOverride.delete = (() => {
                deleteCalled++;
            });
            let saveCalled = 0;
            DatastoreRequestOverride.save = (() => {
                saveCalled++;
            });
            transaction.request_ = () => { };
            transaction.commit();
            assert.strictEqual(deleteCalled, 0);
            assert.strictEqual(saveCalled, 1);
        });
        mocha_1.it('should not squash key-incomplete mutations', done => {
            transaction.save({ key: key(['Product']), data: '' });
            transaction.save({ key: key(['Product']), data: '' });
            DatastoreRequestOverride.save = ((entities) => {
                assert.strictEqual(entities.length, 2);
                done();
            });
            transaction.request_ = () => { };
            transaction.commit();
        });
        mocha_1.it('should send the built request object', done => {
            transaction.requests_ = [
                {
                    mutations: [{ a: 'b' }, { c: 'd' }],
                },
                {
                    mutations: [{ e: 'f' }, { g: 'h' }],
                },
            ];
            transaction.request_ = config => {
                assert.deepStrictEqual(config.reqOpts, {
                    mutations: [{ a: 'b' }, { c: 'd' }, { e: 'f' }, { g: 'h' }],
                });
                done();
            };
            transaction.commit();
        });
        mocha_1.it('should execute the queued callbacks', () => {
            let cb1Called = false;
            let cb2Called = false;
            transaction.requestCallbacks_ = [
                () => {
                    cb1Called = true;
                },
                () => {
                    cb2Called = true;
                },
            ];
            transaction.request_ = (config, cb) => {
                cb();
            };
            transaction.commit();
            assert(cb1Called);
            assert(cb2Called);
        });
    });
    mocha_1.describe('createQuery', () => {
        mocha_1.it('should return query from datastore.createQuery', () => {
            const args = ['0', '1']; // Query only accepts to accept string||null values
            const createQueryReturnValue = {};
            transaction.datastore.createQuery = function (...ags) {
                assert.strictEqual(this, transaction);
                assert.strictEqual(ags[0], args[0]);
                assert.strictEqual(ags[1], args[1]);
                return createQueryReturnValue;
            };
            const query = transaction.createQuery(args[0], args[1]); // verbose de-structure
            assert.strictEqual(query, createQueryReturnValue);
        });
    });
    mocha_1.describe('delete', () => {
        mocha_1.it('should push entities into a queue', () => {
            const keys = [key('Product123'), key('Product234'), key('Product345')];
            transaction.delete(keys);
            assert.strictEqual(transaction.modifiedEntities_.length, keys.length);
            transaction.modifiedEntities_.forEach((queuedEntity) => {
                assert.strictEqual(queuedEntity.method, 'delete');
                assert(keys.indexOf(queuedEntity.entity.key) > -1);
                assert.deepStrictEqual(queuedEntity.args, [queuedEntity.entity.key]);
            });
        });
    });
    mocha_1.describe('rollback', () => {
        beforeEach(() => {
            transaction.id = TRANSACTION_ID;
        });
        mocha_1.it('should rollback', done => {
            transaction.request_ = config => {
                assert.strictEqual(config.client, 'DatastoreClient');
                assert.strictEqual(config.method, 'rollback');
                assert.deepStrictEqual(config.gaxOpts, {});
                done();
            };
            transaction.rollback();
        });
        mocha_1.it('should allow setting gaxOptions', done => {
            const gaxOptions = {};
            transaction.request_ = config => {
                assert.strictEqual(config.gaxOpts, gaxOptions);
                done();
            };
            transaction.rollback(gaxOptions);
        });
        mocha_1.it('should pass error to callback', done => {
            const error = new Error('Error.');
            transaction.request_ = (config, callback) => {
                callback(error);
            };
            transaction.rollback(err => {
                assert.deepStrictEqual(err, error);
                done();
            });
        });
        mocha_1.it('should pass apiResponse to callback', done => {
            const resp = { success: true };
            transaction.request_ = (config, callback) => {
                callback(null, resp);
            };
            transaction.rollback((err, apiResponse) => {
                assert.ifError(err);
                assert.deepStrictEqual(resp, apiResponse);
                done();
            });
        });
        mocha_1.it('should set skipCommit', done => {
            transaction.request_ = (config, callback) => {
                callback();
            };
            transaction.rollback(() => {
                assert.strictEqual(transaction.skipCommit, true);
                done();
            });
        });
        mocha_1.it('should set skipCommit when rollback errors', done => {
            transaction.request_ = (config, callback) => {
                callback(new Error('Error.'));
            };
            transaction.rollback(() => {
                assert.strictEqual(transaction.skipCommit, true);
                done();
            });
        });
    });
    mocha_1.describe('run', () => {
        mocha_1.it('should make the correct API request', done => {
            transaction.request_ = config => {
                assert.strictEqual(config.client, 'DatastoreClient');
                assert.strictEqual(config.method, 'beginTransaction');
                assert.deepStrictEqual(config.reqOpts, { transactionOptions: {} });
                assert.strictEqual(config.gaxOpts, undefined);
                done();
            };
            transaction.run(assert.ifError);
        });
        mocha_1.it('should allow setting gaxOptions', done => {
            const gaxOptions = {};
            transaction.request_ = config => {
                assert.strictEqual(config.gaxOpts, gaxOptions);
                done();
            };
            transaction.run({ gaxOptions });
        });
        mocha_1.describe('options.readOnly', () => {
            mocha_1.it('should respect the readOnly option', done => {
                const options = {
                    readOnly: true,
                };
                transaction.request_ = (config) => {
                    assert.deepStrictEqual(config.reqOpts.transactionOptions.readOnly, {});
                    done();
                };
                transaction.run(options, assert.ifError);
            });
            mocha_1.it('should respect the global readOnly option', done => {
                transaction.readOnly = true;
                transaction.request_ = config => {
                    assert.deepStrictEqual(config.reqOpts.transactionOptions.readOnly, {});
                    done();
                };
                transaction.run(assert.ifError);
            });
        });
        mocha_1.describe('options.transactionId', () => {
            mocha_1.it('should respect the transactionId option', done => {
                const options = {
                    transactionId: 'transaction-id',
                };
                transaction.request_ = config => {
                    assert.deepStrictEqual(config.reqOpts.transactionOptions.readWrite, {
                        previousTransaction: options.transactionId,
                    });
                    done();
                };
                transaction.run(options, assert.ifError);
            });
            mocha_1.it('should respect the global transactionId option', done => {
                transaction.id = 'transaction-id';
                transaction.request_ = config => {
                    assert.deepStrictEqual(config.reqOpts.transactionOptions.readWrite, {
                        previousTransaction: transaction.id,
                    });
                    done();
                };
                transaction.run(assert.ifError);
            });
        });
        mocha_1.describe('options.transactionOptions', () => {
            mocha_1.it('should allow full override of transactionOptions', done => {
                transaction.readOnly = true;
                const options = {
                    transactionOptions: {
                        readWrite: {
                            previousTransaction: 'transaction-id',
                        },
                    },
                };
                transaction.request_ = config => {
                    assert.deepStrictEqual(config.reqOpts, options);
                    done();
                };
                transaction.run(options, assert.ifError);
            });
        });
        mocha_1.describe('error', () => {
            const error = new Error('Error.');
            const apiResponse = {};
            beforeEach(() => {
                transaction.request_ = (config, callback) => {
                    callback(error, apiResponse);
                };
            });
            mocha_1.it('should pass error & API response to callback', done => {
                transaction.run((err, transaction, apiResponse_) => {
                    assert.strictEqual(err, error);
                    assert.strictEqual(transaction, null);
                    assert.strictEqual(apiResponse_, apiResponse);
                    done();
                });
            });
        });
        mocha_1.describe('success', () => {
            const apiResponse = {
                transaction: TRANSACTION_ID,
            };
            beforeEach(() => {
                transaction.request_ = (config, callback) => {
                    callback(null, apiResponse);
                };
            });
            mocha_1.it('should set transaction id', done => {
                delete transaction.id;
                transaction.run((err) => {
                    assert.ifError(err);
                    assert.strictEqual(transaction.id, TRANSACTION_ID);
                    done();
                });
            });
            mocha_1.it('should exec callback with Transaction & apiResponse', done => {
                transaction.run((err, transaction_, apiResponse_) => {
                    assert.ifError(err);
                    assert.strictEqual(transaction_, transaction);
                    assert.deepStrictEqual(apiResponse_, apiResponse);
                    done();
                });
            });
        });
    });
    mocha_1.describe('save', () => {
        mocha_1.it('should push entities into a queue', () => {
            const entities = [
                { key: key('Product123'), data: 123 },
                { key: key('Product234'), data: 234 },
                { key: key('Product345'), data: 345 },
            ];
            transaction.save(entities);
            assert.strictEqual(transaction.modifiedEntities_.length, entities.length);
            transaction.modifiedEntities_.forEach((queuedEntity) => {
                assert.strictEqual(queuedEntity.method, 'save');
                const match = entities.filter(ent => {
                    return ent.key === queuedEntity.entity.key;
                })[0];
                assert.deepStrictEqual(queuedEntity.args, [match]);
            });
        });
    });
});
//# sourceMappingURL=transaction.js.map