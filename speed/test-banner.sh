#!/usr/bin/env bash
# test-banner.sh — Sharp edges on BOTH sides
# Run: ./speed/test-banner.sh

RST='\033[0m'
BOLD='\033[1m'
DIM='\033[0;90m'

YL='\033[38;5;220m'
YL_BR='\033[1;33m'
YL_LT='\033[38;5;228m'
OR='\033[38;5;208m'
OR_DK='\033[38;5;166m'
WH='\033[38;5;255m'
GY='\033[38;5;245m'

CWD=$(pwd | sed "s|$HOME|~|")

echo ""
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo -e "  ${BOLD}A: Narrow bolt — sharp both sides${RST}"
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo ""
echo -e "        ${YL_BR}╱██╲${RST}"
echo -e "       ${YL_BR}╱██╱${RST}"
echo -e "      ${YL}╱██╱${RST}                ${BOLD}${WH}SPEED${RST} ${GY}v0.1.0${RST}"
echo -e "     ${YL}╱████████╲${RST}           ${GY}Opus 4.6 · Claude Max${RST}"
echo -e "          ${OR}╲██╲${RST}           ${GY}${CWD}${RST}"
echo -e "           ${OR}╲██╲${RST}"
echo -e "            ${OR_DK}╲██╲${RST}"
echo -e "             ${OR_DK}╲╱${RST}"
echo ""

echo ""
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo -e "  ${BOLD}B: Medium bolt — sharp both sides${RST}"
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo ""
echo -e "       ${YL_BR}╱████╲${RST}"
echo -e "      ${YL_BR}╱████╱${RST}"
echo -e "     ${YL}╱████╱${RST}              ${BOLD}${WH}SPEED${RST} ${GY}v0.1.0${RST}"
echo -e "    ${YL}╱██████████╲${RST}         ${GY}Opus 4.6 · Claude Max${RST}"
echo -e "         ${OR}╲████╲${RST}         ${GY}${CWD}${RST}"
echo -e "          ${OR}╲████╲${RST}"
echo -e "           ${OR_DK}╲████╲${RST}"
echo -e "            ${OR_DK}╲██╱${RST}"
echo ""

echo ""
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo -e "  ${BOLD}C: Wide bolt — sharp both sides${RST}"
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo ""
echo -e "      ${YL_BR}╱██████╲${RST}"
echo -e "     ${YL_BR}╱██████╱${RST}"
echo -e "    ${YL}╱██████╱${RST}             ${BOLD}${WH}SPEED${RST} ${GY}v0.1.0${RST}"
echo -e "   ${YL}╱██████████████╲${RST}      ${GY}Opus 4.6 · Claude Max${RST}"
echo -e "         ${OR}╲██████╲${RST}       ${GY}${CWD}${RST}"
echo -e "          ${OR}╲██████╲${RST}"
echo -e "           ${OR_DK}╲██████╲${RST}"
echo -e "            ${OR_DK}╲████╱${RST}"
echo ""

echo ""
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo -e "  ${BOLD}D: Narrow + gradient fill${RST}"
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo ""
echo -e "        ${YL_LT}╱${YL_BR}▓▓${YL_LT}╲${RST}"
echo -e "       ${YL_LT}╱${YL_BR}▓▓${YL_LT}╱${RST}"
echo -e "      ${YL}╱${YL}▓▓${YL}╱${RST}                ${BOLD}${WH}SPEED${RST} ${GY}v0.1.0${RST}"
echo -e "     ${YL}╱${YL}▓▓▓▓▓▓▓▓${YL}╲${RST}           ${GY}Opus 4.6 · Claude Max${RST}"
echo -e "          ${OR}╲${OR}▓▓${OR}╲${RST}           ${GY}${CWD}${RST}"
echo -e "           ${OR}╲${OR}▓▓${OR}╲${RST}"
echo -e "            ${OR_DK}╲${OR_DK}▓▓${OR_DK}╲${RST}"
echo -e "             ${OR_DK}╲╱${RST}"
echo ""

echo ""
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo -e "  ${BOLD}E: Medium + gradient fill${RST}"
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo ""
echo -e "       ${YL_LT}╱${YL_BR}▓▓▓▓${YL_LT}╲${RST}"
echo -e "      ${YL_LT}╱${YL_BR}▓▓▓▓${YL_LT}╱${RST}"
echo -e "     ${YL}╱${YL}▓▓▓▓${YL}╱${RST}              ${BOLD}${WH}SPEED${RST} ${GY}v0.1.0${RST}"
echo -e "    ${YL}╱${YL}▓▓▓▓▓▓▓▓▓▓${YL}╲${RST}         ${GY}Opus 4.6 · Claude Max${RST}"
echo -e "         ${OR}╲${OR}▓▓▓▓${OR}╲${RST}         ${GY}${CWD}${RST}"
echo -e "          ${OR}╲${OR}▓▓▓▓${OR}╲${RST}"
echo -e "           ${OR_DK}╲${OR_DK}▓▓▓▓${OR_DK}╲${RST}"
echo -e "            ${OR_DK}╲${OR_DK}▓▓${OR_DK}╱${RST}"
echo ""

echo ""
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo -e "  ${BOLD}F: Narrow + dollar fill${RST}"
echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo ""
echo -e "        ${YL_LT}╱${YL_BR}ee${YL_LT}╲${RST}"
echo -e "       ${YL_LT}╱${YL_BR}ee${YL_LT}╱${RST}"
echo -e "      ${YL}╱${YL}ee${YL}╱${RST}                ${BOLD}${WH}SPEED${RST} ${GY}v0.1.0${RST}"
echo -e "     ${YL}╱${YL}eeeeeeee${YL}╲${RST}           ${GY}Opus 4.6 · Claude Max${RST}"
echo -e "          ${OR}╲${OR}ee${OR}╲${RST}           ${GY}${CWD}${RST}"
echo -e "           ${OR}╲${OR}ee${OR}╲${RST}"
echo -e "            ${OR_DK}╲${OR_DK}ee${OR_DK}╲${RST}"
echo -e "             ${OR_DK}╲╱${RST}"
echo ""

echo -e "  ${DIM}─────────────────────────────────────────────────${RST}"
echo -e "  ${DIM}Pick one (A-F) or describe what to tweak.${RST}"
echo ""
