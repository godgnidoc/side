#!/bin/bash
set -e

HERE=$(cd $(dirname $0) && pwd)

SIDE_HOME=${SIDE_HOME:-'~/.side'}

if [[ "$(realpath ${HERE}/../)" != "$(realpath ${SIDE_HOME}/side)" ]]; then
    echo "Remove old version"
    rm -rf ${SIDE_HOME}/side/*
    mkdir -p ${SIDE_HOME}/side
    cp -r ${HERE}/../* ${SIDE_HOME}/side/.
fi

echo "Check version"
export PATH=${SIDE_HOME}/side:$PATH
side --version

echo "Modify bashrc"
env SIDE_HOME=${SIDE_HOME} ${SIDE_HOME}/side/setup/modify-bashrc.sh

echo "Modify settings"
if [[ ! -f ${SIDE_HOME}/settings ]]; then
    echo '{}' > ${SIDE_HOME}/settings
fi
side vset ${SIDE_HOME}/settings -o ${SIDE_HOME}/settings offline = true

echo "Side installed successfully, please restart your terminal."
echo "Enjoy!"