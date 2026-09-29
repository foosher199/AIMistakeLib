# 邀请码与积分运营

积分系统由 Supabase 保存账本，Railway 只负责执行 API 和模型调用。部署前先在 Supabase 执行 `supabase/migrations/20260929_add_invites_credits_and_ai_billing.sql`。

## 创建小红书活动邀请码

邀请码统一通过管理员页面 `/dashboard/admin/invites` 管理，不要直接修改数据库。部署时在 Railway 配置 `ADMIN_USER_IDS`，值为允许进入后台的 Supabase Auth User ID；多个管理员使用英文逗号分隔。该页面使用服务端权限执行操作，`SUPABASE_SERVICE_ROLE_KEY` 不会发送到浏览器。

管理员可以填写活动名称、邀请码、每人赠送积分、最多兑换人数和过期时间。邀请码留空时由服务端自动生成；创建后可查看兑换进度，并暂停或重新启用。建议首轮小红书活动设置为每人 100 积分、最多 100 人兑换。每个用户账户只能兑换一次。

## 调整模型积分价格

`mistake_ai_model_prices` 按“操作 + 服务商 + 模型”版本化保存价格。不要直接修改已有生效记录；先停用旧价格，再新增价格，以保留历史结算依据：

```sql
begin;
update public.mistake_ai_model_prices
set status = 'retired', effective_to = now()
where operation = 'mistake_analysis'
  and provider = 'deepseek'
  and model = 'deepseek-v4-pro'
  and status = 'active';

insert into public.mistake_ai_model_prices (
  operation, provider, model,
  total_points_per_million, request_points,
  minimum_points, reservation_points
) values (
  'mistake_analysis', 'deepseek', 'deepseek-v4-pro',
  500, 3, 4, 4
);
commit;
```

结算公式为请求积分、图片积分、输入/输出/总 token 积分之和，并应用最低消费。当前阿里图片识别以 6 分为基础档、错因分析和举一反三以 4 分为基础档，模型用量较大时会随 token 增加；百度理解和切题暂未返回 token 用量，因此按 6 分/次结算。模型返回的 token 始终写入用量记录。

`reservation_points` 是调用前预冻结额度；成功后按实际 usage 结算，多余积分自动退回，失败则全部退回。价格规则只保存在数据库中，后续调价应停用旧版本并插入新版本，不要把积分数写死在客户端或 API 路由里。

数据库同时预留了人民币微元成本字段，便于记录供应商成本。产品积分与人民币不要硬编码为固定兑换关系，正式收费前应按最新供应商账单、毛利和赠送策略重新设置价格。

## 日常核对

- `mistake_ai_usage_records`：模型、token、计算积分、实扣积分及失败原因。
- `mistake_credit_transactions`：每次赠送、预冻结、结算和退回后的余额快照。
- `mistake_credit_accounts`：用户当前可用、冻结、累计赠送和累计消耗。

账本余额只能通过数据库函数变更，不要从客户端直接更新积分表。

Railway 进程若在模型调用中途退出，可能留下预冻结记录。建议在 Supabase Cron 每 5 分钟执行一次：

```sql
select public.release_stale_ai_reservations(interval '15 minutes');
```

清理阈值必须大于最长模型超时时间；当前图片模型最长为 180 秒。

如果已经按照 `RAILWAY_DEPLOYMENT.md` 配置了维护 Cron 服务，则不需要再配置上述 Supabase Cron；Railway 的 `/api/internal/maintenance` 会同时执行超时积分解冻、失败任务标记和孤儿图片清理。
