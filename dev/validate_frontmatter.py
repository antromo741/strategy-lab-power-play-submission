#!/usr/bin/env python3
"""Validate a SKILL.md frontmatter with a real YAML parser (PyYAML) against the Agent Skills spec.

Usage: python3 dev/validate_frontmatter.py path/to/SKILL.md
Exit 0 when valid, 1 otherwise. PyYAML is a system package on the build machine; it is a
dev-time check only, not a dependency of the skill itself.
"""
import os
import re
import sys

import yaml

NAME_RE = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')


def main(path):
    text = open(path, encoding='utf-8').read()
    if not text.startswith('---'):
        print('FAIL: file does not start with a --- frontmatter block')
        return 1
    parts = text.split('---', 2)
    if len(parts) < 3:
        print('FAIL: frontmatter is not closed by a second ---')
        return 1
    try:
        fm = yaml.safe_load(parts[1])
    except yaml.YAMLError as e:
        print('FAIL: YAML parse error:', str(e).replace('\n', ' | '))
        return 1
    problems = []
    if not isinstance(fm, dict):
        problems.append('frontmatter is not a mapping')
        fm = {}
    name = fm.get('name')
    folder = os.path.basename(os.path.dirname(os.path.abspath(path)))
    if not isinstance(name, str) or not (1 <= len(name) <= 64) or not NAME_RE.match(name):
        problems.append(f'name invalid: {name!r} (1-64 chars, a-z 0-9 and single hyphens)')
    elif name != folder:
        problems.append(f'name {name!r} does not match folder {folder!r}')
    desc = fm.get('description')
    if not isinstance(desc, str) or not (1 <= len(desc.strip()) <= 1024):
        problems.append('description missing, not a string, or over 1024 chars')
    compat = fm.get('compatibility')
    if compat is not None and (not isinstance(compat, str) or not (1 <= len(compat) <= 500)):
        problems.append('compatibility must be a 1-500 char string')
    tools = fm.get('allowed-tools')
    if tools is not None and not isinstance(tools, str):
        problems.append('allowed-tools must be a space-separated string')
    meta = fm.get('metadata')
    if meta is not None and not (isinstance(meta, dict) and all(isinstance(k, str) and isinstance(v, str) for k, v in meta.items())):
        problems.append('metadata must map strings to strings')
    for key, value in fm.items():
        shown = value if not isinstance(value, str) else value.replace('\n', '\\n')
        print(f'  {key}: {type(value).__name__}, {len(value) if isinstance(value, str) else "-"} chars: {shown}')
    for p in problems:
        print('FAIL:', p)
    print('valid' if not problems else 'INVALID')
    return 1 if problems else 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
