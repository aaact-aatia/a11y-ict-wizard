#!/bin/bash
echo "Starting application in ${NODE_ENV} environment"


if [ "$WAITFORMONGO" = "true" ]; then
    echo "Waiting for MongoDB to be available..."
    /wait
    echo "MongoDB is available"
fi

echo "Starting sshd service"
/usr/sbin/sshd
echo "Started sshd service"

echo "Strating application with node"
node ./bin/www
echo "Started node service"