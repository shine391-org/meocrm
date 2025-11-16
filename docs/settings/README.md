# Settings & Feature Flags

Nguồn sự thật cho hành vi hệ thống nằm trong bảng `settings` (PostgreSQL) + cache Redis. Quyết định #34–#48 được coi là **defaults** và có thể override theo thang:

```text
Default → Plan → Tenant → Branch → Role → User → Object
```

Engine sẽ tìm config từ scope hẹp nhất (Object) và fallback dần lên Default. Không component nào được hard-code số liệu; thay vào đó dùng `SettingsService.get(key, scope)`.

## JSON Schema (rút gọn)

```jsonc
{
  "leadPriority": {
    "enabled": { "type": "boolean", "default": true },
    "thresholds": {
      "type": "object",
      "properties": {
        "auto_to_medium": { "type": "number", "default": 7 },
        "auto_to_low": { "type": "number", "default": 30 },
        "auto_to_inactive": { "type": "number", "default": 60 }
      }
    },
    "allowManualOverride": { "type": "boolean", "default": true },
    "autoAssignment": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": false },
        "rules": {
          "type": "object",
          "properties": {
            "high": { "type": "string", "default": "senior_sales" },
            "medium": { "type": "string", "default": "any_sales" },
            "low": { "type": "string", "default": "junior_sales" }
          }
        }
      }
    }
  },
  "commission": {
    "enabled": { "type": "boolean", "default": true },
    "plan": { "type": "string", "enum": ["FLAT", "TIERED", "BONUS"], "default": "TIERED" },
    "split": {
      "type": "object",
      "properties": {
        "self": { "type": "number", "default": 0.7 },
        "support": { "type": "number", "default": 0.2 },
        "teamPool": { "type": "number", "default": 0.1 }
      }
    },
    "payoutDayOfMonth": { "type": "integer", "default": 5 },
    "version": { "type": "integer", "default": 1 }
  },
  "refund": {
    "enabled": { "type": "boolean", "default": true },
    "windowDays": { "type": "integer", "default": 7 },
    "refundShippingFee": { "type": "boolean", "default": false },
    "restockOnRefund": { "type": "boolean", "default": true },
    "approvals": { "type": "array", "items": { "type": "string" }, "default": ["manager"] },
    "version": { "type": "integer", "default": 1 }
  },
  "notifications": {
    "staff": {
      "enabled": { "type": "boolean", "default": true },
      "defaultChannel": { "type": "string", "enum": ["telegram", "zalo"], "default": "telegram" },
      "providers": {
        "telegram": {
          "enabled": { "type": "boolean", "default": true },
          "botTokenSecretRef": { "type": "string" },
          "channelId": { "type": "string" }
        },
        "zalo": {
          "enabled": { "type": "boolean", "default": false },
          "oaId": { "type": "string" },
          "zcaAppId": { "type": "string" },
          "secretRef": { "type": "string" },
          "template": { "type": "string" }
        }
      }
    },
    "customer": {
      "enabled": { "type": "boolean", "default": false }
    }
  }
}
```

## Notifications & VN channels
- **Telegram (staff):** triển khai nhanh, phù hợp cảnh báo nội bộ. Tôn trọng rate-limit ~1 msg/s/chat, 30 msg/s tổng, 20 msg/min/group. Token lưu trong secret store; job gửi dùng queue + retry/backoff 2^n.
- **Zalo (customer, Phase 2):** qua Zalo Cloud API (ZNS). Cần OA + ZCA, message theo template đã duyệt, có webhook phản hồi (delivered/failed). Dùng khi bật `notifications.customer.enabled`.
- Feature flag cho từng provider → nếu tắt, worker bỏ qua queue tương ứng.

## Kill-switch & Cache
- `moduleKillSwitch` là dictionary `{ module: boolean }`. Khi `false`, controller trả `503` với code `MODULE_DISABLED`.
- Settings được cache 5 phút trong Redis. Admin thay đổi setting → phát event `settings.invalidate` để flush cache.
- Audit: mọi thay đổi lưu `SettingsAudit` (`scope`, `oldValue`, `newValue`, `actorId`, `traceId`).

## Admin Settings Console
- Cho phép chọn scope (Tenant / Branch / Role / User / Object) bằng selector. UI hiển thị chuỗi fallback để developer debug.
- Có nút "Preview" để mô phỏng request, hiển thị JSON sau khi merge precedence.
- Bắt buộc điền lý do (Change justification) → lưu vào audit.

## Config mẫu

```json
{
  "leadPriority": {
    "enabled": true,
    "thresholds": { "auto_to_medium": 7, "auto_to_low": 30, "auto_to_inactive": 60 },
    "allowManualOverride": true,
    "autoAssignment": {
      "enabled": false,
      "rules": { "high": "senior_sales", "medium": "any_sales", "low": "junior_sales" }
    }
  },
  "commission": {
    "enabled": true,
    "plan": "TIERED",
    "split": { "self": 0.7, "support": 0.2, "teamPool": 0.1 },
    "payoutDayOfMonth": 5,
    "version": 1
  },
  "refund": {
    "enabled": true,
    "windowDays": 7,
    "refundShippingFee": false,
    "restockOnRefund": true,
    "approvals": ["manager"],
    "version": 1
  },
  "shipping": {
    "baseFee": 30000,
    "freeShipThreshold": 500000,
    "applyChannels": ["ONLINE"]
  },
  "notifications": {
    "staff": {
      "enabled": true,
      "defaultChannel": "telegram",
      "providers": {
        "telegram": {
          "enabled": true,
          "botTokenSecretRef": "TELEGRAM_BOT_TOKEN",
          "channelId": "@meocrm_ops"
        },
        "zalo": {
          "enabled": false,
          "oaId": "ZALO_OA_ID",
          "zcaAppId": "ZCA_APP_ID",
          "secretRef": "ZALO_SECRET",
          "template": "ops_alert"
        }
      }
    },
    "customer": { "enabled": false }
  },
  "audit": { "enabled": true, "retentionMonths": 12, "redactPII": true }
}
```
