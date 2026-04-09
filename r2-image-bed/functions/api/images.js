// 简单的中间件鉴权函数
async function checkAuth(request, env) {
  const adminSecret = env.ADMIN_SECRET;
  const clientSecret = request.headers.get('X-Auth-Secret');
  return adminSecret && clientSecret === adminSecret;
}

// 1. GET: 读取 R2 列表数据
export async function onRequestGet(context) {
  const { env, request } = context;
  if (!await checkAuth(request, env)) return new Response('Unauthorized', { status: 401 });

  const bucket = env.MY_BUCKET;
  // 调用 R2 的 list 功能
  const options = { limit: 500 }; // 默认只获取 500 张
  const listed = await bucket.list(options);
  
  // 转换成简化的 JSON 返回给前端
  const result = listed.objects.map(obj => ({
    key: obj.key,
    uploaded: obj.uploaded,
    size: obj.size
  }));

  // 按上传时间倒序排列 (最新的在前)
  result.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// 2. DELETE: 删除 R2 中的对象
export async function onRequestDelete(context) {
  const { env, request } = context;
  if (!await checkAuth(request, env)) return new Response('Unauthorized', { status: 401 });

  const bucket = env.MY_BUCKET;
  // 解析 JSON 载荷
  const { key } = await request.json();

  if (!key) return new Response('Key is required', { status: 400 });

  await bucket.delete(key);
  return new Response(JSON.stringify({ message: 'Deleted' }));
}