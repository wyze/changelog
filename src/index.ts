import * as fs from 'fs'
import { promisify } from 'util'
import execa from 'execa'
import githubUsername from 'github-username'
import readPkg from 'read-pkg'

type ChangesUrlVersion = UrlVersion & {
  changes: string[]
}

type ReplaceArgs = [RegExp, (substring: string, ...args: any[]) => string]

type UrlVersion = {
  url: string
  version: string
}

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

const readmeEnd = '## License'
const readmeStart = '> [Full Change Log](changelog.md)'
const separator = '|><|'

const { GITHUB_TOKEN: token = '' } = process.env

const getUrlAndVersion = async (): Promise<UrlVersion> => {
  const { repository, version } = await readPkg()
  const url = repository!.url.replace(/(^git\+|\.git$)/g, '')

  return { url, version }
}

const getLatestTag = async (): Promise<string> =>
  await execa
    .stdout('git', ['describe', '--tags', '--abbrev=0'])
    .catch(() => '')

const getLog = async (latestTag: string): Promise<string[]> =>
  (await execa.stdout(
    'git',
    ([
      'log',
      latestTag === '' ? null : `${latestTag}..@`,
      `--pretty=format:%s${separator}%ae${separator}%an${separator}%h`,
    ] as string[]).filter(Boolean)
  )).split('\n')

const createCommitWithUrl = (url: string) => (commit: string) =>
  `[${commit}](${url}/commit/${commit})`

const createPrWithUrl = (url: string) => (num: string) =>
  `[#${num}](${url}/pull/${num})`

const usernameWithUrl = (username: string) =>
  `[@${username}](https://github.com/${username})`

const messageHasPr = (message: string) => message.match(/\(#\d+\)$/)

const formatLog = async (log: string[], url: string) => {
  const commitWithUrl = createCommitWithUrl(url)
  const prWithUrl = createPrWithUrl(url)
  const usernames = new Map()

  return Promise.all(
    log.map(async (item) => {
      const [message, email, name, commit] = item.split(separator)
      const pr = messageHasPr(message)

      if (!usernames.has(email)) {
        try {
          usernames.set(email, await githubUsername(email, token))
        } catch (err) {
          // Email is not public
        }
      }

      const displayName = usernames.has(email)
        ? usernameWithUrl(usernames.get(email))
        : name
      const replaceArgs: ReplaceArgs =
        pr !== null
          ? [
              /(\()#(\d+)(\)$)/,
              (_: string, start: string, num: string, end: string) =>
                `${start}${displayName} in ${prWithUrl(num)}${end}`,
            ]
          : [/$/, () => ` (${displayName} in ${commitWithUrl(commit)})`]

      return `* ${message.replace(...replaceArgs)}`
    })
  )
}

const addHeader = ({ changes, url, version }: ChangesUrlVersion): string[] => {
  const date = new Date()
  const formatted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toJSON()
    .split('T')
    .shift()
  const tag = `v${version}`
  const header = `### [${tag}](${url}/releases/tag/${tag}) (${formatted})`

  return [header, '', ...changes]
}

const updateFile = async (
  file: string,
  transform: (lines: string[]) => string
) => {
  const current = (await readFile(file)).toString().split('\n')

  return writeFile(file, transform(current))
}

// Run it
export default async () => {
  const { url, version } = await getUrlAndVersion()
  const tag = await getLatestTag()
  const log = await getLog(tag)
  const x = await formatLog(log, url)
  const h = addHeader({ changes: x, url, version })

  const transformChangelog = (changelog: string[]) =>
    [...changelog.slice(0, 2), ...h, ...changelog.slice(1)].join('\n')

  const transformReadme = (readme: string[]) =>
    [
      ...readme.slice(0, readme.indexOf(readmeStart) + 2),
      ...h,
      ...readme.slice(readme.indexOf(readmeEnd) - 1),
    ].join('\n')

  await updateFile('changelog.md', transformChangelog)
  await updateFile('readme.md', transformReadme)

  // Stage files in git
  await execa('git', ['add', '--all'])

  return Promise.resolve()
}
