#!/bin/bash

sed -i '/# Side/,/# End Side/d' ~/.bashrc
echo "# Side" >> ~/.bashrc
echo "export SIDE_HOME=${SIDE_HOME}" >> ~/.bashrc
echo "source ${SIDE_HOME}/side/setup/setup.sh" >> ~/.bashrc
echo "# End Side" >> ~/.bashrc