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
const assert = require("assert");
const mocha_1 = require("mocha");
const gax = require("google-gax");
const proxyquire = require("proxyquire");
const entity_1 = require("../src/entity");
const v1 = require('../src/v1/index.js');
// tslint:disable-next-line no-any
const fakeEntity = {
    KEY_SYMBOL: Symbol('fake key symbol'),
    Int: class {
        constructor(value) {
            this.value = value;
        }
    },
    isDsInt() {
        this.calledWith_ = arguments;
    },
    Double: class {
        constructor(value) {
            this.value = value;
        }
    },
    isDsDouble() {
        this.calledWith_ = arguments;
    },
    GeoPoint: class {
        constructor(value) {
            this.value = value;
        }
    },
    isDsGeoPoint() {
        this.calledWith_ = arguments;
    },
    Key: class {
        constructor() {
            this.calledWith_ = arguments;
        }
    },
    isDsKey() {
        this.calledWith_ = arguments;
    },
    URLSafeKey: entity_1.entity.URLSafeKey,
};
let googleAuthOverride;
function fakeGoogleAuth() {
    return (googleAuthOverride || (() => { })).apply(null, arguments);
}
let createInsecureOverride;
const fakeGoogleGax = {
    GrpcClient: class extends gax.GrpcClient {
        constructor(opts) {
            // super constructor must be called first!
            super(opts);
            this.grpc = {
                credentials: {
                    createInsecure() {
                        return (createInsecureOverride || (() => { })).apply(null, arguments);
                    },
                },
            };
        }
    },
};
class FakeQuery {
    constructor() {
        this.calledWith_ = arguments;
    }
}
class FakeTransaction {
    constructor() {
        this.calledWith_ = arguments;
    }
}
function FakeV1() { }
mocha_1.describe('Datastore', () => {
    // tslint:disable-next-line variable-name
    let Datastore;
    let datastore;
    const PROJECT_ID = 'project-id';
    const NAMESPACE = 'namespace';
    const DATASTORE_PROJECT_ID_CACHED = process.env.DATASTORE_PROJECT_ID;
    const OPTIONS = {
        projectId: PROJECT_ID,
        apiEndpoint: 'http://endpoint',
        credentials: {},
        keyFilename: 'key/file',
        email: 'email',
        namespace: NAMESPACE,
    };
    before(() => {
        Datastore = proxyquire('../src', {
            './entity.js': { entity: fakeEntity },
            './query.js': { Query: FakeQuery },
            './transaction.js': { Transaction: FakeTransaction },
            './v1': FakeV1,
            'google-auth-library': {
                GoogleAuth: fakeGoogleAuth,
            },
            'google-gax': fakeGoogleGax,
        }).Datastore;
    });
    beforeEach(() => {
        createInsecureOverride = null;
        googleAuthOverride = null;
        datastore = new Datastore({
            projectId: PROJECT_ID,
            namespace: NAMESPACE,
        });
    });
    afterEach(() => {
        if (typeof DATASTORE_PROJECT_ID_CACHED === 'string') {
            process.env.DATASTORE_PROJECT_ID = DATASTORE_PROJECT_ID_CACHED;
        }
        else {
            delete process.env.DATASTORE_PROJECT_ID;
        }
    });
    after(() => {
        createInsecureOverride = null;
        googleAuthOverride = null;
    });
    mocha_1.it('should export GAX client', () => {
        assert.ok(require('../src').v1);
    });
    mocha_1.describe('instantiation', () => {
        mocha_1.it('should initialize an empty Client map', () => {
            assert(datastore.clients_ instanceof Map);
            assert.strictEqual(datastore.clients_.size, 0);
        });
        mocha_1.it('should alias itself to the datastore property', () => {
            assert.strictEqual(datastore.datastore, datastore);
        });
        mocha_1.it('should localize the namespace', () => {
            assert.strictEqual(datastore.namespace, NAMESPACE);
        });
        mocha_1.it('should localize the projectId', () => {
            assert.strictEqual(datastore.projectId, PROJECT_ID);
            assert.strictEqual(datastore.options.projectId, PROJECT_ID);
        });
        mocha_1.it('should default project ID to placeholder', () => {
            const datastore = new Datastore({});
            assert.strictEqual(datastore.projectId, '{{projectId}}');
        });
        mocha_1.it('should not default options.projectId to placeholder', () => {
            const datastore = new Datastore({});
            assert.strictEqual(datastore.options.projectId, undefined);
        });
        mocha_1.it('should use DATASTORE_PROJECT_ID', () => {
            const projectId = 'overridden-project-id';
            process.env.DATASTORE_PROJECT_ID = projectId;
            const datastore = new Datastore({});
            assert.strictEqual(datastore.projectId, projectId);
            assert.strictEqual(datastore.options.projectId, projectId);
        });
        mocha_1.it('should set the default base URL', () => {
            assert.strictEqual(datastore.defaultBaseUrl_, 'datastore.googleapis.com');
        });
        mocha_1.it('should set default API connection details', done => {
            const determineBaseUrl_ = Datastore.prototype.determineBaseUrl_;
            Datastore.prototype.determineBaseUrl_ = customApiEndpoint => {
                Datastore.prototype.determineBaseUrl_ = determineBaseUrl_;
                assert.strictEqual(customApiEndpoint, OPTIONS.apiEndpoint);
                done();
            };
            const d = new Datastore(OPTIONS);
        });
        mocha_1.it('should localize the options', () => {
            delete process.env.DATASTORE_PROJECT_ID;
            const options = {
                a: 'b',
                c: 'd',
            };
            const datastore = new Datastore(options);
            assert.notStrictEqual(datastore.options, options);
            assert.deepStrictEqual(datastore.options, Object.assign({
                libName: 'gccl',
                libVersion: require('../../package.json').version,
                scopes: v1.DatastoreClient.scopes,
                servicePath: datastore.baseUrl_,
                port: 443,
                projectId: undefined,
            }, options));
        });
        mocha_1.it('should set port if detected', () => {
            const determineBaseUrl_ = Datastore.prototype.determineBaseUrl_;
            const port = 99;
            Datastore.prototype.determineBaseUrl_ = function () {
                Datastore.prototype.determineBaseUrl_ = determineBaseUrl_;
                this.port_ = port;
            };
            const datastore = new Datastore(OPTIONS);
            // tslint:disable-next-line no-any
            assert.strictEqual(datastore.options.port, port);
        });
        mocha_1.it('should set grpc ssl credentials if custom endpoint', () => {
            const determineBaseUrl_ = Datastore.prototype.determineBaseUrl_;
            Datastore.prototype.determineBaseUrl_ = function () {
                Datastore.prototype.determineBaseUrl_ = determineBaseUrl_;
                this.customEndpoint_ = true;
            };
            const fakeInsecureCreds = {};
            createInsecureOverride = () => {
                return fakeInsecureCreds;
            };
            const datastore = new Datastore(OPTIONS);
            assert.strictEqual(datastore.options.sslCreds, fakeInsecureCreds);
        });
        mocha_1.it('should cache a local GoogleAuth instance', () => {
            const fakeGoogleAuthInstance = {};
            googleAuthOverride = () => {
                return fakeGoogleAuthInstance;
            };
            const datastore = new Datastore({});
            assert.strictEqual(datastore.auth, fakeGoogleAuthInstance);
        });
    });
    mocha_1.describe('double', () => {
        mocha_1.it('should expose Double builder', () => {
            const aDouble = 7.0;
            const double = Datastore.double(aDouble);
            assert.strictEqual(double.value, aDouble);
        });
        mocha_1.it('should also be on the prototype', () => {
            const aDouble = 7.0;
            const double = datastore.double(aDouble);
            assert.strictEqual(double.value, aDouble);
        });
    });
    mocha_1.describe('geoPoint', () => {
        mocha_1.it('should expose GeoPoint builder', () => {
            const aGeoPoint = { latitude: 24, longitude: 88 };
            const geoPoint = Datastore.geoPoint(aGeoPoint);
            assert.strictEqual(geoPoint.value, aGeoPoint);
        });
        mocha_1.it('should also be on the prototype', () => {
            const aGeoPoint = { latitude: 24, longitude: 88 };
            const geoPoint = datastore.geoPoint(aGeoPoint);
            assert.strictEqual(geoPoint.value, aGeoPoint);
        });
    });
    mocha_1.describe('int', () => {
        mocha_1.it('should expose Int builder', () => {
            const anInt = 7;
            const int = Datastore.int(anInt);
            assert.strictEqual(int.value, anInt);
        });
        mocha_1.it('should also be on the prototype', () => {
            const anInt = 7;
            const int = datastore.int(anInt);
            assert.strictEqual(int.value, anInt);
        });
    });
    mocha_1.describe('isDouble', () => {
        mocha_1.it('should pass value to entity', () => {
            const value = 0.42;
            let called = false;
            const saved = fakeEntity.isDsDouble;
            fakeEntity.isDsDouble = (arg) => {
                assert.strictEqual(arg, value);
                called = true;
                return false;
            };
            assert.strictEqual(datastore.isDouble(value), false);
            assert.strictEqual(called, true);
            fakeEntity.isDsDouble = saved;
        });
        mocha_1.it('should expose Double identifier', () => {
            const something = {};
            Datastore.isDouble(something);
            assert.strictEqual(fakeEntity.calledWith_[0], something);
        });
    });
    mocha_1.describe('isGeoPoint', () => {
        mocha_1.it('should pass value to entity', () => {
            const value = { fakeLatitude: 1, fakeLongitude: 2 };
            let called = false;
            const saved = fakeEntity.isDsGeoPoint;
            fakeEntity.isDsGeoPoint = (arg) => {
                assert.strictEqual(arg, value);
                called = true;
                return false;
            };
            assert.strictEqual(datastore.isGeoPoint(value), false);
            assert.strictEqual(called, true);
            fakeEntity.isDsGeoPoint = saved;
        });
        mocha_1.it('should expose GeoPoint identifier', () => {
            const something = {};
            Datastore.isGeoPoint(something);
            assert.strictEqual(fakeEntity.calledWith_[0], something);
        });
    });
    mocha_1.describe('isInt', () => {
        mocha_1.it('should pass value to entity', () => {
            const value = 42;
            let called = false;
            const saved = fakeEntity.isDsInt;
            fakeEntity.isDsInt = (arg) => {
                assert.strictEqual(arg, value);
                called = true;
                return false;
            };
            assert.strictEqual(datastore.isInt(value), false);
            assert.strictEqual(called, true);
            fakeEntity.isDsInt = saved;
        });
        mocha_1.it('should expose Int identifier', () => {
            const something = {};
            Datastore.isInt(something);
            assert.strictEqual(fakeEntity.calledWith_[0], something);
        });
    });
    mocha_1.describe('isKey', () => {
        mocha_1.it('should pass value to entity', () => {
            const value = { zz: true };
            let called = false;
            const saved = fakeEntity.isDsKey;
            fakeEntity.isDsKey = (arg) => {
                assert.strictEqual(arg, value);
                called = true;
                return false;
            };
            assert.strictEqual(datastore.isKey(value), false);
            assert.strictEqual(called, true);
            fakeEntity.isDsKey = saved;
        });
        mocha_1.it('should expose Key identifier', () => {
            const something = {};
            datastore.isKey(something);
            assert.strictEqual(fakeEntity.calledWith_[0], something);
        });
    });
    mocha_1.describe('KEY', () => {
        mocha_1.it('should expose the KEY symbol', () => {
            assert.strictEqual(Datastore.KEY, fakeEntity.KEY_SYMBOL);
        });
        mocha_1.it('should also be on the prototype', () => {
            assert.strictEqual(datastore.KEY, Datastore.KEY);
        });
    });
    mocha_1.describe('MORE_RESULTS_AFTER_CURSOR', () => {
        mocha_1.it('should expose a MORE_RESULTS_AFTER_CURSOR helper', () => {
            assert.strictEqual(Datastore.MORE_RESULTS_AFTER_CURSOR, 'MORE_RESULTS_AFTER_CURSOR');
        });
        mocha_1.it('should also be on the prototype', () => {
            assert.strictEqual(datastore.MORE_RESULTS_AFTER_CURSOR, Datastore.MORE_RESULTS_AFTER_CURSOR);
        });
    });
    mocha_1.describe('MORE_RESULTS_AFTER_LIMIT', () => {
        mocha_1.it('should expose a MORE_RESULTS_AFTER_LIMIT helper', () => {
            assert.strictEqual(Datastore.MORE_RESULTS_AFTER_LIMIT, 'MORE_RESULTS_AFTER_LIMIT');
        });
        mocha_1.it('should also be on the prototype', () => {
            assert.strictEqual(datastore.MORE_RESULTS_AFTER_LIMIT, Datastore.MORE_RESULTS_AFTER_LIMIT);
        });
    });
    mocha_1.describe('NO_MORE_RESULTS', () => {
        mocha_1.it('should expose a NO_MORE_RESULTS helper', () => {
            assert.strictEqual(Datastore.NO_MORE_RESULTS, 'NO_MORE_RESULTS');
        });
        mocha_1.it('should also be on the prototype', () => {
            assert.strictEqual(datastore.NO_MORE_RESULTS, Datastore.NO_MORE_RESULTS);
        });
    });
    mocha_1.describe('createQuery', () => {
        mocha_1.it('should return a Query object', () => {
            const namespace = 'namespace';
            const kind = ['Kind'];
            // tslint:disable-next-line no-any
            const query = datastore.createQuery(namespace, kind);
            assert(query instanceof FakeQuery);
            assert.strictEqual(query.calledWith_[0], datastore);
            assert.strictEqual(query.calledWith_[1], namespace);
            assert.deepStrictEqual(query.calledWith_[2], kind);
        });
        mocha_1.it('should include the default namespace', () => {
            const kind = ['Kind'];
            // tslint:disable-next-line no-any
            const query = datastore.createQuery(kind);
            assert.strictEqual(query.calledWith_[0], datastore);
            assert.strictEqual(query.calledWith_[1], datastore.namespace);
            assert.deepStrictEqual(query.calledWith_[2], kind);
        });
        mocha_1.it('should include the default namespace in a kindless query', () => {
            // tslint:disable-next-line no-any
            const query = datastore.createQuery();
            assert.strictEqual(query.calledWith_[0], datastore);
            assert.strictEqual(query.calledWith_[1], datastore.namespace);
            assert.deepStrictEqual(query.calledWith_[2], []);
        });
    });
    mocha_1.describe('key', () => {
        mocha_1.it('should return a Key object', () => {
            const options = {};
            // tslint:disable-next-line no-any
            const key = datastore.key(options);
            assert.strictEqual(key.calledWith_[0], options);
        });
        mocha_1.it('should use a non-object argument as the path', () => {
            const options = 'path';
            // tslint:disable-next-line no-any
            const key = datastore.key(options);
            assert.strictEqual(key.calledWith_[0].namespace, datastore.namespace);
            assert.deepStrictEqual(key.calledWith_[0].path, [options]);
        });
    });
    mocha_1.describe('transaction', () => {
        mocha_1.it('should return a Transaction object', () => {
            const transaction = datastore.transaction();
            assert.strictEqual(transaction.calledWith_[0], datastore);
        });
        mocha_1.it('should pass options to the Transaction constructor', () => {
            const options = {};
            const transaction = datastore.transaction(options);
            assert.strictEqual(transaction.calledWith_[1], options);
        });
    });
    mocha_1.describe('determineBaseUrl_', () => {
        function setHost(host) {
            process.env.DATASTORE_EMULATOR_HOST = host;
        }
        beforeEach(() => {
            delete process.env.DATASTORE_EMULATOR_HOST;
        });
        mocha_1.it('should default to defaultBaseUrl_', () => {
            const defaultBaseUrl_ = 'defaulturl';
            datastore.defaultBaseUrl_ = defaultBaseUrl_;
            datastore.determineBaseUrl_();
            assert.strictEqual(datastore.baseUrl_, defaultBaseUrl_);
        });
        mocha_1.it('should remove slashes from the baseUrl', () => {
            const expectedBaseUrl = 'localhost';
            setHost('localhost/');
            datastore.determineBaseUrl_();
            assert.strictEqual(datastore.baseUrl_, expectedBaseUrl);
            setHost('localhost//');
            datastore.determineBaseUrl_();
            assert.strictEqual(datastore.baseUrl_, expectedBaseUrl);
        });
        mocha_1.it('should remove the protocol if specified', () => {
            setHost('http://localhost');
            datastore.determineBaseUrl_();
            assert.strictEqual(datastore.baseUrl_, 'localhost');
            setHost('https://localhost');
            datastore.determineBaseUrl_();
            assert.strictEqual(datastore.baseUrl_, 'localhost');
        });
        mocha_1.it('should set Numberified port if one was found', () => {
            setHost('http://localhost:9090');
            datastore.determineBaseUrl_();
            assert.strictEqual(datastore.port_, 9090);
        });
        mocha_1.it('should not set customEndpoint_ when using default baseurl', () => {
            const datastore = new Datastore({ projectId: PROJECT_ID });
            datastore.determineBaseUrl_();
            assert.strictEqual(datastore.customEndpoint_, undefined);
        });
        mocha_1.it('should set customEndpoint_ when using custom API endpoint', () => {
            datastore.determineBaseUrl_('apiEndpoint');
            assert.strictEqual(datastore.customEndpoint_, true);
        });
        mocha_1.it('should set baseUrl when using custom API endpoint', () => {
            datastore.determineBaseUrl_('apiEndpoint');
            assert.strictEqual(datastore.baseUrl_, 'apiEndpoint');
        });
        mocha_1.describe('with DATASTORE_EMULATOR_HOST environment variable', () => {
            const DATASTORE_EMULATOR_HOST = 'localhost:9090';
            const EXPECTED_BASE_URL = 'localhost';
            const EXPECTED_PORT = 9090;
            beforeEach(() => {
                setHost(DATASTORE_EMULATOR_HOST);
            });
            after(() => {
                delete process.env.DATASTORE_EMULATOR_HOST;
            });
            mocha_1.it('should use the DATASTORE_EMULATOR_HOST env var', () => {
                datastore.determineBaseUrl_();
                assert.strictEqual(datastore.baseUrl_, EXPECTED_BASE_URL);
                assert.strictEqual(datastore.port_, EXPECTED_PORT);
            });
            mocha_1.it('should set customEndpoint_', () => {
                datastore.determineBaseUrl_();
                assert.strictEqual(datastore.customEndpoint_, true);
            });
        });
    });
    mocha_1.describe('keyToLegacyUrlSafe', () => {
        mocha_1.it('should convert key to URL-safe base64 string', () => {
            const key = new entity_1.entity.Key({
                path: ['Task', 'Test'],
            });
            const base64EndocdedUrlSafeKey = 'agpwcm9qZWN0LWlkcg4LEgRUYXNrIgRUZXN0DA';
            // tslint:disable-next-line: no-any
            datastore.auth.getProjectId = (callback) => {
                callback(null, 'project-id');
            };
            datastore.keyToLegacyUrlSafe(key, (err, urlSafeKey) => {
                assert.ifError(err);
                assert.strictEqual(urlSafeKey, base64EndocdedUrlSafeKey);
            });
        });
        mocha_1.it('should convert key to URL-safe base64 string with location prefix', () => {
            const key = new entity_1.entity.Key({
                path: ['Task', 'Test'],
            });
            const locationPrefix = 's~';
            const base64EndocdedUrlSafeKey = 'agxzfnByb2plY3QtaWRyDgsSBFRhc2siBFRlc3QM';
            // tslint:disable-next-line: no-any
            datastore.auth.getProjectId = (callback) => {
                callback(null, 'project-id');
            };
            datastore.keyToLegacyUrlSafe(key, locationPrefix, (err, urlSafeKey) => {
                assert.ifError(err);
                assert.strictEqual(urlSafeKey, base64EndocdedUrlSafeKey);
            });
        });
        mocha_1.it('should not return URL-safe key to user if auth.getProjectId errors', () => {
            const error = new Error('Error.');
            // tslint:disable-next-line: no-any
            datastore.auth.getProjectId = (callback) => {
                callback(error);
            };
            datastore.keyToLegacyUrlSafe({}, (err, urlSafeKey) => {
                assert.strictEqual(err, error);
                assert.strictEqual(urlSafeKey, undefined);
            });
        });
    });
    mocha_1.describe('keyFromLegacyUrlsafe', () => {
        mocha_1.it('should convert key to url safe base64 string', () => {
            const encodedKey = 'agpwcm9qZWN0LWlkcg4LEgRUYXNrIgRUZXN0DA';
            const key = datastore.keyFromLegacyUrlsafe(encodedKey);
            assert.strictEqual(key.kind, 'Task');
            assert.strictEqual(key.name, 'Test');
        });
    });
});
//# sourceMappingURL=index.js.map