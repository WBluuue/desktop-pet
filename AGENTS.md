# AGENTS.md

## Project

This repository contains a Windows desktop pet application.

The main purpose of this project is to practice:

- agentic coding
- Git and GitHub workflows
- issue-driven development
- code review
- testing and CI
- packaging and releases

The application itself should remain small, understandable, and easy to review.

## Target behavior

The desktop pet will eventually:

- run as a transparent frameless desktop window;
- stay above normal windows;
- display user-provided character sprites;
- support dragging and simple interactions;
- react to Windows system audio output;
- switch between three mouth states:
  - `idle`
  - `speak`
  - `loud`

Current pet assets are expected under:

```text
assets/pet/
├── idle.png
├── speak.png
└── loud.png

The three sprites represent:

idle.png: silence or very low audio;
speak.png: normal system audio;
loud.png: high system audio.

Do not modify, regenerate, crop, resize, or replace user-provided artwork
unless explicitly asked.

Environment

Primary development environment:

Arch Linux

Target platform:

Windows 11

Technology stack:

Electron
TypeScript
HTML/CSS where needed

Prefer the simplest implementation possible.

Do not introduce frontend frameworks such as React, Vue, or Svelte unless
the user explicitly asks for one or there is a strong technical reason.

Platform rules

Linux is the primary development environment, but Windows is the source of
truth for Windows-specific behavior.

Do not assume that window behavior observed on Linux is identical to Windows.

Windows-specific functionality should be isolated where practical.

Examples include:

system audio loopback capture;
always-on-top behavior;
transparent windows;
taskbar behavior;
DPI and multi-monitor behavior.

The application should fail gracefully when a Windows-only feature is not
available on Linux.

Logic that does not depend on Windows should remain testable on Linux.

For system-audio-driven mouth animation, separate:

audio-level acquisition;
audio-level processing;
mouth-state selection;
sprite rendering.

Prefer Electron built-in APIs and Web Audio APIs over native addons.

Do not implement:

speech recognition;
microphone recording;
phoneme recognition;
voice commands;

unless explicitly requested.

Development principles

Before making changes:

read this file;
inspect the existing repository;
inspect relevant configuration files;
understand the current task.

Work only on the requested task.

Prefer the smallest change that satisfies the task.

Do not:

add unrelated features;
create speculative abstractions;
rewrite working code unnecessarily;
introduce unnecessary dependencies;
add features that belong to later milestones.

If a new production dependency is required, explain why before adding it.

Ask before making a major architectural change.

Scope control

Features should be implemented incrementally.

For example, if the current task is to create the first desktop pet window,
do not also implement:

system audio capture;
mouth animation;
system tray support;
auto-start;
settings UI;
persistence;
installers;
update mechanisms;
AI chat;
weather integration.

Those should be separate tasks.

Repository structure

Keep the repository structure simple.

Prefer a structure similar to:

desktop-pet/
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
├── assets/
│   └── pet/
│       ├── idle.png
│       ├── speak.png
│       └── loud.png
├── src/
│   ├── main/
│   └── renderer/
├── tests/
└── .github/
    └── workflows/

Do not create directories until they are actually needed.

Runtime assets must live inside the repository.

Do not assume files outside the repository are available.

Git rules

Do not perform Git history-changing operations unless explicitly requested.

In particular, do not:

commit;
push;
merge;
rebase;
create or delete branches;
create tags;
create releases;
amend commits;
reset Git history;

unless the user explicitly asks.

Do not modify files unrelated to the current task.

The user should be able to inspect all changes with:

git status
git diff

before deciding whether to commit them.

Verification

Before choosing commands, inspect project configuration such as:

package.json
tsconfig.json
existing scripts

Do not invent npm scripts that do not exist.

After making changes, run relevant available verification commands when
appropriate, such as:

TypeScript type checking;
linting;
tests;
development build;
production build.

Do not claim Windows-specific behavior has been verified if it was only
tested on Linux.

Clearly distinguish:

verified on Linux;
verified automatically;
not verified;
requires Windows testing.
Working with the user

For non-trivial tasks:

inspect the relevant files;
explain the proposed approach briefly;
identify files that will be created or modified;
identify dependencies that will be added;
wait for approval if the prompt asks for approval;
make focused changes;
run relevant verification;
summarize the result.

When several reasonable approaches exist, explain the important trade-offs
instead of silently choosing the most complicated solution.

At the end of a task, report:

files created;
files modified;
dependencies added;
verification commands run;
verification results;
remaining Windows-specific checks.

The goal is not only to make the code work, but also to keep every change
understandable and reviewable.
