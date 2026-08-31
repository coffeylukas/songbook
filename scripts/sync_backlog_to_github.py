#!/usr/bin/env python3
"""
Sync docs/BACKLOG.md tasks into GitHub Issues + a Project (v2) board.

One-time migration (safe to re-run — skips anything that already exists by
title) for the song-book-app repo's multi-agent workflow. Reads
docs/BACKLOG.md, creates one GitHub Issue per task (labeled, milestoned,
cross-linked via a "Depends on" footer), and populates a GitHub Project v2
board with a Status field (Todo / In Progress / Done) reflecting each task's
recorded status.

"blocked" isn't a board column here — GitHub's default board ships three
statuses and fighting the API to add a fourth custom option isn't worth it
for this. A blocked task instead gets a `status:blocked` label; see
docs/MULTI_AGENT_WORKFLOW.md for how the orchestrator uses that.

Only docs/BACKLOG.md is migrated. docs/FUTURE_FEATURES.md (deferred SMS/
Twilio work) stays as plain markdown until it's actually reactivated —
re-run this script against that file (`--backlog docs/FUTURE_FEATURES.md`)
at that point if you want it tracked the same way.

Requires: gh CLI, authenticated, with the `project` scope —
  gh auth refresh -h github.com -s project

Usage:
  python3 scripts/sync_backlog_to_github.py --dry-run   # preview, no writes
  python3 scripts/sync_backlog_to_github.py              # do it for real
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

EPIC_TITLES = {
    0: "Project scaffolding",
    1: "Data layer & auth wiring",
    2: "Frontend foundations",
    3: "Song management",
    4: "Plan mode",
    5: "Presenter / audience live display",
    6: "Admin & roles",
    7: "CI/CD hardening & documentation",
}

TASK_HEADER_RE = re.compile(r'^(#{3,4})\s+([A-Z]{1,3}\d+)\s+—\s+(.+?)\s*$')
EPIC_HEADER_RE = re.compile(r'^###\s+Epic\s+(\d+)\s+—')
FIELD_RE = re.compile(r'^-\s+\*\*([^:*]+):\*\*\s*(.*)$')
ID_RE = re.compile(r'\b([A-Z]\d{1,3})\b')
RANGE_RE = re.compile(r'\b([A-Z])(\d{1,3})[–-]([A-Z])(\d{1,3})\b')

STATUS_TO_PROJECT_OPTION = {
    'todo': 'Todo',
    'in-progress': 'In Progress',
    'done': 'Done',
    'blocked': 'Todo',  # blocked tasks still show in Todo; status:blocked label carries the nuance
}


def parse_backlog(path: Path):
    lines = path.read_text().splitlines()
    tasks = []
    current = None
    current_epic = None

    def flush():
        if current is not None:
            current.pop('_last_field', None)
            tasks.append(current)

    for line in lines:
        epic_m = EPIC_HEADER_RE.match(line)
        if epic_m:
            current_epic = int(epic_m.group(1))
            continue

        header_m = TASK_HEADER_RE.match(line)
        if header_m:
            flush()
            _level, task_id, title = header_m.groups()
            kind = 'manual' if task_id.startswith('M') else 'autonomous'
            current = {
                'id': task_id,
                'title': title,
                'kind': kind,
                'epic': current_epic if kind == 'autonomous' else None,
                'fields': {},
            }
            continue

        if line.strip() == '---' or (line.startswith('#') and current is not None):
            flush()
            current = None
            continue

        if current is not None:
            field_m = FIELD_RE.match(line)
            if field_m:
                key = field_m.group(1).strip().lower().replace(' ', '_')
                current['fields'][key] = field_m.group(2).strip()
                current['_last_field'] = key
            elif line.strip() and line.startswith('  ') and current.get('_last_field'):
                key = current['_last_field']
                current['fields'][key] = (current['fields'].get(key, '') + ' ' + line.strip()).strip()

    flush()
    return tasks


def expand_dependencies(dep_text: str):
    ids = set()
    for m in RANGE_RE.finditer(dep_text):
        p1, n1, p2, n2 = m.groups()
        if p1 == p2:
            for n in range(int(n1), int(n2) + 1):
                ids.add(f'{p1}{n}')
    for m in ID_RE.finditer(dep_text):
        ids.add(m.group(1))
    return sorted(ids, key=lambda s: (s[0], int(s[1:])))


class Gh:
    def __init__(self, dry_run):
        self.dry_run = dry_run

    def run(self, args, input_text=None):
        printable = 'gh ' + ' '.join(args)
        if self.dry_run:
            print(f'[dry-run] {printable}')
            return ''
        result = subprocess.run(
            ['gh'] + args, input=input_text, capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f'FAILED: {printable}\n{result.stderr}', file=sys.stderr)
            raise SystemExit(1)
        return result.stdout.strip()

    def json(self, args):
        if self.dry_run:
            print(f'[dry-run, json] gh ' + ' '.join(args))
            return []
        out = self.run(args)
        return json.loads(out) if out else []


def label_name_for_epic(n):
    slug = EPIC_TITLES[n].lower().replace(' / ', '-').replace(' & ', '-and-').replace(' ', '-')
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    return f'epic:{n}-{slug}'


def milestone_title_for_epic(n):
    return f'Epic {n}: {EPIC_TITLES[n]}'


def ensure_labels(gh: Gh, repo):
    existing = {l['name'] for l in gh.json(['label', 'list', '--repo', repo, '--limit', '200', '--json', 'name'])}
    wanted = [
        ('type:manual', 'fbca04', 'Task the user does by hand (accounts, dashboards)'),
        ('type:autonomous', '1d76db', 'Task Claude does'),
        ('status:blocked', 'd93f0b', 'Blocked on a dependency or manual task'),
    ]
    for n in range(8):
        wanted.append((label_name_for_epic(n), 'c5def5', EPIC_TITLES[n]))
    for name, color, desc in wanted:
        if name in existing:
            continue
        gh.run(['label', 'create', name, '--repo', repo, '--color', color, '--description', desc])


def ensure_milestones(gh: Gh, repo):
    existing = {}
    if not gh.dry_run:
        out = gh.run(['api', f'repos/{repo}/milestones?state=all&per_page=100'])
        for m in json.loads(out):
            existing[m['title']] = m['number']
    mapping = {}
    for n in range(8):
        title = milestone_title_for_epic(n)
        if title in existing:
            mapping[n] = existing[title]
            continue
        if gh.dry_run:
            print(f'[dry-run] create milestone: {title}')
            mapping[n] = None
            continue
        out = gh.run(['api', f'repos/{repo}/milestones', '-f', f'title={title}'])
        mapping[n] = json.loads(out)['number']
    return mapping


def build_body(task, repo, dep_issue_numbers):
    f = task['fields']
    lines = []
    if f.get('description'):
        lines.append(f['description'])
        lines.append('')
    if f.get('definition_of_done'):
        lines.append('**Definition of done:**')
        lines.append(f['definition_of_done'])
        lines.append('')
    if dep_issue_numbers:
        refs = ', '.join(f'#{n}' for n in dep_issue_numbers)
        lines.append(f'**Depends on:** {refs}')
        lines.append('')
    elif f.get('dependencies') and f['dependencies'].lower() not in ('none.', 'none'):
        lines.append(f"**Dependencies (unresolved at migration time):** {f['dependencies']}")
        lines.append('')
    if f.get('context'):
        lines.append(f"**Context:** {f['context']}")
        lines.append('')
    if f.get('note'):
        lines.append(f"**Note:** {f['note']}")
        lines.append('')
    lines.append('---')
    lines.append(
        f'_Migrated from `docs/BACKLOG.md` (task `{task["id"]}`). Read '
        f'[CLAUDE.md](https://github.com/{repo}/blob/main/CLAUDE.md) and '
        f'[docs/CONTEXT.md](https://github.com/{repo}/blob/main/docs/CONTEXT.md) '
        f'before starting.'
    )
    return '\n'.join(lines)


def create_issues(gh: Gh, repo, tasks, milestone_map):
    id_to_number = {}
    id_to_url = {}
    for task in tasks:
        labels = ['type:' + task['kind']]
        milestone_args = []
        if task['kind'] == 'autonomous' and task['epic'] is not None:
            labels.append(label_name_for_epic(task['epic']))
            milestone_args = ['--milestone', milestone_title_for_epic(task['epic'])]
        title = f"{task['id']}: {task['title']}"
        body = build_body(task, repo, [])  # dependency refs patched in pass 2
        args = [
            'issue', 'create', '--repo', repo,
            '--title', title,
            '--body', body,
            '--label', ','.join(labels),
        ] + milestone_args
        out = gh.run(args)
        if gh.dry_run:
            id_to_number[task['id']] = None
            id_to_url[task['id']] = None
            continue
        url = out.strip().splitlines()[-1]
        number = int(url.rstrip('/').rsplit('/', 1)[-1])
        id_to_number[task['id']] = number
        id_to_url[task['id']] = url
        print(f"created #{number}  {title}")
    return id_to_number, id_to_url


def patch_dependency_links(gh: Gh, repo, tasks, id_to_number):
    for task in tasks:
        dep_text = task['fields'].get('dependencies', '')
        dep_ids = [d for d in expand_dependencies(dep_text) if d in id_to_number]
        if not dep_ids:
            continue
        dep_numbers = [id_to_number[d] for d in dep_ids if id_to_number.get(d)]
        if not dep_numbers:
            continue
        body = build_body(task, repo, dep_numbers)
        number = id_to_number.get(task['id'])
        if number is None:
            continue
        gh.run(['issue', 'edit', str(number), '--repo', repo, '--body', body])


def close_done_and_set_status(gh: Gh, repo, tasks, id_to_number):
    for task in tasks:
        status = task['fields'].get('status', 'todo').lower()
        number = id_to_number.get(task['id'])
        if number is None:
            continue
        if status == 'done':
            gh.run([
                'issue', 'close', str(number), '--repo', repo,
                '--comment', 'Completed prior to/during GitHub migration — see git history for implementation commits.',
            ])
        elif status == 'blocked':
            gh.run(['issue', 'edit', str(number), '--repo', repo, '--add-label', 'status:blocked'])


def setup_project(gh: Gh, owner, repo, tasks, id_to_number):
    projects = gh.json(['project', 'list', '--owner', owner, '--format', 'json'])
    title = 'Song Book App'
    existing = next((p for p in projects.get('projects', []) if p.get('title') == title), None) if isinstance(projects, dict) else None
    if existing:
        project_number = existing['number']
    else:
        out = gh.run(['project', 'create', '--owner', owner, '--title', title, '--format', 'json'])
        project_number = json.loads(out)['number'] if not gh.dry_run else None

    if gh.dry_run:
        print(f'[dry-run] using project number {project_number}')
        return

    # item-edit needs the project's GraphQL node ID, not its number (unlike every other
    # `gh project` subcommand, which takes the number positionally).
    project_node_id = json.loads(
        gh.run(['project', 'view', str(project_number), '--owner', owner, '--format', 'json'])
    )['id']

    fields = json.loads(gh.run(['project', 'field-list', str(project_number), '--owner', owner, '--format', 'json']))
    status_field = next((f for f in fields.get('fields', []) if f.get('name') == 'Status'), None)
    if not status_field:
        gh.run([
            'project', 'field-create', str(project_number), '--owner', owner,
            '--name', 'Status', '--data-type', 'SINGLE_SELECT',
            '--single-select-options', 'Todo,In Progress,Done',
        ])
        fields = json.loads(gh.run(['project', 'field-list', str(project_number), '--owner', owner, '--format', 'json']))
        status_field = next(f for f in fields['fields'] if f['name'] == 'Status')

    option_id_by_name = {o['name']: o['id'] for o in status_field.get('options', [])}

    for task in tasks:
        number = id_to_number.get(task['id'])
        if number is None:
            continue
        url = f"https://github.com/{repo}/issues/{number}"
        item_out = gh.run(['project', 'item-add', str(project_number), '--owner', owner, '--url', url, '--format', 'json'])
        item_id = json.loads(item_out)['id']
        status = task['fields'].get('status', 'todo').lower()
        option_name = STATUS_TO_PROJECT_OPTION.get(status, 'Todo')
        option_id = option_id_by_name.get(option_name)
        if option_id:
            gh.run([
                'project', 'item-edit', '--id', item_id,
                '--project-id', project_node_id,
                '--field-id', status_field['id'], '--single-select-option-id', option_id,
            ])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--backlog', default='docs/BACKLOG.md')
    ap.add_argument('--repo', default=None, help='owner/repo, inferred from git remote if omitted')
    ap.add_argument('--owner', default=None)
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    repo = args.repo
    if not repo:
        url = subprocess.run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True).stdout.strip()
        m = re.search(r'github\.com[:/](.+?)(\.git)?$', url)
        if not m:
            print('Could not infer --repo from git remote; pass it explicitly.', file=sys.stderr)
            sys.exit(1)
        repo = m.group(1)
    owner = args.owner or repo.split('/')[0]

    tasks = parse_backlog(Path(args.backlog))
    print(f'Parsed {len(tasks)} tasks from {args.backlog} '
          f'({sum(1 for t in tasks if t["kind"] == "manual")} manual, '
          f'{sum(1 for t in tasks if t["kind"] == "autonomous")} autonomous)')

    gh = Gh(dry_run=args.dry_run)

    print('\n== labels ==')
    ensure_labels(gh, repo)

    print('\n== milestones ==')
    milestone_map = ensure_milestones(gh, repo)

    print('\n== issues (pass 1: create) ==')
    id_to_number, _id_to_url = create_issues(gh, repo, tasks, milestone_map)

    print('\n== issues (pass 2: dependency links) ==')
    patch_dependency_links(gh, repo, tasks, id_to_number)

    print('\n== close completed / label blocked ==')
    close_done_and_set_status(gh, repo, tasks, id_to_number)

    print('\n== project board ==')
    setup_project(gh, owner, repo, tasks, id_to_number)

    print('\nDone.' if not args.dry_run else '\nDry run complete — nothing was written.')


if __name__ == '__main__':
    main()
