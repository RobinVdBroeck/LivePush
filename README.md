# What

Proof of concept for using queues for pushing live messages to websockets

## Architecture:

Client -> Restapi -> Queue <- WebsocketServer -> Client
