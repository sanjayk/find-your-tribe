#!/usr/bin/env bash
# git.sh — Git branching and merging helpers

# Requires config.sh to be sourced first

# Ensure we're in the project root for all git operations
_git() {
    git -C "$TRIBE_ROOT" "$@"
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
        log_step "Created branch: ${CYAN}${branch}${RESET}"
    fi

    echo "$branch"
}

git_safe_merge() {
    local branch="$1"
    local target="${2:-main}"

    _git checkout "$target" 2>/dev/null || _git checkout -b "$target"

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
