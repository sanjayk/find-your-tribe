#!/usr/bin/env bash
# log.sh — Timestamped logging with levels

# Requires config.sh to be sourced first

_log_timestamp() {
    date '+%H:%M:%S'
}

log_info() {
    echo -e "${DIM}[$(_log_timestamp)]${RESET} ${BLUE}info${RESET}  $*"
}

log_success() {
    echo -e "${DIM}[$(_log_timestamp)]${RESET} ${GREEN}${SYM_CHECK}${RESET}     $*"
}

log_warn() {
    echo -e "${DIM}[$(_log_timestamp)]${RESET} ${YELLOW}${SYM_WARN} warn${RESET}  $*" >&2
}

log_error() {
    echo -e "${DIM}[$(_log_timestamp)]${RESET} ${RED}${SYM_CROSS} err${RESET}   $*" >&2
}

log_step() {
    echo -e "${DIM}[$(_log_timestamp)]${RESET} ${CYAN}${SYM_ARROW}${RESET}     $*"
}

log_header() {
    echo ""
    echo -e "${BOLD}${WHITE}$*${RESET}"
    echo -e "${DIM}$(printf '─%.0s' $(seq 1 60))${RESET}"
}

# Log to file (for agent session logs)
log_to_file() {
    local file="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$file"
}
