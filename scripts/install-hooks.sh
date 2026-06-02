#!/bin/sh
git config core.hooksPath .githooks
echo "Git hooks activated. Direct push to main is now blocked."
