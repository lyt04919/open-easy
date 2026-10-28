#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
npm start
