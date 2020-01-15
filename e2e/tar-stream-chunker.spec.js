'use strict';

const t = require('./scaffold/t');
const { tap } = require('rxjs/operators');

const cmd = `${process.env.E2E_CMD_PREFIX ? process.env.E2E_CMD_PREFIX : ''} ../tar_stream_chunker`;

test('should print usage help if no params provided', t.pipe(
  t.run .exec(cmd),
  tap(({ stderr }) => expect(stderr).toContain('Usage:')),
));

test('should print usage help if non-supported param passed', t.pipe(
  t.run .exec(`${cmd} --filename a`),
  tap(({ stderr }) => expect(stderr).toContain('Usage:')),
));

test('should return -1 exit code if no params provided', t.pipe(
  t.run .exec(cmd),
  tap(({ error: { code } }) => expect(code).toEqual(255)),
));

test.each([
  '--chunk-size 1',
])
('should error if file name param is not provided: %s', t.each('params').pipe(
  t.run .exec(_ => `${cmd} ${t.params}`),
  tap(({ stderr, error }) => {
    expect(stderr).toContain('file name is not provided.');
    expect(error.code).not.toEqual(0);
  }),
));

test.each([
  '--file-name',
  '--file-name ',
  '--file-name  ',
  '--chunk-size 1 --file-name',
])
('should error if file name param argument is not provided: %s', t.each('params').pipe(
  t.run .exec(_ => `${cmd} ${t.params}`),
  tap(({ stderr, error }) => {
    expect(stderr).toMatch(/option .--file-name. requires an argument/);
    expect(error.code).not.toEqual(0);
  }),
));

test.each([
  '--file-name a',
])
('should error if chunk size param is not provided: %s', t.each('params').pipe(
  t.run .exec(_ => `${cmd} ${t.params}`),
  tap(({ stderr, error }) => {
    expect(stderr).toContain('chunk size is not provided.');
    expect(error.code).not.toEqual(0);
  }),
));

test.each([
  '--chunk-size',
  '--chunk-size ',
  '--chunk-size  ',
  '--file-name file --chunk-size',
])
('should error if chunk size param argument is not provided: %s', t.each('params').pipe(
  t.run .exec(_ => `${cmd} ${t.params}`),
  tap(({ stderr, error }) => {
    expect(stderr).toMatch(/option .--chunk-size. requires an argument/);
    expect(error.code).not.toEqual(0);
  }),
));

test.each([ '_', 'a', 'Z', '!', '~', '0', '-f', '-3.14', '--chunk-size', '--abc' ])
('should error if chunk size is not an integer > 0: "%s"', t.each('size').pipe(
  t.run .exec(_ => `${cmd} --file-name file --chunk-size ${t.size}`),
  tap(({ stderr, error }) => {
    expect(stderr).toContain('chunk size must be an integer > 0.');
    expect(error.code).not.toEqual(0);
  }),
));

test.each([
  '--file-name aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaX --chunk-size 1',
  '--file-name aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaXY --chunk-size 1',
])
('should error if file name is longer than 93 bytes: %s', t.each('params').pipe(
  t.run .exec(_ => `printf data | ${cmd} ${t.params} > /dev/null`),
  tap(({ stderr, error }) => {
    expect(stderr).toContain("file name length maximum is 93 bytes.");
    expect(error.code).not.toEqual(0);
  }),
));

test('should pass if file name length is 93 bytes', t.pipe(
  t.run .mktemp('tar'),
  tap(_ => t.file_name = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
  t.run .exec(_ => `printf data | ${cmd} --file-name ${t.file_name} --chunk-size 1 > ${t.tmp.tar}`),
  tap(({ error }) => expect(error).toBeNull()),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep ${t.file_name} | wc -l`),
  tap(({ stdout }) => expect(stdout.trim()).toEqual('4')),
));

test('should error if stdin is empty', t.pipe(
  t.run .mktemp('tar'),
  t.run .exec(_ => `printf '' | ${cmd} --file-name file --chunk-size 1 > ${t.tmp.tar}`),
  tap(({ stderr, error }) => {
    expect(stderr).toContain("nothing to archive - empty stdin.");
    expect(error.code).not.toEqual(0);
  }),

  t.run .exec(_ => `wc -c < ${t.tmp.tar}`),
  tap(({ stdout }) => expect(stdout.trim()).toEqual('0')),
));

test('should create TAR with a single chunk of 1 byte size if stdin has 1 byte length', t.pipe(
  t.run .mktemp('tar'),
  t.run .exec(_ => `printf 'A' | ${cmd} --file-name file --chunk-size 1 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep file | wc -l`),
  tap(({ stdout }) => expect(stdout.trim()).toEqual('1')),

  t.run .exec(_ => `tar -xf ${t.tmp.tar} -O file.00001`),
  tap(({ stdout }) => expect(stdout).toEqual('A')),
));

test('should create TAR with two chunks if stdin has 2 bytes length and user asked for chunk size in 1 byte', t.pipe(
  t.run .mktemp('tar'),
  t.run .exec(_ => `printf 'AB' | ${cmd} --file-name file --chunk-size 1 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep file | wc -l`),
  tap(({ stdout }) => expect(stdout.trim()).toEqual('2')),

  t.run .exec(_ => `tar -xf ${t.tmp.tar} -O file.00001`),
  tap(({ stdout }) => expect(stdout).toEqual('A')),

  t.run .exec(_ => `tar -xf ${t.tmp.tar} -O file.00002`),
  tap(({ stdout }) => expect(stdout).toEqual('B')),
));

test('should create TAR with 1024 chunks if stdin has 1024*1024 bytes length and user asked for chunk size in 1024 bytes', t.pipe(
  t.run .mktemp('orig'),
  t.run .exec(_ => `node -e "for(let i=1;i<=1048576;i++)process.stdout.write(String(i)[0])" > ${t.tmp.orig}`),

  t.run .mktemp('tar'),
  t.run .exec(_ => `node -e "for(let i=1;i<=1048576;i++)process.stdout.write(String(i)[0])" | ${cmd} --file-name file --chunk-size 1024 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep file | wc -l`),
  tap(({ stdout }) => expect(stdout.trim()).toEqual('1024')),

  t.run .mktemp('result'),
  t.run .exec(_ => `tar -xf ${t.tmp.tar}; cat file.* > ${t.tmp.result}; rm -f file.*`),
  t.run .exec(_ => `diff -uq ${t.tmp.orig} ${t.tmp.result}`),
  tap(({ stdout }) => expect(stdout.trim()).toHaveLength(0)),
));

test('should create TAR with a single chunk if stdin has 1024*1024 bytes length and user asked for chunk size in 1024*1024 bytes', t.pipe(
  t.run .mktemp('orig'),
  t.run .exec(_ => `node -e "for(let i=1;i<=1048576;i++)process.stdout.write(String(i)[0])" > ${t.tmp.orig}`),

  t.run .mktemp('tar'),
  t.run .exec(_ => `cat ${t.tmp.orig} | ${cmd} --file-name file --chunk-size 1048576 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep file | wc -l`),
  tap(({ stdout }) => expect(stdout.trim()).toEqual('1')),

  t.run .mktemp('result'),
  t.run .exec(_ => `tar -xf ${t.tmp.tar}; cat file.* > ${t.tmp.result}; rm -f file.*`),
  t.run .exec(_ => `diff -uq ${t.tmp.orig} ${t.tmp.result}`),
  tap(({ stdout }) => expect(stdout.trim()).toHaveLength(0)),
));

