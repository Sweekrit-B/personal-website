import { useEffect, useState } from 'react'

type RepoData = {
  name: string
  description: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  language: string | null
  topics: string[]
  pushed_at: string
  html_url: string
  default_branch: string
}

type CommitData = {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
  author: { login: string } | null
}

type LangData = Record<string, number>

const repoCache: Record<string, RepoData> = {}
const commitCache: Record<string, CommitData[]> = {}
const langCache: Record<string, LangData> = {}

function repoPathFromUrl(url: string): string | null {
  const m = url.match(/github\.com\/([^/]+\/[^/?#]+)/)
  return m ? m[1].replace(/\.git$/, '') : null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}yr ago`
}

const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Kotlin: '#A97BFF',
  'C++': '#f34b7d',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Jupyter: '#DA5B0B',
}

const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string | undefined

function ghFetch<T>(url: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (GH_TOKEN) headers['Authorization'] = `Bearer ${GH_TOKEN}`
  return fetch(url, { headers }).then(r => {
    if (!r.ok) throw new Error(`GitHub API ${r.status}`)
    return r.json()
  })
}

export default function GitHubCard({ url }: { url: string }) {
  const path = repoPathFromUrl(url)

  const [repo, setRepo] = useState<RepoData | null>(repoCache[url] ?? null)
  const [commits, setCommits] = useState<CommitData[]>(commitCache[url] ?? [])
  const [langs, setLangs] = useState<LangData>(langCache[url] ?? {})
  const [loading, setLoading] = useState(!repoCache[url])

  useEffect(() => {
    if (!path) return

    const tasks: Promise<void>[] = []

    if (!repoCache[url]) {
      tasks.push(
        ghFetch<RepoData>(`https://api.github.com/repos/${path}`)
          .then(d => { repoCache[url] = d; setRepo(d) })
          .catch(() => {})
      )
    }
    if (!commitCache[url]) {
      tasks.push(
        ghFetch<CommitData[]>(`https://api.github.com/repos/${path}/commits?per_page=3`)
          .then(d => { if (Array.isArray(d)) { commitCache[url] = d; setCommits(d) } })
          .catch(() => {})
      )
    }
    if (!langCache[url]) {
      tasks.push(
        ghFetch<LangData>(`https://api.github.com/repos/${path}/languages`)
          .then(d => { langCache[url] = d; setLangs(d) })
          .catch(() => {})
      )
    }

    if (tasks.length > 0) {
      Promise.all(tasks).finally(() => setLoading(false))
    }
  }, [url, path])

  if (loading && !repo) {
    return (
      <div className="gh-card gh-card--loading">
        <div className="gh-skeleton gh-skeleton--title" />
        <div className="gh-skeleton gh-skeleton--line" />
        <div className="gh-skeleton gh-skeleton--line gh-skeleton--short" />
        <div className="gh-skeleton gh-skeleton--line" style={{ marginTop: 8 }} />
        <div className="gh-skeleton gh-skeleton--line" />
        <div className="gh-skeleton gh-skeleton--line gh-skeleton--short" />
      </div>
    )
  }

  if (!repo) return null

  const totalLangBytes = Object.values(langs).reduce((a, b) => a + b, 0)
  const langEntries = Object.entries(langs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <a href={repo.html_url} target="_blank" rel="noreferrer" className="gh-card">

      {/* Header */}
      <div className="gh-card-header">
        <svg className="gh-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z"/>
        </svg>
        <span className="gh-card-name">{repo.name}</span>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="gh-card-desc">{repo.description}</p>
      )}

      {/* Stats row */}
      <div className="gh-card-stats">
        <span className="gh-stat">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.873 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
          </svg>
          {repo.stargazers_count}
        </span>
        <span className="gh-stat">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>
          </svg>
          {repo.forks_count}
        </span>
        {repo.open_issues_count > 0 && (
          <span className="gh-stat">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/>
            </svg>
            {repo.open_issues_count}
          </span>
        )}
        <span className="gh-stat gh-stat--muted">
          pushed {timeAgo(repo.pushed_at)}
        </span>
      </div>

      {/* Topics */}
      {(repo.topics ?? []).length > 0 && (
        <div className="gh-topics">
          {(repo.topics ?? []).slice(0, 5).map(t => (
            <span key={t} className="gh-topic">{t}</span>
          ))}
        </div>
      )}

      {/* Language bar */}
      {langEntries.length > 0 && (
        <div className="gh-langs">
          <div className="gh-lang-bar">
            {langEntries.map(([lang, bytes]) => (
              <div
                key={lang}
                className="gh-lang-bar-segment"
                style={{
                  width: `${(bytes / totalLangBytes) * 100}%`,
                  background: LANG_COLORS[lang] ?? '#8b949e',
                }}
                title={`${lang} ${Math.round((bytes / totalLangBytes) * 100)}%`}
              />
            ))}
          </div>
          <div className="gh-lang-legend">
            {langEntries.map(([lang, bytes]) => (
              <span key={lang} className="gh-lang-item">
                <span className="gh-lang-dot" style={{ background: LANG_COLORS[lang] ?? '#8b949e' }} />
                {lang}
                <span className="gh-lang-pct">{Math.round((bytes / totalLangBytes) * 100)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent commits */}
      {commits.length > 0 && (
        <div className="gh-commits">
          <span className="gh-section-label">Recent commits</span>
          {commits.map(c => (
            <div key={c.sha} className="gh-commit">
              <span className="gh-commit-sha">{c.sha.slice(0, 7)}</span>
              <span className="gh-commit-msg">
                {c.commit.message.split('\n')[0].slice(0, 52)}
                {c.commit.message.split('\n')[0].length > 52 ? '…' : ''}
              </span>
              <span className="gh-commit-time">{timeAgo(c.commit.author.date)}</span>
            </div>
          ))}
        </div>
      )}
    </a>
  )
}
