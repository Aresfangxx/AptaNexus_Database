import assert from 'assert';
import { loadJSONL } from '../src/loader.js';
import { searchByTarget, getByDoi } from '../src/search.js';
const data = loadJSONL();
assert.ok(Array.isArray(data) && data.length > 0, 'data loaded');
const r1 = searchByTarget(data, '乳酸', 10, 0);
assert.ok(Array.isArray(r1), 'search returns array');
const sampleDoi = data[0]?.doi || '';
if (sampleDoi) {
    const r2 = getByDoi(data, sampleDoi);
    assert.ok(r2.length >= 1, 'get by doi returns');
}
process.stdout.write('OK\n');
