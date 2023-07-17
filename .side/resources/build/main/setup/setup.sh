#!/bin/bash

HERE=$(realpath $(dirname ${BASH_SOURCE[0]}))

if ! which side > /dev/null; then
    export PATH=$(realpath ${HERE}/..):$(realpath ${HERE}/../../sysroot/bin):$PATH
fi

if [[ "${PROMPT_COMMAND}" != *_side_prompt_command* ]]; then
    PROMPT_COMMAND="_side_prompt_command;${PROMPT_COMMAND}"
fi

function _side_complete() {
    export COMP_CWORD
    export COMP_LINE
    export COMP_POINT
    export COMP_WORDBREAKS
    eval "COMPREPLY=($(side complete))"
}

function _dist_server_complete() {
    export COMP_CWORD
    export COMP_LINE
    export COMP_POINT
    export COMP_WORDBREAKS
    eval "COMPREPLY=($(dist-server complete))"
}

eval "function _side_prompt_command() { $(realpath ${HERE}/..)/__status; }"

complete -F _side_complete side
complete -F _side_complete dist
complete -F _dist_server_complete dist-server