#!/bin/bash -e
set -e

HOST=${HOST:-'localhost:5000'}
SIDE_HOME=${SIDE_HOME:-$(realpath ~/.side)}

API_QUERY="http://${HOST}/api/package/search/byquery"
API_DOWNLOAD="http://${HOST}/api/package/download"
API_DL="http://${HOST}/api/dl"
API_TASK="http://${HOST}/api/tasks"

echo "Query the latest version of Side"
PACKAGE_ID=$(curl -s ${API_QUERY}?query=@platform/side | sed -n -e 's/.*"data":\["\([^"]*\)".*/\1/p')
echo "Package ID: ${PACKAGE_ID}"

echo "Request to download the package"
DOWNLOAD_TOKEN=$(curl -s ${API_DOWNLOAD}?id=${PACKAGE_ID} | sed -e 's|.*"token":"\(.*\)".*|\1|')
echo "Download Token: ${DOWNLOAD_TOKEN}"

echo "Download the package"
mkdir -p ${SIDE_HOME}/side/extracting
curl -s -X POST -H "Task-Token: ${DOWNLOAD_TOKEN}" ${API_TASK} -o ${SIDE_HOME}/side.tar
echo "Downloaded " $(md5sum ${SIDE_HOME}/side.tar)

echo "Extract the package"
tar -xf ${SIDE_HOME}/side.tar -C ${SIDE_HOME}/side/extracting
tar -xf ${SIDE_HOME}/side/extracting/root.tar.xz -C ${SIDE_HOME}/side
rm -rf ${SIDE_HOME}/side/extracting ${SIDE_HOME}/side.tar
source ${SIDE_HOME}/side/setup/setup.sh
echo "Extracted"

echo "Modify bashrc"
env SIDE_HOME=${SIDE_HOME} ${SIDE_HOME}/side/setup/modify-bashrc.sh

if ! which node &> /dev/null || ! node --version | grep -q "v16"; then
    echo "Install nodejs"
    curl -s ${API_DL}?p=node -o ${SIDE_HOME}/sysroot/bin/node
    chmod 755 ${SIDE_HOME}/sysroot/bin/node
    echo "Installed"
else
    cp $(which node) ${SIDE_HOME}/sysroot/bin/node
fi

echo "Check version"
export PATH=${SIDE_HOME}/side:$PATH
side --version

echo "Modifying the configuration file"
if [[ ! -f ${SIDE_HOME}/settings ]]; then
    echo '{}' > ${SIDE_HOME}/settings
fi

if ! side vhas ${SIDE_HOME}/settings dist &> /dev/null; then
    side vset ${SIDE_HOME}/settings -o ${SIDE_HOME}/settings dist = '{}'
fi

side vset ${SIDE_HOME}/settings -o ${SIDE_HOME}/settings dist.apiBaseUrl = "'http://${HOST}/api'"
echo "Modified"

echo "Side installed successfully, please restart your terminal."
echo "Enjoy!"

