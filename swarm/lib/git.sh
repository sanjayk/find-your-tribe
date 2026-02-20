#!/usr/bin/env bash
# git.sh — Git branching and merging helpers

# Requires config.sh to be sourced first

# Ensure we're in the project root for all git operations
_git() {
    git -C "$TRIBE_ROOT" "$@"
}

# Detect the repo's default branch (main, master, etc.)
# Tries: MAIN_BRANCH env var → origin HEAD → verify main → verify master → fallback "main"
git_main_branch() {
    if [[ -n "${MAIN_BRANCH:-}" ]]; then
        echo "$MAIN_BRANCH"
        return
    fi
    local default
    default=$(_git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
    if [[ -n "$default" ]]; then
        echo "$default"
        return
    fi
    if _git rev-parse --verify main &>/dev/null; then
        echo "main"
    elif _git rev-parse --verify master &>/dev/null; then
        echo "master"
    else
        echo "main"
    fi
}

git_ensure_repo() {
    if ! _git rev-parse --git-dir &>/dev/null; then
        _git init
        log_info "Initialized git repository"
    fi

    # Ensure at least one commit exists
    if ! _git rev-parse HEAD &>/dev/null; then
        _git commit --allow-empty -m "Initial commit"
        log_info "Created initial commit"
    fi
}

git_current_branch() {
    _git rev-parse --abbrev-ref HEAD
}

# Check if working tree has uncommitted changes (tracked or untracked)
git_is_dirty() {
    # Check for staged/unstaged changes to tracked files
    if ! _git diff --quiet HEAD 2>/dev/null; then
        return 0
    fi
    # Check for staged changes
    if ! _git diff --cached --quiet 2>/dev/null; then
        return 0
    fi
    # Check for untracked files (excluding gitignored)
    if [[ -n "$(_git ls-files --others --exclude-standard 2>/dev/null)" ]]; then
        return 0
    fi
    return 1
}

# Create a baseline commit so task branches include the full working tree.
# Without this, untracked files are invisible to task branches.
git_create_baseline() {
    if ! git_is_dirty; then
        return 0
    fi

    log_step "Working tree has uncommitted changes"

    # Show summary
    local tracked_changes untracked_files
    tracked_changes=$(_git diff --stat HEAD 2>/dev/null | tail -1)
    untracked_files=$(_git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

    if [[ -n "$tracked_changes" ]]; then
        log_step "  Tracked: ${tracked_changes}"
    fi
    if [[ "$untracked_files" -gt 0 ]]; then
        log_step "  Untracked: ${untracked_files} file(s)"
    fi

    log_step "Creating baseline commit so task branches see all files..."
    _git add -A
    _git commit -m "tribe: baseline commit for swarm operation" >/dev/null 2>&1
    log_success "Baseline commit created"
    return 0
}

git_branch_exists() {
    local branch="$1"
    _git rev-parse --verify "$branch" &>/dev/null
}

git_create_task_branch() {
    local task_id="$1"
    local slug="$2"
    local branch="${BRANCH_PREFIX}/task-${task_id}-${slug}"

    local base
    base=$(git_current_branch)

    if git_branch_exists "$branch"; then
        log_warn "Branch $branch already exists, checking out"
        _git checkout "$branch"
    else
        _git checkout -b "$branch" "$base"
        log_step "Created branch: ${CYAN}${branch}${RESET}" >&2
    fi

    echo "$branch"
}

# ── Worktree management ──────────────────────────────────────────

# Create an isolated worktree for a task agent.
# Returns the worktree path on stdout.
git_create_worktree() {
    local task_id="$1"
    local branch="$2"
    local worktree_path="${WORKTREES_DIR}/task-${task_id}"

    mkdir -p "$WORKTREES_DIR"

    # Clean up stale worktree if it exists (from a previous failed run)
    if [[ -d "$worktree_path" ]]; then
        _git worktree remove --force "$worktree_path" 2>/dev/null || rm -rf "$worktree_path"
        _git worktree prune 2>/dev/null || true
    fi

    # Create worktree on the task branch
    # git worktree add prints "HEAD is now at..." to stdout and
    # "Preparing worktree..." to stderr — capture both to prevent
    # polluting the return value (worktree_path on stdout).
    local wt_log
    wt_log=$(mktemp)
    local wt_rc=0
    if git_branch_exists "$branch"; then
        _git worktree add "$worktree_path" "$branch" >"$wt_log" 2>&1 || wt_rc=$?
    else
        # Create branch + worktree in one command, based on current HEAD
        _git worktree add -b "$branch" "$worktree_path" >"$wt_log" 2>&1 || wt_rc=$?
    fi

    if [[ $wt_rc -ne 0 ]]; then
        local wt_err
        wt_err=$(cat "$wt_log" 2>/dev/null)
        rm -f "$wt_log"
        log_error "Failed to create worktree for task-${task_id} (branch: ${branch}): ${wt_err}"
        return 1
    fi
    rm -f "$wt_log"

    log_step "Created worktree: ${CYAN}${worktree_path}${RESET} (branch: ${branch})" >&2
    echo "$worktree_path"
}

# Symlink shared dependencies (node_modules, .venv) into a worktree
# so that lint/typecheck/test gates can run without a full install.
git_setup_worktree_deps() {
    local worktree_path="$1"

    # Frontend node_modules
    local fe_nm="${TRIBE_ROOT}/src/frontend/node_modules"
    local wt_fe="${worktree_path}/src/frontend"
    if [[ -d "$fe_nm" ]] && [[ -d "$wt_fe" ]] && [[ ! -e "$wt_fe/node_modules" ]]; then
        ln -s "$fe_nm" "$wt_fe/node_modules"
    fi

    # Backend .venv
    local be_venv="${TRIBE_ROOT}/src/backend/.venv"
    local wt_be="${worktree_path}/src/backend"
    if [[ -d "$be_venv" ]] && [[ -d "$wt_be" ]] && [[ ! -e "$wt_be/.venv" ]]; then
        ln -s "$be_venv" "$wt_be/.venv"
    fi

    # Plugin node_modules
    local pl_nm="${TRIBE_ROOT}/src/plugins/claude-code-hook/node_modules"
    local wt_pl="${worktree_path}/src/plugins/claude-code-hook"
    if [[ -d "$pl_nm" ]] && [[ -d "$wt_pl" ]] && [[ ! -e "$wt_pl/node_modules" ]]; then
        ln -s "$pl_nm" "$wt_pl/node_modules"
    fi

    # Frontend .next cache (needed for next lint / next build)
    local fe_next="${TRIBE_ROOT}/src/frontend/.next"
    local wt_fe_next="${worktree_path}/src/frontend"
    if [[ -d "$fe_next" ]] && [[ -d "$wt_fe_next" ]] && [[ ! -e "$wt_fe_next/.next" ]]; then
        ln -s "$fe_next" "$wt_fe_next/.next"
    fi
}

# Remove a task's worktree
git_remove_worktree() {
    local task_id="$1"
    local worktree_path="${WORKTREES_DIR}/task-${task_id}"

    if [[ -d "$worktree_path" ]]; then
        _git worktree remove --force "$worktree_path" 2>/dev/null || rm -rf "$worktree_path"
        _git worktree prune 2>/dev/null || true
        log_step "Removed worktree: task-${task_id}"
    fi
}

# Clean up all orphaned worktrees (no running process)
git_cleanup_worktrees() {
    _git worktree prune 2>/dev/null || true

    if [[ ! -d "$WORKTREES_DIR" ]]; then
        return
    fi

    for wt_dir in "$WORKTREES_DIR"/task-*; do
        [[ -d "$wt_dir" ]] || continue
        local task_id
        task_id=$(basename "$wt_dir" | sed 's/^task-//')

        # If no task file exists, remove the worktree
        local task_file="${TASKS_DIR}/${task_id}.json"
        if [[ ! -f "$task_file" ]]; then
            _git worktree remove --force "$wt_dir" 2>/dev/null || rm -rf "$wt_dir"
            continue
        fi

        # If the task is not running, remove the worktree
        local status
        status=$(jq -r '.status' "$task_file" 2>/dev/null || echo "unknown")
        if [[ "$status" != "running" ]]; then
            _git worktree remove --force "$wt_dir" 2>/dev/null || rm -rf "$wt_dir"
        fi
    done
}

git_safe_merge() {
    local branch="$1"
    local target="${2:-main}"

    if ! _git checkout "$target" 2>/dev/null; then
        log_error "Cannot checkout '${target}' for merge — is HEAD detached or are there uncommitted changes?"
        return 1
    fi

    if _git merge --no-ff "$branch" -m "Merge ${branch} into ${target}" 2>/dev/null; then
        log_success "Merged ${branch} into ${target}"
        return 0
    else
        log_error "Merge conflict: ${branch} into ${target}"
        _git merge --abort 2>/dev/null || true
        return 1
    fi
}

git_has_conflicts() {
    local branch="$1"
    local target="${2:-main}"

    # Dry-run merge check
    if _git merge-tree "$(_git merge-base "$target" "$branch")" "$target" "$branch" | grep -q '^<<<<<<<'; then
        return 0 # has conflicts
    fi
    return 1 # no conflicts
}

git_diff_branch() {
    local branch="$1"
    local base="${2:-main}"
    _git diff "${base}...${branch}"
}

git_branch_commits() {
    local branch="$1"
    local base="${2:-main}"
    _git log --oneline "${base}..${branch}"
}

git_cleanup_branch() {
    local branch="$1"
    if git_branch_exists "$branch"; then
        _git branch -d "$branch" 2>/dev/null || true
    fi
}
