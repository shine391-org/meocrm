
## Docker Exec Timeout Issue (Docker Desktop 28.x)

**Triệu chứng:**
- `docker exec` commands timeout (exit 124)
- Container status: running, healthy
- Docker healthcheck: pass
- Xảy ra sau nhiều lần restart Docker Desktop

**Nguyên nhân:**
- Container state corruption (Docker Desktop 28.5.1 known issue)
- Exec mechanism internal hang
- Không phải lỗi application

**Giải pháp:**



Method 1: Clean rebuild containers
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d

Method 2: Restart Docker Desktop
(Không khuyến nghị vì mất thời gian)
text

**Workaround trong scripts:**
Thay vì docker exec redis-cli
Dùng Docker healthcheck API:
docker inspect -f '{{.State.Health.Status}}' container_name | grep -q "healthy"

text

**Xác minh lỗi đã fix:**
timeout 5 docker exec container_name echo "test"

Nếu exit 0 → Fixed
Nếu exit 124 → Cần rebuild
text

**References:**
- Docker Desktop 28.x networking issues
- Container exec timeout after daemon restart
- State corruption in long-running containers
