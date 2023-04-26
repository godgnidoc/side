#!/bin/bash

HERE=$(realpath $(dirname ${BASH_SOURCE[0]}))
export PATH=$PATH:${HERE}

function _side_complete() {
    export COMP_CWORD
    export COMP_LINE
    export COMP_POINT
    export COMP_WORDBREAKS
    eval "COMPREPLY=($(side complete))"
}

complete -F _side_complete side