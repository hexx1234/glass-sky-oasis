import test from 'node:test';
import assert from 'node:assert/strict';
import {safeEqual,base64ToBytes,bytesToBase64,validateData,sniffImage} from '../src/worker.js';
test('constant-time comparator handles equal and unequal inputs',()=>{
  assert.equal(safeEqual('abc','abc'),true);
  assert.equal(safeEqual('abc','abcd'),false);
  assert.equal(safeEqual('','bad'),false);
});
test('UTF-8 bytes encode/decode through base64',()=>{
  const bytes=new TextEncoder().encode('글래스 스카이 오아시스');
  assert.equal(new TextDecoder().decode(base64ToBytes(bytesToBase64(bytes))),'글래스 스카이 오아시스');
});
test('valid data must have four collections and settings',()=>{
  assert.equal(validateData({settings:{},characters:[],artworks:[],news:[],species:[]}),true);
  assert.equal(validateData({settings:{},characters:null,artworks:[],news:[],species:[]}),false);
});
test('image signature validation works',()=>{
  assert.equal(sniffImage(Uint8Array.from([137,80,78,71,13,10,26,10,0]),'image/png'),true);
  assert.equal(sniffImage(new TextEncoder().encode('<svg>'), 'image/png'),false);
});
