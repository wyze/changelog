const execa = require('execa')
const fs = require('fs')
const githubUsername = require('github-username')
const readPkg = require('read-pkg')

jest.mock('execa')
jest.mock('fs')
jest.mock('github-username')
jest.mock('read-pkg')

const RealDate = Date

afterAll(() => {
  global.Date = RealDate
})

beforeAll(() => {
  global.Date = class extends RealDate {
    constructor() {
      super()

      return new RealDate(2017, 4, 5)
    }
  } as DateConstructor
})

afterEach(jest.resetAllMocks)

it('works on a repo with 0 tags', async () => {
  readPkg.mockResolvedValue({
    name: 'a-fixture',
    version: '1.0.0',
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/wyze/a-fixture.git',
    },
  })

  execa.stdout
    // Get latest tag call
    .mockRejectedValueOnce(
      new Error('fatal: No names found, cannot describe anything.')
    )
    // Get the commit messages
    .mockResolvedValueOnce(
      'A bug fix PR (#1)|><|neil.kistner@gmail.com|><|Neil Kistner|><|2795715\nInitial Commit|><|neil.kistner@gmail.com|><|Neil Kistner|><|65578dd'
    )

  githubUsername.mockResolvedValue('wyze')

  fs.readFile
    // Read changelog
    .mockImplementationOnce((_, cb) => cb(null, '## Change Log\n\n'))
    // Read readme
    .mockImplementationOnce((_, cb) =>
      cb(
        null,
        '# a-fixture\n\n## Change Log\n\n> [Full Change Log](changelog.md)\n\n## License\n\nMIT © [Neil Kistner](//neilkistner.com)\n\n'
      )
    )

  fs.writeFile.mockImplementation((file, contents, cb) =>
    cb(null, file, contents)
  )

  // Create git tag
  execa.mockImplementation()

  await require('..').default()

  expect(fs.writeFile.mock.calls[0][1]).toMatchSnapshot('changelog.md')
  expect(fs.writeFile.mock.calls[1][1]).toMatchSnapshot('readme.md')
})

it('works on a repo with 1 tag', async () => {
  readPkg.mockResolvedValue({
    name: 'a-fixture',
    version: '1.1.0',
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/wyze/a-fixture.git',
    },
  })

  execa.stdout
    // Get latest tag call
    .mockResolvedValueOnce('v1.0.0')
    // Get the commit messages
    .mockResolvedValueOnce(
      'Another fix (#2)|><|neil.kistner@gmail.com|><|Neil Kistner|><|4a03cb4'
    )

  githubUsername.mockResolvedValue('wyze')

  fs.readFile
    // Read changelog
    .mockImplementationOnce((_, cb) =>
      cb(
        null,
        '## Change Log\n\n### [v1.0.0](https://github.com/wyze/a-fixture/releases/tag/v1.0.0) (2017-05-05)\n\n* A bug fix PR ([@wyze](https://github.com/wyze) in [#1](https://github.com/wyze/a-fixture/pull/1))\n* Initial Commit ([@wyze](https://github.com/wyze) in [65578dd](https://github.com/wyze/a-fixture/commit/65578dd))\n\n'
      )
    )
    // Read readme
    .mockImplementationOnce((_, cb) =>
      cb(
        null,
        '# a-fixture\n\n## Change Log\n\n> [Full Change Log](changelog.md)\n\n### [v1.0.0](https://github.com/wyze/a-fixture/releases/tag/v1.0.0) (2017-05-05)\n\n* A bug fix PR ([@wyze](https://github.com/wyze) in [#1](https://github.com/wyze/a-fixture/pull/1))\n* Initial Commit ([@wyze](https://github.com/wyze) in [65578dd](https://github.com/wyze/a-fixture/commit/65578dd))\n\n## License\n\nMIT © [Neil Kistner](//neilkistner.com)\n\n'
      )
    )

  fs.writeFile.mockImplementation((file, contents, cb) =>
    cb(null, file, contents)
  )

  // Create git tag
  execa.mockImplementation()

  await require('..').default()

  expect(fs.writeFile.mock.calls[0][1]).toMatchSnapshot('changelog.md')
  expect(fs.writeFile.mock.calls[1][1]).toMatchSnapshot('readme.md')
})

it('works when email is not present in github', async () => {
  readPkg.mockResolvedValue({
    name: 'a-fixture',
    version: '1.1.0',
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/wyze/a-fixture.git',
    },
  })

  execa.stdout
    // Get latest tag call
    .mockResolvedValueOnce('v1.0.0')
    // Get the commit messages
    .mockResolvedValueOnce(
      'Another fix (#2)|><|neil.kistner@gmail.com|><|Neil Kistner|><|4a03cb4'
    )

  githubUsername.mockRejectedValue(
    new Error("Couldn't find username for `neil.kistner@gmail.com`")
  )

  fs.readFile
    // Read changelog
    .mockImplementationOnce((_, cb) =>
      cb(
        null,
        '## Change Log\n\n### [v1.0.0](https://github.com/wyze/a-fixture/releases/tag/v1.0.0) (2017-05-05)\n\n* A bug fix PR ([@wyze](https://github.com/wyze) in [#1](https://github.com/wyze/a-fixture/pull/1))\n* Initial Commit ([@wyze](https://github.com/wyze) in [65578dd](https://github.com/wyze/a-fixture/commit/65578dd))\n\n'
      )
    )
    // Read readme
    .mockImplementationOnce((_, cb) =>
      cb(
        null,
        '# a-fixture\n\n## Change Log\n\n> [Full Change Log](changelog.md)\n\n### [v1.0.0](https://github.com/wyze/a-fixture/releases/tag/v1.0.0) (2017-05-05)\n\n* A bug fix PR ([@wyze](https://github.com/wyze) in [#1](https://github.com/wyze/a-fixture/pull/1))\n* Initial Commit ([@wyze](https://github.com/wyze) in [65578dd](https://github.com/wyze/a-fixture/commit/65578dd))\n\n## License\n\nMIT © [Neil Kistner](//neilkistner.com)\n\n'
      )
    )

  fs.writeFile.mockImplementation((file, contents, cb) =>
    cb(null, file, contents)
  )

  // Create git tag
  execa.mockImplementation()

  await require('..').default()

  expect(fs.writeFile.mock.calls[0][1]).toMatchSnapshot('changelog.md')
  expect(fs.writeFile.mock.calls[1][1]).toMatchSnapshot('readme.md')
})

it('works on a repo with old write-changelog format', async () => {
  readPkg.mockResolvedValue({
    name: 'a-fixture',
    version: '1.1.0',
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/wyze/a-fixture.git',
    },
  })

  execa.stdout
    // Get latest tag call
    .mockResolvedValueOnce('v1.0.0')
    // Get the commit messages
    .mockResolvedValueOnce(
      'Another fix (#10)|><|neil.kistner@gmail.com|><|Neil Kistner|><|4a03cb4'
    )

  githubUsername.mockResolvedValue('wyze')

  fs.readFile
    // Read changelog
    .mockImplementationOnce((_, cb) =>
      cb(
        null,
        '## Change Log\n\n### [v1.0.0](https://github.com/wyze/a-fixture/releases/tag/v1.0.0) (2017-05-05)\n\n* [[`c0489425d5`](https://github.com/wyze/a-fixture/commit/c0489425d5)] - Initial Commit (Neil Kistner)\n\n'
      )
    )
    // Read readme
    .mockImplementationOnce((_, cb) =>
      cb(
        null,
        '# a-fixture\n\n## Change Log\n\n> [Full Change Log](changelog.md)\n\n### [v1.0.0](https://github.com/wyze/a-fixture/releases/tag/v1.0.0) (2017-05-05)\n\n* [[`c0489425d5`](https://github.com/wyze/a-fixture/commit/c0489425d5)] - Initial Commit (Neil Kistner)\n\n## License\n\nMIT © [Neil Kistner](//neilkistner.com)\n\n'
      )
    )

  fs.writeFile.mockImplementation((file, contents, cb) =>
    cb(null, file, contents)
  )

  // Create git tag
  execa.mockImplementation()

  await require('..').default()

  expect(fs.writeFile.mock.calls[0][1]).toMatchSnapshot('changelog.md')
  expect(fs.writeFile.mock.calls[1][1]).toMatchSnapshot('readme.md')
})
