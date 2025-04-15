#!/bin/bash
echo "Starting application in ${NODE_ENV} environment"

echo "Starting sshd service"
/usr/sbin/sshd
echo "Started sshd service"

echo "Strating application with node"
node ./bin/www
echo "Started node service"