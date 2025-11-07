#!/bin/bash
set -e
ENV=${1:-dev}
ACTION=${2:-start}

case $ENV in
  dev) DB_PORT=2002; API_PORT=2001; WEB_PORT=2000; COMPOSE_FILE="docker-compose.dev.yml" ;;
  staging) DB_PORT=2012; API_PORT=2011; WEB_PORT=2010; COMPOSE_FILE="docker-compose.staging.yml" ;;
  prod) DB_PORT=2022; API_PORT=2021; WEB_PORT=2020; COMPOSE_FILE="docker-compose.prod.yml" ;;
  *) echo "❌ Usage: $0 {dev|staging|prod} {start|stop|restart|logs|status}"; exit 1 ;;
esac

case $ACTION in
  start)
    echo "🚀 Starting $ENV environment..."
    docker compose -f $COMPOSE_FILE up -d
    echo ""
    echo "✅ $ENV environment started!"
    echo "   Frontend:  http://localhost:$WEB_PORT"
    echo "   API:       http://localhost:$API_PORT/api"
    echo "   Database:  localhost:$DB_PORT"
    ;;
  stop) docker compose -f $COMPOSE_FILE down ;;
  restart) docker compose -f $COMPOSE_FILE restart ;;
  logs) docker compose -f $COMPOSE_FILE logs -f ;;
  status)
    echo "📊 $ENV Environment Status:"
    docker compose -f $COMPOSE_FILE ps
    echo ""
    echo "Ports: Frontend=$WEB_PORT, API=$API_PORT, DB=$DB_PORT"
    ;;
  *) echo "❌ Usage: $0 {dev|staging|prod} {start|stop|restart|logs|status}"; exit 1 ;;
esac
