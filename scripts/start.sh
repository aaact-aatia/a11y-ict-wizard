#!/bin/bash
echo "Starting application in ${NODE_ENV} environment"

echo "Starting mongodb service"
service mongodb start
echo "Started mongodb service"

if [ "$WAIT_FOR_MONGO" == "true" ]
then
    echo "Waiting for MongoDB to start"
    ./wait 
else
    echo "Waiting false"
fi 
echo "Mongo DB started, starting application"

#if [ "$POPULATE_DB"  == "true" ]
#then
 #   echo "Populating Mongo Database"
 #   ./mongotools/bin/mongorestore --uri=${DB_URI} dump/
 #   echo "database populated"
#else
#    echo "Populating false"
#fi

echo "Starting sshd service"
/usr/sbin/sshd
echo "Started sshd service"

echo "Strating application with node"
node ./bin/www
echo "Started node service"