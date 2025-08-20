# NotesHub notes.spyccb.top

NotesHub 是一个基于 Next.js + Supabase 的读书笔记平台，支持书库管理、富文本笔记、用户主页、封面自动获取、主题切换等。

## 功能概览
- 书库：查看全站所有书籍；支持搜索（书名/作者/上传者）
- 书籍详情：标题区显示作者和上传者；笔记支持富文本（标题、粗体、列表、引用、代码块）
- 编辑器：TipTap，支持字号下拉与自定义输入（12–48px）
- 封面：
  - 自动获取（Google CSE）并优先自托管到 Supabase Storage
  - 手动上传，支持 3:4 比例裁剪
- 个人主页：
  - 地址 `/{username}`，展示横幅图、简介（Markdown 渲染）与书籍
  - 设置页 `/settings` 可更改用户名、头像（圆形裁剪）、横幅（3:1 裁剪）、简介（Markdown 实时预览）
- 主题：深浅色切换，并带平滑过渡
- 导航：
  - “我的主页”在任何子页面始终显示
  - 未登录跳转登录页；未设置用户名时跳转 `/settings`

## 环境变量（.env.local）
在 `noteshub/.env.local` 写入：
```env
NEXT_PUBLIC_SUPABASE_URL=你的SupabaseURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的SupabaseAnonKey
NEXT_PUBLIC_GOOGLE_CSE_KEY=你的GoogleAPIKey
NEXT_PUBLIC_GOOGLE_CSE_CX=你的GoogleCSE_ID
NEXT_PUBLIC_SITE_URL=http://localhost:3000 # 本地调试
```
生产环境将 `NEXT_PUBLIC_SITE_URL` 设为你的站点域名（如 `https://notes.spyccb.top`）。

## 本地开发
```bash
npm i
npm run dev
```
本地 Google 登录需在 Google/Supabase 中添加回调：
- `http://localhost:3000/auth/callback`

## Docker 部署
`Dockerfile` 输出 Next.js standalone；`docker-compose.yml` 会加载 `.env.local`。

服务器：
```bash
cd /opt/noteshub
# 首次
git clone https://github.com/<you>/noteshub.git .
# 更新
git pull
# 仅映射到本机 3003，供 Nginx 反代
cat > docker-compose.override.yml << 'EOF'
services:
  web:
    ports:
      - "127.0.0.1:3003:3000"
EOF

# 构建并启动
# 注意：如新增依赖，请先在本地提交 package-lock.json 再构建
docker compose up -d --build
```

Nginx（示例）：
```nginx
server {
  listen 80;
  server_name notes.spyccb.top;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name notes.spyccb.top;

  location / {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Google OAuth 回调头较大时的缓冲
    proxy_buffering on;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    proxy_read_timeout 120s;
    client_max_body_size 10m;
  }

  # 证书配置略
}
```

## Supabase 准备
数据库字段：
```sql
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists banner_url text;
```

Storage：
```sql
-- covers（封面）桶策略请根据前述步骤已配置

-- 头像桶
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set name = excluded.name, public = excluded.public;

drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public"
on storage.objects for select to public using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_authenticated" on storage.objects;
create policy "avatars_insert_authenticated"
on storage.objects for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatars_update_owner" on storage.objects;
create policy "avatars_update_owner"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and owner = auth.uid())
with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars_delete_owner" on storage.objects;
create policy "avatars_delete_owner"
on storage.objects for delete to authenticated using (bucket_id = 'avatars' and owner = auth.uid());

-- 横幅桶
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do update set name = excluded.name, public = excluded.public;

drop policy if exists "banners_read_public" on storage.objects;
create policy "banners_read_public"
on storage.objects for select to public using (bucket_id = 'banners');

drop policy if exists "banners_insert_authenticated" on storage.objects;
create policy "banners_insert_authenticated"
on storage.objects for insert to authenticated with check (bucket_id = 'banners');

drop policy if exists "banners_update_owner" on storage.objects;
create policy "banners_update_owner"
on storage.objects for update to authenticated
using (bucket_id = 'banners' and owner = auth.uid())
with check (bucket_id = 'banners' and owner = auth.uid());

drop policy if exists "banners_delete_owner" on storage.objects;
create policy "banners_delete_owner"
on storage.objects for delete to authenticated using (bucket_id = 'banners' and owner = auth.uid());
```

profiles RLS：
```sql
-- 公开读取
drop policy if exists "profiles_read_public" on public.profiles;
create policy "profiles_read_public"
on public.profiles for select to public using (true);

-- 本人可更新
drop policy if exists "profiles_update_owner" on public.profiles;
create policy "profiles_update_owner"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
```

## Google Programmable Search (前端版)
- 控制台创建 CSE：搜索全网 + 开启图片搜索，获取 `cx`
- Google Cloud 启用 Custom Search API，创建 API Key
- Key 限制：HTTP referrers 加入 `http://localhost/*`、生产域名；API 仅限 Custom Search API
- 在 `.env.local` 配置 `NEXT_PUBLIC_GOOGLE_CSE_KEY`、`NEXT_PUBLIC_GOOGLE_CSE_CX`

## 常见问题
- Docker 构建 npm ci 失败：请先本地 `npm install` 更新 `package-lock.json` 并提交后再构建
- Google 登录回跳错误域名：设置 `NEXT_PUBLIC_SITE_URL`，Nginx 传 `X-Forwarded-Proto/Host`，并在 Google/Supabase 配置回调为 `{SITE_URL}/auth/callback`
- 502 upstream sent too big header：按上方 Nginx 配置增加 proxy 缓冲
- 书库上传者显示“用户”：确认 `profiles` RLS 允许公开 select，且资料中 `username` 已设置

## 开源协议
MIT
