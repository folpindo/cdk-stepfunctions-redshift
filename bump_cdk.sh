#!/bin/bash

CURRENT_VERSION=$(grep "^const AWS_CDK_VERSION" .projenrc.js | cut -d \' -f2)
CURRENT_MAJOR=$(echo "${CURRENT_VERSION}" | cut -d . -f1)
CURRENT_MINOR=$(echo "${CURRENT_VERSION}" | cut -d . -f2)
CURRENT_PATCH=$(echo "${CURRENT_VERSION}" | cut -d . -f3)
NEXT_VERSION="${CURRENT_MAJOR}.$(( $CURRENT_MINOR + 1)).0"

echo "Current version is ${CURRENT_VERSION} so bump will go to ${NEXT_VERSION}. Proceed?<y[es]/N[o]>"
read -r PROCEED
PROCEED_UPPER=$(echo "${PROCEED}" | tr '[:lower:]' '[:upper:]')

if [[ "${PROCEED_UPPER}" = 'Y' ]] || [[ "${PROCEED_UPPER}" = 'YES' ]]
then
  # Below variable will be 0 if they are not available
  if curl -s "https://github.com/awslabs/aws-solutions-constructs/releases/tag/v${NEXT_VERSION}" | grep "^Not Found" &>/dev/null
  then
    echo "No matching aws-solutions-constructs version available, not proceeding due to missing dependency"
    exit 2
  else
    echo "Matching aws-solutions-constructs version found. Proceeding."
    echo "Update config file"
    sed -i.bak "s/${CURRENT_VERSION}/${NEXT_VERSION}/" .projenrc.js
    echo "Update version file"
    sed -i.bak "s/${CURRENT_VERSION}/${NEXT_VERSION}/" version.json
    echo "Re-synthesize using projen"
    npx projen
  fi
else
  echo "Abort"
  exit 1
fi