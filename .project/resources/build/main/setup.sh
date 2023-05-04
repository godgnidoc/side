#!/bin/bash

HERE=$(realpath $(dirname ${BASH_SOURCE[0]}))

if ! which side > /dev/null; then
    export PATH=$PATH:${HERE}
fi

function _side_complete() {
    export COMP_CWORD
    export COMP_LINE
    export COMP_POINT
    export COMP_WORDBREAKS
    eval "COMPREPLY=($(side complete))"
}

function _dist_complete() {
    export COMP_CWORD
    export COMP_LINE
    export COMP_POINT
    export COMP_WORDBREAKS
    eval "COMPREPLY=($(dist complete))"
}

function dist() {
    dist $@
}

function _side_prompt_command() {
    side status -sn
}

if [[ "${PROMPT_COMMAND}" != *_side_prompt_command* ]]; then
    PROMPT_COMMAND="_side_prompt_command;${PROMPT_COMMAND}"
fi

complete -F _side_complete side
complete -F _dist_complete dist
